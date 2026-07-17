import Papa from "papaparse";

/** Lê um CSV genérico (delimitador , ou ; detectado automaticamente) e devolve
 * TODAS as linhas cruas, sem assumir qual é o cabeçalho — alguns bancos (ex:
 * Bradesco) colocam linhas de título antes da tabela, então quem decide qual
 * linha é o cabeçalho é a pessoa, olhando a prévia. */
export function lerLinhasBrutas(conteudo: string): string[][] {
  const resultado = Papa.parse<string[]>(conteudo.trim(), {
    skipEmptyLines: true,
  });
  return (resultado.data ?? []).filter((l) => l.length > 0);
}

/** Sugere qual linha (índice) é o cabeçalho real: a que tem mais células
 * preenchidas entre as primeiras linhas do arquivo (linhas de título costumam
 * ter só 1 célula preenchida; linhas de detalhe/continuação, poucas; o
 * cabeçalho de verdade normalmente tem quase todas as colunas nomeadas). */
export function sugerirLinhaCabecalho(linhas: string[][]): number {
  let melhorIndice = 0;
  let melhorContagem = -1;

  for (let i = 0; i < Math.min(linhas.length, 8); i++) {
    const preenchidas = linhas[i].filter((c) => c.trim() !== "").length;
    if (preenchidas > melhorContagem) {
      melhorContagem = preenchidas;
      melhorIndice = i;
    }
  }

  return melhorIndice;
}

/** Converte um valor de texto (formatos comuns pt-BR e en-US) em número.
 * Detecta automaticamente se "," ou "." é o separador decimal, olhando
 * qual dos dois aparece por último no texto. */
export function paraNumero(texto: string): number {
  let limpo = (texto ?? "").replace(/[R$\s]/g, "").trim();
  if (!limpo) return 0;

  const negativo = /^-/.test(limpo) || /^\(.*\)$/.test(limpo);
  limpo = limpo.replace(/[()-]/g, "");
  if (!limpo) return 0;

  const ultimaVirgula = limpo.lastIndexOf(",");
  const ultimoPonto = limpo.lastIndexOf(".");

  if (ultimaVirgula > -1 && ultimoPonto > -1) {
    if (ultimaVirgula > ultimoPonto) {
      limpo = limpo.replace(/\./g, "").replace(",", ".");
    } else {
      limpo = limpo.replace(/,/g, "");
    }
  } else if (ultimaVirgula > -1) {
    limpo = limpo.replace(",", ".");
  } else if (ultimoPonto > -1) {
    const casas = limpo.length - ultimoPonto - 1;
    if (casas === 3) {
      limpo = limpo.replace(/\./g, "");
    }
  }

  const numero = parseFloat(limpo);
  if (Number.isNaN(numero)) return 0;
  return negativo ? -numero : numero;
}

/** Converte data em formatos comuns (DD/MM/AAAA, AAAA-MM-DD) para AAAA-MM-DD. */
export function paraDataISO(texto: string): string | null {
  const t = (texto ?? "").trim();
  if (!t) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);

  const match = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (match) {
    const [, dia, mes, anoBruto] = match;
    const ano = anoBruto.length === 2 ? `20${anoBruto}` : anoBruto;
    return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }

  return null;
}
