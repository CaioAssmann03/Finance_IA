import type { TransacaoRecorrente } from "@/types/database";

export interface Alerta {
  id: string;
  tipo: "conta_a_vencer" | "orcamento";
  severidade: "aviso" | "urgente";
  titulo: string;
  descricao: string;
}

const DIAS_ANTECEDENCIA_CONTA_FIXA = 3;
const LIMITE_ATENCAO_ORCAMENTO = 80;

function ultimoDiaDoMes(ano: number, mesIndice0: number): number {
  return new Date(ano, mesIndice0 + 1, 0).getDate();
}

/** Calcula a próxima data de vencimento de uma recorrência a partir de hoje. */
export function proximoVencimento(diaDoMes: number, hoje: Date): Date {
  const diaEsteMes = Math.min(diaDoMes, ultimoDiaDoMes(hoje.getFullYear(), hoje.getMonth()));
  const vencimentoEsteMes = new Date(hoje.getFullYear(), hoje.getMonth(), diaEsteMes);

  if (vencimentoEsteMes >= new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) {
    return vencimentoEsteMes;
  }

  const proximoMes = hoje.getMonth() + 1;
  const diaProximoMes = Math.min(
    diaDoMes,
    ultimoDiaDoMes(hoje.getFullYear(), proximoMes)
  );
  return new Date(hoje.getFullYear(), proximoMes, diaProximoMes);
}

export function alertasDeContasFixas(
  recorrentesAtivas: TransacaoRecorrente[],
  hoje: Date = new Date()
): Alerta[] {
  const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  return recorrentesAtivas
    .map((r) => {
      const vencimento = proximoVencimento(r.dia_do_mes, hoje);
      const diasAte = Math.round(
        (vencimento.getTime() - hojeSemHora.getTime()) / (1000 * 60 * 60 * 24)
      );
      return { r, vencimento, diasAte };
    })
    .filter(({ diasAte }) => diasAte >= 0 && diasAte <= DIAS_ANTECEDENCIA_CONTA_FIXA)
    .map(({ r, diasAte }) => ({
      id: `conta-fixa-${r.id}`,
      tipo: "conta_a_vencer" as const,
      severidade: diasAte === 0 ? ("urgente" as const) : ("aviso" as const),
      titulo: r.descricao || "Conta fixa",
      descricao:
        diasAte === 0
          ? "Vence hoje."
          : diasAte === 1
          ? "Vence amanhã."
          : `Vence em ${diasAte} dias.`,
    }));
}

export function alertasDeOrcamento(
  orcamentoPorCategoria: { nome: string; gasto: number; limite: number; percentual: number }[]
): Alerta[] {
  return orcamentoPorCategoria
    .filter((o) => o.percentual >= LIMITE_ATENCAO_ORCAMENTO)
    .map((o) => ({
      id: `orcamento-${o.nome}`,
      tipo: "orcamento" as const,
      severidade: o.percentual >= 100 ? ("urgente" as const) : ("aviso" as const),
      titulo: o.nome,
      descricao:
        o.percentual >= 100
          ? "Orçamento estourado."
          : `Já usou ${Math.round(o.percentual)}% do orçamento.`,
    }));
}
