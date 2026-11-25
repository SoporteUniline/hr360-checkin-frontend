// Dibujo de la credencial (frente y vuelta) en <canvas>, y sus descargas PNG/PDF. Solo navegador.
// Diseño aprobado (maqueta Credencial.dc.html): base de 324 px de ancho, escalada a los dpi de cada salida.
import { modulosQr } from "@/lib/qrImagen.mjs";
import { BASE_ALTO, COLORES_CREDENCIAL as C, TARJETA, pixelesTarjeta } from "./credencial.mjs";

const W = TARJETA.baseAncho;
const H = BASE_ALTO;
const RADIO = (TARJETA.radioMm / TARJETA.anchoMm) * W;

function familia() {
  if (typeof document === "undefined") return "Inter, system-ui, sans-serif";
  return getComputedStyle(document.body).fontFamily || "Inter, system-ui, sans-serif";
}
const fuente = (peso, px) => `${peso} ${px}px ${familia()}`;

async function cargarFuentes() {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.all([400, 600, 700, 800].map((p) => document.fonts.load(fuente(p, 16))));
  } catch { /* sin fuente propia: usa la del sistema */ }
}

function rectRedondo(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function circulo(ctx, cx, cy, r, color) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

// Texto con espaciado entre letras (ctx.letterSpacing no existe en todos los navegadores).
function anchoEspaciado(ctx, t, esp) {
  return [...t].reduce((s, ch) => s + ctx.measureText(ch).width, 0) + esp * Math.max(0, [...t].length - 1);
}
function textoEspaciado(ctx, t, x, y, esp = 0, alinear = "left") {
  const ancho = anchoEspaciado(ctx, t, esp);
  let cx = alinear === "center" ? x - ancho / 2 : alinear === "right" ? x - ancho : x;
  ctx.textAlign = "left";
  for (const ch of t) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + esp;
  }
  return ancho;
}

// Reduce la letra hasta que quepa (sin bajar de `min`) y, si aún no cabe, corta con «…».
function ajustar(ctx, t, { peso, px, min, ancho, esp = 0 }) {
  let tam = px;
  ctx.font = fuente(peso, tam);
  while (tam > min && anchoEspaciado(ctx, t, esp * tam) > ancho) {
    tam -= 0.5;
    ctx.font = fuente(peso, tam);
  }
  let s = t;
  while (s.length > 1 && anchoEspaciado(ctx, s, esp * tam) > ancho) s = s.slice(0, -1);
  if (s !== t) s = s.replace(/\s+$/, "") + "…";
  return { texto: s, tam };
}

function partirLineas(ctx, t, ancho) {
  const lineas = [];
  let linea = "";
  for (const palabra of t.split(/\s+/)) {
    const prueba = linea ? `${linea} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width > ancho && linea) {
      lineas.push(linea);
      linea = palabra;
    } else linea = prueba;
  }
  if (linea) lineas.push(linea);
  return lineas;
}

function lienzo(dpi) {
  const { ancho, alto, escala } = pixelesTarjeta(dpi);
  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  ctx.scale(ancho / W, alto / H);
  ctx.textBaseline = "alphabetic";
  return { canvas, ctx, escala };
}

function recortarTarjeta(ctx, redondear) {
  if (!redondear) return;
  rectRedondo(ctx, 0, 0, W, H, RADIO);
  ctx.clip();
}

function dibujarFoto(ctx, foto, d, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  if (foto) {
    const lado = Math.min(foto.width, foto.height);
    const sx = (foto.width - lado) / 2;
    const sy = (foto.height - lado) / 2;
    ctx.drawImage(foto, sx, sy, lado, lado, cx - r, cy - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = C.fotoVacia;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = C.textoFotoVacia;
    ctx.font = fuente(700, 52);
    ctx.textAlign = "center";
    ctx.fillText(d.iniciales, cx, cy + 19);
  }
  ctx.restore();
}

export function dibujarFrente(ctx, d, { foto = null, redondear = true } = {}) {
  ctx.save();
  recortarTarjeta(ctx, redondear);
  ctx.fillStyle = C.fondoFrente;
  ctx.fillRect(0, 0, W, H);

  // Franja con círculos decorativos.
  const franja = 196;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, franja);
  ctx.clip();
  ctx.fillStyle = C.franja;
  ctx.fillRect(0, 0, W, franja);
  circulo(ctx, W + 60 - 100, -60 + 100, 100, "rgba(255,255,255,0.16)");
  circulo(ctx, -40 + 65, 110 + 65, 65, "rgba(255,255,255,0.12)");
  ctx.restore();

  // Empresa y «EMPLEADO».
  ctx.fillStyle = C.textoFranja;
  ctx.font = fuente(700, 10);
  const anchoEtiqueta = textoEspaciado(ctx, "EMPLEADO", W - 20, 36, 1.6, "right");
  const empresa = ajustar(ctx, (d.empresa || "").toUpperCase(), { peso: 800, px: 16, min: 11, ancho: W - 40 - anchoEtiqueta - 12, esp: 0.05 });
  ctx.fillStyle = C.textoFranja;
  if (empresa.texto) textoEspaciado(ctx, empresa.texto, 20, 37, empresa.tam * 0.05);

  // Foto circular con aro blanco y sombra.
  const cx = W / 2;
  const cy = 92 + 84;
  ctx.save();
  ctx.shadowColor = "rgba(15,23,42,0.20)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  circulo(ctx, cx, cy, 84, "#FFFFFF");
  ctx.restore();
  dibujarFoto(ctx, foto, d, cx, cy, 78);

  // Nombre en dos renglones.
  ctx.fillStyle = C.texto;
  ctx.textAlign = "center";
  const nombre = d.nombre.length ? d.nombre : ["Sin nombre"];
  let y = 304;
  nombre.slice(0, 2).forEach((linea) => {
    const t = ajustar(ctx, linea, { peso: 800, px: 25, min: 17, ancho: W - 44 });
    ctx.fillText(t.texto, cx, y);
    y += 29;
  });

  // Puesto en píldora y área.
  if (d.puesto) {
    const t = ajustar(ctx, d.puesto.toUpperCase(), { peso: 700, px: 12.5, min: 10, ancho: W - 80, esp: 0.04 });
    const ancho = anchoEspaciado(ctx, t.texto, t.tam * 0.04) + 26;
    const py = y - 8;
    rectRedondo(ctx, cx - ancho / 2, py, ancho, 26, 13);
    ctx.fillStyle = C.pildora;
    ctx.fill();
    ctx.fillStyle = C.textoPildora;
    textoEspaciado(ctx, t.texto, cx, py + 17.5, t.tam * 0.04, "center");
    y = py + 26 + 20;
  } else y += 10;
  if (d.area) {
    ctx.fillStyle = C.textoSecundario;
    const t = ajustar(ctx, d.area, { peso: 500, px: 12.5, min: 10, ancho: W - 60 });
    ctx.textAlign = "center";
    ctx.fillText(t.texto, cx, y);
  }

  // Pie: No. empleado y Desde.
  const pie = H - 64;
  ctx.fillStyle = C.linea;
  ctx.fillRect(20, pie, W - 40, 1);
  ctx.fillStyle = C.etiqueta;
  ctx.font = fuente(700, 9);
  textoEspaciado(ctx, "NO. EMPLEADO", 20, pie + 22, 1.3);
  if (d.desde) textoEspaciado(ctx, "DESDE", W - 20, pie + 22, 1.3, "right");
  ctx.fillStyle = C.texto;
  const num = ajustar(ctx, d.numero || "—", { peso: 800, px: 17, min: 11, ancho: 160 });
  ctx.textAlign = "left";
  ctx.fillText(num.texto, 20, pie + 44);
  if (d.desde) {
    ctx.font = fuente(600, 13.5);
    ctx.textAlign = "right";
    ctx.fillText(d.desde, W - 20, pie + 43);
  }
  ctx.restore();
}

export function dibujarVuelta(ctx, d, { redondear = true } = {}) {
  ctx.save();
  recortarTarjeta(ctx, redondear);
  ctx.fillStyle = C.fondoVuelta;
  ctx.fillRect(0, 0, W, H);
  circulo(ctx, -70 + 110, H + 70 - 110, 110, "rgba(255,255,255,0.05)");

  const cx = W / 2;
  ctx.fillStyle = C.tituloVuelta;
  ctx.font = fuente(700, 11);
  textoEspaciado(ctx, "CHECA TU ENTRADA", cx, 38, 2, "center");
  ctx.fillStyle = C.textoVuelta;
  ctx.font = fuente(400, 13);
  ctx.textAlign = "center";
  ctx.fillText("Muestra este código al reloj checador", cx, 58);

  // Recuadro blanco con el QR real del código del empleado.
  const caja = 200;
  const bx = cx - caja / 2;
  const by = 76;
  rectRedondo(ctx, bx, by, caja, caja, 16);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  if (d.codigo) {
    const { tamano, oscuro } = modulosQr(d.codigo);
    const area = caja - 28;
    const celda = area / tamano;
    // Un solo trazo con todos los cuadros: rellenarlos uno por uno deja líneas finas entre ellos al escalar.
    ctx.beginPath();
    for (let f = 0; f < tamano; f++) {
      for (let c = 0; c < tamano; c++) {
        if (oscuro(f, c)) ctx.rect(bx + 14 + c * celda, by + 14 + f * celda, celda, celda);
      }
    }
    ctx.fillStyle = C.qr;
    ctx.fill();
    ctx.fillStyle = C.codigoVuelta;
    const t = ajustar(ctx, d.codigoTexto, { peso: 800, px: 22, min: 12, ancho: W - 44, esp: 0.12 });
    textoEspaciado(ctx, t.texto, cx, by + caja + 36, t.tam * 0.12, "center");
  } else {
    ctx.fillStyle = C.textoSecundario;
    ctx.font = fuente(600, 13);
    ctx.textAlign = "center";
    ctx.fillText("Sin código asignado", cx, by + caja / 2 + 5);
  }

  // Leyenda y marca ADAMIA.
  ctx.font = fuente(400, 10.5);
  const lineas = partirLineas(ctx, d.leyenda, W - 44).slice(0, 3);
  ctx.fillStyle = C.leyendaVuelta;
  ctx.textAlign = "center";
  let y = H - 42 - (lineas.length - 1) * 15;
  for (const l of lineas) {
    ctx.fillText(l, cx, y);
    y += 15;
  }
  ctx.font = fuente(700, 10);
  const anchoMarca = anchoEspaciado(ctx, "ADAMIA", 1.2) + 18;
  const mx = cx - anchoMarca / 2;
  rectRedondo(ctx, mx, H - 25, 12, 12, 3);
  ctx.fillStyle = C.marca;
  ctx.fill();
  ctx.fillStyle = C.textoVuelta;
  textoEspaciado(ctx, "ADAMIA", mx + 18, H - 15, 1.2);
  ctx.restore();
}

/** Foto del empleado para el canvas; si no se puede leer (CORS, borrada), null y se usan las iniciales. */
export async function cargarFoto(src) {
  if (!src || src === "null" || src === "undefined") return null;
  const desdeUrl = (url, cruzado) => new Promise((resolve) => {
    const img = new Image();
    if (cruzado) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
  if (/^(blob:|data:)/.test(src)) return desdeUrl(src, false);
  try {
    const r = await fetch(src, { mode: "cors", credentials: "omit" });
    if (r.ok) {
      const url = URL.createObjectURL(await r.blob());
      const img = await desdeUrl(url, false);
      // La URL se queda viva mientras se use la imagen; el navegador la libera al cerrar la pestaña.
      if (img) return img;
    }
  } catch { /* sigue con carga directa */ }
  return desdeUrl(src, true);
}

/** Frente y vuelta como canvas a cierta resolución. */
export async function generarLados(d, { dpi, foto = null, redondear = true }) {
  await cargarFuentes();
  const frente = lienzo(dpi);
  dibujarFrente(frente.ctx, d, { foto, redondear });
  const vuelta = lienzo(dpi);
  dibujarVuelta(vuelta.ctx, d, { redondear });
  return { frente: frente.canvas, vuelta: vuelta.canvas };
}

function bajar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// PNG con la resolución anotada (pHYs) para que el programa de impresión lo tome a tamaño tarjeta.
async function pngConDpi(canvas, dpi) {
  const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const ppm = Math.round(dpi / 0.0254);
  const datos = new Uint8Array(9);
  const vista = new DataView(datos.buffer);
  vista.setUint32(0, ppm);
  vista.setUint32(4, ppm);
  datos[8] = 1;
  const tipo = new TextEncoder().encode("pHYs");
  const crc = crc32(new Uint8Array([...tipo, ...datos]));
  const trozo = new Uint8Array(4 + 4 + 9 + 4);
  const v = new DataView(trozo.buffer);
  v.setUint32(0, 9);
  trozo.set(tipo, 4);
  trozo.set(datos, 8);
  v.setUint32(17, crc);
  // Después del IHDR (8 de firma + 25 del trozo IHDR).
  const salida = new Uint8Array(bytes.length + trozo.length);
  salida.set(bytes.subarray(0, 33), 0);
  salida.set(trozo, 33);
  salida.set(bytes.subarray(33), 33 + trozo.length);
  return new Blob([salida], { type: "image/png" });
}
let tablaCrc;
function crc32(bytes) {
  if (!tablaCrc) {
    tablaCrc = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      tablaCrc[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (const b of bytes) c = tablaCrc[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export async function descargarPng(canvas, nombre, dpi) {
  bajar(await pngConDpi(canvas, dpi), nombre);
}

/** PDF de 2 páginas a tamaño tarjeta exacto (página 1 frente, página 2 vuelta), a sangre: sin márgenes. */
export async function crearPdf({ frente, vuelta }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [TARJETA.anchoMm, TARJETA.altoMm], compress: true });
  doc.setProperties({ title: "Credencial", creator: "ADAMIA" });
  doc.addImage(frente.toDataURL("image/png"), "PNG", 0, 0, TARJETA.anchoMm, TARJETA.altoMm, undefined, "FAST");
  doc.addPage([TARJETA.anchoMm, TARJETA.altoMm], "portrait");
  doc.addImage(vuelta.toDataURL("image/png"), "PNG", 0, 0, TARJETA.anchoMm, TARJETA.altoMm, undefined, "FAST");
  return doc;
}
