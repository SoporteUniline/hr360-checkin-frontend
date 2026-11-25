// Lumo fase A (25/11/2026): requisitos estructurados de la vacante (pantalla). Espejo de la validación del API
// (services/whatsapp/requisitos.js), que es el que manda. La evaluación la hace el servidor sin IA; aquí solo se muestra.
export const TIPOS_REQUISITO = [
  { tipo: "edad", texto: "Edad", ayuda: "Solo si la ley lo exige. Mayor de edad (18) no necesita fundamento; otra edad mínima o una máxima, sí." },
  { tipo: "experiencia", texto: "Experiencia mínima", ayuda: "Años mínimos de experiencia." },
  { tipo: "escolaridad", texto: "Escolaridad mínima", ayuda: "Último grado de estudios." },
  { tipo: "turno", texto: "Turno", ayuda: "Turnos que puede cubrir." },
  { tipo: "zona", texto: "Zona", ayuda: "Municipios, colonias o estados aceptados." },
];
export const NIVELES = [
  { valor: "primaria", texto: "Primaria" }, { valor: "secundaria", texto: "Secundaria" }, { valor: "preparatoria", texto: "Preparatoria o bachillerato" },
  { valor: "tecnico", texto: "Carrera técnica" }, { valor: "licenciatura", texto: "Licenciatura" }, { valor: "maestria", texto: "Maestría" }, { valor: "doctorado", texto: "Doctorado" },
];
export const TURNOS = [
  { valor: "matutino", texto: "Matutino" }, { valor: "vespertino", texto: "Vespertino" }, { valor: "nocturno", texto: "Nocturno" },
  { valor: "mixto", texto: "Mixto" }, { valor: "fin_de_semana", texto: "Fin de semana" },
];
export const ESTADOS_REQUISITO = {
  cumple: { texto: "Cumple", tono: "verde", simbolo: "✓" },
  no_cumple: { texto: "No cumple", tono: "rojo", simbolo: "✕" },
  falta_dato: { texto: "Falta dato", tono: "gris", simbolo: "?" },
};
export const etiquetaEstadoRequisito = (estado) => ESTADOS_REQUISITO[estado] ?? ESTADOS_REQUISITO.falta_dato;
export const etiquetaTipoRequisito = (tipo) => TIPOS_REQUISITO.find((t) => t.tipo === tipo)?.texto ?? tipo;

const texto = (v) => (v === null || v === undefined ? "" : String(v));

// Requisito del formulario (todo en texto para los campos).
export function requisitoNuevo(tipo) {
  return { tipo, activo: true, min: tipo === "edad" ? "18" : "", max: "", fundamento: "", min_anios: "", minima: "", acepta: [], lugares: "", id_pregunta: "" };
}
export function requisitosDesdeApi(lista) {
  return (Array.isArray(lista) ? lista : []).map((r) => {
    const g = r?.regla ?? {};
    return {
      ...requisitoNuevo(r.tipo), activo: r.activo !== false, min: texto(g.min), max: texto(g.max), fundamento: texto(g.fundamento), min_anios: texto(g.min_anios),
      minima: texto(g.minima), acepta: Array.isArray(g.acepta) ? g.acepta : [], lugares: Array.isArray(g.lugares) ? g.lugares.join(", ") : "", id_pregunta: texto(g.id_pregunta),
    };
  });
}

// ¿La edad pide fundamento legal? (mínimo > 18 o cualquier máximo)
export const edadPideFundamento = (r) => texto(r?.max).trim() !== "" || (texto(r?.min).trim() !== "" && Number(r.min) > 18);

const entero = (v) => {
  const t = texto(v).trim();
  if (!t) return { vacio: true };
  const n = Number(t);
  return Number.isInteger(n) ? { valor: n } : { invalido: true };
};

// Lista del formulario → { errores: [{campo: texto}], valido, cuerpo } con el cuerpo para PUT /vacantes/:id/requisitos.
export function validarRequisitosForm(lista) {
  const errores = [];
  const cuerpo = [];
  for (const r of Array.isArray(lista) ? lista : []) {
    const e = {};
    const ligada = texto(r.id_pregunta).trim() ? Number(r.id_pregunta) : null;
    let regla = null;
    if (r.tipo === "edad") {
      const min = entero(r.min);
      const max = entero(r.max);
      if (min.invalido || max.invalido) e.edad = "Usa años enteros.";
      else if (min.vacio && max.vacio) e.edad = "Escribe la edad mínima o máxima.";
      else if ((!min.vacio && (min.valor < 15 || min.valor > 99)) || (!max.vacio && (max.valor < 15 || max.valor > 99))) e.edad = "Usa edades de 15 a 99 (la ley no permite contratar menores de 15).";
      else if (!min.vacio && !max.vacio && min.valor > max.valor) e.edad = "La edad mínima es mayor que la máxima.";
      const fundamento = texto(r.fundamento).trim();
      if (!e.edad && edadPideFundamento(r) && fundamento.length < 10) e.fundamento = "Escribe el fundamento legal (p. ej. «Licencia federal de la SCT: 21 años»). Sin él, pedir una edad es discriminación.";
      regla = { min: min.vacio ? null : min.valor ?? null, max: max.vacio ? null : max.valor ?? null, fundamento: edadPideFundamento(r) ? fundamento : null };
    } else if (r.tipo === "experiencia") {
      const t = texto(r.min_anios).trim();
      const n = Number(t);
      if (!t || !Number.isFinite(n) || n < 0 || n > 60) e.min_anios = "Escribe los años mínimos (0 a 60).";
      regla = { min_anios: n };
    } else if (r.tipo === "escolaridad") {
      if (!NIVELES.some((x) => x.valor === r.minima)) e.minima = "Elige el nivel mínimo.";
      regla = { minima: r.minima };
    } else if (r.tipo === "turno") {
      if (!r.acepta?.length) e.acepta = "Elige al menos un turno.";
      regla = { acepta: r.acepta ?? [] };
    } else {
      const lugares = [...new Set(texto(r.lugares).split(",").map((x) => x.trim().replace(/\s+/g, " ")).filter(Boolean))];
      if (!lugares.length) e.lugares = "Escribe al menos un lugar (sepáralos con comas).";
      else if (lugares.length > 20 || lugares.some((l) => l.length < 2 || l.length > 80)) e.lugares = "De 1 a 20 lugares, de 2 a 80 caracteres cada uno.";
      regla = { lugares };
    }
    errores.push(e);
    cuerpo.push({ tipo: r.tipo, activo: r.activo !== false, regla: { ...regla, id_pregunta: ligada } });
  }
  const valido = errores.every((e) => !Object.keys(e).length);
  return { errores, valido, cuerpo: { requisitos: cuerpo } };
}

// Tipos que todavía se pueden agregar (uno por tipo).
export const tiposDisponibles = (lista) => TIPOS_REQUISITO.filter((t) => !(lista ?? []).some((r) => r.tipo === t.tipo));

// Preguntas de filtro que sirven de fuente para un tipo (número para edad/experiencia; las demás, cualquiera).
export const preguntasParaTipo = (preguntas, tipo) =>
  (preguntas ?? []).filter((p) => (tipo === "edad" || tipo === "experiencia" ? p.tipo === "numero" : true));

// Resumen de la ficha: título y tono.
export function resumenRequisitos(r) {
  if (!r?.resultados?.length) return null;
  const { cumple = 0, no_cumple: no = 0, falta_dato: falta = 0 } = r.resumen ?? {};
  const total = r.resultados.length;
  if (no) return { tono: "rojo", titulo: `No cumple ${no} de ${total} ${total === 1 ? "requisito" : "requisitos"}`, ayuda: "Es una alerta para ti: el candidato no se rechaza solo." };
  if (falta) return { tono: "gris", titulo: `Cumple ${cumple} de ${total}; falta saber ${falta}`, ayuda: "El agente aún no tiene ese dato." };
  return { tono: "verde", titulo: total === 1 ? "Cumple el requisito" : `Cumple los ${total} requisitos`, ayuda: "" };
}
