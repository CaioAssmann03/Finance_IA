"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatarMoeda } from "@/lib/utils/formatters";
import type { Conta, Categoria, TransacaoRecorrente } from "@/types/database";
import { Trash2, Pause, Play } from "lucide-react";
import clsx from "clsx";

export function RecorrentesCliente({
  recorrentesIniciais,
  contas,
  categorias,
}: {
  recorrentesIniciais: TransacaoRecorrente[];
  contas: Conta[];
  categorias: Categoria[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [recorrentes, setRecorrentes] = useState(recorrentesIniciais);

  const mapaCategorias = new Map(categorias.map((c) => [c.id, c]));
  const mapaContas = new Map(contas.map((c) => [c.id, c]));

  async function alternarAtivo(recorrente: TransacaoRecorrente) {
    const { error } = await supabase
      .from("transacoes_recorrentes")
      .update({ ativo: !recorrente.ativo })
      .eq("id", recorrente.id);

    if (!error) {
      setRecorrentes((atual) =>
        atual.map((r) =>
          r.id === recorrente.id ? { ...r, ativo: !r.ativo } : r
        )
      );
      router.refresh();
    }
  }

  async function excluir(id: string) {
    if (
      !confirm(
        "Excluir esta recorrência? Os lançamentos já criados por ela continuam existindo."
      )
    )
      return;
    const { error } = await supabase
      .from("transacoes_recorrentes")
      .delete()
      .eq("id", id);
    if (!error) {
      setRecorrentes((atual) => atual.filter((r) => r.id !== id));
      router.refresh();
    }
  }

  return (
    <div className="px-5 md:px-8">
      <p className="mb-5 max-w-md text-sm text-text-muted">
        Contas fixas do mês (aluguel, assinaturas, financiamentos). O
        lançamento do mês é criado automaticamente ao abrir o app. Para
        cadastrar uma nova, use o botão <strong>Lançar</strong> no Extrato e
        escolha o modo <strong>Conta fixa</strong>.
      </p>

      {recorrentes.length === 0 ? (
        <div className="rounded-md border border-dashed border-hairline p-10 text-center text-sm text-text-muted">
          Nenhuma recorrência cadastrada ainda.
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline rounded-md border border-hairline">
          {recorrentes.map((r) => {
            const categoria = mapaCategorias.get(r.categoria_id);
            const conta = mapaContas.get(r.conta_id);
            return (
              <li
                key={r.id}
                className={clsx(
                  "flex items-center justify-between gap-3 px-4 py-3 text-sm",
                  !r.ativo && "opacity-50"
                )}
              >
                <div className="min-w-0">
                  <p className="truncate">{r.descricao}</p>
                  <p className="truncate text-xs text-text-muted">
                    Todo dia {r.dia_do_mes} · {categoria?.nome ?? "—"} ·{" "}
                    {conta?.nome ?? "—"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="tabular">{formatarMoeda(r.valor)}</span>
                  <button
                    onClick={() => alternarAtivo(r)}
                    className="text-text-muted hover:text-gold"
                    aria-label={r.ativo ? "Pausar" : "Reativar"}
                    title={r.ativo ? "Pausar" : "Reativar"}
                  >
                    {r.ativo ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button
                    onClick={() => excluir(r.id)}
                    className="text-text-muted hover:text-brick"
                    aria-label="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
