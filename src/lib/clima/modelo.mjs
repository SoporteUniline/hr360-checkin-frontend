// Clima y NOM-035 en el navegador (lógica pura, sin React ni red; probada en scripts/test-clima.mjs).
// El servidor califica, aplica el mínimo de cada tipo y decide qué se muestra: aquí solo se arma lo que la pantalla necesita.

// Mínimos (decisión del dueño, 25/11/2026): clima muestra resultados desde 1 respuesta; la NOM-035 (Guías II y III)
// conserva el mínimo de 5 que pide la norma. Son constantes separadas a propósito.
export const MINIMO_NOM035 = 5;
// Aviso honesto al contestar clima: la respuesta no lleva nombre, pero en equipos pequeños se puede deducir quién fue.
export const AVISO_PRIVACIDAD_CLIMA = "Tus respuestas no llevan tu nombre. En equipos pequeños, RH podría deducir quién contestó.";
// Nota para quienes ya contestaron con la regla anterior (se mostraba solo en grupos de 5 o más).
export const AVISO_CAMBIO_MINIMO = "Cambio: los resultados de las encuestas de clima se ven aunque respondan pocas personas.";

export const NIVELES = Object.freeze({
  nulo: { texto: "Nulo", largo: "Nulo o despreciable", fondo: "bg-sky-100", tinta: "text-sky-800", punto: "bg-sky-500" },
  bajo: { texto: "Bajo", largo: "Bajo", fondo: "bg-green-100", tinta: "text-green-800", punto: "bg-green-500" },
  medio: { texto: "Medio", largo: "Medio", fondo: "bg-amber-100", tinta: "text-amber-900", punto: "bg-amber-400" },
  alto: { texto: "Alto", largo: "Alto", fondo: "bg-orange-100", tinta: "text-orange-900", punto: "bg-orange-500" },
  muy_alto: { texto: "Muy alto", largo: "Muy alto", fondo: "bg-red-100", tinta: "text-red-800", punto: "bg-red-600" },
});
export const ORDEN_NIVELES = ["nulo", "bajo", "medio", "alto", "muy_alto"];

export const TIPOS = Object.freeze({
  escala: "Escala 1–5",
  sino: "Sí / No",
  enps: "eNPS 0–10",
  opcion: "Opción",
  abierta: "Abierta",
});

export const ESCALA = Object.freeze([
  { valor: 1, texto: "Totalmente en desacuerdo" },
  { valor: 2, texto: "En desacuerdo" },
  { valor: 3, texto: "Ni de acuerdo ni en desacuerdo" },
  { valor: 4, texto: "De acuerdo" },
  { valor: 5, texto: "Totalmente de acuerdo" },
]);

export const fmtEnps = (v) => (v === null || v === undefined ? "—" : v > 0 ? `+${v}` : String(v));
export const fmtUno = (v) =>
  v === null || v === undefined ? "—" : Number(v).toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export function fechaCorta(f) {
  if (!f) return "";
  const [, m, d] = String(f).slice(0, 10).split("-").map(Number);
  return `${d} ${MESES[m - 1]}`;
}

export const ESTADOS = Object.freeze({
  borrador: { texto: "Borrador", clase: "bg-slate-100 text-slate-700" },
  programada: { texto: "Programada", clase: "bg-violet-100 text-violet-800" },
  activa: { texto: "Abierta", clase: "bg-blue-100 text-blue-800" },
  cerrada: { texto: "Cerrada", clase: "bg-green-100 text-green-800" },
});

// ───────── dashboard de resultados (diseño aprobado 25/11/2026) ─────────
// El servidor calcula % favorable, confianza, participación por grupo, lectura por reglas, comparación, evolución y el
// seguimiento del plan. Aquí solo se traduce a lo que dibuja la pantalla (anchos, textos, colores), sin recalcular datos.

// Colores de la maqueta (Main.dc.html). Texto sobre blanco con contraste de 4.5:1 o más.
export const COLOR = Object.freeze({
  favorable: "#16A34A",
  neutral: "#CBD5E1",
  desfavorable: "#DC2626",
  ambar: "#F59E0B",
  pista: "#E2E8F0",
  textoVerde: "#15803D",
  textoAmbar: "#92400E",
  textoRojo: "#B91C1C",
});
export const CONFIANZA_MINIMA = 10;
export const META_PARTICIPACION = 70;

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// Mismo texto que el aviso del PDF (servidor: resultados.textoConfianza).
export function textoConfianza(n, confianza = n >= CONFIANZA_MINIMA ? "confiable" : "senal") {
  const resp = plural(n, "respuesta", "respuestas");
  if (confianza === "confiable")
    return {
      titulo: `Con ${resp}, la lectura es confiable.`,
      detalle: "Aun así, diferencias de pocos puntos entre dimensiones pueden ser ruido: fíjate en las que se separan 10 puntos o más.",
    };
  return {
    titulo: `Con ${resp}, lee esto como una señal, no como una medición firme.`,
    detalle: `Diferencias de menos de 15 puntos entre dimensiones pueden ser una sola persona. Con ${CONFIANZA_MINIMA} o más respuestas el aviso cambia a «confiable».`,
  };
}

// Segmentos de una barra apilada favorable / neutral / desfavorable (solo los que tienen ancho) y su texto accesible.
export function segmentosFavorabilidad(f) {
  if (!f) return [];
  return [
    { clave: "favorable", pct: f.favorable, color: COLOR.favorable },
    { clave: "neutral", pct: f.neutral, color: COLOR.neutral },
    { clave: "desfavorable", pct: f.desfavorable, color: COLOR.desfavorable },
  ].filter((x) => x.pct > 0);
}
export const etiquetaFavorabilidad = (f) =>
  f ? `${f.favorable} % favorable, ${f.neutral} % neutral, ${f.desfavorable} % desfavorable` : "Sin respuestas";

// eNPS: detractores · pasivos · promotores.
export function segmentosEnps(e) {
  if (!e) return [];
  return [
    { clave: "detractores", pct: e.detractores, color: COLOR.desfavorable },
    { clave: "pasivos", pct: e.pasivos, color: COLOR.neutral },
    { clave: "promotores", pct: e.promotores, color: COLOR.favorable },
  ].filter((x) => x.pct > 0);
}
export function detalleEnps(e) {
  if (!e) return "Sin pregunta de recomendación";
  const k = e.conteo;
  if (!k) return `${e.promotores} % promotores · ${e.pasivos} % pasivos · ${e.detractores} % detractores`;
  return `${plural(k.promotores, "promotor", "promotores")} · ${plural(k.pasivos, "pasivo", "pasivos")} · ${plural(k.detractores, "detractor", "detractores")}`;
}
export const tonoEnps = (v) => (v === null || v === undefined ? "#0F172A" : v > 0 ? COLOR.textoVerde : v < 0 ? COLOR.textoRojo : "#0F172A");

// Barra divergente contra el promedio de la empresa: 20 puntos llenan media columna (40 % del ancho), así la etiqueta
// siempre cabe dentro de la columna.
export function divergente(favorable, promedio, { escala = 20, maximo = 40 } = {}) {
  if (favorable === null || favorable === undefined || promedio === null || promedio === undefined) return null;
  const dif = favorable - promedio;
  return {
    dif,
    positivo: dif >= 0,
    ancho: Math.min((Math.abs(dif) / escala) * maximo, maximo),
    texto: dif > 0 ? `+${dif}` : dif < 0 ? `−${Math.abs(dif)}` : "±0",
    aria: dif === 0 ? "igual que la empresa" : `${Math.abs(dif)} ${Math.abs(dif) === 1 ? "punto" : "puntos"} ${dif > 0 ? "sobre" : "bajo"} la empresa`,
  };
}

// «vs. anterior»: ▲ / ▼ con puntos, o «—» si es la primera medición o la dimensión no existía.
export function vsAnterior(delta) {
  if (delta === null || delta === undefined) return { texto: "—", tono: "#475569", aria: "sin medición anterior" };
  if (delta === 0) return { texto: "= 0", tono: "#475569", aria: "igual que la anterior" };
  const pts = plural(Math.abs(delta), "punto", "puntos");
  return delta > 0
    ? { texto: `▲ ${Math.abs(delta)}`, tono: COLOR.textoVerde, aria: `subió ${pts}` }
    : { texto: `▼ ${Math.abs(delta)}`, tono: COLOR.textoRojo, aria: `bajó ${pts}` };
}

// Filas de la tabla de dimensiones: barra, % favorable, contra la empresa y contra la anterior.
export function filasDimensiones(clima, comparacion = null) {
  const prom = clima?.favorabilidad?.favorable ?? null;
  const previas = new Map((comparacion?.dimensiones ?? []).map((d) => [d.clave, d]));
  return (clima?.dimensiones ?? []).map((d) => ({
    clave: d.clave,
    nombre: d.nombre,
    favorabilidad: d.favorabilidad,
    favorable: d.favorabilidad?.favorable ?? null,
    contraEmpresa: divergente(d.favorabilidad?.favorable, prom),
    anterior: vsAnterior(comparacion ? previas.get(d.clave)?.favorable ?? null : null),
  }));
}

// Anillo SVG de participación (r en unidades del viewBox).
export function anillo(pct, r = 34) {
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  return { circunferencia: Number(c.toFixed(1)), lleno: Number(((c * p) / 100).toFixed(1)), pct: p };
}

export function textoParticipacion(contestadas, invitados) {
  const pct = invitados ? Math.round((contestadas / invitados) * 100) : 0;
  const faltan = Math.max(0, (invitados ?? 0) - (contestadas ?? 0));
  if (pct >= META_PARTICIPACION) return { texto: `Arriba de la meta de ${META_PARTICIPACION} %`, tono: COLOR.textoVerde, color: COLOR.favorable };
  return {
    texto: `Bajo la meta de ${META_PARTICIPACION} %${faltan ? ` · ${faltan === 1 ? "faltó 1" : `faltaron ${faltan}`}` : ""}`,
    tono: COLOR.textoAmbar,
    color: COLOR.ambar,
  };
}

// Pregunta por pregunta: de la más favorable a la menos (empate: orden de la encuesta), solo con respuestas.
export function preguntasOrdenadas(preguntas) {
  return (preguntas ?? [])
    .map((q, i) => ({ q, i }))
    .filter((x) => x.q.favorabilidad)
    .sort((a, b) => b.q.favorabilidad.favorable - a.q.favorabilidad.favorable || a.i - b.i)
    .map((x) => x.q);
}

// Mapa de % favorable por área (o jefe) y dimensión: solo con 2 grupos o más.
export function mapaFavorable(clima) {
  if (!clima?.suficiente || (clima.grupos ?? []).length < 2) return null;
  const columnas = clima.dimensiones.map((d) => ({ clave: d.clave, nombre: d.nombre }));
  const fila = (nombre, n, total, dims) => ({
    nombre,
    n,
    total: total?.favorable ?? null,
    celdas: columnas.map((c) => dims.find((d) => d.clave === c.clave)?.favorabilidad?.favorable ?? null),
  });
  return {
    columnas,
    filas: [
      ...clima.grupos.map((g) => fila(g.nombre, g.n, g.favorabilidad, g.dimensiones)),
      fila("Toda la empresa", clima.respuestas, clima.favorabilidad, clima.dimensiones),
    ],
  };
}
// Color de una celda del mapa (% favorable): verde 75+, ámbar 60–74, rojo < 60.
export function colorFavorable(v) {
  if (v === null || v === undefined) return "bg-slate-100 text-slate-500";
  if (v >= 75) return "bg-green-100 text-green-900";
  if (v >= 60) return "bg-amber-100 text-amber-900";
  return "bg-red-100 text-red-900";
}

// Comentarios: total y vista corta (las primeras `porPregunta` de cada pregunta).
export function resumenComentarios(comentarios, porPregunta = 2) {
  const con = (comentarios ?? []).filter((q) => q.respuestas?.length);
  const total = con.reduce((s, q) => s + q.respuestas.length, 0);
  return { total, grupos: con.map((q) => ({ ...q, visibles: q.respuestas.slice(0, porPregunta), resto: Math.max(0, q.respuestas.length - porPregunta) })) };
}

// Evolución: línea SVG con 2 mediciones o más con % favorable. Eje Y de 0 a 100.
// Margen derecho de 24: la etiqueta del último mes (centrada en su punto) no se corta.
export function lineaEvolucion(puntos, { ancho = 320, alto = 140, margen = { izq: 34, der: 24, arr: 14, aba: 28 } } = {}) {
  const ps = (puntos ?? []).filter((p) => p.favorable !== null && p.favorable !== undefined);
  if (ps.length < 2) return null;
  const w = ancho - margen.izq - margen.der;
  const h = alto - margen.arr - margen.aba;
  const xy = ps.map((p, i) => ({
    ...p,
    x: Number((margen.izq + (ps.length === 1 ? w / 2 : (w * i) / (ps.length - 1))).toFixed(1)),
    y: Number((margen.arr + h - (h * p.favorable) / 100).toFixed(1)),
    etiqueta: fechaMes(p.cierra_el),
  }));
  return {
    ancho,
    alto,
    margen,
    puntos: xy,
    d: xy.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" "),
    guias: [0, 50, 100].map((v) => ({ v, y: Number((margen.arr + h - (h * v) / 100).toFixed(1)) })),
    aria: `Evolución del % favorable: ${xy.map((p) => `${p.etiqueta} ${p.favorable} %`).join(", ")}`,
  };
}

const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export function fechaMes(f) {
  if (!f) return "";
  const [a, m] = String(f).slice(0, 10).split("-").map(Number);
  return `${MESES[m - 1]} ${String(a).slice(2)}`;
}
// Sugerencia para repetir la medición: 6 meses después del cierre («mayo 2027»).
export function sugerenciaSiguiente(cierra) {
  if (!cierra) return null;
  const [a, m] = String(cierra).slice(0, 10).split("-").map(Number);
  const t = a * 12 + (m - 1) + 6;
  return `${MESES_LARGOS[t % 12]} ${Math.floor(t / 12)}`;
}

// ───────── plan de acción ─────────
export const ESTADOS_ACCION = Object.freeze({
  pendiente: { texto: "Pendiente", clase: "bg-slate-100 text-slate-700" },
  en_curso: { texto: "En curso", clase: "bg-blue-100 text-blue-800" },
  lograda: { texto: "Lograda", clase: "bg-green-100 text-green-800" },
  no_lograda: { texto: "No lograda", clase: "bg-red-100 text-red-800" },
});
export const resumenPlan = (acciones) => {
  const n = acciones?.length ?? 0;
  return n ? `${(acciones ?? []).filter((a) => a.estado === "lograda").length} de ${n} logradas` : "";
};
export function fechaLarga(f) {
  if (!f) return "Sin fecha";
  const [a, m, d] = String(f).slice(0, 10).split("-").map(Number);
  return `${d} ${MESES[m - 1]} ${a}`;
}
// Texto del seguimiento de una acción (lo calcula el servidor al leer; no se guarda).
export function textoSeguimiento(accion, nombreDimension) {
  const s = accion?.seguimiento;
  const dim = nombreDimension || "su dimensión";
  if (!accion?.dimension) return { texto: "Acción general: no se liga a una dimensión.", tono: "#475569" };
  if (!s) return { texto: `Se revisa sola en la próxima encuesta: si ${dim} sube, lo verás aquí.`, tono: "#475569" };
  if (s.subio) return { texto: `▲ ${dim} subió de ${s.antes} % a ${s.despues} % en «${s.medicion.nombre}».`, tono: COLOR.textoVerde };
  if (s.delta < 0) return { texto: `▼ ${dim} bajó de ${s.antes} % a ${s.despues} % en «${s.medicion.nombre}».`, tono: COLOR.textoRojo };
  return { texto: `${dim} se quedó en ${s.despues} % en «${s.medicion.nombre}».`, tono: "#475569" };
}
// Validación en el navegador (el servidor valida de nuevo): texto, responsable y fecha obligatorios.
export function erroresAccion(a) {
  const e = {};
  const t = String(a?.texto ?? "").trim();
  if (t.length < 3) e.texto = "Escribe qué se va a hacer.";
  else if (t.length > 300) e.texto = "Máximo 300 caracteres.";
  if (!a?.id_responsable) e.id_responsable = "Elige a la persona responsable.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(a?.fecha_limite ?? ""))) e.fecha_limite = "Elige la fecha límite.";
  return e;
}

// ───────── contestar: una pregunta por pantalla ─────────
// r: respuestas en curso, por id de paso. Pasos de clima: «q:<clave>». NOM-035: «g1:<sección>:<i>», «f:<filtro>», «i:<n>».
export function pasosEncuesta(encuesta, r = {}) {
  if (!encuesta) return [];
  if (encuesta.tipo !== "nom035") {
    return (encuesta.secciones ?? []).flatMap((s) =>
      s.preguntas.map((p) => ({ id: `q:${p.clave}`, tipo: p.tipo, seccion: s.titulo, pregunta: p }))
    );
  }
  const pasos = [];
  for (const c of encuesta.cuestionarios ?? []) {
    if (c.clave === "I") {
      const [I, ...resto] = c.secciones;
      I.reactivos.forEach((t, i) => pasos.push({ id: `g1:I:${i}`, tipo: "sino", seccion: I.titulo, encabezado: I.encabezado, texto: t }));
      const algunSi = I.reactivos.some((_, i) => r[`g1:I:${i}`] === "si");
      if (algunSi) {
        for (const s of resto)
          s.reactivos.forEach((t, i) => pasos.push({ id: `g1:${s.clave}:${i}`, tipo: "sino", seccion: s.titulo, texto: t }));
      }
      continue;
    }
    for (const s of c.secciones) {
      if (s.condicion) {
        pasos.push({
          id: `f:${s.condicion.clave}`,
          tipo: "sino",
          seccion: "Para terminar",
          texto: s.condicion.pregunta,
          ayuda: s.condicion.instruccion,
        });
        if (r[`f:${s.condicion.clave}`] !== "si") continue;
      }
      s.items.forEach((it) =>
        pasos.push({ id: `i:${it.numero}`, tipo: "frecuencia", seccion: s.intro, numero: it.numero, texto: it.texto, opciones: c.opciones })
      );
    }
  }
  return pasos;
}

export function respondido(paso, r) {
  const v = r?.[paso.id];
  if (paso.tipo === "abierta" || paso.pregunta?.requerida === false) return true;
  return v !== undefined && v !== null && v !== "";
}

export const avance = (pasos, r) => (pasos.length ? Math.round((pasos.filter((p) => respondido(p, r)).length / pasos.length) * 100) : 0);
export const primeroSinResponder = (pasos, r) =>
  Math.max(
    0,
    pasos.findIndex((p) => !respondido(p, r))
  );

// Cuerpo que espera el servidor (POST …/respuestas).
export function armarRespuesta(encuesta, r) {
  if (encuesta.tipo !== "nom035") {
    const respuestas = {};
    for (const p of pasosEncuesta(encuesta, r)) {
      const v = r[p.id];
      if (v === undefined || v === null || v === "") continue;
      respuestas[p.pregunta.clave] = p.tipo === "abierta" ? String(v) : v;
    }
    return { respuestas };
  }
  const cuerpo = {};
  const g1 = (encuesta.cuestionarios ?? []).find((c) => c.clave === "I");
  if (g1) {
    cuerpo.guia1 = Object.fromEntries(g1.secciones.map((s) => [s.clave, s.reactivos.map((_, i) => r[`g1:${s.clave}:${i}`] ?? "no")]));
    if (!cuerpo.guia1.I.includes("si")) cuerpo.guia1 = { I: cuerpo.guia1.I };
  }
  const principal = (encuesta.cuestionarios ?? []).find((c) => c.clave !== "I");
  if (principal) {
    const items = {};
    for (const p of pasosEncuesta(encuesta, r)) if (p.id.startsWith("i:") && r[p.id]) items[String(p.numero)] = r[p.id];
    cuerpo.guia = { filtros: { clientes: r["f:clientes"] === "si", jefe: r["f:jefe"] === "si" }, items };
  }
  return cuerpo;
}

// El progreso se guarda en el teléfono (no en el servidor) para no dejar respuestas ligadas a la persona.
export const llaveBorrador = (idCampania, token = null) =>
  `adamia-clima-borrador:${token ? `liga:${String(token).slice(0, 12)}` : idCampania}`;

// ───────── editor ─────────
let consecutivo = 0;
const claveNueva = () => `n${Date.now().toString(36)}${(consecutivo++).toString(36)}`;

export function nuevaPregunta(tipo = "escala", texto = "") {
  const p = { clave: claveNueva(), tipo, texto, dimension: null, requerida: tipo !== "abierta" };
  if (tipo === "opcion")
    p.opciones = [
      { valor: "o1", texto: "Opción 1" },
      { valor: "o2", texto: "Opción 2" },
    ];
  return p;
}

export const preguntasDe = (def) => (def?.secciones ?? []).flatMap((s) => s.preguntas ?? []);

export const textoMinutos = (n) => (n === 1 ? "1 minuto" : `${n} minutos`);

export function minutosEstimados(def) {
  const s = preguntasDe(def).reduce((t, q) => t + (q.tipo === "abierta" ? 45 : q.tipo === "opcion" ? 15 : 10), 0);
  return Math.max(1, Math.round(s / 60));
}

const copia = (def) => JSON.parse(JSON.stringify(def));

export function cambiarPregunta(def, clave, cambios) {
  const d = copia(def);
  for (const s of d.secciones)
    for (const [i, q] of s.preguntas.entries())
      if (q.clave === clave) {
        s.preguntas[i] = { ...q, ...cambios };
        if (cambios.tipo === "opcion" && !s.preguntas[i].opciones) s.preguntas[i].opciones = nuevaPregunta("opcion").opciones;
        if (cambios.tipo && cambios.tipo !== "opcion") delete s.preguntas[i].opciones;
        if (cambios.tipo === "abierta") s.preguntas[i].requerida = false;
      }
  return d;
}

export function quitarPregunta(def, clave) {
  const d = copia(def);
  for (const s of d.secciones) s.preguntas = s.preguntas.filter((q) => q.clave !== clave);
  return d;
}

export function moverPregunta(def, clave, paso) {
  const d = copia(def);
  for (const s of d.secciones) {
    const i = s.preguntas.findIndex((q) => q.clave === clave);
    const j = i + paso;
    if (i >= 0 && j >= 0 && j < s.preguntas.length) [s.preguntas[i], s.preguntas[j]] = [s.preguntas[j], s.preguntas[i]];
  }
  return d;
}

export function agregarPregunta(def, indiceSeccion, pregunta) {
  const d = copia(def);
  if (!d.secciones.length) d.secciones.push({ clave: "s1", titulo: "Sección 1", preguntas: [] });
  d.secciones[Math.min(indiceSeccion, d.secciones.length - 1)].preguntas.push(pregunta);
  return d;
}

export function agregarSeccion(def) {
  const d = copia(def);
  d.secciones.push({
    clave: `s${d.secciones.length + 1}${Date.now().toString(36)}`,
    titulo: `Sección ${d.secciones.length + 1}`,
    preguntas: [],
  });
  return d;
}

// Propuesta de Adamia AI: la pregunta se reemplaza por las 1 o 2 preguntas propuestas.
export function aplicarPropuesta(def, clave, textos) {
  const d = copia(def);
  for (const s of d.secciones) {
    const i = s.preguntas.findIndex((q) => q.clave === clave);
    if (i < 0) continue;
    const base = s.preguntas[i];
    // Las propuestas son afirmaciones: una pregunta sí/no pasa a escala 1–5.
    const tipo = base.tipo === "sino" ? "escala" : base.tipo;
    const nuevas = textos.map((t, k) => {
      const q = { ...base, clave: k ? claveNueva() : base.clave, tipo, texto: t };
      if (tipo !== "opcion") delete q.opciones;
      return q;
    });
    s.preguntas.splice(i, 1, ...nuevas);
  }
  return d;
}

// ───────── destinatarios ─────────
export function resumenDestinatarios(f, puestos = []) {
  if (!f || f.modo === "todos") return ["Toda la empresa"];
  if (f.modo === "personas") return [`${f.personas?.length ?? 0} personas elegidas`];
  const chips = [];
  for (const a of f.areas ?? []) chips.push(`Área: ${a}`);
  for (const p of f.puestos ?? []) chips.push(`Puesto: ${puestos.find((x) => x.id === p)?.nombre ?? p}`);
  const { minMeses, maxMeses } = f.antiguedad ?? {};
  if (maxMeses != null && minMeses == null) chips.push(`Antigüedad: menos de ${maxMeses} meses`);
  else if (minMeses != null && maxMeses == null) chips.push(`Antigüedad: ${minMeses} meses o más`);
  else if (minMeses != null && maxMeses != null) chips.push(`Antigüedad: de ${minMeses} a ${maxMeses} meses`);
  return chips.length ? chips : ["Toda la empresa"];
}

export const ANTIGUEDADES = Object.freeze([
  { clave: "", texto: "Cualquier antigüedad", minMeses: null, maxMeses: null },
  { clave: "lt3", texto: "Menos de 3 meses", minMeses: null, maxMeses: 3 },
  { clave: "lt6", texto: "Menos de 6 meses", minMeses: null, maxMeses: 6 },
  { clave: "6a12", texto: "De 6 a 12 meses", minMeses: 6, maxMeses: 12 },
  { clave: "1a3", texto: "De 1 a 3 años", minMeses: 12, maxMeses: 36 },
  { clave: "gt3", texto: "Más de 3 años", minMeses: 36, maxMeses: null },
]);
export const claveAntiguedad = (a) =>
  ANTIGUEDADES.find((x) => x.minMeses === (a?.minMeses ?? null) && x.maxMeses === (a?.maxMeses ?? null))?.clave ?? "";

export const masDias = (f, d) => {
  const x = new Date(`${f}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + d);
  return x.toISOString().slice(0, 10);
};
