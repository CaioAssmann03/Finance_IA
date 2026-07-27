"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatarMoeda } from "@/lib/utils/formatters";
import type { Conta, Categoria, TransacaoRecorrente } from "@/types/database";
import { Trash2, Pause, Play, Pencil } from "lucide-react";
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
  const [editando, setEditando] = useState<TransacaoRecorrente | null>(null);

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

  function atualizarNaLista(atualizada: TransacaoRecorrente) {
    setRecorrentes((atual) =>
      atual.map((r) => (r.id === atualizada.id ? atualizada : r))
    );
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
                    onClick={() => setEditando(r)}
                    className="text-text-muted hover:text-gold"
                    aria-label="Editar"
                  >
                    <Pencil size={14} />
                  </button>
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

      {editando && (
        <ModalEdicaoRecorrente
          recorrente={editando}
          contas={contas}
          categorias={categorias}
          onFechar={() => setEditando(null)}
          onSalvo={(r) => {
            atualizarNaLista(r);
            setEditando(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ModalEdicaoRecorrente({
  recorrente,
  contas,
  categorias,
  onFechar,
  onSalvo,
}: {
  recorrente: TransacaoRecorrente;
  contas: Conta[];
  categorias: Categoria[];
  onFechar: () => void;
  onSalvo: (r: TransacaoRecorrente) => void;
}) {
  const supabase = createClient();
  const [descricao, setDescricao] = useState(recorrente.descricao ?? "");
  const [valor, setValor] = useState(String(recorrente.valor));
  const [diaDoMes, setDiaDoMes] = useState(String(recorrente.dia_do_mes));
  const [categoriaId, setCategoriaId] = useState(recorrente.categoria_id);
  const [contaId, setContaId] = useState(recorrente.conta_id);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const diaNumero = Number(diaDoMes);
    if (diaNumero < 1 || diaNumero > 31) {
      setErro("O dia do mês precisa estar entre 1 e 31.");
      return;
    }

    setSalvando(true);

    const { data, error } = await supabase
      .from("transacoes_recorrentes")
      .update({
        descricao: descricao.trim(),
        valor: Number(valor.replace(",", ".")),
        dia_do_mes: diaNumero,
        categoria_id: categoriaId,
        conta_id: contaId,
      })
      .eq("id", recorrente.id)
      .select()
      .single();

    setSalvando(false);

    if (error || !data) {
      setErro("Não foi possível salvar as alterações.");
      return;
    }

    onSalvo(data as TransacaoRecorrente);
  }

  return (
    <Modal aberto onFechar={onFechar} titulo="Editar conta fixa">
      <form onSubmit={salvar} className="flex flex-col gap-4">
        <Input
          label="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          required
        />
        <Input
          label="Valor"
          inputMode="decimal"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          required
        />
        <Input
          label="Todo dia do mês"
          inputMode="numeric"
          value={diaDoMes}
          onChange={(e) => setDiaDoMes(e.target.value)}
          required
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-muted">Categoria</label>
          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            className="rounded-sm border border-hairline bg-surface px-3 py-2.5 text-text focus:border-gold focus:outline-none"
          >
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} ({c.tipo})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-muted">Conta</label>
          <select
            value={contaId}
            onChange={(e) => setContaId(e.target.value)}
            className="rounded-sm border border-hairline bg-surface px-3 py-2.5 text-text focus:border-gold focus:outline-none"
          >
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <p className="text-xs text-text-muted">
          Isso não altera lançamentos já criados por essa recorrência em meses
          anteriores — só o comportamento a partir de agora.
        </p>

        {erro && <p className="text-sm text-brick">{erro}</p>}

        <Button type="submit" disabled={salvando} className="mt-1 w-full">
          {salvando ? "Salvando..." : "Salvar alterações"}
        </Button>
      </form>
    </Modal>
  );
}
