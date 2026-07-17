function ultimoDiaDoMes(ano: number, mesIndice0: number): number {
  return new Date(ano, mesIndice0 + 1, 0).getDate();
}

function diaSeguro(ano: number, mesIndice0: number, dia: number): Date {
  const diaValido = Math.min(dia, ultimoDiaDoMes(ano, mesIndice0));
  return new Date(ano, mesIndice0, diaValido);
}

export interface PeriodoFatura {
  inicio: string; // ISO date
  fim: string; // ISO date
  vencimento: string; // ISO date
}

/**
 * Calcula o período (início/fim) da fatura atual (a que está aberta agora,
 * ainda não fechou ou acabou de fechar) e da próxima, a partir do dia de
 * fechamento e vencimento cadastrados na conta do tipo cartão de crédito.
 */
export function calcularFaturas(
  hoje: Date,
  diaFechamento: number,
  diaVencimento: number
): { atual: PeriodoFatura; proxima: PeriodoFatura } {
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();

  // Data de fechamento deste mês
  const fechamentoDesteMes = diaSeguro(ano, mes, diaFechamento);

  // Se hoje já passou do fechamento deste mês, a fatura "atual" é a que fecha
  // no mês que vem; senão, é a que fecha neste mês.
  const mesFechamentoAtual = hoje > fechamentoDesteMes ? mes + 1 : mes;
  const fimAtual = diaSeguro(ano, mesFechamentoAtual, diaFechamento);
  const inicioAtual = new Date(fimAtual);
  inicioAtual.setMonth(inicioAtual.getMonth() - 1);
  inicioAtual.setDate(inicioAtual.getDate() + 1);

  const fimProxima = new Date(fimAtual);
  fimProxima.setMonth(fimProxima.getMonth() + 1);
  const inicioProxima = new Date(fimAtual);
  inicioProxima.setDate(inicioProxima.getDate() + 1);

  // Vencimento normalmente cai depois do fechamento — se o dia de vencimento
  // configurado for menor ou igual ao dia de fechamento, ele cai no mês seguinte.
  function calcularVencimento(fimCiclo: Date): Date {
    const mesVencimento =
      diaVencimento <= diaFechamento
        ? fimCiclo.getMonth() + 1
        : fimCiclo.getMonth();
    return diaSeguro(fimCiclo.getFullYear(), mesVencimento, diaVencimento);
  }

  const iso = (d: Date) => d.toISOString().slice(0, 10);

  return {
    atual: {
      inicio: iso(inicioAtual),
      fim: iso(fimAtual),
      vencimento: iso(calcularVencimento(fimAtual)),
    },
    proxima: {
      inicio: iso(inicioProxima),
      fim: iso(fimProxima),
      vencimento: iso(calcularVencimento(fimProxima)),
    },
  };
}
