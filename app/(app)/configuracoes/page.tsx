import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { NotificacoesCliente } from "@/components/notificacoes/notificacoes-cliente";
import { Card } from "@/components/ui/card";

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

        <NotificacoesCliente />
      </div>
    </div>
  );
}
