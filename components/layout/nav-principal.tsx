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
} from "lucide-react";

const ITENS = [
  { href: "/dashboard", label: "Visão geral", icone: LayoutDashboard },
  { href: "/transacoes", label: "Extrato", icone: List },
  { href: "/contas", label: "Contas", icone: Wallet },
  { href: "/categorias", label: "Categorias", icone: Tags },
  { href: "/metas", label: "Metas", icone: Target },
  { href: "/assistente", label: "Assistente", icone: Sparkles },
];

export function NavPrincipal() {
  const pathname = usePathname();

  return (
    <>
      {/* Sidebar — desktop */}
      <nav className="hidden md:flex md:w-56 md:flex-col md:border-r md:border-hairline md:px-3 md:py-6">
        <div className="mb-8 px-3">
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
            Finance IA
          </p>
        </div>
        <ul className="flex flex-col gap-1">
          {ITENS.map(({ href, label, icone: Icone }) => {
            const ativo = pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={clsx(
                    "flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors",
                    ativo
                      ? "bg-surface-2 text-gold"
                      : "text-text-muted hover:bg-surface hover:text-text"
                  )}
                >
                  <Icone size={16} strokeWidth={1.75} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Barra inferior — mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 flex justify-around border-t border-hairline bg-surface px-1 py-2 md:hidden">
        {ITENS.map(({ href, label, icone: Icone }) => {
          const ativo = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex flex-col items-center gap-1 px-2 py-1 text-[10px]",
                ativo ? "text-gold" : "text-text-muted"
              )}
            >
              <Icone size={18} strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
