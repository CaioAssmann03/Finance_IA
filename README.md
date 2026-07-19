# Finance IA

**Seu livro-caixa pessoal, sem planilha.**

Finance IA é um aplicativo pessoal de controle financeiro, criado para substituir de vez o uso de planilhas no dia a dia. A ideia é simples: lançar um gasto deve levar menos de 10 segundos, e entender para onde o dinheiro está indo não deveria exigir fórmulas, tabelas dinâmicas ou disciplina manual — o próprio app deve mostrar isso de forma clara, e com uma camada de inteligência artificial ajudando a interpretar os dados.

Este é um projeto de uso **estritamente pessoal** — não é multiusuário, não tem plano de virar um SaaS, e prioriza simplicidade de manutenção por uma única pessoa.

--

## Por que este projeto existe

Planilha resolve, mas cansa: exige lançar manualmente, não sincroniza bem entre celular e computador, e não entrega nenhuma inteligência sobre os dados — só números. O Finance IA nasce para resolver três frustrações específicas:

1. **Lançar um gasto é lento e chato** → aqui deve ser rápido, com um formulário direto ao ponto (e, na fase de IA, até por texto livre: *"50 mercado"* e o app entende sozinho).
2. **Planilha não acompanha o celular direito** → aqui é um app web responsivo (PWA), com os mesmos dados no celular e no computador, sincronizados na nuvem.
3. **Planilha só mostra números, não entende os números** → aqui existe (ou vai existir, ver Roadmap) um assistente que responde perguntas como *"quanto gastei com lazer esse mês?"* usando os dados reais do banco.

---

## Estado atual do projeto

🟢 **Em desenvolvimento ativo.** O MVP funcional básico já está de pé:

| Área | Status |
|---|---|
| Login e cadastro | ✅ Funcionando |
| Dashboard (saldo, receitas x despesas, gráfico por categoria, maiores gastos) | ✅ Funcionando |
| Contas e carteiras (criar, listar, excluir) | ✅ Funcionando |
| Categorias (criar, listar, excluir, categorias padrão em 1 clique) | ✅ Funcionando |
| Lançar transação | ✅ Funcionando |
| Extrato (listar, filtrar, editar, excluir) | ✅ Funcionando |
| Transações recorrentes e parceladas | ⬜ Não iniciado |
| Fatura de cartão de crédito | ⬜ Não iniciado |
| Orçamento por categoria com alerta | ⬜ Não iniciado |
| Metas financeiras | ⬜ Não iniciado |
| Assistente com IA (categorização automática e chat) | ⬜ Não iniciado |
| PWA instalável no celular | ⬜ Não iniciado |

O detalhamento fino de cada item, incluindo o que exatamente falta em cada tela, está em [`docs/PROGRESSO.md`](./docs/PROGRESSO.md) — esse é o arquivo mais atualizado do projeto, use-o como fonte da verdade sobre o que já foi feito.

---

## Como o produto foi pensado

A documentação completa de produto está na pasta [`docs/`](./docs):

- [`01-prd-visao-geral.md`](./docs/01-prd-visao-geral.md) — visão geral, objetivos, funcionalidades do MVP e das fases futuras, telas principais.
- [`02-arquitetura-tecnica.md`](./docs/02-arquitetura-tecnica.md) — stack escolhida e por quê, estrutura de pastas, fluxos de integração com IA, segurança, custos.
- [`03-modelo-de-dados.md`](./docs/03-modelo-de-dados.md) — todas as tabelas do banco de dados e suas relações.
- [`04-roadmap.md`](./docs/04-roadmap.md) — fases de construção, do MVP até os extras.
- [`PROGRESSO.md`](./docs/PROGRESSO.md) — checklist vivo do que já foi feito e o que vem a seguir.

---

## Stack técnica

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js (App Router) + TypeScript |
| Estilo | Tailwind CSS v4 |
| Gráficos | Recharts |
| Ícones | Lucide |
| Backend / Banco de dados | Supabase (Postgres + Auth, com Row Level Security) |
| IA (categorização e assistente) | API da Anthropic (Claude) — a integrar |
| Hospedagem | Vercel |

Um único código atende celular e computador (web responsivo / PWA) — não existe app nativo, por escolha, para manter o projeto simples de manter sozinho.

---

## Identidade visual

O app segue um tema visual próprio, batizado internamente de **"livro-caixa" (ledger)**: fundo em tom de tinta verde-escura, dourado como cor de destaque para valores e saldo, verde-sálvia para receitas, terracota para despesas. Tipografia serifada (Fraunces) nos títulos, Inter no corpo do texto, e IBM Plex Mono (monoespaçada) nos valores numéricos — para remeter à leitura de um extrato/livro-caixa físico, sem parecer uma planilha.

O elemento visual assinatura é a **"ledger row"**: uma linha com uma guia pontilhada entre o rótulo e o valor, como em um extrato bancário antigo.

---

## Rodando o projeto localmente

### Pré-requisitos
- Node.js 18+
- Uma conta gratuita no [Supabase](https://supabase.com)

### Passo a passo

1. Clone o repositório e instale as dependências:
   ```bash
   git clone https://github.com/CaioAssmann03/Finance_IA.git
   cd Finance_IA
   npm install
   ```

2. Crie um projeto no Supabase e copie a **Project URL** e a **anon key** em *Project Settings → API*.

3. Copie o arquivo de exemplo de variáveis de ambiente e preencha com seus dados:
   ```bash
   cp .env.example .env.local
   ```
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-aqui
   ```
   > Atenção: a URL não deve incluir `/rest/v1/` no final.

4. Rode a migração inicial do banco: abra `supabase/migrations/0001_init.sql`, copie o conteúdo e execute no **SQL Editor** do painel do Supabase.

5. Suba o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   Acesse [http://localhost:3000](http://localhost:3000).

6. Crie sua conta pela própria tela de cadastro do app. Depois, em **Categorias**, use o botão **"Usar categorias padrão"** para começar rápido, e em **Contas**, cadastre pelo menos uma conta.

---

## Estrutura de pastas

```
Finance_IA/
├── app/
│   ├── (auth)/          # login e cadastro
│   ├── (app)/            # telas internas (protegidas por sessão)
│   └── api/               # rotas de API (IA, etc.)
├── components/
│   ├── ui/                # botões, inputs, cards, modal
│   ├── charts/             # gráficos
│   ├── forms/              # formulários e telas client-side
│   └── layout/             # navegação, cabeçalhos
├── lib/
│   ├── supabase/           # clients do Supabase (browser e server)
│   └── utils/               # formatação de moeda, data, etc.
├── types/                   # tipos TypeScript do banco de dados
├── supabase/migrations/     # SQL das tabelas e políticas de segurança
└── docs/                    # documentação completa do produto
```

---

## Princípios de design do produto (para manter ao evoluir o projeto)

- **É de uso pessoal.** Não adicionar complexidade de multiusuário, multi-tenant ou área administrativa.
- **Rapidez de lançamento vem antes de qualquer funcionalidade nova.** Se uma ideia tornar lançar um gasto mais lento, ela não entra.
- **A IA nunca calcula valores financeiros sozinha.** O backend sempre calcula os números exatos direto no banco de dados; a IA só interpreta, categoriza ou explica em linguagem natural — nunca "inventa" um total.
- **Privacidade em primeiro lugar.** Nenhum dado financeiro sai do Supabase/API da Anthropic para qualquer outro serviço de terceiros.

---

## Licença

Projeto pessoal, sem licença de distribuição definida — uso próprio do autor.
