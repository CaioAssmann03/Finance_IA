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
- [x] `/categorias` — **funcional**: listar (separado em despesas/receitas), criar categoria individual, excluir, botão "Usar categorias padrão", e seção de orçamento mensal por categoria (define limite, some no dashboard).
- [x] `/transacoes` (extrato) — **funcional**: lista até 500 lançamentos mais recentes, com filtro por mês (padrão: mês atual), busca por descrição, filtro por tipo/categoria/conta, edição inline (modal) e exclusão. Parcelas do mesmo grupo (`grupo_parcela_id`) são agrupadas numa única linha expansível quando o filtro está em "Todos os meses", evitando poluir a lista com uma linha por parcela.
- [x] `/transacoes/recorrentes` — **funcional**: criar/pausar/reativar/excluir contas fixas mensais. Lançamento do mês é gerado automaticamente ao abrir o dashboard.
- [x] `/transacoes/importar` — **funcional**: importa extrato bancário/fatura em OFX (parser próprio, sem lib externa) ou CSV genérico (com mapeamento manual de colunas + Papaparse). Prévia com checkbox por linha, categoria por linha (com atalho pra aplicar a mesma categoria a todas de uma vez), conta única pra todo o lote, e inserção em massa no Supabase.
- [x] Exportar CSV — botão "Exportar CSV" no Extrato, exporta exatamente o que está filtrado na tela (respeita filtro de mês/tipo/categoria/conta/busca), formato pt-BR (`;` como separador, vírgula decimal), pronto pra abrir no Excel/Google Sheets.
- [x] `/metas` — **funcional**: criar meta (nome, valor alvo, data alvo opcional), adicionar valor aos poucos (aporte), barra de progresso, marca como concluída ao atingir 100%, excluir.
- [x] `/assistente` — **funcional**: chat com sugestões de pergunta prontas, envia a pergunta pra `/api/ia/perguntar`, que monta o contexto (mês atual, mês anterior, contas fixas ativas) no servidor e manda pra Claude Haiku responder só com base nesses números reais.
- [ ] `/configuracoes` — **placeholder** (fase 4).

### Qualidade
- [x] `npx tsc --noEmit` passa sem erros.
- [x] `npx eslint .` passa sem erros.
- [ ] `npx next build` — **não roda dentro do sandbox de desenvolvimento** porque o ambiente aqui não tem acesso à internet liberado para `fonts.googleapis.com` (isso é uma restrição do ambiente onde o código foi gerado, não um bug do projeto). No seu computador ou na Vercel isso vai funcionar normalmente. Ainda assim, rode `npm run build` localmente para confirmar antes do primeiro deploy.

---

## 🔜 Próximos passos (nesta ordem)

1. ~~Setup Supabase + cadastro~~ — **feito**.
2. ~~Categorias e Contas~~ — **feito**.
3. ~~Extrato (`/transacoes`) com filtros, edição e exclusão~~ — **feito em 13/07/2026**.
4. ~~README detalhado do projeto~~ — **feito em 13/07/2026**.
5. ~~**Transações recorrentes e parceladas**~~ — **feito em 13/07/2026**. Integradas direto no formulário de `/transacoes/novo` (3 modos: Único, Conta fixa, Parcelado). `/transacoes/recorrentes` virou tela só de gerenciamento (pausar/excluir). `lib/recorrentes/gerar-lancamentos-do-mes.ts` continua cobrindo os meses seguintes automaticamente a cada visita ao dashboard.
6. ~~**Fatura de cartão de crédito**~~ — **feito em 13/07/2026**. Nova rota `/contas/[id]`: se a conta for `cartao_credito`, calcula e mostra a fatura atual e a próxima (com data de fechamento/vencimento e lista de lançamentos de cada uma), usando `lib/cartao/fatura.ts`. Contas comuns mostram só o extrato daquela conta. Cards em `/contas` agora são clicáveis e levam pra essa tela.
7. ~~**Orçamento por categoria**~~ — **feito em 13/07/2026**. Em `/categorias`, seção "Orçamento mensal por categoria" com input de limite por categoria de despesa (salva ao sair do campo, mês atual). No `/dashboard`, card "Orçamento do mês" com barra de progresso por categoria (verde <80%, dourado 80–100%, vermelho ≥100%, com aviso de texto).
8. ~~**Metas financeiras**~~ — **feito em 13/07/2026**. Tela `/metas`: criar, adicionar valor aos poucos, barra de progresso, excluir.
9. ~~Categorização automática por texto livre e assistente/chat~~ — **feito em 13/07/2026**.
10. **Requer configurar `ANTHROPIC_API_KEY` no `.env.local`** para essas duas funcionalidades funcionarem (categorização e assistente) — sem a chave, elas mostram um erro claro pedindo pra configurar.
11. ~~Exportação CSV~~ e ~~Importação de extrato (OFX/CSV)~~ — **feito em 14/07/2026**.
12. PWA instalável no celular, notificações — polimento final, sem urgência.

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
