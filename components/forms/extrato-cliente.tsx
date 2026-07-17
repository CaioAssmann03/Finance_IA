"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatarMoeda, formatarData } from "@/lib/utils/formatters";
import type { Conta, Categoria, Transacao, TipoLancamento } from "@/types/database";
import { Trash2, Pencil, Search } from "lucide-react";
import clsx from "clsx";

export function ExtratoCliente({
  transacoesIniciais,
  contas,
  categorias,
}: {
  transacoesIniciais: Transacao[];
  contas: Conta[];
  categorias: Categoria[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [transacoes, setTransacoes] = useState(transacoesIniciais);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroConta, setFiltroConta] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | TipoLancamento>("todos");
  const [editando, setEditando] = useState<Transacao | null>(null);

  const mapaCategorias = useMemo(
    () => new Map(categorias.map((c) => [c.id, c])),
    [categorias]
  );
  const mapaContas = useMemo(() => new Map(contas.map((c) => [c.id, c])), [contas]);

  const filtradas = transacoes.filter((t) => {
    if (filtroTipo !== "todos" && t.tipo !== filtroTipo) return false;
    if (filtroCategoria && t.categoria_id !== filtroCategoria) return false;
    if (filtroConta && t.conta_id !== filtroConta) return false;
    if (busca && !(t.descricao ?? "").toLowerCase().includes(busca.toLowerCase()))
      return false;
    return true;
  });

  const totalFiltrado = filtradas.reduce(
    (s, t) => s + (t.tipo === "receita" ? t.valor : -t.valor),
    0
  );

  async function excluir(id: string) {
    if (!confirm("Excluir este lançamento?")) return;
    const { error } = await supabase.from("transacoes").delete().eq("id", id);
    if (!error) {
      setTransacoes((atual) => atual.filter((t) => t.id !== id));
      router.refresh();
    }
  }

  function atualizarNaLista(atualizada: Transacao) {
    setTransacoes((atual) =>
      atual.map((t) => (t.id === atualizada.id ? atualizada : t))
    );
  }

  return (
    <div className="px-5 md:px-8">
      {/* Filtros */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            placeholder="Buscar por descrição..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-sm border border-hairline bg-surface py-2.5 pl-9 pr-3 text-sm text-text placeholder:text-text-muted/60 focus:border-gold focus:outline-none"
          />
        </div>

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value as typeof filtroTipo)}
          className="rounded-sm border border-hairline bg-surface px-3 py-2.5 text-sm text-text focus:border-gold focus:outline-none"
        >
          <option value="todos">Todos os tipos</option>
          <option value="despesa">Despesas</option>
          <option value="receita">Receitas</option>
        </select>

        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="rounded-sm border border-hairline bg-surface px-3 py-2.5 text-sm text-text focus:border-gold focus:outline-none"
        >
          <option value="">Todas categorias</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>

        <select
          value={filtroConta}
          onChange={(e) => setFiltroConta(e.target.value)}
          className="rounded-sm border border-hairline bg-surface px-3 py-2.5 text-sm text-text focus:border-gold focus:outline-none"
        >
          <option value="">Todas contas</option>
          {contas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Resumo do filtro atual */}
      <div className="mb-4 flex items-center justify-between text-sm text-text-muted">
        <span>{filtradas.length} lançamento(s)</span>
        <span
          className={clsx(
            "tabular font-medium",
            totalFiltrado >= 0 ? "text-sage" : "text-brick"
          )}
        >
          {formatarMoeda(totalFiltrado)}
        </span>
      </div>

      {/* Lista */}
      {filtradas.length === 0 ? (
        <div className="rounded-md border border-dashed border-hairline p-10 text-center text-sm text-text-muted">
          Nenhum lançamento encontrado com esses filtros.
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline rounded-md border border-hairline">
          {filtradas.map((t) => {
            const categoria = mapaCategorias.get(t.categoria_id);
            const conta = mapaContas.get(t.conta_id);
            return (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: categoria?.cor ?? "#6B6B6B" }}
                  />
                  <div className="min-w-0">
                    <p className="truncate">{t.descricao || "Sem descrição"}</p>
                    <p className="truncate text-xs text-text-muted">
                      {formatarData(t.data)} · {categoria?.nome ?? "—"} ·{" "}
                      {conta?.nome ?? "—"}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={clsx(
                      "tabular",
                      t.tipo === "receita" ? "text-sage" : "text-brick"
                    )}
                  >
                    {t.tipo === "receita" ? "+" : "-"}
                    {formatarMoeda(t.valor)}
                  </span>
                  <button
                    onClick={() => setEditando(t)}
                    className="text-text-muted hover:text-gold"
                    aria-label="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => excluir(t.id)}
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
        <ModalEdicao
          transacao={editando}
          contas={contas}
          categorias={categorias}
          onFechar={() => setEditando(null)}
          onSalvo={(t) => {
            atualizarNaLista(t);
            setEditando(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ModalEdicao({
  transacao,
  contas,
  categorias,
  onFechar,
  onSalvo,
}: {
  transacao: Transacao;
  contas: Conta[];
  categorias: Categoria[];
  onFechar: () => void;
  onSalvo: (t: Transacao) => void;
}) {
  const supabase = createClient();
  const [tipo, setTipo] = useState<TipoLancamento>(transacao.tipo);
  const [valor, setValor] = useState(String(transacao.valor));
  const [descricao, setDescricao] = useState(transacao.descricao ?? "");
  const [data, setData] = useState(transacao.data);
  const [contaId, setContaId] = useState(transacao.conta_id);
  const [categoriaId, setCategoriaId] = useState(transacao.categoria_id);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const categoriasFiltradas = categorias.filter((c) => c.tipo === tipo);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);

    const { data: atualizada, error } = await supabase
      .from("transacoes")
      .update({
        tipo,
        valor: Number(valor.toString().replace(",", ".")),
        descricao,
        data,
        conta_id: contaId,
        categoria_id: categoriaId,
      })
      .eq("id", transacao.id)
      .select()
      .single();

    setSalvando(false);

    if (error || !atualizada) {
      setErro("Não foi possível salvar as alterações.");
      return;
    }

    onSalvo(atualizada as Transacao);
  }

  return (
    <Modal aberto onFechar={onFechar} titulo="Editar lançamento">
      <form onSubmit={salvar} className="flex flex-col gap-4">
        <div className="flex rounded-sm border border-hairline p-1">
          {(["despesa", "receita"] as const).map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => setTipo(opcao)}
              className={clsx(
                "flex-1 rounded-sm py-2 text-sm capitalize transition-colors",
                tipo === opcao
                  ? opcao === "despesa"
                    ? "bg-brick text-white"
                    : "bg-sage text-bg"
                  : "text-text-muted"
              )}
            >
              {opcao}
            </button>
          ))}
        </div>

        <Input
          label="Valor"
          inputMode="decimal"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          required
        />
        <Input
          label="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-muted">Categoria</label>
          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            className="rounded-sm border border-hairline bg-surface px-3 py-2.5 text-text focus:border-gold focus:outline-none"
          >
            {categoriasFiltradas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
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

        <Input
          type="date"
          label="Data"
          value={data}
          onChange={(e) => setData(e.target.value)}
          required
        />

        {erro && <p className="text-sm text-brick">{erro}</p>}

        <Button type="submit" disabled={salvando} className="mt-1 w-full">
          {salvando ? "Salvando..." : "Salvar alterações"}
        </Button>
      </form>
    </Modal>
  );
}
