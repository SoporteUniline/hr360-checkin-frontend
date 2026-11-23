// Preguntas de checklist (23/11/2026, pedido del dueño: «que puedan configurar sus datos: sí/no, opciones, más de una,
// cuánto valen; muy fácil de crear, llenar y calificar»). Funciones puras; pruebas en scripts/test-tareas.mjs.
//
// Pregunta: { id, texto, tipo, peso, obligatoria, permiteNA, pideFoto, ...config del tipo }
//   si_no     { correcta: "si" | "no" }                 Sí/No: la respuesta buena vale 100 %, la otra 0 %.
//   opcion    { opciones: [{ id, texto, valor }] }       Una opción: vale el % de la opción elegida.
//   multiple  { opciones: [{ id, texto, valor }] }       Varias: suma el % de las elegidas, hasta 100 %.
//   numero    { min, max, unidad }                       Número: 100 % si está dentro del rango, si no 0 %.
//   foto      {}                                         Foto: 100 % si la sube.
//   texto, texto_largo, fecha, fecha_hora                Solo registran (no se califican): p. ej. «Fecha de caducidad».
// Respuesta: { valor, na } — valor: "si"|"no" · id de opción · [ids] · número · url de foto · texto · "AAAA-MM-DD" ·
// "AAAA-MM-DDTHH:MM". na: «No aplica».

// califica: true = cuenta en el %; false = solo registra el dato.
export const TIPOS = [
  { clave: "si_no", texto: "Sí / No", ayuda: "La buena vale 100 %", califica: true },
  { clave: "opcion", texto: "Una opción", ayuda: "Lista: elige una; cada opción vale un %", califica: true },
  { clave: "multiple", texto: "Varias opciones", ayuda: "Lista: elige varias; suma su %, hasta 100 %", califica: true },
  { clave: "numero", texto: "Número", ayuda: "Bien si está en el rango", califica: true },
  { clave: "foto", texto: "Foto", ayuda: "Bien si la sube", califica: true },
  { clave: "texto", texto: "Texto corto", ayuda: "Una línea: un nombre, un folio", califica: false },
  { clave: "texto_largo", texto: "Texto largo", ayuda: "Párrafo: observaciones", califica: false },
  { clave: "fecha", texto: "Fecha", ayuda: "P. ej. fecha de caducidad", califica: false },
  { clave: "fecha_hora", texto: "Fecha y hora", ayuda: "P. ej. cuándo llegó el proveedor", califica: false },
];

// Opciones listas para no empezar de cero.
export const OPCIONES_RAPIDAS = [
  { nombre: "Limpia · Regular · Sucia", opciones: [["Limpia", 100], ["Regular", 50], ["Sucia", 0]] },
  { nombre: "Bueno · Regular · Malo", opciones: [["Bueno", 100], ["Regular", 50], ["Malo", 0]] },
  { nombre: "Completo · Incompleto · No hay", opciones: [["Completo", 100], ["Incompleto", 50], ["No hay", 0]] },
  { nombre: "Excelente a Muy mal (5)", opciones: [["Excelente", 100], ["Bien", 75], ["Regular", 50], ["Mal", 25], ["Muy mal", 0]] },
];

export const esCalificable = (p) => TIPOS.find((t) => t.clave === p.tipo)?.califica ?? false;
const peso = (p) => (Number(p.peso) > 0 ? Number(p.peso) : 1);
const vacia = (r) => r == null || r.valor == null || r.valor === "" || (Array.isArray(r.valor) && !r.valor.length);

// Puntaje de UNA pregunta: 0–100, o null si no cuenta (texto, o «no aplica» permitido).
export function puntajePregunta(p, r) {
  if (!esCalificable(p)) return null;
  if (r?.na && p.permiteNA) return null;
  if (vacia(r)) return 0;
  switch (p.tipo) {
    case "si_no": return r.valor === (p.correcta ?? "si") ? 100 : 0;
    case "opcion": return Number(p.opciones?.find((o) => o.id === r.valor)?.valor) || 0;
    case "multiple": {
      const elegidas = new Set(r.valor);
      return Math.min(100, (p.opciones ?? []).filter((o) => elegidas.has(o.id)).reduce((s, o) => s + (Number(o.valor) || 0), 0));
    }
    case "numero": {
      const n = Number(r.valor);
      if (!Number.isFinite(n)) return 0;
      const min = p.min === "" || p.min == null ? -Infinity : Number(p.min);
      const max = p.max === "" || p.max == null ? Infinity : Number(p.max);
      return n >= min && n <= max ? 100 : 0;
    }
    case "foto": return 100;
    default: return 0;
  }
}

// Calificación del checklist: promedio ponderado por peso de las preguntas que cuentan. null si ninguna cuenta.
export function calificarRespuestas(preguntas = [], respuestas = {}) {
  let total = 0;
  let suma = 0;
  for (const p of preguntas) {
    const v = puntajePregunta(p, respuestas[p.id]);
    if (v == null) continue;
    total += peso(p);
    suma += (v / 100) * peso(p);
  }
  return total ? Math.round((suma / total) * 1000) / 10 : null;
}

// Cuánto vale cada pregunta del total (en %) — para mostrarlo al crear el checklist.
export function valorDePregunta(preguntas, p) {
  const total = preguntas.filter(esCalificable).reduce((s, x) => s + peso(x), 0);
  return esCalificable(p) && total ? Math.round((peso(p) / total) * 1000) / 10 : null;
}

// Validación al CREAR: devuelve una lista de problemas por pregunta ({ id, error }) para mostrarlos junto a cada una.
export function problemasChecklist(nombre, preguntas = []) {
  const problemas = [];
  if (!String(nombre ?? "").trim()) problemas.push({ id: null, error: "Ponle nombre al checklist." });
  if (!preguntas.length) problemas.push({ id: null, error: "Agrega al menos una pregunta." });
  for (const p of preguntas) {
    if (!String(p.texto ?? "").trim()) { problemas.push({ id: p.id, error: "Escribe la pregunta." }); continue; }
    if (p.tipo === "opcion" || p.tipo === "multiple") {
      const ops = p.opciones ?? [];
      if (ops.length < 2) problemas.push({ id: p.id, error: "Pon al menos 2 opciones." });
      else if (ops.some((o) => !String(o.texto ?? "").trim())) problemas.push({ id: p.id, error: "Hay una opción sin texto." });
      else if (ops.some((o) => !(Number(o.valor) >= 0 && Number(o.valor) <= 100))) problemas.push({ id: p.id, error: "Cada opción vale de 0 a 100 %." });
      else if (p.tipo === "opcion" && !ops.some((o) => Number(o.valor) === 100)) problemas.push({ id: p.id, error: "Alguna opción debe valer 100 % (la respuesta ideal)." });
      else if (p.tipo === "multiple" && ops.reduce((s, o) => s + Number(o.valor || 0), 0) < 100) problemas.push({ id: p.id, error: "Las opciones juntas deben sumar al menos 100 %." });
    }
    if (p.tipo === "numero" && p.min !== "" && p.max !== "" && p.min != null && p.max != null && Number(p.min) > Number(p.max)) problemas.push({ id: p.id, error: "El mínimo es mayor que el máximo." });
  }
  if (preguntas.length && !preguntas.some(esCalificable)) problemas.push({ id: null, error: "Agrega al menos una pregunta que se califique (no solo textos o fechas)." });
  return problemas;
}

// ¿Puede la persona enviar? Obligatorias contestadas (o «no aplica» si se permite) y foto de evidencia donde se pide.
export function motivoNoEnviar(checklist, respuestas = {}) {
  let sinContestar = 0;
  let sinFoto = 0;
  for (const p of checklist.preguntas) {
    const r = respuestas[p.id];
    const na = r?.na && p.permiteNA;
    if (p.obligatoria && !na && vacia(r)) sinContestar += 1;
    if (p.pideFoto && !na && !vacia(r) && !r.foto) sinFoto += 1;
  }
  const partes = [];
  if (sinContestar) partes.push(`${sinContestar} ${sinContestar === 1 ? "pregunta obligatoria" : "preguntas obligatorias"}`);
  if (sinFoto) partes.push(`${sinFoto} ${sinFoto === 1 ? "foto" : "fotos"}`);
  return partes.length ? `Faltan ${partes.join(" y ")}.` : null;
}

// Texto legible de una respuesta (para revisar, el historial y el Excel).
export function textoRespuesta(p, r) {
  if (r?.na && p.permiteNA) return "No aplica";
  if (vacia(r)) return "Sin contestar";
  switch (p.tipo) {
    case "si_no": return r.valor === "si" ? "Sí" : "No";
    case "opcion": return p.opciones?.find((o) => o.id === r.valor)?.texto ?? "—";
    case "multiple": return (p.opciones ?? []).filter((o) => r.valor.includes(o.id)).map((o) => o.texto).join(", ") || "Ninguna";
    case "numero": return `${r.valor}${p.unidad ? ` ${p.unidad}` : ""}`;
    case "foto": return "Foto";
    case "fecha": { const [a, m, d] = String(r.valor).split("-"); return `${d}/${m}/${a}`; }
    case "fecha_hora": { const [f, h] = String(r.valor).split("T"); const [a, m, d] = f.split("-"); return `${d}/${m}/${a} ${h ?? ""}`.trim(); }
    default: return String(r.valor);
  }
}

// Corrección del jefe (decisión A): sus respuestas reemplazan a las de la persona solo en las preguntas que cambió.
// Devuelve las respuestas finales y la lista de cambios { pregunta, antes, despues } (texto legible) para el historial.
export function aplicarCorrecciones(preguntas, respuestas = {}, correcciones = {}) {
  const finales = { ...respuestas };
  const cambios = [];
  for (const p of preguntas) {
    if (!(p.id in correcciones)) continue;
    const antes = textoRespuesta(p, respuestas[p.id]);
    const despues = textoRespuesta(p, correcciones[p.id]);
    if (antes === despues) continue;
    finales[p.id] = { ...respuestas[p.id], ...correcciones[p.id] };
    cambios.push({ pregunta: p.id, texto: p.texto, antes, despues });
  }
  return { finales, cambios };
}

// Productividad: puntaje promedio de cada pregunta en los envíos revisados (las que más fallan primero).
// envios: [{ checklist, estado, respuestas, persona, sucursal }]; checklists: [{ id, nombre, preguntas }].
export function fallasPorPregunta(envios = [], checklists = []) {
  const porClave = new Map();
  for (const e of envios) {
    if (e.estado !== "aprobado" && e.estado !== "regresado") continue;
    const ck = checklists.find((c) => c.id === e.checklist);
    if (!ck) continue;
    for (const p of ck.preguntas) {
      const v = puntajePregunta(p, e.respuestas?.[p.id]);
      if (v == null) continue;
      const k = `${ck.id}:${p.id}`;
      const r = porClave.get(k) ?? { checklist: ck.nombre, pregunta: p.texto, veces: 0, suma: 0, malas: 0 };
      r.veces += 1;
      r.suma += v;
      if (v < 100) r.malas += 1;
      porClave.set(k, r);
    }
  }
  return [...porClave.values()]
    .map((r) => ({ ...r, promedio: Math.round((r.suma / r.veces) * 10) / 10, porcentajeMal: Math.round((r.malas / r.veces) * 100) }))
    .sort((a, b) => a.promedio - b.promedio || b.veces - a.veces);
}
