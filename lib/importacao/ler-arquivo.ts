/**
 * Lê um arquivo de texto tentando UTF-8 primeiro; se encontrar caracteres de
 * substituição (sinal de que a codificação real é outra — muito comum em
 * exportações de banco brasileiro, tipo Bradesco, que usam Windows-1252/Latin-1),
 * relê o mesmo conteúdo como Windows-1252.
 */
export async function lerArquivoComCodificacao(arquivo: File): Promise<string> {
  const buffer = await arquivo.arrayBuffer();

  const textoUtf8 = new TextDecoder("utf-8").decode(buffer);
  if (!textoUtf8.includes("\uFFFD")) {
    return textoUtf8;
  }

  try {
    return new TextDecoder("windows-1252").decode(buffer);
  } catch {
    return textoUtf8;
  }
}
