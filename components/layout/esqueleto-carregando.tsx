/**
 * Esqueleto mostrado enquanto uma página do app carrega os dados no servidor.
 *
 * Sem um `loading.tsx`, o Next segura a navegação inteira até a página ficar
 * pronta: você clica no menu e nada acontece por um tempo — a sensação é de app
 * travado, mesmo quando a consulta em si é rápida. Com ele, a troca de tela é
 * instantânea e os dados entram no lugar do esqueleto.
 */
export function EsqueletoCarregando({ cartoes = 3 }: { cartoes?: number }) {
  return (
    <div aria-busy="true" aria-live="polite" className="animate-pulse">
      <span className="sr-only">Carregando...</span>

      {/* Cabeçalho da página */}
      <div className="px-5 py-6 md:px-8">
        <div className="h-7 w-44 rounded-md bg-surface-2" />
        <div className="mt-2 h-4 w-64 rounded-md bg-surface-2/60" />
      </div>

      {/* Cartões do topo */}
      <div className="grid gap-4 px-5 md:grid-cols-3 md:px-8">
        {Array.from({ length: cartoes }).map((_, i) => (
          <div
            key={i}
            className="rounded-md border border-hairline bg-surface p-5"
          >
            <div className="h-3 w-24 rounded bg-surface-2" />
            <div className="mt-4 h-8 w-32 rounded bg-surface-2" />
          </div>
        ))}
      </div>

      {/* Bloco de conteúdo */}
      <div className="mt-6 px-5 md:px-8">
        <div className="rounded-md border border-hairline bg-surface p-5">
          <div className="h-3 w-32 rounded bg-surface-2" />
          <div className="mt-5 flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div className="h-4 flex-1 rounded bg-surface-2/70" />
                <div className="h-4 w-20 rounded bg-surface-2/70" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
