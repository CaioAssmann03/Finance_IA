"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const supabase = createClient();
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmarSenha) {
      setErro("As senhas não são iguais.");
      return;
    }

    setCarregando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setCarregando(false);

    if (error) {
      setErro(
        "Não foi possível redefinir a senha. O link pode ter expirado — peça um novo em \"Esqueci minha senha\"."
      );
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
            Finance IA
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
            Nova senha
          </h1>
        </div>

        <form onSubmit={salvar} className="flex flex-col gap-4">
          <Input
            id="senha"
            type="password"
            label="Nova senha"
            placeholder="mínimo 6 caracteres"
            minLength={6}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
          <Input
            id="confirmar-senha"
            type="password"
            label="Confirmar nova senha"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            required
          />

          {erro && <p className="text-sm text-brick">{erro}</p>}

          <Button type="submit" disabled={carregando} className="mt-2 w-full">
            {carregando ? "Salvando..." : "Salvar nova senha"}
          </Button>
        </form>
      </div>
    </main>
  );
}
