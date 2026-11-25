// Encuadre de la cara frente al reloj (26/11/2026, kiosco con óvalo grande, ~65 % del alto de la cámara).
// El detector ve el cuadro COMPLETO de la cámara, pero en pantalla el video va con object-cover: si el área de la cámara es
// más ancha (o más alta) que el video, se ve solo una parte del cuadro. El tamaño de la cara se mide contra lo que se VE,
// así «Acércate» coincide con el óvalo en cualquier pantalla (antes se medía contra el cuadro completo: en una cámara
// ancha y baja, una cara que llenaba el óvalo podía pedir «Acércate»).
//  - lejos: la cara mide menos del 22 % del alto visible (huella pobre): se pide «Acércate» y no se reconoce.
//  - cerca: la cara se sale del cuadro (cortada por un borde) o pasa del 95 % del alto visible: «Aléjate un poco».
//  - ok: se reconoce. Una cara grande y completa (a un brazo de distancia) es lo ideal para la huella.
// Probado en scripts/test-encuadre-rostro.mjs.
export const CARA_MINIMA = 0.22;
export const CARA_MAXIMA = 0.95;

// Alto del cuadro (en pixeles del video) que se ve en un área de vistaW × vistaH con object-cover.
export function altoVisible(videoW, videoH, vistaW, vistaH) {
  if (!videoW || !videoH || !vistaW || !vistaH) return videoH || 0;
  const escala = Math.max(vistaW / videoW, vistaH / videoH);
  return Math.min(videoH, vistaH / escala);
}

export function encuadreRostro({ box, videoW, videoH, vistaW, vistaH, minimo = CARA_MINIMA, maximo = CARA_MAXIMA }) {
  const alto = Number(box?.height);
  if (!alto || !videoH) return "ok";
  const visible = altoVisible(videoW, videoH, vistaW, vistaH);
  const proporcion = alto / visible;
  if (proporcion < minimo) return "lejos";
  const margen = 2; // pixeles: el detector a veces toca el borde sin cortar la cara
  const cortada = Number.isFinite(box.y) && (box.y < -margen || box.y + alto > videoH + margen)
    || Number.isFinite(box.x) && Number.isFinite(box.width) && videoW && (box.x < -margen || box.x + box.width > videoW + margen);
  if (cortada || proporcion > maximo) return "cerca";
  return "ok";
}
