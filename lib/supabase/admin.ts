import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { urlDoSupabase } from "@/lib/supabase/env";

/**
 * Cliente com a service role key — tem privilégios de administrador
 * (consegue apagar usuários, ignora RLS). NUNCA importar isso em código que
 * roda no navegador; só em rotas de API (app/api/**\/route.ts), que rodam
 * exclusivamente no servidor.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada. Adicione no .env.local — veja .env.example."
    );
  }

  return createSupabaseClient(urlDoSupabase(), serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
