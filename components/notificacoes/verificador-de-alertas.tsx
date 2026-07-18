"use client";

import { useEffect } from "react";

const CHAVE_ULTIMA_VERIFICACAO = "financeia:ultima-verificacao-alertas";

export function VerificadorDeAlertas() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;

    const hoje = new Date().toDateString();
    if (localStorage.getItem(CHAVE_ULTIMA_VERIFICACAO) === hoje) return;

    fetch("/api/alertas")
      .then((r) => r.json())
      .then((dados) => {
        const alertas = dados.alertas ?? [];
        for (const a of alertas.slice(0, 3)) {
          new Notification(`Finance IA — ${a.titulo}`, {
            body: a.descricao,
            icon: "/icons/icon-192.png",
          });
        }
        localStorage.setItem(CHAVE_ULTIMA_VERIFICACAO, hoje);
      })
      .catch(() => {
        // Falha silenciosa — não é crítico, o usuário ainda vê os alertas no dashboard.
      });
  }, []);

  return null;
}
