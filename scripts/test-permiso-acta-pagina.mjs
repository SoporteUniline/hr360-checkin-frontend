// Pruebas de las reglas puras del permiso y el acta en página propia (28/11/2026): a dónde se regresa (?volver= solo
// rutas internas del panel), las rutas de cada página, cómo se encuentra el permiso a editar tal cual lo da la lista,
// cuándo hay cambios sin guardar y los pasos del acta. Uso: node --test scripts/test-permiso-acta-pagina.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { conParametros, rutaDeRegreso } from "../src/lib/formulario/rutaRegreso.mjs";
import { filaPermiso, fotoPermiso, rutaEditarPermiso, rutaNuevoPermiso, urlFilaPermiso } from "../src/lib/permisos/paginaPermiso.mjs";
import {
  CAMPOS_PASO, PASOS_ACTA, SANCIONES, erroresPorPaso, formatearTexto, pasoDeCampo, primerCampoConError, primerPasoConError,
  rutaEditarActa, rutaNuevaActa, siNo,
} from "../src/lib/actas/formularioActa.mjs";

test("rutaDeRegreso: solo rutas internas del panel", () => {
  assert.equal(rutaDeRegreso("/panel/registro-asistencia", "/panel/permisos"), "/panel/registro-asistencia");
  assert.equal(rutaDeRegreso("/panel/panel-empleado?emp=15&tab=permisos", "/x"), "/panel/panel-empleado?emp=15&tab=permisos");
  assert.equal(rutaDeRegreso("/panel", "/x"), "/panel");
  assert.equal(rutaDeRegreso("  /panel/monitor  ", "/x"), "/panel/monitor", "se quitan espacios de las orillas");
  for (const malo of [null, undefined, "", 12, "https://ejemplo.invalid/panel", "//ejemplo.invalid/panel", "/panelx", "/login",
    "/panel//ejemplo.invalid", "/panel/\\ejemplo", "/panel/a b", "javascript:alert(1)", "/panel/\nx", "panel/permisos"]) {
    assert.equal(rutaDeRegreso(malo, "/panel/permisos"), "/panel/permisos", `rechaza ${JSON.stringify(malo)}`);
  }
});

test("conParametros: sin vacíos y bien codificados", () => {
  assert.equal(conParametros("/a", {}), "/a");
  assert.equal(conParametros("/a", { x: null, y: undefined, z: "" }), "/a");
  assert.equal(conParametros("/a", { empresa: 7, volver: "/panel/monitor?f=1" }), "/a?empresa=7&volver=%2Fpanel%2Fmonitor%3Ff%3D1");
});

test("rutas del permiso", () => {
  assert.equal(rutaNuevoPermiso(), "/panel/permisos/nuevo");
  assert.equal(rutaNuevoPermiso({ empresa: "all" }), "/panel/permisos/nuevo", "«todas» es lo de siempre");
  assert.equal(rutaNuevoPermiso({ empresa: 7 }), "/panel/permisos/nuevo?empresa=7");
  assert.equal(rutaEditarPermiso(501, { empresa: "7", volver: "/panel/monitor" }), "/panel/permisos/501/editar?empresa=7&volver=%2Fpanel%2Fmonitor");
  assert.equal(rutaEditarPermiso("5/1"), "/panel/permisos/5%2F1/editar", "el id va codificado");
});

test("permiso a editar: la misma consulta de la lista, acotada a la persona y su día", () => {
  assert.equal(urlFilaPermiso({ id_empleado: 15, id_empresa: 7 }, "2026-12-07"),
    "/checador/solicitudes-permiso?empresa=7&page=1&limit=100&id_empleado=15&desde=2026-12-06&hasta=2026-12-08");
  assert.equal(urlFilaPermiso({ id_empleado: 15, empleado_id_empresa: 9 }, "2026-03-01"),
    "/checador/solicitudes-permiso?empresa=9&page=1&limit=100&id_empleado=15&desde=2026-02-28&hasta=2026-03-02", "cruza de mes");
  assert.equal(urlFilaPermiso({ id_empleado: 15, id_empresa: 7 }, "2026-01-01").includes("desde=2025-12-31"), true, "cruza de año");
  assert.equal(urlFilaPermiso(null, "2026-12-07"), null);
  assert.equal(urlFilaPermiso({ id_empleado: 15 }, "2026-12-07"), null, "sin empresa no se pide");
  assert.equal(urlFilaPermiso({ id_empleado: 15, id_empresa: 7 }, "07/12/2026"), null, "fecha mal formada");
  const resp = { data: [{ id: 500 }, { id: 501, goce_sueldo: 0 }] };
  assert.deepEqual(filaPermiso(resp, "501"), { id: 501, goce_sueldo: 0 });
  assert.equal(filaPermiso(resp, 9), null);
  assert.equal(filaPermiso(null, 1), null);
});

test("fotoPermiso: cambios sin guardar", () => {
  const form = { id_tipo_permiso: "3", motivo: "" };
  const a = fotoPermiso({ form, empleadoId: "", empleadoIds: ["2", "1"], idEmpresa: 7 });
  assert.equal(a, fotoPermiso({ form: { ...form }, empleadoIds: ["1", "2"], idEmpresa: "7" }), "el orden de los elegidos no cuenta");
  assert.notEqual(a, fotoPermiso({ form: { ...form, motivo: "x" }, empleadoIds: ["1", "2"], idEmpresa: "7" }));
  assert.notEqual(a, fotoPermiso({ form, empleadoIds: ["1"], idEmpresa: "7" }));
});

test("pasos del acta", () => {
  assert.deepEqual(PASOS_ACTA.map((p) => p.clave), ["persona", "hecho", "sancion", "declaraciones", "revisar"]);
  // Cada campo del esquema está en un solo paso.
  const todos = Object.values(CAMPOS_PASO).flat();
  assert.equal(new Set(todos).size, todos.length);
  assert.deepEqual([...todos].sort(), ["aceptaHechos", "cargoElabora", "descargo", "descripcion", "elabora", "empleado", "empresa", "esReincidencia",
    "fechaIncidente", "horaIncidente", "lugar", "sancion", "testigos", "tipoActa"]);
  assert.equal(pasoDeCampo("descripcion"), "hecho");
  assert.equal(pasoDeCampo("nada"), null);
  const errores = { sancion: { message: "x" }, descripcion: { message: "y" }, fechaIncidente: { message: "z" } };
  assert.deepEqual(erroresPorPaso(errores), { sancion: 1, hecho: 2 });
  assert.equal(primerPasoConError(errores), "hecho");
  assert.equal(primerPasoConError({}), null);
  assert.equal(primerCampoConError(errores, "hecho"), "fechaIncidente", "en el orden del paso");
  assert.equal(primerCampoConError(errores, "persona"), null);
});

test("rutas y textos del acta", () => {
  assert.equal(rutaNuevaActa(), "/panel/actas-administrativas/nueva");
  assert.equal(rutaEditarActa(88, { volver: "/panel/registro-asistencia" }), "/panel/actas-administrativas/88/editar?volver=%2Fpanel%2Fregistro-asistencia");
  assert.deepEqual(SANCIONES.map(formatearTexto), ["Amonestacion Verbal", "Amonestacion Escrita", "Suspension", "Rescision"]);
  assert.equal(formatearTexto(""), "");
  assert.equal(siNo(true), "Sí");
  assert.equal(siNo(0), "No");
});
