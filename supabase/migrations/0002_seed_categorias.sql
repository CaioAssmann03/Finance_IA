-- Seed de categorias padrão
-- Rode este script substituindo :user_id pelo seu UUID de usuário (encontrado no Supabase Auth)

insert into categorias (user_id, nome, tipo, icone, cor) values
  (:'user_id', 'Alimentação', 'despesa', 'utensils', '#C1503D'),
  (:'user_id', 'Mercado', 'despesa', 'shopping-cart', '#C1503D'),
  (:'user_id', 'Transporte', 'despesa', 'car', '#B98A2F'),
  (:'user_id', 'Moradia', 'despesa', 'home', '#8C6D3F'),
  (:'user_id', 'Contas Fixas', 'despesa', 'file-text', '#8C6D3F'),
  (:'user_id', 'Saúde', 'despesa', 'heart-pulse', '#9C4F6D'),
  (:'user_id', 'Educação', 'despesa', 'book-open', '#4F6D9C'),
  (:'user_id', 'Lazer', 'despesa', 'party-popper', '#7A4F9C'),
  (:'user_id', 'Assinaturas', 'despesa', 'repeat', '#4F9C8E'),
  (:'user_id', 'Vestuário', 'despesa', 'shirt', '#9C7A4F'),
  (:'user_id', 'Cuidados Pessoais', 'despesa', 'sparkles', '#9C4F87'),
  (:'user_id', 'Pets', 'despesa', 'paw-print', '#4F9C6D'),
  (:'user_id', 'Outros (despesa)', 'despesa', 'more-horizontal', '#6B6B6B'),
  (:'user_id', 'Salário', 'receita', 'wallet', '#4F9C6D'),
  (:'user_id', 'Freelance', 'receita', 'laptop', '#4F9C6D'),
  (:'user_id', 'Investimentos', 'receita', 'trending-up', '#C9A227'),
  (:'user_id', 'Presente', 'receita', 'gift', '#4F9C6D'),
  (:'user_id', 'Outros (receita)', 'receita', 'more-horizontal', '#6B6B6B');
