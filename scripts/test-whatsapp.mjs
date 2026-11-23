// Pruebas de las reglas puras de WhatsApp en ADAMIA (R1). Uso: node --test scripts/test-whatsapp.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { parsearFechaMx, horaCorta, tiempoRelativo, etiquetaDia, claveDia } from "../src/lib/whatsapp/tiempo.mjs";
import { formatearTelefono, nombreContacto, iniciales } from "../src/lib/whatsapp/telefono.mjs";
import {
  permisoEscribir, accionesControl, etiquetaControl, etiquetaEstado, etiquetaActor, vistaPrevia,
  mensajeErrorApi, validarConfigEmpresa, formatearPrecio, esDuenoCuenta, MENSAJE_VENTANA, MENSAJE_APAGADO,
  MENSAJE_SIN_NUMERO, MENSAJE_SIN_CONTROL, MENSAJE_NO_REINTENTABLE, MENSAJE_CUENTA_DUPLICADA, textoModo, textoArchivo, controlaConversacion,
} from "../src/lib/whatsapp/reglas.mjs";
import {
  textoEntrevistasMes, avisoExtras, textoEntrevistasAdmin, enlacePaginaVacante, origenPublico, leerIncluidas,
} from "../src/lib/whatsapp/paquete.mjs";

// «Ahora» fijo: lunes 23/11/2026 12:00 en Ciudad de México (18:00 UTC).
const AHORA = new Date("2026-11-23T18:00:00Z");

test("fechas del backend se leen en hora de Ciudad de México", () => {
  assert.equal(parsearFechaMx("2026-11-23 12:00:00").toISOString(), "2026-11-23T18:00:00.000Z");
  assert.equal(parsearFechaMx("2026-11-23T05:30:00Z").toISOString(), "2026-11-23T05:30:00.000Z");
  assert.equal(parsearFechaMx(null), null);
  assert.equal(parsearFechaMx("no es fecha"), null);
  assert.equal(horaCorta("2026-11-23 16:05:00"), "4:05 p.m.");
  assert.equal(horaCorta("2026-11-23 00:15:00"), "12:15 a.m.");
  assert.equal(horaCorta("2026-11-23 12:00:00"), "12:00 p.m.");
  assert.equal(horaCorta(""), "");
});

test("tiempo relativo de la lista", () => {
  assert.equal(tiempoRelativo("2026-11-23 11:59:40", AHORA), "Ahora");
  assert.equal(tiempoRelativo("2026-11-23 11:55:00", AHORA), "hace 5 min");
  assert.equal(tiempoRelativo("2026-11-23 08:10:00", AHORA), "8:10 a.m.");
  assert.equal(tiempoRelativo("2026-11-22 23:50:00", AHORA), "Ayer");
  assert.equal(tiempoRelativo("2026-11-19 10:00:00", AHORA), "jue");
  assert.equal(tiempoRelativo("2026-11-02 10:00:00", AHORA), "2 nov");
  assert.equal(tiempoRelativo("2025-12-31 10:00:00", AHORA), "31 dic 2025");
  // Medianoche en México no es medianoche UTC: 23/11 00:30 MX (06:30 UTC) sigue siendo «hoy».
  assert.equal(tiempoRelativo("2026-11-23 00:30:00", AHORA), "12:30 a.m.");
  assert.equal(tiempoRelativo(null, AHORA), "");
});

test("separadores de día y clave de día", () => {
  assert.equal(etiquetaDia("2026-11-23 01:00:00", AHORA), "Hoy");
  assert.equal(etiquetaDia("2026-11-22 23:59:59", AHORA), "Ayer");
  assert.equal(etiquetaDia("2026-11-12 09:00:00", AHORA), "12 de noviembre");
  assert.equal(etiquetaDia("2025-01-05 09:00:00", AHORA), "5 de enero de 2025");
  assert.equal(claveDia("2026-11-22 23:59:59"), "2026-11-22");
});

test("teléfonos legibles y nombre del contacto", () => {
  assert.equal(formatearTelefono("5215512345678"), "+52 55 1234 5678");
  assert.equal(formatearTelefono("525512345678"), "+52 55 1234 5678");
  assert.equal(formatearTelefono("+52 (442) 123-4567"), "+52 442 123 4567");
  assert.equal(formatearTelefono("4421234567"), "+52 442 123 4567");
  assert.equal(formatearTelefono("+14155550123"), "+1 415 555 0123", "Norteamérica con formato");
  assert.equal(formatearTelefono(""), "");
  assert.equal(nombreContacto({ nombre: "  Ana Ruiz ", telefono: "5215512345678" }), "Ana Ruiz");
  assert.equal(nombreContacto({ nombre: "", telefono: "5215512345678" }), "+52 55 1234 5678");
  assert.equal(nombreContacto(null), "Contacto sin nombre");
  assert.equal(iniciales({ nombre: "ana maría ruiz" }), "AR");
  assert.equal(iniciales({ nombre: "" }), "#");
});

const reclutadora = { id_usuario: 7, tipo_usuario: "Recruiter", esAcceso: true };
const dueno = { id_usuario: 1, tipo_usuario: "Recruiter", esAcceso: false };
const conv = (extra = {}) => ({ id: 3, modo: "humano", control: { id_usuario: 7, nombre: "Laura" }, ventana_abierta: true, ...extra });

test("permiso para escribir", () => {
  assert.deepEqual(permisoEscribir(conv(), reclutadora), { puede: true, motivo: "" });
  assert.match(permisoEscribir(conv({ modo: "ia", control: null }), reclutadora).motivo, /IA está atendiendo/);
  assert.equal(permisoEscribir(conv({ modo: "ia", control: null }), dueno).puede, false, "con IA ni el dueño escribe");
  const otro = permisoEscribir(conv({ control: { id_usuario: 9, nombre: "Pedro" } }), reclutadora);
  assert.equal(otro.puede, false);
  assert.equal(otro.motivo, "Pedro tiene el control de esta conversación.");
  assert.equal(permisoEscribir(conv({ control: { id_usuario: 9, nombre: "Pedro" } }), dueno).puede, true, "el dueño de la cuenta sí escribe");
  assert.equal(permisoEscribir(conv({ control: { id_usuario: "7" } }), reclutadora).puede, true, "ids como texto");
  const cerrada = permisoEscribir(conv({ ventana_abierta: false }), reclutadora);
  assert.deepEqual(cerrada, { puede: false, motivo: MENSAJE_VENTANA, ventanaCerrada: true });
  assert.equal(permisoEscribir(null, dueno).puede, false);
  assert.equal(esDuenoCuenta({ tipo_usuario: "Admin" }), false);
  // Invitados comparten el id_usuario del dueño: si el control trae correo, también debe coincidir.
  const invitada = { ...reclutadora, correo: "Laura@Uniline.mx" };
  assert.equal(controlaConversacion(conv({ control: { id_usuario: 7, nombre: "Laura", correo: "laura@uniline.mx" } }), invitada), true);
  assert.equal(controlaConversacion(conv({ control: { id_usuario: 7, nombre: "Pepe", correo: "pepe@uniline.mx" } }), invitada), false);
  assert.equal(permisoEscribir(conv({ control: { id_usuario: 7, nombre: "Pepe", correo: "pepe@uniline.mx" } }), invitada).motivo, "Pepe tiene el control de esta conversación.");
  assert.equal(controlaConversacion(conv({ control: { id_usuario: 7, nombre: "Laura" } }), { id_usuario: 7, email: "x@y.mx" }), true, "sin correo en el control, solo id");
});

test("botones de control y chip de la lista", () => {
  assert.deepEqual(accionesControl(conv({ modo: "ia", control: null }), reclutadora), { tomar: true, devolver: false });
  assert.deepEqual(accionesControl(conv(), reclutadora), { tomar: false, devolver: true });
  assert.deepEqual(accionesControl(conv({ control: { id_usuario: 9 } }), reclutadora), { tomar: false, devolver: false });
  assert.deepEqual(accionesControl(conv({ control: { id_usuario: 9 } }), dueno), { tomar: false, devolver: true });
  assert.deepEqual(etiquetaControl(conv({ modo: "ia" }), reclutadora), { texto: "IA", tono: "violeta" });
  assert.deepEqual(etiquetaControl(conv(), reclutadora), { texto: "Tú tienes el control", tono: "azul" });
  assert.equal(etiquetaControl(conv({ control: { id_usuario: 9, nombre: "Pedro" } }), reclutadora).texto, "Atiende Pedro");
});

test("estados, actores y vista previa", () => {
  assert.equal(etiquetaEstado("leido"), "Leído");
  assert.equal(etiquetaEstado("fallido"), "No enviado");
  assert.equal(etiquetaEstado("enviando"), "Enviando…");
  assert.equal(etiquetaEstado("raro"), "");
  assert.equal(etiquetaActor({ actor: "ia" }), "Asistente IA");
  assert.equal(etiquetaActor({ actor: "sistema" }), "Sistema");
  assert.equal(etiquetaActor({ actor: "reclutador", usuario: { nombre: "Laura" } }), "Laura");
  assert.equal(etiquetaActor({ actor: "reclutador", usuario: null }), "Reclutador");
  assert.equal(etiquetaActor({ actor: "candidato" }), "");
  assert.equal(vistaPrevia(null), "Sin mensajes todavía");
  assert.equal(vistaPrevia({ texto: "Hola\n¿sigue\tdisponible?", direccion: "entrante" }), "Hola ¿sigue disponible?");
  assert.equal(vistaPrevia({ texto: "Claro", direccion: "saliente" }), "Enviado: Claro");
  assert.equal(vistaPrevia({ texto: "", direccion: "entrante" }), "[Archivo]");
  assert.equal(textoArchivo("imagen"), "[Archivo: imagen] (no disponible)");
  assert.equal(vistaPrevia({ texto: "", direccion: "entrante", adjunto: { tipo: "audio", nota_voz: true } }), "Nota de voz");
  assert.equal(vistaPrevia({ texto: "", direccion: "saliente", adjunto: { tipo: "documento", nombre: "cv.pdf" } }), "Enviado: Documento: cv.pdf");
});

test("errores del API en palabras claras", () => {
  const err = (status, data) => ({ response: { status, data } });
  assert.equal(mensajeErrorApi(err(403, { codigo: "WA_SIN_CONTROL" })), MENSAJE_SIN_CONTROL);
  assert.equal(mensajeErrorApi(err(409, { codigo: "WA_VENTANA_CERRADA" })), MENSAJE_VENTANA);
  assert.equal(mensajeErrorApi(err(409, { codigo: "WA_APAGADO" })), MENSAJE_APAGADO);
  assert.equal(mensajeErrorApi(err(503, { codigo: "WA_SIN_NUMERO" })), MENSAJE_SIN_NUMERO);
  assert.equal(mensajeErrorApi(err(409, { codigo: "WA_NO_REINTENTABLE" })), MENSAJE_NO_REINTENTABLE);
  assert.equal(mensajeErrorApi(err(409, { codigo: "WA_CUENTA_DUPLICADA" })), MENSAJE_CUENTA_DUPLICADA);
  assert.equal(mensajeErrorApi(err(400, { error: "El texto es obligatorio." })), "El texto es obligatorio.");
  assert.equal(mensajeErrorApi(err(500, {}), "Falló"), "Falló");
  assert.match(mensajeErrorApi({ message: "Network Error" }), /Sin conexión/);
});

test("validación del alta de WhatsApp por empresa", () => {
  const ok = validarConfigEmpresa({ modo: "propio", zernio_account_id: " acc_1 ", numero_whatsapp: "+52 55 1234 5678", precio_conversacion: "1.50", precio_mensual: "$1,200" });
  assert.deepEqual(ok.errores, {});
  assert.deepEqual(ok.cuerpo, { modo: "propio", zernio_account_id: "acc_1", numero_whatsapp: "525512345678", precio_conversacion: 1.5, precio_mensual: 1200, entrevistas_incluidas: null });
  const faltan = validarConfigEmpresa({ modo: "propio" });
  assert.ok(faltan.errores.zernio_account_id && faltan.errores.numero_whatsapp);
  const compartido = validarConfigEmpresa({ modo: "compartido", precio_conversacion: "" });
  assert.deepEqual(compartido.errores, {});
  assert.equal(compartido.cuerpo.precio_conversacion, null);
  assert.equal(compartido.cuerpo.zernio_account_id, null);
  assert.ok(validarConfigEmpresa({ modo: "apagado", precio_mensual: "-3" }).errores.precio_mensual);
  assert.ok(validarConfigEmpresa({ modo: "apagado", numero_whatsapp: "123" }).errores.numero_whatsapp);
  assert.ok(validarConfigEmpresa({ modo: "otro" }).errores.modo);
  assert.equal(textoModo("compartido"), "Número compartido de ADAMIA");
  assert.equal(formatearPrecio(null), "—");
  assert.match(formatearPrecio(1200), /1,200\.00/);
});

// ——— 27/11/2026: paquetes de entrevistas y enlace de la página de la vacante ———
test("paquete: textos del chip, aviso de extras y columna del administrador", () => {
  assert.equal(textoEntrevistasMes({ entrevistas_mes: 32, entrevistas_incluidas: 200, entrevistas_extra: 0 }), "32 de 200 entrevistas este mes");
  assert.equal(textoEntrevistasMes({ entrevistas_mes: 1, entrevistas_incluidas: 200 }), "1 de 200 entrevistas este mes");
  assert.equal(textoEntrevistasMes({ entrevistas_mes: 7, entrevistas_incluidas: null }), "7 entrevistas este mes", "sin paquete");
  assert.equal(textoEntrevistasMes({ entrevistas_mes: 1 }), "1 entrevista este mes");
  assert.equal(textoEntrevistasMes({ entrevistas_mes: 1500, entrevistas_incluidas: 1000 }), "1,500 de 1,000 entrevistas este mes");
  assert.equal(textoEntrevistasMes({}), "0 entrevistas este mes", "estado de un backend anterior");
  assert.equal(textoEntrevistasMes(null), "0 entrevistas este mes");
  assert.equal(avisoExtras({ entrevistas_extra: 12 }), "Llevas 12 entrevistas extra este mes. Cada una se cobra aparte.");
  assert.equal(avisoExtras({ entrevistas_extra: 1 }), "Llevas 1 entrevista extra este mes. Se cobra aparte.");
  assert.equal(avisoExtras({ entrevistas_extra: 0 }), null);
  assert.equal(avisoExtras({}), null);
  assert.equal(textoEntrevistasAdmin({ entrevistas_mes: 212, entrevistas_incluidas: 200 }), "212 / 200");
  assert.equal(textoEntrevistasAdmin({ entrevistas_mes: 3, entrevistas_incluidas: null }), "3 / sin paquete");
});

test("paquete: entrevistas incluidas del administrador (entero de 0 a 100,000 o vacío)", () => {
  assert.deepEqual(leerIncluidas(""), { valor: null });
  assert.deepEqual(leerIncluidas(" 200 "), { valor: 200 });
  assert.deepEqual(leerIncluidas("1,000"), { valor: 1000 });
  assert.deepEqual(leerIncluidas(0), { valor: 0 });
  for (const malo of ["-1", "1.5", "100001", "abc"]) assert.ok(leerIncluidas(malo).error, malo);
  const ok = validarConfigEmpresa({ modo: "compartido", precio_mensual: "1500", precio_conversacion: "30", entrevistas_incluidas: "200" });
  assert.deepEqual(ok.errores, {});
  assert.deepEqual(ok.cuerpo, { modo: "compartido", zernio_account_id: null, numero_whatsapp: null, precio_conversacion: 30, precio_mensual: 1500, entrevistas_incluidas: 200 });
  const malo = validarConfigEmpresa({ modo: "compartido", entrevistas_incluidas: "2.5" });
  assert.match(malo.errores.entrevistas_incluidas, /número entero de 0 a 100,000/);
});

test("enlace de la página de la vacante (/vacante/<slug>) con el dominio configurado o el del navegador", () => {
  assert.equal(enlacePaginaVacante("chofer-repartidor", "https://dev.adamia.com.mx/"), "https://dev.adamia.com.mx/vacante/chofer-repartidor");
  assert.equal(enlacePaginaVacante("año nuevo", "https://adamia.com.mx"), "https://adamia.com.mx/vacante/a%C3%B1o%20nuevo");
  assert.equal(enlacePaginaVacante("", "https://adamia.com.mx"), null);
  assert.equal(enlacePaginaVacante("x", ""), null);
  assert.equal(enlacePaginaVacante("x", "javascript:alert(1)"), null);
  assert.equal(origenPublico("https://dev.adamia.com.mx/"), "https://dev.adamia.com.mx");
  assert.equal(origenPublico(""), "", "en Node no hay window: sin dominio no hay origen");
});
