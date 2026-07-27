"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

function rotuloMes(chaveMes: string): string {
  const [ano, mes] = chaveMes.split("-").map(Number);
  const rotulo = new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return rotulo.charAt(0).toUpperCase() + rotulo.slice(1);
}

function somarMeses(chaveMes: string, quantidade: number): string {
  const [ano, mes] = chaveMes.split("-").map(Number);
  const data = new Date(ano, mes - 1 + quantidade, 1);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

export function SeletorMesDashboard({
  mesAtual,
  mesMaximo,
}: {
  mesAtual: string;
  mesMaximo: string;
}) {
  const router = useRouter();

  // Últimos 12 meses a partir do mês atual do calendário, em ORDEM CRESCENTE
  // (mais antigo primeiro) — inclui o mês selecionado mesmo se for mais antigo que isso.
  const opcoes = new Set<string>();
  for (let i = 11; i >= 0; i--) {
    opcoes.add(somarMeses(mesMaximo, -i));
  }
  opcoes.add(mesAtual);
  const listaOrdenada = Array.from(opcoes).sort((a, b) => (a < b ? -1 : 1));

  function irPara(mes: string) {
    router.push(mes === mesMaximo ? "/dashboard" : `/dashboard?mes=${mes}`);
  }

  const proximoMes = somarMeses(mesAtual, 1);
  const podeAvancar = proximoMes <= mesMaximo;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => irPara(somarMeses(mesAtual, -1))}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-hairline text-text-muted hover:bg-surface-2"
        aria-label="Mês anterior"
      >
        <ChevronLeft size={14} />
      </button>

      <select
        value={mesAtual}
        onChange={(e) => irPara(e.target.value)}
        className="rounded-md border border-hairline bg-surface px-2 py-1.5 text-sm text-text focus:border-gold focus:outline-none"
      >
        {listaOrdenada.map((m) => (
          <option key={m} value={m}>
            {rotuloMes(m)}
          </option>
        ))}
      </select>

      <button
        onClick={() => podeAvancar && irPara(proximoMes)}
        disabled={!podeAvancar}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-hairline text-text-muted hover:bg-surface-2 disabled:opacity-30"
        aria-label="Próximo mês"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
