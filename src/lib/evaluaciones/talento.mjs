// Reglas de pantalla de objetivos, 1:1, feedback, calibración 9-box y bono (docs/evaluaciones/talento.md). Puras: se
// prueban en scripts/test-evaluaciones-talento.mjs. Quién puede qué y los cálculos de dinero los decide el servidor.

// Periodos de objetivos: año, semestres y trimestres del año dado.
export function periodosDe(anio) {
  const a = String(anio);
  return [
    { value: a, label: `Año ${a}` },
    { value: `${a}-S1`, label: `1er semestre ${a}` },
    { value: `${a}-S2`, label: `2º semestre ${a}` },
    ...[1, 2, 3, 4].map((t) => ({ value: `${a}-T${t}`, label: `Trimestre ${t} · ${a}` })),
  ];
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const nombreMes = (mes) => {
  const [a, m] = String(mes).split("-").map(Number);
  return m >= 1 && m <= 12 ? `${MESES[m - 1]} ${a}` : String(mes);
};

// Meses en los que se puede registrar avance: los del periodo hasta el mes actual (el más reciente primero).
export function mesesParaAvance(periodStart, periodEnd, hoy) {
  const fin = [String(periodEnd).slice(0, 7), String(hoy).slice(0, 7)].sort()[0];
  const meses = [];
  let [a, m] = String(periodStart).slice(0, 7).split("-").map(Number);
  for (let i = 0; i < 24; i++) {
    const clave = `${a}-${String(m).padStart(2, "0")}`;
    if (clave > fin) break;
    meses.push(clave);
    m += 1;
    if (m > 12) { m = 1; a += 1; }
  }
  return meses.reverse();
}

// Resumen del juego de objetivos para la pantalla (el servidor manda `problem`; aquí se explica sin pedirlo).
export function estadoObjetivos(objetivos = []) {
  const vigentes = objetivos.filter((o) => o.status !== "cancelado");
  const peso = vigentes.reduce((t, o) => t + Number(o.weight || 0), 0);
  const faltan = Math.max(0, 3 - vigentes.length);
  let texto;
  if (!vigentes.length) texto = "Sin objetivos todavía: agrega de 3 a 5.";
  else if (faltan) texto = `Agrega ${faltan} objetivo${faltan > 1 ? "s" : ""} más (mínimo 3).`;
  else if (peso !== 100) texto = `Los pesos suman ${peso}: deben sumar 100.`;
  else if (vigentes.some((o) => o.status === "borrador")) texto = "Listos para que tu jefe los apruebe.";
  else texto = "Aprobados.";
  return { count: vigentes.length, weight: peso, canAdd: vigentes.length < 5, ready: !faltan && peso === 100, texto };
}

export const VISIBILIDAD = [
  { value: "colaborador", label: "Solo la persona", hint: "Su jefe no lo ve." },
  { value: "jefe", label: "Solo su jefe", hint: "La persona no lo ve." },
  { value: "ambos", label: "La persona y su jefe", hint: "" },
];
export const textoVisibilidad = (v) => VISIBILIDAD.find((x) => x.value === v)?.label ?? v;

export const FRECUENCIAS = [
  { value: "semanal", label: "Cada semana" },
  { value: "quincenal", label: "Cada 2 semanas" },
  { value: "mensual", label: "Cada mes" },
];

// 9-box: filas de desempeño (3 arriba = alto) × columnas de potencial (1 izquierda = bajo). Casilla 1–9 de abajo-izq.
export const DESEMPENO = ["Bajo", "Medio", "Alto"];
export const NOMBRES_CAJA = {
  "3-3": "Estrella", "3-2": "Alto desempeño", "3-1": "Profesional sólido",
  "2-3": "Alto potencial", "2-2": "Pilar", "2-1": "Efectivo",
  "1-3": "Diamante en bruto", "1-2": "Dilema", "1-1": "Bajo desempeño",
};
export function cajas(entries = []) {
  const filas = [];
  for (const d of [3, 2, 1]) {
    for (const p of [1, 2, 3]) {
      filas.push({ performance: d, potential: p, key: `${d}-${p}`, name: NOMBRES_CAJA[`${d}-${p}`],
        people: entries.filter((e) => e.performanceLevel === d && e.potentialLevel === p) });
    }
  }
  return { boxes: filas, unplaced: entries.filter((e) => e.potentialLevel == null) };
}
// Rango de calificación de una fila de desempeño (igual que el servidor: < corte bajo, hasta antes del alto, ≥ alto).
export function rangoFila(nivel, { low = 3, high = 4 } = {}) {
  const r2 = (n) => Math.round(n * 100) / 100;
  if (nivel === 1) return { min: 1, max: r2(low - 0.01) };
  if (nivel === 2) return { min: r2(low), max: r2(high - 0.01) };
  return { min: r2(high), max: 5 };
}
// Calificación sugerida al cambiar de fila: la actual si cabe; si no, el borde más cercano de la fila nueva.
export function scoreSugerido(actual, nivel, cuts) {
  const { min, max } = rangoFila(nivel, cuts);
  return Math.min(max, Math.max(min, Number(actual)));
}

export const pesos = (n) =>
  n == null ? "—" : new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 }).format(Number(n));

export const ESTADO_BONO = { borrador: ["Borrador", "amber"], aprobado: ["Aprobado", "green"], cancelado: ["Cancelado", "gray"] };

// Valida las reglas del bono antes de mandarlas (el servidor vuelve a validar).
export function problemasReglas(reglas = []) {
  const errores = [];
  reglas.forEach((r, i) => {
    const n = i + 1;
    if (!String(r.name ?? "").trim()) errores.push(`Regla ${n}: ponle nombre.`);
    const min = Number(r.min), max = Number(r.max), v = Number(r.value);
    if (!(min >= 1 && max <= 5 && min <= max)) errores.push(`Regla ${n}: la banda va de 1 a 5 (mínima ≤ máxima).`);
    if (!(v >= 0) || (r.type === "porcentaje" && v > 100)) errores.push(`Regla ${n}: revisa el ${r.type === "porcentaje" ? "porcentaje (0 a 100)" : "monto"}.`);
  });
  const orden = [...reglas].map((r) => ({ ...r, min: Number(r.min), max: Number(r.max) })).sort((a, b) => a.min - b.min);
  for (let i = 1; i < orden.length; i++) if (orden[i].min <= orden[i - 1].max) errores.push(`Las bandas «${orden[i - 1].name}» y «${orden[i].name}» se enciman.`);
  return errores;
}
