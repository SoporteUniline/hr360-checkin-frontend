// Expediente laboral por etapas (28/11/2026): reglas de presentación (src/lib/expediente/presentacion.mjs). Puras.
// Las reglas de ley (plazos, lista de ley) se prueban en el backend (tests/expedienteLey.test.cjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  accionesDocumento, consultaTablero, etiquetaEstado, mensajeError, nombreDescarga, ordenarCarpetas, origenItem, pendientesEtapa,
  puedeMarcar, puedeSubir, tamano, textoGuarda, textoResumen, tonoPorcentaje,
} from "../src/lib/expediente/presentacion.mjs";

test("estados: los pasos dicen «Hecho», los documentos «Lo tiene»; tonos", () => {
  assert.deepEqual(etiquetaEstado({ estado: "cumplido", paso: true }), { texto: "Hecho", tono: "verde" });
  assert.deepEqual(etiquetaEstado({ estado: "cumplido", paso: false }), { texto: "Lo tiene", tono: "verde" });
  assert.equal(etiquetaEstado({ estado: "vencido" }).tono, "rojo");
  assert.equal(etiquetaEstado({ estado: "no_aplica", paso: true }).texto, "No aplica");
  assert.equal(etiquetaEstado({ estado: "raro" }).texto, "Falta");
});

test("de dónde sale cada estado: marca a mano con quién y cuándo, otro módulo o documento", () => {
  assert.equal(origenItem({ origen: "manual", estado: "cumplido", marca: { por: "RH Demo", en: "2026-11-27 10:05" } }), "Marcado a mano por RH Demo el 27/11/2026 10:05");
  assert.equal(origenItem({ origen: "manual", estado: "no_aplica", marca: { por: "RH", en: "2026-11-27", nota: "Asimilado" } }), "Marcado «no aplica» por RH el 27/11/2026: Asimilado");
  assert.equal(origenItem({ origen: "vinculado", vinculo: { titulo: "Contrato CT-1" } }), "Viene de Contrato CT-1");
  assert.equal(origenItem({ origen: null, motivo: "Lleva menos de un mes." }), "Lleva menos de un mes.");
});

test("plazo de guarda en palabras", () => {
  assert.equal(textoGuarda({ puede_depurarse: true }), "Su plazo de guarda terminó: puede depurarse.");
  assert.equal(textoGuarda({ hasta: "2030-01-31", por_confirmar: true }), "Se conserva hasta el 31/01/2030 (plazo por confirmar con abogado).");
  assert.match(textoGuarda({ mientras_relacion: true }), /mientras dure la relación laboral/);
  assert.equal(textoGuarda(null), null);
});

test("botones de un documento: en plazo no hay «Depurar»; versión anterior no se restaura; el empleado solo ve", () => {
  const enPlazo = { estatus_manual: "ACTIVO", origen: "MANUAL", guarda: { en_plazo: true, puede_depurarse: false } };
  assert.deepEqual(accionesDocumento(enPlazo, { puedeEditar: true }), ["ver", "reemplazar", "archivar"]);
  assert.deepEqual(accionesDocumento({ ...enPlazo, guarda: { puede_depurarse: true } }, { puedeEditar: true }), ["ver", "reemplazar", "archivar", "depurar"]);
  assert.deepEqual(accionesDocumento({ estatus_manual: "ARCHIVADO", reemplazado_por_id: 9, guarda: { en_plazo: true } }, { puedeEditar: true }), ["ver"]);
  assert.deepEqual(accionesDocumento({ estatus_manual: "ARCHIVADO", guarda: { en_plazo: true } }, { puedeEditar: true }), ["ver", "restaurar"]);
  assert.deepEqual(accionesDocumento(enPlazo, { puedeEditar: false }), ["ver"]);
  assert.deepEqual(accionesDocumento({ ...enPlazo, origen: "GENERADO" }, { puedeEditar: true }), ["ver"], "los generados se manejan en Gestión documental");
});

test("porcentaje y resumen", () => {
  assert.equal(tonoPorcentaje(100), "verde");
  assert.equal(tonoPorcentaje(75), "ambar");
  assert.equal(tonoPorcentaje(40), "rojo");
  assert.equal(textoResumen({ total: 10, cumplidos: 7, faltan: 2, vencidos: 1, por_vencer: 1 }), "7 de 10 de ley · 2 faltan · 1 vencido · 1 por vencer");
  assert.equal(textoResumen({ total: 6, cumplidos: 5, faltan: 1 }), "5 de 6 de ley · 1 falta");
  assert.equal(textoResumen({ total: 0 }), "Nada de ley le aplica todavía.");
});

test("errores del backend en palabras: 409 en plazo, 403, 503, sin conexión", () => {
  assert.equal(mensajeError({ response: { status: 409, data: { error: "«Contrato» se debe conservar…" } } }), "«Contrato» se debe conservar…");
  assert.match(mensajeError({ response: { status: 403, data: "x" } }), /No tienes permiso/);
  assert.match(mensajeError({ response: { status: 503 } }), /preparar la base de datos/);
  assert.match(mensajeError({}), /No hay conexión/);
  assert.equal(mensajeError({ response: { status: 500 } }, "Otro"), "Otro");
});

test("filtros del tablero y nombre del archivo descargado", () => {
  assert.equal(consultaTablero({}), "");
  assert.equal(consultaTablero({ estado: "bajas", sucursal: "Centro", q: " Ana ", incompletos: true }), "?estado=bajas&sucursal=Centro&q=Ana&incompletos=1");
  assert.equal(nombreDescarga('attachment; filename="Expediente-Emp-20-2026-11-28.zip"', "x.zip"), "Expediente-Emp-20-2026-11-28.zip");
  assert.equal(nombreDescarga(null, "x.zip"), "x.zip");
});

test("pendientes de una etapa, carpetas llenas primero, quién marca o sube", () => {
  assert.equal(pendientesEtapa({ pasos: [{ estado: "falta" }, { estado: "vencido" }, { estado: "cumplido" }] }), 2);
  const { llenas, vacias } = ordenarCarpetas([{ clave: "a", documentos: [], vinculos: [] }, { clave: "b", documentos: [{}], vinculos: [] }, { clave: "c", vinculos: [{}] }]);
  assert.deepEqual(llenas.map((c) => c.clave), ["b", "c"]);
  assert.deepEqual(vacias.map((c) => c.clave), ["a"]);
  assert.equal(puedeMarcar({ paso: true }, true), true);
  assert.equal(puedeMarcar({ paso: false }, true), false);
  assert.equal(puedeMarcar({ paso: true }, false), false);
  assert.equal(puedeSubir({ documento: true, estado: "falta" }, true), true);
  assert.equal(puedeSubir({ documento: false, estado: "falta" }, true), false);
  assert.equal(puedeSubir({ documento: true, estado: "no_aplica" }, true), false);
  assert.equal(tamano(2_500_000), "2.4 MB");
  assert.equal(tamano(0), "");
});

test("error de una descarga (Blob con JSON) se lee para mostrar su mensaje", async () => {
  const { leerErrorBlob } = await import("../src/lib/expediente/presentacion.mjs");
  const err = { response: { status: 503, data: new Blob([JSON.stringify({ error: "Falta correr la migración." })], { type: "application/json" }) } };
  await leerErrorBlob(err);
  assert.equal(mensajeError(err), "Falta correr la migración.");
  const raro = { response: { status: 500, data: new Blob(["<html>"]) } };
  await leerErrorBlob(raro);
  assert.equal(mensajeError(raro, "No se pudo descargar."), "No se pudo descargar.");
});
