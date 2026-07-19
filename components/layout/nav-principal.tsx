"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  List,
  Wallet,
  Tags,
  Target,
  Sparkles,
  Settings,
} from "lucide-react";
import { AlternadorTema } from "@/components/tema/alternador-tema";

const ITENS = [
  { href: "/dashboard", label: "Visão geral", icone: LayoutDashboard },
  { href: "/transacoes", label: "Extrato", icone: List },
  { href: "/contas", label: "Contas", icone: Wallet },
  { href: "/categorias", label: "Categorias", icone: Tags },
  { href: "/metas", label: "Metas", icone: Target },
  { href: "/assistente", label: "Assistente", icone: Sparkles },
  { href: "/configuracoes", label: "Ajustes", icone: Settings },
];

export function NavPrincipal() {
  const pathname = usePathname();

  return (
    <>
      {/* Sidebar — desktop */}
      <nav className="hidden md:flex md:w-56 md:flex-col md:border-r md:border-hairline md:bg-surface/40 md:px-3 md:py-6">
        <div className="mb-8 flex items-center gap-2 px-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-b from-[var(--gold-light)] to-[var(--gold)] font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--on-accent)] shadow-[0_1px_0_rgba(255,255,255,0.25)_inset]">
            F
          </span>
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
            Finance IA
          </p>
        </div>
        <ul className="flex flex-col gap-1">
          {ITENS.map(({ href, label, icone: Icone }) => {
            const ativo = pathname.startsWith(href);
            return (
              <li key={href} className="relative">
                {ativo && (
                  <span className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-gold" />
                )}
                <Link
                  href={href}
                  className={clsx(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    ativo
                      ? "bg-gold-soft text-gold"
                      : "text-text-muted hover:bg-surface-2/60 hover:text-text"
                  )}
                >
                  <Icone size={16} strokeWidth={1.75} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto border-t border-hairline pt-3">
          <AlternadorTema />
        </div>
      </nav>

      {/* Barra inferior — mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 flex justify-around border-t border-hairline bg-surface/95 px-1 py-2 backdrop-blur-sm md:hidden">
        {ITENS.map(({ href, label, icone: Icone }) => {
          const ativo = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex flex-col items-center gap-1 rounded-md px-2 py-1 text-[10px] transition-colors",
                ativo ? "text-gold" : "text-text-muted"
              )}
            >
              <Icone size={18} strokeWidth={ativo ? 2.1 : 1.75} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
