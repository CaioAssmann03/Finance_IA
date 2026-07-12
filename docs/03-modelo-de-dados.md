# Modelo de Dados — Finance IA

> Banco relacional (Postgres via Supabase). Todas as tabelas têm `user_id` para RLS, mesmo sendo uso pessoal.

## Tabelas

### `contas`
| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK) | |
| nome | text | Ex: "Nubank", "Carteira", "Poupança" |
| tipo | text | `corrente`, `poupanca`, `dinheiro`, `cartao_credito` |
| saldo_inicial | numeric | |
| dia_fechamento | int (nullable) | só para cartão de crédito |
| dia_vencimento | int (nullable) | só para cartão de crédito |
| cor | text | para identificação visual |
| criado_em | timestamp | |

### `categorias`
| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK) | |
| nome | text | Ex: "Alimentação" |
| tipo | text | `receita` ou `despesa` |
| categoria_pai_id | uuid (nullable, FK -> categorias.id) | para subcategorias |
| icone | text | |
| cor | text | |

### `transacoes`
| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK) | |
| conta_id | uuid (FK -> contas.id) | |
| categoria_id | uuid (FK -> categorias.id) | |
| tipo | text | `receita` ou `despesa` |
| valor | numeric | |
| descricao | text | |
| data | date | |
| forma_pagamento | text | `debito`, `credito`, `pix`, `dinheiro`, `boleto` |
| transacao_recorrente_id | uuid (nullable, FK) | se veio de uma recorrência |
| parcela_atual | int (nullable) | ex: 3 |
| parcela_total | int (nullable) | ex: 10 |
| grupo_parcela_id | uuid (nullable) | agrupa todas as parcelas de uma mesma compra |
| criado_em | timestamp | |

### `transacoes_recorrentes`
| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK) | |
| conta_id | uuid (FK) | |
| categoria_id | uuid (FK) | |
| valor | numeric | |
| descricao | text | |
| dia_do_mes | int | dia em que deve lançar |
| ativo | boolean | |
| criado_em | timestamp | |

### `orcamentos`
| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK) | |
| categoria_id | uuid (FK) | |
| valor_limite | numeric | |
| mes_referencia | date | primeiro dia do mês (ex: 2026-07-01) |

### `metas`
| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK) | |
| nome | text | |
| valor_alvo | numeric | |
| valor_atual | numeric | |
| data_alvo | date | |
| criado_em | timestamp | |

---

## Views / Consultas úteis (para o Dashboard)

- **Saldo por conta:** `saldo_inicial + soma(receitas) - soma(despesas)` das transações daquela conta.
- **Gasto por categoria no mês:** soma de `valor` em `transacoes` onde `tipo = 'despesa'`, agrupado por `categoria_id`, filtrado por mês.
- **Comparativo mês a mês:** soma de despesas agrupadas por `date_trunc('month', data)`.
- **Fatura atual do cartão:** transações da conta tipo `cartao_credito` dentro do intervalo entre o último fechamento e o próximo.

---

## Categorias Padrão Sugeridas (seed inicial)

**Despesas:** Alimentação, Mercado, Transporte, Moradia, Contas Fixas, Saúde, Educação, Lazer, Assinaturas, Vestuário, Cuidados Pessoais, Pets, Outros.

**Receitas:** Salário, Freelance, Investimentos, Presente, Outros.
