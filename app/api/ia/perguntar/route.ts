import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chamarClaude } from "@/lib/ia/anthropic";
import type { Transacao, Categoria, TransacaoRecorrente } from "@/types/database";

function inicioFimDoMes(offsetMeses = 0) {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() + offsetMeses, 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + offsetMeses + 1, 0);
  return {
    inicio: inicio.toISOString().slice(0, 10),
    fim: fim.toISOString().slice(0, 10),
  };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { pergunta } = await request.json();

  if (!pergunta || typeof pergunta !== "string" || !pergunta.trim()) {
    return NextResponse.json({ erro: "Pergunta vazia." }, { status: 400 });
  }

  const mesAtual = inicioFimDoMes(0);
  const mesAnterior = inicioFimDoMes(-1);

  const [
    { data: transacoesMesAtual },
    { data: transacoesMesAnterior },
    { data: categorias },
    { data: recorrentesAtivas },
  ] = await Promise.all([
    supabase
      .from("transacoes")
      .select("*")
      .gte("data", mesAtual.inicio)
      .lte("data", mesAtual.fim)
      .returns<Transacao[]>(),
    supabase
      .from("transacoes")
      .select("*")
      .gte("data", mesAnterior.inicio)
      .lte("data", mesAnterior.fim)
      .returns<Transacao[]>(),
    supabase.from("categorias").select("*").returns<Categoria[]>(),
    supabase
      .from("transacoes_recorrentes")
      .select("*")
      .eq("ativo", true)
      .returns<TransacaoRecorrente[]>(),
  ]);

  const mapaCategorias = new Map((categorias ?? []).map((c) => [c.id, c.nome]));

  function resumirMes(transacoes: Transacao[] | null) {
    const lista = transacoes ?? [];
    const receitas = lista.filter((t) => t.tipo === "receita").reduce((s, t) => s + t.valor, 0);
    const despesas = lista.filter((t) => t.tipo === "despesa").reduce((s, t) => s + t.valor, 0);

    const porCategoria: Record<string, number> = {};
    for (const t of lista.filter((t) => t.tipo === "despesa")) {
      const nome = mapaCategorias.get(t.categoria_id) ?? "Outros";
      porCategoria[nome] = (porCategoria[nome] ?? 0) + t.valor;
    }

    return { receitas, despesas, saldo: receitas - despesas, gastoPorCategoria: porCategoria };
  }

  const contexto = {
    mes_atual: resumirMes(transacoesMesAtual),
    mes_anterior: resumirMes(transacoesMesAnterior),
    contas_fixas_ativas: (recorrentesAtivas ?? []).map((r) => ({
      descricao: r.descricao,
      valor: r.valor,
      dia_do_mes: r.dia_do_mes,
    })),
  };

  const system = `Você é o assistente financeiro pessoal do Finance IA. Responda em português, de forma direta e curta (no máximo 3-4 frases), usando APENAS os números fornecidos no contexto JSON abaixo. Nunca invente ou estime valores que não estejam no contexto — se a pergunta não puder ser respondida com esses dados, diga isso claramente e sugira o que o usuário pode conferir no extrato. Formate valores em reais (R$).

Contexto (dados reais do usuário, mês atual e mês anterior):
${JSON.stringify(contexto)}`;

  try {
    const resposta = await chamarClaude({
      system,
      prompt: pergunta,
      maxTokens: 400,
    });

    return NextResponse.json({ resposta });
  } catch (erro) {
    console.error("Erro no assistente IA:", erro);
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Erro ao consultar o assistente." },
      { status: 500 }
    );
  }
}
