// Permisos de los usuarios con acceso (16/12/2026). Ver backend docs/permisos-accesos.md.
// Sin red ni React: probado en scripts/test-permisos.mjs. La verdad está en el servidor (403 PERMISO_*); esto solo
// oculta lo que no se puede usar (menú, rutas y botones de edición).
//
// Áreas = módulos de src/lib/modulos/catalogo.mjs (fuente única) + Clima y NOM-035 y Ajustes de la empresa. La MISMA
// lista vive en el backend (services/permisosCatalogo.js). Si cambias una clave, cámbiala en los dos.
import { MODULOS, RUTAS_MODULO } from "../modulos/catalogo.mjs";

export const AREAS = Object.freeze([
  ...MODULOS.map((m) => Object.freeze({ clave: m.clave, nombre: m.nombre, descripcion: m.descripcion })),
  Object.freeze({ clave: "clima", nombre: "Clima y NOM-035", descripcion: "Encuestas de clima, NOM-035, resultados y planes de acción." }),
  Object.freeze({ clave: "configuracion", nombre: "Ajustes de la empresa", descripcion: "Datos y logo de la empresa, plantillas de felicitación y campos personalizados." }),
]);
export const CLAVES_AREA = AREAS.map((a) => a.clave);
const POR_CLAVE = new Map(AREAS.map((a) => [a.clave, a]));
export const area = (clave) => POR_CLAVE.get(String(clave ?? "")) ?? null;

export const NIVELES = Object.freeze([
  Object.freeze({ clave: "sin_acceso", nombre: "Sin acceso", corto: "Sin acceso" }),
  Object.freeze({ clave: "ver", nombre: "Ver", corto: "Ver" }),
  Object.freeze({ clave: "editar", nombre: "Ver y editar", corto: "Editar" }),
]);
const RANGO = { sin_acceso: 0, ver: 1, editar: 2 };
export const alcanza = (nivel, requerido) => (RANGO[nivel] ?? 0) >= (RANGO[requerido] ?? 99);

const todas = (nivel) => Object.fromEntries(CLAVES_AREA.map((c) => [c, nivel]));
const con = (base, cambios) => Object.freeze({ ...todas(base), ...cambios });

export const PLANTILLAS = Object.freeze([
  Object.freeze({ clave: "administrador", nombre: "Administrador", descripcion: "Ve y edita todos los módulos.", permisos: con("editar", {}) }),
  Object.freeze({
    clave: "recursos_humanos", nombre: "Recursos Humanos",
    descripcion: "Personal, asistencias, incidencias, nómina, documentos, clima y evaluaciones. Ve reclutamiento.",
    permisos: con("sin_acceso", {
      empleados: "editar", asistencias: "editar", vacaciones: "editar", permisos: "editar", turnos_extra: "editar",
      nomina: "editar", documentos: "editar", clima: "editar", evaluaciones: "editar",
      reclutamiento: "ver", tareas: "ver", activos: "ver", configuracion: "ver",
    }),
  }),
  Object.freeze({ clave: "reclutador", nombre: "Reclutador", descripcion: "Reclutamiento, bolsa de trabajo y WhatsApp. Ve el personal.", permisos: con("sin_acceso", { reclutamiento: "editar", empleados: "ver" }) }),
  Object.freeze({ clave: "solo_lectura", nombre: "Solo lectura", descripcion: "Ve todos los módulos, no cambia nada.", permisos: con("ver", {}) }),
  Object.freeze({ clave: "personalizado", nombre: "Personalizado", descripcion: "Tú eliges módulo por módulo.", permisos: null }),
]);
export const plantilla = (clave) => PLANTILLAS.find((p) => p.clave === clave) ?? null;

/** Matriz completa de una plantilla. Personalizado: conserva la matriz actual (o todo «sin acceso»). */
export function matrizDePlantilla(clave, actual = null) {
  const p = plantilla(clave);
  if (p?.permisos) return { ...p.permisos };
  return { ...todas("sin_acceso"), ...(actual ?? {}) };
}

/** Plantilla que corresponde a una matriz (la que coincide exacta) o «personalizado». */
export function plantillaDeMatriz(matriz = {}) {
  const p = PLANTILLAS.find((x) => x.permisos && CLAVES_AREA.every((a) => (matriz[a] ?? "sin_acceso") === x.permisos[a]));
  return p?.clave ?? "personalizado";
}

/** «Ve 8 módulos, edita 5, 2 empresas» (misma regla que el backend). */
export function resumen(matriz = {}, empresas = []) {
  const niveles = CLAVES_AREA.map((a) => matriz[a] ?? "sin_acceso");
  const ve = niveles.filter((n) => alcanza(n, "ver")).length;
  const edita = niveles.filter((n) => n === "editar").length;
  const e = empresas?.length ? `${empresas.length} ${empresas.length === 1 ? "empresa" : "empresas"}` : "todas las empresas";
  return `Ve ${ve} ${ve === 1 ? "módulo" : "módulos"}, edita ${edita}, ${e}`;
}

// ── Rutas del panel → área ─────────────────────────────────────────────────────────────────────────────────────
export const LIBRE = "libre"; // cualquiera con sesión
export const DUENO = "dueno"; // solo el dueño de la cuenta
// Las de los módulos opcionales salen de RUTAS_MODULO (misma fuente que la puerta de módulos); aquí van las de la base,
// Clima, Ajustes y las del dueño. Gana el prefijo más largo.
const RUTAS_PROPIAS = [
  ["/panel/dashboard", LIBRE], ["/panel/cuenta", LIBRE], ["/panel/seguridad", LIBRE], ["/panel/creditos-ia", LIBRE],
  ["/panel/mis-encuestas", LIBRE],
  ["/panel/usuarios-con-acceso", DUENO], ["/panel/mi-suscripcion", DUENO], ["/panel/modulos", DUENO],
  ["/panel/cotizaciones", DUENO], ["/panel/mensajes-sistema", DUENO],
  ["/panel/monitor", "asistencias"], ["/panel/registro-asistencia", "asistencias"], ["/panel/horas-extra", "asistencias"],
  ["/panel/registro-de-entradas-y-salidas", "asistencias"], ["/seleccionar-reloj", "asistencias"], ["/panel/incidencias", "asistencias"],
  ["/panel/reporte-horas", "asistencias"], ["/panel/reportes-personalizados", "asistencias"], ["/panel/turnos", "asistencias"],
  ["/panel/festivos", "asistencias"], ["/panel/catalogos/areas-check", "asistencias"], ["/panel/catalogos/tipos-registro", "asistencias"],
  ["/panel/reglas-aviso", "asistencias"], ["/panel/configuracion-checador", "asistencias"],
  ["/panel/empleados", "empleados"], ["/panel/panel-empleado", "empleados"], ["/panel/catalogos", "empleados"],
  ["/panel/contratos", "empleados"], ["/panel/actas-administrativas", "empleados"], ["/panel/mapa-de-rutas", "empleados"],
  ["/panel/clima", "clima"],
  ["/panel/plantillas-felicitacion", "configuracion"], ["/panel/campos-personalizados", "configuracion"],
];
export const RUTAS_AREA = Object.freeze(
  [...RUTAS_PROPIAS, ...RUTAS_MODULO.filter(([r]) => !r.startsWith("/empleado/"))].sort((a, b) => b[0].length - a[0].length),
);

const sinConsulta = (url) => String(url ?? "").split(/[?#]/)[0].replace(/\/+$/, "") || "/";

/** Áreas (lista), LIBRE, DUENO o null (ruta sin mapa: no se oculta, el servidor decide). */
export function areaDeRuta(url) {
  const ruta = sinConsulta(url);
  for (const [prefijo, a] of RUTAS_AREA) {
    if (ruta === prefijo || ruta.startsWith(`${prefijo}/`)) return a === LIBRE || a === DUENO ? a : [].concat(a);
  }
  return null;
}

// permisos: lo que manda /users/verify/token para un acceso ({ plantilla, modulos, empresas }); null = dueño (todo).

/** Nivel del acceso en una ruta: "editar" | "ver" | "sin_acceso" | "dueno". Dueño o sin permisos: "editar". */
export function nivelEnRuta(url, permisos) {
  if (!permisos?.modulos) return "editar";
  const a = areaDeRuta(url);
  if (a === null || a === LIBRE) return "editar";
  if (a === DUENO) return "dueno";
  const niveles = a.map((c) => permisos.modulos[c] ?? "sin_acceso");
  if (niveles.includes("editar")) return "editar";
  if (niveles.includes("ver")) return "ver";
  return "sin_acceso";
}

export const rutaPermitidaAcceso = (url, permisos) => ["editar", "ver"].includes(nivelEnRuta(url, permisos));

/** Menú lateral sin lo que el acceso no puede ver; los grupos vacíos desaparecen. */
export function filtrarGruposPorPermisos(grupos, permisos) {
  if (!permisos?.modulos) return grupos ?? [];
  const ok = (it) => (it?.children?.length ? it.children.some((c) => rutaPermitidaAcceso(c.url, permisos)) : !it?.url || rutaPermitidaAcceso(it.url, permisos));
  return (grupos ?? [])
    .map((g) => ({
      ...g,
      items: g.items.filter(ok).map((it) => (it.children ? { ...it, children: it.children.filter((c) => rutaPermitidaAcceso(c.url, permisos)) } : it)),
    }))
    .filter((g) => g.items.length > 0);
}

// ── Botones de edición en pantallas de «solo ver» ────────────────────────────────────────────────────────────────
// Texto, aria-label o title de un botón que cambia datos. Se ocultan cuando el acceso solo puede ver la pantalla.
const VERBOS = /^(guardar|nuevo|nueva|eliminar|borrar|agregar|añadir|crear|editar|importar|duplicar|registrar|asignar|subir|calcular|autorizar|aprobar|rechazar|enviar|lanzar|cerrar campaña|publicar|archivar|activar|desactivar|sincronizar|cancelar (la |el )?(nómina|préstamo|turno|vacante|campaña))\b/i;
export function esBotonDeEdicion(texto) {
  const t = String(texto ?? "").replace(/\s+/g, " ").trim();
  if (!t || t.length > 60) return false;
  return VERBOS.test(t);
}

export const MENSAJE_SIN_ACCESO = "No tienes acceso a este módulo, pídeselo al dueño.";
export const MENSAJE_SOLO_DUENO = "Esta sección solo la puede usar el dueño de la cuenta.";
export const MENSAJE_SOLO_VER = "Solo puedes ver este módulo. Para hacer cambios, pídele permiso de edición al dueño.";
