import Papa from "papaparse";
import { paraNumeroMoeda } from "@/lib/utils/valores";

/** Lê um CSV genérico e devolve TODAS as linhas cruas, sem assumir qual é o
 * cabeçalho — alguns bancos (ex: Bradesco) colocam linhas de título antes da
 * tabela, então quem decide qual linha é o cabeçalho é a pessoa, olhando a
 * prévia. Tenta primeiro deixar o Papaparse adivinhar o delimitador; se o
 * resultado vier tudo numa coluna só (sinal de que a detecção falhou),
 * tenta de novo forçando `;`, tab e `,`, nessa ordem, e fica com o que gerar
 * mais colunas. */
export function lerLinhasBrutas(conteudo: string): string[][] {
  function parseCom(delimiter: string): string[][] {
    const resultado = Papa.parse<string[]>(conteudo.trim(), {
      delimiter,
      skipEmptyLines: true,
    });
    return (resultado.data ?? []).filter((l) => l.length > 0);
  }

  const automatico = parseCom("");
  const maiorContagemColunas = (linhas: string[][]) =>
    Math.max(0, ...linhas.slice(0, 20).map((l) => l.length));

  if (maiorContagemColunas(automatico) > 1) return automatico;

  for (const delimiter of [";", "\t", ","]) {
    const tentativa = parseCom(delimiter);
    if (maiorContagemColunas(tentativa) > 1) return tentativa;
  }

  return automatico;
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

/** Converte um valor de texto em número, devolvendo 0 quando a célula não
 * tem um número reconhecível (linha de saldo, cabeçalho repetido, etc.). */
export function paraNumero(texto: string): number {
  return paraNumeroMoeda(texto) ?? 0;
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
