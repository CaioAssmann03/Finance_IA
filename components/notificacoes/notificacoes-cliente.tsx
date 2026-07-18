"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, BellOff, BellRing } from "lucide-react";

const CHAVE_ULTIMA_VERIFICACAO = "financeia:ultima-verificacao-alertas";

export function NotificacoesCliente() {
  const [permissao, setPermissao] = useState<NotificationPermission | "indisponivel">(
    "default"
  );
  const [testando, setTestando] = useState(false);

  useEffect(() => {
    if (typeof Notification === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Notification só existe no navegador, não dá pra saber isso durante o render no servidor.
      setPermissao("indisponivel");
      return;
    }
    setPermissao(Notification.permission);
  }, []);

  async function ativar() {
    if (typeof Notification === "undefined") return;
    const resultado = await Notification.requestPermission();
    setPermissao(resultado);

    if (resultado === "granted") {
      new Notification("Finance IA", {
        body: "Notificações ativadas! Vamos te avisar sobre contas a vencer e orçamento estourado.",
        icon: "/icons/icon-192.png",
      });
      localStorage.setItem(CHAVE_ULTIMA_VERIFICACAO, new Date().toDateString());
    }
  }

  async function testarAgora() {
    setTestando(true);
    try {
      const resposta = await fetch("/api/alertas");
      const dados = await resposta.json();
      const alertas = dados.alertas ?? [];

      if (alertas.length === 0) {
        new Notification("Finance IA", {
          body: "Nenhum alerta no momento — tudo em dia! ✅",
          icon: "/icons/icon-192.png",
        });
      } else {
        for (const a of alertas.slice(0, 3)) {
          new Notification(`Finance IA — ${a.titulo}`, {
            body: a.descricao,
            icon: "/icons/icon-192.png",
          });
        }
      }
    } finally {
      setTestando(false);
    }
  }

  return (
    <Card className="max-w-lg">
      <div className="flex items-start gap-3">
        {permissao === "granted" ? (
          <BellRing size={20} className="mt-0.5 shrink-0 text-gold" />
        ) : (
          <BellOff size={20} className="mt-0.5 shrink-0 text-text-muted" />
        )}
        <div className="flex-1">
          <p className="font-medium">Notificações do navegador</p>
          <p className="mt-1 text-sm text-text-muted">
            Avisa sobre contas fixas vencendo nos próximos 3 dias e categorias
            com orçamento estourado, enquanto o Finance IA estiver aberto no
            navegador (não é notificação push em segundo plano).
          </p>

          {permissao === "indisponivel" && (
            <p className="mt-3 text-sm text-text-muted">
              Seu navegador não suporta notificações.
            </p>
          )}

          {permissao === "denied" && (
            <p className="mt-3 text-sm text-brick">
              Notificações bloqueadas. Ative manualmente nas permissões do
              site, nas configurações do navegador.
            </p>
          )}

          {permissao === "default" && (
            <Button className="mt-3" onClick={ativar}>
              <Bell size={16} />
              Ativar notificações
            </Button>
          )}

          {permissao === "granted" && (
            <Button
              variant="secondary"
              className="mt-3"
              onClick={testarAgora}
              disabled={testando}
            >
              {testando ? "Verificando..." : "Testar agora"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
