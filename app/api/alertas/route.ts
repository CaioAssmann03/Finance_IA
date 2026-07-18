import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { alertasDeContasFixas, alertasDeOrcamento } from "@/lib/notificacoes/calcular-alertas";
import { mesReferenciaAtual } from "@/lib/utils/mes-referencia";
import type { Transacao, Categoria, TransacaoRecorrente, Orcamento } from "@/types/database";

function inicioFimDoMes() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { inicio, fim };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { inicio, fim } = inicioFimDoMes();

  const [
    { data: recorrentesAtivas },
    { data: orcamentos },
    { data: categorias },
    { data: transacoesMes },
  ] = await Promise.all([
    supabase
      .from("transacoes_recorrentes")
      .select("*")
      .eq("ativo", true)
      .returns<TransacaoRecorrente[]>(),
    supabase
      .from("orcamentos")
      .select("*")
      .eq("mes_referencia", mesReferenciaAtual())
      .returns<Orcamento[]>(),
    supabase.from("categorias").select("*").returns<Categoria[]>(),
    supabase
      .from("transacoes")
      .select("*")
      .gte("data", inicio)
      .lte("data", fim)
      .eq("tipo", "despesa")
      .returns<Transacao[]>(),
  ]);

  const listaCategorias = categorias ?? [];
  const listaTransacoes = transacoesMes ?? [];

  const orcamentoPorCategoria = (orcamentos ?? []).map((orc) => {
    const categoria = listaCategorias.find((c) => c.id === orc.categoria_id);
    const gasto = listaTransacoes
      .filter((t) => t.categoria_id === orc.categoria_id)
      .reduce((s, t) => s + t.valor, 0);
    const percentual = orc.valor_limite > 0 ? (gasto / orc.valor_limite) * 100 : 0;
    return { nome: categoria?.nome ?? "—", gasto, limite: orc.valor_limite, percentual };
  });

  const alertas = [
    ...alertasDeContasFixas(recorrentesAtivas ?? []),
    ...alertasDeOrcamento(orcamentoPorCategoria),
  ];

  return NextResponse.json({ alertas });
}
