// Lógica pura de los datos de ejemplo que se mueven en la portada (sin DOM ni React, para probarla con node --test).

const dos = (n) => String(n).padStart(2, "0");

/** Segundos → «HH:MM:SS». Da la vuelta a las 24 h para que el ancho del texto nunca cambie (sin saltos de diseño). */
export function formatoReloj(segundos) {
  const s = ((Math.floor(segundos) % 86400) + 86400) % 86400;
  return `${dos(Math.floor(s / 3600))}:${dos(Math.floor(s / 60) % 60)}:${dos(s % 60)}`;
}

/** Valor del reloj según el tiempo real transcurrido: si el intervalo se pausó fuera de pantalla, al volver no va atrasado. */
export function segundosReloj(inicio, desdeMs, ahoraMs) {
  return inicio + Math.max(0, Math.floor((ahoraMs - desdeMs) / 1000));
}

/** Contador con salida suave (cúbica): rápido al inicio y se asienta en su valor; progreso fuera de 0..1 se recorta. */
export function valorContador(hasta, progreso) {
  const p = Math.min(1, Math.max(0, progreso));
  return Math.round(hasta * (1 - (1 - p) ** 3));
}

export const largoTexto = (partes) => partes.reduce((s, p) => s + p.texto.length, 0);

/** Primeros n caracteres de una frase hecha de partes (algunas en negritas), sin perder qué parte va resaltada. */
export function textoParcial(partes, n) {
  const salida = [];
  let resta = Math.max(0, n);
  for (const p of partes) {
    if (resta <= 0) break;
    salida.push({ ...p, texto: p.texto.slice(0, resta) });
    resta -= p.texto.length;
  }
  return salida;
}

/**
 * Estado al hidratar: con «reducir movimiento» o si ya está en pantalla se queda el valor final (el HTML del servidor);
 * solo lo que está fuera de la vista vuelve a su inicio para animarse al aparecer, así nadie ve el dato retroceder.
 */
export function estadoInicial({ reducido, visible }) {
  return reducido || visible ? "final" : "espera";
}
