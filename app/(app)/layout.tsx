import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/supabase/server";
import { NavPrincipal } from "@/components/layout/nav-principal";
import { VerificadorDeAlertas } from "@/components/notificacoes/verificador-de-alertas";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // O middleware já barrou quem não tem sessão; esta checagem é a segunda
  // tranca. Graças ao cache por requisição, ela não custa uma nova ida à rede.
  const user = await usuarioAtual();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <NavPrincipal />
      <div className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</div>
      <VerificadorDeAlertas />
    </div>
  );
}
