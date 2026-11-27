// Módulos de ADAMIA para el sitio público: página de Funciones y lista «Todos los módulos» de la portada (una sola
// fuente). Textos cortos y verificados contra el sistema. Solo funciones en producción: lo que aún no sale (p. ej.
// Inducción digital) no se anuncia. Regla: cada módulo nuevo que llega a producción se agrega aquí (docs/pagina-inicio.md)
// y a su tarjeta del mosaico (src/components/landing/home/mosaico.mjs; scripts/test-mosaico.mjs revisa que coincidan).
export const CATEGORIAS = [
  {
    id: "tiempo",
    nombre: "Control de tiempo",
    lema: "Cada minuto, contado.",
    texto: "Checada con rostro y GPS, horas extra con la ley a la mano y reportes listos para pagar.",
    color: "#2c56e8",
    fondo: "azul",
    detalle: { href: "/funcionalidades/reloj-checador", texto: "Conoce el reloj checador" },
    modulos: [
      { nombre: "Reloj checador facial", texto: "Tu gente checa con su rostro desde el celular o una tablet." },
      { nombre: "Validación GPS y geocercas", texto: "Solo registra si la persona está dentro del área de trabajo." },
      { nombre: "Rostro, QR o código", texto: "Cada quien checa como le funcione mejor: rostro, QR del gafete o código." },
      { nombre: "Monitor en vivo", texto: "Quién trabaja, quién va a llegar y quién pide atención, al momento.", href: "/ayuda/monitor/usar-el-monitor" },
      { nombre: "Asistencias", texto: "El día de cada persona: presente, retardo, falta o permiso." },
      { nombre: "Entradas y salidas", texto: "Cada checada con hora, lugar y quién la corrigió." },
      { nombre: "Horas extra", texto: "Autoriza, paga o repón tiempo; dobles y triples según la ley." },
      { nombre: "Turnos y turnos extra", texto: "Programa turnos y tiempo extra con avisos de ley." },
      { nombre: "Centro de incidencias", texto: "Faltas, retardos y checadas sin salida en una sola lista." },
      { nombre: "Reporte de horas", texto: "Horas por semana contra el límite legal de cada año." },
      { nombre: "Reportes personalizados", texto: "Arma y exporta a Excel los reportes que necesitas." },
    ],
  },
  {
    id: "personal",
    nombre: "Personal",
    lema: "El expediente completo.",
    texto: "Todo lo de cada persona en un solo lugar: datos, documentos, contratos e historial.",
    color: "#5a3cf4",
    fondo: "violeta",
    detalle: { href: "/funcionalidades/colaboradores", texto: "Conoce la gestión de colaboradores" },
    modulos: [
      { nombre: "Empleados", texto: "Alta, baja y ficha completa de cada persona." },
      { nombre: "Expediente 360°", texto: "Documentos, contratos e historial en un solo lugar." },
      { nombre: "Departamentos y puestos", texto: "Organiza tu estructura y a quién reporta cada quien." },
      { nombre: "Contratos", texto: "Vigencias y avisos antes de que venzan.", href: "/funcionalidades/contratos" },
      { nombre: "Actas administrativas", texto: "Registra incidencias con formato y fírmalas en línea." },
      { nombre: "Nómina", texto: "Con las checadas reales; cada quien firma su recibo desde su celular." },
      { nombre: "Préstamos y bonos", texto: "Préstamos sin intereses que se cobran solos en cada nómina y bonos por asistencia.", href: "/ayuda/nomina/prestamos" },
      { nombre: "Finiquitos y liquidaciones", texto: "Calcula y genera el documento de salida." },
      { nombre: "Aguinaldos", texto: "Calcula el aguinaldo de todo tu personal." },
      { nombre: "Mapa de rutas", texto: "Ve en el mapa las checadas de tu equipo en campo." },
    ],
  },
  {
    id: "ausencias",
    nombre: "Ausencias",
    lema: "Sin papeles ni Excel.",
    texto: "Vacaciones con la tabla de la ley, permisos por día u hora y aprobaciones desde WhatsApp.",
    color: "#16a34a",
    fondo: "gris",
    detalle: { href: "/funcionalidades/dashboard-empleados", texto: "Conoce el panel de empleados" },
    modulos: [
      { nombre: "Vacaciones según la ley", texto: "Días disponibles calculados con la tabla de la LFT." },
      { nombre: "Planeación de vacaciones", texto: "Calendario del año para que no falte nadie clave." },
      { nombre: "Permisos por día u hora", texto: "Llegar tarde, salir antes o faltar, con o sin goce." },
      { nombre: "Aprobación por WhatsApp", texto: "El jefe aprueba o rechaza desde su WhatsApp." },
      { nombre: "Días festivos", texto: "Tu calendario de festivos, aplicado a la asistencia." },
      { nombre: "Solicitudes de mi equipo", texto: "Cada jefe ve y responde las de su gente." },
    ],
  },
  {
    id: "talento",
    nombre: "Talento y cultura",
    lema: "Contrata y cuida a tu gente.",
    texto: "Un reclutador con IA en WhatsApp, clima laboral con NOM-035, evaluaciones y un muro para comunicar.",
    color: "#0f766e",
    fondo: "blanco",
    detalle: { href: "/ayuda/reclutamiento/agente-de-whatsapp", texto: "Conoce el reclutador con IA" },
    modulos: [
      { nombre: "Reclutador IA por WhatsApp", texto: "Contesta, filtra y agenda entrevistas por WhatsApp; tú tomas el control cuando quieras.", href: "/#reclutador-ia" },
      { nombre: "Vacantes y bolsa de trabajo", texto: "Publica vacantes, compártelas y recibe candidatos en un solo lugar." },
      { nombre: "Clima laboral con IA", texto: "Encuestas anónimas y un plan de acción sugerido por Adamia AI.", href: "/#clima-ia" },
      { nombre: "NOM-035", texto: "Cuestionario oficial, nivel de riesgo, buzón y expediente para inspección.", href: "/ayuda/clima/nom-035" },
      { nombre: "Evaluación de desempeño", texto: "Campañas de evaluación con resultados por persona." },
      { nombre: "Muro y comunicados", texto: "Publica avisos, fotos y eventos; ve quién confirmó de leído.", href: "/#muro" },
    ],
  },
  {
    id: "documentos",
    nombre: "Documentos y equipo",
    lema: "Todo en orden.",
    texto: "Genera y firma documentos en línea, controla uniformes y equipo, y revisa el trabajo del día con checklists.",
    color: "#d97706",
    fondo: "gris",
    detalle: null,
    modulos: [
      { nombre: "Biblioteca documental", texto: "Plantillas y documentos de la empresa ordenados." },
      { nombre: "Generar documentos", texto: "Llena plantillas con los datos del empleado en segundos." },
      { nombre: "Firma en línea", texto: "Firma con trazo y foto como evidencia, desde el celular." },
      { nombre: "Activos y uniformes", texto: "Qué tiene cada quien: entregas, devoluciones y tallas." },
      { nombre: "Tareas y checklists", texto: "Checklists con foto y firma que se califican solos." },
    ],
  },
  {
    id: "empresa",
    nombre: "Tu empresa",
    lema: "Control total.",
    texto: "Una cuenta para varias empresas y sucursales, con permisos por usuario y avisos automáticos.",
    color: "#0b1033",
    fondo: "marino",
    detalle: { href: "/funcionalidades/notificaciones-reglas", texto: "Conoce las reglas de aviso" },
    modulos: [
      { nombre: "Portal y app del empleado", texto: "Consulta sus checadas y pide permisos o vacaciones." },
      { nombre: "Varias empresas y sucursales", texto: "Administra todas desde una sola cuenta." },
      { nombre: "Usuarios y permisos", texto: "Da acceso a RH y a jefes con lo que cada uno necesita." },
      { nombre: "Reglas de aviso", texto: "Correos automáticos de retardos, faltas, contratos y cumpleaños." },
      { nombre: "Campos personalizados", texto: "Agrega a la ficha los datos propios de tu empresa." },
      { nombre: "Adamia AI", texto: "Resuelve dudas de la Ley Federal del Trabajo y de cómo usar ADAMIA." },
      { nombre: "Centro de ayuda", texto: "Guías paso a paso de cada pantalla, abiertas para todos.", href: "/ayuda" },
      { nombre: "API e integraciones", texto: "Conecta tu ERP o tu nómina externa con llaves de API y los permisos que elijas.", href: "/ayuda/integraciones/llaves-de-api" },
      { nombre: "Calculadora de aguinaldos", texto: "Gratis en nuestra página, sin registrarte.", href: "/calculadora-aguinaldos" },
    ],
  },
];

export const TOTAL_MODULOS = CATEGORIAS.reduce((t, c) => t + c.modulos.length, 0);

// Lo mínimo para la lista «Todos los módulos» de la portada. Se arma en el servidor (src/app/(landing)/page.jsx) y
// llega como prop: así los textos largos de cada módulo no viajan en el JavaScript de la portada.
export function modulosPortada() {
  return {
    total: TOTAL_MODULOS,
    categorias: CATEGORIAS.map((c) => ({
      id: c.id, nombre: c.nombre, lema: c.lema.replace(/\.$/, ""), color: c.color,
      modulos: c.modulos.map((m) => (m.href ? { nombre: m.nombre, href: m.href } : { nombre: m.nombre })),
    })),
  };
}

// Páginas de detalle de Funciones.
export const DETALLES = [
  { href: "/funcionalidades/reloj-checador", nombre: "Reloj checador", texto: "Rostro, GPS, QR o código." },
  { href: "/funcionalidades/colaboradores", nombre: "Colaboradores", texto: "Expediente y estructura." },
  { href: "/funcionalidades/contratos", nombre: "Contratos", texto: "Vigencias y renovaciones." },
  { href: "/funcionalidades/notificaciones-reglas", nombre: "Notificaciones y reglas", texto: "Avisos automáticos." },
  { href: "/funcionalidades/dashboard-empleados", nombre: "Panel de empleados", texto: "Todo de un vistazo." },
];
