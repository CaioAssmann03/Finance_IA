"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { formatarMoeda } from "@/lib/utils/formatters";
import type { Conta, TipoConta } from "@/types/database";
import { Plus, Trash2, Wallet, CreditCard, Banknote, PiggyBank } from "lucide-react";

const ICONES_TIPO: Record<TipoConta, typeof Wallet> = {
  corrente: Wallet,
  poupanca: PiggyBank,
  dinheiro: Banknote,
  cartao_credito: CreditCard,
};

const LABEL_TIPO: Record<TipoConta, string> = {
  corrente: "Conta corrente",
  poupanca: "Poupança",
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão de crédito",
};

export function ContasCliente({ contasIniciais }: { contasIniciais: Conta[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [contas, setContas] = useState(contasIniciais);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoConta>("corrente");
  const [saldoInicial, setSaldoInicial] = useState("");
  const [diaFechamento, setDiaFechamento] = useState("");
  const [diaVencimento, setDiaVencimento] = useState("");

  function limparFormulario() {
    setNome("");
    setTipo("corrente");
    setSaldoInicial("");
    setDiaFechamento("");
    setDiaVencimento("");
    setErro(null);
  }

  async function criarConta(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!nome.trim()) {
      setErro("Dê um nome para a conta.");
      return;
    }

    setSalvando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("contas")
      .insert({
        user_id: user!.id,
        nome: nome.trim(),
        tipo,
        saldo_inicial: Number(saldoInicial.replace(",", ".")) || 0,
        dia_fechamento:
          tipo === "cartao_credito" && diaFechamento
            ? Number(diaFechamento)
            : null,
        dia_vencimento:
          tipo === "cartao_credito" && diaVencimento
            ? Number(diaVencimento)
            : null,
      })
      .select()
      .single();

    setSalvando(false);

    if (error || !data) {
      setErro("Não foi possível criar a conta.");
      return;
    }

    setContas((atual) => [...atual, data as Conta]);
    limparFormulario();
    setModalAberto(false);
    router.refresh();
  }

  async function excluirConta(id: string) {
    if (!confirm("Excluir esta conta? As transações associadas continuam existindo.")) {
      return;
    }
    const { error } = await supabase.from("contas").delete().eq("id", id);
    if (!error) {
      setContas((atual) => atual.filter((c) => c.id !== id));
      router.refresh();
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end px-5 md:px-8">
        <Button onClick={() => setModalAberto(true)}>
          <Plus size={16} />
          Nova conta
        </Button>
      </div>

      {contas.length === 0 ? (
        <div className="mx-5 rounded-md border border-dashed border-hairline p-10 text-center text-sm text-text-muted md:mx-8">
          Você ainda não tem nenhuma conta. Cadastre a primeira — pode ser sua
          conta corrente, carteira ou cartão de crédito.
        </div>
      ) : (
        <div className="grid gap-4 px-5 sm:grid-cols-2 md:px-8 lg:grid-cols-3">
          {contas.map((conta) => {
            const Icone = ICONES_TIPO[conta.tipo];
            return (
              <Card key={conta.id} className="relative">
                <button
                  onClick={() => excluirConta(conta.id)}
                  className="absolute right-4 top-4 text-text-muted hover:text-brick"
                  aria-label="Excluir conta"
                >
                  <Trash2 size={16} />
                </button>
                <Icone size={20} className="text-gold" strokeWidth={1.75} />
                <p className="mt-3 font-medium">{conta.nome}</p>
                <p className="text-xs text-text-muted">
                  {LABEL_TIPO[conta.tipo]}
                </p>
                <p className="mt-3 font-[family-name:var(--font-numeric)] text-xl">
                  {formatarMoeda(conta.saldo_inicial)}
                </p>
                {conta.tipo === "cartao_credito" && (
                  <p className="mt-1 text-xs text-text-muted">
                    Fecha dia {conta.dia_fechamento} · Vence dia{" "}
                    {conta.dia_vencimento}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        titulo="Nova conta"
      >
        <form onSubmit={criarConta} className="flex flex-col gap-4">
          <Input
            id="nome"
            label="Nome"
            placeholder="Ex: Nubank, Carteira, Itaú"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-muted">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoConta)}
              className="rounded-sm border border-hairline bg-surface px-3 py-2.5 text-text focus:border-gold focus:outline-none"
            >
              <option value="corrente">Conta corrente</option>
              <option value="poupanca">Poupança</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao_credito">Cartão de crédito</option>
            </select>
          </div>

          <Input
            id="saldo"
            label="Saldo inicial"
            inputMode="decimal"
            placeholder="0,00"
            value={saldoInicial}
            onChange={(e) => setSaldoInicial(e.target.value)}
          />

          {tipo === "cartao_credito" && (
            <div className="flex gap-3">
              <Input
                id="fechamento"
                label="Dia de fechamento"
                inputMode="numeric"
                placeholder="Ex: 25"
                value={diaFechamento}
                onChange={(e) => setDiaFechamento(e.target.value)}
              />
              <Input
                id="vencimento"
                label="Dia de vencimento"
                inputMode="numeric"
                placeholder="Ex: 5"
                value={diaVencimento}
                onChange={(e) => setDiaVencimento(e.target.value)}
              />
            </div>
          )}

          {erro && <p className="text-sm text-brick">{erro}</p>}

          <Button type="submit" disabled={salvando} className="mt-1 w-full">
            {salvando ? "Salvando..." : "Criar conta"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
