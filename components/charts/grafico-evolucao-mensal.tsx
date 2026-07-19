"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatarMoeda } from "@/lib/utils/formatters";

export interface PontoEvolucaoMensal {
  mes: string; // rótulo curto, ex: "jul"
  receitas: number;
  despesas: number;
}

export function GraficoEvolucaoMensal({ dados }: { dados: PontoEvolucaoMensal[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} barGap={4}>
          <CartesianGrid vertical={false} stroke="var(--hairline)" />
          <XAxis
            dataKey="mes"
            tick={{ fill: "var(--text-muted)", fontSize: 12 }}
            axisLine={{ stroke: "var(--hairline)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(v) =>
              v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
            }
          />
          <Tooltip
            formatter={(valor) => formatarMoeda(Number(valor))}
            contentStyle={{
              background: "var(--surface-2)",
              border: "1px solid var(--hairline)",
              borderRadius: 8,
              color: "var(--text)",
              fontSize: 12,
            }}
            cursor={{ fill: "var(--surface-2)" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }}
            formatter={(valor) => (valor === "receitas" ? "Receitas" : "Despesas")}
          />
          <Bar dataKey="receitas" fill="var(--sage)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="despesas" fill="var(--brick)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
