/** Traduz as mensagens de erro mais comuns do Supabase Auth pra um texto
 * amigável em português. Se não reconhecer a mensagem, devolve um texto
 * genérico em vez de expor o erro técnico em inglês pro usuário. */
export function traduzirErroAuth(mensagem: string | undefined | null): string {
  const m = (mensagem ?? "").toLowerCase();

  if (m.includes("email rate limit exceeded") || m.includes("rate limit"))
    return "Muitas tentativas em pouco tempo. Espere cerca de 1 hora e tente de novo.";
  if (m.includes("invalid login credentials"))
    return "E-mail ou senha incorretos.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Esse e-mail já tem uma conta. Tente entrar, ou use \"Esqueci minha senha\".";
  if (m.includes("email not confirmed"))
    return "Confirme seu e-mail antes de entrar — verifique sua caixa de entrada.";
  if (m.includes("password should be at least"))
    return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("unable to validate email address") || m.includes("invalid email"))
    return "Esse e-mail não parece válido.";
  if (m.includes("network"))
    return "Não foi possível conectar. Confira sua internet e tente de novo.";

  return "Não foi possível concluir. Tente novamente em instantes.";
}
