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
- [x] `/transacoes/importar` — **funcional**: importa extrato bancário/fatura em OFX (parser próprio) ou CSV genérico. **Reformulado em 14/07/2026 (parte 3)**, depois de testar com um extrato real do Bradesco: a causa raiz dos valores absurdos era a coluna "Docto." (número do documento) sendo lida como valor. Agora: (1) a pessoa escolhe manualmente qual linha é o cabeçalho de verdade, vendo uma prévia com a linha destacada — o app ainda sugere automaticamente qual linha é (a com mais células preenchidas entre as 8 primeiras), mas não trava nisso; (2) suporta extratos com **Crédito e Débito em colunas separadas** (em vez de forçar uma única coluna de valor com sinal) — se o cabeçalho tiver colunas com esses nomes, o modo "duas colunas" é ativado automaticamente; (3) linhas de continuação/detalhe sem data própria (comuns em extratos que quebram uma transação em 2 linhas, tipo "Rem: Fulano de 01/06") são puladas automaticamente.
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
12. ~~PWA instalável no celular~~ — **feito em 14/07/2026**. Ícones reais gerados (`scripts/gerar-icones.js` com `sharp`, a partir de `scripts/icon-source.svg`/`icon-maskable-source.svg`), `manifest.json` completo, `apple-touch-icon`, e um service worker mínimo (`public/sw.js`) que cacheia só assets estáticos (ícones e JS/CSS do Next) — nunca páginas ou dados, pra não arriscar mostrar informação financeira desatualizada.
13. ~~Notificações (contas a vencer, orçamento estourado)~~ — **feito em 14/07/2026**. Banner de alertas no dashboard (`lib/notificacoes/calcular-alertas.ts` + `/api/alertas`) e notificações reais do navegador, opcionais, ativadas em `/configuracoes`.

**Todo o roadmap original do PRD está implementado.** Dali pra frente é manutenção, ajustes de UX e o que mais surgir no uso real.

---

## 🧠 Decisões importantes já tomadas (não repetir a discussão)

- Stack: Next.js + Supabase + Vercel + API Anthropic (ver `docs/02-arquitetura-tecnica.md`).
- Um único código atende celular e computador (PWA), sem app nativo.
- Regra de ouro da IA: ela nunca calcula valores financeiros sozinha — o backend sempre calcula os números exatos no banco, a IA só interpreta/explica/categoriza texto.
- Identidade visual "livro-caixa" (ledger): fundo verde-tinta escuro, dourado como cor de destaque/valor, verde-sálvia para receita, terracota para despesa. Tipografia serifada (Fraunces) nos títulos, Inter no corpo, IBM Plex Mono nos valores numéricos. Elemento de assinatura: a "ledger-row" (linha com guia pontilhada entre rótulo e valor, como um extrato antigo).
- Nomes de funções, variáveis, rotas e textos da interface estão em português, para manter consistência.

---

## 🚀 Rodada de melhorias — 14/07/2026 (parte 2)

- **Recolorir categorias existentes**: botão em `/categorias` que reatribui cores da paleta nova a todas as categorias já cadastradas, sem repetir cor entre elas.
- **Editar categoria**: agora dá pra renomear e trocar a cor de uma categoria já existente (antes só criava/excluía). Novo componente `components/ui/seletor-cor.tsx` — mostra a paleta como bolinhas clicáveis + uma opção de cor livre (input nativo `type="color"`).
- **Editar conta**: mesma coisa pra contas — antes só criava/excluía, agora dá pra editar nome, tipo, saldo inicial e dia de fechamento/vencimento (pra cartão de crédito).
- **Ícones reais das categorias**: as categorias sempre guardaram um nome de ícone (tipo `"utensils"`, `"car"`) mas nada usava isso. Criado `lib/icones-categorias.ts`, mapeando pro componente Lucide certo — aparece agora na lista de categorias em `/categorias` (bolinha colorida virou um badge com o ícone de verdade).
- **Gráfico de saldo acumulado**: novo card "Saldo acumulado" no dashboard, `components/charts/grafico-saldo-acumulado.tsx` (área/linha), mostrando a trajetória do saldo total nos últimos 6 meses — calculado de trás pra frente a partir do saldo atual, aplicando a variação (receita - despesa) de cada mês.

Pendente ainda desta lista de ideias (fica pro próximo passo):
- Comparação com a média dos últimos 3-6 meses (hoje só compara com o mês imediatamente anterior).
- Filtro de período customizado no Extrato (hoje é só por mês inteiro).
- Resumo anual.
- Confirmar deploy automático na Vercel (isso depende de você, não é algo que eu construo no código).

---

## 🚀 Rodada de melhorias — 14/07/2026 (parte 3)

- **Comparação com a média recente**: os cards de Receitas/Despesas do dashboard agora mostram dois selos — "vs mês passado" (já existia) e "vs média recente" (nova, calculada com os meses anteriores dentro da janela de 6 meses já buscada). `components/dashboard/selo-comparacao.tsx` ganhou um prop `rotulo` pra ficar reutilizável nos dois casos.
- **Filtro de período personalizado no Extrato**: além dos meses individuais e "Todos os meses", agora tem a opção "Período personalizado..." que abre dois campos de data (de/até). O agrupamento de parcelas passa a valer também nesse modo (mesma lógica de "Todos os meses").
- **Resumo anual** (`/relatorios`, nova rota): saldo/receitas/despesas do ano inteiro, com comparação vs o ano anterior; gráfico mês a mês (reaproveita o `GraficoEvolucaoMensal` já existente, que aceita qualquer quantidade de meses); categorias que mais pesaram no ano (barra de progresso por categoria); maior gasto do ano; médias mensais. Navegação entre anos com setinhas (`?ano=2025`, etc). Acessível pelo link "Ver resumo anual →" no card de evolução do dashboard (não entrou no menu principal, pra não lotar a barra do celular).

Com isso, as 9 ideias sugeridas estão todas feitas, exceto a nº 9 (confirmar deploy na Vercel), que depende só de você.

---

## 🎨 Paleta de categorias + novos gráficos — 14/07/2026

- **Paleta de categorias** (`lib/paleta-categorias.ts`): 18 cores distintas entre si (antes tinha cor repetida, tipo Alimentação e Mercado ambas vermelho, ou Salário/Freelance/Presente todas a mesma cor verde — ruim pro gráfico de pizza). Agora cada categoria padrão tem uma cor única, e categorias criadas manualmente também recebem automaticamente uma cor não repetida da paleta (antes todas nasciam com a mesma cor fixa do banco).
- **Selo de comparação** (`components/dashboard/selo-comparacao.tsx`): os cards de Receitas e Despesas do mês agora mostram "▲/▼ X% vs mês passado" — verde quando é bom (receita subiu, despesa desceu) e vermelho quando é ruim, cinza quando não há dado do mês anterior pra comparar.
- **Gráfico de evolução mensal** (`components/charts/grafico-evolucao-mensal.tsx`): barras agrupadas de receitas x despesas dos últimos 6 meses, novo card "Evolução (últimos 6 meses)" no dashboard.

---

## 🎨 Nova paleta + tema claro/escuro — 14/07/2026

Depois do feedback de que o verde não agradava, o tema mudou de vez:
- **Tema escuro (padrão)**: fundo azul-marinho profundo (`--bg: #0A1220`), acento azul-claro vivo (`--gold: #6FB3FF` — a variável manteve o nome antigo "gold" pra não precisar renomear centenas de classes Tailwind espalhadas pelo projeto, mas hoje é o azul de destaque; ver comentário em `globals.css`).
- **Tema claro (novo)**: fundo branco/cinza neutro (`--bg: #F6F8FB`, cards em `#FFFFFF`), acento azul mais saturado pra ter contraste (`#2F7CE8`).
- Receita/despesa continuam verde/vermelho em ambos os temas, só que mais vivos (`--sage: #34D399` / `--brick: #FB7185` no escuro; tons mais escuros equivalentes no claro pra manter contraste em fundo branco).
- Alternador de tema (`components/tema/alternador-tema.tsx`): ícone de sol/lua na sidebar (desktop) e em Configurações (mobile), salva a escolha em `localStorage`. Um script inline no `<head>` (`app/layout.tsx`) aplica o tema salvo antes da primeira renderização, pra não "piscar" o tema errado ao carregar a página.
- **Corrigido um bug real**: o texto do gráfico "Gastos por categoria" vazava pra fora do card em telas menores — faltava `min-w-0` nos containers flex (bug clássico de flexbox). Corrigido em `components/charts/grafico-categorias.tsx` e adicionado `min-w-0` no `Card` por padrão, pra não repetir esse tipo de bug em outro lugar.
- Ícones do PWA (`public/icons/`) regenerados com as cores novas.

> **Detalhe técnico**: alguns componentes usavam cor dourada em hexadecimal fixo (`#C9A227` etc.) em vez da variável CSS — isso foi corrigido pra usar `var(--gold)`, `var(--gold-light)` e a nova `var(--on-accent)` (cor do texto sobre elementos na cor de destaque, ajustada por tema), senão a troca de tema não ia funcionar nesses pontos.

O tema base (ledger: tinta verde + dourado) continua o mesmo, mas ganhou mais profundidade e riqueza visual, sem sair da identidade:
- Paleta ampliada: cores mais saturadas (`--gold`, `--sage`, `--brick` mais vivos), variantes "soft" (`--gold-soft`, `--sage-soft`, `--brick-soft`) pra badges/fundos suaves, e duas cores de apoio novas (`--plum`, `--copper`) pra dar mais variedade a categorias/gráficos no futuro.
- Fundo (`body`) ganhou uma vinheta radial sutil + textura de linhas finas, em vez de cor chapada.
- `Card` (`components/ui/card.tsx`): sombra em camadas, leve gradiente no topo, e uma variante `interativo` (usada nos cards de conta) com hover que levanta o card e realça a borda.
- `Button` (`components/ui/button.tsx`): botão primário com gradiente dourado + glow na sombra.
- Cards de resumo do Dashboard: ganharam ícone com badge circular colorido e uma barra de destaque na lateral (dourado/verde/terracota).
- Navegação lateral: logo com monograma "F" em gradiente, item ativo com barra dourada lateral + fundo suave.

Nada disso mudou a estrutura ou o comportamento de nenhuma tela — é só CSS/classes, então nenhuma lógica foi tocada.

---

## 📌 Como continuar esta conversa depois

Se esta conversa for encerrada, na próxima:
1. Envie o zip do projeto (`finance-ia.zip`) de volta pra mim.
2. Cole a frase: "Continue o projeto Finance IA. Leia docs/PROGRESSO.md e siga a partir do próximo passo."
3. Eu vou ler este arquivo e continuar exatamente da seção "Próximos passos" acima.
