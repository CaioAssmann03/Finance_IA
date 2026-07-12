import { CabecalhoPagina } from "./cabecalho-pagina";

export function PaginaEmConstrucao({
  titulo,
  fase,
}: {
  titulo: string;
  fase: string;
}) {
  return (
    <div>
      <CabecalhoPagina titulo={titulo} />
      <div className="mx-5 rounded-md border border-dashed border-hairline p-10 text-center text-sm text-text-muted md:mx-8">
        Esta tela ainda não foi construída — está prevista para a {fase} do
        roadmap (veja <code>docs/04-roadmap.md</code> e{" "}
        <code>docs/PROGRESSO.md</code>).
      </div>
    </div>
  );
}
