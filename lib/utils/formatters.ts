export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatarData(data: string | Date): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function nomeDoMes(data: Date = new Date()): string {
  return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
