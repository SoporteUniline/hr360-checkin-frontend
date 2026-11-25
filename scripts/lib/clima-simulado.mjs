// Backend simulado de /api/checador/clima para scripts/verify-clima.mjs y scripts/verify-clima-dashboard.mjs (mismas
// formas que modules/clima del backend).
import { COMENTARIOS_SIN_AREAS, climaGrande, climaSinAreas, comparacionGrande, lectura } from "./clima-resultados-simulado.mjs";
import { claveAccion } from "../../src/lib/clima/sugerencias.mjs";
const ESCALA = ["Totalmente en desacuerdo", "En desacuerdo", "Ni de acuerdo ni en desacuerdo", "De acuerdo", "Totalmente de acuerdo"].map((texto, i) => ({
  valor: i + 1,
  texto,
}));
const FRECUENCIA = ["Siempre", "Casi siempre", "Algunas veces", "Casi nunca", "Nunca"].map((texto) => ({
  valor: texto.toLowerCase().replace(/ /g, "_"),
  texto,
}));
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());

const CATALOGO = [
  {
    clave: "nom035",
    tipo: "nom035",
    categoria: "Obligatoria",
    nombre: "NOM-035 · riesgo psicosocial",
    descripcion: "Cuestionario oficial.",
    minutos: 15,
    preguntas: null,
    abiertas: 0,
    recurrencia: "ninguna",
  },
  {
    clave: "clima_general",
    tipo: "clima",
    categoria: "Clima",
    nombre: "Clima general",
    descripcion: "eNPS y 8 dimensiones: liderazgo, comunicación, reconocimiento, carga, crecimiento, ambiente, herramientas y pertenencia.",
    minutos: 8,
    preguntas: 32,
    abiertas: 2,
    recurrencia: "ninguna",
  },
  {
    clave: "compromiso",
    tipo: "clima",
    categoria: "Retención",
    nombre: "Compromiso y ganas de quedarse",
    descripcion: "Detecta el riesgo de que la gente se vaya y por qué: sueldo, horarios, trato o crecimiento.",
    minutos: 5,
    preguntas: 20,
    abiertas: 2,
    recurrencia: "ninguna",
  },
  {
    clave: "jefe_directo",
    tipo: "clima",
    categoria: "Liderazgo",
    nombre: "Evaluación del jefe directo",
    descripcion: "El equipo califica a su jefe: trato, claridad, apoyo y justicia. Resultados por jefe con mínimo de 5 respuestas.",
    minutos: 4,
    preguntas: 16,
    abiertas: 1,
    recurrencia: "ninguna",
  },
  {
    clave: "pulso_mensual",
    tipo: "clima",
    categoria: "Pulso",
    nombre: "Pulso mensual",
    descripcion: "5 preguntas que se repiten cada mes para ver la tendencia sin cansar a la gente.",
    minutos: 1,
    preguntas: 5,
    abiertas: 0,
    recurrencia: "mensual",
  },
];

const DIMS = [
  ["liderazgo", "Liderazgo"],
  ["comunicacion", "Comunicación"],
  ["reconocimiento", "Reconocimiento"],
  ["carga", "Carga de trabajo"],
  ["crecimiento", "Crecimiento"],
  ["ambiente", "Ambiente"],
  ["herramientas", "Herramientas"],
  ["pertenencia", "Pertenencia"],
].map(([clave, nombre]) => ({ clave, nombre }));

const definicionInicial = () => ({
  agruparPor: "area",
  recurrencia: "ninguna",
  dimensiones: DIMS,
  secciones: [
    {
      clave: "s1",
      titulo: "Tu trabajo",
      preguntas: [
        {
          clave: "enps",
          tipo: "enps",
          texto: "¿Qué tan probable es que recomiendes este lugar para trabajar a un amigo o familiar?",
          dimension: null,
          requerida: true,
        },
        {
          clave: "lid1",
          tipo: "escala",
          texto: "¿Verdad que tu jefe te trata bien y te apoya siempre?",
          dimension: "liderazgo",
          requerida: true,
        },
        {
          clave: "car1",
          tipo: "escala",
          texto: "Mis horarios se publican con suficiente anticipación.",
          dimension: "carga",
          requerida: true,
        },
        { clave: "her1", tipo: "sino", texto: "¿Tienes las herramientas que necesitas?", dimension: "herramientas", requerida: true },
      ],
    },
    {
      clave: "s2",
      titulo: "En tus palabras",
      preguntas: [
        {
          clave: "abi1",
          tipo: "abierta",
          texto: "Si pudieras cambiar una sola cosa de tu trabajo, ¿cuál sería?",
          dimension: null,
          requerida: false,
        },
      ],
    },
  ],
});

const PERSONAS = [
  ...[
    "Caja",
    "Caja",
    "Caja",
    "Caja",
    "Caja",
    "Reparto",
    "Reparto",
    "Reparto",
    "Reparto",
    "Ventas",
    "Ventas",
    "Ventas",
    "Ventas",
    "Ventas",
    "Ventas",
    "Almacén",
    "Almacén",
    "Almacén",
    "Almacén",
    "Almacén",
    "Oficina",
    "Oficina",
    "Oficina",
  ].map((area, i) => ({ id: 101 + i, nombre: `Persona ${i + 1}`, area, puesto: area === "Caja" ? "Cajero" : "Auxiliar" })),
];

const dims = (vals) => DIMS.map((d, i) => ({ clave: d.clave, nombre: d.nombre, valor: vals[i] }));
const TABLERO = {
  ok: true,
  actual: {
    campania: { id: 30, nombre: "Clima noviembre 2026", tipo: "clima", estado: "cerrada", abre_el: "2026-11-10", cierra_el: "2026-11-20" },
    invitados: 165,
    contestadas: 142,
    participacion: 86,
    minimo: 1,
    disponibles: true,
    agruparPor: "area",
    clima: {
      respuestas: 142,
      invitados: 165,
      participacion: 86,
      minimo: 1,
      suficiente: true,
      general: 7.6,
      enps: { valor: 28, promotores: 48, detractores: 20, pasivos: 32, n: 142 },
      dimensiones: dims([7.8, 7.1, 6.4, 6.9, 6.6, 8.2, 7.0, 8.0]),
      grupos: [
        { clave: "Almacén", nombre: "Almacén", n: 31, general: 6.1, dimensiones: dims([6.8, 6.0, 5.6, 5.1, 6.2, 7.4, 5.8, 7.0]) },
        { clave: "Caja", nombre: "Caja", n: 28, general: 7.0, dimensiones: dims([7.5, 7.0, 6.8, 7.2, 6.2, 8.0, 6.4, 7.6]) },
        { clave: "Oficina", nombre: "Oficina", n: 22, general: 8.3, dimensiones: dims([8.4, 8.0, 7.8, 8.1, 7.6, 8.9, 8.6, 8.5]) },
        // Desde el 25/11/2026 clima muestra grupos desde 1 respuesta: Reparto (4) ya se ve.
        { clave: "Reparto", nombre: "Reparto", n: 4, general: 6.8, dimensiones: dims([7.0, 6.5, 6.0, 6.6, 6.4, 7.8, 6.9, 7.2]) },
        { clave: "Ventas", nombre: "Ventas", n: 57, general: 7.9, dimensiones: dims([8.1, 7.3, 6.6, 7.2, 6.9, 8.4, 7.3, 8.3]) },
      ],
      gruposOcultos: 0,
    },
    comentarios: [
      {
        clave: "abi1",
        texto: "¿Qué es lo que más te gusta de trabajar aquí?",
        respuestas: ["El ambiente con mis compañeros.", "Me pagan puntual.", "Que puedo aprender cosas nuevas cada semana."],
      },
      {
        clave: "abi2",
        texto: "Si pudieras cambiar una sola cosa de tu trabajo, ¿cuál sería?",
        respuestas: ["Los sábados salimos tarde y nadie avisa con tiempo.", "Más reconocimiento."],
      },
    ],
  },
  anterior: { id: 29, nombre: "Clima mayo 2026", cierra_el: "2026-05-20", comparacion: comparacionGrande(DIMS) },
  evolucion: [
    { id: 28, nombre: "Clima noviembre 2025", cierra_el: "2025-11-20", favorable: 61, general: 7.0, respuestas: 120 },
    { id: 29, nombre: "Clima mayo 2026", cierra_el: "2026-05-20", favorable: 64, general: 7.2, respuestas: 131 },
    { id: 30, nombre: "Clima noviembre 2026", cierra_el: "2026-11-20", favorable: 70, general: 7.6, respuestas: 142 },
  ],
  mediciones: [
    { id: 30, nombre: "Clima noviembre 2026", cierra_el: "2026-11-20" },
    { id: 32, nombre: "Clima general · nov 2026", cierra_el: "2026-11-24" },
    { id: 31, nombre: "Pulso del taller", cierra_el: "2026-11-24" },
    { id: 29, nombre: "Clima mayo 2026", cierra_el: "2026-05-20" },
  ],
  abiertas: [],
  nom035: { campania: { id: 40 }, disponibles: true, nivel: "medio", dominiosAltos: 2 },
};

// Dashboard (25/11/2026): % favorable, confianza, participación por área, lectura y pregunta por pregunta.
{
  const extra = climaGrande(DIMS, TABLERO.actual.clima.grupos);
  TABLERO.actual.clima = {
    ...TABLERO.actual.clima,
    ...extra,
    enps: { ...TABLERO.actual.clima.enps, conteo: extra.enpsConteo },
  };
}

// Empresa chica (25/11/2026): 1 de 3 personas contestó y el servidor ya manda resultados, grupo y comentario.
const TABLERO_CHICO = {
  ...TABLERO,
  actual: {
    campania: { id: 31, nombre: "Pulso del taller", tipo: "clima", estado: "cerrada", abre_el: "2026-11-17", cierra_el: "2026-11-24" },
    invitados: 3,
    contestadas: 1,
    participacion: 33,
    minimo: 1,
    disponibles: true,
    motivo: null,
    agruparPor: "area",
    clima: {
      respuestas: 1,
      invitados: 3,
      participacion: 33,
      minimo: 1,
      suficiente: true,
      general: 6.9,
      enps: { valor: 100, promotores: 100, detractores: 0, pasivos: 0, n: 1 },
      dimensiones: dims([7.5, 5.0, 10.0, 7.5, 5.0, 7.5, 5.0, 7.5]),
      grupos: [{ clave: "Taller", nombre: "Taller", n: 1, general: 6.9, dimensiones: dims([7.5, 5.0, 10.0, 7.5, 5.0, 7.5, 5.0, 7.5]) }],
      gruposOcultos: 0,
    },
    comentarios: [{ clave: "abi2", texto: "Si pudieras cambiar una sola cosa de tu trabajo, ¿cuál sería?", respuestas: ["Que haya más herramientas."] }],
  },
  anterior: null,
  evolucion: [{ id: 31, nombre: "Pulso del taller", cierra_el: "2026-11-24", favorable: 50, general: 6.9, respuestas: 1 }],
};
{
  const cl = TABLERO_CHICO.actual.clima;
  const f = (favorable, neutral) => ({ favorable, neutral, desfavorable: 100 - favorable - neutral, n: 30 });
  const porValor = (v) => (v >= 7.5 ? f(100, 0) : v >= 5 ? f(0, 100) : f(0, 0));
  cl.dimensiones = cl.dimensiones.map((d) => ({ ...d, favorabilidad: porValor(d.valor) }));
  cl.grupos = cl.grupos.map((g) => ({ ...g, favorabilidad: f(50, 50), dimensiones: cl.dimensiones }));
  Object.assign(cl, {
    favorabilidad: f(50, 50),
    confianza: "senal",
    confianzaMinima: 10,
    preguntas: [],
    participacionGrupos: { grupos: [{ clave: "Taller", nombre: "Taller", invitados: 3, contestadas: 1, participacion: 33 }], sinGrupos: false },
  });
  cl.lectura = lectura(cl.favorabilidad, cl.dimensiones);
  cl.enps = { ...cl.enps, conteo: { promotores: 1, pasivos: 0, detractores: 0 } };
}

// Primera medición sin áreas (la maqueta): 4 de 7, «señal», todo en «Otras áreas», sin anterior.
const TABLERO_SIN_AREAS = {
  ...TABLERO,
  actual: {
    campania: { id: 32, nombre: "Clima general · nov 2026", tipo: "clima", estado: "cerrada", abre_el: "2026-11-17", cierra_el: "2026-11-24" },
    invitados: 7,
    contestadas: 4,
    participacion: 57,
    minimo: 1,
    disponibles: true,
    motivo: null,
    agruparPor: "area",
    clima: climaSinAreas(DIMS),
    comentarios: COMENTARIOS_SIN_AREAS,
  },
  anterior: null,
  evolucion: [{ id: 32, nombre: "Clima general · nov 2026", cierra_el: "2026-11-24", favorable: 92, general: 9.3, respuestas: 4 }],
  nom035: null,
};

const dom = (nombre, valor, nivel) => ({ nombre, valor, nivel });
const NOM_RESULTADOS = {
  ok: true,
  campania: {
    id: 40,
    nombre: "NOM-035 · 2026",
    tipo: "nom035",
    estado: "cerrada",
    abre_el: "2026-11-10",
    cierra_el: "2026-11-20",
    guias: ["I", "III"],
  },
  invitados: 165,
  contestadas: 151,
  participacion: 92,
  minimo: 5,
  disponibles: true,
  guia: "III",
  respuestas: 151,
  nom035: {
    guia: "III",
    respuestas: 151,
    final: { valor: 88.4, nivel: "medio" },
    categorias: [
      { nombre: "Ambiente de trabajo", valor: 6.2, nivel: "bajo", dominios: [dom("Condiciones en el ambiente de trabajo", 6.2, "bajo")] },
      {
        nombre: "Factores propios de la actividad",
        valor: 33.1,
        nivel: "medio",
        dominios: [dom("Carga de trabajo", 22.4, "medio"), dom("Falta de control sobre el trabajo", 10.7, "nulo")],
      },
      {
        nombre: "Organización del tiempo de trabajo",
        valor: 9.6,
        nivel: "medio",
        dominios: [dom("Jornada de trabajo", 4.6, "alto"), dom("Interferencia en la relación trabajo-familia", 5.0, "bajo")],
      },
      {
        nombre: "Liderazgo y relaciones en el trabajo",
        valor: 25.3,
        nivel: "bajo",
        dominios: [dom("Liderazgo", 10.2, "bajo"), dom("Relaciones en el trabajo", 8.1, "nulo"), dom("Violencia", 7.0, "bajo")],
      },
      {
        nombre: "Entorno organizacional",
        valor: 14.2,
        nivel: "medio",
        dominios: [dom("Reconocimiento del desempeño", 14.5, "alto"), dom("Insuficiente sentido de pertenencia e, inestabilidad", 4.1, "bajo")],
      },
    ],
    distribucion: { nulo: 22, bajo: 51, medio: 44, alto: 26, muy_alto: 8 },
    accion:
      "Se requiere revisar la política de prevención de riesgos psicosociales y programas para la prevención de los factores de riesgo " +
      "psicosocial, la promoción de un entorno organizacional favorable y la prevención de la violencia laboral, así como reforzar su " +
      "aplicación y difusión, mediante un Programa de intervención.",
    requiereProgramaIntervencion: true,
  },
  obligaciones: [
    { clave: "politica", texto: "Establecer, implantar, mantener y difundir la política de prevención de riesgos psicosociales (5.1)." },
    { clave: "guia1", texto: "Identificar a quienes vivieron acontecimientos traumáticos severos y canalizarlos a valoración (5.5)." },
    { clave: "difusion", texto: "Difundir y proporcionar información a los trabajadores sobre la política y los resultados (5.7)." },
    { clave: "registros", texto: "Llevar los registros de los resultados y de las medidas de control adoptadas (5.8)." },
    { clave: "reaplicar", texto: "Realizar la identificación y análisis al menos cada dos años (7.9).", proxima: "2028-11-20" },
    { clave: "programa", texto: "Aplicar un Programa de intervención por el nivel de riesgo obtenido (8.3, 8.4 y Tabla 4/7)." },
  ],
  fuente: { publicacion: "Diario Oficial de la Federación, 23/10/2018" },
};
NOM_RESULTADOS.nom035.dominios = NOM_RESULTADOS.nom035.categorias.flatMap((c) => c.dominios);

const GUIA_I = {
  clave: "I",
  titulo: "Cuestionario para identificar a los trabajadores que fueron sujetos a acontecimientos traumáticos severos",
  secciones: [
    {
      clave: "I",
      titulo: "I.- Acontecimiento traumático severo",
      encabezado: "¿Ha presenciado o sufrido alguna vez, durante o con motivo del trabajo un acontecimiento como los siguientes:",
      reactivos: [
        "Accidente que tenga como consecuencia la muerte, la pérdida de un miembro o una lesión grave?",
        "Asaltos?",
        "Actos violentos que derivaron en lesiones graves?",
        "Secuestro?",
        "Amenazas?, o",
        "Cualquier otro que ponga en riesgo su vida o salud, y/o la de otras personas?",
      ],
    },
    {
      clave: "II",
      titulo: "II.- Recuerdos persistentes sobre el acontecimiento (durante el último mes):",
      reactivos: [
        "¿Ha tenido recuerdos recurrentes sobre el acontecimiento que le provocan malestares?",
        "¿Ha tenido sueños de carácter recurrente sobre el acontecimiento, que le producen malestar?",
      ],
    },
    {
      clave: "III",
      titulo: "III.- Esfuerzo por evitar circunstancias parecidas o asociadas al acontecimiento (durante el último mes):",
      reactivos: [
        "¿Se ha esforzado por evitar todo tipo de sentimientos, conversaciones o situaciones que le puedan recordar el acontecimiento?",
        "¿Ha tenido dificultad para recordar alguna parte importante del evento?",
      ],
    },
    { clave: "IV", titulo: "IV Afectación (durante el último mes):", reactivos: ["¿Ha tenido usted dificultades para dormir?"] },
  ],
};
const GUIA_III = {
  clave: "III",
  titulo: "Cuestionario para identificar los factores de riesgo psicosocial y evaluar el entorno organizacional en los centros de trabajo",
  opciones: FRECUENCIA,
  secciones: [
    {
      intro: "Para responder las preguntas siguientes considere las condiciones ambientales de su centro de trabajo.",
      condicion: null,
      items: [
        { numero: 1, texto: "El espacio donde trabajo me permite realizar mis actividades de manera segura e higiénica" },
        { numero: 2, texto: "Mi trabajo me exige hacer mucho esfuerzo físico" },
        { numero: 3, texto: "Me preocupa sufrir un accidente en mi trabajo" },
      ],
    },
    {
      intro: "Las preguntas siguientes están relacionadas con la atención a clientes y usuarios.",
      condicion: {
        clave: "clientes",
        pregunta: "En mi trabajo debo brindar servicio a clientes o usuarios:",
        instruccion: 'Si su respuesta fue "SÍ", responda las preguntas siguientes.',
      },
      items: [
        { numero: 65, texto: "Atiendo clientes o usuarios muy enojados" },
        { numero: 66, texto: "Mi trabajo me exige atender personas muy necesitadas de ayuda o enfermas" },
      ],
    },
    {
      intro: "Las preguntas siguientes están relacionadas con las actitudes de las personas que supervisa.",
      condicion: {
        clave: "jefe",
        pregunta: "Soy jefe de otros trabajadores:",
        instruccion: 'Si su respuesta fue "NO", ha concluido el cuestionario.',
      },
      items: [{ numero: 69, texto: "Comunican tarde los asuntos de trabajo" }],
    },
  ],
};

// Adamia AI simulada: mismas formas que modules/clima/controllers/iaController.js.
function respuestaIa(e, cuerpo, estado) {
  if (e === "/ia/estado") return { ok: true, activo: estado.iaActiva, usos_mes: estado.llamadasIa.length + 12, gasto_mes_usd: 0.42, tope_mensual_usd: 5 };
  if (e === "/ia/crear") {
    return {
      ok: true,
      nombre: "¿Por qué se van los cajeros nuevos?",
      minutos: 2,
      avisos: [],
      definicion: {
        agruparPor: "area",
        recurrencia: "ninguna",
        dimensiones: [{ clave: "induccion", nombre: "Inducción" }],
        secciones: [
          {
            clave: "s1",
            titulo: "Primeros días",
            preguntas: [
              { clave: "a1", tipo: "sino", texto: "¿Verdad que tu jefe te trata bien y te apoya siempre?", dimension: "induccion", requerida: true },
              {
                clave: "a2",
                tipo: "escala",
                texto: "En tu primera semana alguien te explicó con claridad cómo hacer tu trabajo.",
                dimension: "induccion",
                requerida: true,
              },
            ],
          },
          {
            clave: "s2",
            titulo: "Abiertas",
            preguntas: [{ clave: "a3", tipo: "abierta", texto: "¿Qué te haría quedarte?", dimension: null, requerida: false }],
          },
        ],
      },
    };
  }
  if (e === "/ia/revisar") {
    const q = cuerpo.definicion.secciones.flatMap((s) => s.preguntas).find((x) => x.tipo !== "abierta" && x.tipo !== "enps");
    return {
      ok: true,
      minutos: 2,
      lenguajeClaro: true,
      hallazgos: [
        {
          clave: q.clave,
          problemas: ["sesgada", "doble"],
          explicacion: "«¿Verdad que…?» empuja a contestar que sí y junta dos ideas.",
          propuesta: ["Mi jefe directo me trata con respeto.", "Cuando tengo un problema, mi jefe me ayuda a resolverlo."],
        },
      ],
    };
  }
  if (e === "/ia/mas-preguntas") {
    return {
      ok: true,
      preguntas: ["Sé a quién acudir si tengo un problema.", "Mi capacitación fue suficiente.", "Me siento parte del equipo."].map((texto) => ({
        tipo: "escala",
        texto,
        dimension: null,
        requerida: true,
      })),
    };
  }
  const guardado = estado.llamadasIa.some((x) => x.ruta === e);
  if (e.endsWith("/temas")) {
    if (cuerpo?.soloGuardado && !guardado) return { ok: true, vacio: true };
    return {
      ok: true,
      comentarios: 96,
      loMejor: "El trato de los jefes.",
      temas: [
        { tema: "Horarios y descansos", menciones: 23, cita: "Los sábados salimos tarde y nadie avisa con tiempo." },
        { tema: "Reconocimiento", menciones: 18, cita: null },
        { tema: "Trato del jefe directo", menciones: 15, cita: null },
        { tema: "Herramientas de trabajo", menciones: 9, cita: null },
      ],
    };
  }
  if (cuerpo?.soloGuardado && !guardado) return { ok: true, vacio: true };
  return {
    ok: true,
    // Sugerencias estructuradas (el servidor ya validó dimensión, texto ≤300 y por qué). La tercera ya está en el plan (501).
    acciones: [
      {
        dimension: "carga",
        grupo: "Almacén",
        tema: "Carga de trabajo",
        accion: "Publicar los horarios del sábado con 1 semana de anticipación.",
        porque: "Carga de trabajo es la dimensión más baja en Almacén (5.1 de 10).",
        responsable: "Jefe de almacén",
        plazoDias: 14,
        indicador: "Horarios publicados a tiempo",
      },
      {
        dimension: "reconocimiento",
        grupo: "Toda la empresa",
        tema: "Reconocimiento",
        accion: "Reconocimiento mensual por área desde la app.",
        porque: "Reconocimiento: 52 % favorable, 18 puntos bajo la empresa.",
        responsable: "RH",
        plazoDias: 30,
        indicador: "",
      },
      {
        dimension: "crecimiento",
        grupo: "Toda la empresa",
        tema: "Crecimiento",
        accion: "Plática 1 a 1 de plan de carrera con cada persona.",
        porque: "Crecimiento 6.6 de 10.",
        responsable: "Jefes de área",
        plazoDias: 45,
        indicador: "Pláticas hechas",
      },
    ],
    descartadas: 0,
    programaNom035: [
      {
        dominio: "Jornada de trabajo",
        nivel: "Alto",
        acciones: "Respetar descansos y publicar horarios con anticipación.",
        responsable: "Gerente de operaciones",
        plazoDias: 60,
        evaluacion: "Reaplicar en 6 meses",
      },
      {
        dominio: "Reconocimiento del desempeño",
        nivel: "Alto",
        acciones: "Retroalimentación mensual del jefe y reconocimiento visible.",
        responsable: "RH",
        plazoDias: 60,
        evaluacion: "Encuesta de pulso",
      },
    ],
  };
}

const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

export function datosSimulados() {
  const TOKEN = "AbCdEfGhIjKlMnOpQrStUvWxYz012345";
  const estado = {
    plantilla: {
      id: 11,
      claveOrigen: "clima_general",
      tipo: "clima",
      nombre: "Clima general",
      descripcion: null,
      definicion: definicionInicial(),
      revision: 1,
      archivada: false,
    },
    plantillaIa: null,
    tareas: [],
    // Plan de acción (clima_acciones): medición 30 con su plan; la 29 (anterior) con una acción y su seguimiento.
    acciones: [
      {
        id: 501, idCampania: 30, dimension: "crecimiento", texto: "Plática 1 a 1 de plan de carrera con cada persona",
        responsable: { id: 101, nombre: "Persona 1" }, fecha_limite: "2026-12-15", estado: "en_curso", revision: 1, seguimiento: null,
      },
      {
        id: 401, idCampania: 29, dimension: "reconocimiento", texto: "Reconocimiento mensual en la junta del lunes",
        responsable: { id: 102, nombre: "Persona 2" }, fecha_limite: "2026-06-30", estado: "lograda", revision: 2,
        seguimiento: { medicion: { id: 30, nombre: "Clima noviembre 2026", cierra_el: "2026-11-20" }, antes: 43, despues: 52, delta: 9, subio: true },
      },
    ],
    siguienteAccion: 600,
    iaActiva: true,
    llamadasAcciones: [],
    tableros: [],
    llamadasIa: [],
    campania: null,
    guardados: 0,
    respuestas: [],
    canalizados: [],
    cumplimiento: { politica_en: null, difusion_en: null, programa_en: null },
  };
  const resumen = (c) => ({
    id: c.id,
    nombre: c.nombre,
    tipo: c.tipo,
    estado: c.estado,
    abre_el: c.abre_el,
    cierra_el: c.cierra_el,
    invitados: c.invitados,
    contestadas: c.contestadas,
    recurrencia: "ninguna",
    guias: c.guias ?? null,
    idPlantilla: c.idPlantilla ?? null,
  });
  const nom41 = {
    id: 41,
    nombre: "NOM-035 · 2026",
    tipo: "nom035",
    estado: "activa",
    abre_el: hoy(),
    cierra_el: hoy(),
    invitados: 165,
    contestadas: 10,
    guias: ["I", "III"],
  };
  const fijas = [
    {
      id: 30,
      nombre: "Clima noviembre 2026",
      tipo: "clima",
      estado: "cerrada",
      abre_el: "2026-11-10",
      cierra_el: "2026-11-20",
      invitados: 165,
      contestadas: 142,
      idPlantilla: 9,
    },
    {
      id: 40,
      nombre: "NOM-035 · 2026",
      tipo: "nom035",
      estado: "cerrada",
      abre_el: "2026-11-10",
      cierra_el: "2026-11-20",
      invitados: 165,
      contestadas: 151,
      guias: ["I", "III"],
    },
  ];
  const cuestionario = (c) =>
    c.tipo === "nom035"
      ? {
          id: c.id,
          nombre: c.nombre,
          tipo: "nom035",
          cierra_el: c.cierra_el,
          anonima: true,
          minimo: 5,
          guias: c.guias,
          cuestionarios: [GUIA_I, GUIA_III],
        }
      : {
          id: c.id,
          nombre: c.nombre,
          tipo: "clima",
          cierra_el: c.cierra_el,
          anonima: true,
          minimo: 1,
          secciones: c.definicion.secciones,
          escala: ESCALA,
        };

  async function atender(route, { base, usuario }) {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const cors = {
      "Access-Control-Allow-Origin": base,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "authorization,content-type",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    };
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(data) });
    const p = url.pathname.replace(/^\/api/, "");
    const m = req.method();
    const cuerpo = req.postData() ? JSON.parse(req.postData()) : null;
    if (p.endsWith("/users/verify/token")) return usuario ? json({ user: usuario }) : json({ error: "sesión" }, 401);
    if (p === "/checador/tareas/tareas" && m === "POST") {
      estado.tareas.push(cuerpo);
      return json({ ok: true, id: estado.tareas.length }, 201);
    }
    // Selector de responsable (SelectorEmpleado): personas activas de la empresa.
    if (p === "/checador/empleados" && m === "GET")
      return json({
        data: PERSONAS.map((x) => ({ id_empleado: x.id, nombre: x.nombre, apellido_paterno: "", apellido_materno: "", puesto: x.puesto, departamento: x.area })),
        total: PERSONAS.length,
      });
    if (!p.startsWith("/checador/clima")) return json({});
    const e = p.slice("/checador/clima".length);
    const c = estado.campania;

    if (e === "/inicio") return json({ ok: true, empresa: { activos: 165, guias: ["I", "III"], muestraGuiaIII: 116 }, catalogo: CATALOGO, minimo: 1, minimoNom035: 5 });
    if (e === "/plantillas" && m === "GET") return json({ ok: true, plantillas: [estado.plantilla] });
    if (e === "/plantillas" && m === "POST") {
      if (cuerpo.clave_origen) return json({ ok: true, plantilla: estado.plantilla }, 201);
      estado.plantillaIa = { id: 12, claveOrigen: null, tipo: "clima", nombre: cuerpo.nombre, descripcion: null, definicion: cuerpo.definicion, revision: 1 };
      return json({ ok: true, plantilla: estado.plantillaIa }, 201);
    }
    if (e === "/plantillas/12" && m === "GET") return json({ ok: true, plantilla: estado.plantillaIa });
    if (e === "/plantillas/12" && m === "PUT") {
      estado.plantillaIa = { ...estado.plantillaIa, nombre: cuerpo.nombre, definicion: cuerpo.definicion, revision: estado.plantillaIa.revision + 1 };
      return json({ ok: true, plantilla: estado.plantillaIa, avisos: [] });
    }
    if (e === "/plantillas/11" && m === "GET") return json({ ok: true, plantilla: estado.plantilla });
    if (e === "/plantillas/11" && m === "PUT") {
      if (cuerpo.revision !== estado.plantilla.revision) return json({ ok: false, error: "Alguien más guardó esta encuesta." }, 409);
      estado.guardados += 1;
      estado.plantilla = {
        ...estado.plantilla,
        nombre: cuerpo.nombre,
        definicion: cuerpo.definicion,
        revision: estado.plantilla.revision + 1,
      };
      return json({ ok: true, plantilla: estado.plantilla, avisos: [] });
    }
    if (e === "/opciones")
      return json({
        ok: true,
        areas: ["Almacén", "Caja", "Oficina", "Reparto", "Ventas"],
        puestos: [
          { id: 1, nombre: "Auxiliar" },
          { id: 2, nombre: "Cajero" },
        ],
        personas: PERSONAS,
      });
    if (e === "/destinatarios/vista-previa") {
      const d = cuerpo.destinatarios;
      const elegidas =
        d.modo === "filtro" && d.areas?.length
          ? PERSONAS.filter((x) => d.areas.includes(x.area))
          : d.modo === "personas"
          ? PERSONAS.filter((x) => d.personas.includes(x.id))
          : PERSONAS;
      const porArea = {};
      for (const x of elegidas) porArea[x.area] = (porArea[x.area] ?? 0) + 1;
      return json({
        ok: true,
        total: elegidas.length,
        porArea,
        gruposChicos: Object.keys(porArea).filter((a) => porArea[a] < 5),
        equipoPequeno: 5,
        minimoNom035: 5,
      });
    }
    if (e === "/campanias" && m === "POST") {
      if (cuerpo.tipo === "nom035") return json({ ok: true, campania: resumen(nom41) }, 201);
      estado.campania = {
        id: 21,
        nombre: cuerpo.nombre,
        tipo: "clima",
        estado: "borrador",
        abre_el: null,
        cierra_el: null,
        invitados: 0,
        contestadas: 0,
        idPlantilla: 11,
        definicion: JSON.parse(JSON.stringify(estado.plantilla.definicion)),
        revision: 1,
        canales: { app: true, correo: true },
        destinatarios: { modo: "todos" },
      };
      return json({ ok: true, campania: resumen(estado.campania) }, 201);
    }
    if (e === "/campanias" && m === "GET") return json({ ok: true, campanias: [...(c ? [resumen(c)] : []), resumen(nom41), ...fijas.map(resumen)] });
    if (e === "/campanias/21" && m === "GET")
      return json({
        ok: true,
        campania: {
          ...resumen(c),
          canales: c.canales,
          destinatarios: c.destinatarios,
          recordatorio_dias: null,
          revision: c.revision,
          definicion: c.definicion,
        },
      });
    if (e === "/campanias/21" && m === "PATCH") {
      Object.assign(c, cuerpo, { revision: c.revision + 1 });
      return json({ ok: true, campania: resumen(c) });
    }
    if (e === "/campanias/21/lanzar") {
      c.estado = "activa";
      c.invitados = PERSONAS.filter((x) => c.destinatarios.areas.includes(x.area)).length;
      return json({ ok: true, invitados: c.invitados, guias: null, correos: c.invitados, aviso: null });
    }
    if (/^\/campanias\/\d+\/participacion$/.test(e))
      return json({
        ok: true,
        invitados: 2,
        contestadas: 1,
        personas: [
          { id: 1, nombre: "Persona 1", estado: "contestada" },
          { id: 2, nombre: "Persona 2", estado: "pendiente" },
        ],
      });
    if (e.startsWith("/tablero")) {
      const pedida = url.searchParams.get("campania");
      const t = pedida === "31" ? TABLERO_CHICO : pedida === "32" ? TABLERO_SIN_AREAS : TABLERO;
      const id = t.actual.campania.id;
      const de = (idC) => estado.acciones.filter((a) => a.idCampania === idC);
      estado.tableros.push(id);
      return json({
        ...t,
        plan: {
          acciones: de(id),
          anterior: t.anterior ? { id: t.anterior.id, nombre: t.anterior.nombre, acciones: de(t.anterior.id) } : null,
          estados: ["pendiente", "en_curso", "lograda", "no_lograda"],
        },
      });
    }
    const crearAccion = /^\/campanias\/(\d+)\/acciones$/.exec(e);
    if (crearAccion && m === "POST") {
      estado.llamadasAcciones.push({ m, e, cuerpo });
      // Como el servidor: mismo texto y dimensión en la misma medición → 409 DUPLICADA.
      const idC = Number(crearAccion[1]);
      const clave = claveAccion(cuerpo.texto, cuerpo.dimension ?? null);
      if (estado.acciones.some((x) => x.idCampania === idC && claveAccion(x.texto, x.dimension ?? null) === clave)) {
        return json({ ok: false, codigo: "DUPLICADA", error: "Esa acción ya está en el plan." }, 409);
      }
      const persona = PERSONAS.find((x) => x.id === cuerpo.id_responsable);
      const a = {
        id: estado.siguienteAccion++, idCampania: Number(crearAccion[1]), dimension: cuerpo.dimension, texto: cuerpo.texto,
        responsable: persona ? { id: persona.id, nombre: persona.nombre } : null, fecha_limite: cuerpo.fecha_limite,
        estado: cuerpo.estado ?? "pendiente", revision: 1, seguimiento: null,
      };
      estado.acciones.push(a);
      return json({ ok: true, accion: a }, 201);
    }
    const unaAccion = /^\/acciones\/(\d+)$/.exec(e);
    if (unaAccion) {
      estado.llamadasAcciones.push({ m, e, cuerpo });
      const a = estado.acciones.find((x) => x.id === Number(unaAccion[1]));
      if (!a) return json({ ok: false, error: "La acción no existe." }, 404);
      if (m === "DELETE") {
        estado.acciones = estado.acciones.filter((x) => x !== a);
        return json({ ok: true });
      }
      if (cuerpo.revision && cuerpo.revision !== a.revision) return json({ ok: false, codigo: "VERSION", error: "Alguien más cambió esta acción." }, 409);
      const persona = cuerpo.id_responsable ? PERSONAS.find((x) => x.id === cuerpo.id_responsable) : null;
      Object.assign(a, { ...cuerpo, revision: a.revision + 1 }, persona ? { responsable: { id: persona.id, nombre: persona.nombre } } : {});
      delete a.id_responsable;
      return json({ ok: true, accion: a });
    }
    if (e === "/campanias/40/resultados") return json(NOM_RESULTADOS);
    if (e === "/campanias/40/guia1") {
      const canal = (id) => (estado.canalizados.filter((x) => x.id === id).at(-1)?.canalizado ? "2026-11-24T10:00:00Z" : null);
      return json({
        ok: true,
        confidencial: true,
        contestadas: 151,
        requierenValoracion: 3,
        personas: [
          {
            id: 1,
            nombre: "Luis Pérez",
            area: "Almacén",
            acontecimiento: true,
            requiereValoracion: true,
            motivos: ["Respondió «Sí» en alguna pregunta de la sección II (recuerdos persistentes)."],
            canalizadoEn: canal(1),
          },
          {
            id: 2,
            nombre: "María López",
            area: "Caja",
            acontecimiento: true,
            requiereValoracion: true,
            motivos: ["Respondió «Sí» en dos o más preguntas de la sección IV (afectación)."],
            canalizadoEn: null,
          },
          {
            id: 3,
            nombre: "Jorge Ruiz",
            area: "Reparto",
            acontecimiento: true,
            requiereValoracion: true,
            motivos: ["Respondió «Sí» en tres o más preguntas de la sección III (esfuerzo por evitar)."],
            canalizadoEn: null,
          },
          {
            id: 4,
            nombre: "Pedro Gómez",
            area: "Ventas",
            acontecimiento: true,
            requiereValoracion: false,
            motivos: [],
            canalizadoEn: null,
          },
        ],
      });
    }
    if (/^\/guia1\/\d+$/.test(e)) {
      estado.canalizados.push({ id: Number(e.split("/")[2]), canalizado: cuerpo.canalizado });
      return json({ ok: true });
    }
    if (e === "/nom035/cumplimiento") {
      if (m === "PUT") estado.cumplimiento = { ...estado.cumplimiento, ...cuerpo };
      return json({ ok: true, cumplimiento: estado.cumplimiento });
    }
    if (/^\/campanias\/\d+\/informe$/.test(e)) return route.fulfill({ status: 200, contentType: "application/pdf", headers: cors, body: PDF });
    if (e === "/mis-encuestas") {
      const lista = [];
      if (c?.estado === "activa")
        lista.push({
          id: 21,
          nombre: c.nombre,
          tipo: "clima",
          cierra_el: c.cierra_el,
          contestada: estado.respuestas.some((r) => r.respuestas),
          estado: "activa",
        });
      lista.push({ id: 41, nombre: nom41.nombre, tipo: "nom035", cierra_el: nom41.cierra_el, contestada: false, estado: "activa" });
      return json({ ok: true, encuestas: lista });
    }
    if (e === "/encuestas/21" || e === `/publica/${TOKEN}`) return json({ ok: true, contestada: false, encuesta: cuestionario(c) });
    if (e === "/encuestas/41") return json({ ok: true, contestada: false, encuesta: cuestionario(nom41) });
    if (/^\/(encuestas\/\d+|publica\/[\w-]+)\/respuestas$/.test(e)) {
      estado.respuestas.push(cuerpo);
      return json({ ok: true }, 201);
    }
    if (e.startsWith("/ia/") || /\/ia\/(temas|plan)$/.test(e)) {
      if (m === "POST" && !cuerpo?.soloGuardado && !estado.iaActiva) {
        return json({ ok: false, codigo: "IA_APAGADA", error: "Adamia AI no está activa en esta empresa." }, 409);
      }
      if (m === "POST" && !cuerpo?.soloGuardado) estado.llamadasIa.push({ ruta: e, cuerpo });
      return json(respuestaIa(e, cuerpo, estado));
    }
    return json({ ok: false, error: `Ruta simulada no definida: ${m} ${e}` }, 404);
  }

  return { estado, atender, TOKEN };
}
