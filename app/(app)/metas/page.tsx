import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { MetasCliente } from "@/components/forms/metas-cliente";
import type { Meta } from "@/types/database";

export default async function MetasPage() {
  const supabase = await createClient();
  const { data: metas } = await supabase
    .from("metas")
    .select("*")
    .order("criado_em")
    .returns<Meta[]>();

  return (
    <div>
      <CabecalhoPagina
        titulo="Metas"
        subtitulo="Objetivos financeiros de longo prazo"
      />
      <MetasCliente metasIniciais={metas ?? []} />
    </div>
  );
}
