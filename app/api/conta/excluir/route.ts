import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarLimite } from "@/lib/utils/limitador-taxa";

/** Frase que o navegador precisa enviar junto — o mesmo texto que o usuário
 * digita no modal. Impede que um POST solto (de outra aba, de um link, de um
 * script) apague a conta inteira sem intenção explícita. */
const CONFIRMACAO_ESPERADA = "EXCLUIR";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  // Requisição precisa ter vindo da própria origem do app.
  const origem = request.headers.get("origin");
  const origemEsperada = new URL(request.url).origin;
  if (origem && origem !== origemEsperada) {
    return NextResponse.json({ erro: "Origem não permitida." }, { status: 403 });
  }

  const limite = verificarLimite(`conta:excluir:${user.id}`, 3, 600_000);
  if (!limite.permitido) {
    return NextResponse.json(
      { erro: "Muitas tentativas. Espere alguns minutos." },
      { status: 429, headers: { "Retry-After": String(limite.esperarSegundos) } }
    );
  }

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    corpo = null;
  }

  const confirmacao = (corpo as { confirmacao?: unknown } | null)?.confirmacao;
  const email = (corpo as { email?: unknown } | null)?.email;

  if (confirmacao !== CONFIRMACAO_ESPERADA) {
    return NextResponse.json(
      { erro: `Confirmação inválida. Digite "${CONFIRMACAO_ESPERADA}" para continuar.` },
      { status: 400 }
    );
  }

  // Segunda barreira: o e-mail digitado tem que ser o da sessão.
  if (
    typeof email !== "string" ||
    email.trim().toLowerCase() !== (user.email ?? "").toLowerCase()
  ) {
    return NextResponse.json(
      { erro: "O e-mail digitado não confere com o da conta." },
      { status: 400 }
    );
  }

  try {
    const admin = createAdminClient();
    // Apaga o usuário no Auth. As tabelas (contas, categorias, transacoes,
    // metas, orcamentos, transacoes_recorrentes) têm "on delete cascade"
    // pra user_id, então tudo o mais some junto automaticamente.
    const { error } = await admin.auth.admin.deleteUser(user.id);

    if (error) {
      console.error("Falha ao excluir usuário:", error);
      return NextResponse.json(
        { erro: "Não foi possível excluir a conta agora. Tente de novo em instantes." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("Erro ao excluir a conta:", erro);
    return NextResponse.json(
      { erro: "Não foi possível excluir a conta agora. Tente de novo em instantes." },
      { status: 500 }
    );
  }
}
