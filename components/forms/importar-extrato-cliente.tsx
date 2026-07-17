"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatarMoeda, formatarData } from "@/lib/utils/formatters";
import { parseOFX, type TransacaoImportada } from "@/lib/importacao/parse-ofx";
import { lerCsvBruto, paraDataISO, paraNumero, type CsvBruto } from "@/lib/importacao/parse-csv";
import type { Conta, Categoria } from "@/types/database";
import { Upload, FileText } from "lucide-react";
import clsx from "clsx";

type Etapa = "upload" | "mapear" | "revisar" | "concluido";
type ModoTipo = "sinal" | "despesa" | "receita";

interface LinhaPreview extends TransacaoImportada {
  incluir: boolean;
  categoriaId: string;
}

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

  const [csvBruto, setCsvBruto] = useState<CsvBruto | null>(null);
  const [colData, setColData] = useState(0);
  const [colDescricao, setColDescricao] = useState(1);
  const [colValor, setColValor] = useState(2);
  const [modoTipo, setModoTipo] = useState<ModoTipo>("sinal");

  const [linhas, setLinhas] = useState<LinhaPreview[]>([]);
  const [contaId, setContaId] = useState(contas[0]?.id ?? "");
  const [salvando, setSalvando] = useState(false);
  const [totalImportado, setTotalImportado] = useState(0);

  const categoriaDespesaPadrao = categorias.find((c) => c.tipo === "despesa")?.id ?? "";
  const categoriaReceitaPadrao = categorias.find((c) => c.tipo === "receita")?.id ?? "";

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

    const conteudo = await arquivo.text();
    const ehOfx = /<OFX>/i.test(conteudo) || /\.ofx$/i.test(arquivo.name);

    if (ehOfx) {
      const transacoes = parseOFX(conteudo);
      if (transacoes.length === 0) {
        setErro("Não encontrei nenhuma transação nesse arquivo OFX.");
        return;
      }
      setLinhas(paraLinhasPreview(transacoes));
      setEtapa("revisar");
    } else {
      const bruto = lerCsvBruto(conteudo);
      if (bruto.linhas.length === 0) {
        setErro("Não consegui ler esse CSV. Confira se o arquivo não está vazio.");
        return;
      }
      setCsvBruto(bruto);
      // Tenta adivinhar as colunas pelo nome do cabeçalho
      const idx = (padroes: string[]) =>
        bruto.cabecalho.findIndex((c) =>
          padroes.some((p) => c.toLowerCase().includes(p))
        );
      const iData = idx(["data", "date"]);
      const iDesc = idx(["descri", "histór", "historic", "memo", "lançamento"]);
      const iValor = idx(["valor", "amount", "montante"]);
      if (iData >= 0) setColData(iData);
      if (iDesc >= 0) setColDescricao(iDesc);
      if (iValor >= 0) setColValor(iValor);
      setEtapa("mapear");
    }
  }

  function gerarPreviewDoCsv() {
    if (!csvBruto) return;
    setErro(null);

    const transacoes: TransacaoImportada[] = [];
    for (const linha of csvBruto.linhas) {
      const dataTexto = linha[colData];
      const descricaoTexto = linha[colDescricao];
      const valorTexto = linha[colValor];
      if (!dataTexto || !valorTexto) continue;

      const data = paraDataISO(dataTexto);
      const valorBruto = paraNumero(valorTexto);
      if (!data || valorBruto === 0) continue;

      const tipo: "receita" | "despesa" =
        modoTipo === "despesa"
          ? "despesa"
          : modoTipo === "receita"
          ? "receita"
          : valorBruto < 0
          ? "despesa"
          : "receita";

      transacoes.push({
        data,
        valor: Math.abs(valorBruto),
        tipo,
        descricao: descricaoTexto || "Lançamento importado",
      });
    }

    if (transacoes.length === 0) {
      setErro("Nenhuma linha válida encontrada com esse mapeamento de colunas.");
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
          <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-sm bg-gold px-4 py-2.5 text-sm font-medium text-bg hover:brightness-110">
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

      {etapa === "mapear" && csvBruto && (
        <Card className="mx-auto max-w-lg">
          <p className="font-medium">Qual coluna é qual, em {nomeArquivo}?</p>
          <p className="mt-1 text-sm text-text-muted">
            Confira o mapeamento (tentei adivinhar automaticamente).
          </p>

          <div className="mt-4 flex flex-col gap-3">
            <SeletorColuna
              rotulo="Coluna da data"
              cabecalho={csvBruto.cabecalho}
              valor={colData}
              onChange={setColData}
            />
            <SeletorColuna
              rotulo="Coluna da descrição"
              cabecalho={csvBruto.cabecalho}
              valor={colDescricao}
              onChange={setColDescricao}
            />
            <SeletorColuna
              rotulo="Coluna do valor"
              cabecalho={csvBruto.cabecalho}
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
  valor,
  onChange,
}: {
  rotulo: string;
  cabecalho: string[];
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
        {cabecalho.map((c, i) => (
          <option key={i} value={i}>
            {c || `Coluna ${i + 1}`}
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
