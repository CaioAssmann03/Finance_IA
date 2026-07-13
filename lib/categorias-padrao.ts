import type { TipoLancamento } from "@/types/database";

export const CATEGORIAS_PADRAO: {
  nome: string;
  tipo: TipoLancamento;
  icone: string;
  cor: string;
}[] = [
  { nome: "Alimentação", tipo: "despesa", icone: "utensils", cor: "#C1503D" },
  { nome: "Mercado", tipo: "despesa", icone: "shopping-cart", cor: "#C1503D" },
  { nome: "Transporte", tipo: "despesa", icone: "car", cor: "#B98A2F" },
  { nome: "Moradia", tipo: "despesa", icone: "home", cor: "#8C6D3F" },
  { nome: "Contas Fixas", tipo: "despesa", icone: "file-text", cor: "#8C6D3F" },
  { nome: "Saúde", tipo: "despesa", icone: "heart-pulse", cor: "#9C4F6D" },
  { nome: "Educação", tipo: "despesa", icone: "book-open", cor: "#4F6D9C" },
  { nome: "Lazer", tipo: "despesa", icone: "party-popper", cor: "#7A4F9C" },
  { nome: "Assinaturas", tipo: "despesa", icone: "repeat", cor: "#4F9C8E" },
  { nome: "Vestuário", tipo: "despesa", icone: "shirt", cor: "#9C7A4F" },
  { nome: "Cuidados Pessoais", tipo: "despesa", icone: "sparkles", cor: "#9C4F87" },
  { nome: "Pets", tipo: "despesa", icone: "paw-print", cor: "#4F9C6D" },
  { nome: "Outros", tipo: "despesa", icone: "more-horizontal", cor: "#6B6B6B" },
  { nome: "Salário", tipo: "receita", icone: "wallet", cor: "#4F9C6D" },
  { nome: "Freelance", tipo: "receita", icone: "laptop", cor: "#4F9C6D" },
  { nome: "Investimentos", tipo: "receita", icone: "trending-up", cor: "#C9A227" },
  { nome: "Presente", tipo: "receita", icone: "gift", cor: "#4F9C6D" },
  { nome: "Outros", tipo: "receita", icone: "more-horizontal", cor: "#6B6B6B" },
];
