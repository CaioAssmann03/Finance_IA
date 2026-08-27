import type { NextConfig } from "next";

const emDesenvolvimento = process.env.NODE_ENV !== "production";

// O navegador precisa poder falar com o Supabase (REST + realtime). O resto
// fica fechado em 'self', então nenhum script/imagem/fetch de terceiro carrega.
const origemSupabase = (() => {
  const bruto = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  try {
    return new URL(bruto).origin;
  } catch {
    // Sem uma URL válida o app não funciona de qualquer jeito; avisar aqui
    // evita um CSP silenciosamente sem o Supabase, que daria erro de rede
    // difícil de rastrear no navegador.
    console.warn(
      "[next.config] NEXT_PUBLIC_SUPABASE_URL não é uma URL válida — o CSP vai bloquear as chamadas ao Supabase. Confira o .env.local."
    );
    return "";
  }
})();

const conexoesPermitidas = ["'self'", origemSupabase, origemSupabase.replace(/^https/, "wss")]
  .filter(Boolean)
  .join(" ");

/**
 * Política de conteúdo.
 *
 * `script-src` inclui 'unsafe-inline' porque o app injeta o script de tema no
 * <head> (evita o flash de tela clara antes da hidratação) e o Next injeta os
 * próprios scripts inline. Trocar isso por nonce exige mover o tema para um
 * cookie lido no servidor — vale a pena um dia, mas mesmo assim já barra
 * script de domínio externo, que é o vetor que importa aqui.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${emDesenvolvimento ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src ${conexoesPermitidas}`,
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "manifest-src 'self'",
  "worker-src 'self'",
  ...(emDesenvolvimento ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  // Não anunciar a stack do servidor no header X-Powered-By.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        // Dados financeiros não entram em cache de CDN nem de proxy.
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;
