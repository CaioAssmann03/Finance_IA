import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { urlDoSupabase, chaveAnonimaDoSupabase } from "@/lib/supabase/env";

export async function createClient() {
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
}
