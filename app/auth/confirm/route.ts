import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Rota chamada pelo link enviado por e-mail (confirmação de cadastro,
 * recuperação de senha, etc.). O Supabase manda o usuário pra cá com um
 * token_hash e um type; aqui a gente troca isso por uma sessão de verdade
 * e redireciona pro lugar certo dentro do app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      const destino = type === "recovery" ? "/redefinir-senha" : "/dashboard";
      return NextResponse.redirect(`${origin}${destino}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?erro=link-invalido`
  );
}
