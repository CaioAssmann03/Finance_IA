"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Executa uma ação assíncrona garantindo que ela NÃO rode duas vezes em
 * paralelo — é o que impedia o clique duplo rápido no "Salvar" de gravar o
 * mesmo lançamento duas vezes.
 *
 * `disabled={salvando}` sozinho não resolve: `setSalvando(true)` só desabilita
 * o botão depois que o React re-renderiza, e dois cliques em poucos
 * milissegundos entram os dois antes disso. A trava aqui é um `useRef`, que
 * muda de valor na hora, no mesmo tick do primeiro clique.
 *
 * Também ignora a atualização de estado se o componente já saiu da tela
 * (comum quando a ação termina navegando para outra página).
 */
export function useAcaoUnica<Args extends unknown[]>(
  acao: (...args: Args) => Promise<void>
): { executar: (...args: Args) => Promise<void>; executando: boolean } {
  const travado = useRef(false);
  const montado = useRef(true);
  const [executando, setExecutando] = useState(false);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const executar = useCallback(
    async (...args: Args) => {
      if (travado.current) return;
      travado.current = true;
      setExecutando(true);
      try {
        await acao(...args);
      } finally {
        travado.current = false;
        if (montado.current) setExecutando(false);
      }
    },
    [acao]
  );

  return { executar, executando };
}
