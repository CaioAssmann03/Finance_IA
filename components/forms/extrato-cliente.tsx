"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatarMoeda, formatarData } from "@/lib/utils/formatters";
import type { Conta, Categoria, Transacao, TipoLancamento } from "@/types/database";
import { Trash2, Pencil, Search, ChevronDown, ChevronRight, Layers, Download } from "lucide-react";
import clsx from "clsx";

const SUFIXO_PARCELA = /\s*\(\d+\/\d+\)\s*$/;

function rotuloMes(chaveMes: string): string {
  const [ano, mes] = chaveMes.split("-").map(Number);
  const rotulo = new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return rotulo.charAt(0).toUpperCase() + rotulo.slice(1);
}

function chaveMesAtual(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

interface GrupoParcelas {
  grupo: true;
  id: string;
  itens: Transacao[];
}

type ItemExibido = Transacao | GrupoParcelas;

function ehGrupo(item: ItemExibido): item is GrupoParcelas {
  return "grupo" in item;
}

/** Junta lançamentos com o mesmo grupo_parcela_id numa única entrada, mantendo
 * a posição da ocorrência mais recente (a lista de entrada já vem ordenada
 * por data decrescente). */
function agruparParcelas(lista: Transacao[]): ItemExibido[] {
  const vistos = new Set<string>();
  const resultado: ItemExibido[] = [];

  for (const t of lista) {
    if (t.grupo_parcela_id) {
      if (vistos.has(t.grupo_parcela_id)) continue;
      vistos.add(t.grupo_parcela_id);
      const itens = lista.filter((x) => x.grupo_parcela_id === t.grupo_parcela_id);
      resultado.push({ grupo: true, id: t.grupo_parcela_id, itens });
    } else {
      resultado.push(t);
    }
  }

  return resultado;
}

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
  const [gruposAbertos, setGruposAbertos] = useState<Set<string>>(new Set());

  const mapaCategorias = useMemo(
    () => new Map(categorias.map((c) => [c.id, c])),
    [categorias]
  );
  const mapaContas = useMemo(() => new Map(contas.map((c) => [c.id, c])), [contas]);

  // Meses com pelo menos um lançamento, do mais recente para o mais antigo
  const mesesDisponiveis = useMemo(() => {
    const chaves = new Set(transacoes.map((t) => t.data.slice(0, 7)));
    return Array.from(chaves).sort((a, b) => (a < b ? 1 : -1));
  }, [transacoes]);

  const [filtroMes, setFiltroMes] = useState<string>(() => {
    const atual = chaveMesAtual();
    const chaves = new Set(transacoesIniciais.map((t) => t.data.slice(0, 7)));
    return chaves.has(atual) ? atual : "todos";
  });
  const [dataInicioPersonalizada, setDataInicioPersonalizada] = useState("");
  const [dataFimPersonalizada, setDataFimPersonalizada] = useState("");

  const filtradas = transacoes.filter((t) => {
    if (filtroMes === "personalizado") {
      if (dataInicioPersonalizada && t.data < dataInicioPersonalizada) return false;
      if (dataFimPersonalizada && t.data > dataFimPersonalizada) return false;
    } else if (filtroMes !== "todos" && t.data.slice(0, 7) !== filtroMes) {
      return false;
    }
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

  // Só agrupa parcelas quando não há um único mês específico selecionado —
  // dentro de um mês fechado normalmente só existe uma ocorrência de cada grupo mesmo.
  const itensExibidos =
    filtroMes === "todos" || filtroMes === "personalizado"
      ? agruparParcelas(filtradas)
      : filtradas;

  async function excluir(id: string) {
    if (!confirm("Excluir este lançamento?")) return;
    const { error } = await supabase.from("transacoes").delete().eq("id", id);
    if (!error) {
      setTransacoes((atual) => atual.filter((t) => t.id !== id));
      router.refresh();
    }
  }

  async function excluirGrupoInteiro(grupoParcelaId: string) {
    if (
      !confirm(
        "Excluir TODAS as parcelas deste grupo? Isso apaga o lançamento inteiro, passado e futuro."
      )
    )
      return;
    const { error } = await supabase
      .from("transacoes")
      .delete()
      .eq("grupo_parcela_id", grupoParcelaId);
    if (!error) {
      setTransacoes((atual) =>
        atual.filter((t) => t.grupo_parcela_id !== grupoParcelaId)
      );
      router.refresh();
    }
  }

  function atualizarNaLista(atualizada: Transacao) {
    setTransacoes((atual) =>
      atual.map((t) => (t.id === atualizada.id ? atualizada : t))
    );
  }

  function alternarGrupo(id: string) {
    setGruposAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) {
        novo.delete(id);
      } else {
        novo.add(id);
      }
      return novo;
    });
  }

  function exportarCsv() {
    const cabecalho = ["Data", "Tipo", "Categoria", "Conta", "Descrição", "Valor"];
    const linhas = filtradas.map((t) => {
      const categoria = mapaCategorias.get(t.categoria_id)?.nome ?? "";
      const conta = mapaContas.get(t.conta_id)?.nome ?? "";
      const valor = t.tipo === "receita" ? t.valor : -t.valor;
      const escapar = (texto: string) => `"${texto.replace(/"/g, '""')}"`;
      return [
        t.data,
        t.tipo,
        escapar(categoria),
        escapar(conta),
        escapar(t.descricao ?? ""),
        String(valor).replace(".", ","),
      ].join(";");
    });

    const csv = [cabecalho.join(";"), ...linhas].join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const sufixo =
      filtroMes === "todos"
        ? "todos-os-meses"
        : filtroMes === "personalizado"
        ? `${dataInicioPersonalizada || "inicio"}_a_${dataFimPersonalizada || "fim"}`
        : filtroMes;
    a.href = url;
    a.download = `finance-ia-extrato-${sufixo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
          value={filtroMes}
          onChange={(e) => setFiltroMes(e.target.value)}
          className="rounded-sm border border-hairline bg-surface px-3 py-2.5 text-sm text-text focus:border-gold focus:outline-none"
        >
          <option value="todos">Todos os meses</option>
          {mesesDisponiveis.map((mes) => (
            <option key={mes} value={mes}>
              {rotuloMes(mes)}
            </option>
          ))}
          <option value="personalizado">Período personalizado...</option>
        </select>

        {filtroMes === "personalizado" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dataInicioPersonalizada}
              onChange={(e) => setDataInicioPersonalizada(e.target.value)}
              className="rounded-sm border border-hairline bg-surface px-3 py-2.5 text-sm text-text focus:border-gold focus:outline-none"
            />
            <span className="text-text-muted">até</span>
            <input
              type="date"
              value={dataFimPersonalizada}
              onChange={(e) => setDataFimPersonalizada(e.target.value)}
              className="rounded-sm border border-hairline bg-surface px-3 py-2.5 text-sm text-text focus:border-gold focus:outline-none"
            />
          </div>
        )}

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
        <div className="flex items-center gap-3">
          <span
            className={clsx(
              "tabular font-medium",
              totalFiltrado >= 0 ? "text-sage" : "text-brick"
            )}
          >
            {formatarMoeda(totalFiltrado)}
          </span>
          <button
            onClick={exportarCsv}
            disabled={filtradas.length === 0}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-gold disabled:opacity-40"
          >
            <Download size={13} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Lista */}
      {itensExibidos.length === 0 ? (
        <div className="rounded-md border border-dashed border-hairline p-10 text-center text-sm text-text-muted">
          Nenhum lançamento encontrado com esses filtros.
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline rounded-md border border-hairline">
          {itensExibidos.map((item) =>
            ehGrupo(item) ? (
              <GrupoParcelasItem
                key={item.id}
                grupo={item}
                aberto={gruposAbertos.has(item.id)}
                onAlternar={() => alternarGrupo(item.id)}
                mapaCategorias={mapaCategorias}
                mapaContas={mapaContas}
                onEditar={setEditando}
                onExcluirUm={excluir}
                onExcluirGrupo={excluirGrupoInteiro}
              />
            ) : (
              <LinhaTransacao
                key={item.id}
                t={item}
                mapaCategorias={mapaCategorias}
                mapaContas={mapaContas}
                onEditar={() => setEditando(item)}
                onExcluir={() => excluir(item.id)}
              />
            )
          )}
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

function LinhaTransacao({
  t,
  mapaCategorias,
  mapaContas,
  onEditar,
  onExcluir,
  indentado = false,
}: {
  t: Transacao;
  mapaCategorias: Map<string, Categoria>;
  mapaContas: Map<string, Conta>;
  onEditar: () => void;
  onExcluir: () => void;
  indentado?: boolean;
}) {
  const categoria = mapaCategorias.get(t.categoria_id);
  const conta = mapaContas.get(t.conta_id);

  return (
    <li
      className={clsx(
        "flex items-center justify-between gap-3 px-4 py-3 text-sm",
        indentado && "bg-bg/40 pl-10"
      )}
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
          onClick={onEditar}
          className="text-text-muted hover:text-gold"
          aria-label="Editar"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={onExcluir}
          className="text-text-muted hover:text-brick"
          aria-label="Excluir"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
}

function GrupoParcelasItem({
  grupo,
  aberto,
  onAlternar,
  mapaCategorias,
  mapaContas,
  onEditar,
  onExcluirUm,
  onExcluirGrupo,
}: {
  grupo: GrupoParcelas;
  aberto: boolean;
  onAlternar: () => void;
  mapaCategorias: Map<string, Categoria>;
  mapaContas: Map<string, Conta>;
  onEditar: (t: Transacao) => void;
  onExcluirUm: (id: string) => void;
  onExcluirGrupo: (grupoParcelaId: string) => void;
}) {
  const maisRecente = grupo.itens[0];
  const categoria = mapaCategorias.get(maisRecente.categoria_id);
  const conta = mapaContas.get(maisRecente.conta_id);
  const descricaoBase =
    (maisRecente.descricao || "Compra parcelada").replace(SUFIXO_PARCELA, "");
  const totalGrupo = grupo.itens.reduce((s, t) => s + t.valor, 0);

  return (
    <li>
      <button
        onClick={onAlternar}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-surface-2"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 text-text-muted">
            {aberto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: categoria?.cor ?? "#6B6B6B" }}
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate">
              {descricaoBase}
              <Layers size={12} className="shrink-0 text-text-muted" />
            </p>
            <p className="truncate text-xs text-text-muted">
              {formatarData(maisRecente.data)} · {categoria?.nome ?? "—"} ·{" "}
              {conta?.nome ?? "—"} · {grupo.itens.length}x
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 text-right">
          <span
            className={clsx(
              "tabular",
              maisRecente.tipo === "receita" ? "text-sage" : "text-brick"
            )}
          >
            {maisRecente.tipo === "receita" ? "+" : "-"}
            {formatarMoeda(maisRecente.valor)}
            <span className="text-text-muted"> × {grupo.itens.length}</span>
          </span>
        </div>
      </button>

      {aberto && (
        <ul className="flex flex-col divide-y divide-hairline border-t border-hairline">
          {grupo.itens.map((t) => (
            <LinhaTransacao
              key={t.id}
              t={t}
              mapaCategorias={mapaCategorias}
              mapaContas={mapaContas}
              onEditar={() => onEditar(t)}
              onExcluir={() => onExcluirUm(t.id)}
              indentado
            />
          ))}
          <li className="px-4 py-2 pl-10">
            <button
              onClick={() => onExcluirGrupo(grupo.id)}
              className="text-xs text-brick hover:underline"
            >
              Excluir todas as {grupo.itens.length} parcelas deste grupo (total{" "}
              {formatarMoeda(totalGrupo)})
            </button>
          </li>
        </ul>
      )}
    </li>
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
