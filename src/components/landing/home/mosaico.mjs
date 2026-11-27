// Tarjetas del mosaico de módulos de la portada (MosaicoModulos.jsx): una sola lista para el marcado, la prueba
// unitaria (scripts/test-mosaico.mjs) y la prueba en navegador (scripts/verify-landing.mjs). Sin React ni DOM.
//
// Reglas (docs/estilo-mosaico-favorito.md y docs/pagina-inicio.md):
// - Solo módulos en producción; cada tarjeta nombra en `modulos` sus renglones de src/lib/sitio/modulos.js y en `catalogo`
//   su clave de src/lib/modulos/catalogo.mjs (si la tiene). Inducción digital no está en producción: no entra.
// - Textos verificados contra la guía del Centro de ayuda o el código del módulo (ver `fuente`). Nada inventado.
// - Ritmo «bento»: en cada grupo los anchos (de 6 columnas) llenan filas completas; la prueba unitaria lo revisa.
// - `movil: true` = una de las 8 que se ven en el celular antes de «Ver todos los módulos».

export const GRUPOS = Object.freeze([
  { id: "dinero", titulo: "Nómina y dinero", lema: "Paga exacto, con la ley a la mano." },
  { id: "tiempo", titulo: "Tiempo", lema: "Cada minuto, contado." },
  { id: "personas", titulo: "Personas", lema: "El expediente completo, en el celular de cada quien." },
  { id: "talento", titulo: "Talento y cultura", lema: "Contrata y cuida a tu gente." },
  { id: "plataforma", titulo: "Plataforma", lema: "Ayuda, avisos e integraciones para toda tu empresa." },
]);

const t = (o) => Object.freeze({ etiqueta: null, catalogo: [], movil: false, ...o });

export const TARJETAS = Object.freeze([
  // ——— Nómina y dinero ———
  t({ id: "nomina", grupo: "dinero", ancho: "g4", estilo: "principal", nombre: "Nómina", sub: "nómina", etiqueta: "Recibos firmados",
    texto: "Calcula con las checadas reales, aplica bonos, descuentos y préstamos, y cada quien firma su recibo desde su celular.",
    href: "/ayuda/nomina", aria: "Nómina", modulos: ["Nómina"], catalogo: ["nomina"], movil: true,
    fuente: "src/content/ayuda/nomina/" }),
  t({ id: "prestamos", grupo: "dinero", ancho: "g2", nombre: "Préstamos y bonos", sub: "préstamos",
    texto: "Préstamos sin intereses que se cobran solos en cada nómina y bonos por asistencia.",
    href: "/ayuda/nomina/prestamos", aria: "Préstamos y bonos", modulos: ["Préstamos y bonos"],
    fuente: "src/content/ayuda/nomina/prestamos.md, bonos-y-descuentos.md" }),
  t({ id: "calculos", grupo: "dinero", ancho: "g6", estilo: "ancha", nombre: "Aguinaldos y finiquitos", sub: "finiquitos", etiqueta: "LFT",
    texto: "Calcula aguinaldos, finiquitos y liquidaciones con la Ley Federal del Trabajo. Cada concepto muestra su fórmula, en pantalla y en el PDF para firma.",
    href: "/ayuda/nomina/finiquitos-y-liquidaciones", aria: "Aguinaldos y finiquitos", modulos: ["Finiquitos y liquidaciones", "Aguinaldos"],
    fuente: "src/content/ayuda/nomina/finiquitos-y-liquidaciones.md, aguinaldos.md" }),

  // ——— Tiempo ———
  t({ id: "asistencia", grupo: "tiempo", ancho: "g2", nombre: "Asistencia", sub: "time",
    texto: "Entradas, comidas y salidas en vivo. Horas extra y retardos sin hojas de cálculo.",
    href: "/funcionalidades/dashboard-empleados", aria: "Asistencia", modulos: ["Asistencias", "Entradas y salidas"], catalogo: ["asistencias"], movil: true,
    fuente: "src/content/ayuda/asistencias/" }),
  t({ id: "checador", grupo: "tiempo", ancho: "g2", nombre: "Checador", sub: "check",
    texto: "Rostro y GPS desde el celular o una tableta en la sucursal.",
    href: "/funcionalidades/reloj-checador", aria: "el Checador", modulos: ["Reloj checador facial", "Validación GPS y geocercas", "Rostro, QR o código"], movil: true,
    fuente: "src/content/ayuda/reloj-checador/" }),
  t({ id: "monitor", grupo: "tiempo", ancho: "g2", nombre: "Monitor en vivo", sub: "monitor",
    texto: "Quién trabaja, quién está en comida y quién no ha llegado, al momento.",
    href: "/ayuda/monitor/usar-el-monitor", aria: "el Monitor en vivo", modulos: ["Monitor en vivo"],
    fuente: "src/content/ayuda/monitor/usar-el-monitor.md" }),
  t({ id: "vacaciones", grupo: "tiempo", ancho: "g4", nombre: "Vacaciones y permisos", sub: "vacaciones", etiqueta: "Según la ley",
    texto: "Los días que le tocan a cada quien por ley, permisos por día u hora, y el jefe aprueba desde su celular con el saldo a la vista.",
    href: "/ayuda/vacaciones", aria: "Vacaciones y permisos", modulos: ["Vacaciones según la ley", "Permisos por día u hora", "Solicitudes de mi equipo"],
    catalogo: ["vacaciones", "permisos"], movil: true,
    fuente: "src/content/ayuda/vacaciones/vacaciones-por-ley.md, solicitudes-equipo/aprobar-solicitudes-de-mi-equipo.md" }),
  t({ id: "horas-extra", grupo: "tiempo", ancho: "g2", nombre: "Horas extra y turnos", sub: "turnos",
    texto: "Turnos extra con avisos de ley por persona; dobles y triples calculados solos.",
    href: "/ayuda/turnos-extra/programar-un-turno-extra", aria: "Horas extra y turnos", modulos: ["Horas extra", "Turnos y turnos extra"], catalogo: ["turnos_extra"],
    fuente: "src/content/ayuda/turnos-extra/programar-un-turno-extra.md, reporte-horas/generar-reporte-de-horas.md" }),
  t({ id: "incidencias", grupo: "tiempo", ancho: "g3", nombre: "Incidencias y reportes", sub: "incidencias",
    texto: "Faltas, retardos y checadas sin salida por persona antes de la prenómina, y el reporte de horas listo para firmar.",
    href: "/ayuda/incidencias/centro-de-incidencias", aria: "Incidencias y reportes", modulos: ["Centro de incidencias", "Reporte de horas", "Reportes personalizados"],
    fuente: "src/content/ayuda/incidencias/centro-de-incidencias.md, reporte-horas/generar-reporte-de-horas.md" }),
  t({ id: "rutas", grupo: "tiempo", ancho: "g3", nombre: "Mapa de rutas", sub: "rutas",
    texto: "Ve en el mapa dónde checó tu equipo en campo, cuánto estuvo en cada lugar, y reproduce su recorrido.",
    href: "/ayuda/mapa-de-rutas/ver-recorridos", aria: "el Mapa de rutas", modulos: ["Mapa de rutas"],
    fuente: "src/content/ayuda/mapa-de-rutas/ver-recorridos.md" }),

  // ——— Personas ———
  t({ id: "empleados", grupo: "personas", ancho: "g4", nombre: "Empleados y expediente", sub: "personal", etiqueta: "Expediente 360°",
    texto: "La ficha completa de cada persona y su expediente digital, con aviso de los documentos por vencer.",
    href: "/funcionalidades/colaboradores", aria: "Empleados y expediente", modulos: ["Empleados", "Expediente 360°", "Departamentos y puestos"], catalogo: ["empleados"],
    fuente: "src/content/ayuda/empleados/ficha-del-empleado.md, expediente-digital.md" }),
  t({ id: "documentos", grupo: "personas", ancho: "g2", nombre: "Documentos y firma", sub: "sign",
    texto: "Contratos, actas y finiquitos firmados desde el celular, con foto de quien firmó.",
    href: "/funcionalidades/contratos", aria: "Documentos y firma", modulos: ["Contratos", "Actas administrativas", "Firma en línea", "Generar documentos", "Biblioteca documental"],
    catalogo: ["documentos"], movil: true, fuente: "src/content/ayuda/documentos/" }),
  t({ id: "activos", grupo: "personas", ancho: "g2", nombre: "Activos y uniformes", sub: "activos",
    texto: "Qué equipo y prendas tiene cada quien, con resguardo confirmado desde su app.",
    href: "/ayuda/activos", aria: "Activos y uniformes", modulos: ["Activos y uniformes"], catalogo: ["activos"],
    fuente: "src/content/ayuda/activos/index.md, entregar-y-recibir.md" }),
  t({ id: "tareas", grupo: "personas", ancho: "g2", nombre: "Tareas y checklists", sub: "tasks",
    texto: "Checklists que se califican solos, con foto y firma. Cumplimiento listo para bonos.",
    href: "/ayuda/tareas", aria: "Tareas y checklists", modulos: ["Tareas y checklists"], catalogo: ["tareas"],
    fuente: "src/content/ayuda/tareas/" }),
  t({ id: "mi-espacio", grupo: "personas", ancho: "g2", nombre: "Mi espacio", sub: "app",
    texto: "Tu gente checa, pide permisos y vacaciones y ve sus recibos desde su celular.",
    href: "/ayuda/mi-espacio", aria: "Mi espacio", modulos: ["Portal y app del empleado"],
    fuente: "src/content/ayuda/mi-espacio/conoce-tu-espacio.md" }),

  // ——— Talento y cultura ———
  t({ id: "reclutador", grupo: "talento", ancho: "g2", nombre: "Reclutador IA", sub: "reclutamiento",
    texto: "Contesta a tus candidatos por WhatsApp, los filtra y les agenda la entrevista.",
    href: "/ayuda/reclutamiento/agente-de-whatsapp", aria: "el Reclutador IA", modulos: ["Reclutador IA por WhatsApp"], catalogo: ["reclutamiento"], movil: true,
    fuente: "src/content/ayuda/reclutamiento/agente-de-whatsapp.md" }),
  t({ id: "bolsa", grupo: "talento", ancho: "g2", nombre: "Bolsa de trabajo", sub: "empleo",
    texto: "Publica tus vacantes en la bolsa de ADAMIA, con su página y enlace de WhatsApp.",
    href: "/bolsa-de-trabajo", aria: "la Bolsa de trabajo", modulos: ["Vacantes y bolsa de trabajo"],
    fuente: "src/content/ayuda/reclutamiento/publicar-y-compartir-vacante.md" }),
  t({ id: "clima", grupo: "talento", ancho: "g2", nombre: "Clima laboral", sub: "clima",
    texto: "Encuestas anónimas, NOM-035 y un plan de acción que te sugiere Adamia AI.",
    href: "/ayuda/clima", aria: "Clima laboral", modulos: ["Clima laboral con IA", "NOM-035"], movil: true,
    fuente: "src/content/ayuda/clima/" }),
  t({ id: "evaluacion", grupo: "talento", ancho: "g4", nombre: "Evaluación de desempeño", sub: "desempeño", etiqueta: "360°",
    texto: "Campañas de 180°, 270° o 360°, resultados con acuse de recibido y calibración en el 9-box.",
    href: "/ayuda/evaluaciones", aria: "Evaluación de desempeño", modulos: ["Evaluación de desempeño"], catalogo: ["evaluaciones"],
    fuente: "src/content/ayuda/evaluaciones/como-funciona-la-evaluacion.md" }),
  t({ id: "muro", grupo: "talento", ancho: "g2", nombre: "Muro", sub: "comunicados",
    texto: "Avisos, fotos y eventos para tu equipo. Sabes quién ya confirmó de leído.",
    href: "/ayuda/comunicados", aria: "el Muro", modulos: ["Muro y comunicados"], catalogo: ["comunicados"],
    fuente: "src/content/ayuda/comunicados/" }),

  // ——— Plataforma ———
  t({ id: "ia", grupo: "plataforma", ancho: "g6", estilo: "ia", nombre: "Adamia AI", sub: "ai",
    texto: "Pregúntale de la Ley Federal del Trabajo o de cómo usar ADAMIA. Responde con el texto oficial y te dice el artículo o la guía.",
    href: "/ayuda/adamia-ai", aria: "Adamia AI", modulos: ["Adamia AI"], movil: true,
    fuente: "src/content/ayuda/adamia-ai/" }),
  t({ id: "avisos", grupo: "plataforma", ancho: "g2", nombre: "Reglas de aviso", sub: "avisos",
    texto: "Correos automáticos de retardos, faltas, contratos por vencer y cumpleaños.",
    href: "/funcionalidades/notificaciones-reglas", aria: "las Reglas de aviso", modulos: ["Reglas de aviso"],
    fuente: "src/content/ayuda/avisos/reglas-de-aviso.md" }),
  t({ id: "ayuda", grupo: "plataforma", ancho: "g2", nombre: "Centro de ayuda", sub: "ayuda",
    texto: "Guías paso a paso de cada pantalla, con capturas y abiertas para todos.",
    href: "/ayuda", aria: "el Centro de ayuda", modulos: ["Centro de ayuda"],
    fuente: "src/content/ayuda/, src/app/(public)/ayuda/" }),
  t({ id: "api", grupo: "plataforma", ancho: "g2", nombre: "API e integraciones", sub: "api",
    texto: "Conecta tu ERP o tu nómina externa con llaves de API y los permisos que elijas.",
    href: "/ayuda/integraciones/llaves-de-api", aria: "API e integraciones", modulos: ["API e integraciones"],
    fuente: "src/content/ayuda/integraciones/llaves-de-api.md" }),
]);

export const TOTAL_TARJETAS = TARJETAS.length;
export const tarjetasDeGrupo = (grupo) => TARJETAS.filter((c) => c.grupo === grupo);
