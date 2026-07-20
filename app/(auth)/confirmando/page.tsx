"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Pra onde o link do e-mail (confirmação de cadastro ou recuperação de senha)
 * manda o usuário. O Supabase, no plano gratuito sem SMTP próprio, não deixa
 * editar o conteúdo do e-mail — mas deixa a gente escolher o destino final
 * (emailRedirectTo/redirectTo no código), que é o que essa página recebe.
 *
 * O próprio carregamento do cliente Supabase no navegador já lê o token que
 * vem colado na URL (depois do #) e transforma isso numa sessão de verdade.
 */
export default function ConfirmandoPage() {
  const router = useRouter();
  const [erro, setErro] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const ehRecuperacaoSenha = window.location.hash.includes("type=recovery");

    const { data: assinatura } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_IN" || evento === "PASSWORD_RECOVERY") {
        router.push(ehRecuperacaoSenha ? "/redefinir-senha" : "/dashboard");
      }
    });

    // Se depois de alguns segundos nada aconteceu, o link provavelmente
    // expirou ou já foi usado.
    const tempoLimite = setTimeout(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.push(ehRecuperacaoSenha ? "/redefinir-senha" : "/dashboard");
      } else {
        setErro(true);
      }
    }, 4000);

    return () => {
      assinatura.subscription.unsubscribe();
      clearTimeout(tempoLimite);
    };
  }, [router]);

  if (erro) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 text-center">
        <div className="max-w-sm">
          <h1 className="font-[family-name:var(--font-display)] text-2xl">
            Link expirado
          </h1>
          <p className="mt-3 text-sm text-text-muted">
            Esse link não é mais válido — pode já ter sido usado, ou passou do
            tempo. Peça um novo.
          </p>
          <div className="mt-6 flex justify-center gap-4 text-sm">
            <a href="/login" className="text-gold hover:underline">
              Ir para o login
            </a>
            <a href="/esqueci-senha" className="text-gold hover:underline">
              Esqueci minha senha
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 text-center">
      <p className="text-sm text-text-muted">Confirmando...</p>
    </main>
  );
}
