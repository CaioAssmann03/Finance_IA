import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    // Apaga o usuário no Auth. As tabelas (contas, categorias, transacoes,
    // metas, orcamentos, transacoes_recorrentes) têm "on delete cascade"
    // pra user_id, então tudo o mais some junto automaticamente.
    const { error } = await admin.auth.admin.deleteUser(user.id);

    if (error) {
      return NextResponse.json({ erro: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Erro ao excluir a conta." },
      { status: 500 }
    );
  }
}
