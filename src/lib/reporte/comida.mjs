// (23/11/2026) Comida checada con «Salir a comer» en Asistencias y en el reporte de horas (pantalla, Excel y PDF).
// La comida llega del servidor como { salida, regreso, minutos, minutos_programados, excedente } (horas «AAAA-MM-DD HH:mm:ss»).

const hhmm = (valor) => {
  const m = String(valor || "").match(/(\d{2}):(\d{2})/);
  if (!m) return "";
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "a.m." : "p.m."}`;
};

// Texto corto de una comida del día. Sin comida checada → "" (la columna queda vacía).
export function textoComida(comida, formatoHora = hhmm) {
  if (!comida?.salida) return "";
  const horas = `${formatoHora(comida.salida)}–${comida.regreso ? formatoHora(comida.regreso) : "…"}`;
  if (comida.minutos == null) return `${horas} · en comida`;
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
