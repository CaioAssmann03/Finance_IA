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
  "/configuracoes",
];

/** Rotas de entrada: quem já está logado não deveria ficar preso nelas. */
const ROTAS_DE_AUTENTICACAO = ["/login", "/cadastro", "/esqueci-senha"];

function ehRota(caminho: string, prefixos: string[]) {
  return prefixos.some((p) => caminho === p || caminho.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const caminho = request.nextUrl.pathname;
  const rotaProtegida = ehRota(caminho, ROTAS_PROTEGIDAS);
  const rotaDeAutenticacao = ehRota(caminho, ROTAS_DE_AUTENTICACAO);

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

  // `getClaims()` valida a assinatura do token localmente (busca e guarda o
  // JWKS do projeto), em vez de perguntar ao servidor de auth a cada navegação
  // como o `getUser()` fazia. Continua sendo verificação de verdade — um cookie
  // forjado não passa —, e de quebra renova a sessão quando precisa.
  //
  // Se o projeto ainda usa o JWT secret simétrico antigo, a biblioteca cai
  // sozinha no caminho de rede, com o mesmo custo de antes. Migrar para signing
  // keys assimétricas (painel do Supabase > Auth > Signing Keys) é o que faz
  // esta linha deixar de custar uma ida à rede por requisição.
  const { data: claims } = await supabase.auth.getClaims();
  const autenticado = Boolean(claims?.claims?.sub);

  if (!autenticado && rotaProtegida) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    // Guarda para onde a pessoa queria ir — só o caminho interno, nunca uma
    // URL completa, para não virar redirect aberto para outro domínio.
    url.searchParams.set("proximo", caminho);
    return NextResponse.redirect(url);
  }

  if (autenticado && rotaDeAutenticacao) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Fica fora do middleware tudo o que não depende de sessão: estáticos do
    // Next, ícones, service worker, manifesto e imagens. Toda rota que entra
    // aqui paga o custo da verificação, então a lista existe para manter esse
    // custo só onde ele serve para alguma coisa.
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|webp|ico|txt)$).*)",
  ],
};
