// Centro de ayuda · nombre, descripción y orden de cada carpeta de src/content/ayuda/<carpeta>/ en la portada.
// Si la carpeta trae index.md, su frontmatter (titulo, resumen, orden) manda sobre lo de aquí. Una carpeta que no está
// en esta lista también funciona: toma el nombre de la carpeta. Sin red ni React.

export const CARPETAS = Object.freeze({
  "primeros-pasos": { titulo: "Primeros pasos", resumen: "Entra a ADAMIA, conoce el panel y Mi espacio, y trabaja con varias empresas.", orden: 1, icono: "rocket" },
  comunicados: { titulo: "Muro y comunicados", resumen: "Publica avisos, pide confirmación de leído, modera el muro y usa los automáticos.", orden: 5, icono: "megaphone" },
  tiempo: { titulo: "Control de tiempo", resumen: "Reloj checador, asistencias, incidencias, horas extra y reportes de horas.", orden: 10, icono: "clock" },
  asistencias: { titulo: "Asistencias", resumen: "Reloj checador, asistencias, entradas y salidas e incidencias.", orden: 11, icono: "clock" },
  vacaciones: { titulo: "Vacaciones y permisos", resumen: "Saldos por ley, solicitudes y aprobaciones.", orden: 12, icono: "calendar" },
  permisos: { titulo: "Permisos", resumen: "Solicitudes de permiso y su aprobación.", orden: 13, icono: "calendar" },
  personal: { titulo: "Personal y documentos", resumen: "Empleados, expediente, contratos, actas, catálogos y gestión documental.", orden: 20, icono: "users" },
  empleados: { titulo: "Empleados", resumen: "Ficha y expediente del empleado, puestos y departamentos.", orden: 21, icono: "users" },
  documentos: { titulo: "Gestión documental", resumen: "Biblioteca, plantillas, generar documentos y enviarlos a firmar.", orden: 22, icono: "folder" },
  induccion: { titulo: "Inducción digital", resumen: "Nuevos ingresos desde el celular y su ruta de bienvenida.", orden: 23, icono: "user-plus" },
  nomina: { titulo: "Nómina y ajustes", resumen: "Nóminas, bonos, préstamos, finiquitos, aguinaldos y la configuración de la cuenta.", orden: 30, icono: "wallet" },
  usuarios: { titulo: "Usuarios y permisos", resumen: "Da acceso a tu equipo y define qué puede ver y editar cada quien.", orden: 32, icono: "users" },
  modulos: { titulo: "Módulos", resumen: "Enciende, apaga y contrata los módulos de tu empresa.", orden: 33, icono: "settings" },
  ajustes: { titulo: "Ajustes de la cuenta", resumen: "Módulos, usuarios con acceso, suscripción y configuración.", orden: 31, icono: "settings" },
  talento: { titulo: "Talento y clima", resumen: "Clima y NOM-035, evaluación del desempeño y reclutamiento.", orden: 40, icono: "heart" },
  clima: { titulo: "Clima y NOM-035", resumen: "Encuestas de clima, NOM-035 y resultados.", orden: 41, icono: "heart" },
  evaluaciones: { titulo: "Evaluación del desempeño", resumen: "Campañas, objetivos, 1:1 y calibración.", orden: 42, icono: "target" },
  reclutamiento: { titulo: "Reclutamiento", resumen: "Vacantes, candidatos, entrevistas y WhatsApp.", orden: 43, icono: "briefcase" },
  tareas: { titulo: "Tareas y checklists", resumen: "Tareas, proyectos y checklists del equipo.", orden: 44, icono: "list-checks" },
  activos: { titulo: "Activos y uniformes", resumen: "Inventario, entregas y resguardos.", orden: 45, icono: "package" },
  "creditos-ia": { titulo: "Créditos de Adamia AI", resumen: "Saldo, recargas e historial de uso de la IA.", orden: 49, icono: "wallet" },
  "adamia-ai": { titulo: "Adamia AI", resumen: "El asistente de IA para RH: ley laboral y dudas de uso.", orden: 50, icono: "sparkles" },
  "mi-espacio": { titulo: "Mi espacio (empleados)", resumen: "La app del colaborador: checar, pedir permisos, recibos y más.", orden: 60, icono: "smartphone" },
});

// Nombres reservados por las páginas de /ayuda (una carpeta con ese nombre chocaría con ellas).
export const RESERVADAS = Object.freeze(["rutas", "manual", "buscar", "capturas", "indice.json", "_rutas"]);

const bonito = (slug) => {
  const s = String(slug).replace(/[-_]+/g, " ").trim();
  return s.charAt(0).toLocaleUpperCase("es-MX") + s.slice(1);
};
/** Datos de una carpeta: los de index.md (si hay), si no los de CARPETAS, si no los del nombre. */
export function datosCarpeta(slug, portada = null) {
  const base = CARPETAS[slug] ?? { titulo: bonito(slug), resumen: `Guías de ${bonito(slug).toLocaleLowerCase("es-MX")}.`, orden: 90, icono: "book" };
  return {
    slug,
    titulo: portada?.titulo || base.titulo,
    resumen: portada?.resumen || base.resumen,
    orden: Number.isFinite(Number(portada?.orden)) && portada?.orden !== 100 ? Number(portada.orden) : base.orden,
    icono: base.icono,
  };
}
