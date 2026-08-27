"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useAcaoUnica } from "@/lib/hooks/use-acao-unica";
import { Trash2 } from "lucide-react";

export function BotaoExcluirConta() {
  const router = useRouter();
  const supabase = createClient();
  const [modalAberto, setModalAberto] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [email, setEmail] = useState("");
  const [emailDaConta, setEmailDaConta] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmailDaConta(data.user?.email ?? ""));
  }, [supabase]);

  async function excluir() {
    setErro(null);

    const resposta = await fetch("/api/conta/excluir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmacao, email: email.trim() }),
    });

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      setErro(dados.erro ?? "Não foi possível excluir a conta.");
      return;
    }

    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const { executar, executando } = useAcaoUnica(excluir);

  const podeExcluir =
    confirmacao === "EXCLUIR" &&
    email.trim().toLowerCase() === emailDaConta.toLowerCase() &&
    emailDaConta !== "";

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setModalAberto(true)}
        className="text-brick hover:bg-brick-soft"
      >
        <Trash2 size={16} />
        Excluir minha conta
      </Button>

      <Modal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        titulo="Excluir conta permanentemente"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-muted">
            Isso apaga <strong className="text-text">todos</strong> os seus dados — contas,
            categorias, lançamentos, metas e orçamentos — sem volta. Não tem como desfazer.
          </p>
          <p className="text-sm text-text-muted">
            Antes de continuar, vale exportar seu extrato em CSV pela tela de Extrato.
          </p>

          <Input
            label="Confirme o e-mail da conta"
            type="email"
            autoComplete="off"
            placeholder={emailDaConta || "voce@email.com"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label='Digite "EXCLUIR" para confirmar'
            autoComplete="off"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
          />

          {erro && (
            <p role="alert" className="text-sm text-brick">
              {erro}
            </p>
          )}

          <Button
            variant="danger"
            onClick={() => executar()}
            disabled={!podeExcluir || executando}
            className="w-full"
          >
            {executando ? "Excluindo..." : "Excluir minha conta pra sempre"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
