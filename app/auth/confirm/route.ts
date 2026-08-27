import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Só estes tipos são esperados nos links que o app manda por e-mail. Sem a
 * lista, qualquer string da URL era repassada como `type` para o Supabase. */
const TIPOS_ACEITOS: EmailOtpType[] = [
  "signup",
  "recovery",
  "invite",
  "magiclink",
  "email_change",
  "email",
];

/**
 * Rota chamada pelo link enviado por e-mail (confirmação de cadastro,
 * recuperação de senha, etc.). O Supabase manda o usuário pra cá com um
 * token_hash e um type; aqui a gente troca isso por uma sessão de verdade
 * e redireciona pro lugar certo dentro do app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const tipoBruto = searchParams.get("type");
  const type = TIPOS_ACEITOS.find((t) => t === tipoBruto);

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      const destino = type === "recovery" ? "/redefinir-senha" : "/dashboard";
      return NextResponse.redirect(new URL(destino, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?erro=link-invalido", origin));
}
