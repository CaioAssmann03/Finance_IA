import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { NotificacoesCliente } from "@/components/notificacoes/notificacoes-cliente";
import { Card } from "@/components/ui/card";
import { AlternadorTema } from "@/components/tema/alternador-tema";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <CabecalhoPagina titulo="Configurações" />
      <div className="flex flex-col gap-6 px-5 md:px-8">
        <Card className="max-w-lg">
          <p className="font-medium">Conta</p>
          <p className="mt-1 text-sm text-text-muted">{user?.email}</p>
        </Card>

        <Card className="max-w-lg">
          <p className="font-medium">Aparência</p>
          <p className="mt-1 text-sm text-text-muted">
            Escolha entre tema escuro ou claro.
          </p>
          <AlternadorTema className="mt-3 inline-flex items-center gap-2 rounded-md border border-hairline bg-surface-2 px-4 py-2.5 text-sm text-text hover:border-hairline-strong" />
        </Card>

        <NotificacoesCliente />
      </div>
    </div>
  );
}
