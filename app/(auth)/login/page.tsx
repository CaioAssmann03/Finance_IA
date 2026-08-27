"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAcaoUnica } from "@/lib/hooks/use-acao-unica";
import { traduzirErroAuth } from "@/lib/utils/erros-auth";

/** Só aceita caminho interno como destino pós-login. Um "proximo" que aponte
 * para outro domínio (ou para "//site.com") viraria um redirect aberto. */
function destinoSeguro(proximo: string | null): string {
  if (!proximo || !proximo.startsWith("/") || proximo.startsWith("//")) return "/dashboard";
  return proximo;
}

function FormularioLogin() {
  const router = useRouter();
  const parametros = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(
    parametros.get("erro") === "link-invalido"
      ? "Esse link expirou ou já foi usado. Peça um novo."
      : null
  );

  async function entrar() {
    setErro(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setErro(traduzirErroAuth(error.message));
      return;
    }

    router.push(destinoSeguro(parametros.get("proximo")));
    router.refresh();
  }

  const { executar, executando: carregando } = useAcaoUnica(entrar);

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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            executar();
          }}
          className="flex flex-col gap-4"
        >
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

          {erro && (
            <p role="alert" className="text-sm text-brick">
              {erro}
            </p>
          )}

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

/** useSearchParams precisa de um limite de Suspense na renderização estática. */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <FormularioLogin />
    </Suspense>
  );
}
