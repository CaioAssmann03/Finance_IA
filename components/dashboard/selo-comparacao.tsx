import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import clsx from "clsx";
import { formatarMoeda } from "@/lib/utils/formatters";

/**
 * Abaixo deste valor, a base é pequena demais para um percentual dizer alguma
 * coisa: sair de R$ 6 para R$ 11.556 é "+192500%", que assusta sem informar.
 */
const BASE_MINIMA_PARA_PERCENTUAL = 50;

/** Acima disso o número vira ruído mesmo com base razoável — R$ 100 para
 * R$ 11.556 daria "+11456%". Nesses casos a diferença em reais é mais legível. */
const PERCENTUAL_MAXIMO_LEGIVEL = 999;

/** Variação menor que isso é ruído de arredondamento, não movimento real. */
const LIMIAR_ESTAVEL = 0.5;

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
  const diferenca = atual - anterior;

  const subiu = variacao > LIMIAR_ESTAVEL;
  const desceu = variacao < -LIMIAR_ESTAVEL;
  const bom = subiu ? positivoEBom : desceu ? !positivoEBom : null;

  // Quando o percentual não ajuda, mostra quanto mudou em reais — que é o que
  // a pessoa consegue interpretar de imediato.
  const usarValorAbsoluto =
    Math.abs(anterior) < BASE_MINIMA_PARA_PERCENTUAL ||
    Math.abs(variacao) > PERCENTUAL_MAXIMO_LEGIVEL;

  const texto = usarValorAbsoluto
    ? `${diferenca >= 0 ? "+" : "−"}${formatarMoeda(Math.abs(diferenca))}`
    : `${Math.abs(variacao).toFixed(0)}%`;

  return (
    <span
      title={
        usarValorAbsoluto
          ? `De ${formatarMoeda(anterior)} para ${formatarMoeda(atual)}`
          : undefined
      }
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
      {texto} {rotulo}
    </span>
  );
}
