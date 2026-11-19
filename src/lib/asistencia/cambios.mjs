// "Qué cambió" en un registro de asistencia editado.
// Compara `valores_originales` (lo que guardó el backend antes de la primera edición)
// contra los valores actuales del registro. Sin dependencias: se prueba con node:test.
// Quién y cuándo aún no los guarda el backend; cuando existan se agregan aquí.

export const ETIQUETAS_CAMPO = {
  entrada: "Entrada",
  salida: "Salida",
  comida_agregada: "Comida",
  id_tipo_permiso: "Tipo de registro",
  asistencia: "Asistió",
  goce_sueldo: "Goce de sueldo",
  hrs_extra: "Horas extra",
  forma_pago_extras: "Forma de pago de extras",
  extras_autorizadas_por: "Extras autorizadas por",
  autorizado_por: "Autorizado por",
  pago_triple: "Pago triple",
  es_domingo: "Domingo",
  prima_dominical: "Prima dominical",
  es_festivo: "Festivo",
  porcentaje_dia_festivo: "Porcentaje día festivo",
  hrs_comida: "Horas de comida",
  notas: "Observaciones",
  notas_hrs_extra: "Notas de horas extra",
};

// Campos que no son datos editables (identificadores, sellos, nombres armados por el backend).
const IGNORAR = new Set([
  "id", "id_asistencia", "id_empleado", "id_empresa", "fecha", "created_at", "updated_at",
  "valores_originales", "correccion", "tipo_registro_nombre", "tipo_registro_clave",
  "nombre", "apellido_paterno", "apellido_materno",
]);

const CAMPOS_SI_NO = new Set(["asistencia", "goce_sueldo", "hrs_extra", "pago_triple", "es_domingo", "es_festivo"]);

export function leerOriginales(registro) {
  const crudo = registro?.valores_originales;
  if (!crudo) return null;
  if (typeof crudo === "object") return crudo;
  try {
    const v = JSON.parse(crudo);
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
}

function normalizar(campo, valor) {
  if (valor === undefined || valor === null || valor === "" || valor === "-") return null;
  if (CAMPOS_SI_NO.has(campo)) return Number(Boolean(Number(valor)));
  if (typeof valor === "number") return valor;
  const s = String(valor).trim();
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  // Fechas: misma marca aunque cambie el formato ("2026-11-18T08:00:00" vs "2026-11-18 08:00:00").
  const f = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/.exec(s);
  return f ? `${f[1]} ${f[2]}` : s;
}

export function etiquetaCampo(campo) {
  return ETIQUETAS_CAMPO[campo] ?? campo.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

// Devuelve [{ campo, etiqueta, antes, despues }] solo de los campos que cambiaron.
// `formatear(campo, valor)` convierte cada valor a texto para mostrarlo (horas, catálogos, sí/no).
// Comida agregada a mano (POST /asistencias/:id/comida): el valor actual son los descansos entre tramos.
function valorActual(registro, campo) {
  if (campo !== "comida_agregada") return registro?.[campo];
  const tramos = Array.isArray(registro?.tramos_checadas) ? registro.tramos_checadas : [];
  const hora = (v) => String(v ?? "").slice(11, 16);
  const huecos = tramos.slice(1).map((t, i) => `${hora(tramos[i].salida)}–${hora(t.entrada)}`);
  return huecos.length ? huecos.join(", ") : "Agregada";
}

export function cambiosRegistro(registro, formatear = (_c, v) => (v == null || v === "" ? "—" : String(v))) {
  const originales = leerOriginales(registro);
  if (!originales) return [];
  const orden = Object.keys(ETIQUETAS_CAMPO);
  return Object.keys(originales)
    .filter((campo) => !IGNORAR.has(campo))
    .filter((campo) => normalizar(campo, originales[campo]) !== normalizar(campo, valorActual(registro, campo)))
    .sort((a, b) => (orden.indexOf(a) + 1 || 99) - (orden.indexOf(b) + 1 || 99))
    .map((campo) => ({
      campo,
      etiqueta: etiquetaCampo(campo),
      antes: formatear(campo, originales[campo]),
      despues: formatear(campo, valorActual(registro, campo)),
    }));
}

// Estado de edición de un registro para la columna "Editado".
// - editado: el backend lo marcó como corregido.
// - conDetalle: además hay originales para mostrar antes → después.
export function estadoEdicion(registro) {
  const editado = Boolean(Number(registro?.correccion));
  const cambios = editado ? cambiosRegistro(registro) : [];
  return { editado, conDetalle: cambios.length > 0, totalCambios: cambios.length };
}

// Texto corto para Excel: "Salida: 13:19 → 17:00; Tipo de registro: 2 → 14".
export function resumenCambios(registro, formatear) {
  return cambiosRegistro(registro, formatear)
    .map((c) => `${c.etiqueta}: ${c.antes} → ${c.despues}`)
    .join("; ");
}
