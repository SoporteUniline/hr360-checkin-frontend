// Guía EN VIVO del rostro (23/11/2026, pedido del dueño: «que sea más intuitivo, igual que en la computadora»).
// Regla pura, sin navegador: con lo que detecta face-api en un cuadro de la cámara (cajas y puntos de la cara), el
// tamaño del video y el del recuadro donde se ve (object-cover), decide el mensaje y si ya se puede tomar el rostro.
// La usan la página del celular (/rostro/[token]), Mi rostro y «Probar rostro» de la ficha.
//
// Medidas: la caja del detector rápido (tinyFaceDetector) va de las cejas a la barbilla; dentro del óvalo de la guía
// ocupa ~55–85 % de su ancho cuando la persona está bien colocada. Brillo: promedio de luminancia (0–255) de un cuadro
// reducido del video; por debajo de 50 la huella sale inestable (y con menos de 80 el detector suele no ver la cara).

export const OVALO_CELULAR = Object.freeze({ x: 0.17, y: 0.14 }); // márgenes del óvalo dentro del recuadro (fracción)
export const OVALO_FICHA = Object.freeze({ x: 0.2, y: 0.1 });

export const LIMITES = Object.freeze({
  brilloMinimo: 50, // por debajo: «Más luz» aunque se vea la cara
  brilloSinCara: 80, // sin cara y con poca luz: «Más luz» en vez de «No se detecta rostro»
  centro: 0.35, // distancia máxima del centro de la cara al del óvalo (1 = orilla del óvalo)
  anchoMinimo: 0.45, // ancho de la cara / ancho del óvalo
  anchoMaximo: 1.0,
  frenteMin: 0.3, // posición de la nariz entre los dos ojos (0.5 = de frente)
  frenteMax: 0.7,
  inclinacionMax: 18, // grados de la línea de los ojos
});

export const MENSAJES = Object.freeze({
  inicio: "Coloca tu rostro dentro del óvalo",
  ninguna: "No se detecta rostro",
  varias: "Solo debe aparecer tu cara",
  luz: "Más luz",
  fuera: "Coloca tu rostro dentro del óvalo",
  cerca: "Acércate un poco",
  lejos: "Aléjate un poco",
  frente: "Mira de frente",
  bien: "Rostro detectado ✅",
});

const resultado = (nivel, clave) => ({ nivel, clave, texto: MENSAJES[clave], listo: nivel === "ok" });
export const GUIA_INICIAL = Object.freeze(resultado("info", "inicio"));

// Caja del video (píxeles del video) → píxeles del recuadro, con object-fit: cover (el video se recorta centrado).
export function cajaEnRecuadro(caja, video, recuadro) {
  const escala = Math.max(recuadro.width / video.width, recuadro.height / video.height);
  const dx = (recuadro.width - video.width * escala) / 2;
  const dy = (recuadro.height - video.height * escala) / 2;
  return { x: caja.x * escala + dx, y: caja.y * escala + dy, width: caja.width * escala, height: caja.height * escala };
}

const promedio = (puntos) => ({ x: puntos.reduce((s, p) => s + p.x, 0) / puntos.length, y: puntos.reduce((s, p) => s + p.y, 0) / puntos.length });

// ¿Mira de frente? Con los 68 puntos de face-api: ojos 36–41 y 42–47, punta de la nariz 30. null si no hay puntos.
export function deFrente(posiciones, limites = LIMITES) {
  if (!Array.isArray(posiciones) || posiciones.length < 48) return null;
  const a = promedio(posiciones.slice(36, 42));
  const b = promedio(posiciones.slice(42, 48));
  const nariz = posiciones[30];
  const entreOjos = b.x - a.x;
  if (!nariz || !Number.isFinite(entreOjos) || Math.abs(entreOjos) < 1) return false;
  const giro = (nariz.x - a.x) / entreOjos;
  const inclinacion = Math.abs((Math.atan2(b.y - a.y, Math.abs(entreOjos)) * 180) / Math.PI);
  return giro >= limites.frenteMin && giro <= limites.frenteMax && inclinacion <= limites.inclinacionMax;
}

/**
 * caras: [{ box: {x,y,width,height}, landmarks?: [{x,y}×68] }] en píxeles del video.
 * video: { width, height } (videoWidth/videoHeight). recuadro: { width, height } del elemento en pantalla.
 * ovalo: márgenes { x, y } en fracción del recuadro. brillo: 0–255 o null si no se pudo medir.
 * → { nivel: "info" | "aviso" | "error" | "ok", clave, texto, listo }
 */
export function guiaRostro({ caras, video, recuadro, ovalo = OVALO_CELULAR, brillo = null, limites = LIMITES }) {
  const lista = Array.isArray(caras) ? caras : [];
  const oscuro = Number.isFinite(brillo) && brillo < limites.brilloMinimo;
  if (!lista.length) return resultado(Number.isFinite(brillo) && brillo < limites.brilloSinCara ? "aviso" : "error", Number.isFinite(brillo) && brillo < limites.brilloSinCara ? "luz" : "ninguna");
  if (lista.length > 1) return resultado("aviso", "varias");
  if (oscuro) return resultado("aviso", "luz");
  if (!(video?.width > 0 && video?.height > 0 && recuadro?.width > 0 && recuadro?.height > 0)) return GUIA_INICIAL;
  const c = cajaEnRecuadro(lista[0].box, video, recuadro);
  const ancho = recuadro.width * (1 - 2 * ovalo.x);
  const alto = recuadro.height * (1 - 2 * ovalo.y);
  const dx = (c.x + c.width / 2 - recuadro.width / 2) / (ancho / 2);
  const dy = (c.y + c.height / 2 - recuadro.height / 2) / (alto / 2);
  if (Math.hypot(dx, dy) > limites.centro) return resultado("aviso", "fuera");
  const proporcion = c.width / ancho;
  if (proporcion < limites.anchoMinimo) return resultado("aviso", "cerca");
  if (proporcion > limites.anchoMaximo) return resultado("aviso", "lejos");
  if (deFrente(lista[0].landmarks, limites) === false) return resultado("aviso", "frente");
  return resultado("ok", "bien");
}

// Luminancia promedio (0–255) de los píxeles RGBA de un cuadro reducido del video (ImageData.data).
export function brilloPromedio(rgba) {
  if (!rgba || rgba.length < 4) return null;
  let suma = 0;
  const n = Math.floor(rgba.length / 4);
  for (let i = 0; i < n * 4; i += 4) suma += 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2];
  return suma / n;
}

// Lo que entrega face-api (detectAllFaces().withFaceLandmarks()) → { box, landmarks } planos para guiaRostro.
export function carasDeFaceApi(resultados) {
  return (resultados ?? []).map((r) => {
    const box = r?.detection?.box ?? r?.box ?? r?.alignedRect?.box;
    const pos = r?.landmarks?.positions ?? r?.landmarks;
    return { box: box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null, landmarks: Array.isArray(pos) ? pos.map((p) => ({ x: p.x, y: p.y })) : null };
  }).filter((c) => c.box && [c.box.x, c.box.y, c.box.width, c.box.height].every(Number.isFinite));
}

// Colores de la guía (texto + borde del óvalo), compartidos entre celular y ficha.
export const TONO_GUIA = Object.freeze({
  ok: { caja: "border-green-200 bg-green-50 text-green-800", ovalo: "border-green-400" },
  aviso: { caja: "border-amber-200 bg-amber-50 text-amber-900", ovalo: "border-amber-300" },
  error: { caja: "border-red-200 bg-red-50 text-red-700", ovalo: "border-red-400" },
  info: { caja: "border-slate-200 bg-white text-slate-700", ovalo: "border-white/80" },
});
