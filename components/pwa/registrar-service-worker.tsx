"use client";

import { useEffect } from "react";

export function RegistrarServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Falhar silenciosamente — o app funciona normalmente sem o SW,
        // só perde a possibilidade de instalação/cache offline.
      });
    });
  }, []);

  return null;
}
