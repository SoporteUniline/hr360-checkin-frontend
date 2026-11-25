"use client";
import { useEffect, useState } from "react";
import { plataformaDe } from "@/lib/passkeys/modelo.mjs";

// Plataforma del dispositivo (ios | android | escritorio). En el servidor y en el primer pintado es «escritorio»
// (texto genérico) para no desajustar la hidratación; se corrige al montar.
export default function usePlataforma() {
  const [plataforma, setPlataforma] = useState("escritorio");
  useEffect(() => {
    setPlataforma(plataformaDe(navigator.userAgent, navigator.maxTouchPoints));
  }, []);
  return plataforma;
}

/** ¿El navegador tiene WebAuthn? (No se usa isUserVerifyingPlatformAuthenticatorAvailable: falla en iOS 26.2 WKWebView.) */
export function soportaPasskeys() {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential === "function" && !!navigator.credentials;
}
