/**
 * Utilidades de data que trabalham SEMPRE no fuso horário local do usuário.
 *
 * Por que isso existe: `new Date("2026-08-27")` é interpretado pelo JS como
 * meia-noite em UTC. No Brasil (UTC-3) isso vira 26/08 às 21h, então a data
 * aparecia um dia atrás na tela. Do mesmo jeito, `new Date().toISOString()`
 * depois das 21h já devolve o dia seguinte. Todo lugar que lida com a coluna
 * `data` (que no banco é `date`, sem hora) deve usar estas funções.
 */

/** Converte um Date para "AAAA-MM-DD" usando o calendário local (nunca UTC). */
export function paraISO(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** Data de hoje no formato "AAAA-MM-DD", no fuso local. */
export function hojeISO(): string {
  return paraISO(new Date());
}

/** Converte "AAAA-MM-DD" para um Date à meia-noite local (não UTC). */
export function deISO(iso: string): Date {
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  return new Date(ano, (mes || 1) - 1, dia || 1);
}

/** true se o texto é uma data "AAAA-MM-DD" que existe de verdade no calendário. */
export function ehDataISOValida(valor: string | null | undefined): boolean {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  return paraISO(deISO(valor)) === valor;
}

export function ultimoDiaDoMes(ano: number, mesIndice0: number): number {
  return new Date(ano, mesIndice0 + 1, 0).getDate();
}

/**
 * Soma meses a uma data ISO preservando o dia sempre que possível e
 * "grudando" no último dia quando o mês de destino é mais curto.
 *
 * O `Date.setMonth` nativo transborda: 31/01 + 1 mês vira 03/03, o que fazia
 * uma compra parcelada no dia 31 pular fevereiro. Aqui 31/01 + 1 = 28/02.
 */
export function adicionarMeses(iso: string, meses: number): string {
  const base = deISO(iso);
  const ano = base.getFullYear();
  const mes = base.getMonth() + meses;
  const alvo = new Date(ano, mes, 1);
  const dia = Math.min(
    base.getDate(),
    ultimoDiaDoMes(alvo.getFullYear(), alvo.getMonth())
  );
  return paraISO(new Date(alvo.getFullYear(), alvo.getMonth(), dia));
}

/** "AAAA-MM" da data ISO informada. */
export function chaveMes(iso: string): string {
  return iso.slice(0, 7);
}

/** "AAAA-MM" do mês atual. */
export function chaveMesAtual(): string {
  return chaveMes(hojeISO());
}

/** Primeiro dia ("AAAA-MM-01") do mês "AAAA-MM". */
export function primeiroDiaDoMes(chave: string): string {
  return `${chave}-01`;
}

/** Último dia ("AAAA-MM-DD") do mês "AAAA-MM". */
export function ultimoDiaDoMesISO(chave: string): string {
  const [ano, mes] = chave.split("-").map(Number);
  return paraISO(new Date(ano, mes, 0));
}

/** Diferença em dias inteiros entre duas datas, ignorando horário. */
export function diasEntre(de: Date, ate: Date): number {
  const a = new Date(de.getFullYear(), de.getMonth(), de.getDate());
  const b = new Date(ate.getFullYear(), ate.getMonth(), ate.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}
