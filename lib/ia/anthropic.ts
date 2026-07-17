interface ChamarClaudeOpcoes {
  system: string;
  prompt: string;
  maxTokens?: number;
}

/**
 * Chama a API da Anthropic (Claude) e retorna o texto da resposta.
 * Usa Claude Haiku por padrão: rápido e barato, suficiente para categorizar
 * texto curto e responder perguntas simples sobre os dados do usuário.
 */
export async function chamarClaude({
  system,
  prompt,
  maxTokens = 500,
}: ChamarClaudeOpcoes): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY não configurada. Adicione a chave no .env.local — veja .env.example."
    );
  }

  const resposta = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text();
    throw new Error(`Erro na API da Anthropic (${resposta.status}): ${detalhe}`);
  }

  const dados = await resposta.json();
  const bloco = dados.content?.find((b: { type: string }) => b.type === "text");
  return bloco?.text ?? "";
}

/** Remove blocos de código markdown (```json ... ```) que o modelo às vezes adiciona. */
export function limparJson(texto: string): string {
  return texto.replace(/```json|```/g, "").trim();
}
