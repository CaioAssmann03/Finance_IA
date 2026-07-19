import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import clsx from "clsx";

/**
 * @param positivoEBom  Se true, um aumento é "bom" (ex: receitas) e fica verde;
 *                      se false, um aumento é "ruim" (ex: despesas) e fica vermelho.
 */
export function SeloComparacao({
  atual,
  anterior,
  positivoEBom,
  rotulo = "vs mês passado",
}: {
  atual: number;
  anterior: number;
  positivoEBom: boolean;
  rotulo?: string;
}) {
  if (anterior === 0) {
    if (atual === 0) return null;
    return (
      <span className="text-xs text-text-muted">Sem dado de referência ({rotulo})</span>
    );
  }

  const variacao = ((atual - anterior) / anterior) * 100;
  const subiu = variacao > 0.5;
  const desceu = variacao < -0.5;
  const bom = subiu ? positivoEBom : desceu ? !positivoEBom : null;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 text-xs font-medium",
        bom === true && "text-sage",
        bom === false && "text-brick",
        bom === null && "text-text-muted"
      )}
    >
      {subiu && <ArrowUp size={12} />}
      {desceu && <ArrowDown size={12} />}
      {!subiu && !desceu && <Minus size={12} />}
      {Math.abs(variacao).toFixed(0)}% {rotulo}
    </span>
  );
}
