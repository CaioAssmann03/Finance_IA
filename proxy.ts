import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { urlDoSupabase, chaveAnonimaDoSupabase } from "@/lib/supabase/env";

/** Rotas que exigem sessão. Sem isso, a proteção existia só no layout —
 * qualquer rota nova fora dele nascia aberta por esquecimento. */
const ROTAS_PROTEGIDAS = [
  "/dashboard",
  "/transacoes",
  "/contas",
  "/categorias",
  "/metas",
  "/relatorios",
  "/assistente",
  "/configuracoes",
];

/** Rotas de entrada: quem já está logado não deveria ficar preso nelas. */
const ROTAS_DE_AUTENTICACAO = ["/login", "/cadastro", "/esqueci-senha"];

function ehRota(caminho: string, prefixos: string[]) {
  return prefixos.some((p) => caminho === p || caminho.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(urlDoSupabase(), chaveAnonimaDoSupabase(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() valida o token no servidor do Supabase (getSession() apenas lê o
  // cookie e aceitaria um cookie forjado) e, de quebra, renova a sessão.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const caminho = request.nextUrl.pathname;

  if (!user && ehRota(caminho, ROTAS_PROTEGIDAS)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    // Guarda para onde a pessoa queria ir — só o caminho interno, nunca uma
    // URL completa, para não virar redirect aberto para outro domínio.
    url.searchParams.set("proximo", caminho);
    return NextResponse.redirect(url);
  }

  if (user && ehRota(caminho, ROTAS_DE_AUTENTICACAO)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
