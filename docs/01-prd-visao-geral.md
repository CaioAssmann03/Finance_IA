# PRD — Finance IA (Documento de Requisitos do Produto)

## 1. Visão Geral

**Nome provisório:** Finance IA (pode trocar depois — sugestões alternativas: Pila, Grana, Meu Bolso, Bússola Financeira)

**Problema:** Controlar gastos em planilha é cansativo, exige disciplina manual, não sincroniza bem entre celular e computador, e não dá nenhum tipo de inteligência sobre os dados (insights, alertas, categorização automática).

**Solução:** Um app pessoal de controle financeiro, acessível pelo celular e pelo computador (mesma base de dados, sincronizada na nuvem), com lançamento rápido de despesas/receitas, categorização automática assistida por IA, dashboards visuais e um "assistente" que responde perguntas sobre os próprios gastos.

**Usuário:** Só você. Não precisa multiusuário, não precisa multi-tenant, não precisa de painel administrativo complexo. Isso simplifica MUITO o projeto — é importante manter esse escopo enxuto.

**Por que web + PWA (e não app nativo):**
- Um único código funciona no celular e no computador.
- Dá pra "instalar" no celular (ícone na tela, abre em tela cheia) sem passar pela burocracia de loja de app.
- Muito mais rápido de construir e manter sozinho, especialmente com ajuda de IA.
- Se um dia quiser um app nativo de verdade, o mesmo backend serve.

---

## 2. Objetivos do Produto

1. Substituir 100% o uso de planilha para controle financeiro pessoal.
2. Lançar uma transação em menos de 10 segundos.
3. Ter visão clara de: quanto entrou, quanto saiu, quanto sobrou, por categoria, por mês.
4. Saber prever o mês (contas fixas, parcelas, cartão de crédito).
5. Ter alertas antes de estourar orçamento ou esquecer uma conta.
6. Ter uma "camada de IA" que ajuda a entender os próprios hábitos, não só mostra números.

**Fora de escopo (v1):**
- Múltiplos usuários / família dividindo o mesmo app (pode virar v2).
- Conexão automática com banco (Open Finance) — é complexo, exige certificação, deixa para uma fase futura.
- App nativo (iOS/Android via loja).
- Investimentos (ações, renda fixa) — pode ser fase futura separada.

---

## 3. Personas

**Você.** Perfil: cansado de planilha, quer praticidade, usa celular no dia a dia e computador em casa/trabalho, quer entender pra onde o dinheiro vai sem esforço manual grande.

---

## 4. Funcionalidades — MVP (Fase 1)

### 4.1 Autenticação
- Login simples (e-mail + senha, ou login com Google) — só para proteger seus dados, não precisa ser robusto.

### 4.2 Contas / Carteiras
- Cadastro de contas: conta corrente, poupança, dinheiro em espécie, cartão de crédito.
- Cada conta tem um saldo (calculado a partir das transações).
- Cartão de crédito tem regra especial: dia de fechamento e dia de vencimento da fatura.

### 4.3 Categorias
- Categorias padrão pré-cadastradas (Alimentação, Transporte, Moradia, Lazer, Saúde, Educação, Assinaturas, Salário, Outros...).
- Poder criar/editar/excluir categorias e subcategorias.
- Ícone e cor por categoria (ajuda visual no dashboard).

### 4.4 Lançamento de Transações
- Criar despesa ou receita: valor, data, categoria, conta, descrição, forma de pagamento.
- **Lançamento rápido por texto livre com IA**: você digita algo como "50 mercado" ou "uber 23,50 ontem" e a IA interpreta valor, categoria provável e data, preenchendo o formulário sozinha — você só confirma.
- Transações recorrentes (aluguel, assinaturas, financiamentos): cadastra uma vez, o sistema lança automaticamente todo mês.
- Transações parceladas (ex: compra em 10x no cartão): cadastra uma vez, sistema gera as parcelas futuras.
- Editar e excluir transações.
- Anexar observação/nota a uma transação.

### 4.5 Cartão de Crédito
- Visualização da fatura atual (o que já entrou) e da próxima (o que ainda vai fechar).
- Fechamento automático de fatura na data configurada.

### 4.6 Orçamento (Budget)
- Definir um limite de gasto mensal por categoria (ex: R$600 em Alimentação).
- Barra de progresso mostrando quanto já foi gasto vs. limite.
- Alerta quando ultrapassar 80% e 100% do limite.

### 4.7 Dashboard / Visão Geral
- Saldo total (soma de todas as contas).
- Receitas x Despesas do mês.
- Gráfico de gastos por categoria (pizza ou barras).
- Evolução mensal (últimos 6-12 meses) — gráfico de linha.
- Top 5 maiores gastos do mês.
- Comparativo com o mês anterior (subiu ou desceu %).

### 4.8 Metas Financeiras
- Criar metas de economia (ex: "Juntar R$5.000 até dezembro").
- Acompanhar progresso.

### 4.9 Assistente IA (diferencial do produto)
- Categorização automática de novas transações (aprende com o seu histórico).
- Perguntas em linguagem natural, ex:
  - "Quanto gastei com comida esse mês?"
  - "Comparado ao mês passado, gastei mais ou menos?"
  - "Quais assinaturas eu tenho ativas?"
- Resumo mensal automático gerado por IA ("Este mês você gastou 12% a mais que o normal, puxado por Lazer").
- Alertas inteligentes: "Você tem 3 assinaturas que juntas somam R$89/mês, quer revisar?"

### 4.10 Busca e Filtros
- Filtrar transações por período, categoria, conta, valor.
- Busca por texto na descrição.

### 4.11 Exportação
- Exportar transações em CSV/Excel (pra quem quiser conferir fora do app, ou fazer backup).

---

## 5. Funcionalidades — Fase 2 (pós-MVP)

- Notificações push (contas a vencer, fatura próxima do fechamento).
- Modo offline com sincronização posterior.
- Anexar foto de comprovante/nota fiscal à transação, com IA lendo o valor (OCR).
- Planejamento de orçamento anual.
- Múltiplas moedas (se viajar).
- Relatório anual estilo "resumo do ano" (tipo Spotify Wrapped, mas financeiro).

---

## 6. Requisitos Não Funcionais

- **Privacidade:** dados são só seus. Nenhuma informação financeira deve ser exposta publicamente. Se usar IA de terceiros (ex: API da Anthropic/OpenAI) para categorização, enviar só o texto da transação (descrição/valor), nunca dados de login ou identificação bancária completa.
- **Backup:** dados armazenados em banco na nuvem com backup automático (ver documento de arquitetura).
- **Performance:** lançar uma transação deve responder em menos de 1 segundo.
- **Acessível:** funcionar bem em tela pequena (celular) e grande (desktop) — design responsivo.
- **Custo:** o objetivo é rodar com custo próximo de zero (uso pessoal, baixo volume de dados) — ver sugestões de stack gratuita no documento de arquitetura.

---

## 7. Telas Principais (para orientar o design)

1. **Login/Cadastro**
2. **Dashboard** (visão geral do mês)
3. **Lançar transação** (tela rápida, otimizada para poucos toques, com campo de texto livre + IA)
4. **Extrato** (lista de transações com filtros)
5. **Contas e Cartões** (lista de contas, saldo de cada uma, fatura do cartão)
6. **Categorias e Orçamentos** (gerenciar categorias e limites)
7. **Metas**
8. **Assistente IA** (chat para perguntar sobre seus gastos)
9. **Configurações** (perfil, exportar dados, categorias padrão)

---

## 8. Métricas de Sucesso (pessoais)

- Você para de abrir a planilha.
- Consegue lançar um gasto em menos de 10 segundos, direto do celular.
- Sabe responder "quanto tenho disponível até o fim do mês" a qualquer momento, sem calcular na mão.
