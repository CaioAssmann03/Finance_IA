import { createBrowserClient } from "@supabase/ssr";
import { urlDoSupabase, chaveAnonimaDoSupabase } from "@/lib/supabase/env";

export function createClient() {
  return createBrowserClient(urlDoSupabase(), chaveAnonimaDoSupabase());
}
