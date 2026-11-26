// Tablero, IA y evidencia de Evaluación del desempeño (26/11/2026, desemp1). Funciones puras para las vistas
// (InsightViews.jsx); los números los calcula el servidor (/campaigns/:id/analytics, /assignments/:id/evidence).

// Semáforo de una calificación de 1 a 5 (mismo corte que el tablero del servidor: <3, 3–3.99, ≥4).
export function tonoCalificacion(valor) {
  if (valor === null || valor === undefined || !Number.isFinite(Number(valor))) return "gray";
  const n = Number(valor);
  return n < 3 ? "red" : n < 4 ? "amber" : "green";
}

export const num = (v, d = 2) =>
  v === null || v === undefined || !Number.isFinite(Number(v))
    ? "—"
    : new Intl.NumberFormat("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(v));

export const pct = (v) => (v === null || v === undefined ? "—" : `${num(v, Number.isInteger(Number(v)) ? 0 : 1)} %`);

export const BRECHA = {
  sobreestima: { texto: "Se califica más alto", tono: "amber" },
  subestima: { texto: "Se califica más bajo", tono: "blue" },
  alineado: { texto: "Alineado con su jefe", tono: "green" },
};

// Aplica las sugerencias de Adamia AI al formulario SIN guardar: la persona revisa y guarda o envía después.
// Por omisión solo llena preguntas vacías (no pisa lo que ya contestó); con reemplazar: true cambia todas.
export function aplicarBorrador(respuestas = {}, sugerencias = [], { reemplazar = false } = {}) {
  const siguiente = { ...respuestas };
  let aplicadas = 0;
  for (const s of sugerencias) {
    if (s?.valor === null || s?.valor === undefined || s?.valor === "") continue;
    const clave = String(s.id);
    const actual = siguiente[clave];
    const vacia = actual === undefined || actual === null || actual === "";
    if (!vacia && !reemplazar) continue;
    siguiente[clave] = s.valor;
    aplicadas += 1;
  }
  return { respuestas: siguiente, aplicadas };
}

// Acción sugerida → datos del formulario de plan (fecha a N días de hoy, en formato AAAA-MM-DD).
export function planDeSugerencia(accion, hoy = new Date()) {
  const d = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
  d.setUTCDate(d.getUTCDate() + (Number(accion?.dias) || 90));
  return {
    title: String(accion?.titulo || "").slice(0, 250),
    successMeasure: String(accion?.medidaDeExito || "").slice(0, 2000),
    dueOn: d.toISOString().slice(0, 10),
  };
}

// Mensaje claro para los errores de la IA que la pantalla espera.
export function mensajeIa(error) {
  const codigo = error?.code;
  if (codigo === "IA_APAGADA") return "Adamia AI no está activa. El dueño la enciende desde el botón «Adamia AI».";
  if (codigo === "IA_SIN_CREDITOS") return "Sin créditos de Adamia AI. Recarga para seguir usándola.";
  if (codigo === "SIN_MIGRACION") return "Falta preparar la base de datos de evaluaciones. Avísale al administrador de ADAMIA.";
  return error?.message || "Adamia AI no pudo responder. Intenta de nuevo.";
}

// Filas del mapa de calor listas para pintar: cada celda con su tono y su texto (n chico se marca).
export function filasCalor(heatmap, minimo = 3) {
  return (heatmap?.rows || []).map((r) => ({
    key: r.key,
    name: r.name,
    cells: r.cells.map((c) => ({
      ...c,
      tono: tonoCalificacion(c.average),
      texto: c.average === null ? "—" : num(c.average),
      pocos: c.n > 0 && c.n < minimo,
    })),
  }));
}

// Avance de la evidencia (asistencia) en frases cortas para el evaluador.
export function frasesEvidencia(e) {
  if (!e?.asistencia) return [];
  const a = e.asistencia;
  const f = [
    `Asistencia ${pct(a.asistenciaPct)} · puntualidad ${pct(a.puntualidadPct)}`,
    `${a.faltas} falta${a.faltas === 1 ? "" : "s"} · ${a.retardos} retardo${a.retardos === 1 ? "" : "s"} · ${num(a.horasExtra, 1)} h extra`,
  ];
  if (a.justificadas?.total) f.push(`${a.justificadas.total} ausencia${a.justificadas.total === 1 ? "" : "s"} justificada${a.justificadas.total === 1 ? "" : "s"} (no cuentan en contra)`);
  if (a.sinHorario) f.push("No tiene horario registrado: la asistencia puede no ser exacta.");
  return f;
}
