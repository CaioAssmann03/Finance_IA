export interface TransacaoImportada {
  data: string; // YYYY-MM-DD
  valor: number; // sempre positivo
  tipo: "receita" | "despesa";
  descricao: string;
  /** Identificador único da transação no arquivo de origem, usado para evitar duplicidade. */
  idOrigem?: string;
}

/**
 * Extrai as transações de um arquivo OFX (Open Financial Exchange).
 * OFX não é XML estrito — muitos bancos geram tags sem fechamento — então o
 * parser usa expressões regulares em vez de um parser de XML tradicional.
 */
export function parseOFX(conteudo: string): TransacaoImportada[] {
  const blocos = conteudo.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? [];

  function extrairTag(bloco: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}>([^<\\r\\n]*)`, "i");
    const match = bloco.match(regex);
    return match ? match[1].trim() : null;
  }

  const transacoes: TransacaoImportada[] = [];

  for (const bloco of blocos) {
    const dataBruta = extrairTag(bloco, "DTPOSTED");
    const valorBruto = extrairTag(bloco, "TRNAMT");
    const memo = extrairTag(bloco, "MEMO") ?? extrairTag(bloco, "NAME") ?? "";
    const fitId = extrairTag(bloco, "FITID") ?? undefined;

    if (!dataBruta || !valorBruto) continue;

    // Formato de data do OFX: YYYYMMDD (às vezes com hora/timezone junto, ex: YYYYMMDDHHMMSS[-3:GMT])
    const ano = dataBruta.slice(0, 4);
    const mes = dataBruta.slice(4, 6);
    const dia = dataBruta.slice(6, 8);
    const data = `${ano}-${mes}-${dia}`;

    const valorNumerico = parseFloat(valorBruto.replace(",", "."));
    if (Number.isNaN(valorNumerico) || valorNumerico === 0) continue;

    transacoes.push({
      data,
      valor: Math.abs(valorNumerico),
      tipo: valorNumerico < 0 ? "despesa" : "receita",
      descricao: memo || "Lançamento importado",
      idOrigem: fitId,
    });
  }

  return transacoes.sort((a, b) => (a.data < b.data ? 1 : -1));
}
