"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";

export function BotaoExcluirConta() {
  const router = useRouter();
  const supabase = createClient();
  const [modalAberto, setModalAberto] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function excluir() {
    setErro(null);
    setExcluindo(true);

    const resposta = await fetch("/api/conta/excluir", { method: "POST" });
    const dados = await resposta.json();

    if (!resposta.ok) {
      setExcluindo(false);
      setErro(dados.erro ?? "Não foi possível excluir a conta.");
      return;
    }

    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

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
            Isso apaga <strong className="text-text">todos</strong> os seus
            dados — contas, categorias, lançamentos, metas e orçamentos — sem
            volta. Não tem como desfazer.
          </p>

          <Input
            label='Digite "EXCLUIR" para confirmar'
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
          />

          {erro && <p className="text-sm text-brick">{erro}</p>}

          <Button
            variant="danger"
            onClick={excluir}
            disabled={confirmacao !== "EXCLUIR" || excluindo}
            className="w-full"
          >
            {excluindo ? "Excluindo..." : "Excluir minha conta pra sempre"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
