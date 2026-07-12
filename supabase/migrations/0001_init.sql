-- Finance IA — Migração inicial
-- Extensão para gerar UUIDs
create extension if not exists "pgcrypto";

-- =========================
-- CONTAS
-- =========================
create table contas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('corrente','poupanca','dinheiro','cartao_credito')),
  saldo_inicial numeric(12,2) not null default 0,
  dia_fechamento int,
  dia_vencimento int,
  cor text default '#4F9C6D',
  criado_em timestamptz not null default now()
);

-- =========================
-- CATEGORIAS
-- =========================
create table categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('receita','despesa')),
  categoria_pai_id uuid references categorias(id) on delete set null,
  icone text,
  cor text default '#C9A227'
);

-- =========================
-- TRANSAÇÕES RECORRENTES
-- =========================
create table transacoes_recorrentes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conta_id uuid not null references contas(id) on delete cascade,
  categoria_id uuid not null references categorias(id) on delete restrict,
  valor numeric(12,2) not null,
  descricao text,
  dia_do_mes int not null check (dia_do_mes between 1 and 31),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- =========================
-- TRANSAÇÕES
-- =========================
create table transacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conta_id uuid not null references contas(id) on delete cascade,
  categoria_id uuid not null references categorias(id) on delete restrict,
  tipo text not null check (tipo in ('receita','despesa')),
  valor numeric(12,2) not null,
  descricao text,
  data date not null,
  forma_pagamento text check (forma_pagamento in ('debito','credito','pix','dinheiro','boleto')),
  transacao_recorrente_id uuid references transacoes_recorrentes(id) on delete set null,
  parcela_atual int,
  parcela_total int,
  grupo_parcela_id uuid,
  criado_em timestamptz not null default now()
);

create index idx_transacoes_user_data on transacoes(user_id, data desc);
create index idx_transacoes_categoria on transacoes(categoria_id);

-- =========================
-- ORÇAMENTOS
-- =========================
create table orcamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  categoria_id uuid not null references categorias(id) on delete cascade,
  valor_limite numeric(12,2) not null,
  mes_referencia date not null,
  unique (user_id, categoria_id, mes_referencia)
);

-- =========================
-- METAS
-- =========================
create table metas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  valor_alvo numeric(12,2) not null,
  valor_atual numeric(12,2) not null default 0,
  data_alvo date,
  criado_em timestamptz not null default now()
);

-- =========================
-- ROW LEVEL SECURITY
-- =========================
alter table contas enable row level security;
alter table categorias enable row level security;
alter table transacoes enable row level security;
alter table transacoes_recorrentes enable row level security;
alter table orcamentos enable row level security;
alter table metas enable row level security;

-- Política padrão: cada usuário só acessa suas próprias linhas
create policy "contas: só o dono" on contas for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categorias: só o dono" on categorias for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transacoes: só o dono" on transacoes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recorrentes: só o dono" on transacoes_recorrentes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "orcamentos: só o dono" on orcamentos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "metas: só o dono" on metas for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
