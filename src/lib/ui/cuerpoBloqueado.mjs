// (INC-007) Red de seguridad del panel: un diálogo o menú de Radix (react-remove-scroll / DismissableLayer) que se
// desmonta a medio cerrar puede dejar el <body> con `pointer-events: none`, `data-scroll-locked` u `overflow: hidden`,
// y entonces el panel no responde al toque. Si no hay ningún diálogo, hoja o menú abierto, se quita ese bloqueo.
// Devuelve qué se corrigió (vacío si no había nada). Probado en scripts/test-cuerpo-bloqueado.mjs.
const ABIERTOS = [
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
  '[role="menu"][data-state="open"]',
  "[data-radix-popper-content-wrapper]",
  '[aria-modal="true"]',
].join(",");

export function liberarCuerpoBloqueado(doc = globalThis.document) {
  const body = doc?.body;
  if (!body || doc.querySelector(ABIERTOS)) return [];
  const corregido = [];
  if (body.style.pointerEvents === "none") { body.style.removeProperty("pointer-events"); corregido.push("pointer-events"); }
  if (body.hasAttribute("data-scroll-locked")) { body.removeAttribute("data-scroll-locked"); corregido.push("data-scroll-locked"); }
  if (body.style.overflow === "hidden") { body.style.removeProperty("overflow"); corregido.push("overflow"); }
  return corregido;
}
