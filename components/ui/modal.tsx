"use client";

import { ReactNode, useEffect, useId, useRef } from "react";

/**
 * Modal simples com o básico de acessibilidade que faltava: fecha no Esc e no
 * clique fora, trava a rolagem do fundo, devolve o foco para o elemento que
 * abriu e mantém o Tab preso dentro da caixa.
 */
export function Modal({
  aberto,
  onFechar,
  titulo,
  children,
}: {
  aberto: boolean;
  onFechar: () => void;
  titulo: string;
  children: ReactNode;
}) {
  const caixaRef = useRef<HTMLDivElement>(null);
  const focoAnterior = useRef<HTMLElement | null>(null);
  const tituloId = useId();

  useEffect(() => {
    if (!aberto) return;

    focoAnterior.current = document.activeElement as HTMLElement | null;

    const rolagemOriginal = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function focaveis(): HTMLElement[] {
      if (!caixaRef.current) return [];
      return Array.from(
        caixaRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
    }

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.stopPropagation();
        onFechar();
        return;
      }

      if (evento.key !== "Tab") return;

      const lista = focaveis();
      if (lista.length === 0) return;

      const primeiro = lista[0];
      const ultimo = lista[lista.length - 1];
      const ativo = document.activeElement;

      if (evento.shiftKey && ativo === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && ativo === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener("keydown", aoTeclar);
    focaveis()[0]?.focus();

    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = rolagemOriginal;
      focoAnterior.current?.focus?.();
    };
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center overflow-y-auto bg-black/50 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div
        ref={caixaRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className="my-auto max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-t-md border border-hairline bg-surface p-5 sm:rounded-md"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={tituloId} className="font-[family-name:var(--font-display)] text-lg">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={onFechar}
            className="text-text-muted hover:text-text"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
