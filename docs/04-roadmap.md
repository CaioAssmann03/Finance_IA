# Roadmap — Finance IA

## Fase 0 — Fundação (1 dia de trabalho com IA)
- Projeto Next.js criado, conectado ao Supabase.
- Login/cadastro funcionando.
- Tabelas do banco criadas (ver `03-modelo-de-dados.md`).

## Fase 1 — MVP funcional (o que já resolve seu problema)
- Cadastro de contas.
- Cadastro/edição de categorias (com as padrão já vindo prontas).
- Lançar transação manualmente (sem IA ainda).
- Extrato com filtros básicos (mês, categoria, conta).
- Dashboard com saldo total, receitas x despesas do mês, gráfico por categoria.

> **Marco importante:** ao final da Fase 1, você já consegue abandonar a planilha, mesmo lançando tudo manualmente.

## Fase 2 — Praticidade (o que te faz preferir o app à planilha)
- Lançamento rápido por texto livre com IA (categorização automática).
- Transações recorrentes.
- Transações parceladas.
- Regras de cartão de crédito (fechamento/vencimento, fatura atual).
- Orçamento por categoria com alerta visual.

## Fase 3 — Inteligência (o diferencial "IA")
- Assistente/chat para perguntas sobre seus gastos.
- Resumo mensal automático gerado por IA.
- Alertas inteligentes (assinaturas esquecidas, gasto fora do padrão).

## Fase 4 — Polimento
- PWA instalável no celular (ícone, tela cheia).
- Exportação CSV.
- Metas financeiras.
- Comparativo mês a mês e relatório anual.

## Fase 5 — Extras (só se fizer sentido no futuro)
- Notificações push de contas a vencer.
- OCR de nota fiscal (fotografar o cupom e a IA lança sozinha).
- Modo offline.
- Open Finance (conexão automática com o banco) — mais complexo, avaliar depois.

---

## Como usar este roadmap com o Claude Code

Recomendo abrir uma conversa por fase (ou até por item dentro da fase), colando o trecho relevante deste roadmap + o `01-prd-visao-geral.md`, `02-arquitetura-tecnica.md` e `03-modelo-de-dados.md` como contexto. Isso evita que a IA tente construir tudo de uma vez e perca qualidade.
