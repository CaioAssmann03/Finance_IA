"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useAcaoUnica } from "@/lib/hooks/use-acao-unica";
import { validarValorMonetario } from "@/lib/utils/valores";
import { ehDataISOValida, chaveMesAtual } from "@/lib/utils/datas";
import { mensagemDeErroBanco } from "@/lib/utils/erros-banco";
import {
  formatarMoeda,
  formatarData,
  nomeDoMesPelaChave,
} from "@/lib/utils/formatters";
import {
  descricaoBase,
  descricaoDaParcela,
  rotuloParcela,
  indexarPorGrupo,
  ROTULOS_ESCOPO,
  DESCRICOES_ESCOPO,
  type EscopoParcelas,
} from "@/lib/transacoes/parcelas";
import type { Conta, Categoria, Transacao, TipoLancamento } from "@/types/database";
import {
  Trash2,
  Pencil,
  Search,
  ChevronDown,
  ChevronRight,
  Layers,
  Download,
} from "lucide-react";
import clsx from "clsx";

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
function agruparParcelas(
  lista: Transacao[],
  porGrupo: Map<string, Transacao[]>
): ItemExibido[] {
  const vistos = new Set<string>();
  const resultado: ItemExibido[] = [];

  for (const t of lista) {
    if (t.grupo_parcela_id) {
      if (vistos.has(t.grupo_parcela_id)) continue;
      vistos.add(t.grupo_parcela_id);
      resultado.push({
        grupo: true,
        id: t.grupo_parcela_id,
        itens: porGrupo.get(t.grupo_parcela_id) ?? [t],
      });
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
  // `escopoInicial` deixa a ação combinar com o gesto: a lixeira de uma linha
  // começa em "só esta parcela", o link do grupo começa em "todas".
  const [editando, setEditando] = useState<{
    transacao: Transacao;
    escopoInicial: EscopoParcelas;
  } | null>(null);
  const [excluindo, setExcluindo] = useState<{
    transacao: Transacao;
    escopoInicial: EscopoParcelas;
  } | null>(null);
  const [gruposAbertos, setGruposAbertos] = useState<Set<string>>(new Set());

  const mapaCategorias = useMemo(
    () => new Map(categorias.map((c) => [c.id, c])),
    [categorias]
  );
  const mapaContas = useMemo(() => new Map(contas.map((c) => [c.id, c])), [contas]);

  // Série completa de cada parcelamento, independente do filtro de mês em uso —
  // é o que permite editar ou apagar o parcelamento inteiro a partir de
  // qualquer parcela visível na tela.
  const parcelasPorGrupo = useMemo(() => indexarPorGrupo(transacoes), [transacoes]);

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
      ? agruparParcelas(filtradas, parcelasPorGrupo)
      : filtradas;

  function removerDaLista(ids: string[]) {
    const apagados = new Set(ids);
    setTransacoes((atual) => atual.filter((t) => !apagados.has(t.id)));
  }

  function mesclarNaLista(atualizadas: Transacao[]) {
    const mapa = new Map(atualizadas.map((t) => [t.id, t]));
    setTransacoes((atual) => atual.map((t) => mapa.get(t.id) ?? t));
  }

  async function pedirExclusao(t: Transacao, escopoInicial: EscopoParcelas = "esta") {
    // Parcelamento nunca é apagado direto: o usuário escolhe se quer só a
    // parcela, dela pra frente, ou o parcelamento inteiro.
    if (t.grupo_parcela_id) {
      setExcluindo({ transacao: t, escopoInicial });
      return;
    }
    if (!confirm("Excluir este lançamento?")) return;

    const { data, error } = await supabase
      .from("transacoes")
      .delete()
      .eq("id", t.id)
      .select("id");

    if (error) {
      alert(mensagemDeErroBanco(error.message));
      return;
    }

    removerDaLista((data ?? []).map((d) => d.id));
    router.refresh();
  }

  function alternarGrupo(id: string) {
    setGruposAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function exportarCsv() {
    const cabecalho = ["Data", "Tipo", "Categoria", "Conta", "Descrição", "Parcela", "Valor"];
    const escapar = (texto: string) => `"${texto.replace(/"/g, '""')}"`;
    const linhas = filtradas.map((t) => {
      const categoria = mapaCategorias.get(t.categoria_id)?.nome ?? "";
      const conta = mapaContas.get(t.conta_id)?.nome ?? "";
      const valor = t.tipo === "receita" ? t.valor : -t.valor;
      return [
        t.data,
        t.tipo,
        escapar(categoria),
        escapar(conta),
        escapar(t.descricao ?? ""),
        rotuloParcela(t) ?? "",
        String(valor).replace(".", ","),
      ].join(";");
    });

    const csv = [cabecalho.join(";"), ...linhas].join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
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
        <div className="relative min-w-[180px] flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            placeholder="Buscar por descrição..."
            aria-label="Buscar por descrição"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-sm border border-hairline bg-surface py-2.5 pl-9 pr-3 text-sm text-text placeholder:text-text-muted/60 focus:border-gold focus:outline-none"
          />
        </div>

        <select
          value={filtroMes}
          aria-label="Filtrar por mês"
          onChange={(e) => setFiltroMes(e.target.value)}
          className="rounded-sm border border-hairline bg-surface px-3 py-2.5 text-sm text-text focus:border-gold focus:outline-none"
        >
          <option value="todos">Todos os meses</option>
          {mesesDisponiveis.map((mes) => (
            <option key={mes} value={mes}>
              {nomeDoMesPelaChave(mes)}
            </option>
          ))}
          <option value="personalizado">Período personalizado...</option>
        </select>

        {filtroMes === "personalizado" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              aria-label="Data inicial"
              value={dataInicioPersonalizada}
              onChange={(e) => setDataInicioPersonalizada(e.target.value)}
              className="rounded-sm border border-hairline bg-surface px-3 py-2.5 text-sm text-text focus:border-gold focus:outline-none"
            />
            <span className="text-text-muted">até</span>
            <input
              type="date"
              aria-label="Data final"
              value={dataFimPersonalizada}
              onChange={(e) => setDataFimPersonalizada(e.target.value)}
              className="rounded-sm border border-hairline bg-surface px-3 py-2.5 text-sm text-text focus:border-gold focus:outline-none"
            />
          </div>
        )}

        <select
          value={filtroTipo}
          aria-label="Filtrar por tipo"
          onChange={(e) => setFiltroTipo(e.target.value as typeof filtroTipo)}
          className="rounded-sm border border-hairline bg-surface px-3 py-2.5 text-sm text-text focus:border-gold focus:outline-none"
        >
          <option value="todos">Todos os tipos</option>
          <option value="despesa">Despesas</option>
          <option value="receita">Receitas</option>
        </select>

        <select
          value={filtroCategoria}
          aria-label="Filtrar por categoria"
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
          aria-label="Filtrar por conta"
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
                onEditar={(t, escopoInicial) => setEditando({ transacao: t, escopoInicial })}
                onExcluir={pedirExclusao}
              />
            ) : (
              <LinhaTransacao
                key={item.id}
                t={item}
                totalDaSerie={
                  item.grupo_parcela_id
                    ? parcelasPorGrupo.get(item.grupo_parcela_id)?.length
                    : undefined
                }
                mapaCategorias={mapaCategorias}
                mapaContas={mapaContas}
                onEditar={() => setEditando({ transacao: item, escopoInicial: "esta" })}
                onExcluir={() => pedirExclusao(item)}
              />
            )
          )}
        </ul>
      )}

      {editando && (
        <ModalEdicao
          transacao={editando.transacao}
          escopoInicial={editando.escopoInicial}
          serie={serieDe(editando.transacao, parcelasPorGrupo)}
          contas={contas}
          categorias={categorias}
          onFechar={() => setEditando(null)}
          onSalvo={(atualizadas) => {
            mesclarNaLista(atualizadas);
            setEditando(null);
            router.refresh();
          }}
        />
      )}

      {excluindo && (
        <ModalExclusaoParcelas
          transacao={excluindo.transacao}
          escopoInicial={excluindo.escopoInicial}
          serie={serieDe(excluindo.transacao, parcelasPorGrupo)}
          onFechar={() => setExcluindo(null)}
          onExcluido={(ids) => {
            removerDaLista(ids);
            setExcluindo(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/** Todas as parcelas carregadas do mesmo parcelamento (ou só a própria linha). */
function serieDe(t: Transacao, porGrupo: Map<string, Transacao[]>): Transacao[] {
  if (!t.grupo_parcela_id) return [t];
  return porGrupo.get(t.grupo_parcela_id) ?? [t];
}

function LinhaTransacao({
  t,
  totalDaSerie,
  mapaCategorias,
  mapaContas,
  onEditar,
  onExcluir,
  indentado = false,
}: {
  t: Transacao;
  totalDaSerie?: number;
  mapaCategorias: Map<string, Categoria>;
  mapaContas: Map<string, Conta>;
  onEditar: () => void;
  onExcluir: () => void;
  indentado?: boolean;
}) {
  const categoria = mapaCategorias.get(t.categoria_id);
  const conta = mapaContas.get(t.conta_id);
  const parcela = rotuloParcela(t);

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
          <p className="flex items-center gap-1.5 truncate">
            <span className="truncate">{t.descricao || "Sem descrição"}</span>
            {parcela && !indentado && (
              <span
                title={
                  totalDaSerie
                    ? `Parte de um parcelamento com ${totalDaSerie} lançamento(s) no app`
                    : "Parte de um parcelamento"
                }
                className="flex shrink-0 items-center gap-1 rounded-full border border-hairline px-1.5 py-0.5 text-[10px] text-text-muted"
              >
                <Layers size={9} />
                {parcela}
              </span>
            )}
          </p>
          <p className="truncate text-xs text-text-muted">
            {formatarData(t.data)} · {categoria?.nome ?? "—"} · {conta?.nome ?? "—"}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span
          className={clsx("tabular", t.tipo === "receita" ? "text-sage" : "text-brick")}
        >
          {t.tipo === "receita" ? "+" : "-"}
          {formatarMoeda(t.valor)}
        </span>
        <button
          onClick={onEditar}
          className="text-text-muted hover:text-gold"
          aria-label="Editar lançamento"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={onExcluir}
          className="text-text-muted hover:text-brick"
          aria-label="Excluir lançamento"
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
  onExcluir,
}: {
  grupo: GrupoParcelas;
  aberto: boolean;
  onAlternar: () => void;
  mapaCategorias: Map<string, Categoria>;
  mapaContas: Map<string, Conta>;
  onEditar: (t: Transacao, escopoInicial: EscopoParcelas) => void;
  onExcluir: (t: Transacao, escopoInicial: EscopoParcelas) => void;
}) {
  const maisRecente = grupo.itens[0];
  const categoria = mapaCategorias.get(maisRecente.categoria_id);
  const conta = mapaContas.get(maisRecente.conta_id);
  const base = descricaoBase(maisRecente.descricao) || "Compra parcelada";
  const totalGrupo = grupo.itens.reduce((s, t) => s + t.valor, 0);
  const totalDeclarado = maisRecente.parcela_total;
  // Ao abrir o grupo a leitura natural é da 1ª parcela para a última,
  // mesmo que a lista externa venha da mais recente para a mais antiga.
  const emOrdem = [...grupo.itens].sort((a, b) =>
    a.parcela_atual != null && b.parcela_atual != null
      ? a.parcela_atual - b.parcela_atual
      : a.data.localeCompare(b.data)
  );

  return (
    <li>
      <button
        onClick={onAlternar}
        aria-expanded={aberto}
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
              {base}
              <Layers size={12} className="shrink-0 text-text-muted" />
            </p>
            <p className="truncate text-xs text-text-muted">
              {formatarData(maisRecente.data)} · {categoria?.nome ?? "—"} ·{" "}
              {conta?.nome ?? "—"} · {grupo.itens.length}
              {totalDeclarado && totalDeclarado !== grupo.itens.length
                ? ` de ${totalDeclarado}`
                : ""}{" "}
              parcela(s)
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
          {emOrdem.map((t) => (
            <LinhaTransacao
              key={t.id}
              t={t}
              mapaCategorias={mapaCategorias}
              mapaContas={mapaContas}
              onEditar={() => onEditar(t, "esta")}
              onExcluir={() => onExcluir(t, "esta")}
              indentado
            />
          ))}
          {/* Ações do grupo partem da 1ª parcela, para que "todas" e
              "esta e as próximas" cubram a série inteira por padrão. */}
          <li className="flex flex-wrap gap-4 px-4 py-2 pl-10 text-xs">
            <button
              onClick={() => onEditar(emOrdem[0], "todas")}
              className="text-gold hover:underline"
            >
              Editar o parcelamento inteiro
            </button>
            <button
              onClick={() => onExcluir(emOrdem[0], "todas")}
              className="text-brick hover:underline"
            >
              Excluir parcelas (total {formatarMoeda(totalGrupo)})
            </button>
          </li>
        </ul>
      )}
    </li>
  );
}

/** Seletor de escopo reaproveitado pelos modais de edição e exclusão. */
function SeletorEscopo({
  escopo,
  onChange,
  quantidades,
}: {
  escopo: EscopoParcelas;
  onChange: (e: EscopoParcelas) => void;
  quantidades: Record<EscopoParcelas, number>;
}) {
  return (
    <fieldset className="flex flex-col gap-2 rounded-sm border border-hairline p-3">
      <legend className="px-1 text-xs uppercase tracking-wide text-text-muted">
        Aplicar a
      </legend>
      {(["esta", "esta_e_futuras", "todas"] as const).map((opcao) => (
        <label
          key={opcao}
          className={clsx(
            "flex cursor-pointer items-start gap-2.5 rounded-sm p-2 text-sm transition-colors",
            escopo === opcao ? "bg-surface-2" : "hover:bg-surface-2/50"
          )}
        >
          <input
            type="radio"
            name="escopo-parcelas"
            className="mt-1 accent-gold"
            checked={escopo === opcao}
            onChange={() => onChange(opcao)}
          />
          <span className="min-w-0">
            <span className="block">
              {ROTULOS_ESCOPO[opcao]}{" "}
              <span className="text-text-muted">
                ({quantidades[opcao]} lançamento{quantidades[opcao] === 1 ? "" : "s"})
              </span>
            </span>
            <span className="block text-xs text-text-muted">{DESCRICOES_ESCOPO[opcao]}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/** Calcula quantas parcelas cada escopo atinge, para mostrar antes de confirmar. */
function contarPorEscopo(
  serie: Transacao[],
  referencia: Transacao
): Record<EscopoParcelas, number> {
  const futuras = serie.filter((t) => {
    if (t.id === referencia.id) return true;
    if (referencia.parcela_atual != null && t.parcela_atual != null)
      return t.parcela_atual > referencia.parcela_atual;
    return t.data > referencia.data;
  });
  return { esta: 1, esta_e_futuras: futuras.length, todas: serie.length };
}

function ModalExclusaoParcelas({
  transacao,
  serie,
  escopoInicial,
  onFechar,
  onExcluido,
}: {
  transacao: Transacao;
  serie: Transacao[];
  escopoInicial: EscopoParcelas;
  onFechar: () => void;
  onExcluido: (ids: string[]) => void;
}) {
  const supabase = createClient();
  const [escopo, setEscopo] = useState<EscopoParcelas>(escopoInicial);
  const [erro, setErro] = useState<string | null>(null);

  const quantidades = useMemo(() => contarPorEscopo(serie, transacao), [serie, transacao]);
  const base = descricaoBase(transacao.descricao) || "Compra parcelada";

  async function confirmar() {
    setErro(null);

    let consulta = supabase.from("transacoes").delete();

    if (escopo === "esta" || !transacao.grupo_parcela_id) {
      consulta = consulta.eq("id", transacao.id);
    } else {
      consulta = consulta.eq("grupo_parcela_id", transacao.grupo_parcela_id);
      if (escopo === "esta_e_futuras") {
        // parcela_atual é mais confiável que a data, que o usuário pode ter editado.
        consulta =
          transacao.parcela_atual != null
            ? consulta.gte("parcela_atual", transacao.parcela_atual)
            : consulta.gte("data", transacao.data);
      }
    }

    const { data, error } = await consulta.select("id");

    if (error) {
      setErro(mensagemDeErroBanco(error.message));
      return;
    }

    onExcluido((data ?? []).map((d) => d.id));
  }

  const { executar, executando } = useAcaoUnica(confirmar);

  return (
    <Modal aberto onFechar={onFechar} titulo="Excluir parcelamento">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-muted">
          <span className="text-text">{base}</span>
          {transacao.parcela_atual && transacao.parcela_total && (
            <> — parcela {transacao.parcela_atual}/{transacao.parcela_total}</>
          )}
          , {formatarMoeda(transacao.valor)} em {formatarData(transacao.data)}.
        </p>

        <SeletorEscopo escopo={escopo} onChange={setEscopo} quantidades={quantidades} />

        <p className="text-xs text-text-muted">
          Isso não tem como desfazer. Se a intenção era só trocar a conta ou a categoria,
          feche aqui e use o lápis de editar — lá dá para aplicar a mudança ao parcelamento
          inteiro.
        </p>

        {erro && (
          <p role="alert" className="text-sm text-brick">
            {erro}
          </p>
        )}

        <div className="flex gap-2">
          <Button variant="secondary" onClick={onFechar} className="flex-1">
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => executar()}
            disabled={executando}
            className="flex-1"
          >
            {executando
              ? "Excluindo..."
              : `Excluir ${quantidades[escopo]} lançamento(s)`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ModalEdicao({
  transacao,
  serie,
  escopoInicial,
  contas,
  categorias,
  onFechar,
  onSalvo,
}: {
  transacao: Transacao;
  serie: Transacao[];
  escopoInicial: EscopoParcelas;
  contas: Conta[];
  categorias: Categoria[];
  onFechar: () => void;
  onSalvo: (atualizadas: Transacao[]) => void;
}) {
  const supabase = createClient();
  const ehParcelada = Boolean(transacao.grupo_parcela_id);

  const [escopo, setEscopo] = useState<EscopoParcelas>(ehParcelada ? escopoInicial : "esta");
  const [tipo, setTipo] = useState<TipoLancamento>(transacao.tipo);
  const [valor, setValor] = useState(String(transacao.valor).replace(".", ","));
  const [descricao, setDescricao] = useState(
    ehParcelada ? descricaoBase(transacao.descricao) : transacao.descricao ?? ""
  );
  const [data, setData] = useState(transacao.data);
  const [contaId, setContaId] = useState(transacao.conta_id);
  const [categoriaId, setCategoriaId] = useState(transacao.categoria_id);
  const [erro, setErro] = useState<string | null>(null);

  const categoriasFiltradas = categorias.filter((c) => c.tipo === tipo);
  const quantidades = useMemo(() => contarPorEscopo(serie, transacao), [serie, transacao]);
  const descricaoOriginal = ehParcelada
    ? descricaoBase(transacao.descricao)
    : transacao.descricao ?? "";

  async function salvar() {
    setErro(null);

    const valorValidado = validarValorMonetario(valor);
    if (!valorValidado.ok) return setErro(valorValidado.erro!);
    if (!ehDataISOValida(data)) return setErro("Informe uma data válida.");
    if (!contaId) return setErro("Escolha uma conta.");
    if (!categoriaId) return setErro("Escolha uma categoria.");

    const camposComuns = {
      tipo,
      valor: valorValidado.valor,
      conta_id: contaId,
      categoria_id: categoriaId,
    };

    // Escopo "esta" (ou lançamento avulso): uma linha só, com data e descrição.
    if (escopo === "esta" || !transacao.grupo_parcela_id) {
      const { data: atualizada, error } = await supabase
        .from("transacoes")
        .update({
          ...camposComuns,
          data,
          descricao: montarDescricao(descricao, transacao),
        })
        .eq("id", transacao.id)
        .select()
        .single();

      if (error || !atualizada) return setErro(mensagemDeErroBanco(error?.message));
      return onSalvo([atualizada as Transacao]);
    }

    // Escopos que pegam mais de uma parcela: os campos comuns vão numa única
    // consulta, filtrando pelo grupo direto no banco — assim funciona mesmo
    // que nem todas as parcelas estejam carregadas na tela.
    let consulta = supabase
      .from("transacoes")
      .update(camposComuns)
      .eq("grupo_parcela_id", transacao.grupo_parcela_id);

    if (escopo === "esta_e_futuras") {
      consulta =
        transacao.parcela_atual != null
          ? consulta.gte("parcela_atual", transacao.parcela_atual)
          : consulta.gte("data", transacao.data);
    }

    const { data: atualizadas, error } = await consulta.select();

    if (error || !atualizadas) return setErro(mensagemDeErroBanco(error?.message));

    let linhas = atualizadas as Transacao[];

    // A data e a descrição são próprias de cada parcela: a data só muda na
    // parcela selecionada, e a descrição é regravada com o "(n/total)" certo.
    const mudouDescricao = descricao.trim() !== descricaoOriginal;
    const mudouData = data !== transacao.data;

    if (mudouDescricao || mudouData) {
      const ajustes = await Promise.all(
        linhas.map(async (linha) => {
          const campos: Record<string, string | null> = {};
          if (mudouDescricao) campos.descricao = montarDescricao(descricao, linha);
          if (mudouData && linha.id === transacao.id) campos.data = data;
          if (Object.keys(campos).length === 0) return linha;

          const { data: ajustada } = await supabase
            .from("transacoes")
            .update(campos)
            .eq("id", linha.id)
            .select()
            .single();
          return (ajustada as Transacao) ?? linha;
        })
      );
      linhas = ajustes;
    }

    onSalvo(linhas);
  }

  const { executar, executando } = useAcaoUnica(salvar);

  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo={ehParcelada ? "Editar parcelamento" : "Editar lançamento"}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          executar();
        }}
        className="flex flex-col gap-4"
      >
        {ehParcelada && (
          <>
            <p className="text-xs text-text-muted">
              Este lançamento faz parte de um parcelamento de{" "}
              {transacao.parcela_total ?? quantidades.todas}x. Para trocar a conta ou a
              categoria de tudo de uma vez, escolha &quot;Todas as parcelas&quot; abaixo.
            </p>
            <SeletorEscopo escopo={escopo} onChange={setEscopo} quantidades={quantidades} />
            {escopo !== "esta" && (
              <p className="text-xs text-text-muted">
                Valor, tipo, conta e categoria vão para as {quantidades[escopo]} parcelas
                do escopo. A data muda só nesta parcela — as outras seguem no mês delas.
              </p>
            )}
          </>
        )}

        <div className="flex rounded-sm border border-hairline p-1">
          {(["despesa", "receita"] as const).map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => {
                setTipo(opcao);
                const aindaVale = categorias.some(
                  (c) => c.id === categoriaId && c.tipo === opcao
                );
                if (!aindaVale) setCategoriaId("");
              }}
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
          label={ehParcelada ? "Valor de cada parcela" : "Valor"}
          inputMode="decimal"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          required
        />
        <Input
          label={ehParcelada ? "Descrição (sem o número da parcela)" : "Descrição"}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          maxLength={140}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-muted" htmlFor="editar-categoria">
            Categoria
          </label>
          <select
            id="editar-categoria"
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            className="rounded-sm border border-hairline bg-surface px-3 py-2.5 text-text focus:border-gold focus:outline-none"
            required
          >
            <option value="">Selecione...</option>
            {categoriasFiltradas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-muted" htmlFor="editar-conta">
            Conta
          </label>
          <select
            id="editar-conta"
            value={contaId}
            onChange={(e) => setContaId(e.target.value)}
            className="rounded-sm border border-hairline bg-surface px-3 py-2.5 text-text focus:border-gold focus:outline-none"
            required
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
          label={ehParcelada ? "Data desta parcela" : "Data"}
          value={data}
          onChange={(e) => setData(e.target.value)}
          required
        />

        {erro && (
          <p role="alert" className="text-sm text-brick">
            {erro}
          </p>
        )}

        <Button type="submit" disabled={executando} className="mt-1 w-full">
          {executando ? "Salvando..." : "Salvar alterações"}
        </Button>
      </form>
    </Modal>
  );
}

/** Regrava a descrição mantendo o "(n/total)" quando a linha é uma parcela. */
function montarDescricao(base: string, linha: Transacao): string | null {
  const texto = base.trim();
  if (linha.parcela_atual && linha.parcela_total) {
    return descricaoDaParcela(texto, linha.parcela_atual, linha.parcela_total);
  }
  return texto || null;
}
