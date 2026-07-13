import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { ContasCliente } from "@/components/forms/contas-cliente";
import type { Conta } from "@/types/database";

export default async function ContasPage() {
  const supabase = await createClient();
  const { data: contas } = await supabase
    .from("contas")
    .select("*")
    .order("criado_em")
    .returns<Conta[]>();

  return (
    <div>
      <CabecalhoPagina
        titulo="Contas"
        subtitulo="Suas contas, carteiras e cartões"
      />
      <ContasCliente contasIniciais={contas ?? []} />
    </div>
  );
}
