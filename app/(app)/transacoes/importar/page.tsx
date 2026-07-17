import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { ImportarExtratoCliente } from "@/components/forms/importar-extrato-cliente";
import type { Conta, Categoria } from "@/types/database";

export default async function ImportarExtratoPage() {
  const supabase = await createClient();

  const [{ data: contas }, { data: categorias }] = await Promise.all([
    supabase.from("contas").select("*").returns<Conta[]>(),
    supabase.from("categorias").select("*").returns<Categoria[]>(),
  ]);

  return (
    <div>
      <CabecalhoPagina
        titulo="Importar extrato"
        subtitulo="Traga o extrato do banco ou fatura do cartão (OFX ou CSV)"
      />
      {(!contas || contas.length === 0 || !categorias || categorias.length === 0) ? (
        <div className="mx-5 rounded-md border border-dashed border-hairline p-10 text-center text-sm text-text-muted md:mx-8">
          Cadastre pelo menos uma conta e uma categoria antes de importar.
        </div>
      ) : (
        <ImportarExtratoCliente contas={contas} categorias={categorias} />
      )}
    </div>
  );
}
