// Reglas de calendario y privacidad para la vista de Asistencias.
// Sin dependencias para probarlas con node:test.

const fechaISO = (valor) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(valor ?? ""));
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
};

// ¿La fecha del registro es domingo? (null si no hay fecha válida)
export function esDomingo(fecha) {
  const iso = fechaISO(fecha);
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0;
}

const unidadDe = (fila) =>
  fila?.unidad_negocio || fila?.nombre_sucursal || fila?.sucursal || fila?.empresa_nombre || "";

// Índice del catálogo de Festivos: "unidad|fecha" y "*|fecha" (festivo sin unidad = aplica a todas).
export function indiceFestivos(festivos) {
  const lista = Array.isArray(festivos)
    ? festivos
    : festivos?.festivos ?? festivos?.holidays ?? festivos?.data ?? null;
  if (!Array.isArray(lista)) return null;
  const indice = new Set();
  for (const f of lista) {
    const iso = fechaISO(f?.fecha);
    if (!iso) continue;
    indice.add(`${unidadDe(f).trim().toLowerCase() || "*"}|${iso}`);
  }
  return indice;
}

// true/false según el catálogo; null si el catálogo no está cargado.
export function esFestivoSegunCatalogo(registro, indice) {
  if (!indice) return null;
  const iso = fechaISO(registro?.fecha);
  if (!iso) return null;
  const unidad = unidadDe(registro).trim().toLowerCase();
  return indice.has(`*|${iso}`) || (unidad !== "" && indice.has(`${unidad}|${iso}`));
}

// Aviso cuando lo guardado no coincide con lo que dice la fecha o el catálogo.
export function avisoCalendario(registro, indice) {
  const avisos = [];
  const domingo = esDomingo(registro?.fecha);
  const marcadoDomingo = Boolean(Number(registro?.es_domingo));
  if (domingo != null && domingo !== marcadoDomingo) {
    avisos.push({ campo: "es_domingo", texto: domingo ? "Es domingo pero no está marcado" : "Marcado como domingo pero no lo es" });
  }
  const festivo = esFestivoSegunCatalogo(registro, indice);
  const marcadoFestivo = Boolean(Number(registro?.es_festivo));
  if (festivo === true && !marcadoFestivo) avisos.push({ campo: "es_festivo", texto: "Es festivo según el catálogo pero no está marcado" });
  if (festivo === false && marcadoFestivo) avisos.push({ campo: "es_festivo", texto: "Marcado como festivo pero no está en el catálogo de Festivos" });
  return avisos;
}

// Correcciones que se aplican al editar: domingo siempre según la fecha;
// festivo solo se ACTIVA si el catálogo lo dice (nunca se quita uno puesto a mano).
export function correccionesCalendario(registro, indice) {
  const cambios = {};
  const domingo = esDomingo(registro?.fecha);
  if (domingo != null && domingo !== Boolean(Number(registro?.es_domingo))) cambios.es_domingo = domingo ? 1 : 0;
  if (esFestivoSegunCatalogo(registro, indice) === true && !Number(registro?.es_festivo)) cambios.es_festivo = 1;
  return cambios;
}

// El NIP sirve para checar: en pantalla solo los 2 últimos dígitos.
export function enmascararNip(nip) {
  const s = String(nip ?? "").trim();
  if (!s) return "—";
  return s.length <= 2 ? "••" : `••${s.slice(-2)}`;
}
