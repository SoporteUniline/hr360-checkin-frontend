// Vistas del módulo Evaluación de desempeño: una sola fuente para las pestañas (EvaluationModule.jsx) y el menú
// (Sidebar/nav-main.jsx). Quién puede qué lo decide el servidor en /capabilities; aquí solo se lee.

// RH (y Dirección, que solo consulta) trabaja por campañas. «Por responder» solo aparece si tiene evaluaciones asignadas.
export const VISTAS_RH = [
  { path: "campanas", texto: "Campañas", scope: "campaigns" },
  { path: "plantillas", texto: "Plantillas", scope: "templates" },
  { path: "mis-pendientes", texto: "Por responder", scope: "assignments", soloConPendientes: true },
  { path: "configuracion", texto: "Configuración", scope: "settings" },
];
// Jefes y colaboradores trabajan por lo que tienen que responder.
export const VISTAS_PERSONALES = [
  { path: "mis-pendientes", texto: "Por responder", scope: "assignments" },
  { path: "equipo", texto: "Mi equipo", scope: "team" },
  { path: "mis-evaluaciones", texto: "Mis resultados", scope: "results" },
];
// Configuración: tres vistas que no dependen entre sí.
export const SECCIONES_CONFIGURACION = [
  {
    path: "configuracion",
    texto: "Valores iniciales",
    descripcion: "Lo que tendrán las campañas nuevas: qué ve cada quien y la confidencialidad de las respuestas.",
  },
  {
    path: "configuracion/niveles",
    texto: "Niveles",
    descripcion: "Niveles jerárquicos de la empresa y el nivel de cada colaborador.",
  },
  {
    path: "configuracion/acceso",
    texto: "Acceso al módulo",
    descripcion: "Quién más administra (Recursos Humanos) o consulta (Dirección) las evaluaciones.",
  },
];
// Rutas que existen aunque no sean pestaña (se abren desde otra vista) y el permiso que piden.
export const SCOPE_DE_RUTA = {
  ...Object.fromEntries([...VISTAS_RH, ...VISTAS_PERSONALES].map((v) => [v.path, v.scope])),
  responder: "assignments",
  resultados: "results",
};

export const esRH = (capabilities) => !!capabilities?.flags?.canViewCampaigns;
const tiene = (capabilities, scope) => !!capabilities?.scopes?.includes(scope);

// Pestañas (y entradas del menú) que ve esta persona. tienePendientes: tiene evaluaciones por responder.
export function vistasVisibles(capabilities, tienePendientes = false) {
  const vistas = esRH(capabilities)
    ? VISTAS_RH.filter((v) => !v.soloConPendientes || tienePendientes)
    : VISTAS_PERSONALES;
  return vistas.filter((v) => tiene(capabilities, v.scope));
}
// A dónde lleva la entrada del módulo (/panel/evaluaciones).
export function vistaInicio(capabilities) {
  return vistasVisibles(capabilities, true)[0]?.path ?? "mis-pendientes";
}
// Pestaña resaltada para una dirección (sin la base): las vistas de detalle resaltan la vista de donde se abren.
export function vistaActual(section = "") {
  const [view] = section.split("/");
  return view === "responder" ? "mis-pendientes" : view;
}
// Sección de configuración de una dirección; null si no existe.
export function seccionConfiguracion(section = "") {
  return SECCIONES_CONFIGURACION.find((s) => s.path === section.replace(/\/+$/, "")) ?? null;
}
