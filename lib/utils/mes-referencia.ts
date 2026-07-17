/** Retorna o primeiro dia do mês atual no formato YYYY-MM-DD (usado em orcamentos.mes_referencia). */
export function mesReferenciaAtual(): string {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}
