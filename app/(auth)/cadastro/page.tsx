"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CadastroPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signUp({ email, password: senha });

    setCarregando(false);

    if (error) {
      setErro(error.message);
      return;
    }

    setSucesso(true);
  }

  if (sucesso) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 text-center">
        <div className="max-w-sm">
          <h1 className="font-[family-name:var(--font-display)] text-2xl">
            Confirme seu e-mail
          </h1>
          <p className="mt-3 text-sm text-text-muted">
            Enviamos um link de confirmação para {email}. Depois de confirmar,
            volte aqui e entre normalmente.
          </p>
          <Button className="mt-6" onClick={() => router.push("/login")}>
            Ir para o login
          </Button>
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
            Criar sua conta
          </h1>
        </div>

        <form onSubmit={cadastrar} className="flex flex-col gap-4">
          <Input
            id="email"
            type="email"
            label="E-mail"
            placeholder="voce@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            id="senha"
            type="password"
            label="Senha"
            placeholder="mínimo 6 caracteres"
            minLength={6}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />

          {erro && <p className="text-sm text-brick">{erro}</p>}

          <Button type="submit" disabled={carregando} className="mt-2 w-full">
            {carregando ? "Criando..." : "Criar conta"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Já tem conta?{" "}
          <a href="/login" className="text-gold hover:underline">
            Entrar
          </a>
        </p>
      </div>
    </main>
  );
}
