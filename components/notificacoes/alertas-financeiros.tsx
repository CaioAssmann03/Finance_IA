"use client";

import { useState } from "react";
import { AlertTriangle, Clock, X } from "lucide-react";
import clsx from "clsx";
import type { Alerta } from "@/lib/notificacoes/calcular-alertas";

export function AlertasFinanceiros({ alertas }: { alertas: Alerta[] }) {
  const [dispensados, setDispensados] = useState<Set<string>>(new Set());
  const visiveis = alertas.filter((a) => !dispensados.has(a.id));

  if (visiveis.length === 0) return null;

  return (
    <div className="mb-6 flex flex-col gap-2 px-5 md:px-8">
      {visiveis.map((a) => (
        <div
          key={a.id}
          className={clsx(
            "flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm",
            a.severidade === "urgente"
              ? "border-brick/40 bg-brick/10 text-brick"
              : "border-gold/40 bg-gold/10 text-gold"
          )}
        >
          <div className="flex items-center gap-3">
            {a.tipo === "conta_a_vencer" ? (
              <Clock size={16} className="shrink-0" />
            ) : (
              <AlertTriangle size={16} className="shrink-0" />
            )}
            <span>
              <strong className="font-medium">{a.titulo}</strong>
              <span className="text-text-muted"> — {a.descricao}</span>
            </span>
          </div>
          <button
            onClick={() => setDispensados((atual) => new Set(atual).add(a.id))}
            className="shrink-0 text-text-muted hover:text-text"
            aria-label="Dispensar"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
