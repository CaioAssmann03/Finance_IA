import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { Card } from "@/components/ui/card";
import { calcularFaturas } from "@/lib/cartao/fatura";
import { formatarMoeda, formatarData } from "@/lib/utils/formatters";
import type { Conta, Transacao, Categoria } from "@/types/database";
import { notFound } from "next/navigation";
import clsx from "clsx";

export default async function DetalheContaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: conta } = await supabase
    .from("contas")
    .select("*")
    .eq("id", id)
    .single<Conta>();

  if (!conta) notFound();

  const { data: categorias } = await supabase
    .from("categorias")
    .select("*")
    .returns<Categoria[]>();
  const mapaCategorias = new Map((categorias ?? []).map((c) => [c.id, c]));

  if (conta.tipo !== "cartao_credito") {
    const { data: transacoes } = await supabase
      .from("transacoes")
      .select("*")
      .eq("conta_id", conta.id)
      .order("data", { ascending: false })
      .limit(100)
      .returns<Transacao[]>();

    return (
      <div>
        <CabecalhoPagina titulo={conta.nome} subtitulo="Últimos lançamentos" />
        <div className="px-5 md:px-8">
          <ListaLancamentos
            transacoes={transacoes ?? []}
            mapaCategorias={mapaCategorias}
          />
        </div>
      </div>
    );
  }

  // Cartão de crédito: calcular fatura atual e próxima
  const diaFechamento = conta.dia_fechamento ?? 1;
  const diaVencimento = conta.dia_vencimento ?? 10;
  const { atual, proxima } = calcularFaturas(
    new Date(),
    diaFechamento,
    diaVencimento
  );

  const { data: transacoesPeriodo } = await supabase
    .from("transacoes")
    .select("*")
    .eq("conta_id", conta.id)
    .eq("tipo", "despesa")
    .gte("data", atual.inicio)
    .lte("data", proxima.fim)
    .order("data", { ascending: false })
    .returns<Transacao[]>();

  const transacoesAtual = (transacoesPeriodo ?? []).filter(
    (t) => t.data >= atual.inicio && t.data <= atual.fim
  );
  const transacoesProxima = (transacoesPeriodo ?? []).filter(
    (t) => t.data >= proxima.inicio && t.data <= proxima.fim
  );

  const totalAtual = transacoesAtual.reduce((s, t) => s + t.valor, 0);
  const totalProxima = transacoesProxima.reduce((s, t) => s + t.valor, 0);

  return (
    <div>
      <CabecalhoPagina
        titulo={conta.nome}
        subtitulo={`Fecha todo dia ${diaFechamento} · Vence todo dia ${diaVencimento}`}
      />

      <div className="grid gap-4 px-5 md:grid-cols-2 md:px-8">
        <Card>
          <p className="text-xs uppercase tracking-wide text-text-muted">
            Fatura atual
          </p>
          <p className="mt-2 font-[family-name:var(--font-numeric)] text-2xl text-gold">
            {formatarMoeda(totalAtual)}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Fecha em {formatarData(atual.fim)} · Vence em{" "}
            {formatarData(atual.vencimento)}
          </p>
          <div className="mt-4">
            <ListaLancamentos
              transacoes={transacoesAtual}
              mapaCategorias={mapaCategorias}
              vazio="Nada lançado nesta fatura ainda."
            />
          </div>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-wide text-text-muted">
            Próxima fatura
          </p>
          <p className="mt-2 font-[family-name:var(--font-numeric)] text-2xl">
            {formatarMoeda(totalProxima)}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Fecha em {formatarData(proxima.fim)} · Vence em{" "}
            {formatarData(proxima.vencimento)}
          </p>
          <div className="mt-4">
            <ListaLancamentos
              transacoes={transacoesProxima}
              mapaCategorias={mapaCategorias}
              vazio="Nada lançado para o próximo ciclo ainda."
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

function ListaLancamentos({
  transacoes,
  mapaCategorias,
  vazio = "Nenhum lançamento.",
}: {
  transacoes: Transacao[];
  mapaCategorias: Map<string, Categoria>;
  vazio?: string;
}) {
  if (transacoes.length === 0) {
    return <p className="text-sm text-text-muted">{vazio}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {transacoes.map((t) => (
        <li key={t.id} className="ledger-row text-sm">
          <span className="truncate text-text">
            {t.descricao || mapaCategorias.get(t.categoria_id)?.nome || "—"}
            <span className="ml-2 text-xs text-text-muted">
              {formatarData(t.data)}
            </span>
          </span>
          <span className="ledger-leader" />
          <span
            className={clsx(
              "tabular shrink-0",
              t.tipo === "receita" ? "text-sage" : "text-brick"
            )}
          >
            {formatarMoeda(t.valor)}
          </span>
        </li>
      ))}
    </ul>
  );
}
