// Newsletter semanal, Guía 2027 y «Avisar por WhatsApp a» (docs/newsletter.md del backend): reglas de presentación,
// edición y validación. Puras, sin navegador.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SECCIONES, estadoBoletin, puedeEditar, puedeCancelar, enCurso, fechaLarga, fechaCorta, semanaDe, textoEnvio, totalNotas, borradorDe,
  erroresBorrador, cambiosBorrador, celularInternacional, validarCelulares, validarCorreos, MAX_AVISOS, textoPunto, cuerpoPunto, erroresPunto,
} from "../src/lib/newsletter/reglas.mjs";

const contenido = {
  asunto: "Novedades", introduccion: "Intro",
  secciones: { vigente: [{ id: "n1", titulo: "Lineamientos", resumen: "Resumen de la nota uno." }], en_discusion: [{ id: "n2", titulo: "Iniciativa", resumen: "Resumen de la nota dos." }] },
};
const boletin = { id: 3, estado: "programado", lunes: "2026-11-30", programado_para: "2026-12-01 09:00:00", contenido, guia_propuesta: [{ clave: "p1", titulo: "Punto", estado: "vigente" }] };

test("secciones fijas en el orden del boletín", () => {
  assert.deepEqual(SECCIONES.map((s) => s.titulo), ["Aprobado y vigente", "Aprobado con fecha de entrada", "En discusión", "Propuestas", "Consejo práctico para tu empresa"]);
});

test("estado del boletín en palabras (siempre con texto, no solo color)", () => {
  assert.deepEqual(estadoBoletin(boletin), { texto: "Programado", tono: "info" });
  assert.equal(estadoBoletin({ estado: "borrador" }).texto, "Generando…");
  assert.equal(estadoBoletin({ estado: "borrador", error: "IA caída", generado_en: "x" }).texto, "No se pudo generar");
  assert.equal(estadoBoletin({ estado: "borrador", contenido, error: "Llegó tarde" }).texto, "Necesita revisión");
  assert.equal(estadoBoletin({ estado: "borrador", contenido }).texto, "Espera tu aprobación");
  assert.equal(estadoBoletin({ estado: "enviado" }).texto, "Enviado");
  assert.equal(estadoBoletin({ estado: "cancelado" }).texto, "Cancelado");
  assert.equal(puedeEditar(boletin), true);
  assert.equal(puedeEditar({ ...boletin, estado: "enviado" }), false);
  assert.equal(puedeEditar({ estado: "borrador" }), false, "sin contenido no hay qué editar");
  assert.equal(puedeCancelar({ estado: "enviando" }), false);
  assert.equal(enCurso({ estado: "enviando" }), true);
  assert.equal(enCurso({ estado: "borrador" }), true);
  assert.equal(enCurso(boletin), false);
});

test("fechas y cuándo sale", () => {
  assert.equal(fechaLarga("2026-12-01 09:00:00"), "martes 1 de diciembre de 2026, 9:00");
  assert.equal(fechaLarga("2026-11-30"), "lunes 30 de noviembre de 2026");
  assert.equal(fechaLarga(null), "—");
  assert.equal(fechaCorta("2026-11-28"), "28/11/2026");
  assert.equal(semanaDe(boletin), "Semana del 30 de noviembre de 2026");
  assert.equal(textoEnvio(boletin), "Se enviará solo el martes 1 de diciembre de 2026, 9:00 si no lo cancelas.");
  assert.match(textoEnvio(boletin, { requerirAprobacion: true }), /Espera tu aprobación/);
  assert.equal(textoEnvio({ estado: "enviado", enviado_en: "2026-12-01 09:01:00", enviados: 229, destinatarios: 230, fallidos: 1 }), "Enviado el martes 1 de diciembre de 2026, 9:01 a 229 de 230 personas (1 con error).");
  assert.match(textoEnvio({ estado: "cancelado", cancelado_en: "2026-11-30 10:00:00", cancelado_por: "dueno@adamia.mx" }), /No se envió/);
  assert.equal(totalNotas(contenido), 2);
});

test("edición: solo se manda lo que cambió; quitar notas y propuestas; validación igual que el servidor", () => {
  const d = borradorDe(boletin);
  assert.deepEqual(cambiosBorrador(boletin, d), {});
  d.asunto = "  Nuevo asunto ";
  d.notas.n1.titulo = "Lineamientos de la STPS";
  d.notas.n2.quitar = true;
  d.guia.p1.quitar = true;
  assert.deepEqual(cambiosBorrador(boletin, d), { asunto: "Nuevo asunto", notas: [{ id: "n1", titulo: "Lineamientos de la STPS" }, { id: "n2", quitar: true }], guia: [{ clave: "p1", quitar: true }] });
  assert.deepEqual(erroresBorrador(d), {});
  d.asunto = "ab";
  d.notas.n1.resumen = "corto";
  assert.deepEqual(Object.keys(erroresBorrador(d)), ["asunto", "resumen:n1"]);
  d.notas.n2.titulo = "";
  assert.equal(erroresBorrador(d)["titulo:n2"], undefined, "una nota que se quita no se valida");
});

test("«Avisar por WhatsApp a» y «Avisar por correo a»: mismo criterio que el servidor", () => {
  assert.equal(celularInternacional("55 1234 5678"), "+525512345678");
  assert.equal(celularInternacional("+52 55 1234 5678"), "+525512345678");
  assert.equal(celularInternacional("+1 (415) 555-0100"), "+14155550100");
  assert.equal(celularInternacional("123"), null);
  assert.equal(celularInternacional(""), "");
  assert.deepEqual(validarCelulares(["55 1234 5678", "+525512345678", "", "+14155550100"]), { lista: ["+525512345678", "+14155550100"], error: null });
  assert.match(validarCelulares(["12"]).error, /no es un celular válido/);
  assert.match(validarCelulares(Array.from({ length: MAX_AVISOS + 1 }, (_, i) => `55123456${10 + i}`)).error, /5 celulares/);
  assert.deepEqual(validarCorreos([" Dueno@Adamia.mx ", "dueno@adamia.mx", ""]), { lista: ["dueno@adamia.mx"], error: null });
  assert.match(validarCorreos(["no-es-correo"]).error, /no es un correo/);
});

test("Guía 2027: estado legible, cuerpo del punto y validación (sin fuente → por confirmar)", () => {
  assert.equal(textoPunto({ estado: "aprobado_con_fecha", fecha_entrada: "2027-01-01" }), "Aprobado, con fecha de entrada: 01/01/2027");
  assert.equal(textoPunto({ estado: "vigente" }), "Vigente");
  const f = { titulo: "Ley silla", detalle: "Asientos con respaldo para quien trabaja de pie.", estado: "vigente", fecha_entrada: "", fuente_titulo: " DOF ", fuente_url: " https://dof.gob.mx/x ", fecha_fuente: "", nota: "", por_confirmar: false };
  assert.deepEqual(erroresPunto(f), {});
  assert.deepEqual(cuerpoPunto(f), { titulo: "Ley silla", detalle: "Asientos con respaldo para quien trabaja de pie.", estado: "vigente", fecha_entrada: null, fuente: { titulo: "DOF", url: "https://dof.gob.mx/x" }, fecha_fuente: null, nota: "", por_confirmar: false });
  assert.match(erroresPunto({ ...f, fuente_url: "" }).fuente_url, /por confirmar/);
  assert.deepEqual(erroresPunto({ ...f, fuente_url: "", por_confirmar: true }), {});
  assert.match(erroresPunto({ ...f, fuente_url: "http://dof.gob.mx" }).fuente_url, /https/);
  assert.match(erroresPunto({ ...f, estado: "aprobado_con_fecha" }).fecha_entrada, /fecha/);
});
