import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { RecorrentesCliente } from "@/components/forms/recorrentes-cliente";
import type { Conta, Categoria, TransacaoRecorrente } from "@/types/database";

export default async function RecorrentesPage() {
  const supabase = await createClient();

  const [{ data: recorrentes }, { data: contas }, { data: categorias }] =
    await Promise.all([
      supabase
        .from("transacoes_recorrentes")
        .select("*")
        .order("criado_em")
        .returns<TransacaoRecorrente[]>(),
      supabase.from("contas").select("*").returns<Conta[]>(),
      supabase.from("categorias").select("*").returns<Categoria[]>(),
    ]);

  return (
    <div>
      <CabecalhoPagina
        titulo="Contas fixas"
        subtitulo="Recorrências mensais (aluguel, assinaturas, etc.)"
      />
      <RecorrentesCliente
        recorrentesIniciais={recorrentes ?? []}
        contas={contas ?? []}
        categorias={categorias ?? []}
      />
    </div>
  );
}
