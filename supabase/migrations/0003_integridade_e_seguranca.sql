-- Finance IA — Integridade dos dados e reforço de segurança
--
-- Pode ser rodada mais de uma vez sem quebrar (tudo é "if not exists" ou
-- "or replace"). Os UPDATEs de normalização vêm antes das constraints porque
-- dados já gravados fora do padrão impediriam a criação delas.
--
-- Como rodar: painel do Supabase > SQL Editor > cole e execute.

-- =========================================================================
-- 1. NORMALIZAÇÃO DOS DADOS EXISTENTES
-- =========================================================================

-- Valor sempre positivo: o sinal de receita/despesa quem dá é a coluna `tipo`.
-- Um valor negativo aqui inverteria todos os totais do dashboard.
update transacoes set valor = abs(valor) where valor < 0;
update transacoes_recorrentes set valor = abs(valor) where valor < 0;

-- Parcela sem par (só "atual" ou só "total") ou com atual > total não
-- descreve um parcelamento válido — limpa em vez de manter meio preenchida.
update transacoes
   set parcela_atual = null, parcela_total = null
 where (parcela_atual is null) <> (parcela_total is null)
    or (parcela_total is not null and (parcela_total < 2 or parcela_total > 120))
    or (parcela_atual is not null and parcela_total is not null and parcela_atual > parcela_total)
    or (parcela_atual is not null and parcela_atual < 1);

-- Parcela solta sem grupo não dá para editar/excluir em série. Agrupa o que
-- der pela combinação conta + categoria + valor + total de parcelas.
update transacoes t
   set grupo_parcela_id = sub.grupo
  from (
    select user_id, conta_id, categoria_id, valor, parcela_total,
           regexp_replace(coalesce(descricao, ''), '\s*\(\d+/\d+\)\s*$', '') as base,
           gen_random_uuid() as grupo
      from transacoes
     where grupo_parcela_id is null and parcela_total is not null
     group by user_id, conta_id, categoria_id, valor, parcela_total, base
  ) sub
 where t.grupo_parcela_id is null
   and t.parcela_total is not null
   and t.user_id = sub.user_id
   and t.conta_id = sub.conta_id
   and t.categoria_id = sub.categoria_id
   and t.valor = sub.valor
   and t.parcela_total = sub.parcela_total
   and regexp_replace(coalesce(t.descricao, ''), '\s*\(\d+/\d+\)\s*$', '') = sub.base;

-- Remove lançamentos recorrentes duplicados no mesmo mês, mantendo o mais
-- antigo. Eram criados quando o dashboard reabria: a checagem de "já existe"
-- usava .maybeSingle(), que ERRA quando encontra mais de uma linha, e o erro
-- era lido como "não achei" — gerando mais uma cópia a cada visita.
delete from transacoes t
 using transacoes anterior
 where t.transacao_recorrente_id is not null
   and t.transacao_recorrente_id = anterior.transacao_recorrente_id
   and date_trunc('month', t.data::timestamp) = date_trunc('month', anterior.data::timestamp)
   and (anterior.criado_em, anterior.id) < (t.criado_em, t.id);

-- Categorias com nome repetido dentro do mesmo tipo (efeito de clicar duas
-- vezes em "usar categorias padrão") ganham um sufixo antes do índice único.
with repetidas as (
  select id,
         row_number() over (
           partition by user_id, tipo, lower(nome) order by id
         ) as posicao
    from categorias
)
update categorias c
   set nome = c.nome || ' (' || r.posicao || ')'
  from repetidas r
 where c.id = r.id and r.posicao > 1;

-- =========================================================================
-- 2. REGRAS DE INTEGRIDADE
-- =========================================================================

-- Usa >= 0 (e não > 0) para que a migração nunca falhe em cima de um
-- lançamento zerado que já esteja gravado. O formulário exige valor > 0.
alter table transacoes
  drop constraint if exists transacoes_valor_positivo,
  add constraint transacoes_valor_positivo check (valor >= 0);

alter table transacoes
  drop constraint if exists transacoes_parcela_coerente,
  add constraint transacoes_parcela_coerente check (
    (parcela_atual is null and parcela_total is null)
    or (parcela_atual between 1 and parcela_total and parcela_total between 2 and 120)
  );

alter table transacoes_recorrentes
  drop constraint if exists recorrentes_valor_positivo,
  add constraint recorrentes_valor_positivo check (valor >= 0);

alter table contas
  drop constraint if exists contas_dia_fechamento_valido,
  add constraint contas_dia_fechamento_valido check (
    dia_fechamento is null or dia_fechamento between 1 and 31
  );

alter table contas
  drop constraint if exists contas_dia_vencimento_valido,
  add constraint contas_dia_vencimento_valido check (
    dia_vencimento is null or dia_vencimento between 1 and 31
  );

update metas set valor_atual = 0 where valor_atual < 0;
update metas set valor_alvo = abs(valor_alvo) where valor_alvo < 0;

alter table metas
  drop constraint if exists metas_valores_validos,
  add constraint metas_valores_validos check (valor_alvo >= 0 and valor_atual >= 0);

-- A tela já apaga o orçamento quando o limite fica em branco ou zerado;
-- isto só alinha o que já estiver gravado.
delete from orcamentos where valor_limite <= 0;

alter table orcamentos
  drop constraint if exists orcamentos_limite_positivo,
  add constraint orcamentos_limite_positivo check (valor_limite > 0);

-- =========================================================================
-- 3. ÍNDICES
-- =========================================================================

-- Barreira definitiva contra o lançamento recorrente duplicado: mesmo que
-- duas abas abram o dashboard no mesmo instante, só a primeira grava.
create unique index if not exists uniq_recorrente_por_mes
  on transacoes (transacao_recorrente_id, (date_trunc('month', data::timestamp)))
  where transacao_recorrente_id is not null;

create unique index if not exists uniq_categoria_nome_por_usuario
  on categorias (user_id, tipo, lower(nome));

-- Usados pelas telas de extrato, conta e fatura de cartão.
create index if not exists idx_transacoes_grupo_parcela
  on transacoes (grupo_parcela_id) where grupo_parcela_id is not null;
create index if not exists idx_transacoes_conta_data on transacoes (conta_id, data desc);
create index if not exists idx_transacoes_recorrente on transacoes (transacao_recorrente_id)
  where transacao_recorrente_id is not null;
create index if not exists idx_recorrentes_user_ativo
  on transacoes_recorrentes (user_id, ativo);
create index if not exists idx_categorias_user on categorias (user_id);
create index if not exists idx_contas_user on contas (user_id);
create index if not exists idx_orcamentos_user_mes on orcamentos (user_id, mes_referencia);

-- =========================================================================
-- 4. DONO CORRETO EM TODAS AS LINHAS
-- =========================================================================

-- Se o cliente esquecer o user_id, o banco preenche com o usuário da sessão
-- em vez de estourar erro de not-null.
alter table contas                 alter column user_id set default auth.uid();
alter table categorias             alter column user_id set default auth.uid();
alter table transacoes             alter column user_id set default auth.uid();
alter table transacoes_recorrentes alter column user_id set default auth.uid();
alter table orcamentos             alter column user_id set default auth.uid();
alter table metas                  alter column user_id set default auth.uid();

-- A RLS garante que a LINHA é do usuário, mas não que a conta e a categoria
-- referenciadas também sejam. Sem esta checagem, alguém que descobrisse o UUID
-- da conta de outra pessoa conseguiria pendurar um lançamento nela.
create or replace function public.validar_dono_dos_vinculos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.conta_id is not null and not exists (
    select 1 from contas c where c.id = new.conta_id and c.user_id = new.user_id
  ) then
    raise exception 'A conta informada não pertence a este usuário.'
      using errcode = 'check_violation';
  end if;

  if new.categoria_id is not null and not exists (
    select 1 from categorias g where g.id = new.categoria_id and g.user_id = new.user_id
  ) then
    raise exception 'A categoria informada não pertence a este usuário.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke all on function public.validar_dono_dos_vinculos() from public;

drop trigger if exists trg_transacoes_dono_dos_vinculos on transacoes;
create trigger trg_transacoes_dono_dos_vinculos
  before insert or update of conta_id, categoria_id, user_id on transacoes
  for each row execute function public.validar_dono_dos_vinculos();

drop trigger if exists trg_recorrentes_dono_dos_vinculos on transacoes_recorrentes;
create trigger trg_recorrentes_dono_dos_vinculos
  before insert or update of conta_id, categoria_id, user_id on transacoes_recorrentes
  for each row execute function public.validar_dono_dos_vinculos();

drop trigger if exists trg_orcamentos_dono_dos_vinculos on orcamentos;
create trigger trg_orcamentos_dono_dos_vinculos
  before insert or update of categoria_id, user_id on orcamentos
  for each row execute function public.validar_dono_dos_vinculos();

-- =========================================================================
-- 5. POLÍTICAS DE RLS EXPLÍCITAS POR OPERAÇÃO
-- =========================================================================
-- A política única "for all" já cobria tudo, mas separar por operação deixa
-- claro o que cada uma permite e evita que um ajuste futuro em uma delas
-- afrouxe as outras sem querer.

do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'contas', 'categorias', 'transacoes', 'transacoes_recorrentes', 'orcamentos', 'metas'
  ] loop
    execute format('alter table %I enable row level security', tabela);

    execute format('drop policy if exists "%s: leitura do dono" on %I', tabela, tabela);
    execute format(
      'create policy "%s: leitura do dono" on %I for select to authenticated using (auth.uid() = user_id)',
      tabela, tabela);

    execute format('drop policy if exists "%s: insercao do dono" on %I', tabela, tabela);
    execute format(
      'create policy "%s: insercao do dono" on %I for insert to authenticated with check (auth.uid() = user_id)',
      tabela, tabela);

    execute format('drop policy if exists "%s: atualizacao do dono" on %I', tabela, tabela);
    execute format(
      'create policy "%s: atualizacao do dono" on %I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      tabela, tabela);

    execute format('drop policy if exists "%s: exclusao do dono" on %I', tabela, tabela);
    execute format(
      'create policy "%s: exclusao do dono" on %I for delete to authenticated using (auth.uid() = user_id)',
      tabela, tabela);
  end loop;
end $$;

-- Remove as políticas antigas "for all", já cobertas pelas quatro acima.
drop policy if exists "contas: só o dono" on contas;
drop policy if exists "categorias: só o dono" on categorias;
drop policy if exists "transacoes: só o dono" on transacoes;
drop policy if exists "recorrentes: só o dono" on transacoes_recorrentes;
drop policy if exists "orcamentos: só o dono" on orcamentos;
drop policy if exists "metas: só o dono" on metas;
