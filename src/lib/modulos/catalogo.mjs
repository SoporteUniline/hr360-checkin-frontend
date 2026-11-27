// Catálogo de módulos de ADAMIA. Ver backend docs/modulos-empresa.md.
// La MISMA lista (mismas claves) vive en el backend: services/modulosCatalogo.js. Si cambias una clave, cámbiala en los dos
// (scripts/test-modulos.mjs y tests/modulosEmpresa.test.cjs fijan la lista).
// Sin red ni React: probado en scripts/test-modulos.mjs.

export const MODULOS = Object.freeze([
  { clave: "asistencias", nombre: "Asistencias", base: true, descripcion: "Reloj checador, asistencias, entradas y salidas, incidencias, horas extra y reportes de horas." },
  { clave: "empleados", nombre: "Empleados", base: true, descripcion: "Ficha y expediente del empleado, departamentos, puestos, contratos, actas y catálogos." },
  { clave: "nomina", nombre: "Nómina", descripcion: "Nóminas, bonos y descuentos, préstamos, finiquitos y aguinaldos." },
  { clave: "vacaciones", nombre: "Vacaciones", descripcion: "Saldo de vacaciones por ley, planeación, registro y solicitudes de vacaciones." },
  { clave: "permisos", nombre: "Permisos", descripcion: "Solicitudes de permisos de los empleados y su aprobación." },
  { clave: "evaluaciones", nombre: "Evaluación de desempeño", descripcion: "Campañas de evaluación, plantillas, resultados y seguimiento." },
  { clave: "reclutamiento", nombre: "Reclutamiento", descripcion: "Vacantes, postulaciones, WhatsApp con agente, entrevistas y bolsa de trabajo." },
  { clave: "tareas", nombre: "Tareas y checklists", descripcion: "Tareas y proyectos para tu equipo y checklists que se califican solos." },
  { clave: "activos", nombre: "Activos y uniformes", descripcion: "Inventario, entregas y resguardos de activos y uniformes." },
  { clave: "documentos", nombre: "Gestión documental", descripcion: "Biblioteca, plantillas, generar documentos y enviarlos a firmar." },
  { clave: "turnos_extra", nombre: "Turnos extra", descripcion: "Programar turnos extra con avisos de ley y seguirlos en vivo." },
  // (27/12/2026) Inducción digital (backend docs/induccion-digital.md).
  { clave: "induccion", nombre: "Inducción digital", descripcion: "Nuevos ingresos: datos, documentos y firma desde el celular, checklist del primer día y ruta de bienvenida." },
  // (27/11/2026) Centro de comunicados: muro de la empresa y avisos con confirmación de leído (backend docs/comunicados.md).
  { clave: "comunicados", nombre: "Centro de comunicados", descripcion: "Muro de la empresa y comunicados con confirmación de leído por app, correo, push y aviso emergente." },
].map((m) => Object.freeze({ base: false, ...m })));

export const CLAVES = MODULOS.map((m) => m.clave);
export const BASE = MODULOS.filter((m) => m.base).map((m) => m.clave);
export const OPCIONALES = MODULOS.filter((m) => !m.base).map((m) => m.clave);
const POR_CLAVE = new Map(MODULOS.map((m) => [m.clave, m]));
export const modulo = (clave) => POR_CLAVE.get(String(clave ?? "")) ?? null;

// Qué módulo opcional abre cada ruta del panel y de la app del empleado. Lo que no aparece es de la base (asistencias o
// empleados) y siempre se ve. Una lista = basta que uno esté activo (las solicitudes de vacaciones son solicitudes de
// permiso: usan la misma pantalla y la misma ruta del servidor).
const SOLICITUDES = ["permisos", "vacaciones"];
export const RUTAS_MODULO = Object.freeze([
  ["/panel/nomina", "nomina"],
  ["/panel/finiquitos-y-liquidaciones", "nomina"],
  ["/panel/aguinaldos", "nomina"],
  ["/empleado/panel/mis-recibos", "nomina"],
  ["/empleado/panel/mis-prestamos", "nomina"],
  ["/panel/vacaciones", "vacaciones"],
  ["/panel/permisos", "permisos"],
  ["/panel/solicitudes-equipo", SOLICITUDES],
  ["/empleado/panel/solicitudes-equipo", SOLICITUDES],
  ["/empleado/panel/solicitudes", SOLICITUDES],
  ["/panel/evaluaciones", "evaluaciones"],
  ["/empleado/panel/evaluaciones", "evaluaciones"],
  ["/panel/reclutamiento", "reclutamiento"],
  ["/panel/whatsapp", "reclutamiento"],
  ["/panel/tareas", "tareas"],
  ["/panel/checklists", "tareas"],
  ["/empleado/panel/tareas", "tareas"],
  ["/panel/activos", "activos"],
  ["/empleado/panel/mis-recursos", "activos"],
  ["/panel/gestion-documental", "documentos"],
  ["/panel/turnos-extra", "turnos_extra"],
  ["/panel/nuevos-ingresos", "induccion"],
  ["/panel/plantillas-induccion", "induccion"],
  ["/empleado/panel/bienvenida", "induccion"],
  ["/panel/comunicados", "comunicados"],
  ["/empleado/panel/muro", "comunicados"],
]);

const sinConsulta = (url) => String(url ?? "").split(/[?#]/)[0].replace(/\/+$/, "") || "/";

// Módulos (lista) que necesita una ruta, o null si es de la base.
export function modulosDeRuta(url) {
  const ruta = sinConsulta(url);
  for (const [prefijo, claves] of RUTAS_MODULO) {
    if (ruta === prefijo || ruta.startsWith(`${prefijo}/`)) return Array.isArray(claves) ? claves : [claves];
  }
  return null;
}
