"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAcaoUnica } from "@/lib/hooks/use-acao-unica";

const MINIMO_SENHA = 8;

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const supabase = createClient();
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [temSessao, setTemSessao] = useState<boolean | null>(null);

  // A tela só faz sentido com a sessão que o link do e-mail cria. Sem ela,
  // qualquer visita direta caía num formulário que não ia funcionar.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setTemSessao(Boolean(data.user)));
  }, [supabase]);

  async function salvar() {
    setErro(null);

    if (senha.length < MINIMO_SENHA)
      return setErro(`A senha precisa ter pelo menos ${MINIMO_SENHA} caracteres.`);
    if (senha !== confirmarSenha) return setErro("As senhas não são iguais.");

    const { error } = await supabase.auth.updateUser({ password: senha });

    if (error) {
      setErro(
        "Não foi possível redefinir a senha. O link pode ter expirado — peça um novo em \"Esqueci minha senha\"."
      );
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  const { executar, executando: carregando } = useAcaoUnica(salvar);

  if (temSessao === false) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 text-center">
        <div className="max-w-sm">
          <h1 className="font-[family-name:var(--font-display)] text-2xl">
            Link inválido ou expirado
          </h1>
          <p className="mt-3 text-sm text-text-muted">
            Abra esta página pelo link mais recente que enviamos por e-mail. Se ele já
            expirou, peça um novo em &quot;Esqueci minha senha&quot;.
          </p>
          <Button className="mt-6" onClick={() => router.push("/esqueci-senha")}>
            Pedir novo link
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
            Nova senha
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
            id="senha"
            type="password"
            autoComplete="new-password"
            label="Nova senha"
            placeholder={`mínimo ${MINIMO_SENHA} caracteres`}
            minLength={MINIMO_SENHA}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
          <Input
            id="confirmar-senha"
            type="password"
            autoComplete="new-password"
            label="Confirmar nova senha"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            required
          />

          {erro && (
            <p role="alert" className="text-sm text-brick">
              {erro}
            </p>
          )}

          <Button type="submit" disabled={carregando} className="mt-2 w-full">
            {carregando ? "Salvando..." : "Salvar nova senha"}
          </Button>
        </form>
      </div>
    </main>
  );
}
