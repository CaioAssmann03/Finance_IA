"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Sparkles } from "lucide-react";
import clsx from "clsx";

interface Mensagem {
  autor: "usuario" | "assistente";
  texto: string;
}

const SUGESTOES = [
  "Quanto gastei esse mês?",
  "Comparado ao mês passado, gastei mais ou menos?",
  "Quais são minhas contas fixas ativas?",
  "Qual categoria eu mais gasto?",
];

export function AssistenteChat() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      autor: "assistente",
      texto:
        "Oi! Pode me perguntar sobre seus gastos deste mês e do mês passado — eu respondo com base nos seus dados reais.",
    },
  ]);
  const [pergunta, setPergunta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  async function enviar(texto: string) {
    if (!texto.trim() || enviando) return;

    setMensagens((atual) => [...atual, { autor: "usuario", texto }]);
    setPergunta("");
    setEnviando(true);

    try {
      const resposta = await fetch("/api/ia/perguntar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta: texto }),
      });
      const dados = await resposta.json();

      setMensagens((atual) => [
        ...atual,
        {
          autor: "assistente",
          texto: resposta.ok
            ? dados.resposta
            : dados.erro ?? "Não foi possível responder agora.",
        },
      ]);
    } catch {
      setMensagens((atual) => [
        ...atual,
        { autor: "assistente", texto: "Não consegui conectar. Tente de novo." },
      ]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-220px)] flex-col px-5 md:px-8">
      <div className="flex-1 overflow-y-auto rounded-md border border-hairline bg-surface p-4">
        <div className="flex flex-col gap-3">
          {mensagens.map((m, i) => (
            <div
              key={i}
              className={clsx(
                "max-w-[85%] rounded-md px-4 py-2.5 text-sm",
                m.autor === "usuario"
                  ? "ml-auto bg-gold text-[var(--on-accent)]"
                  : "flex items-start gap-2 bg-surface-2 text-text"
              )}
            >
              {m.autor === "assistente" && (
                <Sparkles size={14} className="mt-0.5 shrink-0 text-gold" />
              )}
              <span className="whitespace-pre-wrap">{m.texto}</span>
            </div>
          ))}
          {enviando && (
            <div className="flex items-center gap-2 rounded-md bg-surface-2 px-4 py-2.5 text-sm text-text-muted">
              <Sparkles size={14} className="text-gold" />
              Pensando...
            </div>
          )}
          <div ref={fimRef} />
        </div>
      </div>

      {mensagens.length <= 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGESTOES.map((s) => (
            <button
              key={s}
              onClick={() => enviar(s)}
              className="rounded-full border border-hairline px-3 py-1.5 text-xs text-text-muted hover:border-gold hover:text-gold"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(pergunta);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          placeholder="Pergunte sobre seus gastos..."
          className="flex-1 rounded-sm border border-hairline bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-muted/60 focus:border-gold focus:outline-none"
        />
        <Button type="submit" disabled={enviando || !pergunta.trim()}>
          <Send size={16} />
        </Button>
      </form>
    </div>
  );
}
