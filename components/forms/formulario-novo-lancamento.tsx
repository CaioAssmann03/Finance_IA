"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Conta, Categoria, TipoLancamento } from "@/types/database";
import clsx from "clsx";

export function FormularioNovoLancamento({
  contas,
  categorias,
}: {
  contas: Conta[];
  categorias: Categoria[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [tipo, setTipo] = useState<TipoLancamento>("despesa");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [contaId, setContaId] = useState(contas[0]?.id ?? "");
  const [categoriaId, setCategoriaId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const categoriasFiltradas = categorias.filter((c) => c.tipo === tipo);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!contaId || !categoriaId || !valor) {
      setErro("Preencha valor, conta e categoria.");
      return;
    }

    setSalvando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("transacoes").insert({
      user_id: user!.id,
      conta_id: contaId,
      categoria_id: categoriaId,
      tipo,
      valor: Number(valor.replace(",", ".")),
      descricao,
      data,
    });

    setSalvando(false);

    if (error) {
      setErro("Não foi possível salvar. Tente novamente.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4">
      {/* Tipo: receita ou despesa */}
      <div className="flex rounded-sm border border-hairline p-1">
        {(["despesa", "receita"] as const).map((opcao) => (
          <button
            key={opcao}
            type="button"
            onClick={() => {
              setTipo(opcao);
              setCategoriaId("");
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
        id="valor"
        label="Valor"
        inputMode="decimal"
        placeholder="0,00"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        required
      />

      <Input
        id="descricao"
        label="Descrição"
        placeholder="Ex: Mercado do mês"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-text-muted">Categoria</label>
        <select
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
        <label className="text-sm text-text-muted">Conta</label>
        <select
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
        id="data"
        type="date"
        label="Data"
        value={data}
        onChange={(e) => setData(e.target.value)}
        required
      />

      {erro && <p className="text-sm text-brick">{erro}</p>}

      <Button type="submit" disabled={salvando} className="mt-2 w-full">
        {salvando ? "Salvando..." : "Salvar lançamento"}
      </Button>
    </form>
  );
}
