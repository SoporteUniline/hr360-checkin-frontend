// (23/11/2026) Comida checada con «Salir a comer» en Asistencias y en el reporte de horas (pantalla, Excel y PDF).
// La comida llega del servidor como { salida, regreso, minutos, minutos_programados, excedente } (horas «AAAA-MM-DD HH:mm:ss»).

const hhmm = (valor) => {
  const m = String(valor || "").match(/(\d{2}):(\d{2})/);
  if (!m) return "";
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "a.m." : "p.m."}`;
};

// Minutos absolutos de una hora «AAAA-MM-DD HH:mm(:ss)» (misma escala para la checada y para «ahora»).
const minutosDe = (valor) => {
  const m = String(valor || "").match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  return m ? Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) / 60000) : null;
};

// «Ahora» en la hora de la base (Ciudad de México), en la misma escala que minutosDe.
export function ahoraBase(fecha = new Date(), zona = "America/Mexico_City") {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(fecha).map((x) => [x.type, x.value]));
  return minutosDe(`${p.year}-${p.month}-${p.day} ${String(Number(p.hour) % 24).padStart(2, "0")}:${p.minute}`);
}

// (23/11/2026, pedido del dueño) Comida abierta (salió a comer y no ha regresado): cuánto lleva y si ya se pasó de su
// tiempo. → null si no está en comida. `ahora` en minutos (ahoraBase()).
export function comidaEnCurso(comida, ahora) {
  if (!comida?.salida || comida.regreso || ahora == null) return null;
  const salida = minutosDe(comida.salida);
  if (salida == null) return null;
  const lleva = Math.max(0, ahora - salida);
  const programados = Number(comida.minutos_programados) || null;
  return { lleva, programados, excedente: programados ? Math.max(0, lleva - programados) : 0 };
}

// ¿Se pasó de su tiempo de comida? (cerrada con excedente, o abierta y ya rebasó su tiempo).
export function comidaExcedida(comida, ahora) {
  if (comida?.excedente > 0) return true;
  return (comidaEnCurso(comida, ahora)?.excedente ?? 0) > 0;
}

// Texto corto de una comida del día. Sin comida checada → "" (la columna queda vacía).
// `ahora` (opcional, ahoraBase()): con la comida abierta dice cuánto lleva y cuánto se ha pasado.
export function textoComida(comida, formatoHora = hhmm, ahora = null) {
  if (!comida?.salida) return "";
  const horas = `${formatoHora(comida.salida)}–${comida.regreso ? formatoHora(comida.regreso) : "…"}`;
  if (comida.minutos == null) {
    const c = comidaEnCurso(comida, ahora);
    if (!c) return `${horas} · en comida`;
    if (c.excedente > 0) return `${horas} · en comida · ⚠ se pasó ${c.excedente} min`;
    return `${horas} · en comida · lleva ${c.lleva}${c.programados ? ` de ${c.programados}` : ""} min`;
  }
  const de = comida.minutos_programados ? ` de ${comida.minutos_programados}` : "";
  const pasado = comida.excedente > 0 ? ` · +${comida.excedente} min` : "";
  return `${horas} · ${comida.minutos}${de} min${pasado}`;
}

// Resumen del periodo: «3:15 h» (o «50 min») y «se pasó 2 veces (+12 min)».
export function resumenComida(resumen) {
  const r = resumen || {};
  const total = Number(r.minutos) || 0;
  const valor = total >= 60 ? `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")} h` : `${total} min`;
  const veces = Number(r.veces_excedio) || 0;
  const detalle = veces ? `se pasó ${veces} ${veces === 1 ? "vez" : "veces"} (+${Number(r.minutos_excedidos) || 0} min)` : r.dias ? "a tiempo" : "sin comida checada";
  return { valor, detalle, excedio: veces > 0 };
}
