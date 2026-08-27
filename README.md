# Finance IA

**Seu livro-caixa pessoal, sem planilha.**

Finance IA é um aplicativo pessoal de controle financeiro, criado para substituir de vez o uso de planilhas no dia a dia. A ideia é simples: lançar um gasto deve levar menos de 10 segundos, e entender para onde o dinheiro está indo não deveria exigir fórmulas, tabelas dinâmicas ou disciplina manual.

Este é um projeto de uso **estritamente pessoal** — não é multiusuário, não tem plano de virar um SaaS, e prioriza simplicidade de manutenção por uma única pessoa.

> **Sobre o nome:** o "IA" é herança da ideia original, que previa um assistente em linguagem natural. Essa camada foi removida do código (ver [Assistente com IA](#assistente-com-ia-removido)) e hoje o app é 100% cálculo direto no banco.

---

## Por que este projeto existe

Planilha resolve, mas cansa: exige lançar manualmente, não sincroniza bem entre celular e computador, e não entrega nenhuma leitura sobre os dados — só números. O Finance IA nasce para resolver duas frustrações específicas:

1. **Lançar um gasto é lento e chato** → aqui é um formulário direto ao ponto, com modos de lançamento único, conta fixa e parcelado.
2. **Planilha não acompanha o celular direito** → aqui é um app web responsivo (PWA), com os mesmos dados no celular e no computador, sincronizados na nuvem.

---

## Estado atual

🟢 **Em desenvolvimento ativo.**

| Área | Status |
|---|---|
| Login, cadastro e recuperação de senha | ✅ Funcionando |
| Dashboard (saldo, receitas × despesas, gráficos, orçamento) | ✅ Funcionando |
| Contas e carteiras | ✅ Funcionando |
| Categorias e orçamento por categoria | ✅ Funcionando |
| Lançamento único, conta fixa e parcelado | ✅ Funcionando |
| Extrato (filtrar, editar, excluir, exportar CSV) | ✅ Funcionando |
| Editar e excluir parcelamentos em série | ✅ Funcionando |
| Fatura de cartão de crédito | ✅ Funcionando |
| Metas financeiras | ✅ Funcionando |
| Importar extrato (OFX, CSV, XLS/XLSX) | ✅ Funcionando |
| Relatório anual | ✅ Funcionando |
| PWA instalável e notificações de alerta | ✅ Funcionando |
| Assistente com IA | ⬜ Removido do código |

O detalhamento fino está em [`docs/PROGRESSO.md`](./docs/PROGRESSO.md).

### Assistente com IA (removido)

A integração com a API da Anthropic (categorização automática por texto livre e chat sobre os próprios gastos) foi **retirada do código**: as rotas `app/api/ia/*`, o cliente `lib/ia/anthropic.ts` e a tela do assistente não existem mais, e a variável `ANTHROPIC_API_KEY` deixou de ser necessária.

O motivo é custo: eram rotas que chamavam uma API paga sem estarem em uso. A ideia segue no roadmap ([`docs/01-prd-visao-geral.md`](./docs/01-prd-visao-geral.md) e [`docs/02-arquitetura-tecnica.md`](./docs/02-arquitetura-tecnica.md) descrevem o desenho pretendido), e o histórico do git tem a implementação anterior caso valha retomar.

---

## Stack técnica

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.2 |
| Linguagem | TypeScript | 5 |
| UI | React | 19.2 |
| Estilo | Tailwind CSS | v4 (via `@tailwindcss/postcss`) |
| Gráficos | Recharts | 3 |
| Ícones | Lucide React | 1.24 |
| Banco e autenticação | Supabase (Postgres + Auth + RLS) | `supabase-js` 2.110 / `ssr` 0.12 |
| Importação de arquivos | PapaParse (CSV) + SheetJS `xlsx` (Excel) + parser próprio de OFX | — |
| Hospedagem | Vercel | — |

**Como as peças se encaixam.** As telas são Server Components que consultam o Supabase direto no servidor; a interatividade (formulários, filtros, modais) vive em Client Components que falam com o Supabase pelo navegador. Não existe camada de API própria entre os dois — a segurança fica no banco, via Row Level Security, e não em código de aplicação. As poucas rotas em `app/api/` existem só para o que precisa da chave de serviço ou não pode rodar no cliente.

Um único código atende celular e computador (web responsivo / PWA) — não existe app nativo, por escolha, para manter o projeto simples de manter sozinho.

---

## Identidade visual

O app segue um tema visual próprio, batizado internamente de **"livro-caixa" (ledger)**: fundo em tom de tinta verde-escura, dourado como cor de destaque para valores e saldo, verde-sálvia para receitas, terracota para despesas. Tipografia serifada (Fraunces) nos títulos, Inter no corpo do texto, e IBM Plex Mono (monoespaçada) nos valores numéricos — para remeter à leitura de um extrato/livro-caixa físico, sem parecer uma planilha.

O elemento visual assinatura é a **"ledger row"**: uma linha com uma guia pontilhada entre o rótulo e o valor, como em um extrato bancário antigo. Há tema claro e escuro, com a escolha guardada no navegador.

---

## Rodando o projeto localmente

### Pré-requisitos
- Node.js 18+
- Uma conta gratuita no [Supabase](https://supabase.com)

### Passo a passo

1. Clone o repositório e instale as dependências:
   ```bash
   git clone https://github.com/CaioAssmann03/Finance_IA.git
   ```
   ```bash
   npm install
   ```

2. Crie um projeto no Supabase e copie a **Project URL** e a **anon key** em *Project Settings → API*.

3. Copie o arquivo de exemplo e preencha:
   ```bash
   cp .env.example .env.local
   ```

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-aqui
   SUPABASE_SERVICE_ROLE_KEY=sua-chave-de-servico
   ```

   > **A causa nº 1 de "não sobe":** colar uma chave (`sb_publishable_…` ou `eyJhbGci…`) no campo `NEXT_PUBLIC_SUPABASE_URL`. Ali vai a **URL**, no formato `https://xxxxxxxx.supabase.co`, sem `/rest/v1/` no final. O app detecta esse caso e diz exatamente o que corrigir.

4. Rode as migrações **na ordem**, pelo **SQL Editor** do painel do Supabase:

   | Arquivo | O que faz |
   |---|---|
   | `0001_init.sql` | tabelas e RLS |
   | `0002_seed_categorias.sql` | categorias padrão (opcional — dá para criar pela tela) |
   | `0003_integridade_e_seguranca.sql` | checagens de integridade, índices, gatilhos e RLS por operação |
   | `0004_desempenho.sql` | função `saldo_ate` e índice de consulta por data |

   As migrações 0003 e 0004 podem ser rodadas mais de uma vez sem quebrar. **Elas não são opcionais:** sem a 0003 as consultas do extrato fazem varredura completa das tabelas, e sem a 0004 o card de saldo do dashboard aparece como indisponível.

5. Suba o servidor:
   ```bash
   npm run dev
   ```
   Acesse [http://localhost:3000](http://localhost:3000).

6. Crie sua conta pela tela de cadastro. Depois, em **Categorias**, use **"Usar categorias padrão"**, e em **Contas**, cadastre pelo menos uma conta.

### Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm start` | serve o build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | checagem de tipos |

---

## Estrutura de pastas

```
Finance_IA/
├── app/
│   ├── (auth)/                 # login, cadastro, recuperação de senha
│   ├── (app)/                  # telas internas (protegidas por sessão)
│   │   └── */loading.tsx       # esqueletos de carregamento por rota
│   ├── api/conta/excluir/      # única rota de API (precisa da service role key)
│   └── auth/confirm/           # troca o link do e-mail por uma sessão
├── components/
│   ├── ui/                     # botões, inputs, cards, modal
│   ├── charts/                 # gráficos (Recharts)
│   ├── forms/                  # formulários e telas client-side
│   ├── dashboard/              # blocos da visão geral
│   ├── notificacoes/           # alertas e notificações do navegador
│   └── layout/                 # navegação, cabeçalhos, esqueletos
├── lib/
│   ├── supabase/               # clients (browser, server, admin) e validação de env
│   ├── transacoes/             # regras de parcelamento
│   ├── recorrentes/            # geração dos lançamentos de contas fixas
│   ├── cartao/                 # cálculo do ciclo de fatura
│   ├── importacao/             # parsers de OFX, CSV e Excel
│   ├── notificacoes/           # cálculo dos alertas
│   ├── hooks/                  # hooks compartilhados
│   └── utils/                  # datas, valores, formatação, erros, limite de taxa
├── types/                      # tipos TypeScript do banco
├── supabase/migrations/        # SQL das tabelas, políticas e índices
├── public/                     # ícones, manifesto e service worker do PWA
└── docs/                       # documentação do produto e das rodadas de correção
```

---

## Decisões que valem conhecer antes de mexer

Detalhadas em [`docs/06-correcoes-e-seguranca.md`](./docs/06-correcoes-e-seguranca.md). Em resumo:

- **Datas nunca passam por `new Date(string)` nem por `toISOString()`.** A coluna `data` é `date`, sem hora, e o construtor nativo interpreta `"2026-08-27"` como meia-noite em UTC — no Brasil, 21h do dia anterior. Use sempre `lib/utils/datas.ts`.
- **Valores monetários passam por `lib/utils/valores.ts`.** `Number("1.234,56".replace(",", "."))` devolve `NaN`.
- **Todo formulário usa `lib/hooks/use-acao-unica.ts`.** `disabled={salvando}` só age depois do re-render do React, e um clique duplo rápido grava duas vezes.
- **Parcelamento é uma série, não linhas soltas.** Quem amarra é o `grupo_parcela_id`; edição e exclusão pedem o escopo (só esta / esta e as próximas / todas) e filtram direto no banco.
- **A segurança mora no Postgres.** RLS por operação, gatilho conferindo se conta e categoria são do dono do lançamento, e checagens de integridade. Não confie em validação só no cliente.
- **A sessão é verificada uma vez por requisição.** `usuarioAtual()` (em `lib/supabase/server.ts`) é memoizado com `cache()` do React; chamar `getUser()` solto no layout e na página refaz a ida à rede.

---

## Princípios de design do produto (para manter ao evoluir o projeto)

- **É de uso pessoal.** Não adicionar complexidade de multiusuário, multi-tenant ou área administrativa.
- **Rapidez de lançamento vem antes de qualquer funcionalidade nova.** Se uma ideia tornar lançar um gasto mais lento, ela não entra.
- **Número financeiro sai do banco, sempre.** Se um dia a camada de IA voltar, ela interpreta e explica — nunca calcula um total.
- **Privacidade em primeiro lugar.** Nenhum dado financeiro sai do Supabase para qualquer outro serviço de terceiros.

---

## Licença

Projeto pessoal, sem licença de distribuição definida — uso próprio do autor.
