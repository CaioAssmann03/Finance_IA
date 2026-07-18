# Funcionalidades Realizadas — Finance IA

> Última atualização: 13/07/2026. Este documento descreve, em detalhe, tudo o que já foi construído e está funcionando no projeto. Para a lista de pendências e próximos passos, veja `docs/PROGRESSO.md`. Para a visão de produto original, veja `docs/01-prd-visao-geral.md`.

---

## 1. Autenticação

- **Cadastro** (`/cadastro`): criação de conta por e-mail e senha via Supabase Auth. Após cadastrar, mostra tela pedindo para confirmar o e-mail antes do primeiro login.
- **Login** (`/login`): autenticação por e-mail e senha.
- **Proteção de rotas**: todas as telas internas (grupo `(app)`) verificam a sessão no servidor antes de renderizar — se não houver usuário autenticado, redireciona para `/login`.
- **Renovação de sessão**: middleware que atualiza o token do Supabase em toda requisição, evitando logout inesperado.

---

## 2. Contas e Carteiras (`/contas`)

- Listagem de todas as contas cadastradas, em cards.
- Criação de conta com: nome, tipo (conta corrente, poupança, dinheiro, cartão de crédito) e saldo inicial.
- Campos extras para cartão de crédito: dia de fechamento e dia de vencimento da fatura.
- Exclusão de conta.
- Cada card é clicável e leva à tela de detalhe da conta (ver item 8 — Fatura de Cartão).

---

## 3. Categorias (`/categorias`)

- Listagem separada em duas colunas: Despesas e Receitas.
- Criação de categoria individual (nome + tipo).
- Botão **"Usar categorias padrão"**: cria de uma vez 18 categorias pré-definidas (13 de despesa, 5 de receita) — evita começar do zero.
- Exclusão de categoria (bloqueada pelo banco se já houver transações usando ela, com aviso ao usuário).
- **Orçamento mensal por categoria** (ver item 7).

---

## 4. Lançamento de Transações (`/transacoes/novo`)

Formulário único com **3 modos de lançamento**, selecionáveis no topo:

### 4.1 Único
Lançamento normal: tipo (receita/despesa), valor, descrição, categoria, conta e data.

### 4.2 Conta fixa (recorrente)
Em vez de uma data específica, pede o **dia do mês** em que a cobrança acontece (ex: "todo dia 5"). Ao salvar:
- Cria um registro na tabela `transacoes_recorrentes`.
- Já lança imediatamente a ocorrência do mês atual (não precisa esperar o próximo mês).
- Nos meses seguintes, o lançamento é criado automaticamente (ver item 6).

### 4.3 Parcelado
Pede a **parcela atual** e o **total de parcelas** (ex: 3 de 10, se a compra já vinha sendo paga fora do app). Ao salvar, gera de uma vez todos os lançamentos da parcela atual até a última, um por mês, cada um com a descrição marcada (ex: "Notebook (3/10)") e vinculados por um `grupo_parcela_id` em comum.

---

## 5. Extrato (`/transacoes`)

- Lista até 500 lançamentos mais recentes.
- **Filtro por mês**: seletor com todos os meses que têm lançamento, mais a opção "Todos os meses". Abre por padrão no mês atual — evita ver tudo de uma vez.
- **Outros filtros**: busca por texto na descrição, tipo (receita/despesa/todos), categoria, conta — todos combináveis entre si e com o filtro de mês.
- Mostra a soma dos valores filtrados no topo da lista (respeitando o sinal de receita/despesa).
- **Agrupamento de parcelas**: quando o filtro de mês está em "Todos os meses", lançamentos que pertencem ao mesmo grupo de parcelamento (mesmo `grupo_parcela_id`) aparecem como uma única linha (ex: "Moto · 48x"), em vez de uma linha por parcela. Clicar na linha expande e mostra cada parcela individualmente, com opção de editar/excluir uma só ou excluir o grupo inteiro. Dentro de um mês específico isso não é necessário, já que normalmente só existe uma parcela daquele grupo por mês.
- **Edição**: clique no ícone de lápis abre um modal para editar qualquer campo do lançamento.
- **Exclusão**: clique no ícone de lixeira, com confirmação — individual ou do grupo de parcelas inteiro.
- Atalho no cabeçalho para a tela de **Contas fixas**.

---

## 5.1 Importar Extrato (`/transacoes/importar`)

- Envio de arquivo **.OFX** (padrão que a maioria dos bancos e cartões brasileiros exporta) ou **.CSV** genérico.
- **OFX**: parser próprio (sem biblioteca externa), extrai data, valor e descrição de cada transação (`<STMTTRN>`), define receita/despesa pelo sinal do valor.
- **CSV**: leitura com Papaparse + tela de mapeamento — o app tenta adivinhar automaticamente quais colunas são data/descrição/valor pelo nome do cabeçalho, mas o usuário pode corrigir manualmente. A tela mostra uma **amostra das 5 primeiras linhas reais do arquivo**, com a coluna escolhida destacada, para evitar confundir colunas parecidas (ex: "Valor" da transação vs. "Saldo" acumulado). Também é possível escolher como definir o tipo: pelo sinal do valor, ou forçar tudo como despesa (útil para CSV de fatura de cartão que só lista gastos) ou tudo como receita. A conversão de número (`paraNumero`) detecta automaticamente qual separador é o decimal (`,` ou `.`), em vez de assumir sempre o formato pt-BR — evita erros como um valor de R$3.880,48 virar R$3.880.482 por interpretação errada do separador.
- **Prévia antes de salvar**: lista todas as linhas interpretadas, com checkbox para incluir/excluir cada uma, categoria por linha (com atalho para aplicar a mesma categoria a todas as despesas ou todas as receitas de uma vez) e uma única conta selecionada para todo o lote.
- Inserção em massa no banco só depois da confirmação.

## 5.2 Exportar CSV

- Botão "Exportar CSV" na tela de Extrato — exporta exatamente o que está sendo mostrado ali (respeita todos os filtros ativos: mês, tipo, categoria, conta, busca).
- Formato pensado para abrir direto no Excel/Google Sheets em português: separador `;`, vírgula como decimal, acentuação preservada (BOM UTF-8).

---

## 6. Transações Recorrentes — Gerenciamento (`/transacoes/recorrentes`)

- Lista todas as contas fixas cadastradas, com valor, dia do mês, categoria e conta.
- **Pausar/reativar**: uma recorrência pausada para de gerar lançamentos automaticamente, sem precisar excluir o cadastro (útil para assinaturas canceladas temporariamente).
- **Excluir**: remove a recorrência (os lançamentos já criados por ela no passado continuam existindo).
- **Geração automática**: a função `lib/recorrentes/gerar-lancamentos-do-mes.ts` roda toda vez que o `/dashboard` é aberto. Ela verifica cada recorrência ativa e, se ainda não existir um lançamento dela para o mês atual, cria automaticamente — sem duplicar, mesmo abrindo o app várias vezes no mesmo mês.

---

## 7. Orçamento por Categoria

- Em `/categorias`, seção **"Orçamento mensal por categoria"**: um campo de valor ao lado de cada categoria de despesa. Ao sair do campo (perder o foco), o limite é salvo automaticamente para o mês atual. Deixar em branco remove o limite daquela categoria.
- No `/dashboard`, card **"Orçamento do mês"**: para cada categoria com limite definido, mostra uma barra de progresso comparando o gasto atual com o limite:
  - Verde: abaixo de 80% do limite.
  - Dourado: entre 80% e 100% — aviso "Perto do limite".
  - Vermelho: 100% ou mais — aviso "Orçamento estourado".

---

## 8. Fatura de Cartão de Crédito (`/contas/[id]`)

- Ao clicar em uma conta do tipo **cartão de crédito**, abre uma tela de detalhe com dois cards lado a lado:
  - **Fatura atual**: soma das despesas do ciclo em aberto, com data de fechamento e vencimento, e a lista de lançamentos daquele período.
  - **Próxima fatura**: mesma informação para o ciclo seguinte, que ainda está acumulando.
- O cálculo do período de cada fatura é feito em `lib/cartao/fatura.ts`, a partir do dia de fechamento e vencimento cadastrados na conta — incluindo o tratamento de meses com menos dias (ex: fechamento configurado no dia 31 num mês de 30 dias).
- Para contas que não são cartão de crédito, a mesma rota mostra simplesmente o extrato daquela conta.

---

## 9. Metas Financeiras (`/metas`)

- Criação de meta: nome, valor alvo e data alvo (opcional).
- **Aporte**: botão "Adicionar valor" abre um modal para somar um valor ao progresso atual da meta (não substitui, soma ao que já tinha).
- Barra de progresso visual; ao atingir 100%, o card marca a meta como concluída e o botão de aporte some.
- Exclusão de meta.

---

## 9.1 Lançamento por texto livre (IA)

- Dentro de `/transacoes/novo`, no modo **Único**, aparece um campo opcional "Lançamento rápido por texto" (ex: *"50 mercado"*, *"uber 23,50 ontem"*).
- Ao clicar em **Interpretar** (ou apertar Enter), o texto é enviado para `/api/ia/categorizar`, que chama a API da Anthropic (Claude Haiku) com a lista de categorias do usuário e pede um JSON estruturado de volta: valor, tipo (receita/despesa), categoria sugerida, descrição limpa e data (interpretando "ontem", dias da semana, etc. a partir da data de hoje).
- O formulário é preenchido automaticamente com a sugestão — o usuário só confere e salva (ou ajusta antes).
- Se a categoria sugerida pela IA não bater com nenhuma categoria existente, os outros campos ainda são preenchidos e o usuário escolhe a categoria manualmente.

## 9.2 Assistente / Chat (`/assistente`)

- Interface de chat simples, com sugestões de pergunta prontas para o primeiro uso.
- Cada pergunta é enviada para `/api/ia/perguntar`, que primeiro busca e agrega os dados reais do usuário no servidor (receitas, despesas e gasto por categoria do mês atual e do mês anterior, além das contas fixas ativas) e só então manda esse resumo + a pergunta para a Claude Haiku responder.
- **Regra de ouro respeitada**: a IA nunca recebe a tabela bruta de transações nem calcula somas sozinha — todo número que ela usa na resposta já vem calculado pelo backend; a IA só interpreta a pergunta e formata a resposta em português.

---

## 10. Dashboard (`/dashboard`)

- **Saldo total**: soma de todas as contas, considerando saldo inicial + todas as movimentações.
- **Receitas do mês** e **Despesas do mês**, em destaque.
- **Gráfico de gastos por categoria** (pizza/donut), com legenda mostrando valor por categoria.
- **Maiores gastos do mês**: lista dos 5 lançamentos de maior valor.
- **Orçamento do mês**: barras de progresso por categoria (ver item 7).
- Atalho direto para lançar uma nova transação.
- Antes de montar a tela, dispara a geração automática de lançamentos recorrentes do mês (ver item 6).

---

## 11. Identidade Visual e Base Técnica

- Tema visual próprio ("livro-caixa"/ledger): fundo em tom de tinta verde-escura, dourado para valores e destaque, verde-sálvia para receitas, terracota para despesas.
- Tipografia: Fraunces (títulos), Inter (corpo), IBM Plex Mono (valores numéricos).
- Elemento assinatura "ledger row": linha com guia pontilhada entre rótulo e valor, usada em listas de lançamentos.
- Layout responsivo: navegação lateral no desktop, barra inferior no celular.
- Banco de dados: todas as tabelas com Row Level Security (RLS) — cada usuário só acessa seus próprios dados, mesmo sendo uso pessoal.
- Qualidade de código: `npx tsc --noEmit` e `npx eslint .` passam sem erros a cada funcionalidade entregue.

---

## 12. PWA — Instalável no Celular

- Ícones reais em todos os tamanhos necessários (192, 256, 384, 512 e versão maskable para Android, além do apple-touch-icon para iOS), gerados a partir de um SVG-fonte com a identidade visual do app (fundo em gradiente verde-tinta, monograma "F" dourado, linha pontilhada remetendo à "ledger row").
- `manifest.json` completo: nome, ícones, cor de tema, modo `standalone` (abre em tela cheia, sem barra de navegador), tela inicial em `/dashboard`.
- Service worker mínimo (`public/sw.js`): cacheia só assets estáticos (ícones, JS/CSS do Next) — nunca páginas ou dados, para nunca arriscar mostrar informação financeira desatualizada offline. Existe principalmente para satisfazer o critério de instalabilidade do Chrome/Android.
- No iOS: "Compartilhar" → "Adicionar à Tela de Início". No Android/Chrome: aparece um prompt de instalação automático, ou "Instalar app" no menu do navegador.

---

## 13. Notificações

- **Banner no dashboard**: mostra automaticamente, no topo, alertas de (a) contas fixas ativas vencendo nos próximos 3 dias e (b) categorias com orçamento em 80% ou mais (aviso) ou 100%+ (estourado — urgente). Cada alerta pode ser dispensado individualmente (só naquela visita, volta a aparecer se a página for recarregada e a condição continuar valendo).
- **Notificações reais do navegador** (opcionais, em `/configuracoes`): pedem permissão do navegador e, uma vez concedida, disparam uma notificação do sistema (fora da aba) quando a lista de alertas muda — verificado no máximo uma vez por dia (guardado no `localStorage` do navegador). Tem também um botão "Testar agora" para forçar a verificação na hora.
- **Importante**: isso não é notificação push de verdade (não chega com o navegador/app fechado) — funciona enquanto o Finance IA está aberto em alguma aba. Notificação push real exigiria um servidor rodando em segundo plano (VAPID + service worker push), o que foge do escopo de um projeto pessoal simples de manter.
- A lógica de cálculo dos alertas fica em `lib/notificacoes/calcular-alertas.ts` e é exposta também via `GET /api/alertas`, reaproveitada tanto pelo dashboard quanto pelas notificações do navegador.

---

## Estado do projeto

Todas as funcionalidades previstas no `docs/01-prd-visao-geral.md` e no `docs/04-roadmap.md` estão implementadas. Para novas funcionalidades ou ajustes, não existe mais uma lista de pendências fixa — acompanhe `docs/PROGRESSO.md` para o histórico de mudanças.

> **Lembrete**: a categorização por texto e o assistente/chat exigem a variável `ANTHROPIC_API_KEY` configurada no `.env.local` (chave gerada em https://console.anthropic.com, com crédito na conta). Sem ela, essas duas funcionalidades mostram uma mensagem de erro clara em vez de travar o app.
