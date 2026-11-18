import { Capacitor } from "@capacitor/core";

export const NATIVE_USER_AGENT_TOKEN = "AdamiaAppNative";

/**
 * Determina en servidor o cliente si el User-Agent corresponde a la app nativa.
 */
export function isNativeUserAgent(userAgent = "") {
  return String(userAgent).includes(NATIVE_USER_AGENT_TOKEN);
}

/**
 * Determina en servidor si los query params indican modo nativo (?native=true).
 */
export function hasNativeSearchParam(searchParams) {
  const value = searchParams?.native;
  if (Array.isArray(value)) return value.includes("true");
  return value === "true";
}

/**
 * Detecta en el navegador/WebView si la app corre dentro de Capacitor o modo nativo.
 */
export function isNativeClient() {
  if (typeof window === "undefined") return false;
  return (
    Capacitor.isNativePlatform() ||
    navigator.userAgent.includes(NATIVE_USER_AGENT_TOKEN) ||
    window.location.search.includes("native=true") ||
    document.documentElement.classList.contains("adamia-native")
  );
}

/**
 * Script sincrono para <head>: marca <html> antes del primer pintado en apps nativas.
 */
export const NATIVE_PREPAINT_SCRIPT = `(function(){try{var ua=navigator.userAgent||"";var q=window.location.search||"";var cap=window.Capacitor&&typeof window.Capacitor.isNativePlatform==="function"&&window.Capacitor.isNativePlatform();if(cap||ua.indexOf("${NATIVE_USER_AGENT_TOKEN}")!==-1||q.indexOf("native=true")!==-1){document.documentElement.classList.add("adamia-native");}}catch(e){}})();`;

