// Encuestas por contestar (GET /checador/clima/mis-encuestas): conteo, texto del aviso y a dónde llevar.
// Empleado: /empleado/panel/encuestas. RH o dueño (también empleados de su empresa): /panel/mis-encuestas.
export const RUTA_NEUTRA = "/mis-encuestas";
export const RUTA_EMPLEADO = "/empleado/panel/encuestas";
export const RUTA_PANEL = "/panel/mis-encuestas";

export function rutaMisEncuestas(tipoUsuario) {
  if (tipoUsuario === "Empleado") return RUTA_EMPLEADO;
  if (tipoUsuario === "Recruiter" || tipoUsuario === "User") return RUTA_PANEL;
  return null;
}

// Las que faltan por contestar (lista vacía si la respuesta no trae encuestas).
export function pendientesDe(data) {
  const lista = Array.isArray(data?.encuestas) ? data.encuestas : [];
  return lista.filter((e) => e && e.contestada !== true && (e.estado === undefined || e.estado === "activa"));
}

export const contarPendientes = (data) => pendientesDe(data).length;

export function textoPendientes(n) {
  if (!Number.isInteger(n) || n <= 0) return null;
  return n === 1 ? "Tienes 1 encuesta por contestar" : `Tienes ${n} encuestas por contestar`;
}

// Liga a una encuesta: en el panel lleva la empresa (RH o dueño pueden ser empleados en varias).
export function rutaEncuesta(base, encuesta) {
  const id = Number(encuesta?.id);
  if (!Number.isInteger(id) || id <= 0) return base;
  const empresa = Number(encuesta?.empresa);
  return base === RUTA_PANEL && Number.isInteger(empresa) && empresa > 0 ? `${base}/${id}?empresa=${empresa}` : `${base}/${id}`;
}

// «Contestar» del aviso: con una sola, directo a ella; con varias, a la lista.
export function destinoAviso(base, data) {
  const p = pendientesDe(data);
  return p.length === 1 ? rutaEncuesta(base, p[0]) : base;
}
