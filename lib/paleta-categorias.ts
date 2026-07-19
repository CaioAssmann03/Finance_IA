/** Paleta de cores para categorias: 18 tons distintos entre si, escolhidos
 * pra ficarem legíveis tanto no tema escuro (fundo azul-marinho) quanto no
 * tema claro (fundo branco) — nem muito escuros, nem muito claros. */
export const PALETA_CATEGORIAS = [
  "#F4785C", // coral
  "#F2A93B", // âmbar
  "#E0C23E", // amarelo-dourado
  "#A8D14F", // lima
  "#4FD689", // verde
  "#3FC7B0", // verde-azulado
  "#4DC3E0", // ciano
  "#5B9EF0", // azul
  "#8C9CF2", // índigo
  "#A78BFA", // violeta
  "#C879E0", // orquídea
  "#EA7FC0", // rosa
  "#F2789A", // rosa-avermelhado
  "#D98C4A", // cobre
  "#B98E63", // caramelo
  "#8FA3B8", // azul-acinzentado
  "#7B8A9E", // cinza-azulado
  "#9AA5B1", // cinza neutro (bom pra "Outros")
];

/** Escolhe uma cor da paleta pra uma categoria nova, evitando repetir uma cor
 * já usada por outra categoria existente, se possível. */
export function corParaNovaCategoria(coresJaUsadas: string[]): string {
  const livre = PALETA_CATEGORIAS.find((c) => !coresJaUsadas.includes(c));
  if (livre) return livre;
  // Todas as cores da paleta já estão em uso: repete ciclicamente.
  return PALETA_CATEGORIAS[coresJaUsadas.length % PALETA_CATEGORIAS.length];
}
