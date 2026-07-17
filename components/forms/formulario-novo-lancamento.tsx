"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [diaDoMes, setDiaDoMes] = useState("5");
  const [parcelaAtual, setParcelaAtual] = useState("1");
  const [parcelaTotal, setParcelaTotal] = useState("2");
  const [contaId, setContaId] = useState(contas[0]?.id ?? "");
  const [categoriaId, setCategoriaId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const categoriasFiltradas = categorias.filter((c) => c.tipo === tipo);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!contaId || !categoriaId || !valor) {
      setErro("Preencha valor, conta e categoria.");
      return;
    }

    setSalvando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user!.id;
    const valorNumerico = Number(valor.replace(",", "."));

    if (modo === "unico") {
      const { error } = await supabase.from("transacoes").insert({
        user_id: userId,
        conta_id: contaId,
        categoria_id: categoriaId,
        tipo,
        valor: valorNumerico,
        descricao,
        data,
      });
      if (error) {
        setSalvando(false);
        setErro("Não foi possível salvar. Tente novamente.");
        return;
      }
    }

    if (modo === "recorrente") {
      const { data: recorrente, error } = await supabase
        .from("transacoes_recorrentes")
        .insert({
          user_id: userId,
          conta_id: contaId,
          categoria_id: categoriaId,
          valor: valorNumerico,
          descricao,
          dia_do_mes: Number(diaDoMes),
          ativo: true,
        })
        .select()
        .single();

      if (error || !recorrente) {
        setSalvando(false);
        setErro("Não foi possível criar a recorrência.");
        return;
      }

      // Lança já o mês atual, sem esperar a próxima visita ao dashboard
      const hoje = new Date();
      const ultimoDia = new Date(
        hoje.getFullYear(),
        hoje.getMonth() + 1,
        0
      ).getDate();
      const diaValido = Math.min(Number(diaDoMes), ultimoDia);
      const dataPrimeiroLancamento = new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        diaValido
      )
        .toISOString()
        .slice(0, 10);

      await supabase.from("transacoes").insert({
        user_id: userId,
        conta_id: contaId,
        categoria_id: categoriaId,
        tipo,
        valor: valorNumerico,
        descricao,
        data: dataPrimeiroLancamento,
        transacao_recorrente_id: recorrente.id,
      });
    }

    if (modo === "parcelado") {
      const total = Number(parcelaTotal);
      const atual = Number(parcelaAtual);

      if (!total || !atual || atual > total || atual < 1) {
        setSalvando(false);
        setErro("Confira o número de parcelas.");
        return;
      }

      const grupoParcelaId = crypto.randomUUID();
      const dataBase = new Date(data + "T00:00:00");

      const parcelas = [];
      for (let n = atual; n <= total; n++) {
        const dataParcela = new Date(dataBase);
        dataParcela.setMonth(dataBase.getMonth() + (n - atual));
        parcelas.push({
          user_id: userId,
          conta_id: contaId,
          categoria_id: categoriaId,
          tipo,
          valor: valorNumerico,
          descricao: descricao
            ? `${descricao} (${n}/${total})`
            : `Parcela ${n}/${total}`,
          data: dataParcela.toISOString().slice(0, 10),
          parcela_atual: n,
          parcela_total: total,
          grupo_parcela_id: grupoParcelaId,
        });
      }

      const { error } = await supabase.from("transacoes").insert(parcelas);
      if (error) {
        setSalvando(false);
        setErro("Não foi possível salvar as parcelas.");
        return;
      }
    }

    setSalvando(false);
    router.push(modo === "recorrente" ? "/transacoes/recorrentes" : "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4">
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
              modo === valorModo
                ? "bg-surface-2 text-gold"
                : "text-text-muted"
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
        placeholder={
          modo === "recorrente" ? "Ex: Aluguel" : "Ex: Mercado do mês"
        }
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-text-muted">Categoria</label>
        <select
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
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-text-muted">Conta</label>
        <select
          value={contaId}
          onChange={(e) => setContaId(e.target.value)}
          className="rounded-sm border border-hairline bg-surface px-3 py-2.5 text-text focus:border-gold focus:outline-none"
          required
        >
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
              inputMode="numeric"
              placeholder="Ex: 1"
              value={parcelaAtual}
              onChange={(e) => setParcelaAtual(e.target.value)}
              required
            />
            <Input
              label="Total de parcelas"
              inputMode="numeric"
              placeholder="Ex: 10"
              value={parcelaTotal}
              onChange={(e) => setParcelaTotal(e.target.value)}
              required
            />
          </div>
          <p className="text-xs text-text-muted">
            Isso vai criar {Math.max(Number(parcelaTotal) - Number(parcelaAtual) + 1, 0)}{" "}
            lançamento(s): da parcela {parcelaAtual} até a {parcelaTotal},
            uma por mês a partir da data acima. Parcelas anteriores à atual
            não são criadas.
          </p>
        </>
      )}

      {erro && <p className="text-sm text-brick">{erro}</p>}

      <Button type="submit" disabled={salvando} className="mt-2 w-full">
        {salvando ? "Salvando..." : "Salvar lançamento"}
      </Button>
    </form>
  );
}
