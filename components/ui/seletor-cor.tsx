"use client";

import { PALETA_CATEGORIAS } from "@/lib/paleta-categorias";
import { Check } from "lucide-react";
import clsx from "clsx";

export function SeletorCor({
  valor,
  onChange,
}: {
  valor: string;
  onChange: (cor: string) => void;
}) {
  const corLivre = !PALETA_CATEGORIAS.some(
    (c) => c.toLowerCase() === valor.toLowerCase()
  );

  return (
    <div className="flex flex-wrap gap-2">
      {PALETA_CATEGORIAS.map((cor) => (
        <button
          key={cor}
          type="button"
          onClick={() => onChange(cor)}
          className="flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110"
          style={{ background: cor }}
          aria-label={`Usar cor ${cor}`}
        >
          {valor.toLowerCase() === cor.toLowerCase() && (
            <Check size={14} className="text-black/60" strokeWidth={3} />
          )}
        </button>
      ))}
      <label
        className={clsx(
          "relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border text-[10px] text-text-muted",
          corLivre ? "border-solid border-gold" : "border-dashed border-hairline-strong"
        )}
        style={{ background: corLivre ? valor : undefined }}
      >
        +
        <input
          type="color"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Escolher outra cor"
        />
      </label>
    </div>
  );
}
