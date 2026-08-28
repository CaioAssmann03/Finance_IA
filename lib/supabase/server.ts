import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { urlDoSupabase, chaveAnonimaDoSupabase } from "@/lib/supabase/env";

/**
 * Client do Supabase para o servidor.
 *
 * Embrulhado em `cache()` do React: numa mesma requisição, o layout, a página e
 * qualquer helper que chamem `createClient()` recebem a MESMA instância em vez
 * de montar uma nova cada um. Sem isso, cada chamada abria seu próprio cliente
 * e refazia o trabalho de sessão do zero.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(urlDoSupabase(), chaveAnonimaDoSupabase(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // chamado a partir de um Server Component sem permissão de escrita — ok ignorar,
          // o middleware cuida de renovar a sessão.
        }
      },
    },
  });
});

/**
 * Usuário da sessão atual, ou `null`.
 *
 * `getUser()` bate no servidor de auth do Supabase a cada chamada. Abrir o
 * dashboard fazia isso três vezes na mesma requisição — middleware, layout e
 * página —, somando três idas à rede antes de qualquer dado aparecer. Com o
 * `cache()`, a primeira chamada da requisição resolve e as outras reaproveitam.
 */
export const usuarioAtual = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
