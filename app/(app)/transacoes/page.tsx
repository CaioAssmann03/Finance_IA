import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { ExtratoCliente } from "@/components/forms/extrato-cliente";
import Link from "next/link";
import { Plus, Repeat, Upload } from "lucide-react";
import type { Conta, Categoria, Transacao } from "@/types/database";

const LIMITE_LANCAMENTOS = 2000;

export default async function TransacoesPage() {
  const supabase = await createClient();

  const [{ data: transacoes }, { data: contas }, { data: categorias }] =
    await Promise.all([
      // O limite existe para a página não crescer sem controle. Ele precisa
      // ser maior que o pior caso de um parcelamento longo, senão parte das
      // parcelas ficaria fora da tela e os totais por grupo sairiam errados.
      supabase
        .from("transacoes")
        .select("*")
        .order("data", { ascending: false })
        .order("criado_em", { ascending: false })
        .limit(LIMITE_LANCAMENTOS)
        .returns<Transacao[]>(),
      supabase.from("contas").select("*").returns<Conta[]>(),
      supabase.from("categorias").select("*").returns<Categoria[]>(),
    ]);

  return (
    <div>
      <CabecalhoPagina
        titulo="Extrato"
        subtitulo="Histórico completo de lançamentos"
        acao={
          <div className="flex flex-wrap justify-end gap-2">
            <Link
              href="/transacoes/importar"
              className="inline-flex items-center gap-2 rounded-sm border border-hairline px-4 py-2.5 text-sm font-medium text-text hover:bg-surface"
            >
              <Upload size={16} />
              Importar
            </Link>
            <Link
              href="/transacoes/recorrentes"
              className="inline-flex items-center gap-2 rounded-sm border border-hairline px-4 py-2.5 text-sm font-medium text-text hover:bg-surface"
            >
              <Repeat size={16} />
              Contas fixas
            </Link>
            <Link
              href="/transacoes/novo"
              className="inline-flex items-center gap-2 rounded-sm bg-gold px-4 py-2.5 text-sm font-medium text-[var(--on-accent)] hover:brightness-110"
            >
              <Plus size={16} />
              Lançar
            </Link>
          </div>
        }
      />
      <ExtratoCliente
        transacoesIniciais={transacoes ?? []}
        contas={contas ?? []}
        categorias={categorias ?? []}
      />
    </div>
  );
}
