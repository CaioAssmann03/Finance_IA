import * as XLSX from "xlsx";

/** Lê um arquivo .xls/.xlsx (Excel de verdade, binário) e devolve a primeira
 * planilha como linhas de texto — no mesmo formato que o leitor de CSV, pra
 * reaproveitar a mesma tela de mapeamento de colunas. */
export async function lerLinhasDaPlanilhaExcel(arquivo: File): Promise<string[][]> {
  const buffer = await arquivo.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  const primeiraAba = workbook.SheetNames[0];
  const planilha = workbook.Sheets[primeiraAba];

  const linhas = XLSX.utils.sheet_to_json<string[]>(planilha, {
    header: 1,
    raw: false,
    dateNF: "yyyy-mm-dd",
    defval: "",
  });

  return linhas
    .map((linha) => linha.map((celula) => String(celula ?? "").trim()))
    .filter((linha) => linha.some((c) => c !== ""));
}

/** Verifica pela extensão do arquivo se é uma planilha Excel binária. */
export function ehArquivoExcel(nomeArquivo: string): boolean {
  return /\.(xlsx|xls)$/i.test(nomeArquivo);
}
