// Datos simulados del dashboard de resultados de clima (25/11/2026) con las mismas formas que el servidor
// (modules/clima/services/resultados.js): % favorable por dimensión, pregunta y grupo, confianza, participación por
// grupo, lectura por reglas, comparación, evolución y plan de acción. Lo usan scripts/lib/clima-simulado.mjs
// (verify-clima.mjs) y scripts/verify-clima-dashboard.mjs.

const fav = (favorable, neutral, n = 100) => ({ favorable, neutral, desfavorable: 100 - favorable - neutral, n });

const TEXTOS = {
  liderazgo: ["Mi jefe directo me trata con respeto.", "Mi jefe directo me explica con claridad lo que espera de mí.", "Cuando tengo un problema en el trabajo, mi jefe me ayuda a resolverlo.", "Confío en las decisiones de los responsables de la empresa."],
  comunicacion: ["Me entero a tiempo de los cambios que afectan mi trabajo.", "Puedo dar mi opinión sin miedo a represalias.", "Mis ideas y sugerencias se toman en cuenta."],
  reconocimiento: ["Cuando hago bien mi trabajo, alguien me lo reconoce.", "Mi sueldo es justo por el trabajo que hago.", "Recibo comentarios útiles sobre cómo hago mi trabajo."],
  carga: ["Puedo terminar mi trabajo dentro de mi horario.", "La cantidad de trabajo que tengo es razonable.", "Mis horarios se publican con suficiente anticipación.", "Puedo tomar mis descansos sin problema."],
  crecimiento: ["Aquí he aprendido cosas que me sirven para crecer.", "Veo posibilidades reales de mejorar de puesto o de sueldo.", "Sé qué tengo que hacer para crecer en la empresa."],
  ambiente: ["Me llevo bien con mis compañeros de trabajo.", "En mi área nos ayudamos cuando alguien lo necesita.", "En mi trabajo se trata a todas las personas con respeto."],
  herramientas: ["Tengo las herramientas y el equipo que necesito para hacer mi trabajo.", "El equipo que uso está en buenas condiciones.", "Mi lugar de trabajo es seguro y limpio."],
  pertenencia: ["Me siento orgulloso de trabajar aquí.", "Me veo trabajando aquí dentro de un año.", "Entiendo cómo mi trabajo ayuda a la empresa."],
};

// dims: [{ clave, nombre }] · valores: { clave: [favorable, neutral, valor0a10] }
function dimensiones(dims, valores) {
  return dims.map((d) => {
    const [f, n, v] = valores[d.clave];
    return { clave: d.clave, nombre: d.nombre, valor: v, favorabilidad: f === null ? null : fav(f, n) };
  });
}

function preguntas(dims, valores) {
  return dims.flatMap((d) =>
    (TEXTOS[d.clave] ?? []).map((texto, i) => {
      const [f, n] = valores[d.clave];
      const ajuste = (i % 3) * 6 - 6;
      const favorable = Math.max(0, Math.min(100, f + ajuste));
      return {
        clave: `${d.clave.slice(0, 3)}${i + 1}`,
        texto,
        tipo: "escala",
        dimension: d.clave,
        dimensionNombre: d.nombre,
        favorabilidad: fav(favorable, Math.min(n, 100 - favorable)),
      };
    })
  );
}

export function lectura(total, dims) {
  const conDato = dims.filter((d) => d.favorabilidad);
  const prom = total.favorable;
  const orden = [...conDato].sort((a, b) => b.favorabilidad.favorable - a.favorabilidad.favorable);
  const fuertes = orden.filter((d) => d.favorabilidad.favorable >= 75 && d.favorabilidad.favorable >= prom).slice(0, 2);
  const atencion = [...orden].reverse().filter((d) => prom - d.favorabilidad.favorable >= 5 || d.favorabilidad.favorable < 60).slice(0, 2);
  const r = (d) => ({ clave: d.clave, nombre: d.nombre, favorable: d.favorabilidad.favorable, diferencia: d.favorabilidad.favorable - prom });
  return {
    fuertes: fuertes.map(r),
    atencion: atencion.map(r),
    parejo: false,
    promedio: prom,
    texto: {
      fuerte: fuertes.length
        ? `${fuertes.map((d) => `${d.nombre} (${d.favorabilidad.favorable} %)`).join(" y ")}: lo más alto de la encuesta.`
        : `Ninguna dimensión llega a 75 % favorable.`,
      atencion: atencion
        .map((d) => `${d.nombre}: ${d.favorabilidad.favorable} % favorable, ${prom - d.favorabilidad.favorable} puntos bajo la empresa.`)
        .join(" "),
    },
  };
}

// Medición grande (142 respuestas, 5 áreas, segunda medición de la plantilla con plan anterior).
export function climaGrande(DIMS, gruposBase) {
  const valores = {
    liderazgo: [78, 14, 7.8],
    comunicacion: [66, 20, 7.1],
    reconocimiento: [52, 26, 6.4],
    carga: [61, 21, 6.9],
    crecimiento: [55, 25, 6.6],
    ambiente: [86, 10, 8.2],
    herramientas: [64, 22, 7.0],
    pertenencia: [83, 12, 8.0],
  };
  const total = fav(70, 18, 4260);
  const dims = dimensiones(DIMS, valores);
  const grupos = gruposBase.map((g, k) => {
    const desplaza = [-12, -4, 10, -6, 3][k] ?? 0;
    const vs = Object.fromEntries(Object.entries(valores).map(([c, [f, n, v]]) => [c, [Math.max(0, Math.min(100, f + desplaza)), Math.min(n, 100 - Math.max(0, Math.min(100, f + desplaza))), v]]));
    return { ...g, favorabilidad: fav(Math.max(0, Math.min(100, 70 + desplaza)), 18, g.n * 30), dimensiones: dimensiones(DIMS, vs) };
  });
  const invitados = { Almacén: 36, Caja: 31, Oficina: 24, Reparto: 7, Ventas: 64 };
  return {
    favorabilidad: total,
    confianza: "confiable",
    confianzaMinima: 10,
    dimensiones: dims,
    preguntas: preguntas(DIMS, valores),
    grupos,
    participacionGrupos: {
      grupos: gruposBase.map((g) => ({ clave: g.clave, nombre: g.nombre, invitados: invitados[g.nombre], contestadas: g.n, participacion: Math.round((g.n / invitados[g.nombre]) * 100) })),
      sinGrupos: false,
    },
    lectura: lectura(total, dims),
    enpsConteo: { promotores: 68, pasivos: 45, detractores: 29 },
  };
}

export const comparacionGrande = (DIMS) => ({
  general: 0.4,
  favorable: 6,
  enps: 6,
  participacion: 5,
  dimensiones: DIMS.map((d, i) => ({ clave: d.clave, favorable: [4, -3, 9, 0, 12, 2, -1, 5][i], valor: 0.2 })),
});

// Primera medición de una empresa sin áreas (como la maqueta): 4 de 7, señal, todo en «Otras áreas».
export function climaSinAreas(DIMS) {
  const valores = {
    liderazgo: [94, 6, 9.4],
    comunicacion: [88, 12, 9.2],
    reconocimiento: [81, 13, 8.9],
    carga: [94, 3, 9.4],
    crecimiento: [81, 19, 8.9],
    ambiente: [100, 0, 9.6],
    herramientas: [97, 3, 9.6],
    pertenencia: [100, 0, 9.8],
  };
  const total = fav(92, 6, 116);
  const dims = dimensiones(DIMS, valores);
  return {
    respuestas: 4,
    invitados: 7,
    participacion: 57,
    minimo: 1,
    suficiente: true,
    confianza: "senal",
    confianzaMinima: 10,
    general: 9.3,
    favorabilidad: total,
    enps: { valor: 100, promotores: 100, detractores: 0, pasivos: 0, n: 4, conteo: { promotores: 4, pasivos: 0, detractores: 0 } },
    dimensiones: dims,
    preguntas: preguntas(DIMS, valores),
    grupos: [{ clave: "Otras áreas", nombre: "Otras áreas", n: 4, general: 9.3, favorabilidad: total, dimensiones: dims }],
    gruposOcultos: 0,
    participacionGrupos: { grupos: [{ clave: "Otras áreas", nombre: "Otras áreas", invitados: 7, contestadas: 4, participacion: 57 }], sinGrupos: true },
    lectura: {
      fuertes: [],
      atencion: [],
      parejo: false,
      promedio: 92,
      texto: {
        fuerte: "Pertenencia y Ambiente: todos respondieron favorable.",
        atencion: "Crecimiento: 81 % favorable, 11 puntos bajo la empresa. Reconocimiento: 81 % favorable, 11 puntos bajo la empresa.",
      },
    },
  };
}

export const COMENTARIOS_SIN_AREAS = [
  {
    clave: "abi1",
    texto: "¿Qué es lo que más te gusta de trabajar aquí?",
    respuestas: [
      "ambiente laboral",
      "Me gusta que exista un ambiente en el que me siento cómodo, motivado y valorado en mi trabajo. Aprecio recibir retroalimentación constructiva y tener la oportunidad de aprender cosas nuevas.",
      "Me gusta que puedo aprender cosas nuevas utilizando la IA para mejorar y hacer más rápido el trabajo.",
    ],
  },
  {
    clave: "abi2",
    texto: "Si pudieras cambiar una sola cosa de tu trabajo, ¿cuál sería?",
    respuestas: ["Más capacitación en el sistema nuevo.", "Que los horarios del sábado se publiquen antes.", "Nada, todo bien."],
  },
];
