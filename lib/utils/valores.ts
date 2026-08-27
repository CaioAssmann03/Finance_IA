/** Teto de segurança para qualquer valor monetário: a coluna do banco é
 * numeric(12,2), então acima disso o insert falharia com um erro técnico. */
export const VALOR_MAXIMO = 9_999_999_999.99;

/**
 * Converte um texto de valor monetário (formatos pt-BR e en-US) em número.
 * Detecta se "," ou "." é o separador decimal olhando qual aparece por último.
 * Devolve `null` quando o texto não representa um número — quem chama decide
 * se isso é erro de validação ou se cai num padrão.
 */
export function paraNumeroMoeda(texto: string | null | undefined): number | null {
  let limpo = (texto ?? "").replace(/[R$\s\u00A0]/g, "").trim();
  if (!limpo) return null;

  const negativo = /^-/.test(limpo) || /^\(.*\)$/.test(limpo);
  limpo = limpo.replace(/[()\-+]/g, "");
  if (!limpo) return null;

  const ultimaVirgula = limpo.lastIndexOf(",");
  const ultimoPonto = limpo.lastIndexOf(".");

  if (ultimaVirgula > -1 && ultimoPonto > -1) {
    limpo =
      ultimaVirgula > ultimoPonto
        ? limpo.replace(/\./g, "").replace(",", ".")
        : limpo.replace(/,/g, "");
  } else if (ultimaVirgula > -1) {
    limpo = limpo.replace(",", ".");
  } else if (ultimoPonto > -1) {
    // "1.234" com 3 casas depois do ponto é separador de milhar, não decimal
    const casas = limpo.length - ultimoPonto - 1;
    if (casas === 3) limpo = limpo.replace(/\./g, "");
  }

  if (!/^\d*\.?\d*$/.test(limpo)) return null;

  const numero = Number(limpo);
  if (!Number.isFinite(numero)) return null;
  return negativo ? -numero : numero;
}

export interface ValorValidado {
  ok: boolean;
  valor: number;
  erro?: string;
}

/**
 * Valida um valor digitado pelo usuário: precisa existir, ser positivo,
 * caber no numeric(12,2) do banco e é arredondado para 2 casas — assim
 * "10,999" não entra no banco como 10.999 e volta arredondado depois.
 */
export function validarValorMonetario(texto: string): ValorValidado {
  const numero = paraNumeroMoeda(texto);

  if (numero === null) return { ok: false, valor: 0, erro: "Informe um valor numérico válido." };
  if (numero <= 0) return { ok: false, valor: 0, erro: "O valor precisa ser maior que zero." };
  if (numero > VALOR_MAXIMO)
    return { ok: false, valor: 0, erro: "Esse valor é alto demais. Confira o que foi digitado." };

  return { ok: true, valor: Math.round(numero * 100) / 100 };
}
