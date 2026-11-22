// Asistencias → En vivo (22/11/2026): quién está por entrar, en jornada, por salir y quién ya salió, a esta hora.
// Función pura: recibe minutos del día ya en la zona de la empresa (0–1439) y la hora actual en minutos.
// Turno nocturno: si la salida programada es antes que la entrada, la salida es al día siguiente (+1440).
// Probado en scripts/test-en-vivo.mjs.

export const VENTANA = 60; // «pronto» = dentro de la próxima hora
export const TOLERANCIA_SALIDA = 15; // minutos después de su salida antes de avisar «no ha checado salida»

// fila: { id, entradaProg, salidaProg, entrada, salida, descanso, llegaHasta }
export function clasificarEnVivo(filas, ahora, { ventana = VENTANA } = {}) {
  const g = { porEntrar: [], tarde: [], enJornada: [], porSalir: [], debioSalir: [], salieron: [], noVino: [], masTarde: [], descanso: [] };
  for (const f of filas) {
    const tieneHorario = f.entradaProg != null && f.salidaProg != null;
    let salidaProg = f.salidaProg;
    if (tieneHorario && salidaProg <= f.entradaProg) salidaProg += 1440;
    const entradaEsperada = f.llegaHasta ?? f.entradaProg;
    if (f.entrada != null && f.salida != null) { g.salieron.push({ ...f, minutos: null }); continue; }
    if (f.entrada != null) {
      if (!tieneHorario) { g.enJornada.push({ ...f, faltan: null }); continue; }
      // Entró antes de medianoche en turno nocturno: la hora actual de madrugada cuenta como del día siguiente.
      const ahoraTurno = salidaProg > 1440 && ahora < f.entradaProg && f.entrada >= f.entradaProg - 240 ? ahora + 1440 : ahora;
      const faltan = salidaProg - ahoraTurno;
      if (faltan < -TOLERANCIA_SALIDA) g.debioSalir.push({ ...f, faltan });
      else if (faltan <= ventana) g.porSalir.push({ ...f, faltan });
      else g.enJornada.push({ ...f, faltan });
      continue;
    }
    if (f.descanso || !tieneHorario) { g.descanso.push(f); continue; }
    const faltaParaEntrar = entradaEsperada - ahora;
    if (ahora >= salidaProg) g.noVino.push({ ...f, faltan: faltaParaEntrar });
    else if (faltaParaEntrar < 0) g.tarde.push({ ...f, faltan: faltaParaEntrar });
    else if (faltaParaEntrar <= ventana) g.porEntrar.push({ ...f, faltan: faltaParaEntrar });
    else g.masTarde.push({ ...f, faltan: faltaParaEntrar });
  }
  const orden = (a, b) => (a.faltan ?? 0) - (b.faltan ?? 0);
  for (const k of Object.keys(g)) g[k].sort(orden);
  return g;
}

// «HH:MM[:SS]» → minutos del día (o null).
export function aMinutos(hora) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hora ?? ""));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

// «en 25 min», «en 1 h 10 min», «hace 12 min».
export function relativo(min) {
  if (min == null) return "";
  const a = Math.abs(Math.round(min));
  const t = a < 60 ? `${a} min` : `${Math.floor(a / 60)} h${a % 60 ? ` ${a % 60} min` : ""}`;
  return min >= 0 ? `en ${t}` : `hace ${t}`;
}
