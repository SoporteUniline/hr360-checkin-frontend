// Clima y NOM-035 en el navegador (lógica pura, sin React ni red; probada en scripts/test-clima.mjs).
// El servidor califica, aplica el mínimo de 5 y decide qué se muestra: aquí solo se arma lo que la pantalla necesita.

export const MINIMO = 5;

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

// Color del mapa de calor (0 a 10): rojo < 6, ámbar < 7.5, verde a partir de 7.5.
export function colorCalor(v) {
  if (v === null || v === undefined) return "bg-slate-100 text-slate-400";
  if (v < 6) return "bg-red-100 text-red-800";
  if (v < 7.5) return "bg-amber-100 text-amber-900";
  return "bg-green-100 text-green-800";
}

export const fmtEnps = (v) => (v === null || v === undefined ? "—" : v > 0 ? `+${v}` : String(v));
export const fmtUno = (v) =>
  v === null || v === undefined ? "—" : Number(v).toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
// Cambio contra la medición anterior: décimas en calificaciones, puntos enteros en porcentajes.
export function fmtDelta(d, { puntos = false } = {}) {
  if (d === null || d === undefined) return null;
  const v = (x) => (puntos ? `${Math.round(x)} pts` : fmtUno(x));
  if (d > 0) return { texto: `▲ ${v(d)}`, tono: "text-green-700" };
  if (d < 0) return { texto: `▼ ${v(Math.abs(d))}`, tono: "text-red-700" };
  return { texto: "= sin cambio", tono: "text-slate-500" };
}

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

// ───────── mapa de calor ─────────
// Filas: toda la empresa y los grupos que el servidor dejó ver (5+). Columnas: dimensiones.
export function mapaCalor(clima) {
  if (!clima?.suficiente) return { columnas: [], filas: [] };
  const columnas = clima.dimensiones.map((d) => ({ clave: d.clave, nombre: d.nombre }));
  const fila = (nombre, n, dims, general) => ({
    nombre,
    n,
    general,
    celdas: columnas.map((c) => dims.find((d) => d.clave === c.clave)?.valor ?? null),
  });
  return {
    columnas,
    filas: [
      ...clima.grupos.map((g) => fila(g.nombre, g.n, g.dimensiones, g.general)),
      fila("Toda la empresa", clima.respuestas, clima.dimensiones, clima.general),
    ],
  };
}

// Las 3 combinaciones grupo · dimensión más bajas («Dónde poner atención» del celular).
export function atencion(clima, n = 3) {
  const { columnas, filas } = mapaCalor(clima);
  const lista = filas
    .flatMap((f) => f.celdas.map((v, i) => ({ grupo: f.nombre, dimension: columnas[i].nombre, valor: v })))
    .filter((x) => x.valor !== null);
  return lista.sort((a, b) => a.valor - b.valor).slice(0, n);
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
