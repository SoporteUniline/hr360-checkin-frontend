// Consulta del periodo completo de asistencias con los filtros de la vista.
// La usan las opciones de filtros por columna y Exportar (que debe sacar TODO el
// periodo, no solo la página visible). Sin dependencias para probarla con node:test.

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
