export type TipoConta = "corrente" | "poupanca" | "dinheiro" | "cartao_credito";
export type TipoLancamento = "receita" | "despesa";
export type FormaPagamento = "debito" | "credito" | "pix" | "dinheiro" | "boleto";

export interface Conta {
  id: string;
  user_id: string;
  nome: string;
  tipo: TipoConta;
  saldo_inicial: number;
  dia_fechamento: number | null;
  dia_vencimento: number | null;
  cor: string;
  criado_em: string;
}

export interface Categoria {
  id: string;
  user_id: string;
  nome: string;
  tipo: TipoLancamento;
  categoria_pai_id: string | null;
  icone: string | null;
  cor: string;
}

export interface Transacao {
  id: string;
  user_id: string;
  conta_id: string;
  categoria_id: string;
  tipo: TipoLancamento;
  valor: number;
  descricao: string | null;
  data: string; // ISO date
  forma_pagamento: FormaPagamento | null;
  transacao_recorrente_id: string | null;
  parcela_atual: number | null;
  parcela_total: number | null;
  grupo_parcela_id: string | null;
  criado_em: string;
}

export interface TransacaoRecorrente {
  id: string;
  user_id: string;
  conta_id: string;
  categoria_id: string;
  valor: number;
  descricao: string | null;
  dia_do_mes: number;
  ativo: boolean;
  criado_em: string;
}

export interface Orcamento {
  id: string;
  user_id: string;
  categoria_id: string;
  valor_limite: number;
  mes_referencia: string;
}

export interface Meta {
  id: string;
  user_id: string;
  nome: string;
  valor_alvo: number;
  valor_atual: number;
  data_alvo: string | null;
  criado_em: string;
}

// Payload esperado da IA ao interpretar um lançamento em texto livre
export interface SugestaoLancamentoIA {
  valor: number;
  categoria_sugerida: string;
  descricao: string;
  data: string; // ISO date
  tipo: TipoLancamento;
}
