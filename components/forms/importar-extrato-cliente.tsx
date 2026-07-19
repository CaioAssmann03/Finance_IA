"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatarMoeda, formatarData } from "@/lib/utils/formatters";
import { parseOFX, type TransacaoImportada } from "@/lib/importacao/parse-ofx";
import {
  lerLinhasBrutas,
  sugerirLinhaCabecalho,
  paraDataISO,
  paraNumero,
} from "@/lib/importacao/parse-csv";
import { lerArquivoComCodificacao } from "@/lib/importacao/ler-arquivo";
import type { Conta, Categoria } from "@/types/database";
import { Upload, FileText } from "lucide-react";
import clsx from "clsx";

type Etapa = "upload" | "mapear" | "revisar" | "concluido";
type ModoValor = "unica" | "duas";
type ModoTipo = "sinal" | "despesa" | "receita";

interface LinhaPreview extends TransacaoImportada {
  incluir: boolean;
  categoriaId: string;
}

const SEM_COLUNA = -1;

export function ImportarExtratoCliente({
  contas,
  categorias,
}: {
  contas: Conta[];
  categorias: Categoria[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [etapa, setEtapa] = useState<Etapa>("upload");
  const [erro, setErro] = useState<string | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState("");

  const [linhasBrutas, setLinhasBrutas] = useState<string[][]>([]);
  const [indiceCabecalho, setIndiceCabecalho] = useState(0);
  const [colData, setColData] = useState(0);
  const [colDescricao, setColDescricao] = useState(1);
  const [modoValor, setModoValor] = useState<ModoValor>("unica");
  const [colValor, setColValor] = useState(2);
  const [modoTipo, setModoTipo] = useState<ModoTipo>("sinal");
  const [colCredito, setColCredito] = useState(SEM_COLUNA);
  const [colDebito, setColDebito] = useState(SEM_COLUNA);

  const [linhas, setLinhas] = useState<LinhaPreview[]>([]);
  const [contaId, setContaId] = useState(contas[0]?.id ?? "");
  const [salvando, setSalvando] = useState(false);
  const [totalImportado, setTotalImportado] = useState(0);

  const categoriaDespesaPadrao = categorias.find((c) => c.tipo === "despesa")?.id ?? "";
  const categoriaReceitaPadrao = categorias.find((c) => c.tipo === "receita")?.id ?? "";
  const cabecalhoAtual = linhasBrutas[indiceCabecalho] ?? [];
  const numColunas = Math.max(...linhasBrutas.slice(0, 20).map((l) => l.length), 1);

  function paraLinhasPreview(transacoes: TransacaoImportada[]): LinhaPreview[] {
    return transacoes.map((t) => ({
      ...t,
      incluir: true,
      categoriaId: t.tipo === "despesa" ? categoriaDespesaPadrao : categoriaReceitaPadrao,
    }));
  }

  async function lidarComArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setErro(null);
    setNomeArquivo(arquivo.name);

    const conteudo = await lerArquivoComCodificacao(arquivo);
    const ehOfx = /<OFX>/i.test(conteudo) || /\.ofx$/i.test(arquivo.name);

    if (ehOfx) {
      const transacoes = parseOFX(conteudo);
      if (transacoes.length === 0) {
        setErro("Não encontrei nenhuma transação nesse arquivo OFX.");
        return;
      }
      setLinhas(paraLinhasPreview(transacoes));
      setEtapa("revisar");
      return;
    }

    const brutas = lerLinhasBrutas(conteudo);
    if (brutas.length === 0) {
      setErro("Não consegui ler esse CSV. Confira se o arquivo não está vazio.");
      return;
    }

    const iCabecalho = sugerirLinhaCabecalho(brutas);
    setLinhasBrutas(brutas);
    setIndiceCabecalho(iCabecalho);

    const cabecalho = brutas[iCabecalho];
    const idx = (padroes: string[]) =>
      cabecalho.findIndex((c) => padroes.some((p) => c.toLowerCase().includes(p)));

    const iData = idx(["data", "date"]);
    const iDesc = idx(["descri", "histór", "historic", "memo", "lançamento"]);
    const iCredito = idx(["crédito", "credito", "entrada"]);
    const iDebito = idx(["débito", "debito", "saída", "saida"]);
    const iValor = idx(["valor", "amount", "montante"]);

    if (iData >= 0) setColData(iData);
    if (iDesc >= 0) setColDescricao(iDesc);

    if (iCredito >= 0 && iDebito >= 0) {
      setModoValor("duas");
      setColCredito(iCredito);
      setColDebito(iDebito);
    } else {
      setModoValor("unica");
      if (iValor >= 0) setColValor(iValor);
    }

    setEtapa("mapear");
  }

  function gerarPreviewDoCsv() {
    setErro(null);
    const linhasDeDados = linhasBrutas.slice(indiceCabecalho + 1);

    const transacoes: TransacaoImportada[] = [];
    for (const linha of linhasDeDados) {
      const dataTexto = linha[colData];
      const descricaoTexto = linha[colDescricao];
      const data = paraDataISO(dataTexto);
      if (!data) continue; // pula linhas de continuação/detalhe sem data própria

      let valor = 0;
      let tipo: "receita" | "despesa";

      if (modoValor === "duas") {
        const credito = paraNumero(linha[colCredito] ?? "");
        const debito = paraNumero(linha[colDebito] ?? "");
        if (credito !== 0) {
          valor = Math.abs(credito);
          tipo = "receita";
        } else if (debito !== 0) {
          valor = Math.abs(debito);
          tipo = "despesa";
        } else {
          continue; // linha sem valor em nenhuma das duas colunas (ex: saldo anterior)
        }
      } else {
        const valorBruto = paraNumero(linha[colValor] ?? "");
        if (valorBruto === 0) continue;
        valor = Math.abs(valorBruto);
        tipo =
          modoTipo === "despesa"
            ? "despesa"
            : modoTipo === "receita"
            ? "receita"
            : valorBruto < 0
            ? "despesa"
            : "receita";
      }

      transacoes.push({
        data,
        valor,
        tipo,
        descricao: descricaoTexto || "Lançamento importado",
      });
    }

    if (transacoes.length === 0) {
      setErro(
        "Nenhuma linha válida encontrada. Confira se a linha de cabeçalho e as colunas estão certas."
      );
      return;
    }

    setLinhas(paraLinhasPreview(transacoes));
    setEtapa("revisar");
  }

  function alternarLinha(indice: number) {
    setLinhas((atual) =>
      atual.map((l, i) => (i === indice ? { ...l, incluir: !l.incluir } : l))
    );
  }

  function mudarCategoriaLinha(indice: number, categoriaId: string) {
    setLinhas((atual) =>
      atual.map((l, i) => (i === indice ? { ...l, categoriaId } : l))
    );
  }

  function aplicarCategoriaATodos(tipo: "despesa" | "receita", categoriaId: string) {
    setLinhas((atual) =>
      atual.map((l) => (l.tipo === tipo ? { ...l, categoriaId } : l))
    );
  }

  async function confirmarImportacao() {
    setErro(null);
    const selecionadas = linhas.filter((l) => l.incluir);

    if (selecionadas.length === 0) {
      setErro("Selecione pelo menos um lançamento.");
      return;
    }
    if (!contaId) {
      setErro("Escolha em qual conta esses lançamentos entram.");
      return;
    }
    if (selecionadas.some((l) => !l.categoriaId)) {
      setErro("Defina uma categoria para todos os lançamentos selecionados.");
      return;
    }

    setSalvando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const registros = selecionadas.map((l) => ({
      user_id: user!.id,
      conta_id: contaId,
      categoria_id: l.categoriaId,
      tipo: l.tipo,
      valor: l.valor,
      descricao: l.descricao,
      data: l.data,
    }));

    const { error } = await supabase.from("transacoes").insert(registros);

    setSalvando(false);

    if (error) {
      setErro("Não foi possível salvar os lançamentos. Tente novamente.");
      return;
    }

    setTotalImportado(selecionadas.length);
    setEtapa("concluido");
    router.refresh();
  }

  const selecionadasCount = linhas.filter((l) => l.incluir).length;

  return (
    <div className="px-5 md:px-8">
      {etapa === "upload" && (
        <Card className="mx-auto max-w-lg text-center">
          <Upload size={24} className="mx-auto text-gold" strokeWidth={1.5} />
          <p className="mt-3 font-medium">Envie o extrato do seu banco ou cartão</p>
          <p className="mt-1 text-sm text-text-muted">
            Aceita arquivos <strong>.OFX</strong> (a maioria dos bancos exporta
            esse formato) ou <strong>.CSV</strong>.
          </p>
          <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-sm bg-gold px-4 py-2.5 text-sm font-medium text-[var(--on-accent)] hover:brightness-110">
            <FileText size={16} />
            Escolher arquivo
            <input
              type="file"
              accept=".ofx,.csv,.txt"
              onChange={lidarComArquivo}
              className="hidden"
            />
          </label>
          {erro && <p className="mt-4 text-sm text-brick">{erro}</p>}
        </Card>
      )}

      {etapa === "mapear" && linhasBrutas.length > 0 && (
        <Card className="mx-auto max-w-3xl">
          <p className="font-medium">Qual coluna é qual, em {nomeArquivo}?</p>
          <p className="mt-1 text-sm text-text-muted">
            Primeiro confirme qual linha é o cabeçalho de verdade — alguns
            bancos colocam linhas de título antes da tabela. Cliquei na que
            pareceu mais provável, mas confira.
          </p>

          <div className="mt-3 flex flex-col gap-1.5">
            <label className="text-sm text-text-muted">Linha de cabeçalho</label>
            <select
              value={indiceCabecalho}
              onChange={(e) => setIndiceCabecalho(Number(e.target.value))}
              className="rounded-sm border border-hairline bg-surface px-3 py-2.5 text-sm text-text focus:border-gold focus:outline-none"
            >
              {linhasBrutas.slice(0, 8).map((l, i) => (
                <option key={i} value={i}>
                  Linha {i + 1}: {l.filter(Boolean).join(" | ").slice(0, 70) || "(vazia)"}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 overflow-x-auto rounded-md border border-hairline">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-hairline bg-surface-2">
                  {Array.from({ length: numColunas }).map((_, i) => (
                    <th
                      key={i}
                      className={clsx(
                        "whitespace-nowrap px-3 py-2 text-left font-medium",
                        (i === colData ||
                          i === colDescricao ||
                          (modoValor === "unica" && i === colValor) ||
                          (modoValor === "duas" && (i === colCredito || i === colDebito))) &&
                          "text-gold"
                      )}
                    >
                      {cabecalhoAtual[i] || `Coluna ${i + 1}`}
                      {i === colData && " (data)"}
                      {i === colDescricao && " (descrição)"}
                      {modoValor === "unica" && i === colValor && " (valor)"}
                      {modoValor === "duas" && i === colCredito && " (crédito)"}
                      {modoValor === "duas" && i === colDebito && " (débito)"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhasBrutas.slice(indiceCabecalho + 1, indiceCabecalho + 6).map((linha, i) => (
                  <tr key={i} className="border-b border-hairline last:border-0">
                    {Array.from({ length: numColunas }).map((_, j) => (
                      <td
                        key={j}
                        className={clsx(
                          "whitespace-nowrap px-3 py-2",
                          (j === colData ||
                            j === colDescricao ||
                            (modoValor === "unica" && j === colValor) ||
                            (modoValor === "duas" && (j === colCredito || j === colDebito))) &&
                            "bg-gold/10"
                        )}
                      >
                        {linha[j] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <SeletorColuna
              rotulo="Coluna da data"
              cabecalho={cabecalhoAtual}
              numColunas={numColunas}
              valor={colData}
              onChange={setColData}
            />
            <SeletorColuna
              rotulo="Coluna da descrição"
              cabecalho={cabecalhoAtual}
              numColunas={numColunas}
              valor={colDescricao}
              onChange={setColDescricao}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-muted">
                O valor está numa coluna só, ou separado em Crédito/Débito?
              </label>
              <select
                value={modoValor}
                onChange={(e) => setModoValor(e.target.value as ModoValor)}
                className="rounded-sm border border-hairline bg-surface px-3 py-2.5 text-text focus:border-gold focus:outline-none"
              >
                <option value="unica">Uma coluna só</option>
                <option value="duas">Duas colunas (Crédito e Débito separados)</option>
              </select>
            </div>

            {modoValor === "unica" ? (
              <>
                <SeletorColuna
                  rotulo="Coluna do valor"
                  cabecalho={cabecalhoAtual}
                  numColunas={numColunas}
                  valor={colValor}
                  onChange={setColValor}
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-text-muted">
                    Como definir receita ou despesa?
                  </label>
                  <select
                    value={modoTipo}
                    onChange={(e) => setModoTipo(e.target.value as ModoTipo)}
                    className="rounded-sm border border-hairline bg-surface px-3 py-2.5 text-text focus:border-gold focus:outline-none"
                  >
                    <option value="sinal">Pelo sinal do valor (- despesa, + receita)</option>
                    <option value="despesa">Tudo é despesa (ex: fatura de cartão)</option>
                    <option value="receita">Tudo é receita</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                <SeletorColuna
                  rotulo="Coluna de Crédito (entradas)"
                  cabecalho={cabecalhoAtual}
                  numColunas={numColunas}
                  valor={colCredito}
                  onChange={setColCredito}
                />
                <SeletorColuna
                  rotulo="Coluna de Débito (saídas)"
                  cabecalho={cabecalhoAtual}
                  numColunas={numColunas}
                  valor={colDebito}
                  onChange={setColDebito}
                />
              </>
            )}
          </div>

          {erro && <p className="mt-3 text-sm text-brick">{erro}</p>}

          <Button onClick={gerarPreviewDoCsv} className="mt-5 w-full">
            Gerar prévia
          </Button>
        </Card>
      )}

      {etapa === "revisar" && (
        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-muted">
                Lançar tudo em qual conta?
              </label>
              <select
                value={contaId}
                onChange={(e) => setContaId(e.target.value)}
                className="rounded-sm border border-hairline bg-surface px-3 py-2.5 text-sm text-text focus:border-gold focus:outline-none"
              >
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm text-text-muted">
              {selecionadasCount} de {linhas.length} selecionado(s)
            </p>
          </div>

          <div className="mb-4 flex flex-wrap gap-3 text-sm">
            <AplicarCategoriaRapida
              rotulo="Categoria p/ todas as despesas"
              categorias={categorias.filter((c) => c.tipo === "despesa")}
              onEscolher={(id) => aplicarCategoriaATodos("despesa", id)}
            />
            <AplicarCategoriaRapida
              rotulo="Categoria p/ todas as receitas"
              categorias={categorias.filter((c) => c.tipo === "receita")}
              onEscolher={(id) => aplicarCategoriaATodos("receita", id)}
            />
          </div>

          <div className="max-h-[50vh] overflow-y-auto rounded-md border border-hairline">
            <ul className="flex flex-col divide-y divide-hairline">
              {linhas.map((l, i) => (
                <li
                  key={i}
                  className={clsx(
                    "flex flex-wrap items-center gap-3 px-4 py-3 text-sm",
                    !l.incluir && "opacity-40"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={l.incluir}
                    onChange={() => alternarLinha(i)}
                    className="accent-gold"
                  />
                  <div className="min-w-[160px] flex-1">
                    <p className="truncate">{l.descricao}</p>
                    <p className="text-xs text-text-muted">{formatarData(l.data)}</p>
                  </div>
                  <span
                    className={clsx(
                      "tabular w-24 shrink-0 text-right",
                      l.tipo === "receita" ? "text-sage" : "text-brick"
                    )}
                  >
                    {l.tipo === "receita" ? "+" : "-"}
                    {formatarMoeda(l.valor)}
                  </span>
                  <select
                    value={l.categoriaId}
                    onChange={(e) => mudarCategoriaLinha(i, e.target.value)}
                    className="rounded-sm border border-hairline bg-surface px-2 py-1.5 text-xs text-text focus:border-gold focus:outline-none"
                  >
                    {categorias
                      .filter((c) => c.tipo === l.tipo)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                  </select>
                </li>
              ))}
            </ul>
          </div>

          {erro && <p className="mt-3 text-sm text-brick">{erro}</p>}

          <Button
            onClick={confirmarImportacao}
            disabled={salvando}
            className="mt-4 w-full sm:w-auto"
          >
            {salvando
              ? "Importando..."
              : `Importar ${selecionadasCount} lançamento(s)`}
          </Button>
        </div>
      )}

      {etapa === "concluido" && (
        <Card className="mx-auto max-w-lg text-center">
          <p className="font-medium text-sage">
            {totalImportado} lançamento(s) importado(s)! 🎉
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Button variant="secondary" onClick={() => router.push("/transacoes")}>
              Ver extrato
            </Button>
            <Button onClick={() => window.location.reload()}>
              Importar outro arquivo
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function SeletorColuna({
  rotulo,
  cabecalho,
  numColunas,
  valor,
  onChange,
}: {
  rotulo: string;
  cabecalho: string[];
  numColunas: number;
  valor: number;
  onChange: (i: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-text-muted">{rotulo}</label>
      <select
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-sm border border-hairline bg-surface px-3 py-2.5 text-text focus:border-gold focus:outline-none"
      >
        {Array.from({ length: numColunas }).map((_, i) => (
          <option key={i} value={i}>
            {cabecalho[i] || `Coluna ${i + 1}`}
          </option>
        ))}
      </select>
    </div>
  );
}

function AplicarCategoriaRapida({
  rotulo,
  categorias,
  onEscolher,
}: {
  rotulo: string;
  categorias: Categoria[];
  onEscolher: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-text-muted">{rotulo}:</span>
      <select
        defaultValue=""
        onChange={(e) => e.target.value && onEscolher(e.target.value)}
        className="rounded-sm border border-hairline bg-surface px-2 py-1.5 text-xs text-text focus:border-gold focus:outline-none"
      >
        <option value="">Escolher...</option>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>
    </div>
  );
}
