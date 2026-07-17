import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chamarClaude, limparJson } from "@/lib/ia/anthropic";
import type { Categoria } from "@/types/database";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { texto } = await request.json();

  if (!texto || typeof texto !== "string" || !texto.trim()) {
    return NextResponse.json({ erro: "Texto vazio." }, { status: 400 });
  }

  const { data: categorias } = await supabase
    .from("categorias")
    .select("*")
    .returns<Categoria[]>();

  if (!categorias || categorias.length === 0) {
    return NextResponse.json(
      { erro: "Cadastre categorias antes de usar o lançamento por texto." },
      { status: 400 }
    );
  }

  const nomesCategorias = categorias.map((c) => `${c.nome} (${c.tipo})`).join(", ");
  const hoje = new Date().toISOString().slice(0, 10);

  const system = `Você interpreta lançamentos financeiros pessoais escritos em português informal e devolve APENAS um JSON válido, sem markdown, sem texto extra, no formato exato:
{"valor": number, "tipo": "receita" | "despesa", "categoria_sugerida": string, "descricao": string, "data": "YYYY-MM-DD"}

Regras:
- "categoria_sugerida" deve ser exatamente um dos nomes desta lista (sem o tipo entre parênteses): ${nomesCategorias}. Escolha a mais provável mesmo que o texto não seja explícito.
- Se o texto não indicar claramente uma receita (salário, venda, recebimento), assuma "despesa".
- "data" é hoje (${hoje}) por padrão. Se o texto mencionar "ontem", "anteontem" ou um dia da semana, calcule a data real a partir de hoje.
- "descricao" é uma versão curta e limpa do texto, sem o valor.
- "valor" é sempre positivo, em número (use ponto decimal).
- Nunca invente um valor que não esteja no texto — se não houver valor claro, use 0.`;

  try {
    const respostaTexto = await chamarClaude({
      system,
      prompt: texto,
      maxTokens: 300,
    });

    const sugestao = JSON.parse(limparJson(respostaTexto));

    return NextResponse.json(sugestao);
  } catch (erro) {
    console.error("Erro ao categorizar com IA:", erro);
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Erro ao interpretar o texto." },
      { status: 500 }
    );
  }
}
