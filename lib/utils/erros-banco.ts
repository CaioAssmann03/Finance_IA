/**
 * Traduz os erros do Postgres/PostgREST que o usuário pode realmente causar
 * em uma frase que ele consegue agir. Qualquer outra coisa vira uma mensagem
 * genérica — mensagem técnica de banco na tela não ajuda ninguém e ainda
 * expõe detalhes do schema.
 */
export function mensagemDeErroBanco(mensagem: string | undefined | null): string {
  const m = (mensagem ?? "").toLowerCase();

  if (m.includes("row-level security") || m.includes("jwt") || m.includes("token"))
    return "Sua sessão expirou. Entre de novo para continuar.";
  if (m.includes("numeric field overflow"))
    return "Esse valor é alto demais para ser registrado.";
  if (m.includes("duplicate key") || m.includes("unique constraint"))
    return "Esse registro já existe.";
  if (m.includes("violates foreign key"))
    return "A conta ou a categoria escolhida não existe mais. Recarregue a página.";
  if (m.includes("violates check constraint"))
    return "Algum campo está fora do intervalo permitido. Confira valor, data e parcelas.";
  if (m.includes("not-null") || m.includes("null value"))
    return "Faltou preencher um campo obrigatório.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "Não foi possível conectar. Confira sua internet e tente de novo.";

  return "Não foi possível salvar. Tente novamente.";
}
