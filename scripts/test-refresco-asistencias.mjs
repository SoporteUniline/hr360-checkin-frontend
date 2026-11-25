// Refresco de Asistencias y Monitor sin recargar (lib/asistencia/refresco.mjs, INC-008).
import assert from "node:assert/strict";
import test from "node:test";
import {
  crearRefrescador, decidir, empresasDelCanal, esClaveAsistencia, esEscrituraAsistencia, rutaDe, textoClave, tocaAlVolver, tocaSondeo, TIEMPOS,
} from "../src/lib/asistencia/refresco.mjs";

test("filtro de claves: todo lo que depende de asistencias en la pantalla, nada más", () => {
  const si = [
    "/checador/asistencias?empresa=all&page=1&limit=50&fechaInicio=2026-11-25&fechaFin=2026-11-25", // tabla y Monitor
    ["/checador/asistencias#periodo", "empresa=all&fechaInicio=2026-11-01"], // periodo completo (tarjetas, filtros, matriz)
    "/checador/asistencias?empresa=10&page=1&limit=50&fechaInicio=2026-11-23&fechaFin=2026-11-23&filtroEmpleado=Ana", // Nómina
    "/checador/asistencias/501/cambios", // historial «Qué cambió»
    "/checador/reloj/asistencia-por-empleado?id_empleado=7&fecha=2026-11-25", // checadas del panel
    "/checador/reloj/asistencia?empresa=10",
    ["/checador/cuenta-horas?empleados=1,2,3", "501,502"], // CuentaHorasContext
    "/checador/cuenta-horas/por-reponer?empresa=all", // «Horas por reponer» y su contador
    "/checador/cuenta-horas/7", // detalle de la cuenta
    "/checador/horas-extra/empleado/7?desde=2026-11-23&hasta=2026-11-29", // useHorasExtraDia y DialogosReponer
    "/checador/reportes/horas-ley?fechaInicio=2026-11-23&fechaFin=2026-11-29&empresa=10", // VistaHoras
    "/checador/mi-equipo/hoy",
    "https://api.adamia.com.mx/api/checador/asistencias?empresa=10", // con origen y /api
  ];
  for (const clave of si) assert.equal(esClaveAsistencia(clave), true, JSON.stringify(clave));
  const no = [
    "/checador/asistencias/501/reloj", // el editor abierto: toma su borrador de la primera carga
    "/checador/asistencias-legacy",
    "/checador/holidays/10", // catálogos: no cambian con una asistencia
    "/checador/tiposPermiso",
    "/checador/motivos-permiso",
    "/checador/empleados?empresa=10",
    "/checador/departamentos?id_empresa=10",
    "/checador/reloj/offline/perfil",
    ["employee-requests-all", 7, 10],
    null, undefined, 42, [],
  ];
  for (const clave of no) assert.equal(esClaveAsistencia(clave), false, JSON.stringify(clave));
});

test("textoClave y rutaDe", () => {
  assert.equal(textoClave(["/a", 1]), "/a");
  assert.equal(textoClave("/b"), "/b");
  assert.equal(textoClave([1, "/c"]), "");
  assert.equal(rutaDe("https://api.prueba.invalid/api/checador/asistencias/5"), "/checador/asistencias/5");
  assert.equal(rutaDe("checador/asistencias"), "/checador/asistencias");
  assert.equal(rutaDe("/api/x"), "/x");
});

test("escrituras que cambian asistencias (de cualquier pantalla del navegador)", () => {
  const si = [
    ["put", "/checador/asistencias/501"], ["PUT", "/checador/asistencias/501/reloj"], ["put", "/checador/asistencias/501/estado-dia"],
    ["post", "/checador/asistencias/501/comida"], ["delete", "/checador/asistencias/501/comida/9"], ["post", "/checador/asistencias/masivo/estado-dia"],
    ["put", "https://api.x/api/checador/reloj/actualizar/77"], ["post", "https://api.x/api/checador/bulk-incident/register"],
    ["put", "/checador/horas-extra/empleado/7"], ["post", "/checador/cuenta-horas/7/cierres"], ["post", "/checador/cuenta-horas/cierres/3/deshacer"],
    ["patch", "/checador/solicitudes-permiso/40/estado"], ["post", "/checador/solicitudes-permiso"], ["delete", "/checador/solicitudes-permiso/40"],
    ["post", "/checador/turnos-extra"], ["post", "/checador/turnos-extra/4/cancelar"],
  ];
  for (const [m, u] of si) assert.equal(esEscrituraAsistencia(m, u), true, `${m} ${u}`);
  const no = [
    ["get", "/checador/asistencias?empresa=10"], ["get", "/checador/asistencias/5/reloj"], [undefined, "/checador/asistencias/5"],
    ["post", "/checador/reloj/offline/referencias"], ["post", "/checador/reloj/registrar"], ["put", "/checador/empleados/5"],
    ["patch", "/checador/vacaciones/masivas"], ["put", "/checador/permisos-acceso/3"], ["post", "/checador/tiposPermiso"],
  ];
  for (const [m, u] of no) assert.equal(esEscrituraAsistencia(m, u), false, `${m} ${u}`);
});

test("canal SSE: «Todas las empresas» se suscribe a las del usuario, nunca a «all»", () => {
  assert.equal(empresasDelCanal("all", [10, 7, 10]), "7,10");
  assert.equal(empresasDelCanal("all", [{ id_empresa: 3 }, { id_empresa: "4" }]), "3,4");
  assert.equal(empresasDelCanal("all", []), null);
  assert.equal(empresasDelCanal(7, [1, 2]), "7");
  assert.equal(empresasDelCanal("8"), "8");
  assert.equal(empresasDelCanal(null), null);
  assert.equal(empresasDelCanal("x"), null);
});

test("regla «no recargar con una edición abierta»: lo automático espera; un guardado propio no", () => {
  for (const motivo of ["checada", "asistencia", "cola", "foco", "sondeo"]) {
    assert.equal(decidir({ motivo, visible: true, editando: true }), "pendiente", motivo);
    assert.equal(decidir({ motivo, visible: false, editando: false }), "pendiente", `${motivo} oculta`);
    assert.equal(decidir({ motivo, visible: true, editando: false }), "ahora", motivo);
  }
  assert.equal(decidir({ motivo: "guardado", visible: true, editando: true }), "ahora");
  assert.equal(decidir({ motivo: "guardado", visible: false, editando: true }), "ahora");
});

test("sondeo de respaldo: solo a la vista, sin edición, con el canal callado y sin recarga reciente", () => {
  const ahora = 1_000_000;
  const base = { ahora, visible: true, editando: false, ultimoPing: null, ultimoRefresco: ahora - TIEMPOS.sondeo };
  assert.equal(tocaSondeo(base), true, "canal sin señales: sondea cada minuto");
  assert.equal(tocaSondeo({ ...base, ultimoPing: ahora - 10_000 }), false, "canal vivo: no sondea");
  assert.equal(tocaSondeo({ ...base, ultimoPing: ahora - TIEMPOS.canalVivo }), true, "ping viejo: el canal se cayó");
  assert.equal(tocaSondeo({ ...base, visible: false }), false, "pestaña oculta");
  assert.equal(tocaSondeo({ ...base, editando: true }), false, "edición abierta");
  assert.equal(tocaSondeo({ ...base, ultimoRefresco: ahora - 5_000 }), false, "recargó hace poco");
});

test("al volver a la pestaña: si hubo avisos, si el canal calló o si pasó un rato", () => {
  const ahora = 5_000_000;
  const vivo = { ahora, pendiente: false, ultimoPing: ahora - 1_000, ultimoRefresco: ahora - 1_000 };
  assert.equal(tocaAlVolver(vivo), false, "canal vivo y recién recargado");
  assert.equal(tocaAlVolver({ ...vivo, pendiente: true }), true);
  assert.equal(tocaAlVolver({ ...vivo, ultimoPing: null }), true);
  assert.equal(tocaAlVolver({ ...vivo, ultimoRefresco: ahora - TIEMPOS.foco }), true);
});

// Refrescador con reloj y temporizadores falsos.
function arnes({ editando = false, visible = true } = {}) {
  let t = 0;
  const timers = [];
  const llamadas = [];
  const resolutores = [];
  const estado = { editando, visible };
  const r = crearRefrescador({
    mutar: (filtro) => { llamadas.push(filtro); return new Promise((res) => resolutores.push(res)); },
    estado: () => estado,
    reloj: () => t,
    programar: (fn, ms) => { const h = { fn, en: t + ms }; timers.push(h); return h; },
    cancelar: (h) => { const i = timers.indexOf(h); if (i >= 0) timers.splice(i, 1); },
  });
  const avanzar = async (ms) => {
    t += ms;
    for (const h of [...timers].filter((x) => x.en <= t)) { timers.splice(timers.indexOf(h), 1); h.fn(); }
    await new Promise((res) => setImmediate(res));
  };
  const terminar = async () => { resolutores.shift()?.(); await new Promise((res) => setImmediate(res)); await new Promise((res) => setImmediate(res)); };
  return { r, llamadas, estado, avanzar, terminar, timers };
}
const tick = () => new Promise((res) => setImmediate(res));

test("refrescador: revalida con el filtro de claves de asistencias (mutate global)", async () => {
  const { r, llamadas, terminar } = arnes();
  r.marcarEscritura();
  const p = r.refrescar("guardado");
  await tick();
  assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0], esClaveAsistencia);
  await terminar();
  await p;
});

test("guardado + onGuardado de la pantalla + eco SSE = UNA sola vuelta de peticiones", async () => {
  const { r, llamadas, avanzar, terminar } = arnes();
  r.marcarEscritura(); // respuesta 2xx del PUT (interceptor de axios)
  const a = r.refrescar("guardado"); // interceptor
  const b = r.refrescar("guardado"); // onGuardado → mutateAsistencia de la pantalla
  assert.equal(r.avisar("asistencia"), "en-curso", "el eco del SSE se une");
  await avanzar(TIEMPOS.demora + 10);
  assert.equal(llamadas.length, 1, "una sola vuelta");
  await terminar();
  await Promise.all([a, b]);
  assert.equal(r.vueltas(), 1);
});

test("una escritura durante una recarga vieja encadena UNA vuelta más (no se queda con datos de antes)", async () => {
  const { r, llamadas, avanzar, terminar } = arnes();
  r.avisar("sondeo");
  await avanzar(TIEMPOS.demora);
  assert.equal(llamadas.length, 1, "recarga del sondeo en curso");
  r.marcarEscritura();
  const a = r.refrescar("guardado");
  const b = r.refrescar("guardado");
  await tick();
  assert.equal(llamadas.length, 1, "espera a la vieja");
  await terminar();
  await tick();
  assert.equal(llamadas.length, 2, "una vuelta encadenada, no dos");
  await terminar();
  await Promise.all([a, b]);
});

test("ráfaga de eventos SSE (hora pico) = una recarga", async () => {
  const { r, llamadas, avanzar, terminar } = arnes();
  for (let i = 0; i < 25; i++) r.avisar(i % 2 ? "checada" : "asistencia");
  await avanzar(TIEMPOS.demora - 1);
  assert.equal(llamadas.length, 0, "aún juntando");
  await avanzar(1);
  assert.equal(llamadas.length, 1);
  await terminar();
});

test("con una edición abierta con cambios no se recarga; al cerrarla se hace lo pendiente", async () => {
  const { r, llamadas, avanzar, estado, terminar } = arnes({ editando: true });
  assert.equal(r.avisar("asistencia"), "pendiente");
  assert.equal(r.avisar("sondeo"), "pendiente");
  await avanzar(TIEMPOS.demora * 3);
  assert.equal(llamadas.length, 0, "no pisa la edición");
  assert.equal(r.hayPendiente(), true);
  assert.equal(r.reanudar(), false, "sigue editando");
  estado.editando = false;
  assert.equal(r.reanudar(), true);
  await avanzar(TIEMPOS.demora);
  assert.equal(llamadas.length, 1, "al cerrar la edición se recarga una vez");
  assert.equal(r.hayPendiente(), false);
  await terminar();
});

test("si la edición se abre mientras se juntaban eventos, tampoco se recarga", async () => {
  const { r, llamadas, avanzar, estado } = arnes();
  assert.equal(r.avisar("asistencia"), "programado");
  estado.editando = true;
  await avanzar(TIEMPOS.demora);
  assert.equal(llamadas.length, 0);
  assert.equal(r.hayPendiente(), true);
});

test("pestaña oculta: los eventos quedan pendientes y se recarga al volver", async () => {
  const { r, llamadas, avanzar, estado, terminar } = arnes({ visible: false });
  r.avisar("checada");
  r.avisar("asistencia");
  await avanzar(TIEMPOS.demora);
  assert.equal(llamadas.length, 0, "sin peticiones en segundo plano");
  estado.visible = true;
  assert.equal(r.reanudar(), true);
  await avanzar(TIEMPOS.demora);
  assert.equal(llamadas.length, 1);
  await terminar();
});

test("un guardado propio con la edición abierta sí recarga (es la persona guardando)", async () => {
  const { r, llamadas, terminar } = arnes({ editando: true });
  r.marcarEscritura();
  const p = r.refrescar("guardado");
  await tick();
  assert.equal(llamadas.length, 1);
  assert.equal(r.esEco(), true, "justo después del guardado, el aviso del SSE es eco");
  await terminar();
  await p;
});
