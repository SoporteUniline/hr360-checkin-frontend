// Módulos por empresa: catálogo y filtro del menú/rutas (src/lib/modulos/*.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { CLAVES, BASE, OPCIONALES, modulo, modulosDeRuta } from "../src/lib/modulos/catalogo.mjs";
import { clavesActivas, rutaPermitida, moduloFaltante, itemPermitido, filtrarGrupos, seccionesModulos, reclutamientoHabilitado, textoContratar } from "../src/lib/modulos/menu.mjs";

test("catálogo: mismas claves que el backend (services/modulosCatalogo.js)", () => {
  assert.deepEqual(CLAVES, ["asistencias", "empleados", "nomina", "vacaciones", "permisos", "evaluaciones", "reclutamiento", "tareas", "activos", "documentos", "turnos_extra", "induccion", "comunicados"]);
  assert.deepEqual(BASE, ["asistencias", "empleados"]);
  assert.equal(OPCIONALES.length, 11);
  assert.equal(modulo("nomina").nombre, "Nómina");
  assert.equal(modulo("inventado"), null);
});

test("cada opción del menú queda en su módulo (lo que no aparece es base)", () => {
  const esperado = {
    "/panel/nomina": ["nomina"], "/panel/nomina/bonos": ["nomina"], "/panel/nomina/prestamos/7": ["nomina"],
    "/panel/finiquitos-y-liquidaciones?empleado=3": ["nomina"], "/panel/aguinaldos": ["nomina"],
    "/empleado/panel/mis-recibos": ["nomina"], "/empleado/panel/mis-prestamos": ["nomina"],
    "/panel/vacaciones/por-ley": ["vacaciones"], "/panel/permisos": ["permisos"],
    "/panel/solicitudes-equipo": ["permisos", "vacaciones"], "/empleado/panel/solicitudes": ["permisos", "vacaciones"],
    "/empleado/panel/solicitudes-equipo": ["permisos", "vacaciones"],
    "/panel/evaluaciones/campanas": ["evaluaciones"], "/empleado/panel/evaluaciones": ["evaluaciones"],
    "/panel/reclutamiento/vacantes": ["reclutamiento"], "/panel/whatsapp?vista=entrevistas": ["reclutamiento"],
    "/panel/tareas/proyectos": ["tareas"], "/panel/checklists/revisar": ["tareas"], "/empleado/panel/tareas": ["tareas"],
    "/panel/activos": ["activos"], "/empleado/panel/mis-recursos": ["activos"],
    "/panel/gestion-documental/plantillas": ["documentos"], "/panel/turnos-extra": ["turnos_extra"],
    "/panel/nuevos-ingresos/12": ["induccion"], "/panel/plantillas-induccion": ["induccion"], "/empleado/panel/bienvenida": ["induccion"],
    "/panel/comunicados/12": ["comunicados"], "/panel/comunicados/moderacion": ["comunicados"], "/empleado/panel/muro/3": ["comunicados"],
  };
  for (const [url, claves] of Object.entries(esperado)) assert.deepEqual(modulosDeRuta(url), claves, url);
  for (const url of ["/panel/turnos", "/panel/horas-extra", "/panel/registro-asistencia", "/panel/incidencias", "/panel/reporte-horas",
    "/panel/empleados", "/panel/catalogos/puestos", "/panel/contratos", "/panel/festivos", "/panel/cuenta", "/panel/modulos",
    "/empleado/panel/inicio", "/empleado/panel/asistencias", "/empleado/panel/mi-espacio", "/empleado/panel/mi-firma", "/seleccionar-reloj"]) {
    assert.equal(modulosDeRuta(url), null, `${url} es base`);
  }
});

test("claves activas: servidor viejo o Admin = sin filtro; varias empresas se unen; base siempre", () => {
  assert.equal(clavesActivas(undefined), null);
  assert.equal(clavesActivas({ todos: true, modulos: {} }), null);
  assert.equal(clavesActivas({ todos: false, modulos: {} }), null, "sin empresas: no se filtra");
  const a = clavesActivas({ modulos: { 7: ["asistencias", "empleados", "vacaciones"], 8: ["nomina"] } });
  assert.deepEqual([...a].sort(), ["asistencias", "empleados", "nomina", "vacaciones"]);
  const solo7 = clavesActivas({ modulos: { 7: ["vacaciones"], 8: ["nomina"] } }, { empresa: 7 });
  assert.equal(solo7.has("nomina"), false);
  assert.equal(solo7.has("asistencias"), true);
});

test("rutas: apagado se oculta; solicitudes con permisos o vacaciones; interruptor global de reclutamiento", () => {
  const activos = new Set(["asistencias", "empleados", "vacaciones", "reclutamiento"]);
  assert.equal(rutaPermitida("/panel/nomina", activos), false);
  assert.equal(rutaPermitida("/panel/registro-asistencia", activos), true);
  assert.equal(rutaPermitida("/empleado/panel/solicitudes", activos), true, "vacaciones basta");
  assert.equal(rutaPermitida("/empleado/panel/solicitudes", new Set(["asistencias"])), false);
  assert.equal(rutaPermitida("/panel/nomina", null), true, "sin datos no se oculta");
  assert.equal(rutaPermitida("/panel/whatsapp", activos, { reclutamiento: false }), false, "emergencia: oculto para todos");
  assert.equal(rutaPermitida("/panel/whatsapp", null, { reclutamiento: false }), false);
  assert.equal(moduloFaltante("/panel/nomina/bonos", activos).nombre, "Nómina");
  assert.equal(moduloFaltante("/panel/empleados", activos), null);
  assert.equal(reclutamientoHabilitado("false"), false);
  assert.equal(reclutamientoHabilitado(undefined), true);
  assert.equal(reclutamientoHabilitado("true"), true);
});

test("menú: grupos sin lo apagado; submenús por hijo; grupos vacíos desaparecen", () => {
  const grupos = [
    { group: "NÓMINA", items: [{ title: "Nóminas", url: "/panel/nomina" }, { title: "Aguinaldos", url: "/panel/aguinaldos" }] },
    { group: "AUSENCIAS", items: [
      { title: "Solicitudes de mi equipo", url: "/panel/solicitudes-equipo" },
      { title: "Vacaciones", children: [{ title: "Panel", url: "/panel/vacaciones" }, { title: "Por ley", url: "/panel/vacaciones/por-ley" }] },
      { title: "Permisos", url: "/panel/permisos" }, { title: "Días festivos", url: "/panel/festivos" },
    ] },
  ];
  const activos = new Set(["asistencias", "empleados", "permisos"]);
  const r = filtrarGrupos(grupos, activos);
  assert.deepEqual(r.map((g) => g.group), ["AUSENCIAS"], "Nómina apagada: el grupo desaparece");
  assert.deepEqual(r[0].items.map((i) => i.title), ["Solicitudes de mi equipo", "Permisos", "Días festivos"]);
  assert.equal(itemPermitido(grupos[1].items[1], new Set(["vacaciones"])), true);
  assert.equal(filtrarGrupos(grupos, null).length, 2, "sin filtro: todo");
});

test("pantalla Módulos: base fija, con interruptor y con candado; texto para contratar", () => {
  const s = seccionesModulos([
    { clave: "asistencias", base: true, derecho: true }, { clave: "nomina", base: false, derecho: true }, { clave: "tareas", base: false, derecho: false },
  ]);
  assert.deepEqual([s.base.length, s.conDerecho[0].clave, s.sinDerecho[0].clave], [1, "nomina", "tareas"]);
  assert.equal(textoContratar("Nómina", "Empacadora"), "Hola, quiero contratar el módulo de Nómina de ADAMIA para Empacadora.");
});
