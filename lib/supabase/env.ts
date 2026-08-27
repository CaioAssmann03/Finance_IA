/**
 * Lê e confere as variáveis de ambiente do Supabase.
 *
 * Existe por causa de um erro fácil de cometer e difícil de diagnosticar:
 * colar a chave publishable (`sb_publishable_...`) no campo da URL. O erro que
 * o supabase-js devolve nesse caso é "Invalid supabaseUrl", sem dizer qual
 * variável está errada nem onde arrumar.
 */

function exigir(nome: string, valor: string | undefined): string {
  if (!valor || !valor.trim()) {
    throw new Error(
      `${nome} não está definida. Copie o .env.example para .env.local e preencha com os dados do seu projeto no Supabase (Project Settings > API).`
    );
  }
  return valor.trim();
}

export function urlDoSupabase(): string {
  const valor = exigir("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);

  if (!/^https?:\/\//i.test(valor)) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL precisa ser a URL do projeto (algo como https://xxxxxxxx.supabase.co), mas está com "${valor.slice(0, 12)}...". ` +
        "Parece que foi colada uma chave no lugar da URL — a URL fica em Project Settings > API > Project URL."
    );
  }

  return valor.replace(/\/+$/, "");
}

export function chaveAnonimaDoSupabase(): string {
  return exigir("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
