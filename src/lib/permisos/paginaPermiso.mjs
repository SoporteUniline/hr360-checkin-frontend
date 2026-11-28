// Permiso en página propia (28/11/2026, pedido del dueño: los formularios grandes dejan de ser ventana). Rutas y reglas
// puras de la página; la lógica del permiso (validar, goce, horas, cancelar con días pasados) NO cambia y sigue en
// src/app/panel/permisos/formulario/usePermisoFormulario.js (la misma que tenía PermisoDialog.jsx).
//   /panel/permisos/nuevo                ?empresa=<id> (la unidad elegida en la lista) &volver=<ruta>
//   /panel/permisos/<id>/editar          ?empresa=<id> &volver=<ruta>
import { conParametros } from "../formulario/rutaRegreso.mjs";

export const RUTA_PERMISOS = "/panel/permisos";

// La lista manda la empresa del filtro («all» = todas, que es lo de siempre y no hace falta escribirlo).
const empresaParam = (empresa) => (empresa && String(empresa) !== "all" ? String(empresa) : null);

export const rutaNuevoPermiso = ({ empresa = null, volver = null } = {}) =>
  conParametros(`${RUTA_PERMISOS}/nuevo`, { empresa: empresaParam(empresa), volver });

export const rutaEditarPermiso = (id, { empresa = null, volver = null } = {}) =>
  conParametros(`${RUTA_PERMISOS}/${encodeURIComponent(String(id))}/editar`, { empresa: empresaParam(empresa), volver });

// «YYYY-MM-DD» ± n días (en UTC, sin horario de verano de por medio).
function diaMas(iso, n) {
  const [a, m, d] = String(iso).split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d + n));
  return f.toISOString().slice(0, 10);
}

/**
 * Para editar se necesita el permiso TAL CUAL lo da la lista (lo que recibía la ventana). GET /solicitudes-permiso/:id
 * no sirve tal cual: su consulta pisa `goce_sueldo` del permiso con el del tipo (tp.goce_sueldo) y cambiaría el goce que se
 * manda al guardar. Por eso se pide la MISMA consulta de la lista, acotada a la persona y al día del permiso (±1 día por
 * la zona horaria), y se toma el renglón con ese id.
 *   permiso: { id_empleado, id_empresa | empleado_id_empresa } · dia: «YYYY-MM-DD» de su fecha de inicio.
 */
export function urlFilaPermiso(permiso, dia) {
  const empresa = permiso?.id_empresa ?? permiso?.empleado_id_empresa;
  if (!permiso?.id_empleado || !empresa || !/^\d{4}-\d{2}-\d{2}$/.test(String(dia ?? ""))) return null;
  return conParametros("/checador/solicitudes-permiso", {
    empresa, page: 1, limit: 100, id_empleado: permiso.id_empleado, desde: diaMas(dia, -1), hasta: diaMas(dia, 1),
  });
}

/** El renglón con ese id dentro de la respuesta de la lista ({ data: [...] }), o null. */
export function filaPermiso(respuesta, id) {
  const lista = Array.isArray(respuesta?.data) ? respuesta.data : Array.isArray(respuesta) ? respuesta : [];
  return lista.find((p) => String(p?.id) === String(id)) ?? null;
}

/**
 * Lo que la persona puede cambiar, en un texto comparable: si difiere del que había al terminar de cargar, hay cambios
 * sin guardar. La búsqueda de empleados no cuenta (no cambia el permiso); el orden de los elegidos tampoco.
 */
export function fotoPermiso({ form, empleadoId = "", empleadoIds = [], idEmpresa = "" }) {
  return JSON.stringify({ form, empleadoId: String(empleadoId ?? ""), empleadoIds: [...empleadoIds].map(String).sort(), idEmpresa: String(idEmpresa ?? "") });
}
