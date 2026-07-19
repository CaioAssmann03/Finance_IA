"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { SeletorCor } from "@/components/ui/seletor-cor";
import { CATEGORIAS_PADRAO } from "@/lib/categorias-padrao";
import { PALETA_CATEGORIAS, corParaNovaCategoria } from "@/lib/paleta-categorias";
import { iconeDaCategoria } from "@/lib/icones-categorias";
import { mesReferenciaAtual } from "@/lib/utils/mes-referencia";
import type { Categoria, Orcamento, TipoLancamento } from "@/types/database";
import { Plus, Trash2, Sparkles, Pencil, Palette } from "lucide-react";
import clsx from "clsx";

export function CategoriasCliente({
  categoriasIniciais,
  orcamentosIniciais,
}: {
  categoriasIniciais: Categoria[];
  orcamentosIniciais: Orcamento[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [categorias, setCategorias] = useState(categoriasIniciais);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [criandoPadrao, setCriandoPadrao] = useState(false);
  const [recolorindo, setRecolorindo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoLancamento>("despesa");

  async function criarCategoriasPadrao() {
    setCriandoPadrao(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const registros = CATEGORIAS_PADRAO.map((c) => ({
      user_id: user!.id,
      nome: c.nome,
      tipo: c.tipo,
      icone: c.icone,
      cor: c.cor,
    }));

    const { data, error } = await supabase
      .from("categorias")
      .insert(registros)
      .select();

    setCriandoPadrao(false);

    if (!error && data) {
      setCategorias((atual) => [...atual, ...(data as Categoria[])]);
      router.refresh();
    }
  }

  async function recolorirTodas() {
    if (
      !confirm(
        "Isso vai trocar a cor de todas as suas categorias pela nova paleta, sem repetir cores entre elas. Continuar?"
      )
    )
      return;

    setRecolorindo(true);

    const atualizadas = categorias.map((cat, i) => ({
      ...cat,
      cor: PALETA_CATEGORIAS[i % PALETA_CATEGORIAS.length],
    }));

    await Promise.all(
      atualizadas.map((cat) =>
        supabase.from("categorias").update({ cor: cat.cor }).eq("id", cat.id)
      )
    );

    setCategorias(atualizadas);
    setRecolorindo(false);
    router.refresh();
  }

  async function criarCategoria(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!nome.trim()) {
      setErro("Dê um nome para a categoria.");
      return;
    }

    setSalvando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("categorias")
      .insert({
        user_id: user!.id,
        nome: nome.trim(),
        tipo,
        cor: corParaNovaCategoria(categorias.map((c) => c.cor)),
      })
      .select()
      .single();

    setSalvando(false);

    if (error || !data) {
      setErro("Não foi possível criar a categoria.");
      return;
    }

    setCategorias((atual) => [...atual, data as Categoria]);
    setNome("");
    setModalAberto(false);
    router.refresh();
  }

  async function excluirCategoria(id: string) {
    if (!confirm("Excluir esta categoria?")) return;
    const { error } = await supabase.from("categorias").delete().eq("id", id);
    if (!error) {
      setCategorias((atual) => atual.filter((c) => c.id !== id));
      router.refresh();
    } else {
      alert("Não foi possível excluir — existem transações usando essa categoria.");
    }
  }

  function atualizarNaLista(atualizada: Categoria) {
    setCategorias((atual) =>
      atual.map((c) => (c.id === atualizada.id ? atualizada : c))
    );
  }

  const despesas = categorias.filter((c) => c.tipo === "despesa");
  const receitas = categorias.filter((c) => c.tipo === "receita");

  return (
    <div className="px-5 md:px-8">
      <div className="mb-6 flex flex-wrap gap-3">
        <Button onClick={() => setModalAberto(true)}>
          <Plus size={16} />
          Nova categoria
        </Button>
        {categorias.length === 0 && (
          <Button
            variant="secondary"
            onClick={criarCategoriasPadrao}
            disabled={criandoPadrao}
          >
            <Sparkles size={16} />
            {criandoPadrao ? "Criando..." : "Usar categorias padrão"}
          </Button>
        )}
        {categorias.length > 0 && (
          <Button variant="ghost" onClick={recolorirTodas} disabled={recolorindo}>
            <Palette size={16} />
            {recolorindo ? "Recolorindo..." : "Recolorir com a paleta nova"}
          </Button>
        )}
      </div>

      {categorias.length === 0 ? (
        <div className="rounded-md border border-dashed border-hairline p-10 text-center text-sm text-text-muted">
          Nenhuma categoria ainda. Use o botão &quot;Usar categorias
          padrão&quot; para começar rápido, ou crie as suas do zero.
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2">
            <ListaCategorias
              titulo="Despesas"
              itens={despesas}
              onExcluir={excluirCategoria}
              onEditar={setEditando}
            />
            <ListaCategorias
              titulo="Receitas"
              itens={receitas}
              onExcluir={excluirCategoria}
              onEditar={setEditando}
            />
          </div>

          {despesas.length > 0 && (
            <div className="mt-8">
              <OrcamentoMensal
                categoriasDespesa={despesas}
                orcamentosIniciais={orcamentosIniciais}
              />
            </div>
          )}
        </>
      )}

      <Modal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        titulo="Nova categoria"
      >
        <form onSubmit={criarCategoria} className="flex flex-col gap-4">
          <Input
            id="nome-categoria"
            label="Nome"
            placeholder="Ex: Viagens"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />

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

          {erro && <p className="text-sm text-brick">{erro}</p>}

          <Button type="submit" disabled={salvando} className="mt-1 w-full">
            {salvando ? "Salvando..." : "Criar categoria"}
          </Button>
        </form>
      </Modal>

      {editando && (
        <ModalEdicaoCategoria
          categoria={editando}
          onFechar={() => setEditando(null)}
          onSalvo={(c) => {
            atualizarNaLista(c);
            setEditando(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ModalEdicaoCategoria({
  categoria,
  onFechar,
  onSalvo,
}: {
  categoria: Categoria;
  onFechar: () => void;
  onSalvo: (c: Categoria) => void;
}) {
  const supabase = createClient();
  const [nome, setNome] = useState(categoria.nome);
  const [cor, setCor] = useState(categoria.cor);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!nome.trim()) {
      setErro("Dê um nome para a categoria.");
      return;
    }

    setSalvando(true);

    const { data, error } = await supabase
      .from("categorias")
      .update({ nome: nome.trim(), cor })
      .eq("id", categoria.id)
      .select()
      .single();

    setSalvando(false);

    if (error || !data) {
      setErro("Não foi possível salvar as alterações.");
      return;
    }

    onSalvo(data as Categoria);
  }

  return (
    <Modal aberto onFechar={onFechar} titulo="Editar categoria">
      <form onSubmit={salvar} className="flex flex-col gap-4">
        <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-muted">Cor</label>
          <SeletorCor valor={cor} onChange={setCor} />
        </div>

        {erro && <p className="text-sm text-brick">{erro}</p>}

        <Button type="submit" disabled={salvando} className="mt-1 w-full">
          {salvando ? "Salvando..." : "Salvar alterações"}
        </Button>
      </form>
    </Modal>
  );
}

function ListaCategorias({
  titulo,
  itens,
  onExcluir,
  onEditar,
}: {
  titulo: string;
  itens: Categoria[];
  onExcluir: (id: string) => void;
  onEditar: (categoria: Categoria) => void;
}) {
  return (
    <div>
      <p className="mb-3 text-xs uppercase tracking-wide text-text-muted">
        {titulo}
      </p>
      {itens.length === 0 ? (
        <p className="text-sm text-text-muted">Nenhuma categoria de {titulo.toLowerCase()}.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline rounded-md border border-hairline">
          {itens.map((cat) => {
            const Icone = iconeDaCategoria(cat.icone);
            return (
              <li
                key={cat.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full"
                    style={{ background: `${cat.cor}26`, color: cat.cor }}
                  >
                    <Icone size={13} strokeWidth={2} />
                  </span>
                  {cat.nome}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onEditar(cat)}
                    className="text-text-muted hover:text-gold"
                    aria-label="Editar categoria"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => onExcluir(cat.id)}
                    className="text-text-muted hover:text-brick"
                    aria-label="Excluir categoria"
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

function OrcamentoMensal({
  categoriasDespesa,
  orcamentosIniciais,
}: {
  categoriasDespesa: Categoria[];
  orcamentosIniciais: Orcamento[];
}) {
  const supabase = createClient();
  const mesReferencia = mesReferenciaAtual();

  const [valores, setValores] = useState<Record<string, string>>(() => {
    const mapa: Record<string, string> = {};
    for (const o of orcamentosIniciais) {
      mapa[o.categoria_id] = String(o.valor_limite);
    }
    return mapa;
  });
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  async function salvarLimite(categoriaId: string) {
    const texto = valores[categoriaId];
    const numero = Number((texto ?? "").replace(",", "."));

    setSalvandoId(categoriaId);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!texto || numero <= 0) {
      await supabase
        .from("orcamentos")
        .delete()
        .eq("categoria_id", categoriaId)
        .eq("mes_referencia", mesReferencia);
      setSalvandoId(null);
      return;
    }

    await supabase.from("orcamentos").upsert(
      {
        user_id: user!.id,
        categoria_id: categoriaId,
        mes_referencia: mesReferencia,
        valor_limite: numero,
      },
      { onConflict: "user_id,categoria_id,mes_referencia" }
    );

    setSalvandoId(null);
  }

  return (
    <div>
      <p className="mb-3 text-xs uppercase tracking-wide text-text-muted">
        Orçamento mensal por categoria
      </p>
      <p className="mb-4 text-sm text-text-muted">
        Defina um limite de gasto para o mês atual. Deixe em branco para não
        ter limite nessa categoria. O progresso aparece no dashboard.
      </p>
      <ul className="flex flex-col divide-y divide-hairline rounded-md border border-hairline">
        {categoriasDespesa.map((cat) => (
          <li
            key={cat.id}
            className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
          >
            <span className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: cat.cor }}
              />
              {cat.nome}
            </span>
            <input
              inputMode="decimal"
              placeholder="Sem limite"
              value={valores[cat.id] ?? ""}
              onChange={(e) =>
                setValores((atual) => ({ ...atual, [cat.id]: e.target.value }))
              }
              onBlur={() => salvarLimite(cat.id)}
              className="w-28 rounded-sm border border-hairline bg-surface px-2 py-1.5 text-right text-sm text-text placeholder:text-text-muted/60 focus:border-gold focus:outline-none"
            />
          </li>
        ))}
      </ul>
      {salvandoId && (
        <p className="mt-2 text-xs text-text-muted">Salvando...</p>
      )}
    </div>
  );
}
