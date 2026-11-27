// Datos de ejemplo de las secciones nuevas de la portada (27/11/2026). Personas, empresa y cifras son ficticias.
// Cada texto sale de lo que el sistema hace hoy (ver docs/pagina-inicio.md, «Secciones nuevas y de dónde sale cada
// texto»). Probado en scripts/test-guion-landing.mjs (límites de WhatsApp, nombres y consistencia).

// ——— Tu reclutador con IA en WhatsApp ———
// Lo que ve el candidato en SU teléfono: lo suyo va a la derecha (verde) y lo del agente a la izquierda (blanco).
// Textos fijos del backend tal cual (aviso de privacidad, confirmación y recordatorio de la cita); lo demás lo redacta
// la IA con los datos de la vacante y la base de conocimiento aprobada. Botones: máximo 3 y 20 caracteres (WhatsApp).
export const CHAT = {
  empresa: "Mercado Aurora",
  asistente: "Valeria",
  vacante: "Cajera",
  candidata: "Daniela Ortiz Peña",
  mensajes: [
    { de: "fecha", texto: "AYER" },
    { de: "yo", texto: "Hola, vi la vacante de Cajera. ID: 9c41e07ab2d5f83a61c0e4b7", hora: "9:41 p.m." },
    {
      de: "ia", hora: "9:41 p.m.", marca: "aviso",
      texto: "¡Hola! Soy Valeria, del equipo de Mercado Aurora 👋\nAntes de empezar: para continuar necesito tu consentimiento para tratar tus datos personales con fines de reclutamiento y selección.\nAviso de privacidad: adamia.com.mx/aviso-privacidad\n¿Aceptas?",
      botones: ["Acepto", "Leer aviso", "No acepto"],
    },
    { de: "yo", toca: "Acepto", texto: "Acepto", cita: "¿Aceptas?", hora: "9:42 p.m.", marca: "acepto" },
    {
      de: "ia", hora: "9:42 p.m.",
      texto: "¡Gracias! 🙌 La vacante de Cajera es en turnos de 8 horas, con un día de descanso entre semana. El sueldo es de $9,200 mensuales más prestaciones de ley.\n¿Me compartes tu nombre completo?",
    },
    { de: "yo", texto: "Daniela Ortiz Peña", hora: "9:42 p.m.", marca: "nombre" },
    {
      de: "ia", hora: "9:42 p.m.",
      texto: "Mucho gusto, Daniela. ¿Tienes disponibilidad para trabajar fines de semana?",
      botones: ["Sí", "No"],
    },
    { de: "yo", toca: "Sí", texto: "Sí", cita: "¿Tienes disponibilidad para trabajar fines de semana?", hora: "9:43 p.m." },
    { de: "yo", texto: "¿Dan uniforme?", hora: "9:43 p.m." },
    {
      de: "ia", hora: "9:43 p.m.", fuente: "conocimiento",
      texto: "Sí, te damos dos playeras y tu gafete desde el primer día. ¿Cuántos años de experiencia tienes en caja?",
    },
    { de: "yo", texto: "2 años en una farmacia", hora: "9:44 p.m.", marca: "califica" },
    {
      de: "ia", hora: "9:44 p.m.",
      texto: "¡Muy bien! ¿En qué colonia vives? Así te digo qué sucursal te queda más cerca.",
    },
    { de: "yo", texto: "En la colonia Las Flores", hora: "9:44 p.m." },
    {
      de: "ia", hora: "9:45 p.m.",
      texto: "Estas son las 3 sucursales más cercanas:\n📍 Sucursal Norte · 1.2 km\n📍 Sucursal Centro · 3.4 km\n📍 Sucursal Jardines · 5.1 km\n¿En cuál te gustaría trabajar?",
      botones: ["Sucursal Norte", "Sucursal Centro", "Sucursal Jardines"],
    },
    { de: "yo", toca: "Sucursal Norte", texto: "Sucursal Norte", cita: "¿En cuál te gustaría trabajar?", hora: "9:45 p.m.", marca: "sucursal" },
    {
      de: "ia", hora: "9:45 p.m.",
      texto: "¡Excelente! Ya puedes agendar tu entrevista. Elige el horario que te quede mejor:",
      botones: ["jue 3 dic 9:00 am", "vie 4 dic 9:00 am", "lun 7 dic 9:00 am"],
    },
    { de: "yo", toca: "jue 3 dic 9:00 am", texto: "jue 3 dic 9:00 am", cita: "Elige el horario que te quede mejor:", hora: "9:46 p.m." },
    {
      de: "ia", hora: "9:46 p.m.", marca: "cita",
      texto: "¡Listo, Daniela! Tu entrevista para «Cajera» quedó agendada para el jueves 3 de diciembre a las 9:00 a. m.\nDirección: Calle Hidalgo 45, Centro\nTe mandaremos un recordatorio antes de la cita.\nSi necesitas cambiarla, responde «Cambiar» o «Cancelar».",
    },
    { de: "fecha", texto: "HOY" },
    {
      de: "ia", hora: "9:00 a.m.", sinEscribir: true,
      texto: "Hola Daniela, te recordamos tu entrevista para «Cajera» el jueves 3 de diciembre a las 9:00 a. m.\nDirección: Calle Hidalgo 45, Centro\n¿Nos confirmas tu asistencia?",
      botones: ["Confirmo", "Necesito cambiar"],
    },
    { de: "yo", toca: "Confirmo", texto: "Confirmo", cita: "¿Nos confirmas tu asistencia?", hora: "9:02 a.m." },
    { de: "ia", hora: "9:02 a.m.", marca: "confirmada", texto: "¡Gracias por confirmar! Te esperamos el jueves 3 de diciembre a las 9:00 a. m." },
  ],
};

// Lo que ve RH en la bandeja de ADAMIA mientras tanto (mismas etiquetas que src/lib/whatsapp/entrevista.mjs).
export const FICHA_RH = {
  puntajes: [
    ["Comunicación", 5],
    ["Actitud", 5],
    ["Experiencia", 3],
    ["Confiabilidad", 4],
    ["Disponibilidad", 5],
  ],
  atencion: { nombre: "Iván Robles", vacante: "Ayudante general", motivo: "pidió hablar con una persona" },
};

// ——— Clima laboral con IA ——— (dimensiones de la plantilla de clima y niveles de la NOM-035, de src/lib/clima)
export const CLIMA = {
  participacion: { pct: 86, contestadas: 37, invitados: 43 },
  dimensiones: [
    ["Liderazgo", 82],
    ["Ambiente", 78],
    ["Crecimiento", 66],
    ["Comunicación", 61],
    ["Carga de trabajo", 52],
    ["Reconocimiento", 44],
  ],
  niveles: ["Nulo", "Bajo", "Medio", "Alto", "Muy alto"],
  nivel: 2,
  dominioAlto: "Carga de trabajo",
  sugerencias: [
    { dimension: "Reconocimiento", accion: "Reconocer cada mes a una persona por área frente a su equipo." },
    { dimension: "Carga de trabajo", accion: "Revisar la cobertura de turnos en las áreas con más horas extra." },
    { dimension: "Comunicación", accion: "Junta de 15 minutos cada lunes para compartir prioridades." },
  ],
};

// ——— Todo tu equipo en un tablero ——— (tarjetas del Monitor: src/lib/asistencia/monitor.mjs)
export const TABLERO = {
  contadores: [
    { clave: "trabajando", titulo: "Trabajando", desde: 18, hasta: 22, nota: "1 en hora extra", tono: "azul" },
    { clave: "comida", titulo: "En comida", desde: 3, hasta: 3, nota: "a tiempo", tono: "gris" },
    { clave: "entrar", titulo: "Por entrar", desde: 6, hasta: 2, nota: "el próximo a las 9:30", tono: "gris" },
    { clave: "tarde", titulo: "Llegaron tarde", desde: 1, hasta: 2, nota: "1 con permiso", tono: "ambar" },
    { clave: "faltan", titulo: "No han llegado", desde: 1, hasta: 1, nota: "ya pasó su hora", tono: "rojo" },
    { clave: "permiso", titulo: "Con permiso", desde: 2, hasta: 2, nota: "1 por horas", tono: "violeta" },
  ],
  // Ya estaban antes de que empiece la escena (la tarjeta «No han llegado» cuenta a quien falta).
  antes: [
    { nombre: "Diana Cruz", area: "Caja", hora: "8:41 a.m.", estado: "A tiempo", tono: "verde" },
    { nombre: "Hugo Salas", area: "Almacén", hora: "—", estado: "No ha llegado · debía entrar 9:00", tono: "rojo" },
  ],
  llegadas: [
    { nombre: "Ana Torres", area: "Ventas", hora: "8:58 a.m.", estado: "A tiempo", tono: "verde" },
    { nombre: "Carlos Medina", area: "Almacén", hora: "9:01 a.m.", estado: "A tiempo", tono: "verde" },
    { nombre: "Paola Núñez", area: "Caja", hora: "9:12 a.m.", estado: "Llegó 12 min tarde", tono: "ambar" },
    { nombre: "Raúl Pérez", area: "Reparto", hora: "9:14 a.m.", estado: "A tiempo", tono: "verde" },
  ],
  horasExtra: { texto: "6 h 30 min", nota: "de 4 personas esta semana" },
  solicitudes: [
    { tipo: "Vacaciones", quien: "Fernanda Ríos", cuando: "21 al 24 dic" },
    { tipo: "Permiso", quien: "Óscar Lara", cuando: "lun 7 dic · 2 h" },
  ],
  pregunta: "¿Cuánto le pago a quien trabaje el 25 de diciembre?",
  respuesta: "Es día de descanso obligatorio: además de su salario del día, le pagas un salario doble por el servicio prestado.",
  cita: "Arts. 74 y 75 LFT",
};

// ——— El muro de tu empresa ——— (Centro de comunicados: src/components/comunicados)
export const MURO = {
  portada: "¡Cerramos el año juntos!",
  autora: "Carmen Vidal",
  publicacion: {
    titulo: "Así se vivió la convivencia de fin de año",
    texto: "Gracias a todo el equipo de Planta Norte por un gran 2026. 🎉",
    meGusta: { desde: 31, hasta: 48 },
    comentarios: [
      { quien: "Rosa Pineda", texto: "¡Qué bonito quedó todo! 🙌" },
      { quien: "Iván Robles", texto: "Gracias al equipo de logística por organizarlo." },
    ],
  },
  aviso: {
    titulo: "Nuevo reglamento interior de trabajo",
    confirmaron: { desde: 30, hasta: 31, de: 42 },
  },
};
