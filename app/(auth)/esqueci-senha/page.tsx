"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { traduzirErroAuth } from "@/lib/utils/erros-auth";

export default function EsqueciSenhaPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/confirmando`,
    });

    setCarregando(false);

    if (error) {
      setErro(traduzirErroAuth(error.message));
      return;
    }

    setEnviado(true);
  }

  if (enviado) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 text-center">
        <div className="max-w-sm">
          <h1 className="font-[family-name:var(--font-display)] text-2xl">
            Confira seu e-mail
          </h1>
          <p className="mt-3 text-sm text-text-muted">
            Se {email} estiver cadastrado, enviamos um link pra redefinir a
            senha. Ele expira em algumas horas.
          </p>
          <a href="/login" className="mt-6 inline-block text-sm text-gold hover:underline">
            Voltar para o login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
            Finance IA
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
            Esqueci minha senha
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Informe seu e-mail e enviamos um link pra você criar uma senha nova.
          </p>
        </div>

        <form onSubmit={enviar} className="flex flex-col gap-4">
          <Input
            id="email"
            type="email"
            label="E-mail"
            placeholder="voce@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {erro && <p className="text-sm text-brick">{erro}</p>}

          <Button type="submit" disabled={carregando} className="mt-2 w-full">
            {carregando ? "Enviando..." : "Enviar link de recuperação"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Lembrou a senha?{" "}
          <a href="/login" className="text-gold hover:underline">
            Entrar
          </a>
        </p>
      </div>
    </main>
  );
}
