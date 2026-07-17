import Papa from "papaparse";

export interface CsvBruto {
  cabecalho: string[];
  linhas: string[][];
}

/** Lê um CSV genérico (delimitador , ou ; detectado automaticamente) e devolve cabeçalho + linhas cruas, sem interpretar ainda. */
export function lerCsvBruto(conteudo: string): CsvBruto {
  const resultado = Papa.parse<string[]>(conteudo.trim(), {
    skipEmptyLines: true,
  });

  const todasLinhas = (resultado.data ?? []).filter((l) => l.length > 0);
  if (todasLinhas.length === 0) return { cabecalho: [], linhas: [] };

  const [cabecalho, ...linhas] = todasLinhas;
  return { cabecalho, linhas };
}

/** Converte um valor de texto (formatos comuns pt-BR e en-US) em número. */
export function paraNumero(texto: string): number {
  const limpo = texto
    .replace(/[R$\s]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "") // remove separador de milhar "."
    .replace(",", ".");
  const numero = parseFloat(limpo);
  return Number.isNaN(numero) ? 0 : numero;
}

/** Converte data em formatos comuns (DD/MM/AAAA, AAAA-MM-DD) para AAAA-MM-DD. */
export function paraDataISO(texto: string): string | null {
  const t = texto.trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);

  const match = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (match) {
    const [, dia, mes, anoBruto] = match;
    const ano = anoBruto.length === 2 ? `20${anoBruto}` : anoBruto;
    return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }

  return null;
}
