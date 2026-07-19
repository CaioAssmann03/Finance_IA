import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { Card } from "@/components/ui/card";
import { GraficoCategorias } from "@/components/charts/grafico-categorias";
import { GraficoEvolucaoMensal, type PontoEvolucaoMensal } from "@/components/charts/grafico-evolucao-mensal";
import { GraficoSaldoAcumulado, type PontoSaldo } from "@/components/charts/grafico-saldo-acumulado";
import { SeloComparacao } from "@/components/dashboard/selo-comparacao";
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

function inicioDosUltimosMeses(quantidade: number) {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - (quantidade - 1), 1);
  return inicio.toISOString().slice(0, 10);
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
  const inicioSeisMeses = inicioDosUltimosMeses(6);

  const [
    { data: contas },
    { data: transacoesMes },
    { data: categorias },
    { data: orcamentos },
    { data: recorrentesAtivas },
    { data: transacoesSeisMeses },
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
      supabase
        .from("transacoes")
        .select("*")
        .gte("data", inicioSeisMeses)
        .lte("data", fim)
        .returns<Transacao[]>(),
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

  // Série dos últimos 6 meses (receitas x despesas por mês)
  const listaSeisMeses = transacoesSeisMeses ?? [];
  const hoje = new Date();
  const evolucaoMensal: PontoEvolucaoMensal[] = Array.from({ length: 6 }).map((_, i) => {
    const dataDoMes = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - i), 1);
    const chave = `${dataDoMes.getFullYear()}-${String(dataDoMes.getMonth() + 1).padStart(2, "0")}`;
    const doMes = listaSeisMeses.filter((t) => t.data.slice(0, 7) === chave);
    return {
      mes: dataDoMes
        .toLocaleDateString("pt-BR", { month: "short" })
        .replace(".", ""),
      receitas: doMes.filter((t) => t.tipo === "receita").reduce((s, t) => s + t.valor, 0),
      despesas: doMes.filter((t) => t.tipo === "despesa").reduce((s, t) => s + t.valor, 0),
    };
  });

  // Comparação com o mês imediatamente anterior
  const mesAnteriorRef = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const chaveMesAnterior = `${mesAnteriorRef.getFullYear()}-${String(mesAnteriorRef.getMonth() + 1).padStart(2, "0")}`;
  const transacoesMesAnterior = listaSeisMeses.filter(
    (t) => t.data.slice(0, 7) === chaveMesAnterior
  );
  const receitasMesAnterior = transacoesMesAnterior
    .filter((t) => t.tipo === "receita")
    .reduce((s, t) => s + t.valor, 0);
  const despesasMesAnterior = transacoesMesAnterior
    .filter((t) => t.tipo === "despesa")
    .reduce((s, t) => s + t.valor, 0);

  // Média dos meses anteriores ao atual dentro da janela de 6 meses (não conta o mês atual)
  const mesesAnteriores = evolucaoMensal.slice(0, -1);
  const mediaReceitasRecente =
    mesesAnteriores.length > 0
      ? mesesAnteriores.reduce((s, m) => s + m.receitas, 0) / mesesAnteriores.length
      : 0;
  const mediaDespesasRecente =
    mesesAnteriores.length > 0
      ? mesesAnteriores.reduce((s, m) => s + m.despesas, 0) / mesesAnteriores.length
      : 0;

  // Saldo acumulado ao final de cada um dos últimos 6 meses, trabalhando de
  // trás pra frente a partir do saldo atual (mantém consistência com o
  // "Saldo total" mostrado no card, seja qual for a metodologia dele).
  const saldoAcumulado: PontoSaldo[] = new Array(evolucaoMensal.length);
  saldoAcumulado[evolucaoMensal.length - 1] = {
    mes: evolucaoMensal[evolucaoMensal.length - 1].mes,
    saldo: saldoTotal,
  };
  for (let i = evolucaoMensal.length - 2; i >= 0; i--) {
    const proximoMes = evolucaoMensal[i + 1];
    saldoAcumulado[i] = {
      mes: evolucaoMensal[i].mes,
      saldo: saldoAcumulado[i + 1].saldo - (proximoMes.receitas - proximoMes.despesas),
    };
  }

  return (
    <div>
      <CabecalhoPagina
        titulo="Visão geral"
        subtitulo={nomeDoMes()}
        acao={
          <Link
            href="/transacoes/novo"
            className="inline-flex items-center gap-2 rounded-md bg-gradient-to-b from-[var(--gold-light)] to-[var(--gold)] px-4 py-2.5 text-sm font-medium text-[var(--on-accent)] shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_4px_14px_-2px_var(--gold-glow)] transition-all hover:brightness-105"
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
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            <SeloComparacao atual={receitasMes} anterior={receitasMesAnterior} positivoEBom />
            <SeloComparacao
              atual={receitasMes}
              anterior={mediaReceitasRecente}
              positivoEBom
              rotulo="vs média recente"
            />
          </div>
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
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            <SeloComparacao atual={despesasMes} anterior={despesasMesAnterior} positivoEBom={false} />
            <SeloComparacao
              atual={despesasMes}
              anterior={mediaDespesasRecente}
              positivoEBom={false}
              rotulo="vs média recente"
            />
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 px-5 md:grid-cols-2 md:px-8">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-text-muted">Evolução (últimos 6 meses)</p>
            <Link
              href="/relatorios"
              className="text-xs text-gold hover:underline"
            >
              Ver resumo anual →
            </Link>
          </div>
          <GraficoEvolucaoMensal dados={evolucaoMensal} />
        </Card>
        <Card>
          <p className="mb-4 text-sm text-text-muted">Saldo acumulado</p>
          <GraficoSaldoAcumulado dados={saldoAcumulado} />
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
