import type { Transacao, TipoLancamento } from "@/types/database";
import { adicionarMeses } from "@/lib/utils/datas";

/** Casa o "(3/12)" no fim de uma descrição de parcela. */
export const SUFIXO_PARCELA = /\s*\(\d+\/\d+\)\s*$/;

/** Quantas parcelas o app aceita criar de uma vez. */
export const MAX_PARCELAS = 120;

/** Remove o "(3/12)" do fim da descrição, devolvendo só o texto que o usuário escreveu. */
export function descricaoBase(descricao: string | null | undefined): string {
  return (descricao ?? "").replace(SUFIXO_PARCELA, "").trim();
}

/** Monta a descrição de uma parcela: "Mercado (3/12)". */
export function descricaoDaParcela(base: string, n: number, total: number): string {
  const texto = descricaoBase(base);
  return texto ? `${texto} (${n}/${total})` : `Parcela ${n}/${total}`;
}

/** Rótulo curto de parcela para a lista: "3/12". */
export function rotuloParcela(t: Transacao): string | null {
  if (!t.parcela_atual || !t.parcela_total) return null;
  return `${t.parcela_atual}/${t.parcela_total}`;
}

/**
 * A que parte de um parcelamento uma edição ou exclusão se aplica.
 * Sem isso, apagar a parcela 1/12 deixava as outras 11 órfãs no extrato —
 * que foi exatamente o problema relatado.
 */
export type EscopoParcelas = "esta" | "esta_e_futuras" | "todas";

export const ROTULOS_ESCOPO: Record<EscopoParcelas, string> = {
  esta: "Só esta parcela",
  esta_e_futuras: "Esta e as próximas",
  todas: "Todas as parcelas",
};

export const DESCRICOES_ESCOPO: Record<EscopoParcelas, string> = {
  esta: "Mexe apenas na parcela selecionada.",
  esta_e_futuras: "Mexe nesta e em todas as parcelas com data posterior.",
  todas: "Mexe no parcelamento inteiro, incluindo as parcelas já passadas.",
};

/** true se a transação faz parte de um parcelamento. */
export function ehParcelada(t: Transacao): boolean {
  return Boolean(t.grupo_parcela_id);
}

/**
 * Filtra, dentro da série inteira, as parcelas atingidas pelo escopo.
 * Usa `parcela_atual` quando existe (mais confiável que a data, que o usuário
 * pode ter editado à mão) e cai na data como alternativa.
 */
export function parcelasNoEscopo(
  serie: Transacao[],
  referencia: Transacao,
  escopo: EscopoParcelas
): Transacao[] {
  if (escopo === "esta") return [referencia];
  if (escopo === "todas") return serie;

  return serie.filter((t) => {
    if (t.id === referencia.id) return true;
    if (referencia.parcela_atual != null && t.parcela_atual != null) {
      return t.parcela_atual > referencia.parcela_atual;
    }
    return t.data > referencia.data;
  });
}

/** Agrupa uma lista de transações por `grupo_parcela_id` (linear, sem varrer a lista N vezes). */
export function indexarPorGrupo(lista: Transacao[]): Map<string, Transacao[]> {
  const mapa = new Map<string, Transacao[]>();
  for (const t of lista) {
    if (!t.grupo_parcela_id) continue;
    const atual = mapa.get(t.grupo_parcela_id);
    if (atual) atual.push(t);
    else mapa.set(t.grupo_parcela_id, [t]);
  }
  return mapa;
}

export interface DadosParcelamento {
  userId: string;
  contaId: string;
  categoriaId: string;
  tipo: TipoLancamento;
  valor: number;
  descricao: string;
  dataPrimeira: string; // ISO da parcela `parcelaAtual`
  parcelaAtual: number;
  parcelaTotal: number;
  grupoParcelaId: string;
}

export interface LinhaParcela {
  user_id: string;
  conta_id: string;
  categoria_id: string;
  tipo: TipoLancamento;
  valor: number;
  descricao: string;
  data: string;
  parcela_atual: number;
  parcela_total: number;
  grupo_parcela_id: string;
}

/**
 * Monta as linhas de um parcelamento, uma por mês a partir de `dataPrimeira`.
 * O avanço de mês é feito com `adicionarMeses`, que trava no último dia do mês
 * curto — sem isso, uma compra no dia 31/01 pulava fevereiro e caía em 03/03.
 */
export function gerarParcelas(dados: DadosParcelamento): LinhaParcela[] {
  const linhas: LinhaParcela[] = [];

  for (let n = dados.parcelaAtual; n <= dados.parcelaTotal; n++) {
    linhas.push({
      user_id: dados.userId,
      conta_id: dados.contaId,
      categoria_id: dados.categoriaId,
      tipo: dados.tipo,
      valor: dados.valor,
      descricao: descricaoDaParcela(dados.descricao, n, dados.parcelaTotal),
      data: adicionarMeses(dados.dataPrimeira, n - dados.parcelaAtual),
      parcela_atual: n,
      parcela_total: dados.parcelaTotal,
      grupo_parcela_id: dados.grupoParcelaId,
    });
  }

  return linhas;
}

export interface ValidacaoParcelamento {
  ok: boolean;
  erro?: string;
}

export function validarParcelamento(
  parcelaAtual: number,
  parcelaTotal: number
): ValidacaoParcelamento {
  if (!Number.isInteger(parcelaAtual) || !Number.isInteger(parcelaTotal))
    return { ok: false, erro: "As parcelas precisam ser números inteiros." };
  if (parcelaTotal < 2)
    return { ok: false, erro: "Um parcelamento precisa ter pelo menos 2 parcelas." };
  if (parcelaTotal > MAX_PARCELAS)
    return { ok: false, erro: `No máximo ${MAX_PARCELAS} parcelas por lançamento.` };
  if (parcelaAtual < 1 || parcelaAtual > parcelaTotal)
    return { ok: false, erro: "A parcela atual precisa estar entre 1 e o total de parcelas." };
  return { ok: true };
}
