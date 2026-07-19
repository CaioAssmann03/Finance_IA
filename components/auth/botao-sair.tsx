"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function BotaoSair() {
  const router = useRouter();
  const supabase = createClient();
  const [saindo, setSaindo] = useState(false);

  async function sair() {
    if (!confirm("Sair da sua conta?")) return;
    setSaindo(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="secondary" onClick={sair} disabled={saindo}>
      <LogOut size={16} />
      {saindo ? "Saindo..." : "Sair da conta"}
    </Button>
  );
}
