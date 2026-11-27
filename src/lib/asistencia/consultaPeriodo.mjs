// Consulta del periodo completo de asistencias con los filtros de la vista.
// La usan las opciones de filtros por columna y Exportar (que debe sacar TODO el
// periodo, no solo la página visible). Sin dependencias para probarla con node:test.

// Valor que usa el selector "Todos los registros" de TablePagination.
export const LIMITE_TODOS = 1000000;

export function parametrosPeriodo(f = {}) {
  const params = new URLSearchParams({
    empresa: String(f.idEmpresa ?? ""),
    fechaInicio: f.fechaInicio || "",
    fechaFin: f.fechaFin || "",
    page: "1",
    limit: "1",
  });
  const agregar = (clave, valor) => {
    if (valor === undefined || valor === null) return;
    if (Array.isArray(valor)) {
      if (valor.length > 0) params.append(clave, JSON.stringify(valor));
      return;
    }
    if (valor !== "") params.append(clave, String(valor));
  };
  agregar("filtroEmpleado", f.filtroEmpleado);
  agregar("filtroDepartamento", f.filtroDepartamento);
  agregar("filtroTipoRegistro", f.filtroTipoRegistro);
  agregar("filtroEstadoAsistencia", f.filtroEstadoAsistencia);
  if (f.soloPresentes) params.append("soloPresentes", "1");
  if (f.soloAusentes) params.append("soloAusentes", "1");
  if (f.horasExtra) params.append("horasExtra", "1");
  if (f.sinGoceDeSueldo) params.append("sinGoceDeSueldo", "0");
  if (f.diasFestivos) params.append("diasFestivos", "1");
  if (f.requiereAutorizacion) params.append("requiereAutorizacion", "1");
  return params;
}

// Pide el total y luego todos los registros. Devuelve { registros, total, completo }.
// `completo` es false si el backend devolvió menos registros de los que reportó.
export async function cargarPeriodoCompleto(fetcher, filtros) {
  if (!filtros?.idEmpresa) return { registros: [], total: 0, completo: true };
  const params = parametrosPeriodo(filtros);
  const conteo = await fetcher(`/checador/asistencias?${params.toString()}`);
  const total = Number(conteo?.total || 0);
  if (total === 0) return { registros: [], total: 0, completo: true };
  params.set("limit", String(total));
  const datos = await fetcher(`/checador/asistencias?${params.toString()}`);
  const registros = Array.isArray(datos?.registros) ? datos.registros : [];
  return { registros, total, completo: registros.length >= total };
}

// (27/11/2026) ¿La respuesta de la tabla ya es TODO el periodo? Con «Todos los registros», o en la primera página
// cuando el total cabe en ella (celular pide páginas de 500 y un día de 200 personas cabe). Entonces las tarjetas,
// los filtros por columna y la matriz usan esas mismas filas y no se descarga el periodo otra vez.
export function tablaTraeTodoElPeriodo(datos, { limit, page } = {}) {
  if (Number(limit) >= LIMITE_TODOS) return true;
  if (!datos || !Array.isArray(datos.registros)) return false;
  const pagina = Number(datos.page ?? page ?? 1);
  if (pagina !== 1) return false;
  const total = Number(datos.total);
  if (!Number.isFinite(total)) return false;
  return datos.registros.length >= total;
}

// Periodo completo en UNA petición cuando ya se sabe que no cabe en la tabla (el total viene en su respuesta):
// pide con el límite de «Todos los registros», el mismo que usa la tabla de escritorio. Exportar sigue con
// cargarPeriodoCompleto (no hay respuesta previa de la que tomar el total).
export async function cargarPeriodoDeUnaVez(fetcher, filtros) {
  if (!filtros?.idEmpresa) return { registros: [], total: 0, completo: true };
  const params = parametrosPeriodo(filtros);
  params.set("limit", String(LIMITE_TODOS));
  const datos = await fetcher(`/checador/asistencias?${params.toString()}`);
  const registros = Array.isArray(datos?.registros) ? datos.registros : [];
  const total = Number(datos?.total ?? registros.length) || 0;
  return { registros, total, completo: registros.length >= total };
}
