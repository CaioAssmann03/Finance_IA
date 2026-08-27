"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAcaoUnica } from "@/lib/hooks/use-acao-unica";
import { validarValorMonetario } from "@/lib/utils/valores";
import { hojeISO, ehDataISOValida, ultimoDiaDoMes, paraISO } from "@/lib/utils/datas";
import { gerarParcelas, validarParcelamento, MAX_PARCELAS } from "@/lib/transacoes/parcelas";
import { formatarMoeda } from "@/lib/utils/formatters";
import { mensagemDeErroBanco } from "@/lib/utils/erros-banco";
import type { Conta, Categoria, TipoLancamento } from "@/types/database";
import clsx from "clsx";

type ModoLancamento = "unico" | "recorrente" | "parcelado";

export function FormularioNovoLancamento({
  contas,
  categorias,
}: {
  contas: Conta[];
  categorias: Categoria[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [modo, setModo] = useState<ModoLancamento>("unico");
  const [tipo, setTipo] = useState<TipoLancamento>("despesa");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(hojeISO);
  const [diaDoMes, setDiaDoMes] = useState("5");
  const [parcelaAtual, setParcelaAtual] = useState("1");
  const [parcelaTotal, setParcelaTotal] = useState("2");
  const [contaId, setContaId] = useState(contas[0]?.id ?? "");
  const [categoriaId, setCategoriaId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [duplicataAvisada, setDuplicataAvisada] = useState<{
    assinatura: string;
    texto: string;
  } | null>(null);

  // Rede de segurança contra lançar a mesma conta duas vezes (duplo clique que
  // escapou, F5 no meio do envio, voltar e salvar de novo): se já existir um
  // lançamento idêntico, o primeiro clique só avisa e o segundo confirma.
  //
  // O aviso fica preso à "assinatura" do lançamento: mexeu em qualquer campo
  // que o identifica, a assinatura muda e o aviso some sozinho — sem precisar
  // de um efeito só para limpar estado.
  const assinatura = [modo, tipo, contaId, categoriaId, valor, data].join("|");
  const avisoDuplicata =
    duplicataAvisada?.assinatura === assinatura ? duplicataAvisada.texto : null;

  async function existeLancamentoIgual(valorNumerico: number) {
    const { data: iguais } = await supabase
      .from("transacoes")
      .select("id")
      .eq("conta_id", contaId)
      .eq("categoria_id", categoriaId)
      .eq("tipo", tipo)
      .eq("valor", valorNumerico)
      .eq("data", data)
      .limit(1);

    return Boolean(iguais && iguais.length > 0);
  }

  const categoriasFiltradas = useMemo(
    () => categorias.filter((c) => c.tipo === tipo),
    [categorias, tipo]
  );

  const previaParcelamento = useMemo(() => {
    if (modo !== "parcelado") return null;
    const validacao = validarParcelamento(Number(parcelaAtual), Number(parcelaTotal));
    if (!validacao.ok) return null;

    const numeroDeParcelas = Number(parcelaTotal) - Number(parcelaAtual) + 1;
    const valorParcela = validarValorMonetario(valor);
    return {
      numeroDeParcelas,
      total: valorParcela.ok ? valorParcela.valor * numeroDeParcelas : null,
    };
  }, [modo, parcelaAtual, parcelaTotal, valor]);

  async function enviar() {
    setErro(null);

    if (!contaId) return setErro("Escolha uma conta.");
    if (!categoriaId) return setErro("Escolha uma categoria.");

    const valorValidado = validarValorMonetario(valor);
    if (!valorValidado.ok) return setErro(valorValidado.erro!);

    if (modo !== "recorrente" && !ehDataISOValida(data))
      return setErro("Informe uma data válida.");

    const {
      data: { user },
      error: erroUsuario,
    } = await supabase.auth.getUser();

    if (erroUsuario || !user) {
      return setErro("Sua sessão expirou. Entre de novo para continuar.");
    }

    const userId = user.id;
    const descricaoLimpa = descricao.trim();

    if (modo === "unico") {
      if (!avisoDuplicata && (await existeLancamentoIgual(valorValidado.valor))) {
        return setDuplicataAvisada({
          assinatura,
          texto:
            "Já existe um lançamento igual a este (mesma conta, categoria, valor e data). Se for mesmo um segundo lançamento, clique em Salvar outra vez.",
        });
      }

      const { error } = await supabase.from("transacoes").insert({
        user_id: userId,
        conta_id: contaId,
        categoria_id: categoriaId,
        tipo,
        valor: valorValidado.valor,
        descricao: descricaoLimpa || null,
        data,
      });
      if (error) return setErro(mensagemDeErroBanco(error.message));
    }

    if (modo === "recorrente") {
      const dia = Number(diaDoMes);
      if (!Number.isInteger(dia) || dia < 1 || dia > 31)
        return setErro("O dia do mês precisa ser um número inteiro entre 1 e 31.");

      const { data: recorrente, error } = await supabase
        .from("transacoes_recorrentes")
        .insert({
          user_id: userId,
          conta_id: contaId,
          categoria_id: categoriaId,
          valor: valorValidado.valor,
          descricao: descricaoLimpa || null,
          dia_do_mes: dia,
          ativo: true,
        })
        .select()
        .single();

      if (error || !recorrente) return setErro(mensagemDeErroBanco(error?.message));

      // Lança já o mês atual, sem esperar a próxima visita ao dashboard.
      const hoje = new Date();
      const diaValido = Math.min(dia, ultimoDiaDoMes(hoje.getFullYear(), hoje.getMonth()));
      const dataPrimeiroLancamento = paraISO(
        new Date(hoje.getFullYear(), hoje.getMonth(), diaValido)
      );

      // Se só o lançamento do mês falhar, a recorrência já existe e o dashboard
      // recria na próxima visita — não vale desfazer nem travar o usuário aqui.
      await supabase.from("transacoes").insert({
        user_id: userId,
        conta_id: contaId,
        categoria_id: categoriaId,
        tipo,
        valor: valorValidado.valor,
        descricao: descricaoLimpa || null,
        data: dataPrimeiroLancamento,
        transacao_recorrente_id: recorrente.id,
      });
    }

    if (modo === "parcelado") {
      const atual = Number(parcelaAtual);
      const total = Number(parcelaTotal);
      const validacao = validarParcelamento(atual, total);
      if (!validacao.ok) return setErro(validacao.erro!);

      if (!avisoDuplicata && (await existeLancamentoIgual(valorValidado.valor))) {
        return setDuplicataAvisada({
          assinatura,
          texto:
            "Já existe um lançamento com essa conta, categoria, valor e data. Se o parcelamento é novo mesmo, clique em Salvar outra vez.",
        });
      }

      const linhas = gerarParcelas({
        userId,
        contaId,
        categoriaId,
        tipo,
        valor: valorValidado.valor,
        descricao: descricaoLimpa,
        dataPrimeira: data,
        parcelaAtual: atual,
        parcelaTotal: total,
        grupoParcelaId: crypto.randomUUID(),
      });

      const { error } = await supabase.from("transacoes").insert(linhas);
      if (error) return setErro(mensagemDeErroBanco(error.message));
    }

    router.push(modo === "recorrente" ? "/transacoes/recorrentes" : "/dashboard");
    router.refresh();
  }

  const { executar: salvar, executando: salvando } = useAcaoUnica(enviar);

  const semContas = contas.length === 0;
  const semCategorias = categoriasFiltradas.length === 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        salvar();
      }}
      className="flex flex-col gap-4"
    >
      {/* Modo: único, recorrente ou parcelado */}
      <div className="flex rounded-sm border border-hairline p-1">
        {(
          [
            ["unico", "Único"],
            ["recorrente", "Conta fixa"],
            ["parcelado", "Parcelado"],
          ] as const
        ).map(([valorModo, rotulo]) => (
          <button
            key={valorModo}
            type="button"
            onClick={() => setModo(valorModo)}
            className={clsx(
              "flex-1 rounded-sm py-2 text-xs transition-colors sm:text-sm",
              modo === valorModo ? "bg-surface-2 text-gold" : "text-text-muted"
            )}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {/* Tipo: receita ou despesa */}
      <div className="flex rounded-sm border border-hairline p-1">
        {(["despesa", "receita"] as const).map((opcao) => (
          <button
            key={opcao}
            type="button"
            onClick={() => {
              setTipo(opcao);
              setCategoriaId("");
            }}
            className={clsx(
              "flex-1 rounded-sm py-2 text-sm capitalize transition-colors",
              tipo === opcao
                ? opcao === "despesa"
                  ? "bg-brick text-white"
                  : "bg-sage text-bg"
                : "text-text-muted"
            )}
          >
            {opcao}
          </button>
        ))}
      </div>

      <Input
        label={modo === "parcelado" ? "Valor de cada parcela" : "Valor"}
        inputMode="decimal"
        placeholder="0,00"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        required
      />

      <Input
        label="Descrição"
        placeholder={modo === "recorrente" ? "Ex: Aluguel" : "Ex: Mercado do mês"}
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        maxLength={140}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-text-muted" htmlFor="categoria">
          Categoria
        </label>
        <select
          id="categoria"
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className="rounded-sm border border-hairline bg-surface px-3 py-2.5 text-text focus:border-gold focus:outline-none"
          required
        >
          <option value="">Selecione...</option>
          {categoriasFiltradas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        {semCategorias && (
          <p className="text-xs text-text-muted">
            Nenhuma categoria de {tipo} cadastrada. Crie uma em Categorias antes de lançar.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-text-muted" htmlFor="conta">
          Conta
        </label>
        <select
          id="conta"
          value={contaId}
          onChange={(e) => setContaId(e.target.value)}
          className="rounded-sm border border-hairline bg-surface px-3 py-2.5 text-text focus:border-gold focus:outline-none"
          required
        >
          <option value="">Selecione...</option>
          {contas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Campos específicos de cada modo */}
      {modo === "unico" && (
        <Input
          type="date"
          label="Data"
          value={data}
          onChange={(e) => setData(e.target.value)}
          required
        />
      )}

      {modo === "recorrente" && (
        <Input
          label="Todo dia do mês"
          type="number"
          min={1}
          max={31}
          inputMode="numeric"
          placeholder="Ex: 5"
          value={diaDoMes}
          onChange={(e) => setDiaDoMes(e.target.value)}
          required
        />
      )}

      {modo === "parcelado" && (
        <>
          <Input
            type="date"
            label="Data desta parcela"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
          <div className="flex gap-3">
            <Input
              label="Parcela atual"
              type="number"
              min={1}
              max={MAX_PARCELAS}
              inputMode="numeric"
              placeholder="Ex: 1"
              value={parcelaAtual}
              onChange={(e) => setParcelaAtual(e.target.value)}
              required
            />
            <Input
              label="Total de parcelas"
              type="number"
              min={2}
              max={MAX_PARCELAS}
              inputMode="numeric"
              placeholder="Ex: 10"
              value={parcelaTotal}
              onChange={(e) => setParcelaTotal(e.target.value)}
              required
            />
          </div>
          <p className="text-xs text-text-muted">
            {previaParcelamento ? (
              <>
                Vai criar {previaParcelamento.numeroDeParcelas} lançamento(s): da parcela{" "}
                {parcelaAtual} até a {parcelaTotal}, uma por mês a partir da data acima.
                {previaParcelamento.total !== null && (
                  <> Total do parcelamento: {formatarMoeda(previaParcelamento.total)}.</>
                )}{" "}
                Depois dá para trocar a conta, a categoria ou apagar o parcelamento inteiro
                pelo Extrato.
              </>
            ) : (
              <>
                Confira o número de parcelas: o total precisa ser 2 ou mais (até{" "}
                {MAX_PARCELAS}) e a parcela atual precisa estar dentro dele.
              </>
            )}
          </p>
        </>
      )}

      {erro && (
        <p role="alert" className="text-sm text-brick">
          {erro}
        </p>
      )}

      {avisoDuplicata && (
        <p
          role="alert"
          className="rounded-sm border border-gold/40 bg-gold-soft px-3 py-2.5 text-sm text-gold"
        >
          {avisoDuplicata}
        </p>
      )}

      <Button
        type="submit"
        disabled={salvando || semContas || semCategorias}
        className="mt-2 w-full"
      >
        {salvando
          ? "Salvando..."
          : avisoDuplicata
          ? "Salvar mesmo assim"
          : "Salvar lançamento"}
      </Button>
    </form>
  );
}
