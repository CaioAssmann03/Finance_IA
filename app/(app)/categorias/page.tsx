import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { CategoriasCliente } from "@/components/forms/categorias-cliente";
import type { Categoria } from "@/types/database";

export default async function CategoriasPage() {
  const supabase = await createClient();
  const { data: categorias } = await supabase
    .from("categorias")
    .select("*")
    .order("nome")
    .returns<Categoria[]>();

  return (
    <div>
      <CabecalhoPagina
        titulo="Categorias"
        subtitulo="Organize receitas e despesas"
      />
      <CategoriasCliente categoriasIniciais={categorias ?? []} />
    </div>
  );
}
