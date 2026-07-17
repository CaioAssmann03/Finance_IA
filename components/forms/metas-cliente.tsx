"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { formatarMoeda, formatarData } from "@/lib/utils/formatters";
import type { Meta } from "@/types/database";
import { Plus, Trash2, PiggyBank } from "lucide-react";
import clsx from "clsx";

export function MetasCliente({ metasIniciais }: { metasIniciais: Meta[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [metas, setMetas] = useState(metasIniciais);
  const [modalNovaAberto, setModalNovaAberto] = useState(false);
  const [metaAporte, setMetaAporte] = useState<Meta | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [valorAlvo, setValorAlvo] = useState("");
  const [dataAlvo, setDataAlvo] = useState("");

  async function criarMeta(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!nome.trim() || !valorAlvo) {
      setErro("Preencha o nome e o valor da meta.");
      return;
    }

    setSalvando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("metas")
      .insert({
        user_id: user!.id,
        nome: nome.trim(),
        valor_alvo: Number(valorAlvo.replace(",", ".")),
        valor_atual: 0,
        data_alvo: dataAlvo || null,
      })
      .select()
      .single();

    setSalvando(false);

    if (error || !data) {
      setErro("Não foi possível criar a meta.");
      return;
    }

    setMetas((atual) => [...atual, data as Meta]);
    setNome("");
    setValorAlvo("");
    setDataAlvo("");
    setModalNovaAberto(false);
    router.refresh();
  }

  async function excluirMeta(id: string) {
    if (!confirm("Excluir esta meta?")) return;
    const { error } = await supabase.from("metas").delete().eq("id", id);
    if (!error) {
      setMetas((atual) => atual.filter((m) => m.id !== id));
      router.refresh();
    }
  }

  function atualizarNaLista(atualizada: Meta) {
    setMetas((atual) =>
      atual.map((m) => (m.id === atualizada.id ? atualizada : m))
    );
  }

  return (
    <div className="px-5 md:px-8">
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setModalNovaAberto(true)}>
          <Plus size={16} />
          Nova meta
        </Button>
      </div>

      {metas.length === 0 ? (
        <div className="rounded-md border border-dashed border-hairline p-10 text-center text-sm text-text-muted">
          Nenhuma meta cadastrada. Que tal começar uma reserva de emergência
          ou juntar para uma viagem?
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metas.map((meta) => {
            const percentual =
              meta.valor_alvo > 0
                ? (meta.valor_atual / meta.valor_alvo) * 100
                : 0;
            const concluida = percentual >= 100;
            return (
              <Card key={meta.id} className="relative">
                <button
                  onClick={() => excluirMeta(meta.id)}
                  className="absolute right-4 top-4 text-text-muted hover:text-brick"
                  aria-label="Excluir meta"
                >
                  <Trash2 size={16} />
                </button>

                <PiggyBank size={20} className="text-gold" strokeWidth={1.75} />
                <p className="mt-3 font-medium">{meta.nome}</p>
                {meta.data_alvo && (
                  <p className="text-xs text-text-muted">
                    Até {formatarData(meta.data_alvo)}
                  </p>
                )}

                <p className="mt-3 font-[family-name:var(--font-numeric)] text-xl">
                  {formatarMoeda(meta.valor_atual)}
                  <span className="text-sm text-text-muted">
                    {" "}
                    / {formatarMoeda(meta.valor_alvo)}
                  </span>
                </p>

                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={clsx(
                      "h-full rounded-full transition-all",
                      concluida ? "bg-sage" : "bg-gold"
                    )}
                    style={{ width: `${Math.min(percentual, 100)}%` }}
                  />
                </div>

                {concluida ? (
                  <p className="mt-2 text-xs text-sage">Meta concluída! 🎉</p>
                ) : (
                  <Button
                    variant="secondary"
                    className="mt-3 w-full"
                    onClick={() => setMetaAporte(meta)}
                  >
                    Adicionar valor
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        aberto={modalNovaAberto}
        onFechar={() => setModalNovaAberto(false)}
        titulo="Nova meta"
      >
        <form onSubmit={criarMeta} className="flex flex-col gap-4">
          <Input
            label="Nome"
            placeholder="Ex: Reserva de emergência"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
          <Input
            label="Valor alvo"
            inputMode="decimal"
            placeholder="0,00"
            value={valorAlvo}
            onChange={(e) => setValorAlvo(e.target.value)}
            required
          />
          <Input
            type="date"
            label="Data alvo (opcional)"
            value={dataAlvo}
            onChange={(e) => setDataAlvo(e.target.value)}
          />

          {erro && <p className="text-sm text-brick">{erro}</p>}

          <Button type="submit" disabled={salvando} className="mt-1 w-full">
            {salvando ? "Salvando..." : "Criar meta"}
          </Button>
        </form>
      </Modal>

      {metaAporte && (
        <ModalAporte
          meta={metaAporte}
          onFechar={() => setMetaAporte(null)}
          onSalvo={(m) => {
            atualizarNaLista(m);
            setMetaAporte(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ModalAporte({
  meta,
  onFechar,
  onSalvo,
}: {
  meta: Meta;
  onFechar: () => void;
  onSalvo: (m: Meta) => void;
}) {
  const supabase = createClient();
  const [valor, setValor] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const numero = Number(valor.replace(",", "."));
    if (!numero || numero <= 0) {
      setErro("Informe um valor válido.");
      return;
    }

    setSalvando(true);

    const { data, error } = await supabase
      .from("metas")
      .update({ valor_atual: meta.valor_atual + numero })
      .eq("id", meta.id)
      .select()
      .single();

    setSalvando(false);

    if (error || !data) {
      setErro("Não foi possível salvar.");
      return;
    }

    onSalvo(data as Meta);
  }

  return (
    <Modal aberto onFechar={onFechar} titulo={`Adicionar valor — ${meta.nome}`}>
      <form onSubmit={salvar} className="flex flex-col gap-4">
        <p className="text-sm text-text-muted">
          Já juntado: {formatarMoeda(meta.valor_atual)} de{" "}
          {formatarMoeda(meta.valor_alvo)}
        </p>
        <Input
          label="Valor a adicionar"
          inputMode="decimal"
          placeholder="0,00"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          required
          autoFocus
        />
        {erro && <p className="text-sm text-brick">{erro}</p>}
        <Button type="submit" disabled={salvando} className="mt-1 w-full">
          {salvando ? "Salvando..." : "Adicionar"}
        </Button>
      </form>
    </Modal>
  );
}
