// Fotos a formato web (27/11/2026): reglas puras de src/lib/imagenes/aWeb.mjs (tamaños por uso, pasos de calidad,
// formato de salida, nombres .webp, tipos aceptados, HEIC, EXIF) y el 413 de nginx sin JSON (src/lib/errorSubida.mjs).
// La parte del lienzo se prueba con un adaptador falso; la conversión real se verifica en el navegador
// (scripts/verify-fotos-web.mjs).
import test from "node:test";
import assert from "node:assert/strict";
import {
  ACEPTA_FOTOS, LIMITE_BYTES, MENSAJES, PERFILES, TIPOS_ENTRADA, ErrorFoto, elegirFormato, esHeic, leerOrientacionExif,
  matrizOrientacion, medidasDestino, medidasOrientadas, nombreConvertido, pasosConversion, perfilDe, prepararFoto, prepararFotos,
  sirveLaOriginal, tipoDeFoto, tipoPorBytes,
} from "../src/lib/imagenes/aWeb.mjs";
import { MENSAJE_ARCHIVO_PESADO, esRechazoPorPeso, mensajeRechazoPorPeso, normalizarRechazoPorPeso } from "../src/lib/errorSubida.mjs";
import { errorDe as errorComunicados } from "../src/lib/comunicados/comunicados.mjs";
import { errorPublico } from "../src/lib/induccion/induccion.mjs";

const bytes = (...partes) => Uint8Array.from(partes.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));
const JPEG = bytes([0xff, 0xd8, 0xff, 0xe0], "\0\0JFIF\0\0\0\0\0");
const PNG = bytes([0x89], "PNG", [0x0d, 0x0a, 0x1a, 0x0a], "\0\0\0\rIHDR");
const WEBP = bytes("RIFF", [0x10, 0, 0, 0], "WEBPVP8 ");
const WAV = bytes("RIFF", [0x10, 0, 0, 0], "WAVEfmt ");
const ftyp = (mayor, ...compatibles) => bytes([0, 0, 0, 16 + 4 * compatibles.length], "ftyp", mayor, [0, 0, 0, 0], ...compatibles);
// JPEG 2×1 con EXIF Orientation = 6 (el mismo de la prueba del navegador en lienzo.mjs), little endian.
const ORIENTADO_6 = Buffer.from("/9j/4QDIRXhpZgAASUkqAAgAAAAHABIBAwABAAAABgAAABoBBQABAAAAYgAAABsBBQABAAAAagAAACgBAwABAAAAAgAAADEBAgACAAAAeAAAABMCAwABAAAAAQAAAGmHBAABAAAAcgAAAAAAAAA4YwAA6AMAADhjAADoAwAABgAAkAcABAAAADAyMTABkQcABAAAAAECAwAAoAcABAAAADAxMDABoAMAAQAAAP//AAACoAQAAQAAAAIAAAADoAQAAQAAAAEAAAAAAAAA/9sAQwBQNzxGPDJQRkFGWlVQX3jIgnhubnj1r7mRyP///////////////////////////////////////////////////9sAQwFVWlp4aXjrgoLr/////////////////////////////////////////////////////////////////////////8AAEQgAAQACAwEiAAIRAQMRAf/EABUAAQEAAAAAAAAAAAAAAAAAAAAE/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwC0AH//2Q==", "base64");
// Big endian (MM), orientación 8, con un APP0 antes del EXIF.
const exifMM = (o) => bytes([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xe1, 0, 34], "Exif\0\0", "MM", [0, 42, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, o, 0, 0, 0, 0, 0, 0], [0xff, 0xda]);

test("tipos por bytes: JPEG, PNG, WebP (RIFF….WEBP, no cualquier RIFF), HEIC, AVIF, GIF y SVG", () => {
  assert.equal(tipoPorBytes(JPEG), "image/jpeg");
  assert.equal(tipoPorBytes(PNG), "image/png");
  assert.equal(tipoPorBytes(WEBP), "image/webp");
  assert.equal(tipoPorBytes(WAV), null, "un WAV también empieza con RIFF");
  assert.equal(tipoPorBytes(ftyp("heic", "mif1", "heic")), "image/heic");
  assert.equal(tipoPorBytes(ftyp("mif1", "mif1", "heic")), "image/heic");
  assert.equal(tipoPorBytes(ftyp("avif", "mif1", "avif")), "image/avif");
  assert.equal(tipoPorBytes(ftyp("mif1", "avif", "mif1")), "image/avif", "mif1 con avif compatible es AVIF");
  assert.equal(tipoPorBytes(bytes("GIF89a", "\0\0\0\0\0\0")), "image/gif");
  assert.equal(tipoPorBytes(bytes('<svg xmlns="x">')), "image/svg+xml");
  assert.equal(tipoPorBytes(bytes("%PDF-1.4\n%%EOF")), null);
  assert.equal(tipoPorBytes(new Uint8Array(3)), null);
  // Sin bytes reconocibles: el tipo del navegador, o la extensión cuando Android manda octet-stream.
  assert.equal(tipoDeFoto(bytes("????????????"), { type: "application/octet-stream", name: "IMG_1.HEIC" }), "image/heic");
  assert.equal(tipoDeFoto(bytes("????????????"), { type: "image/heif", name: "x" }), "image/heif");
  assert.equal(tipoDeFoto(PNG, { type: "image/jpeg", name: "mal.jpg" }), "image/png", "mandan los bytes");
  assert.ok(esHeic("image/heic") && esHeic("", "foto.HEIF") && !esHeic("image/jpeg", "a.jpg"));
});

test("tipos aceptados: cualquier foto se intenta abrir; GIF y SVG no son fotos; el selector acepta image/*", () => {
  assert.equal(ACEPTA_FOTOS, "image/*");
  for (const t of ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/avif"]) assert.ok(TIPOS_ENTRADA.includes(t), t);
  for (const t of ["image/gif", "image/svg+xml", "application/pdf"]) assert.ok(!TIPOS_ENTRADA.includes(t), t);
});

test("orientación EXIF: little y big endian, sin EXIF = 1, y medidas/matriz a lo derecho", () => {
  assert.equal(leerOrientacionExif(ORIENTADO_6), 6);
  assert.equal(leerOrientacionExif(exifMM(8)), 8);
  assert.equal(leerOrientacionExif(exifMM(3)), 3);
  assert.equal(leerOrientacionExif(exifMM(9)), 1, "valor fuera de rango");
  assert.equal(leerOrientacionExif(JPEG), 1);
  assert.equal(leerOrientacionExif(PNG), 1);
  assert.equal(leerOrientacionExif(ORIENTADO_6.subarray(0, 25)), 1, "EXIF cortado no truena");
  assert.deepEqual(medidasOrientadas(4000, 3000, 6), { ancho: 3000, alto: 4000 });
  assert.deepEqual(medidasOrientadas(4000, 3000, 3), { ancho: 4000, alto: 3000 });
  // Orientación 6 (girar 90° a la derecha): la esquina (0,0) de la imagen cruda va arriba a la DERECHA.
  const [a, b, c, d, e, f] = matrizOrientacion(6, 400, 300);
  const punto = (x, y) => [a * x + c * y + e, b * x + d * y + f];
  assert.deepEqual(punto(0, 0), [300, 0]);
  assert.deepEqual(punto(400, 300), [0, 400]);
  assert.deepEqual(matrizOrientacion(1, 10, 10), [1, 0, 0, 1, 0, 0]);
  for (let o = 1; o <= 8; o += 1) {
    const m = matrizOrientacion(o, 40, 30);
    const { ancho, alto } = medidasOrientadas(40, 30, o);
    const esquinas = [[0, 0], [40, 0], [0, 30], [40, 30]].map(([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
    assert.ok(esquinas.every(([x, y]) => x >= 0 && y >= 0 && x <= ancho && y <= alto), `orientación ${o} cae dentro del lienzo`);
  }
});

test("tamaños por uso: lado mayor según el perfil, nunca se agranda ni se deforma", () => {
  assert.equal(PERFILES.portada.lado, 2000);
  assert.equal(PERFILES.publicacion.lado, 2000);
  assert.equal(PERFILES.documento.lado, 2400);
  assert.equal(PERFILES.perfil.lado, 1024);
  assert.equal(PERFILES.portada.calidad, 0.82);
  for (const p of Object.values(PERFILES)) assert.ok(p.maxBytes <= LIMITE_BYTES && LIMITE_BYTES < 900 * 1024, "todo pasa con el límite actual de nginx");
  assert.equal(PERFILES.logo.formato, "compatible", "los logos terminan en PDFs de jsPDF: nunca WebP");
  assert.equal(PERFILES.whatsapp.formato, "compatible", "WhatsApp: imágenes JPEG/PNG");
  assert.deepEqual(medidasDestino(4000, 3000, 2000), { ancho: 2000, alto: 1500 });
  assert.deepEqual(medidasDestino(3000, 4000, 2000), { ancho: 1500, alto: 2000 });
  assert.deepEqual(medidasDestino(800, 600, 2000), { ancho: 800, alto: 600 }, "no se agranda");
  assert.deepEqual(medidasDestino(10000, 10, 2000), { ancho: 2000, alto: 2 });
  assert.deepEqual(medidasDestino(0, 0, 2000), { ancho: 1, alto: 1 });
  assert.throws(() => perfilDe("rostro"), /desconocido/, "no hay perfil para el rostro: no se convierte");
});

test("pasos: primero baja la calidad (0.82 → 0.72 → 0.62) y luego el tamaño; nunca por debajo de 0.5 ni de 320 px", () => {
  const pasos = pasosConversion(PERFILES.portada);
  assert.deepEqual(pasos[0], { lado: 2000, calidad: 0.82 });
  assert.deepEqual(pasos.slice(0, 3).map((p) => p.calidad), [0.82, 0.72, 0.62]);
  assert.deepEqual(pasos.map((p) => p.lado), [2000, 2000, 2000, 1600, 1280, 1000]);
  for (let i = 1; i < pasos.length; i += 1) assert.ok(pasos[i].lado <= pasos[i - 1].lado && pasos[i].calidad <= pasos[i - 1].calidad, "cada paso es más ligero");
  assert.ok(pasosConversion({ lado: 400, calidad: 0.55 }).every((p) => p.calidad >= 0.5 && p.lado >= 320));
});

test("formato de salida: WebP si se puede; si no JPEG; PNG solo si hay transparencia; los usos «compatibles» nunca WebP", () => {
  assert.equal(elegirFormato({ formato: "web", soportaWebp: true }), "image/webp");
  assert.equal(elegirFormato({ formato: "web", soportaWebp: true, conAlfa: true }), "image/webp", "WebP guarda la transparencia");
  assert.equal(elegirFormato({ formato: "web", soportaWebp: false }), "image/jpeg", "Safari: respaldo JPEG");
  assert.equal(elegirFormato({ formato: "web", soportaWebp: false, conAlfa: true }), "image/png");
  assert.equal(elegirFormato({ formato: "compatible", soportaWebp: true }), "image/jpeg");
  assert.equal(elegirFormato({ formato: "compatible", soportaWebp: true, conAlfa: true }), "image/png");
});

test("nombres: misma base con la extensión nueva (.webp/.jpg/.png); sin nombre «foto»", () => {
  assert.equal(nombreConvertido("IMG_0001.HEIC", "image/webp"), "IMG_0001.webp");
  assert.equal(nombreConvertido("posada 2026.jpeg", "image/webp"), "posada 2026.webp");
  assert.equal(nombreConvertido("logo.png", "image/jpeg"), "logo.jpg");
  assert.equal(nombreConvertido("C:\\fotos\\viaje.png", "image/png"), "viaje.png");
  assert.equal(nombreConvertido("", "image/webp"), "foto.webp");
  assert.equal(nombreConvertido(undefined, "image/webp"), "foto.webp");
  assert.equal(nombreConvertido("sin-extension", "image/webp"), "sin-extension.webp");
});

// ───────── orden de la conversión con un lienzo falso ─────────
// El «peso» que entrega el lienzo falso: proporcional a pixeles × calidad (aprox. una foto con mucho detalle).
function lienzoFalso({ ancho = 4000, alto = 3000, webp = true, alfa = false, falla = false, entrega = null, peso = (w, h, q) => Math.round(w * h * q * 0.4) } = {}) {
  const llamadas = { codificar: [], liberadas: 0, orientacion: null };
  return {
    llamadas,
    async decodificar(_archivo, orientacion) { llamadas.orientacion = orientacion; if (falla) throw new Error("no decodifica"); return { fuente: {}, ...medidasOrientadas(ancho, alto, orientacion), girar: 1 }; },
    async tieneAlfa() { return alfa; },
    async soportaWebp() { return webp; },
    async codificar(_f, opciones) { llamadas.codificar.push(opciones); return new Blob([new Uint8Array(peso(opciones.ancho, opciones.alto, opciones.calidad))], { type: entrega ?? opciones.mime }); },
    liberar() { llamadas.liberadas += 1; },
  };
}
const archivo = (cabeza, nombre, tipo, tamano = 4_000_000) => new File([cabeza, new Uint8Array(Math.max(0, tamano - cabeza.length))], nombre, { type: tipo });

test("foto de celular de 4 MB → WebP de 2000 px bajo 900 KB, con nombre .webp", async () => {
  const l = lienzoFalso({ peso: (w, h, q) => Math.round(w * h * q * 0.25) }); // 2000×1500×0.82×0.25 ≈ 615 KB
  const r = await prepararFoto(archivo(JPEG, "IMG_2041.jpg", "image/jpeg"), "portada", { lienzo: l });
  assert.equal(r.tipo, "image/webp");
  assert.equal(r.archivo.type, "image/webp");
  assert.equal(r.archivo.name, "IMG_2041.webp");
  assert.deepEqual([r.ancho, r.alto], [2000, 1500]);
  assert.ok(r.despues < LIMITE_BYTES && r.antes === 4_000_000 && r.convertida);
  assert.equal(l.llamadas.codificar.length, 1, "a la primera");
  assert.equal(l.llamadas.liberadas, 1, "libera la imagen abierta");
});

test("si pesa de más, baja por pasos hasta que cabe (y se detiene ahí)", async () => {
  const l = lienzoFalso(); // 2000×1500×0.82×0.4 ≈ 984 KB: no cabe a 0.82
  const r = await prepararFoto(archivo(JPEG, "detalle.jpg", "image/jpeg"), "portada", { lienzo: l });
  assert.deepEqual(l.llamadas.codificar.map((c) => c.calidad), [0.82, 0.72]);
  assert.ok(r.despues <= LIMITE_BYTES);
  const imposible = lienzoFalso({ peso: () => LIMITE_BYTES + 1 });
  await assert.rejects(prepararFoto(archivo(JPEG, "x.jpg", "image/jpeg"), "portada", { lienzo: imposible }), (e) => e instanceof ErrorFoto && e.codigo === "muyPesada");
  assert.equal(imposible.llamadas.codificar.length, pasosConversion(PERFILES.portada).length);
  assert.equal(imposible.llamadas.liberadas, 1, "libera aunque falle");
});

test("orientación: el EXIF del JPEG llega al lienzo y la foto acostada sale a lo derecho (1500×2000)", async () => {
  const l = lienzoFalso({ peso: () => 1000 });
  const cabeza = new Uint8Array(ORIENTADO_6);
  const r = await prepararFoto(archivo(cabeza, "acostada.jpg", "image/jpeg", 3_000_000), "publicacion", { lienzo: l });
  assert.equal(l.llamadas.orientacion, 6);
  assert.deepEqual([r.ancho, r.alto], [1500, 2000]);
});

test("Safari sin WebP: JPEG; con transparencia: PNG (y el tipo real del resultado manda)", async () => {
  const sinWebp = await prepararFoto(archivo(JPEG, "a.jpg", "image/jpeg"), "portada", { lienzo: lienzoFalso({ webp: false, peso: () => 5000 }) });
  assert.equal(sinWebp.archivo.type, "image/jpeg");
  assert.equal(sinWebp.archivo.name, "a.jpg");
  const conAlfa = await prepararFoto(archivo(PNG, "logo.png", "image/png"), "portada", { lienzo: lienzoFalso({ webp: false, alfa: true, peso: () => 5000 }) });
  assert.equal(conAlfa.archivo.type, "image/png");
  const conAlfaWebp = await prepararFoto(archivo(PNG, "logo.png", "image/png"), "portada", { lienzo: lienzoFalso({ alfa: true, peso: () => 5000 }) });
  assert.equal(conAlfaWebp.archivo.type, "image/webp", "PNG con alfa → WebP con alfa");
  const mentira = await prepararFoto(archivo(JPEG, "b.jpg", "image/jpeg"), "portada", { lienzo: lienzoFalso({ entrega: "image/png", peso: () => 5000 }) });
  assert.equal(mentira.archivo.type, "image/png");
  assert.equal(mentira.archivo.name, "b.png");
  const logo = await prepararFoto(archivo(PNG, "logo.png", "image/png"), "logo", { lienzo: lienzoFalso({ peso: () => 5000 }) });
  assert.equal(logo.archivo.type, "image/jpeg", "logo sin transparencia: JPEG aunque haya WebP");
});

test("ya está bien (WebP chica y derecha): se sube la original sin volver a comprimir", async () => {
  const l = lienzoFalso({ ancho: 1200, alto: 800 });
  const original = archivo(WEBP, "ya.webp", "image/webp", 300_000);
  const r = await prepararFoto(original, "portada", { lienzo: l });
  assert.equal(r.archivo, original);
  assert.equal(r.convertida, false);
  assert.equal(l.llamadas.codificar.length, 0);
  assert.ok(sirveLaOriginal({ tipo: "image/webp", mime: "image/webp", orientacion: 1, ancho: 1200, alto: 800, tamano: 300_000, perfil: PERFILES.portada }));
  assert.ok(!sirveLaOriginal({ tipo: "image/jpeg", mime: "image/webp", orientacion: 1, ancho: 1200, alto: 800, tamano: 300_000, perfil: PERFILES.portada }), "JPEG → WebP");
  assert.ok(!sirveLaOriginal({ tipo: "image/webp", mime: "image/webp", orientacion: 1, ancho: 2400, alto: 800, tamano: 300_000, perfil: PERFILES.portada }), "más grande que el lado");
  assert.ok(!sirveLaOriginal({ tipo: "image/jpeg", mime: "image/jpeg", orientacion: 6, ancho: 800, alto: 600, tamano: 100_000, perfil: PERFILES.logo }), "acostada");
  assert.ok(sirveLaOriginal({ tipo: "image/png", mime: "image/jpeg", orientacion: 1, ancho: 64, alto: 64, tamano: 2_000, perfil: PERFILES.whatsapp }), "WhatsApp/logo: un PNG chico no se pasa a JPEG");
  assert.ok(!sirveLaOriginal({ tipo: "image/webp", mime: "image/jpeg", orientacion: 1, ancho: 64, alto: 64, tamano: 2_000, perfil: PERFILES.logo }), "logo WebP → JPEG/PNG (PDF)");
});

test("HEIC que el navegador no abre: mensaje claro; PDF, GIF y archivos rotos: mensajes de foto", async () => {
  const heic = archivo(ftyp("heic", "mif1", "heic"), "IMG_9.HEIC", "image/heic");
  await assert.rejects(prepararFoto(heic, "portada", { lienzo: lienzoFalso({ falla: true }) }), (e) => e.codigo === "heic" && e.message === MENSAJES.heic);
  assert.match(MENSAJES.heic, /Ajustes › Cámara › Formatos › Más compatible/);
  // Safari sí abre HEIC: se convierte como cualquiera.
  const ok = await prepararFoto(heic, "portada", { lienzo: lienzoFalso({ peso: () => 5000 }) });
  assert.equal(ok.archivo.name, "IMG_9.webp");
  await assert.rejects(prepararFoto(archivo(bytes("%PDF-1.4 xxxxxxx"), "a.pdf", "application/pdf"), "portada", { lienzo: lienzoFalso() }), (e) => e.codigo === "noEsFoto");
  await assert.rejects(prepararFoto(archivo(bytes("GIF89a", "\0\0\0\0\0\0"), "a.gif", "image/gif"), "portada", { lienzo: lienzoFalso() }), (e) => e.codigo === "noEsFoto");
  await assert.rejects(prepararFoto(archivo(JPEG, "rota.jpg", "image/jpeg"), "portada", { lienzo: lienzoFalso({ falla: true }) }), (e) => e.codigo === "noSeAbre");
  await assert.rejects(prepararFoto(null, "portada", { lienzo: lienzoFalso() }), (e) => e.codigo === "noEsFoto");
  await assert.rejects(prepararFoto(archivo(JPEG, "enorme.jpg", "image/jpeg", 41 * 1024 * 1024), "portada", { lienzo: lienzoFalso() }), (e) => e.codigo === "muyGrande");
});

test("varias fotos: convierte las buenas y dice cuál falló", async () => {
  const r = await prepararFotos([archivo(JPEG, "a.jpg", "image/jpeg"), archivo(bytes("%PDF-1.4 xxxxxxx"), "b.pdf", "application/pdf")], "publicacion", { lienzo: lienzoFalso({ peso: () => 5000 }) });
  assert.equal(r.listas.length, 1);
  assert.equal(r.listas[0].archivo.name, "a.webp");
  assert.equal(r.listas[0].original.name, "a.jpg");
  assert.deepEqual(r.errores, [`«b.pdf»: ${MENSAJES.noEsFoto}`]);
});

// ───────── 413 de nginx (HTML, sin JSON) ─────────
const html413 = { response: { status: 413, data: "<html><head><title>413 Request Entity Too Large</title></head><body>nginx</body></html>" } };

test("413 sin JSON: «El archivo pesa demasiado…»; el 413 con mensaje del servidor conserva el suyo", () => {
  assert.equal(MENSAJE_ARCHIVO_PESADO, "El archivo pesa demasiado para subirlo. Prueba con uno más ligero.");
  assert.ok(esRechazoPorPeso(html413));
  assert.ok(esRechazoPorPeso({ response: { status: 413, data: "" } }));
  assert.ok(esRechazoPorPeso({ response: { status: 413, data: {} } }));
  assert.ok(!esRechazoPorPeso({ response: { status: 413, data: { error: "La foto pesa más de 8 MB." } } }));
  assert.ok(!esRechazoPorPeso({ response: { status: 413, data: { mensaje: "Hasta 10 fotos." } } }));
  assert.ok(!esRechazoPorPeso({ response: { status: 500, data: "<html>" } }));
  assert.ok(!esRechazoPorPeso({ request: {} }) && !esRechazoPorPeso(null));
  assert.equal(mensajeRechazoPorPeso(html413), MENSAJE_ARCHIVO_PESADO);
  assert.equal(mensajeRechazoPorPeso({ response: { status: 400 } }), null);
});

test("el interceptor deja el mensaje en data.error y data.mensaje (lo leen todos los errorDe)", () => {
  const e = normalizarRechazoPorPeso({ response: { status: 413, data: "<html>413</html>" } });
  assert.equal(e.response.data.error, MENSAJE_ARCHIVO_PESADO);
  assert.equal(e.response.data.mensaje, MENSAJE_ARCHIVO_PESADO);
  assert.equal(e.response.data.codigo, "ARCHIVO_GRANDE");
  const propio = { response: { status: 413, data: { error: "La foto pesa más de 8 MB." } } };
  assert.equal(normalizarRechazoPorPeso(propio).response.data.error, "La foto pesa más de 8 MB.");
  assert.equal(normalizarRechazoPorPeso(null), null, "nunca lanza");
});

test("errorDe de comunicados y errorPublico de inducción: 413 en HTML → mensaje claro (antes: «No se pudo guardar la portada.»)", () => {
  assert.equal(errorComunicados({ response: { status: 413, data: "<html>413</html>" } }, "No se pudo guardar la portada."), MENSAJE_ARCHIVO_PESADO);
  assert.equal(errorComunicados({ response: { status: 413, data: { mensaje: "La foto «a.jpg» pesa más de 8 MB." } } }), "La foto «a.jpg» pesa más de 8 MB.");
  assert.equal(errorComunicados({ response: { status: 500, data: "<html>" } }, "No se pudo guardar la portada."), "No se pudo guardar la portada.");
  assert.equal(errorPublico({ response: { status: 413, data: "<html>413</html>" } }).texto, MENSAJE_ARCHIVO_PESADO);
});
