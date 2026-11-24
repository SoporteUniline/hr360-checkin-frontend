// ¿Firmar a pantalla completa en horizontal? Sí en celular (pantalla táctil y chica);
// en computadora (o tableta grande con mouse) se firma en la misma página.
export function esCelularParaFirmar({ tactil, ancho, alto }) {
  if (!tactil) return false;
  return Math.min(Number(ancho) || 0, Number(alto) || 0) <= 820;
}

export function detectarCelular(win = typeof window === "undefined" ? null : window) {
  if (!win?.matchMedia) return false;
  return esCelularParaFirmar({ tactil: win.matchMedia("(pointer: coarse)").matches, ancho: win.screen?.width ?? win.innerWidth, alto: win.screen?.height ?? win.innerHeight });
}

// iPhone no deja girar la pantalla por código: la firma se dibuja ROTADA 90° (en sentido horario) para que,
// al girar el celular, quede horizontal. El lienzo guarda puntos relativos a SU sistema (x a lo largo, y a lo alto), así
// que el toque (clientX/Y de la pantalla) se traduce: con rotate(90deg) el eje x del lienzo apunta hacia abajo y el eje
// y hacia la izquierda. rect = getBoundingClientRect() del lienzo (la caja ya rotada, en pantalla).
export function puntoEnLienzo({ clientX, clientY }, rect, rotado = false) {
  if (!rotado) return { x: (clientX - rect.left) / rect.width, y: (clientY - rect.top) / rect.height };
  return { x: (clientY - rect.top) / rect.height, y: (rect.right - clientX) / rect.width };
}

// Estilo del contenedor rotado que llena la pantalla en vertical: mide alto × ancho y se gira sobre su esquina.
export function estiloRotado(ancho, alto) {
  return { position: "absolute", top: 0, left: `${ancho}px`, width: `${alto}px`, height: `${ancho}px`, transform: "rotate(90deg)", transformOrigin: "top left" };
}
