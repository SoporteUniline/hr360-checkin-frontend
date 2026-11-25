// Permisos de los usuarios con acceso (src/lib/permisos/permisos.mjs): plantillas, resumen, rutas → área, menú y
// botones de edición en pantallas de «solo ver».
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AREAS, CLAVES_AREA, NIVELES, PLANTILLAS, matrizDePlantilla, plantillaDeMatriz, resumen, areaDeRuta, nivelEnRuta,
  rutaPermitidaAcceso, filtrarGruposPorPermisos, esBotonDeEdicion, LIBRE, DUENO,
} from "../src/lib/permisos/permisos.mjs";
import { CLAVES } from "../src/lib/modulos/catalogo.mjs";

const matriz = (base, cambios = {}) => ({ ...Object.fromEntries(CLAVES_AREA.map((a) => [a, base])), ...cambios });
const acceso = (base, cambios = {}) => ({ plantilla: "personalizado", modulos: matriz(base, cambios), empresas: [] });

test("áreas: los módulos del catálogo (misma fuente) + Clima y Ajustes; mismas claves que el backend", () => {
  assert.deepEqual(CLAVES_AREA, [...CLAVES, "clima", "configuracion"]);
  assert.equal(AREAS.length, 13);
  assert.deepEqual(NIVELES.map((n) => n.clave), ["sin_acceso", "ver", "editar"]);
  assert.deepEqual(NIVELES.map((n) => n.nombre), ["Sin acceso", "Ver", "Ver y editar"]);
  assert.deepEqual(PLANTILLAS.map((p) => p.clave), ["administrador", "recursos_humanos", "reclutador", "solo_lectura", "personalizado"]);
});

test("plantillas rellenan la matriz como se decidió y se detectan de vuelta", () => {
  assert.ok(Object.values(matrizDePlantilla("administrador")).every((n) => n === "editar"));
  assert.ok(Object.values(matrizDePlantilla("solo_lectura")).every((n) => n === "ver"));
  const rh = matrizDePlantilla("recursos_humanos");
  for (const a of ["empleados", "asistencias", "nomina", "documentos", "clima", "evaluaciones"]) assert.equal(rh[a], "editar", a);
  assert.equal(rh.reclutamiento, "ver");
  const rc = matrizDePlantilla("reclutador");
  assert.deepEqual([rc.reclutamiento, rc.empleados, rc.nomina], ["editar", "ver", "sin_acceso"]);
  for (const p of ["administrador", "recursos_humanos", "reclutador", "solo_lectura"]) assert.equal(plantillaDeMatriz(matrizDePlantilla(p)), p);
  assert.equal(plantillaDeMatriz({ ...rc, nomina: "ver" }), "personalizado", "ajustar = personalizado");
  const actual = matriz("sin_acceso", { tareas: "ver" });
  assert.deepEqual(matrizDePlantilla("personalizado", actual), actual, "personalizado conserva lo elegido");
});

test("resumen: «Ve 8 módulos, edita 5, 2 empresas»", () => {
  const p = matriz("sin_acceso", { asistencias: "editar", empleados: "editar", nomina: "editar", clima: "editar", tareas: "editar", vacaciones: "ver", permisos: "ver", reclutamiento: "ver" });
  assert.equal(resumen(p, [7, 8]), "Ve 8 módulos, edita 5, 2 empresas");
  assert.equal(resumen(matriz("sin_acceso", { nomina: "ver" }), [7]), "Ve 1 módulo, edita 0, 1 empresa");
  assert.equal(resumen(matriz("editar"), []), "Ve 13 módulos, edita 13, todas las empresas");
});

test("rutas → área: base, opcionales (desde RUTAS_MODULO), libres y solo del dueño", () => {
  assert.deepEqual(areaDeRuta("/panel/registro-asistencia?fecha=hoy"), ["asistencias"]);
  assert.deepEqual(areaDeRuta("/panel/empleados/15"), ["empleados"]);
  assert.deepEqual(areaDeRuta("/panel/catalogos/areas-check"), ["asistencias"], "gana el prefijo más largo");
  assert.deepEqual(areaDeRuta("/panel/catalogos/puestos"), ["empleados"]);
  assert.deepEqual(areaDeRuta("/panel/nomina/bonos/3"), ["nomina"]);
  assert.deepEqual(areaDeRuta("/panel/solicitudes-equipo"), ["permisos", "vacaciones"]);
  assert.deepEqual(areaDeRuta("/panel/whatsapp"), ["reclutamiento"]);
  assert.deepEqual(areaDeRuta("/panel/clima/nom035"), ["clima"]);
  assert.equal(areaDeRuta("/panel/creditos-ia"), LIBRE);
  assert.equal(areaDeRuta("/panel/dashboard"), LIBRE);
  for (const r of ["/panel/usuarios-con-acceso", "/panel/mi-suscripcion", "/panel/modulos"]) assert.equal(areaDeRuta(r), DUENO, r);
  assert.equal(areaDeRuta("/panel/algo-nuevo"), null);
});

test("nivel en ruta: dueño todo; acceso según su matriz; varias áreas = la mejor", () => {
  const p = acceso("sin_acceso", { empleados: "ver", vacaciones: "editar" });
  assert.equal(nivelEnRuta("/panel/nomina", null), "editar", "dueño (sin permisos) = todo");
  assert.equal(nivelEnRuta("/panel/empleados", p), "ver");
  assert.equal(nivelEnRuta("/panel/nomina", p), "sin_acceso");
  assert.equal(nivelEnRuta("/panel/solicitudes-equipo", p), "editar");
  assert.equal(nivelEnRuta("/panel/usuarios-con-acceso", acceso("editar")), "dueno", "ni el Administrador");
  assert.equal(nivelEnRuta("/panel/creditos-ia", acceso("sin_acceso")), "editar", "créditos de IA: cualquiera");
  assert.equal(rutaPermitidaAcceso("/panel/empleados", p), true);
  assert.equal(rutaPermitidaAcceso("/panel/nomina", p), false);
  assert.equal(rutaPermitidaAcceso("/panel/mi-suscripcion", acceso("editar")), false);
});

test("menú: el acceso no ve lo que no tiene ni lo del dueño; el dueño ve todo", () => {
  const grupos = [
    { title: "Tiempo", items: [{ title: "Asistencias", url: "/panel/registro-asistencia" }, { title: "Monitor", url: "/panel/monitor" }] },
    { title: "Nómina", items: [{ title: "Nóminas", url: "/panel/nomina" }] },
    { title: "Ausencias", items: [{ title: "Vacaciones", children: [{ title: "Panel", url: "/panel/vacaciones" }, { title: "Ley", url: "/panel/vacaciones/por-ley" }] }, { title: "Permisos", url: "/panel/permisos" }] },
    { title: "Ajustes", items: [{ title: "Usuarios con acceso", url: "/panel/usuarios-con-acceso" }, { title: "Módulos", url: "/panel/modulos" }, { title: "Créditos de Adamia AI", url: "/panel/creditos-ia" }] },
  ];
  assert.equal(filtrarGruposPorPermisos(grupos, null), grupos);
  const p = acceso("sin_acceso", { asistencias: "ver", vacaciones: "editar" });
  const f = filtrarGruposPorPermisos(grupos, p);
  assert.deepEqual(f.map((g) => g.title), ["Tiempo", "Ausencias", "Ajustes"]);
  assert.deepEqual(f[1].items.map((i) => i.title), ["Vacaciones"]);
  assert.equal(f[1].items[0].children.length, 2);
  assert.deepEqual(f[2].items.map((i) => i.title), ["Créditos de Adamia AI"]);
  assert.deepEqual(filtrarGruposPorPermisos(grupos, acceso("editar"))[3].items.map((i) => i.title), ["Créditos de Adamia AI"], "Administrador tampoco ve lo del dueño");
});

test("botones de edición que se ocultan con «solo ver»", () => {
  for (const t of ["Guardar", "Nuevo acceso", "Nueva vacante", "Eliminar", "Agregar comida", "Crear plantilla", "Editar", "Importar empleados", " Guardar cambios ", "Autorizar nómina", "Cancelar la nómina", "Sincronizar con reloj"]) {
    assert.equal(esBotonDeEdicion(t), true, t);
  }
  for (const t of ["Cancelar", "Cerrar", "Exportar Excel", "Buscar", "Ver detalle", "Limpiar búsqueda", "Descargar PDF", "", null, "Nuevos ingresos del mes de noviembre de dos mil veintiséis en todas las sucursales"]) {
    assert.equal(esBotonDeEdicion(t), false, String(t));
  }
});
