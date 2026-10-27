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
