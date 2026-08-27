import type { SupabaseClient } from "@supabase/supabase-js";
import type { Categoria, TransacaoRecorrente } from "@/types/database";
import { chaveMesAtual, primeiroDiaDoMes, ultimoDiaDoMesISO, paraISO, ultimoDiaDoMes } from "@/lib/utils/datas";

/**
 * Verifica as recorrências ativas do usuário e cria, se ainda não existir,
 * o lançamento correspondente ao mês atual. Idempotente: pode ser chamada
 * em toda visita ao dashboard sem duplicar lançamentos.
 *
 * A checagem do "já existe" é feita numa consulta só, para todas as
 * recorrências de uma vez. A versão anterior consultava uma a uma com
 * `.maybeSingle()`, que devolve ERRO quando encontra mais de uma linha — e
 * como o erro virava "não achei nada", uma duplicata existente fazia o
 * dashboard criar mais uma cópia a cada visita, sem parar.
 */
export async function gerarLancamentosDoMes(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const chave = chaveMesAtual();
  const inicioMes = primeiroDiaDoMes(chave);
  const fimMes = ultimoDiaDoMesISO(chave);

  const { data: recorrentes } = await supabase
    .from("transacoes_recorrentes")
    .select("*")
    .eq("user_id", userId)
    .eq("ativo", true)
    .returns<TransacaoRecorrente[]>();

  if (!recorrentes || recorrentes.length === 0) return;

  const [{ data: jaLancadas }, { data: categorias }] = await Promise.all([
    supabase
      .from("transacoes")
      .select("transacao_recorrente_id")
      .eq("user_id", userId)
      .in(
        "transacao_recorrente_id",
        recorrentes.map((r) => r.id)
      )
      .gte("data", inicioMes)
      .lte("data", fimMes)
      .returns<{ transacao_recorrente_id: string | null }[]>(),
    supabase.from("categorias").select("*").returns<Categoria[]>(),
  ]);

  const comLancamentoNoMes = new Set(
    (jaLancadas ?? []).map((t) => t.transacao_recorrente_id).filter(Boolean) as string[]
  );

  const pendentes = recorrentes.filter((r) => !comLancamentoNoMes.has(r.id));
  if (pendentes.length === 0) return;

  const mapaCategorias = new Map((categorias ?? []).map((c) => [c.id, c]));
  const hoje = new Date();
  const ultimoDia = ultimoDiaDoMes(hoje.getFullYear(), hoje.getMonth());

  const novas = pendentes.map((recorrente) => {
    const dia = Math.min(recorrente.dia_do_mes, ultimoDia);
    const categoria = mapaCategorias.get(recorrente.categoria_id);
    return {
      user_id: userId,
      conta_id: recorrente.conta_id,
      categoria_id: recorrente.categoria_id,
      tipo: categoria?.tipo ?? "despesa",
      valor: recorrente.valor,
      descricao: recorrente.descricao,
      data: paraISO(new Date(hoje.getFullYear(), hoje.getMonth(), dia)),
      transacao_recorrente_id: recorrente.id,
    };
  });

  // Um único insert em lote. Se duas abas abrirem o dashboard ao mesmo tempo,
  // o índice único do banco (migração 0003) derruba a segunda tentativa em vez
  // de gravar o lançamento duas vezes — por isso o erro aqui é ignorado.
  await supabase.from("transacoes").insert(novas);
}
