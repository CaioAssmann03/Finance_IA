import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { Card } from "@/components/ui/card";
import { GraficoCategorias } from "@/components/charts/grafico-categorias";
import { formatarMoeda, nomeDoMes, formatarData } from "@/lib/utils/formatters";
import { gerarLancamentosDoMes } from "@/lib/recorrentes/gerar-lancamentos-do-mes";
import { mesReferenciaAtual } from "@/lib/utils/mes-referencia";
import { alertasDeContasFixas, alertasDeOrcamento } from "@/lib/notificacoes/calcular-alertas";
import { AlertasFinanceiros } from "@/components/notificacoes/alertas-financeiros";
import type { Conta, Transacao, Categoria, Orcamento, TransacaoRecorrente } from "@/types/database";
import Link from "next/link";
import { Plus, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import clsx from "clsx";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await gerarLancamentosDoMes(supabase, user.id);
  }

  const { inicio, fim } = inicioFimDoMes();

  const [
    { data: contas },
    { data: transacoesMes },
    { data: categorias },
    { data: orcamentos },
    { data: recorrentesAtivas },
  ] = await Promise.all([
      supabase.from("contas").select("*").returns<Conta[]>(),
      supabase
        .from("transacoes")
        .select("*")
        .gte("data", inicio)
        .lte("data", fim)
        .order("data", { ascending: false })
        .returns<Transacao[]>(),
      supabase.from("categorias").select("*").returns<Categoria[]>(),
      supabase
        .from("orcamentos")
        .select("*")
        .eq("mes_referencia", mesReferenciaAtual())
        .returns<Orcamento[]>(),
      supabase
        .from("transacoes_recorrentes")
        .select("*")
        .eq("ativo", true)
        .returns<TransacaoRecorrente[]>(),
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

  const listaOrcamentos = orcamentos ?? [];
  const orcamentoPorCategoria = listaOrcamentos
    .map((orc) => {
      const categoria = listaCategorias.find((c) => c.id === orc.categoria_id);
      const gasto = listaTransacoes
        .filter((t) => t.categoria_id === orc.categoria_id && t.tipo === "despesa")
        .reduce((s, t) => s + t.valor, 0);
      const percentual = orc.valor_limite > 0 ? (gasto / orc.valor_limite) * 100 : 0;
      return {
        nome: categoria?.nome ?? "—",
        cor: categoria?.cor ?? "#6B6B6B",
        gasto,
        limite: orc.valor_limite,
        percentual,
      };
    })
    .sort((a, b) => b.percentual - a.percentual);

  const alertas = [
    ...alertasDeContasFixas(recorrentesAtivas ?? []),
    ...alertasDeOrcamento(orcamentoPorCategoria),
  ];

  return (
    <div>
      <CabecalhoPagina
        titulo="Visão geral"
        subtitulo={nomeDoMes()}
        acao={
          <Link
            href="/transacoes/novo"
            className="inline-flex items-center gap-2 rounded-md bg-gradient-to-b from-[#E4C155] to-[#C9A227] px-4 py-2.5 text-sm font-medium text-bg shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_4px_14px_-2px_var(--gold-glow)] transition-all hover:brightness-105"
          >
            <Plus size={16} />
            Lançar
          </Link>
        }
      />

      <AlertasFinanceiros alertas={alertas} />

      <div className="grid gap-4 px-5 md:grid-cols-3 md:px-8">
        <Card className="overflow-hidden border-l-2 border-l-gold">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-text-muted">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold-soft text-gold">
              <Wallet size={14} strokeWidth={2} />
            </span>
            Saldo total
          </div>
          <p className="mt-3 font-[family-name:var(--font-numeric)] text-3xl">
            {formatarMoeda(saldoTotal)}
          </p>
        </Card>
        <Card className="overflow-hidden border-l-2 border-l-sage">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-text-muted">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sage-soft text-sage">
              <TrendingUp size={14} strokeWidth={2} />
            </span>
            Receitas do mês
          </div>
          <p className="mt-3 font-[family-name:var(--font-numeric)] text-3xl text-sage">
            {formatarMoeda(receitasMes)}
          </p>
        </Card>
        <Card className="overflow-hidden border-l-2 border-l-brick">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-text-muted">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brick-soft text-brick">
              <TrendingDown size={14} strokeWidth={2} />
            </span>
            Despesas do mês
          </div>
          <p className="mt-3 font-[family-name:var(--font-numeric)] text-3xl text-brick">
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

      {orcamentoPorCategoria.length > 0 && (
        <div className="mt-6 px-5 md:px-8">
          <Card>
            <p className="mb-4 text-sm text-text-muted">Orçamento do mês</p>
            <ul className="flex flex-col gap-4">
              {orcamentoPorCategoria.map((o) => (
                <li key={o.nome}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: o.cor }}
                      />
                      {o.nome}
                    </span>
                    <span className="tabular text-text-muted">
                      {formatarMoeda(o.gasto)} / {formatarMoeda(o.limite)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={clsx(
                        "h-full rounded-full transition-all",
                        o.percentual < 80 && "bg-sage",
                        o.percentual >= 80 && o.percentual < 100 && "bg-gold",
                        o.percentual >= 100 && "bg-brick"
                      )}
                      style={{ width: `${Math.min(o.percentual, 100)}%` }}
                    />
                  </div>
                  {o.percentual >= 100 && (
                    <p className="mt-1 text-xs text-brick">
                      Orçamento estourado.
                    </p>
                  )}
                  {o.percentual >= 80 && o.percentual < 100 && (
                    <p className="mt-1 text-xs text-gold">
                      Perto do limite.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
