# Rodada de correções, segurança e parcelamentos — 27/08/2026

Documento de referência da rodada que corrigiu os dois problemas relatados no uso
real (parcelas que não davam para editar/apagar em série e lançamento duplicado
por clique duplo) e passou o pente-fino no resto do código.

---

## ⚠️ Antes de tudo: dois passos manuais

### 1. Rodar a migração `0003_integridade_e_seguranca.sql`

Painel do Supabase → **SQL Editor** → cole o conteúdo de
`supabase/migrations/0003_integridade_e_seguranca.sql` → **Run**.

Ela pode ser executada mais de uma vez sem quebrar. O que faz:

- **normaliza dados já gravados** (valores negativos, parcelas incoerentes,
  parcelas sem grupo, categorias com nome repetido);
- **apaga os lançamentos recorrentes duplicados** que o bug do dashboard vinha
  criando a cada visita;
- cria as **checagens de integridade** (valor, parcelas, dias de fechamento e
  vencimento do cartão);
- cria o **índice único que impede um recorrente ser lançado duas vezes no mesmo
  mês**;
- adiciona **índices** para extrato, fatura e agrupamento de parcelas;
- adiciona o **gatilho que confere se a conta e a categoria do lançamento são
  mesmo do usuário** — a RLS garantia que a linha era dele, não que os vínculos
  fossem;
- separa as políticas de RLS por operação (select/insert/update/delete) e as
  restringe ao papel `authenticated`.

### 2. Corrigir a variável `NEXT_PUBLIC_SUPABASE_URL`

No `.env.local`, essa variável está com uma **chave** (`sb_publishable_...`) no
lugar da **URL do projeto**. Com isso o app não sobe localmente — `next build`
falha com `Invalid supabaseUrl`.

O valor certo está no painel do Supabase em **Project Settings → API → Project
URL** e tem o formato `https://xxxxxxxxxxxxxxxx.supabase.co`.

Se a versão publicada (Vercel) está funcionando, a variável lá já está certa —
o problema é só no arquivo local.

---

## Parcelamentos: editar e excluir a série

**O que acontecia.** A tela agrupava parcelas só quando o filtro estava em "todos
os meses". Como o filtro abre no mês atual, o agrupamento — e a única ação de
"excluir todas as parcelas" que existia — ficava invisível. Apagar a parcela 1/12
apagava exatamente uma linha, e não havia como mover o parcelamento inteiro para
outra conta.

**O que passou a existir.** Toda parcela agora carrega um selo `3/12` na lista, e
tanto o lápis quanto a lixeira abrem um seletor de escopo:

| Escopo | O que atinge |
|---|---|
| Só esta parcela | apenas a linha selecionada |
| Esta e as próximas | a partir da parcela escolhida, para frente |
| Todas as parcelas | o parcelamento inteiro, incluindo o que já passou |

O modal mostra **quantos lançamentos cada escopo atinge** antes de confirmar. O
escopo inicial acompanha o gesto: a lixeira de uma linha começa em "só esta", o
link dentro do grupo começa em "todas".

Detalhes que valem saber:

- As operações em lote filtram **direto no banco** por `grupo_parcela_id`, então
  funcionam mesmo com parcelas que não estão carregadas na tela.
- Valor, tipo, conta e categoria valem para todo o escopo. A **data muda só na
  parcela selecionada** — as outras seguem no mês delas.
- A descrição é regravada com o `(n/total)` correto em cada parcela.
- Para consertar o caso relatado (parcelas na conta errada, com a 1/12 já
  apagada): abrir qualquer parcela restante no lápis → "Todas as parcelas" →
  trocar a conta → salvar.

---

## Lançamento duplicado

**Causa raiz.** `disabled={salvando}` só desabilita o botão depois que o React
re-renderiza. Dois cliques em poucos milissegundos entravam os dois antes disso,
e cada um fazia seu próprio `insert`.

**Correção.** O hook `lib/hooks/use-acao-unica.ts` usa uma trava em `useRef`, que
muda de valor no mesmo instante do primeiro clique. Aplicado em **todos** os
formulários: novo lançamento, contas, categorias (inclusive "usar categorias
padrão"), metas, aporte em meta, contas fixas, importação de extrato, login,
cadastro, recuperação e redefinição de senha, exclusão de conta.

Casos que essa trava sozinha não cobria e também foram fechados:

- **Aviso de duplicata** no formulário de lançamento: se já existir um lançamento
  com a mesma conta, categoria, valor, tipo e data, o primeiro clique só avisa; o
  segundo confirma. Pega o F5 no meio do envio e o "voltar e salvar de novo".
- **Aporte em meta** relê o valor atual antes de somar, para não sobrescrever um
  aporte feito em outra aba.
- **Importação de extrato**: sem a trava, um duplo clique importava o arquivo
  inteiro duas vezes.

---

## Bugs corrigidos

| # | Onde | Problema |
|---|---|---|
| 1 | `lib/recorrentes/gerar-lancamentos-do-mes.ts` | A checagem de "já lancei este mês?" usava `.maybeSingle()`, que **retorna erro** quando encontra mais de uma linha. O erro era lido como "não achei" e o dashboard criava mais uma cópia **a cada visita**, em bola de neve. Agora é uma consulta só, em lote, com índice único no banco como rede de segurança. |
| 2 | `lib/utils/formatters.ts` | `new Date("2026-08-27")` é meia-noite **em UTC** — no Brasil, 21h do dia 26. Toda data na tela aparecia um dia atrasada. |
| 3 | Vários (`hoje`, `mes-referencia`, `fatura`, `dashboard`) | `new Date().toISOString()` depois das 21h já devolve o dia seguinte: o formulário abria com a data de amanhã. Centralizado em `lib/utils/datas.ts`, que trabalha sempre no calendário local. |
| 4 | Parcelamento | `setMonth` transborda: 31/01 + 1 mês vira 03/03, e a parcela **pulava fevereiro**. `adicionarMeses` agora trava no último dia do mês curto. |
| 5 | `app/(app)/dashboard/page.tsx` | "Saldo total" somava só as transações **do mês selecionado**, então o saldo mudava conforme se navegava entre os meses. Agora considera todo o histórico até o fim do mês exibido. |
| 6 | `components/forms/contas-cliente.tsx` | O aviso ao excluir dizia que "as transações continuam existindo" — mas o `on delete cascade` apaga todas junto. Texto corrigido para o que de fato acontece. |
| 7 | `app/(app)/contas/[id]/page.tsx` | Um id fora do formato UUID virava erro 500 em vez de "não encontrado". |
| 8 | Parse de valores | `Number("1.234,56".replace(",", "."))` devolvia `NaN`, que ia para o banco. Centralizado em `lib/utils/valores.ts`, com validação e arredondamento em 2 casas. |
| 9 | Formulários em geral | Erros do banco viravam sempre "não foi possível salvar". Agora `lib/utils/erros-banco.ts` traduz os casos acionáveis (sessão expirada, valor grande demais, registro duplicado, vínculo inexistente). |
| 10 | `components/ui/modal.tsx` | Não fechava no Esc nem no clique fora, não travava a rolagem do fundo e deixava o Tab escapar para a página atrás. |

---

## Segurança

| Área | O que mudou |
|---|---|
| **Proteção de rotas** | Estava só no `layout.tsx` do grupo `(app)` — qualquer rota criada fora dele nasceria aberta. Agora o `proxy.ts` (middleware) bloqueia por lista de caminhos e devolve quem já está logado para o dashboard. O parâmetro `proximo` só aceita caminho interno, para não virar redirect aberto. |
| **Cabeçalhos HTTP** | Adicionados no `next.config.ts`: CSP (`default-src 'self'`, `connect-src` só para o Supabase, `frame-ancestors 'none'`), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS. `poweredByHeader` desligado. `/api/*` responde `no-store`. |
| **Custo das rotas de IA** | Qualquer sessão válida podia disparar chamadas em série à API da Anthropic e gerar fatura. Agora há limite por usuário (10/min e 60/h em `perguntar`; 15/min e 100/h em `categorizar`) e teto de caracteres na entrada. |
| **Vazamento em mensagens de erro** | As rotas de IA devolviam ao navegador o erro cru da Anthropic, que pode conter trechos do prompt. Agora o detalhe fica só no log do servidor. |
| **Resposta da IA** | O JSON do modelo entrava direto no app. Agora é conferido contra as categorias reais do usuário e os formatos esperados antes de virar sugestão. |
| **Exclusão de conta** | `POST /api/conta/excluir` apagava tudo sem corpo nenhum. Agora exige a palavra `EXCLUIR` **e** o e-mail da própria sessão, confere a origem da requisição e tem limite de tentativas. |
| **Vínculos entre tabelas** | Gatilho no banco confere se `conta_id` e `categoria_id` pertencem ao mesmo usuário do lançamento. |
| **Confirmação por e-mail** | `app/auth/confirm/route.ts` repassava qualquer `type` da URL para o Supabase. Agora só os seis tipos esperados. |
| **Redefinição de senha** | A tela abria mesmo sem a sessão que o link de recuperação cria. Agora avisa que o link expirou em vez de mostrar um formulário que não funciona. Senha mínima subiu de 6 para 8 caracteres no cadastro e na redefinição. |
| **Prompt injection** | Os prompts do assistente agora instruem explicitamente a ignorar instruções embutidas no texto do usuário, e o assistente se recusa a dar recomendação de investimento. |

---

## Pontos que ficaram em aberto

1. **`app/api/ia/categorizar/route.ts` não é usada por nenhuma tela** — sobrou do
   "Retirando auxilio de IA". Foi endurecida junto com a outra, mas é superfície
   de custo à toa: se não houver plano de voltar com o lançamento por texto,
   vale apagar a rota.
2. **O limitador de requisições é em memória** — vale por instância do servidor.
   Para um app de uso pessoal resolve; se um dia virar multiusuário de verdade,
   trocar por Redis/Upstash mantendo a mesma assinatura de `verificarLimite`.
3. **A CSP usa `script-src 'unsafe-inline'`** por causa do script de tema injetado
   no `<head>`. Para fechar isso seria preciso mover a preferência de tema para um
   cookie lido no servidor e passar a usar nonce.
4. **O extrato carrega até 2.000 lançamentos** (era 500). Passando disso, vale
   paginar de verdade em vez de aumentar o número.
