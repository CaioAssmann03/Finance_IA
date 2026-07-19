"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const CHAVE_TEMA = "financeia:tema";

export function AlternadorTema({ className }: { className?: string }) {
  const [tema, setTema] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const atual = document.documentElement.getAttribute("data-theme");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza com o data-theme setado pelo script anti-flash no <head>, que roda fora do React antes da hidratação.
    setTema(atual === "light" ? "light" : "dark");
  }, []);

  function alternar() {
    const novo = tema === "dark" ? "light" : "dark";
    setTema(novo);
    if (novo === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    localStorage.setItem(CHAVE_TEMA, novo);
  }

  return (
    <button
      onClick={alternar}
      className={
        className ??
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-2/60 hover:text-text"
      }
      aria-label={tema === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
    >
      {tema === "dark" ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
      {tema === "dark" ? "Tema claro" : "Tema escuro"}
    </button>
  );
}
