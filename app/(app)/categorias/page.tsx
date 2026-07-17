import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { CategoriasCliente } from "@/components/forms/categorias-cliente";
import { mesReferenciaAtual } from "@/lib/utils/mes-referencia";
import type { Categoria, Orcamento } from "@/types/database";

export default async function CategoriasPage() {
  const supabase = await createClient();

  const [{ data: categorias }, { data: orcamentos }] = await Promise.all([
    supabase.from("categorias").select("*").order("nome").returns<Categoria[]>(),
    supabase
      .from("orcamentos")
      .select("*")
      .eq("mes_referencia", mesReferenciaAtual())
      .returns<Orcamento[]>(),
  ]);

  return (
    <div>
      <CabecalhoPagina
        titulo="Categorias"
        subtitulo="Organize receitas e despesas"
      />
      <CategoriasCliente
        categoriasIniciais={categorias ?? []}
        orcamentosIniciais={orcamentos ?? []}
      />
    </div>
  );
}
