// (23/11/2026, pedido del dueño) ¿Firmar a pantalla completa en horizontal? Sí en celular (pantalla táctil y chica);
// en computadora (o tableta grande con mouse) se firma en la misma página.
export function esCelularParaFirmar({ tactil, ancho, alto }) {
  if (!tactil) return false;
  return Math.min(Number(ancho) || 0, Number(alto) || 0) <= 820;
}

export function detectarCelular(win = typeof window === "undefined" ? null : window) {
  if (!win?.matchMedia) return false;
  return esCelularParaFirmar({ tactil: win.matchMedia("(pointer: coarse)").matches, ancho: win.screen?.width ?? win.innerWidth, alto: win.screen?.height ?? win.innerHeight });
}
