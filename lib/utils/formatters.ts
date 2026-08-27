import { deISO } from "@/lib/utils/datas";

export function formatarMoeda(valor: number): string {
  const numero = Number.isFinite(valor) ? valor : 0;
  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Formata uma data "AAAA-MM-DD" (ou um Date) como "27 ago".
 *
 * Importante: strings ISO passam por `deISO`, não por `new Date(texto)` — o
 * construtor nativo trata "2026-08-27" como meia-noite em UTC, que no Brasil
 * é 21h do dia 26, e a tela mostrava a data um dia atrás.
 */
export function formatarData(data: string | Date): string {
  const d = typeof data === "string" ? deISO(data) : data;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/** Formata uma data "AAAA-MM-DD" (ou um Date) como "27/08/2026". */
export function formatarDataCompleta(data: string | Date): string {
  const d = typeof data === "string" ? deISO(data) : data;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export function nomeDoMes(data: Date = new Date()): string {
  return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

/** "Agosto de 2026" a partir da chave "2026-08". */
export function nomeDoMesPelaChave(chave: string): string {
  const [ano, mes] = chave.split("-").map(Number);
  const rotulo = new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return rotulo.charAt(0).toUpperCase() + rotulo.slice(1);
}
