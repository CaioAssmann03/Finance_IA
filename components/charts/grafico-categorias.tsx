"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatarMoeda } from "@/lib/utils/formatters";

interface FatiaCategoria {
  nome: string;
  valor: number;
  cor: string;
}

export function GraficoCategorias({ dados }: { dados: FatiaCategoria[] }) {
  if (dados.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-text-muted">
        Nenhum gasto lançado neste mês ainda.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-56 w-56 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dados}
              dataKey="valor"
              nameKey="nome"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
              stroke="var(--bg)"
              strokeWidth={2}
            >
              {dados.map((fatia, i) => (
                <Cell key={i} fill={fatia.cor} />
              ))}
            </Pie>
            <Tooltip
              formatter={(valor) => formatarMoeda(Number(valor))}
              contentStyle={{
                background: "var(--surface-2)",
                border: "1px solid var(--hairline)",
                borderRadius: 4,
                color: "var(--text)",
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex w-full flex-col gap-2">
        {dados.map((fatia) => (
          <li key={fatia.nome} className="ledger-row text-sm">
            <span className="flex items-center gap-2 text-text-muted">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: fatia.cor }}
              />
              {fatia.nome}
            </span>
            <span className="ledger-leader" />
            <span className="tabular">{formatarMoeda(fatia.valor)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
