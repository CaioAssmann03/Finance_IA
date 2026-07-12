export function CabecalhoPagina({
  titulo,
  subtitulo,
  acao,
}: {
  titulo: string;
  subtitulo?: string;
  acao?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between px-5 pt-8 pb-6 md:px-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl">
          {titulo}
        </h1>
        {subtitulo && (
          <p className="mt-1 text-sm text-text-muted">{subtitulo}</p>
        )}
      </div>
      {acao}
    </div>
  );
}
