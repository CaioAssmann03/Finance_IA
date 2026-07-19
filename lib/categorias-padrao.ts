import type { TipoLancamento } from "@/types/database";
import { PALETA_CATEGORIAS } from "@/lib/paleta-categorias";

const [
  coral, ambar, dourado, lima, verde, verdeAzulado, ciano, azul, indigo,
  violeta, orquidea, rosa, rosaAvermelhado, cobre, caramelo, azulCinza,
  cinzaAzulado, cinzaNeutro,
] = PALETA_CATEGORIAS;

export const CATEGORIAS_PADRAO: {
  nome: string;
  tipo: TipoLancamento;
  icone: string;
  cor: string;
}[] = [
  { nome: "Alimentação", tipo: "despesa", icone: "utensils", cor: coral },
  { nome: "Mercado", tipo: "despesa", icone: "shopping-cart", cor: ambar },
  { nome: "Transporte", tipo: "despesa", icone: "car", cor: dourado },
  { nome: "Moradia", tipo: "despesa", icone: "home", cor: caramelo },
  { nome: "Contas Fixas", tipo: "despesa", icone: "file-text", cor: cobre },
  { nome: "Saúde", tipo: "despesa", icone: "heart-pulse", cor: rosaAvermelhado },
  { nome: "Educação", tipo: "despesa", icone: "book-open", cor: azul },
  { nome: "Lazer", tipo: "despesa", icone: "party-popper", cor: violeta },
  { nome: "Assinaturas", tipo: "despesa", icone: "repeat", cor: verdeAzulado },
  { nome: "Vestuário", tipo: "despesa", icone: "shirt", cor: orquidea },
  { nome: "Cuidados Pessoais", tipo: "despesa", icone: "sparkles", cor: rosa },
  { nome: "Pets", tipo: "despesa", icone: "paw-print", cor: lima },
  { nome: "Outros", tipo: "despesa", icone: "more-horizontal", cor: cinzaNeutro },
  { nome: "Salário", tipo: "receita", icone: "wallet", cor: verde },
  { nome: "Freelance", tipo: "receita", icone: "laptop", cor: ciano },
  { nome: "Investimentos", tipo: "receita", icone: "trending-up", cor: indigo },
  { nome: "Presente", tipo: "receita", icone: "gift", cor: azulCinza },
  { nome: "Outros", tipo: "receita", icone: "more-horizontal", cor: cinzaAzulado },
];
