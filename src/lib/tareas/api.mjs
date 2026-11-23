// Traducción entre la API de Tareas y Checklists (backend /api/checador/tareas, 23/11/2026) y la forma que usan las
// pantallas (la del prototipo). Funciones puras; pruebas en scripts/test-tareas.mjs.

const MAYUS = { alta: "Alta", media: "Media", baja: "Baja" };
const FRECUENCIA_TEXTO = { diario: "Diario", semanal: "Semanal", una_vez: "Una sola vez" };
const DIAS = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

const iniciales = (nombre) => String(nombre ?? "").split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("") || "?";

export function dePersonaApi(p) {
  const hoy = { en_jornada: ["En jornada", "verde"], salio: ["Ya salió", "gris"], sin_checar: ["Sin checar hoy", "rojo"] }[p.hoy] ?? ["", "gris"];
  return { id: p.id, nombre: p.nombre, ini: iniciales(p.nombre), puesto: p.puesto ?? "", idPuesto: p.id_puesto ?? null, sucursal: p.sucursal ?? "", departamento: p.departamento ?? "", idJefe: p.id_jefe_inmediato ?? null, hoy: hoy[0], tono: hoy[1] };
}

export function deProyectoApi(p) {
  return { id: p.id, nombre: p.nombre, descripcion: p.descripcion ?? "", color: p.color, responsable: p.id_responsable_empleado ?? null, fin: p.fecha_fin ?? null };
}
export function aProyectoApi(p, idEmpresa) {
  return { empresa: idEmpresa, nombre: p.nombre, descripcion: p.descripcion || null, color: p.color, fecha_fin: p.fin || null, id_responsable_empleado: p.responsable || null };
}

export function deTareaApi(t) {
  return {
    id: t.id, titulo: t.titulo, descripcion: t.descripcion ?? "", proyecto: t.id_proyecto ?? null, persona: t.id_responsable,
    prioridad: MAYUS[t.prioridad] ?? "Media", estado: t.estado, fecha: t.fecha_limite ?? "", pideFoto: Boolean(t.pide_foto), version: t.version,
    pasos: (t.pasos ?? []).map((p) => ({ id: p.id, texto: p.texto, hecho: Boolean(p.hecho) })),
    comentarios: (t.comentarios ?? []).map((c) => ({ de: c.de, texto: c.texto })), fotos: t.fotos ?? [], historial: t.historial ?? [],
  };
}
export function aTareaApi(t, idEmpresa) {
  return {
    empresa: idEmpresa, titulo: t.titulo, descripcion: t.descripcion || null, id_proyecto: t.proyecto || null, id_responsable: t.persona,
    prioridad: String(t.prioridad ?? "Media").toLowerCase(), fecha_limite: t.fecha || null, pide_foto: Boolean(t.pideFoto),
    pasos: (t.pasos ?? []).filter((p) => String(p.texto ?? "").trim()).map((p) => ({ ...(Number.isInteger(p.id) ? { id: p.id } : {}), texto: p.texto.trim(), hecho: Boolean(p.hecho) })),
    ...(t.version != null ? { version: t.version } : {}),
  };
}

// Pregunta: API (permite_na, pide_foto, minimo, maximo) ↔ pantalla (permiteNA, pideFoto, min, max).
export function dePreguntaApi(p) {
  return {
    id: p.id, texto: p.texto, tipo: p.tipo, peso: Number(p.peso), obligatoria: Boolean(p.obligatoria), permiteNA: Boolean(p.permite_na), pideFoto: Boolean(p.pide_foto),
    correcta: p.correcta ?? "si", min: p.minimo ?? "", max: p.maximo ?? "", unidad: p.unidad ?? "",
    opciones: (p.opciones ?? []).filter((o) => o.activo !== false).map((o) => ({ id: o.id, texto: o.texto, valor: Number(o.valor) })),
  };
}
const idReal = (id) => (Number.isInteger(id) ? { id } : {}); // los nuevos traen id temporal (texto): se crean
export function aPreguntaApi(p) {
  return {
    ...idReal(p.id), texto: p.texto, tipo: p.tipo, peso: Number(p.peso) > 0 ? Number(p.peso) : 1, obligatoria: Boolean(p.obligatoria),
    permite_na: Boolean(p.permiteNA), pide_foto: Boolean(p.pideFoto), correcta: p.tipo === "si_no" ? p.correcta ?? "si" : null,
    minimo: p.tipo === "numero" && p.min !== "" && p.min != null ? Number(p.min) : null,
    maximo: p.tipo === "numero" && p.max !== "" && p.max != null ? Number(p.max) : null,
    unidad: p.tipo === "numero" ? p.unidad || null : null,
    opciones: p.tipo === "opcion" || p.tipo === "multiple" ? (p.opciones ?? []).map((o) => ({ ...idReal(o.id), texto: o.texto, valor: Number(o.valor) || 0 })) : [],
  };
}

// Asignación: en pantalla { tipo, valor } donde valor = id de puesto / id de empleado / nombre de departamento.
export function deChecklistApi(c) {
  const a0 = c.asignaciones?.[0];
  return {
    id: c.id, nombre: c.nombre, version: c.version, frecuencia: c.frecuencia, diasSemana: String(c.dias_semana ?? "").split(",").filter(Boolean).map(Number),
    fechaUnica: c.fecha_unica ? String(c.fecha_unica).slice(0, 10) : "", hora: String(c.hora_limite ?? "09:00").slice(0, 5), revisa: c.revisa ?? "jefe_inmediato",
    soloSiCheco: Boolean(c.solo_si_checo), sucursal: a0?.sucursal ?? "",
    asignaciones: (c.asignaciones ?? []).map((a) => ({ tipo: a.tipo, valor: a.tipo === "puesto" ? a.id_puesto : a.tipo === "empleado" ? a.id_empleado : a.departamento })),
    preguntas: (c.preguntas ?? []).map(dePreguntaApi),
  };
}
export function aChecklistApi(f, idEmpresa) {
  return {
    empresa: idEmpresa, nombre: f.nombre, frecuencia: f.frecuencia, dias_semana: (f.diasSemana ?? []).join(","), fecha_unica: f.fechaUnica || null,
    hora_limite: f.hora, revisa: f.revisa, solo_si_checo: Boolean(f.soloSiCheco),
    asignaciones: (f.asignaciones ?? []).filter((a) => a.valor !== "" && a.valor != null).map((a) => ({
      tipo: a.tipo, ...(a.tipo === "puesto" ? { id_puesto: Number(a.valor) } : a.tipo === "empleado" ? { id_empleado: Number(a.valor) } : { departamento: a.valor }),
      sucursal: f.sucursal || null,
    })),
    preguntas: (f.preguntas ?? []).map(aPreguntaApi),
    ...(f.version != null ? { version: f.version } : {}),
  };
}

// «Diario», «Lunes y jueves», «Una sola vez (5 dic)».
export function textoFrecuencia(c) {
  if (c.frecuencia === "semanal") {
    const d = (c.diasSemana ?? []).map((n) => DIAS[n]).filter(Boolean);
    return d.length ? `Cada ${d.length > 1 ? `${d.slice(0, -1).join(", ")} y ${d.at(-1)}` : d[0]}` : "Semanal";
  }
  return FRECUENCIA_TEXTO[c.frecuencia] ?? "Diario";
}

// Texto de a quién le toca, para las tarjetas.
export function textoAsignacion(c, { puestos = [], personas = [] } = {}) {
  const partes = (c.asignaciones ?? []).map((a) => {
    if (a.tipo === "puesto") return `Puesto: ${puestos.find((p) => Number(p.id) === Number(a.valor))?.nombre ?? "—"}`;
    if (a.tipo === "empleado") return personas.find((p) => Number(p.id) === Number(a.valor))?.nombre ?? "—";
    return `Depto.: ${a.valor}`;
  });
  return `${partes.join(", ") || "Sin asignar"}${c.sucursal ? ` · ${c.sucursal}` : " · todas las sucursales"}`;
}

// Respuestas de pantalla ({ [id]: { valor, na, foto } }) → API (solo lo contestado).
export function aRespuestasApi(respuestas = {}) {
  const r = {};
  for (const [id, v] of Object.entries(respuestas)) {
    if (!v) continue;
    if (v.na) { r[id] = { na: true }; continue; }
    if (v.valor == null || v.valor === "" || (Array.isArray(v.valor) && !v.valor.length)) continue;
    r[id] = { valor: v.valor, ...(v.foto ? { foto: v.foto } : {}) };
  }
  return r;
}
