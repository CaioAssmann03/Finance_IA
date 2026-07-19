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
import { Plus, Trash2, Pencil, Wallet, CreditCard, Banknote, PiggyBank } from "lucide-react";
import Link from "next/link";

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

interface CamposConta {
  nome: string;
  tipo: TipoConta;
  saldoInicial: string;
  diaFechamento: string;
  diaVencimento: string;
}

function CamposFormularioConta({
  campos,
  onChange,
}: {
  campos: CamposConta;
  onChange: (campos: CamposConta) => void;
}) {
  return (
    <>
      <Input
        label="Nome"
        placeholder="Ex: Nubank, Carteira, Itaú"
        value={campos.nome}
        onChange={(e) => onChange({ ...campos, nome: e.target.value })}
        required
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-text-muted">Tipo</label>
        <select
          value={campos.tipo}
          onChange={(e) => onChange({ ...campos, tipo: e.target.value as TipoConta })}
          className="rounded-sm border border-hairline bg-surface px-3 py-2.5 text-text focus:border-gold focus:outline-none"
        >
          <option value="corrente">Conta corrente</option>
          <option value="poupanca">Poupança</option>
          <option value="dinheiro">Dinheiro</option>
          <option value="cartao_credito">Cartão de crédito</option>
        </select>
      </div>

      <Input
        label="Saldo inicial"
        inputMode="decimal"
        placeholder="0,00"
        value={campos.saldoInicial}
        onChange={(e) => onChange({ ...campos, saldoInicial: e.target.value })}
      />

      {campos.tipo === "cartao_credito" && (
        <div className="flex gap-3">
          <Input
            label="Dia de fechamento"
            inputMode="numeric"
            placeholder="Ex: 25"
            value={campos.diaFechamento}
            onChange={(e) => onChange({ ...campos, diaFechamento: e.target.value })}
          />
          <Input
            label="Dia de vencimento"
            inputMode="numeric"
            placeholder="Ex: 5"
            value={campos.diaVencimento}
            onChange={(e) => onChange({ ...campos, diaVencimento: e.target.value })}
          />
        </div>
      )}
    </>
  );
}

export function ContasCliente({ contasIniciais }: { contasIniciais: Conta[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [contas, setContas] = useState(contasIniciais);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Conta | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [campos, setCampos] = useState<CamposConta>({
    nome: "",
    tipo: "corrente",
    saldoInicial: "",
    diaFechamento: "",
    diaVencimento: "",
  });

  function limparFormulario() {
    setCampos({
      nome: "",
      tipo: "corrente",
      saldoInicial: "",
      diaFechamento: "",
      diaVencimento: "",
    });
    setErro(null);
  }

  async function criarConta(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!campos.nome.trim()) {
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
        nome: campos.nome.trim(),
        tipo: campos.tipo,
        saldo_inicial: Number(campos.saldoInicial.replace(",", ".")) || 0,
        dia_fechamento:
          campos.tipo === "cartao_credito" && campos.diaFechamento
            ? Number(campos.diaFechamento)
            : null,
        dia_vencimento:
          campos.tipo === "cartao_credito" && campos.diaVencimento
            ? Number(campos.diaVencimento)
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

  function atualizarNaLista(atualizada: Conta) {
    setContas((atual) => atual.map((c) => (c.id === atualizada.id ? atualizada : c)));
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
              <Card key={conta.id} interativo className="relative">
                <div className="absolute right-4 top-4 flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setEditando(conta);
                    }}
                    className="text-text-muted hover:text-gold"
                    aria-label="Editar conta"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      excluirConta(conta.id);
                    }}
                    className="text-text-muted hover:text-brick"
                    aria-label="Excluir conta"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <Link href={`/contas/${conta.id}`} className="block">
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
                </Link>
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
          <CamposFormularioConta campos={campos} onChange={setCampos} />

          {erro && <p className="text-sm text-brick">{erro}</p>}

          <Button type="submit" disabled={salvando} className="mt-1 w-full">
            {salvando ? "Salvando..." : "Criar conta"}
          </Button>
        </form>
      </Modal>

      {editando && (
        <ModalEdicaoConta
          conta={editando}
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

function ModalEdicaoConta({
  conta,
  onFechar,
  onSalvo,
}: {
  conta: Conta;
  onFechar: () => void;
  onSalvo: (c: Conta) => void;
}) {
  const supabase = createClient();
  const [campos, setCampos] = useState<CamposConta>({
    nome: conta.nome,
    tipo: conta.tipo,
    saldoInicial: String(conta.saldo_inicial),
    diaFechamento: conta.dia_fechamento ? String(conta.dia_fechamento) : "",
    diaVencimento: conta.dia_vencimento ? String(conta.dia_vencimento) : "",
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!campos.nome.trim()) {
      setErro("Dê um nome para a conta.");
      return;
    }

    setSalvando(true);

    const { data, error } = await supabase
      .from("contas")
      .update({
        nome: campos.nome.trim(),
        tipo: campos.tipo,
        saldo_inicial: Number(campos.saldoInicial.replace(",", ".")) || 0,
        dia_fechamento:
          campos.tipo === "cartao_credito" && campos.diaFechamento
            ? Number(campos.diaFechamento)
            : null,
        dia_vencimento:
          campos.tipo === "cartao_credito" && campos.diaVencimento
            ? Number(campos.diaVencimento)
            : null,
      })
      .eq("id", conta.id)
      .select()
      .single();

    setSalvando(false);

    if (error || !data) {
      setErro("Não foi possível salvar as alterações.");
      return;
    }

    onSalvo(data as Conta);
  }

  return (
    <Modal aberto onFechar={onFechar} titulo="Editar conta">
      <form onSubmit={salvar} className="flex flex-col gap-4">
        <CamposFormularioConta campos={campos} onChange={setCampos} />

        {erro && <p className="text-sm text-brick">{erro}</p>}

        <Button type="submit" disabled={salvando} className="mt-1 w-full">
          {salvando ? "Salvando..." : "Salvar alterações"}
        </Button>
      </form>
    </Modal>
  );
}
