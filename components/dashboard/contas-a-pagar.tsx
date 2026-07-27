import { formatarMoeda } from "@/lib/utils/formatters";
import { Card } from "@/components/ui/card";
import { CalendarClock } from "lucide-react";
import clsx from "clsx";

export interface ContaAPagar {
  descricao: string;
  valor: number;
  diasAte: number;
}

export function ContasAPagar({ itens }: { itens: ContaAPagar[] }) {
  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <CalendarClock size={16} className="text-gold" />
        <p className="text-sm text-text-muted">Contas a pagar (próximos 7 dias)</p>
      </div>

      {itens.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">
          Nenhuma conta fixa vencendo nos próximos 7 dias.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {itens.map((c, i) => (
            <li key={i} className="ledger-row text-sm">
              <span className="text-text">
                {c.descricao}
                <span
                  className={clsx(
                    "ml-2 text-xs",
                    c.diasAte === 0 ? "text-brick" : "text-text-muted"
                  )}
                >
                  {c.diasAte === 0
                    ? "Hoje"
                    : c.diasAte === 1
                    ? "Amanhã"
                    : `Em ${c.diasAte} dias`}
                </span>
              </span>
              <span className="ledger-leader" />
              <span className="tabular text-brick">{formatarMoeda(c.valor)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
