import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <Compass size={32} className="text-gold" strokeWidth={1.5} />
      <p className="mt-4 text-xs uppercase tracking-[0.2em] text-text-muted">
        Finance IA
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
        Página não encontrada
      </h1>
      <p className="mt-3 max-w-sm text-sm text-text-muted">
        Esse endereço não existe, ou você digitou algo errado. Que tal voltar
        pra visão geral?
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-gradient-to-b from-[var(--gold-light)] to-[var(--gold)] px-4 py-2.5 text-sm font-medium text-[var(--on-accent)] hover:brightness-105"
      >
        Voltar para a visão geral
      </Link>
    </div>
  );
}
