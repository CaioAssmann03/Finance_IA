import { createClient, usuarioAtual } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { Card } from "@/components/ui/card";
import { GraficoCategorias } from "@/components/charts/grafico-categorias";
import { GraficoEvolucaoMensal, type PontoEvolucaoMensal } from "@/components/charts/grafico-evolucao-mensal";
import { GraficoSaldoAcumulado, type PontoSaldo } from "@/components/charts/grafico-saldo-acumulado";
import { SeloComparacao } from "@/components/dashboard/selo-comparacao";
import { formatarMoeda, nomeDoMes, formatarData } from "@/lib/utils/formatters";
import {
  chaveMesAtual,
  primeiroDiaDoMes,
  ultimoDiaDoMesISO,
  diasEntre,
} from "@/lib/utils/datas";
import { gerarLancamentosDoMes } from "@/lib/recorrentes/gerar-lancamentos-do-mes";
import { alertasDeContasFixas, alertasDeOrcamento, proximoVencimento } from "@/lib/notificacoes/calcular-alertas";
import { AlertasFinanceiros } from "@/components/notificacoes/alertas-financeiros";
import { SeletorMesDashboard } from "@/components/dashboard/seletor-mes";
import { ContasAPagar, type ContaAPagar } from "@/components/dashboard/contas-a-pagar";
import type { Transacao, Categoria, Orcamento, TransacaoRecorrente } from "@/types/database";
import Link from "next/link";
import { Plus, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import clsx from "clsx";

function chaveMes(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

function inicioFimDoMes(chave: string) {
  return { inicio: primeiroDiaDoMes(chave), fim: ultimoDiaDoMesISO(chave) };
}

function inicioDosUltimosMeses(chaveFinal: string, quantidade: number) {
  const [ano, mes] = chaveFinal.split("-").map(Number);
  const inicio = new Date(ano, mes - 1 - (quantidade - 1), 1);
  return primeiroDiaDoMes(chaveMes(inicio));
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const supabase = await createClient();
  const user = await usuarioAtual();

  if (user) {
    await gerarLancamentosDoMes(supabase, user.id);
  }

  const { mes: mesParam } = await searchParams;
  const mesMaximo = chaveMesAtual();
  const mesSelecionado =
    mesParam && /^\d{4}-\d{2}$/.test(mesParam) && mesParam <= mesMaximo
      ? mesParam
      : mesMaximo;
  const vendoMesAtual = mesSelecionado === mesMaximo;

  const { inicio, fim } = inicioFimDoMes(mesSelecionado);
  const inicioSeisMeses = inicioDosUltimosMeses(mesSelecionado, 6);

  const [
    { data: transacoesMes },
    { data: categorias },
    { data: orcamentos },
    { data: recorrentesAtivas },
    { data: transacoesSeisMeses },
    { data: saldoCalculado, error: erroSaldo },
  ] = await Promise.all([
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
        .eq("mes_referencia", `${mesSelecionado}-01`)
        .returns<Orcamento[]>(),
      supabase
        .from("transacoes_recorrentes")
        .select("*")
        .eq("ativo", true)
        .returns<TransacaoRecorrente[]>(),
      // O gráfico dos 6 meses só usa data, tipo e valor — trazer as outras
      // colunas era peso de rede à toa.
      supabase
        .from("transacoes")
        .select("data, tipo, valor")
        .gte("data", inicioSeisMeses)
        .lte("data", fim)
        .returns<Pick<Transacao, "data" | "tipo" | "valor">[]>(),
      // Soma feita no Postgres (migração 0004): volta um número só, em vez de
      // todo o histórico do usuário pela rede a cada abertura do dashboard.
      supabase.rpc("saldo_ate", { p_data: fim }),
    ]);

  const listaTransacoes = transacoesMes ?? [];
  const listaCategorias = categorias ?? [];

  // Saldo total = saldo inicial das contas + TUDO o que foi movimentado até o
  // fim do mês exibido. Antes só somava o mês selecionado, então o saldo mudava
  // de valor conforme se navegava entre os meses.
  //
  // Enquanto a migração 0004 não for rodada a função não existe. Nesse caso o
  // card diz que falta rodar, em vez de mostrar R$ 0,00 como se fosse o saldo
  // real — número errado em tela de dinheiro é pior do que número ausente.
  const saldoIndisponivel = Boolean(erroSaldo);
  const saldoTotal = Number(saldoCalculado ?? 0);

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

  const hojeReal = new Date();
  const contasAPagar: ContaAPagar[] = (recorrentesAtivas ?? [])
    .map((r) => {
      const vencimento = proximoVencimento(r.dia_do_mes, hojeReal);
      return {
        descricao: r.descricao || "Conta fixa",
        valor: r.valor,
        diasAte: diasEntre(hojeReal, vencimento),
      };
    })
    .filter((c) => c.diasAte >= 0 && c.diasAte <= 7)
    .sort((a, b) => a.diasAte - b.diasAte);

  // Série dos últimos 6 meses até o mês selecionado (receitas x despesas por mês)
  const listaSeisMeses = transacoesSeisMeses ?? [];
  const [anoSel, mesSel] = mesSelecionado.split("-").map(Number);
  const dataMesSelecionado = new Date(anoSel, mesSel - 1, 1);
  const evolucaoMensal: PontoEvolucaoMensal[] = Array.from({ length: 6 }).map((_, i) => {
    const dataDoMes = new Date(dataMesSelecionado.getFullYear(), dataMesSelecionado.getMonth() - (5 - i), 1);
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

  // Comparação com o mês imediatamente anterior ao selecionado
  const mesAnteriorRef = new Date(dataMesSelecionado.getFullYear(), dataMesSelecionado.getMonth() - 1, 1);
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
        subtitulo={nomeDoMes(dataMesSelecionado)}
        acao={
          <div className="flex flex-wrap items-center gap-2">
            <SeletorMesDashboard mesAtual={mesSelecionado} mesMaximo={mesMaximo} />
            <Link
              href="/transacoes/novo"
              className="inline-flex items-center gap-2 rounded-md bg-gradient-to-b from-[var(--gold-light)] to-[var(--gold)] px-4 py-2.5 text-sm font-medium text-[var(--on-accent)] shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_4px_14px_-2px_var(--gold-glow)] transition-all hover:brightness-105"
            >
              <Plus size={16} />
              Lançar
            </Link>
          </div>
        }
      />

      {vendoMesAtual && <AlertasFinanceiros alertas={alertas} />}

      <div className="grid gap-4 px-5 md:grid-cols-3 md:px-8">
        <Card className="overflow-hidden border-l-2 border-l-gold">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-text-muted">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold-soft text-gold">
              <Wallet size={14} strokeWidth={2} />
            </span>
            Saldo total
          </div>
          <p className="mt-3 font-[family-name:var(--font-numeric)] text-3xl">
            {saldoIndisponivel ? "—" : formatarMoeda(saldoTotal)}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {saldoIndisponivel
              ? "Indisponível: rode a migração 0004 no Supabase para o saldo voltar."
              : vendoMesAtual
              ? "Todas as contas, considerando todo o histórico."
              : `Posição no fim de ${nomeDoMes(dataMesSelecionado)}.`}
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
          {saldoIndisponivel ? (
            <p className="py-8 text-center text-sm text-text-muted">
              Depende do saldo total, que precisa da migração 0004.
            </p>
          ) : (
            <GraficoSaldoAcumulado dados={saldoAcumulado} />
          )}
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

      {vendoMesAtual && (
        <div className="mt-6 px-5 md:px-8">
          <ContasAPagar itens={contasAPagar} />
        </div>
      )}

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
