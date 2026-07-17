import type { SupabaseClient } from "@supabase/supabase-js";
import type { Categoria, TransacaoRecorrente } from "@/types/database";

function ultimoDiaDoMes(ano: number, mesIndice0: number): number {
  return new Date(ano, mesIndice0 + 1, 0).getDate();
}

/**
 * Verifica as recorrências ativas do usuário e cria, se ainda não existir,
 * o lançamento correspondente ao mês atual. Idempotente: pode ser chamada
 * em toda visita ao dashboard sem duplicar lançamentos.
 */
export async function gerarLancamentosDoMes(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  const { data: recorrentes } = await supabase
    .from("transacoes_recorrentes")
    .select("*")
    .eq("user_id", userId)
    .eq("ativo", true)
    .returns<TransacaoRecorrente[]>();

  if (!recorrentes || recorrentes.length === 0) return;

  const { data: categorias } = await supabase
    .from("categorias")
    .select("*")
    .returns<Categoria[]>();

  const mapaCategorias = new Map((categorias ?? []).map((c) => [c.id, c]));

  for (const recorrente of recorrentes) {
    const { data: jaExiste } = await supabase
      .from("transacoes")
      .select("id")
      .eq("transacao_recorrente_id", recorrente.id)
      .gte("data", inicioMes)
      .lte("data", fimMes)
      .maybeSingle();

    if (jaExiste) continue;

    const dia = Math.min(
      recorrente.dia_do_mes,
      ultimoDiaDoMes(hoje.getFullYear(), hoje.getMonth())
    );
    const dataLancamento = new Date(hoje.getFullYear(), hoje.getMonth(), dia)
      .toISOString()
      .slice(0, 10);

    const categoria = mapaCategorias.get(recorrente.categoria_id);

    await supabase.from("transacoes").insert({
      user_id: userId,
      conta_id: recorrente.conta_id,
      categoria_id: recorrente.categoria_id,
      tipo: categoria?.tipo ?? "despesa",
      valor: recorrente.valor,
      descricao: recorrente.descricao,
      data: dataLancamento,
      transacao_recorrente_id: recorrente.id,
    });
  }
}
