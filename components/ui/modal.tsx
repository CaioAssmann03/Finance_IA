"use client";

import { ReactNode } from "react";

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
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="w-full max-w-sm rounded-t-md border border-hairline bg-surface p-5 sm:rounded-md">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-lg">
            {titulo}
          </h2>
          <button
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