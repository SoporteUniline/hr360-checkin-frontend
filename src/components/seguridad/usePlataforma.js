"use client";
import { useEffect, useState } from "react";
import { plataformaDe } from "@/lib/passkeys/modelo.mjs";
import { isNativeClient } from "@/lib/native-app";

// Plataforma del dispositivo (ios | android | escritorio). En el servidor y en el primer pintado es «escritorio»
// (texto genérico) para no desajustar la hidratación; se corrige al montar.
export default function usePlataforma() {
  const [plataforma, setPlataforma] = useState("escritorio");
  useEffect(() => {
    setPlataforma(plataformaDe(navigator.userAgent, navigator.maxTouchPoints));
  }, []);
  return plataforma;
}

// Dentro de la app de ADAMIA (WebView) las passkeys necesitan configuración de la app: Associated Domains con el Team ID
// de Apple y assetlinks con el SHA-256 de Google Play, y una versión nueva en las tiendas. Hasta entonces el sistema
// responde «se canceló o se agotó el tiempo»: no se ofrecen en la app. Se encienden con NEXT_PUBLIC_PASSKEYS_APP=true.
export const passkeysEnApp = () => process.env.NEXT_PUBLIC_PASSKEYS_APP === "true";
export const passkeysBloqueadasEnApp = () => typeof window !== "undefined" && isNativeClient() && !passkeysEnApp();

/** ¿El navegador tiene WebAuthn? (No se usa isUserVerifyingPlatformAuthenticatorAvailable: falla en iOS 26.2 WKWebView.) */
export function soportaPasskeys() {
  if (passkeysBloqueadasEnApp()) return false;
  return typeof window !== "undefined" && typeof window.PublicKeyCredential === "function" && !!navigator.credentials;
}
