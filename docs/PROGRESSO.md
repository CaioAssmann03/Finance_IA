# PROGRESSO — Finance IA

> Este arquivo existe para você (ou uma IA em uma conversa futura) saber exatamente
> onde o projeto parou e o que fazer a seguir. Sempre que avançar algo, atualize esta lista.
> Para retomar em uma nova conversa: envie este arquivo (ou o projeto zipado inteiro)
> e diga "continue o projeto Finance IA a partir daqui".

Última atualização: 12/07/2026

---

## ✅ Feito

### Estrutura e configuração
- [x] Projeto Next.js 16 (App Router) + TypeScript + Tailwind v4 criado.
- [x] Dependências instaladas: `@supabase/supabase-js`, `@supabase/ssr`, `recharts`, `lucide-react`, `clsx`.
- [x] Estrutura de pastas completa criada (`app`, `components`, `lib`, `types`, `supabase/migrations`, `docs`).
- [x] Documentação (`01-prd`, `02-arquitetura`, `03-modelo-de-dados`, `04-roadmap`) copiada para dentro do repo em `docs/`.
- [x] Sistema de design definido e aplicado em `app/globals.css` (tema "livro-caixa": tons de tinta/verde-pinho + dourado, tipografia Fraunces + Inter + IBM Plex Mono, elemento assinatura "ledger-row" com guia pontilhada).
- [x] `.env.example` criado — falta preencher com valores reais do Supabase.
- [x] `manifest.json` básico do PWA criado (falta gerar ícones reais).

### Banco de dados (`supabase/migrations/`)
- [x] `0001_init.sql` — todas as tabelas (contas, categorias, transacoes, transacoes_recorrentes, orcamentos, metas) + RLS.
- [x] `0002_seed_categorias.sql` — script de categorias padrão (precisa rodar substituindo `:user_id`).
- [ ] **Ainda não rodado no Supabase real** — é preciso criar o projeto no Supabase e rodar essas migrations.

### Autenticação
- [x] `lib/supabase/client.ts` e `lib/supabase/server.ts` — clients do Supabase.
- [x] `middleware.ts` — renovação de sessão.
- [x] Página `/login` funcional (formulário completo, chama `signInWithPassword`).
- [x] Página `/cadastro` funcional (chama `signUp`, mostra tela de "confirme seu e-mail").
- [x] `app/(app)/layout.tsx` — protege as páginas internas, redireciona pra `/login` se não autenticado.

### Navegação
- [x] `components/layout/nav-principal.tsx` — sidebar no desktop, barra inferior no mobile.

### Páginas
- [x] `/dashboard` — **funcional de verdade**: busca contas e transações do mês no Supabase, calcula saldo total, receitas, despesas, gasto por categoria (gráfico de pizza com `recharts`) e lista os 5 maiores gastos do mês.
- [x] `/transacoes/novo` — **funcional de verdade**: formulário de lançamento manual (receita/despesa, valor, categoria, conta, data), grava direto no Supabase.
- [x] `/contas` — **funcional**: listar, criar (com dia de fechamento/vencimento para cartão de crédito) e excluir contas.
- [x] `/categorias` — **funcional**: listar (separado em despesas/receitas), criar categoria individual, excluir, e botão "Usar categorias padrão" que cria as 18 categorias sugeridas de uma vez (sem precisar rodar SQL).
- [ ] `/transacoes` (extrato com filtros) — **placeholder** ("em construção"). Próximo passo natural.
- [ ] `/metas` — **placeholder** (fase 4 do roadmap, não é prioridade agora).
- [ ] `/assistente` — **placeholder** (fase 3 do roadmap — depende da API da Anthropic configurada).
- [ ] `/configuracoes` — **placeholder** (fase 4).

### Qualidade
- [x] `npx tsc --noEmit` passa sem erros.
- [x] `npx eslint .` passa sem erros.
- [ ] `npx next build` — **não roda dentro do sandbox de desenvolvimento** porque o ambiente aqui não tem acesso à internet liberado para `fonts.googleapis.com` (isso é uma restrição do ambiente onde o código foi gerado, não um bug do projeto). No seu computador ou na Vercel isso vai funcionar normalmente. Ainda assim, rode `npm run build` localmente para confirmar antes do primeiro deploy.

---

## 🔜 Próximos passos (nesta ordem)

1. ~~Criar o projeto no Supabase, preencher `.env.local`, rodar migration~~ — **feito pelo usuário em 12/07/2026**. Repo: https://github.com/CaioAssmann03/Finance_IA
2. ~~Cadastro de usuário~~ — **feito**.
3. Cadastrar categorias (usar o botão "Usar categorias padrão" em `/categorias`, não precisa mais rodar `0002_seed_categorias.sql` manualmente).
4. Cadastrar pelo menos uma conta em `/contas`.
5. Testar o lançamento de uma transação em `/transacoes/novo` e conferir se aparece no `/dashboard`.
6. Construir a página **`/transacoes`** (extrato com filtros e edição/exclusão) — é a próxima da lista.
7. Depois: orçamento por categoria (dashboard já mostra gasto por categoria, falta o limite/alerta).
8. Só depois disso partir para IA (categorização automática e assistente).

> Nota: `0002_seed_categorias.sql` continua no repo como referência/backup, mas o caminho mais simples agora é o botão dentro do app.

---

## 🧠 Decisões importantes já tomadas (não repetir a discussão)

- Stack: Next.js + Supabase + Vercel + API Anthropic (ver `docs/02-arquitetura-tecnica.md`).
- Um único código atende celular e computador (PWA), sem app nativo.
- Regra de ouro da IA: ela nunca calcula valores financeiros sozinha — o backend sempre calcula os números exatos no banco, a IA só interpreta/explica/categoriza texto.
- Identidade visual "livro-caixa" (ledger): fundo verde-tinta escuro, dourado como cor de destaque/valor, verde-sálvia para receita, terracota para despesa. Tipografia serifada (Fraunces) nos títulos, Inter no corpo, IBM Plex Mono nos valores numéricos. Elemento de assinatura: a "ledger-row" (linha com guia pontilhada entre rótulo e valor, como um extrato antigo).
- Nomes de funções, variáveis, rotas e textos da interface estão em português, para manter consistência.

---

## 📌 Como continuar esta conversa depois

Se esta conversa for encerrada, na próxima:
1. Envie o zip do projeto (`finance-ia.zip`) de volta pra mim.
2. Cole a frase: "Continue o projeto Finance IA. Leia docs/PROGRESSO.md e siga a partir do próximo passo."
3. Eu vou ler este arquivo e continuar exatamente da seção "Próximos passos" acima.
