"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatarMoeda } from "@/lib/utils/formatters";

export interface PontoSaldo {
  mes: string;
  saldo: number;
}

export function GraficoSaldoAcumulado({ dados }: { dados: PontoSaldo[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={dados}>
          <defs>
            <linearGradient id="areaSaldo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            width={44}
            tickFormatter={(v) =>
              Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
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
          />
          <Area
            type="monotone"
            dataKey="saldo"
            stroke="var(--gold)"
            strokeWidth={2.5}
            fill="url(#areaSaldo)"
            dot={{ r: 3, fill: "var(--gold)", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
