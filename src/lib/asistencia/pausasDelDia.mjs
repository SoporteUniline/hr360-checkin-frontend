// (23/11/2026, pedido del dueño) Ventana del día: ver fácil cuál hueco entre checadas fue la COMIDA.
// Entre dos tramos del reloj hay una pausa; es «comida» si la salida del tramo se marcó con «Salir a comer»
// (tipo_cierre = 'comida') o coincide con la salida de la comida checada del día. Si la persona sigue comiendo (el tramo
// de comida es el último y no ha regresado), la pausa queda abierta y cuenta hasta «ahora».
// aMin(valor) → minutos absolutos de una hora del registro (la vista la arma con su zona); ahora en la misma escala.
const efectiva = (c, campo) => c?.[`${campo}_corregida`] || c?.[campo] || null;

export function pausasDelDia(tramos, { comida = null, minutosComida = null, aMin, ahora = null } = {}) {
  if (!Array.isArray(tramos) || typeof aMin !== "function") return [];
  const salidaComida = comida?.salida ? aMin(comida.salida) : null;
  const esDeComida = (c) => {
    if (c?.tipo_cierre === "comida") return true;
    const s = efectiva(c, "salida");
    return salidaComida != null && s != null && Math.abs(aMin(s) - salidaComida) <= 1;
  };
  const programados = Number(minutosComida) > 0 ? Number(minutosComida) : null;
  const pausas = [];
  let yaHayComida = false;
  tramos.forEach((c, i) => {
    const salida = efectiva(c, "salida");
    if (!salida) return;
    const siguiente = tramos[i + 1];
    const regreso = siguiente ? efectiva(siguiente, "entrada") : null;
    const comidaAqui = !yaHayComida && esDeComida(c);
    if (!regreso && !comidaAqui) return; // última salida del día: no es pausa
    if (comidaAqui) yaHayComida = true;
    const desde = aMin(salida);
    const hasta = regreso ? aMin(regreso) : ahora;
    const minutos = desde != null && hasta != null ? Math.max(0, hasta - desde) : null;
    pausas.push({
      despuesDe: i, desde: salida, hasta: regreso, esComida: comidaAqui, enCurso: comidaAqui && !regreso, minutos,
      programados: comidaAqui ? programados : null,
      excedente: comidaAqui && programados && minutos != null ? Math.max(0, minutos - programados) : 0,
    });
  });
  return pausas;
}
