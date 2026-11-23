// Pruebas de las reglas puras de los adjuntos del chat de WhatsApp (chat todo-en-uno). Uso: node --test scripts/test-whatsapp-adjuntos.mjs
import assert from "node:assert/strict";
import test from "node:test";
import {
  LIMITE_ADJUNTO, MAX_GRABACION_SEG, MENSAJE_ARCHIVO_GRANDE, MENSAJE_TIPO_NO_PERMITIDO, MENSAJE_ARCHIVO_VACIO, MENSAJE_MICRO_DENEGADO,
  MENSAJE_MICRO_NO_ENCONTRADO, MENSAJE_SIN_GRABADORA, ACEPTAR_ARCHIVOS, TIPOS_PERMITIDOS, mimeBase, extension, mimeDeArchivo, tipoDeMime, validarArchivo,
  formatearTamano, formatearDuracion, elegirMimeGrabacion, nombreGrabacion, llegoAlMaximo, mensajeMicrofono, VELOCIDADES, siguienteVelocidad,
  textoVelocidad, infoDocumento, etiquetaAdjunto, coordenadas, rutaAdjuntoSegura, rutaDescarga, nombreDescarga, lineaCita, citasDelChat,
} from "../src/lib/whatsapp/adjuntos.mjs";
import { mensajeErrorApi, MENSAJE_AGENDA_INACTIVA, MENSAJE_SIN_HORARIOS } from "../src/lib/whatsapp/reglas.mjs";

const archivo = (name, type, size = 1000) => ({ name, type, size });

test("mime base, extensión y mime efectivo", () => {
  assert.equal(mimeBase("audio/webm;codecs=opus"), "audio/webm");
  assert.equal(mimeBase(" IMAGE/PNG "), "image/png");
  assert.equal(mimeBase(null), "");
  assert.equal(extension("CV Final.DOCX"), "docx");
  assert.equal(extension("sin-extension"), "");
  assert.equal(mimeDeArchivo(archivo("reporte.xlsx", "")), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  assert.equal(mimeDeArchivo(archivo("foto.jpg", "application/octet-stream")), "image/jpeg");
  assert.equal(mimeDeArchivo(archivo("x.png", "image/png")), "image/png");
});

test("tipo por mime (también para pintar lo que llega)", () => {
  assert.equal(tipoDeMime("image/jpeg"), "imagen");
  assert.equal(tipoDeMime("image/gif"), "imagen");
  assert.equal(tipoDeMime("audio/ogg; codecs=opus"), "audio");
  assert.equal(tipoDeMime("video/quicktime"), "video");
  assert.equal(tipoDeMime("application/pdf"), "documento");
  assert.equal(tipoDeMime("application/zip"), "documento");
  assert.equal(tipoDeMime(""), null);
});

test("tipos permitidos y lista accept", () => {
  for (const m of ["image/jpeg", "image/png", "image/webp", "audio/ogg", "audio/mpeg", "audio/mp4", "audio/aac", "audio/webm", "video/mp4", "application/pdf",
    "application/msword", "application/vnd.ms-excel", "application/vnd.ms-powerpoint"]) assert.ok(TIPOS_PERMITIDOS.includes(m), m);
  assert.equal(TIPOS_PERMITIDOS.length, 16);
  assert.ok(ACEPTAR_ARCHIVOS.includes(".docx") && ACEPTAR_ARCHIVOS.includes("application/pdf") && !ACEPTAR_ARCHIVOS.includes(".exe"));
});

test("validación de tamaño y tipo con los textos del API", () => {
  assert.deepEqual(validarArchivo(archivo("foto.png", "image/png")), { ok: true, error: "", mime: "image/png", tipo: "imagen" });
  assert.equal(validarArchivo(archivo("cv.pdf", "application/pdf", LIMITE_ADJUNTO)).ok, true, "16 MB exactos sí");
  assert.deepEqual(validarArchivo(archivo("video.mp4", "video/mp4", LIMITE_ADJUNTO + 1)), { ok: false, error: MENSAJE_ARCHIVO_GRANDE, mime: "video/mp4", tipo: "video" });
  assert.equal(validarArchivo(archivo("setup.exe", "application/x-msdownload")).error, MENSAJE_TIPO_NO_PERMITIDO);
  assert.equal(validarArchivo(archivo("anim.gif", "image/gif")).error, MENSAJE_TIPO_NO_PERMITIDO);
  assert.equal(validarArchivo(archivo("vacio.pdf", "application/pdf", 0)).error, MENSAJE_ARCHIVO_VACIO);
  assert.equal(validarArchivo(null).ok, false);
  assert.equal(MENSAJE_ARCHIVO_GRANDE, "El archivo pesa más de 16 MB. WhatsApp no permite enviar archivos tan grandes.");
  assert.equal(MENSAJE_TIPO_NO_PERMITIDO, "Ese tipo de archivo no se puede enviar por WhatsApp. Usa una imagen (JPG, PNG o WEBP), audio, video MP4, PDF, Word, Excel o PowerPoint.");
});

test("errores del API para adjuntos y horarios", () => {
  const err = (codigo, status) => ({ response: { status, data: { codigo, error: "x" } } });
  assert.equal(mensajeErrorApi(err("WA_ARCHIVO_GRANDE", 413)), MENSAJE_ARCHIVO_GRANDE);
  assert.equal(mensajeErrorApi(err("WA_TIPO_NO_PERMITIDO", 415)), MENSAJE_TIPO_NO_PERMITIDO);
  assert.equal(mensajeErrorApi(err("WA_AGENDA_INACTIVA", 409)), MENSAJE_AGENDA_INACTIVA);
  assert.equal(mensajeErrorApi(err("WA_SIN_HORARIOS", 409)), MENSAJE_SIN_HORARIOS);
});

test("tamaño «2.3 MB», «850 KB», «512 B»", () => {
  assert.equal(formatearTamano(2.3 * 1024 * 1024), "2.3 MB");
  assert.equal(formatearTamano(16 * 1024 * 1024), "16 MB");
  assert.equal(formatearTamano(850 * 1024), "850 KB");
  assert.equal(formatearTamano(100), "100 B");
  assert.equal(formatearTamano(1500), "1 KB");
  assert.equal(formatearTamano(0), "0 B");
  assert.equal(formatearTamano(-1), "");
  assert.equal(formatearTamano("x"), "");
});

test("duración «0:07», «1:05», «1:02:03»", () => {
  assert.equal(formatearDuracion(7.9), "0:07");
  assert.equal(formatearDuracion(65), "1:05");
  assert.equal(formatearDuracion(3723), "1:02:03");
  assert.equal(formatearDuracion(Infinity), "0:00");
  assert.equal(formatearDuracion(NaN), "0:00");
});

test("grabación: ogg/opus primero, luego webm/opus; nombre y máximo", () => {
  assert.equal(elegirMimeGrabacion(() => true), "audio/ogg;codecs=opus");
  assert.equal(elegirMimeGrabacion((m) => m === "audio/webm;codecs=opus"), "audio/webm;codecs=opus");
  assert.equal(elegirMimeGrabacion(() => false), "");
  assert.equal(elegirMimeGrabacion(() => { throw new Error("x"); }), "");
  assert.equal(elegirMimeGrabacion(undefined), "");
  const ahora = new Date("2026-11-23T18:04:05Z");
  assert.equal(nombreGrabacion("audio/ogg;codecs=opus", ahora), "nota-de-voz-20261123180405.ogg");
  assert.equal(nombreGrabacion("audio/webm;codecs=opus", ahora), "nota-de-voz-20261123180405.webm");
  assert.equal(nombreGrabacion("", ahora), "nota-de-voz-20261123180405.webm");
  assert.equal(MAX_GRABACION_SEG, 300);
  assert.equal(llegoAlMaximo(299), false);
  assert.equal(llegoAlMaximo(300), true);
  assert.equal(mensajeMicrofono({ name: "NotAllowedError" }), MENSAJE_MICRO_DENEGADO);
  assert.equal(mensajeMicrofono({ name: "NotFoundError" }), MENSAJE_MICRO_NO_ENCONTRADO);
  assert.equal(mensajeMicrofono({ name: "NotSupportedError" }), MENSAJE_SIN_GRABADORA);
  assert.equal(mensajeMicrofono(null), MENSAJE_MICRO_DENEGADO);
});

test("velocidad del audio 1x → 1.5x → 2x → 1x", () => {
  assert.deepEqual(VELOCIDADES, [1, 1.5, 2]);
  assert.equal(siguienteVelocidad(1), 1.5);
  assert.equal(siguienteVelocidad(1.5), 2);
  assert.equal(siguienteVelocidad(2), 1);
  assert.equal(siguienteVelocidad(3), 1);
  assert.equal(textoVelocidad(1.5), "1.5x");
});

test("documento: etiqueta e ícono por tipo", () => {
  assert.deepEqual(infoDocumento("application/pdf", "cv.pdf"), { etiqueta: "PDF", icono: "pdf" });
  assert.deepEqual(infoDocumento("", "carta.docx"), { etiqueta: "Word", icono: "word" });
  assert.deepEqual(infoDocumento("application/vnd.ms-excel", "x"), { etiqueta: "Excel", icono: "excel" });
  assert.deepEqual(infoDocumento("application/vnd.openxmlformats-officedocument.presentationml.presentation", "p"), { etiqueta: "PowerPoint", icono: "ppt" });
  assert.deepEqual(infoDocumento("application/zip", "datos.zip"), { etiqueta: "ZIP", icono: "archivo" });
  assert.deepEqual(infoDocumento("", ""), { etiqueta: "Documento", icono: "archivo" });
});

test("etiqueta corta del adjunto (vista previa de la lista)", () => {
  assert.equal(etiquetaAdjunto({ tipo: "imagen" }), "Foto");
  assert.equal(etiquetaAdjunto({ tipo: "audio", nota_voz: true }), "Nota de voz");
  assert.equal(etiquetaAdjunto({ tipo: "audio" }), "Audio");
  assert.equal(etiquetaAdjunto({ tipo: "documento", nombre: "cv.pdf" }), "Documento: cv.pdf");
  assert.equal(etiquetaAdjunto({ tipo: "ubicacion" }), "Ubicación");
  assert.equal(etiquetaAdjunto({ tipo: "raro" }), "Archivo");
  assert.equal(etiquetaAdjunto(null), "");
});

test("ubicación: coordenadas válidas y enlace de Google Maps", () => {
  assert.deepEqual(coordenadas(25.6866, -100.3161), { lat: 25.6866, lng: -100.3161, texto: "25.68660, -100.31610", enlace: "https://www.google.com/maps?q=25.6866,-100.3161" });
  assert.equal(coordenadas("25.5", "-100.1").enlace, "https://www.google.com/maps?q=25.5,-100.1");
  assert.equal(coordenadas(null, 10), null);
  assert.equal(coordenadas(91, 0), null);
  assert.equal(coordenadas(0, 181), null);
  assert.equal(coordenadas("x", 0), null);
});

test("solo se piden rutas relativas del módulo (el token no sale a otro origen)", () => {
  assert.equal(rutaAdjuntoSegura("/reclutamiento/whatsapp/conversaciones/12/adjuntos/34"), "/reclutamiento/whatsapp/conversaciones/12/adjuntos/34");
  assert.equal(rutaDescarga("/reclutamiento/whatsapp/conversaciones/12/adjuntos/34"), "/reclutamiento/whatsapp/conversaciones/12/adjuntos/34?descargar=1");
  for (const mala of ["https://evil.example/x", "//evil.example/reclutamiento/whatsapp/x", "/reclutamiento/whatsapp/../../users", "/otra/ruta",
    "/reclutamiento/whatsapp/a?token=1", "/reclutamiento/whatsapp//x", "", null, "javascript:alert(1)"]) {
    assert.equal(rutaAdjuntoSegura(mala), null, String(mala));
  }
  assert.equal(rutaDescarga("https://evil.example"), null);
});

test("nombre al descargar", () => {
  assert.equal(nombreDescarga({ nombre: "CV Ana.pdf" }), "CV Ana.pdf");
  assert.equal(nombreDescarga({ nombre: "../../etc/passwd" }), ".._.._etc_passwd");
  assert.equal(nombreDescarga({ tipo: "imagen", mime: "image/jpeg" }), "foto.jpg");
  assert.equal(nombreDescarga({ tipo: "documento" }), "documento");
});

test("líneas de sistema de la cita", () => {
  assert.equal(lineaCita("mover", { inicio: "2026-11-25 10:30" }), "Cita movida al mié 25 nov 10:30 a.m.");
  assert.equal(lineaCita("agendar", { inicio: "2026-11-24 16:00" }), "Cita agendada para el mar 24 nov 4:00 p.m.");
  assert.equal(lineaCita("cancelar", { inicio: "2026-11-24 16:00" }), "Cita del mar 24 nov 4:00 p.m. cancelada");
  assert.equal(lineaCita("cancelar", null), "Cita cancelada");
  assert.equal(lineaCita("asistio", {}), "Asistencia registrada: asistió a la entrevista");
  assert.equal(lineaCita("no_asistio", {}), "Asistencia registrada: no asistió a la entrevista");
  assert.equal(lineaCita("confirmar", { inicio: "2026-11-24 16:00" }), "Cita del mar 24 nov 4:00 p.m. confirmada");
  assert.equal(lineaCita("ofrecer"), "Se le enviaron al candidato los horarios disponibles");
  assert.equal(lineaCita("otra"), "");
});

test("cita del chat: próxima activa y última", () => {
  const c = (id, inicio, estado) => ({ id, inicio, estado });
  const r = citasDelChat({ citas: [c(1, "2026-11-20 10:00", "reagendada"), c(2, "2026-11-26 10:00", "agendada"), c(3, "2026-11-25 09:00", "confirmada")] });
  assert.equal(r.activa.id, 3);
  const s = citasDelChat({ citas: [c(1, "2026-11-20 10:00", "asistio"), c(2, "2026-11-18 10:00", "cancelada"), c(4, "2026-11-21 10:00", "reagendada")] });
  assert.deepEqual([s.activa, s.ultima.id], [null, 1]);
  assert.deepEqual(citasDelChat({}), { activa: null, ultima: null });
  assert.equal(citasDelChat({ cita: c(9, "2026-11-25 10:00", "cancelada") }).activa, null);
  assert.equal(citasDelChat({ cita: c(9, "2026-11-25 10:00", "agendada") }).activa.id, 9);
});
