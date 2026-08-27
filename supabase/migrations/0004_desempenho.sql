-- Finance IA — Desempenho
--
-- Depende da 0003 (índices e RLS). Pode ser rodada mais de uma vez.
-- Como rodar: painel do Supabase > SQL Editor > cole e execute.

-- =========================================================================
-- SALDO CALCULADO NO BANCO
-- =========================================================================
-- O dashboard precisa do saldo acumulado até o fim do mês exibido. Fazer isso
-- no JavaScript obriga a trazer TODAS as transações do usuário pela rede a cada
-- abertura da tela — um volume que só cresce, para no fim virar um único
-- número. Aqui a soma acontece no Postgres e volta uma linha só.
--
-- SECURITY INVOKER (o padrão) de propósito: a função roda com as permissões de
-- quem chamou, então a RLS continua valendo e ninguém enxerga saldo alheio.
create or replace function public.saldo_ate(p_data date)
returns numeric
language sql
stable
set search_path = public
as $$
  select
    coalesce((select sum(saldo_inicial) from contas), 0)
    + coalesce((
        select sum(case when t.tipo = 'receita' then t.valor else -t.valor end)
          from transacoes t
          join contas c on c.id = t.conta_id
         where t.data <= p_data
      ), 0);
$$;

comment on function public.saldo_ate(date) is
  'Saldo de todas as contas do usuário da sessão até a data informada (inclusive). Respeita RLS.';

-- Índice que atende o filtro por data dentro do recorte do usuário.
create index if not exists idx_transacoes_user_data_tipo
  on transacoes (user_id, data, tipo);
