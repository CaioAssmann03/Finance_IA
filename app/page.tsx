import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/supabase/server";

export default async function RootPage() {
  const user = await usuarioAtual();
  redirect(user ? "/dashboard" : "/login");
}
