# Arquitetura Técnica — Finance IA

> Objetivo desta stack: simples de construir sozinho com ajuda de IA (Claude Code), barata/gratuita para uso pessoal, funciona bem em celular e computador.

> **Estado em 27/08/2026:** a camada de IA descrita neste documento **não existe
> mais no código**. As rotas `app/api/ia/*`, o cliente `lib/ia/anthropic.ts`, a tela
> `/assistente` e a variável `ANTHROPIC_API_KEY` foram removidos, porque nenhuma tela
> os usava e eram chamadas a uma API paga sem contrapartida. O que segue descreve o
> desenho pretendido, mantido como referência caso a ideia volte. Ver
> [`06-correcoes-e-seguranca.md`](./06-correcoes-e-seguranca.md).


## 1. Stack Recomendada

| Camada | Tecnologia | Por quê |
|---|---|---|
| Frontend | **Next.js (React) + TypeScript** | Um único projeto serve web e mobile (responsivo/PWA). Muito bem documentado, Claude Code lida bem com ele. |
| Estilo | **Tailwind CSS** | Rápido de estilizar, funciona muito bem com IA gerando componentes. |
| Gráficos | **Recharts** | Simples para gráficos de pizza/linha/barra. |
| Backend / Banco de dados | **Supabase** (Postgres gerenciado) | Já vem com autenticação, banco relacional, API automática e plano gratuito generoso. Elimina a necessidade de você criar um backend do zero. |
| Autenticação | **Supabase Auth** | Login por e-mail/senha ou Google, pronto de fábrica. |
| ~~IA (categorização e assistente)~~ | ~~API da Anthropic (Claude)~~ | **Removido.** Ver aviso no topo. |
| Hospedagem do frontend | **Vercel** (plano gratuito) | Deploy automático a cada mudança, feito para Next.js. |
| PWA | **next-pwa** ou configuração manual de manifest + service worker | Permite "instalar" o app no celular. |

**Por que Supabase em vez de "criar meu próprio backend":** para um projeto solo, cada camada extra que você não precisa manter é tempo economizado. Supabase te dá banco de dados + login + regras de segurança por linha (RLS) prontos, e ainda gera uma API automaticamente.

---

## 2. Estrutura de Pastas (sugestão)

```
finance-ia/
├── app/                      # Next.js App Router
│   ├── (auth)/
│   │   ├── login/
│   │   └── cadastro/
│   ├── (app)/
│   │   ├── dashboard/
│   │   ├── transacoes/
│   │   ├── contas/
│   │   ├── categorias/
│   │   ├── metas/
│   │   ├── relatorios/
│   │   └── configuracoes/
│   ├── api/
│   │   └── conta/excluir/route.ts   # única rota: precisa da service role key
│   └── layout.tsx
├── components/
│   ├── ui/                   # botões, inputs, cards
│   ├── charts/
│   └── forms/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   ├── admin.ts
│   │   └── env.ts
│   ├── transacoes/          # regras de parcelamento
│   ├── recorrentes/         # contas fixas do mês
│   ├── cartao/              # ciclo de fatura
│   ├── importacao/          # OFX, CSV, Excel
│   ├── hooks/
│   └── utils/
├── types/
│   └── database.ts
├── public/
│   └── manifest.json
└── supabase/
    └── migrations/
```

---

## 3. Fluxo da IA de Categorização *(removido do código — desenho de referência)*

1. Você digita: `"50 mercado"` no campo de lançamento rápido.
2. Frontend chama `/api/ia/categorizar` enviando o texto.
3. Backend monta um prompt para a API da Anthropic contendo: o texto digitado + a lista das suas categorias existentes.
4. A IA responde em JSON estruturado: `{ "valor": 50.00, "categoria": "Alimentação", "descricao": "Mercado", "data": "hoje" }`.
5. Frontend preenche o formulário automaticamente, você só confirma (ou ajusta) e salva.

## 4. Fluxo do Assistente *(removido do código — desenho de referência)*

1. Você pergunta: `"quanto gastei com lazer esse mês?"`.
2. Backend busca no Supabase os dados agregados relevantes (soma de transações da categoria "Lazer" no mês atual).
3. Backend envia esses dados resumidos + a pergunta para a API da Anthropic.
4. A IA responde em linguagem natural usando os números reais, evitando "inventar" valores (a IA só interpreta e explica, não gera números sozinha).

> Regra de ouro: a IA nunca calcula valores financeiros sozinha "de cabeça" — seu backend sempre calcula os números exatos no banco de dados, e a IA só interpreta/explica/formata. Isso evita erros de conta.

---

## 5. Segurança

- Ativar **Row Level Security (RLS)** no Supabase: cada tabela só permite leitura/escrita de dados pertencentes ao `user_id` autenticado, mesmo sendo só você — é boa prática e evita erro bobo.
- Chaves do Supabase sempre em variáveis de ambiente (`.env.local`), nunca no código. A `SUPABASE_SERVICE_ROLE_KEY` ignora a RLS: só pode aparecer em código de servidor, e nunca com o prefixo `NEXT_PUBLIC_`.
- HTTPS por padrão (Vercel já entrega isso).
- Cabeçalhos de segurança (CSP, HSTS, `X-Frame-Options`) configurados em `next.config.ts`.
- Proteção de rotas no `proxy.ts` (middleware), não só no layout.

O detalhamento do que foi endurecido, e por quê, está em [`06-correcoes-e-seguranca.md`](./06-correcoes-e-seguranca.md).

---

## 6. Custos Estimados (uso pessoal, baixo volume)

- **Vercel:** gratuito no plano hobby.
- **Supabase:** gratuito no plano free (até 500MB de banco — muito acima do que um controle financeiro pessoal usa).
- **API Anthropic:** era o único custo variável previsto. Com a camada de IA removida, **o projeto hoje roda inteiramente em planos gratuitos**.

---

## 7. Passo a Passo Sugerido para Começar (com Claude Code)

1. Criar o projeto Next.js (`npx create-next-app@latest`).
2. Criar conta no Supabase, criar o projeto, copiar as chaves de API.
3. Rodar as migrations do banco (ver documento `03-modelo-de-dados.md`).
4. Configurar autenticação (login/cadastro).
5. Construir a tela de Dashboard com dados mockados primeiro (validar layout).
6. Conectar Dashboard ao banco real.
7. Construir tela de lançamento de transação.
8. Construir extrato, contas, categorias, metas.
9. Configurar PWA (manifest + ícone) para instalar no celular.
10. Deploy no Vercel.

> Os passos de IA que existiam aqui foram removidos junto com a camada.

> Dica prática: peça para o Claude Code construir **uma tela por vez**, testando cada uma antes de seguir para a próxima. Isso evita que a IA "perca o fio" em um projeto grande de uma vez só.
