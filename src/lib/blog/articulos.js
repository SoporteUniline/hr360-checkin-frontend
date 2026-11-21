// Artículos del blog (SEO) sobre la reforma a la Ley Federal del Trabajo del 1 de mayo de 2026.
// Reglas: solo datos que coinciden en varias fuentes y con la fuente citada; lo que la ley no aclara se dice
// así; nada de asesoría legal. Revisar cuando la STPS publique las disposiciones del registro electrónico.
// Última revisión de fuentes: 21/11/2026.

const F = {
  diputados: { titulo: "Cámara de Diputados · Reforma 52 a la LFT (DOF 01/05/2026)", url: "https://www.diputados.gob.mx/LeyesBiblio/ref/lft/LFT_ref52_01may26.pdf" },
  lexlatin: { titulo: "LexLatin · Registro electrónico de jornada en México: obligaciones, sanciones y riesgos", url: "https://lexlatin.com/reportajes/registro-electronico-jornada-mexico-obligaciones-sanciones-riesgos-legales" },
  gtlaw: { titulo: "Greenberg Traurig · Reforma a la LFT: reducción gradual de la jornada", url: "https://www.gtlaw.com/en/insights/2026/5/reforma-a-la-ley-federal-del-trabajo---reduccion" },
  kpmg: { titulo: "KPMG México · Tiempo extraordinario y seguridad social tras la reforma", url: "https://kpmg.com/mx/es/tendencias/2026/06/ao-tiempo-extraordinario-efectos-materia-seguridad-social.html" },
  taxtoday: { titulo: "TaxToday México · Se publica reforma a la LFT sobre reducción de la jornada", url: "https://www.taxtodaymexico.com/se-publica-reforma-a-la-lft-sobre-reduccion-de-la-jornada-laboral/" },
  contribuyente: { titulo: "El Contribuyente · Multas de hasta 5,000 UMA por no registrar la jornada", url: "https://www.elcontribuyente.mx/2026/10/multas-de-hasta-5000-uma-por-no-registrar-la-jornada-de-trabajo/" },
  publimetro: { titulo: "Publimetro · Checador obligatorio en 2027: la STPS aún no explica cómo cumplir (03/11/2026)", url: "https://www.publimetro.com.mx/noticias/2026/11/03/checador-obligatorio-en-el-trabajo-para-2027-stps-aun-no-explica-como-cumplir-la-nueva-regla/" },
};

export const AVISO_LEGAL =
  "Este artículo es informativo y no sustituye la asesoría de un abogado laboral. Se basa en el decreto publicado en el DOF el 1 de mayo de 2026; las reglas de la STPS para el registro electrónico aún no se publican a la fecha de revisión.";

export const ARTICULOS = [
  {
    slug: "registro-electronico-jornada-2027",
    titulo: "Registro electrónico de la jornada: obligatorio desde 2027",
    descripcion:
      "Qué exige el artículo 132, fracción XXXIV de la LFT, desde cuándo aplica, qué falta por definir la STPS y cuánto cuestan las multas por no cumplir.",
    categoria: "Registro de jornada",
    fecha: "2026-11-21",
    lectura: "7 min",
    destacado: true,
    resumen: [
      "La reforma publicada en el DOF el 1 de mayo de 2026 obliga a registrar de forma electrónica la jornada de cada trabajador.",
      "Las disposiciones de la STPS que aterrizan la obligación rigen desde el 1 de enero de 2027.",
      "No cumplir se multa con 250 a 5,000 UMA: de $29,327.50 a $586,550 con la UMA de 2026.",
    ],
    secciones: [
      {
        titulo: "Qué dice la ley",
        parrafos: [
          "La reforma a la Ley Federal del Trabajo (LFT) que reduce la jornada a 40 horas también agregó una obligación nueva para las empresas: la fracción XXXIV del artículo 132. Según el decreto, el patrón debe registrar de manera electrónica la jornada de cada persona trabajadora, con la hora de inicio y la de término, y entregar ese registro a la autoridad cuando lo requiera.",
          "La misma fracción encarga a la Secretaría del Trabajo y Previsión Social (STPS) emitir disposiciones de carácter general que definan a quién aplica la obligación y en qué casos hay excepciones.",
        ],
      },
      {
        titulo: "Desde cuándo aplica",
        parrafos: [
          "El decreto se publicó el 1 de mayo de 2026. Su artículo transitorio quinto establece que las disposiciones de la STPS sobre el registro electrónico entran en vigor el 1 de enero de 2027.",
          "A la fecha de esta revisión, la STPS no ha publicado esas disposiciones. Eso significa que todavía no se conocen detalles como el formato del registro o las excepciones, pero la obligación de llevarlo de forma electrónica ya está en la ley.",
        ],
      },
      {
        titulo: "Qué debe tener un registro que cumpla",
        parrafos: ["Con lo que dice la ley hoy, el registro de cada persona debe:"],
        lista: [
          "Ser electrónico. La ley no habla de listas en papel ni de hojas llenadas a mano.",
          "Ser individual: la jornada de cada trabajador, no un total por área.",
          "Tener la hora de inicio y la de término de cada día.",
          "Estar disponible para entregarlo a la autoridad cuando lo pida.",
        ],
        cierre:
          "Un buen sistema también guarda cómo se hizo cada registro (por ejemplo, con reconocimiento facial y ubicación) y deja rastro de cualquier corrección, para que el registro sea confiable ante una inspección.",
      },
      {
        titulo: "Cuánto cuesta no cumplir",
        parrafos: [
          "La reforma agregó la fracción IV Bis al artículo 994 de la LFT: la multa por no cumplir la fracción XXXIV del artículo 132 va de 250 a 5,000 veces la Unidad de Medida y Actualización (UMA). Con la UMA diaria de 2026 ($117.31) eso equivale a entre $29,327.50 y $586,550. La UMA se actualiza cada año, así que el monto en pesos cambiará en 2027.",
          "El texto no aclara si la multa se calcula por cada trabajador sin registro o por infracción. Por prudencia, conviene suponer el escenario más caro.",
        ],
      },
      {
        titulo: "Qué hacer desde ahora",
        lista: [
          "Revisa cómo registras hoy la entrada y salida de cada persona y si ese registro es electrónico.",
          "Elige un sistema que guarde el registro individual, con fecha y hora, y que puedas exportar.",
          "Revisa tus horarios: en 2027 la jornada máxima baja a 46 horas por semana.",
          "Da seguimiento a la publicación de las disposiciones de la STPS.",
        ],
      },
    ],
    faq: [
      { p: "¿Desde cuándo es obligatorio el registro electrónico de la jornada?", r: "La obligación está en la LFT desde la reforma publicada el 1 de mayo de 2026. Las disposiciones de la STPS que la aterrizan rigen desde el 1 de enero de 2027." },
      { p: "¿Una lista en papel cumple?", r: "La ley pide que el registro sea electrónico. Una lista en papel no lo es; las reglas de la STPS precisarán los detalles." },
      { p: "¿De cuánto es la multa?", r: "De 250 a 5,000 UMA según el artículo 994, fracción IV Bis. Con la UMA de 2026, de $29,327.50 a $586,550." },
      { p: "¿La STPS ya publicó las reglas?", r: "A la fecha de esta revisión (noviembre de 2026), no. Este artículo se actualizará cuando se publiquen." },
    ],
    fuentes: [F.diputados, F.lexlatin, F.contribuyente, F.publimetro],
  },
  {
    slug: "multas-registro-jornada-laboral",
    titulo: "Multas por no registrar la jornada: de $29,327 a $586,550",
    descripcion:
      "La reforma a la LFT agregó la fracción IV Bis al artículo 994: multas de 250 a 5,000 UMA por no llevar el registro electrónico de la jornada. Cómo se calculan y qué no aclara la ley.",
    categoria: "Multas",
    fecha: "2026-11-21",
    lectura: "5 min",
    resumen: [
      "La multa va de 250 a 5,000 UMA (artículo 994, fracción IV Bis de la LFT).",
      "Con la UMA diaria de 2026 ($117.31): de $29,327.50 a $586,550.",
      "La ley no aclara si se multiplica por trabajador.",
    ],
    secciones: [
      {
        titulo: "La regla",
        parrafos: [
          "El decreto del 1 de mayo de 2026 agregó al artículo 994 de la Ley Federal del Trabajo la fracción IV Bis. Sanciona con multa de 250 a 5,000 UMA al patrón obligado que no cumpla con la fracción XXXIV del artículo 132, es decir, con el registro electrónico de la jornada de cada trabajador.",
        ],
      },
      {
        titulo: "Cuánto es en pesos",
        parrafos: [
          "La UMA es la unidad que se usa para calcular multas y obligaciones; su valor diario en 2026 es de $117.31. Con ese valor:",
        ],
        lista: ["Multa mínima: 250 × $117.31 = $29,327.50.", "Multa máxima: 5,000 × $117.31 = $586,550."],
        cierre: "El valor de la UMA se actualiza cada año, por lo que el monto en pesos de 2027 será distinto.",
      },
      {
        titulo: "Lo que la ley no aclara",
        parrafos: [
          "El texto no dice si la multa se aplica por cada trabajador sin registro o una sola vez por la infracción. Tampoco se conocen todavía los criterios de la STPS para el registro, porque sus disposiciones no se han publicado a la fecha de esta revisión.",
          "Mientras eso se define, lo más seguro es llevar desde ya un registro electrónico individual que puedas entregar en cualquier momento.",
        ],
      },
      {
        titulo: "Cómo evitar la multa",
        lista: [
          "Registra de forma electrónica la entrada y salida de cada persona, todos los días.",
          "Guarda el historial y la evidencia de cada registro y de cada corrección.",
          "Ten a la mano un reporte por trabajador y por periodo para entregarlo a la autoridad.",
        ],
      },
    ],
    faq: [
      { p: "¿Qué artículo establece la multa?", r: "El artículo 994, fracción IV Bis de la Ley Federal del Trabajo, agregado por la reforma publicada en el DOF el 1 de mayo de 2026." },
      { p: "¿La multa es por cada trabajador?", r: "La ley no lo aclara. Conviene tomar como referencia el escenario más caro hasta que haya criterios oficiales." },
      { p: "¿El monto cambia cada año?", r: "Sí. Se calcula en UMA y la UMA se actualiza cada año." },
    ],
    fuentes: [F.diputados, F.contribuyente, F.lexlatin],
  },
  {
    slug: "jornada-40-horas-calendario-2026-2030",
    titulo: "Jornada de 40 horas: calendario año por año (2026–2030)",
    descripcion:
      "La jornada máxima semanal baja de 48 a 40 horas de forma gradual. Cuántas horas aplican cada año y qué revisar en tus horarios desde 2027.",
    categoria: "Jornada laboral",
    fecha: "2026-11-21",
    lectura: "4 min",
    resumen: [
      "48 horas en 2026, 46 en 2027, 44 en 2028, 42 en 2029 y 40 en 2030.",
      "La reducción no debe disminuir sueldos ni prestaciones, según el decreto.",
      "El primer ajuste llega en 2027: revisa hoy los horarios de más de 46 horas.",
    ],
    secciones: [
      {
        titulo: "El calendario",
        parrafos: ["El artículo transitorio segundo del decreto del 1 de mayo de 2026 fija una reducción gradual de la jornada máxima semanal:"],
        lista: ["2026: 48 horas.", "2027: 46 horas.", "2028: 44 horas.", "2029: 42 horas.", "2030: 40 horas."],
      },
      {
        titulo: "Sin bajar sueldos",
        parrafos: [
          "Según el decreto, la reducción de la jornada no implica disminución de sueldos, salarios ni prestaciones. Es decir, la misma paga por menos horas.",
        ],
      },
      {
        titulo: "Qué revisar en tus horarios",
        lista: [
          "Turnos que hoy suman más de 46 horas por semana: tendrán que ajustarse en 2027.",
          "Horas extra: lo que pase del nuevo límite ordinario se paga como tiempo extra.",
          "Registro: desde 2027 la jornada debe registrarse de forma electrónica, lo que hará visible cualquier exceso.",
        ],
      },
    ],
    faq: [
      { p: "¿Cuándo llega la jornada de 40 horas?", r: "En 2030, después de una reducción gradual que empieza en 2027 con 46 horas." },
      { p: "¿Me pueden bajar el sueldo por trabajar menos horas?", r: "Según el decreto, la reducción no implica disminución de sueldos, salarios ni prestaciones." },
    ],
    fuentes: [F.diputados, F.gtlaw, F.taxtoday],
  },
  {
    slug: "horas-extra-reforma-2026",
    titulo: "Horas extra con la reforma: dobles, triples y nuevos topes",
    descripcion:
      "Cómo cambian las horas extra con la reforma a la LFT: tope semanal al doble por año, cuándo se pagan triples y los límites por día y por semana.",
    categoria: "Horas extra",
    fecha: "2026-11-21",
    lectura: "5 min",
    resumen: [
      "Al doble: hasta 9 h por semana en 2026 y 2027; 10 h en 2028, 11 h en 2029 y 12 h en 2030.",
      "Lo que pase de ese tope, hasta 4 horas más por semana, se paga triple.",
      "Máximo 4 horas extra por día, en no más de 4 días por semana.",
    ],
    secciones: [
      {
        titulo: "El tope semanal al doble",
        parrafos: ["Con la reforma a los artículos 66 y 68 de la LFT, las horas extra que se pagan al doble (100 % adicional) tienen un tope semanal que sube de forma gradual:"],
        lista: ["2026: 9 horas.", "2027: 9 horas.", "2028: 10 horas.", "2029: 11 horas.", "2030: 12 horas."],
      },
      {
        titulo: "Cuándo se pagan triples",
        parrafos: [
          "El tiempo que exceda el tope semanal se paga con 200 % adicional (horas triples) y no puede ser mayor a cuatro horas adicionales por semana.",
        ],
      },
      {
        titulo: "Límites por día y por semana",
        lista: [
          "No más de 4 horas extra en un mismo día.",
          "No más de 4 días con horas extra en una misma semana.",
          "La jornada ordinaria más la extra no debe pasar de 12 horas en un día.",
        ],
      },
      {
        titulo: "Cómo llevar el control",
        parrafos: [
          "Para pagar bien hay que saber, por semana y por persona, cuántas horas extra se trabajaron, cuántas caben al doble y cuántas pasan a triple. Un registro electrónico de la jornada, que además será obligatorio desde 2027, permite calcularlo sin hojas de cálculo.",
        ],
      },
    ],
    faq: [
      { p: "¿Cuántas horas extra al doble puedo pagar a la semana?", r: "9 horas en 2026 y 2027; el tope sube a 10, 11 y 12 horas en 2028, 2029 y 2030." },
      { p: "¿Cuándo se pagan triples?", r: "Cuando se rebasa el tope semanal al doble, hasta 4 horas adicionales por semana." },
      { p: "¿Cuántas horas extra se pueden trabajar en un día?", r: "No más de 4 horas extra en un mismo día, en no más de 4 días por semana." },
    ],
    fuentes: [F.diputados, F.kpmg, F.taxtoday, F.gtlaw],
  },
  {
    slug: "checklist-registro-jornada-2027",
    titulo: "Checklist: prepara tu empresa para el registro de jornada 2027",
    descripcion:
      "Lista práctica para cumplir con el registro electrónico de la jornada y la reducción de horas de la reforma a la LFT antes de enero de 2027.",
    categoria: "Guías",
    fecha: "2026-11-21",
    lectura: "4 min",
    resumen: [
      "Registro electrónico individual con entrada y salida.",
      "Horarios ajustados a 46 horas para 2027.",
      "Control semanal de horas extra con topes al doble y triple.",
    ],
    secciones: [
      {
        titulo: "1. Registro de la jornada",
        lista: [
          "Cada persona registra su entrada y salida de forma electrónica.",
          "El registro guarda fecha, hora y, de preferencia, cómo se hizo (rostro, ubicación, código).",
          "Las correcciones quedan con nombre, fecha y motivo.",
          "Puedes exportar un reporte por persona y por periodo para la autoridad.",
        ],
      },
      {
        titulo: "2. Horarios",
        lista: [
          "Ningún horario ordinario pasa de 46 horas por semana en 2027.",
          "Tienes un plan para bajar a 44, 42 y 40 horas en 2028, 2029 y 2030.",
        ],
      },
      {
        titulo: "3. Horas extra",
        lista: [
          "Solo se pagan las horas extra autorizadas.",
          "Se separan por semana las que van al doble y las que pasan a triple.",
          "Hay alertas cuando alguien pasa de 4 horas extra en un día o del tope semanal.",
        ],
      },
      {
        titulo: "4. Seguimiento",
        lista: [
          "Alguien de RH revisa cada semana quién va a pasar del límite.",
          "Das seguimiento a la publicación de las disposiciones de la STPS.",
        ],
      },
    ],
    faq: [
      { p: "¿Qué es lo más urgente antes de 2027?", r: "Tener un registro electrónico individual de la jornada y revisar los horarios que pasan de 46 horas por semana." },
    ],
    fuentes: [F.diputados, F.lexlatin, F.publimetro],
  },
];

export function articuloPorSlug(slug) {
  return ARTICULOS.find((a) => a.slug === slug) || null;
}

export function fechaLarga(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${d} de ${meses[m - 1]} de ${y}`;
}

// Dominio público del sitio (producción por omisión). En dev, robots.js bloquea la indexación.
export const SITIO = (process.env.NEXT_PUBLIC_RUTA_DOMAIN || "https://adamia.com.mx").replace(/\/$/, "");
