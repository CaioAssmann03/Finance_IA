"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { formatarMoeda } from "@/lib/utils/formatters";
import { useAcaoUnica } from "@/lib/hooks/use-acao-unica";
import { paraNumeroMoeda } from "@/lib/utils/valores";
import { mensagemDeErroBanco } from "@/lib/utils/erros-banco";
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

/** Valida os campos comuns ao criar e ao editar uma conta, devolvendo os
 * valores já convertidos para não repetir o parse em dois lugares. */
function validarCampos(campos: CamposConta):
  | { ok: true; saldoInicial: number; diaFechamento: number | null; diaVencimento: number | null }
  | { ok: false; erro: string } {
  if (!campos.nome.trim()) return { ok: false, erro: "Dê um nome para a conta." };

  // Saldo inicial pode ser negativo (cheque especial, fatura em aberto).
  const saldoInicial = campos.saldoInicial.trim() ? paraNumeroMoeda(campos.saldoInicial) : 0;
  if (saldoInicial === null)
    return { ok: false, erro: "O saldo inicial precisa ser um número." };

  const ehCartao = campos.tipo === "cartao_credito";
  const diaFechamento = ehCartao && campos.diaFechamento ? Number(campos.diaFechamento) : null;
  const diaVencimento = ehCartao && campos.diaVencimento ? Number(campos.diaVencimento) : null;

  for (const dia of [diaFechamento, diaVencimento]) {
    if (dia !== null && (!Number.isInteger(dia) || dia < 1 || dia > 31))
      return { ok: false, erro: "Os dias de fechamento e vencimento vão de 1 a 31." };
  }

  return { ok: true, saldoInicial, diaFechamento, diaVencimento };
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

  async function criarConta() {
    setErro(null);

    const validacao = validarCampos(campos);
    if (!validacao.ok) return setErro(validacao.erro);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return setErro("Sua sessão expirou. Entre de novo para continuar.");

    const { data, error } = await supabase
      .from("contas")
      .insert({
        user_id: user.id,
        nome: campos.nome.trim(),
        tipo: campos.tipo,
        saldo_inicial: validacao.saldoInicial,
        dia_fechamento: validacao.diaFechamento,
        dia_vencimento: validacao.diaVencimento,
      })
      .select()
      .single();

    if (error || !data) return setErro(mensagemDeErroBanco(error?.message));

    setContas((atual) => [...atual, data as Conta]);
    limparFormulario();
    setModalAberto(false);
    router.refresh();
  }

  const { executar: salvarConta, executando: salvando } = useAcaoUnica(criarConta);

  async function excluirConta(id: string) {
    // contas.id tem "on delete cascade" nas transações: apagar a conta apaga
    // junto todo o histórico lançado nela. O aviso anterior dizia o contrário.
    if (
      !confirm(
        "Excluir esta conta? Todos os lançamentos feitos nela também serão apagados."
      )
    ) {
      return;
    }
    const { error } = await supabase.from("contas").delete().eq("id", id);
    if (error) {
      alert(mensagemDeErroBanco(error.message));
      return;
    }
    setContas((atual) => atual.filter((c) => c.id !== id));
    router.refresh();
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            salvarConta();
          }}
          className="flex flex-col gap-4"
        >
          <CamposFormularioConta campos={campos} onChange={setCampos} />

          {erro && (
            <p role="alert" className="text-sm text-brick">
              {erro}
            </p>
          )}

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
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setErro(null);

    const validacao = validarCampos(campos);
    if (!validacao.ok) return setErro(validacao.erro);

    const { data, error } = await supabase
      .from("contas")
      .update({
        nome: campos.nome.trim(),
        tipo: campos.tipo,
        saldo_inicial: validacao.saldoInicial,
        dia_fechamento: validacao.diaFechamento,
        dia_vencimento: validacao.diaVencimento,
      })
      .eq("id", conta.id)
      .select()
      .single();

    if (error || !data) return setErro(mensagemDeErroBanco(error?.message));

    onSalvo(data as Conta);
  }

  const { executar, executando: salvando } = useAcaoUnica(salvar);

  return (
    <Modal aberto onFechar={onFechar} titulo="Editar conta">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          executar();
        }}
        className="flex flex-col gap-4"
      >
        <CamposFormularioConta campos={campos} onChange={setCampos} />

        {erro && (
          <p role="alert" className="text-sm text-brick">
            {erro}
          </p>
        )}

        <Button type="submit" disabled={salvando} className="mt-1 w-full">
          {salvando ? "Salvando..." : "Salvar alterações"}
        </Button>
      </form>
    </Modal>
  );
}
