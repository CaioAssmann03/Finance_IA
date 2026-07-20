"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { traduzirErroAuth } from "@/lib/utils/erros-auth";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    setCarregando(false);

    if (error) {
      setErro(traduzirErroAuth(error.message));
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
            Finance IA
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
            Seu livro-caixa,
            <br />
            sem planilha.
          </h1>
        </div>

        <form onSubmit={entrar} className="flex flex-col gap-4">
          <Input
            id="email"
            type="email"
            label="E-mail"
            placeholder="voce@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="flex flex-col gap-1.5">
            <Input
              id="senha"
              type="password"
              label="Senha"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
            <a
              href="/esqueci-senha"
              className="self-end text-xs text-text-muted hover:text-gold"
            >
              Esqueci minha senha
            </a>
          </div>

          {erro && <p className="text-sm text-brick">{erro}</p>}

          <Button type="submit" disabled={carregando} className="mt-2 w-full">
            {carregando ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Ainda não tem conta?{" "}
          <a href="/cadastro" className="text-gold hover:underline">
            Criar conta
          </a>
        </p>
      </div>
    </main>
  );
}
