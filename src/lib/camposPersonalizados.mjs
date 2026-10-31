import posiciones from "./posicionesCampos.json" with { type: "json" };

export function parseCampos(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
export function camposVisibles(fields, location, empresa) {
  return fields.filter(f => f.activo && f[location] && (!empresa || Number(f.id_empresa) === Number(empresa)));
}

export const TIPOS_CAMPO = [
  { value: "seleccion", label: "Selección", description: "Una opción de una lista definida." },
  { value: "texto", label: "Texto", description: "Información escrita libremente." },
  { value: "numero", label: "Número", description: "Valores enteros o decimales." },
];
export function columnasCampos(fields) {
  return fields.filter(f => f.activo);
}
export function opcionesCampo(field, employees) {
  const assigned = employees.filter(e => Number(e.id_empresa) === Number(field.id_empresa))
    .map(e => parseCampos(e.campos_personalizados)[field.id])
    .filter(v => v !== undefined && v !== null && v !== "").map(String);
  const unique = [...new Set(assigned)];
  if (!field.tipo || field.tipo === "seleccion") return [...new Set([...(field.opciones || []), ...unique.sort((a, b) => a.localeCompare(b, "es"))])];
  return unique.sort((a, b) => field.tipo === "numero" ? Number(a) - Number(b) : a.localeCompare(b, "es", { numeric: true }));
}
export function coincideCampos(employee, selected) {
  const values = parseCampos(employee.campos_personalizados);
  return Object.entries(selected).every(([id, options]) => !options.length || options.includes(String(values[id] ?? "")));
}

export const PESTANAS_CAMPO = [
  { value: "personales", label: "Datos personales" },
  { value: "emergencia", label: "Contactos de emergencia" },
  { value: "laborales", label: "Datos laborales" },
  { value: "jornada", label: "Jornada laboral" },
  { value: "nomina", label: "Datos de nómina" },
  { value: "cuentas", label: "Cuentas bancarias" },
  { value: "reconocimiento", label: "Escanear rostro" },
  { value: "documentos", label: "Documentos" },
];
export function camposEnPestana(fields, pestana) {
  return camposVisibles(fields, "formulario").filter(f => (f.pestana || "laborales") === pestana);
}
export const claveColumnaCampo = id => `campo:${id}`;
export function registroColumnasCampos(fields) {
  return columnasCampos(fields).map(f => ({ key: claveColumnaCampo(f.id), label: f.nombre, extra: true }));
}

export function posicionesCampo(pestana) {
  return [
    { value: "inicio", label: "Al inicio" },
    ...(posiciones[pestana] || []).map(([value, label]) => ({ value, label: `Después de ${label}` })),
    { value: "fin", label: "Al final" },
  ];
}
export function camposEnPosicion(fields, pestana, despuesDe = "fin") {
  const valid = posicionesCampo(pestana).map(p => p.value);
  return camposEnPestana(fields, pestana)
    .filter(f => (valid.includes(f.despues_de) ? f.despues_de : "fin") === despuesDe)
    .sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));
}

export function vistaOrdenCampo(fields, draft, editingId, antesDe) {
  const peers = camposEnPosicion(fields, draft.pestana, draft.despues_de)
    .filter(f => f.id !== editingId && Number(f.id_empresa) === Number(draft.id_empresa));
  const current = { ...draft, id: editingId || "__actual__", actual: true };
  let index = peers.length;
  if (antesDe !== undefined) {
    const target = peers.findIndex(f => f.id === antesDe);
    if (target >= 0) index = target;
  } else if (editingId) {
    const existing = camposEnPosicion(fields, draft.pestana, draft.despues_de);
    const previousIndex = existing.findIndex(f => f.id === editingId);
    if (previousIndex >= 0) index = existing.slice(0, previousIndex).filter(f => peers.some(p => p.id === f.id)).length;
  }
  return [...peers.slice(0, index), current, ...peers.slice(index)];
}
