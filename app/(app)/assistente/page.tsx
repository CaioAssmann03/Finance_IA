import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { AssistenteChat } from "@/components/forms/assistente-chat";

export default function AssistentePage() {
  return (
    <div>
      <CabecalhoPagina
        titulo="Assistente"
        subtitulo="Pergunte sobre seus gastos"
      />
      <AssistenteChat />
    </div>
  );
}
