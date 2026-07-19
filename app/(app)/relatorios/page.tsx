import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { Card } from "@/components/ui/card";
import { GraficoEvolucaoMensal, type PontoEvolucaoMensal } from "@/components/charts/grafico-evolucao-mensal";
import { SeloComparacao } from "@/components/dashboard/selo-comparacao";
import { formatarMoeda, formatarData } from "@/lib/utils/formatters";
import type { Transacao, Categoria } from "@/types/database";
import Link from "next/link";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet } from "lucide-react";

const NOMES_MESES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const { ano: anoParam } = await searchParams;
  const ano = anoParam ? Number(anoParam) : new Date().getFullYear();

  const supabase = await createClient();

  const inicioAno = `${ano}-01-01`;
  const fimAno = `${ano}-12-31`;
  const inicioAnoAnterior = `${ano - 1}-01-01`;
  const fimAnoAnterior = `${ano - 1}-12-31`;

  const [{ data: transacoesAno }, { data: transacoesAnoAnterior }, { data: categorias }] =
    await Promise.all([
      supabase
        .from("transacoes")
        .select("*")
        .gte("data", inicioAno)
        .lte("data", fimAno)
        .returns<Transacao[]>(),
      supabase
        .from("transacoes")
        .select("*")
        .gte("data", inicioAnoAnterior)
        .lte("data", fimAnoAnterior)
        .returns<Transacao[]>(),
      supabase.from("categorias").select("*").returns<Categoria[]>(),
    ]);

  const lista = transacoesAno ?? [];
  const listaAnterior = transacoesAnoAnterior ?? [];
  const mapaCategorias = new Map((categorias ?? []).map((c) => [c.id, c]));

  const receitasAno = lista.filter((t) => t.tipo === "receita").reduce((s, t) => s + t.valor, 0);
  const despesasAno = lista.filter((t) => t.tipo === "despesa").reduce((s, t) => s + t.valor, 0);
  const saldoAno = receitasAno - despesasAno;

  const despesasAnoAnterior = listaAnterior
    .filter((t) => t.tipo === "despesa")
    .reduce((s, t) => s + t.valor, 0);
  const receitasAnoAnterior = listaAnterior
    .filter((t) => t.tipo === "receita")
    .reduce((s, t) => s + t.valor, 0);

  const evolucaoAnual: PontoEvolucaoMensal[] = NOMES_MESES.map((mes, i) => {
    const doMes = lista.filter((t) => new Date(t.data + "T00:00:00").getMonth() === i);
    return {
      mes,
      receitas: doMes.filter((t) => t.tipo === "receita").reduce((s, t) => s + t.valor, 0),
      despesas: doMes.filter((t) => t.tipo === "despesa").reduce((s, t) => s + t.valor, 0),
    };
  });

  const gastoPorCategoria = new Map<string, number>();
  for (const t of lista.filter((t) => t.tipo === "despesa")) {
    gastoPorCategoria.set(t.categoria_id, (gastoPorCategoria.get(t.categoria_id) ?? 0) + t.valor);
  }
  const topCategorias = Array.from(gastoPorCategoria.entries())
    .map(([categoriaId, valor]) => ({
      nome: mapaCategorias.get(categoriaId)?.nome ?? "—",
      cor: mapaCategorias.get(categoriaId)?.cor ?? "#6B6B6B",
      valor,
      percentual: despesasAno > 0 ? (valor / despesasAno) * 100 : 0,
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 8);

  const maiorGasto = [...lista]
    .filter((t) => t.tipo === "despesa")
    .sort((a, b) => b.valor - a.valor)[0];

  const anoAtualCalendario = new Date().getFullYear();

  return (
    <div>
      <CabecalhoPagina
        titulo="Resumo anual"
        subtitulo="Visão consolidada do ano"
        acao={
          <div className="flex items-center gap-2">
            <Link
              href={`/relatorios?ano=${ano - 1}`}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-hairline text-text-muted hover:bg-surface-2"
              aria-label="Ano anterior"
            >
              <ChevronLeft size={16} />
            </Link>
            <span className="w-16 text-center font-[family-name:var(--font-numeric)] text-lg">
              {ano}
            </span>
            <Link
              href={`/relatorios?ano=${ano + 1}`}
              aria-disabled={ano >= anoAtualCalendario}
              className={`flex h-9 w-9 items-center justify-center rounded-md border border-hairline text-text-muted hover:bg-surface-2 ${
                ano >= anoAtualCalendario ? "pointer-events-none opacity-30" : ""
              }`}
              aria-label="Próximo ano"
            >
              <ChevronRight size={16} />
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 px-5 md:grid-cols-3 md:px-8">
        <Card className="overflow-hidden border-l-2 border-l-gold">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-text-muted">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold-soft text-gold">
              <Wallet size={14} strokeWidth={2} />
            </span>
            Saldo do ano
          </div>
          <p className="mt-3 font-[family-name:var(--font-numeric)] text-3xl">
            {formatarMoeda(saldoAno)}
          </p>
        </Card>
        <Card className="overflow-hidden border-l-2 border-l-sage">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-text-muted">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sage-soft text-sage">
              <TrendingUp size={14} strokeWidth={2} />
            </span>
            Receitas do ano
          </div>
          <p className="mt-3 font-[family-name:var(--font-numeric)] text-3xl text-sage">
            {formatarMoeda(receitasAno)}
          </p>
          <div className="mt-1">
            <SeloComparacao
              atual={receitasAno}
              anterior={receitasAnoAnterior}
              positivoEBom
              rotulo={`vs ${ano - 1}`}
            />
          </div>
        </Card>
        <Card className="overflow-hidden border-l-2 border-l-brick">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-text-muted">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brick-soft text-brick">
              <TrendingDown size={14} strokeWidth={2} />
            </span>
            Despesas do ano
          </div>
          <p className="mt-3 font-[family-name:var(--font-numeric)] text-3xl text-brick">
            {formatarMoeda(despesasAno)}
          </p>
          <div className="mt-1">
            <SeloComparacao
              atual={despesasAno}
              anterior={despesasAnoAnterior}
              positivoEBom={false}
              rotulo={`vs ${ano - 1}`}
            />
          </div>
        </Card>
      </div>

      <div className="mt-6 px-5 md:px-8">
        <Card>
          <p className="mb-4 text-sm text-text-muted">Mês a mês em {ano}</p>
          {lista.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">
              Nenhum lançamento em {ano}.
            </p>
          ) : (
            <GraficoEvolucaoMensal dados={evolucaoAnual} />
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-4 px-5 md:grid-cols-2 md:px-8">
        <Card>
          <p className="mb-4 text-sm text-text-muted">Categorias que mais pesaram no ano</p>
          {topCategorias.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">
              Nenhuma despesa em {ano}.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {topCategorias.map((c) => (
                <li key={c.nome}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: c.cor }}
                      />
                      {c.nome}
                    </span>
                    <span className="tabular text-text-muted">
                      {formatarMoeda(c.valor)} · {c.percentual.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${c.percentual}%`, background: c.cor }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <p className="mb-4 text-sm text-text-muted">Destaques do ano</p>
          {maiorGasto ? (
            <div className="ledger-row text-sm">
              <span className="text-text">
                Maior gasto: {maiorGasto.descricao || "Sem descrição"}
                <span className="ml-2 text-xs text-text-muted">
                  {formatarData(maiorGasto.data)}
                </span>
              </span>
              <span className="ledger-leader" />
              <span className="tabular text-brick">{formatarMoeda(maiorGasto.valor)}</span>
            </div>
          ) : (
            <p className="text-sm text-text-muted">Nenhum gasto registrado em {ano}.</p>
          )}
          <div className="mt-4 flex flex-col gap-2 text-sm text-text-muted">
            <p>
              Média de despesa mensal:{" "}
              <span className="tabular text-text">
                {formatarMoeda(despesasAno / 12)}
              </span>
            </p>
            <p>
              Média de receita mensal:{" "}
              <span className="tabular text-text">
                {formatarMoeda(receitasAno / 12)}
              </span>
            </p>
            <p>
              Total de lançamentos no ano:{" "}
              <span className="tabular text-text">{lista.length}</span>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
