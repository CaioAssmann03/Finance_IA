/**
 * Limitador de requisições por janela deslizante, guardado em memória.
 *
 * Serve para as rotas destrutivas ou caras — hoje a de excluir a conta. Sem
 * isso, uma sessão válida (ou um script com o cookie dela) consegue disparar
 * chamadas em série sem nenhum freio.
 *
 * Limitação conhecida: em memória vale por instância do servidor. Numa
 * hospedagem serverless com várias instâncias isso vira um limite "por
 * instância", não global. É proteção suficiente para o uso pessoal do app; se
 * um dia virar multiusuário de verdade, trocar por Upstash/Redis mantendo esta
 * mesma assinatura.
 */

interface Janela {
  contagem: number;
  expiraEm: number;
}

const janelas = new Map<string, Janela>();

/** Evita que o Map cresça sem fim com chaves de usuários que não voltaram. */
function limpar(agora: number) {
  if (janelas.size < 500) return;
  for (const [chave, janela] of janelas) {
    if (janela.expiraEm <= agora) janelas.delete(chave);
  }
}

export interface ResultadoLimite {
  permitido: boolean;
  restantes: number;
  /** Segundos até a janela reabrir — vai no header Retry-After. */
  esperarSegundos: number;
}

export function verificarLimite(
  chave: string,
  maximo: number,
  janelaMs: number
): ResultadoLimite {
  const agora = Date.now();
  limpar(agora);

  const atual = janelas.get(chave);

  if (!atual || atual.expiraEm <= agora) {
    janelas.set(chave, { contagem: 1, expiraEm: agora + janelaMs });
    return { permitido: true, restantes: maximo - 1, esperarSegundos: 0 };
  }

  if (atual.contagem >= maximo) {
    return {
      permitido: false,
      restantes: 0,
      esperarSegundos: Math.max(1, Math.ceil((atual.expiraEm - agora) / 1000)),
    };
  }

  atual.contagem += 1;
  return {
    permitido: true,
    restantes: maximo - atual.contagem,
    esperarSegundos: 0,
  };
}
