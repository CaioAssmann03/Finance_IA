import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { Card } from "@/components/ui/card";
import { GraficoCategorias } from "@/components/charts/grafico-categorias";
import { formatarMoeda, nomeDoMes, formatarData } from "@/lib/utils/formatters";
import type { Conta, Transacao, Categoria } from "@/types/database";
import Link from "next/link";
import { Plus } from "lucide-react";

function inicioFimDoMes() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  return {
    inicio: inicio.toISOString().slice(0, 10),
    fim: fim.toISOString().slice(0, 10),
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { inicio, fim } = inicioFimDoMes();

  const [{ data: contas }, { data: transacoesMes }, { data: categorias }] =
    await Promise.all([
      supabase.from("contas").select("*").returns<Conta[]>(),
      supabase
        .from("transacoes")
        .select("*")
        .gte("data", inicio)
        .lte("data", fim)
        .order("data", { ascending: false })
        .returns<Transacao[]>(),
      supabase.from("categorias").select("*").returns<Categoria[]>(),
    ]);

  const listaContas = contas ?? [];
  const listaTransacoes = transacoesMes ?? [];
  const listaCategorias = categorias ?? [];

  const saldoTotal = listaContas.reduce((soma, conta) => {
    const movimentado = listaTransacoes
      .filter((t) => t.conta_id === conta.id)
      .reduce(
        (acc, t) => acc + (t.tipo === "receita" ? t.valor : -t.valor),
        0
      );
    return soma + conta.saldo_inicial + movimentado;
  }, 0);

  const receitasMes = listaTransacoes
    .filter((t) => t.tipo === "receita")
    .reduce((s, t) => s + t.valor, 0);

  const despesasMes = listaTransacoes
    .filter((t) => t.tipo === "despesa")
    .reduce((s, t) => s + t.valor, 0);

  const gastosPorCategoria = listaCategorias
    .filter((c) => c.tipo === "despesa")
    .map((cat) => ({
      nome: cat.nome,
      cor: cat.cor,
      valor: listaTransacoes
        .filter((t) => t.categoria_id === cat.id && t.tipo === "despesa")
        .reduce((s, t) => s + t.valor, 0),
    }))
    .filter((c) => c.valor > 0)
    .sort((a, b) => b.valor - a.valor);

  const maioresGastos = [...listaTransacoes]
    .filter((t) => t.tipo === "despesa")
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);

  return (
    <div>
      <CabecalhoPagina
        titulo="Visão geral"
        subtitulo={nomeDoMes()}
        acao={
          <Link
            href="/transacoes/novo"
            className="inline-flex items-center gap-2 rounded-sm bg-gold px-4 py-2.5 text-sm font-medium text-bg hover:brightness-110"
          >
            <Plus size={16} />
            Lançar
          </Link>
        }
      />

      <div className="grid gap-4 px-5 md:grid-cols-3 md:px-8">
        <Card>
          <p className="text-xs uppercase tracking-wide text-text-muted">
            Saldo total
          </p>
          <p className="mt-2 font-[family-name:var(--font-numeric)] text-2xl">
            {formatarMoeda(saldoTotal)}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-text-muted">
            Receitas do mês
          </p>
          <p className="mt-2 font-[family-name:var(--font-numeric)] text-2xl text-sage">
            {formatarMoeda(receitasMes)}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-text-muted">
            Despesas do mês
          </p>
          <p className="mt-2 font-[family-name:var(--font-numeric)] text-2xl text-brick">
            {formatarMoeda(despesasMes)}
          </p>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 px-5 md:grid-cols-2 md:px-8">
        <Card>
          <p className="mb-4 text-sm text-text-muted">Gastos por categoria</p>
          <GraficoCategorias dados={gastosPorCategoria} />
        </Card>

        <Card>
          <p className="mb-4 text-sm text-text-muted">Maiores gastos do mês</p>
          {maioresGastos.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">
              Nada lançado ainda este mês.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {maioresGastos.map((t) => (
                <li key={t.id} className="ledger-row text-sm">
                  <span className="text-text">
                    {t.descricao || "Sem descrição"}
                    <span className="ml-2 text-xs text-text-muted">
                      {formatarData(t.data)}
                    </span>
                  </span>
                  <span className="ledger-leader" />
                  <span className="tabular text-brick">
                    {formatarMoeda(t.valor)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
