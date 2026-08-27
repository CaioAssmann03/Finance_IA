import { chaveMesAtual, primeiroDiaDoMes } from "@/lib/utils/datas";

/**
 * Primeiro dia do mês atual no formato AAAA-MM-DD (usado em
 * orcamentos.mes_referencia). Calculado pelo calendário local: a versão
 * anterior passava por `toISOString()`, que em fusos a leste de Greenwich
 * devolveria o último dia do mês anterior.
 */
export function mesReferenciaAtual(): string {
  return primeiroDiaDoMes(chaveMesAtual());
}
