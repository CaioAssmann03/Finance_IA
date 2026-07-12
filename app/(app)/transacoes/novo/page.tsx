import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { FormularioNovoLancamento } from "@/components/forms/formulario-novo-lancamento";
import type { Conta, Categoria } from "@/types/database";

export default async function NovoLancamentoPage() {
  const supabase = await createClient();

  const [{ data: contas }, { data: categorias }] = await Promise.all([
    supabase.from("contas").select("*").returns<Conta[]>(),
    supabase.from("categorias").select("*").returns<Categoria[]>(),
  ]);

  return (
    <div>
      <CabecalhoPagina
        titulo="Novo lançamento"
        subtitulo="Registre uma receita ou despesa"
      />
      <div className="px-5 md:px-8">
        <div className="max-w-md">
          {(!contas || contas.length === 0) && (
            <p className="mb-4 rounded-sm border border-hairline bg-surface p-4 text-sm text-text-muted">
              Você ainda não tem nenhuma conta cadastrada. Cadastre uma conta
              antes de lançar transações.
            </p>
          )}
          <FormularioNovoLancamento
            contas={contas ?? []}
            categorias={categorias ?? []}
          />
        </div>
      </div>
    </div>
  );
}
