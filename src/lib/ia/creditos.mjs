// Créditos de Adamia AI (25/11/2026) · lógica de pantalla sin React (se prueba con node --test, scripts/test-creditos-ia.mjs).
// El servidor manda; aquí solo se da formato, se decide qué aviso mostrar y se validan los formularios antes de enviarlos.
// Fórmula (la autoridad es el backend, services/ia/cobro.js): precio = costo_usd × tipo_cambio ÷ (1 − margen), techo al centavo.

const FORMATO_MXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const FORMATO_USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 });

export const RUTA_CREDITOS = "/panel/creditos-ia";
export const MENSAJE_SIN_CREDITOS = "Sin créditos de Adamia AI. Recarga para seguir usando la IA.";
// (25/12/2026) Mientras el administrador no encienda el cobro (interruptor del panel), no se hace pensar que se cobra.
export const MENSAJE_COBRO_GRATIS = "Gratis por ahora: el cobro de Adamia AI aún no está activo";
// Solo con el dato explícito del servidor (cobro_activo === false): si falta, no se promete que es gratis.
export const cobroGratis = (creditos) => Boolean(creditos?.disponible) && creditos.cobro_activo === false;

export const mxn = (v) => FORMATO_MXN.format(Number(v) || 0);
export const usd = (v) => FORMATO_USD.format(Number(v) || 0);
export const porcentaje = (m) => `${Math.round((Number(m) || 0) * 1000) / 10} %`;

// Texto del indicador (reemplaza «Uso de Adamia AI este mes: … USD»). null = no hay créditos (sin la migración).
export function textoIndicador(creditos) {
  if (!creditos?.disponible) return null;
  if (cobroGratis(creditos)) return MENSAJE_COBRO_GRATIS;
  return `Saldo de Adamia AI: ${mxn(creditos.saldo_mxn)} MXN`;
}

// Tono del saldo para el indicador y la pantalla: gratis (cobro apagado), sin (rojo), bajo (ámbar) o normal.
export function tonoSaldo(creditos) {
  if (!creditos?.disponible) return "normal";
  if (cobroGratis(creditos)) return "gratis";
  if (creditos.sin_creditos) return "sin";
  if (creditos.saldo_bajo) return "bajo";
  return "normal";
}

export function avisoSaldo(creditos) {
  const tono = tonoSaldo(creditos);
  if (tono === "gratis") return { tono: "info", texto: `${MENSAJE_COBRO_GRATIS}. Tus consultas no descuentan saldo; aquí ves cuánto costaría cada una.` };
  if (tono === "sin") return { tono, texto: MENSAJE_SIN_CREDITOS };
  if (tono === "bajo") return { tono, texto: "Tu saldo bajó del 20 % de tu última recarga. Recarga para no quedarte sin Adamia AI." };
  return null;
}

const TIPOS = {
  compra: { etiqueta: "Recarga", signo: "+" },
  regalo: { etiqueta: "Cortesía de ADAMIA", signo: "+" },
  ajuste: { etiqueta: "Ajuste", signo: "" },
  reembolso: { etiqueta: "Reembolso", signo: "−" },
  consumo: { etiqueta: "Consumo", signo: "−" },
};
export const etiquetaTipo = (tipo) => TIPOS[tipo]?.etiqueta ?? tipo;

// Monto con signo para el historial: «+ $500.00», «− $0.07».
export function montoMovimiento(monto) {
  const n = Number(monto) || 0;
  return `${n > 0 ? "+" : n < 0 ? "−" : ""} ${mxn(Math.abs(n))}`.trim();
}

// Mensaje al volver de Stripe (?compra=ok|cancelada) según el estado que reporta el servidor de esa compra.
export function mensajeRegreso({ compra, folio, simulada }, estadoServidor) {
  if (!compra) return null;
  if (compra === "cancelada") return { tono: "info", texto: "Cancelaste el pago. No se hizo ningún cargo." };
  if (compra !== "ok") return null;
  if (estadoServidor === "pagada") return { tono: "exito", texto: `¡Listo! Tu recarga (folio IA-${folio}) ya está en tu saldo.${simulada ? " (Compra de prueba: no se cobró nada.)" : ""}` };
  if (estadoServidor === "revisar" || estadoServidor === "error") return { tono: "alerta", texto: `Tu pago (folio IA-${folio}) quedó en revisión. Escríbenos y lo resolvemos.` };
  // (24/12/2026) Pago diferido (OXXO / transferencia) que venció o se rechazó: Stripe avisa con async_payment_failed.
  if (estadoServidor === "fallida") return { tono: "alerta", texto: `Tu pago (folio IA-${folio}) no se completó: la ficha de OXXO o la transferencia venció o fue rechazada. No se cobró ni se acreditó nada; puedes recargar de nuevo.` };
  return { tono: "info", texto: `Estamos confirmando tu pago con el banco (folio IA-${folio}). Tu saldo se actualiza en cuanto llegue. Si pagas en OXXO o por transferencia, puede tardar hasta que se refleje tu pago.` };
}

// Mientras el pago no se confirma (webhook), la pantalla vuelve a preguntar unas veces.
export const debeEsperarConfirmacion = (regreso, estadoServidor) => regreso?.compra === "ok" && !["pagada", "revisar", "error", "fallida"].includes(estadoServidor);

// (24/12/2026) Sin créditos (402 IA_SIN_CREDITOS) desde CUALQUIER pantalla con IA (Ley, Clima, plantillas, desempeño,
// sugerencias de WhatsApp…): lib/axios avisa con este evento y components/ia/AvisoSinCreditos muestra «Recargar créditos».
// Una pantalla que ya lo muestra en su lugar (Adamia AI) manda { avisoSinCreditos: false } en la petición.
export const EVENTO_SIN_CREDITOS = "adamia:sin-creditos";
export const esSinCreditos = (status, data) => Number(status) === 402 && data?.codigo === "IA_SIN_CREDITOS";
export function debeAvisarSinCreditos(error, rutaActual = "") {
  const r = error?.response;
  if (!esSinCreditos(r?.status, r?.data)) return false;
  if (error?.config?.avisoSinCreditos === false) return false;
  return !String(rutaActual).startsWith(RUTA_CREDITOS);
}

// ---------------------------------------------------------------- Crédito de bienvenida (panel del administrador)
// Monto en dólares: 0 (apagado) a 50, hasta 2 decimales (misma regla que el servidor, services/ia/cobro.js). null = inválido.
export function bienvenidaUsdDesdeTexto(texto) {
  const limpio = String(texto ?? "").replace(/[$\s]|US|USD/gi, "");
  if (limpio === "") return null;
  const n = Number(limpio);
  if (!Number.isFinite(n) || n < 0 || n > 50) return null;
  if (Math.abs(Math.round(n * 100) - n * 100) > 1e-6) return null;
  return Math.round(n * 100) / 100;
}

const FORMATO_TC = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 4 });
export const tcTexto = (v) => FORMATO_TC.format(Number(v) || 0);

// Resumen que el administrador confirma antes de abonar a todas las empresas pendientes.
export function resumenBienvenida(v) {
  if (!v?.disponible) return null;
  const empresas = `${v.pendientes} ${v.pendientes === 1 ? "empresa" : "empresas"}`;
  const conversion = v.tipo_cambio ? `US$${Number(v.usd).toFixed(2)} × ${tcTexto(v.tipo_cambio.usd_mxn)} = ${mxn(v.monto_mxn)} MXN` : null;
  return {
    empresas,
    conversion,
    texto: v.listo ? `Se abonarán ${mxn(v.monto_mxn)} MXN (${conversion}) a ${empresas}: total ${mxn(v.total_mxn)} MXN. Una sola vez por empresa.` : v.motivo,
  };
}

// Cuerpo exacto de la confirmación: el servidor lo compara con su propia vista previa (si algo cambió, responde 409).
export const cuerpoBienvenida = (v) => ({ confirmar: true, usd: v.usd, tipo_cambio: v.tipo_cambio?.usd_mxn, empresas: v.pendientes, total_mxn: v.total_mxn });

// Vista previa del precio en el panel del administrador (misma fórmula, techo al centavo).
export function precioEjemplo({ costoUsd, tipoCambio, margen }) {
  const c = Math.round(Number(costoUsd) * 1e6);
  const t = Math.round(Number(tipoCambio) * 1e4);
  const m = Math.round(Number(margen) * 1e4);
  if (!(c >= 0) || !(t > 0) || !(m >= 0 && m < 10000)) return null;
  const num = BigInt(c) * BigInt(t) * 100n;
  const den = 1000000n * BigInt(10000 - m);
  return Number((num + den - 1n) / den) / 100;
}

// Formulario de regalo/ajuste del administrador. Devuelve { ok, error, datos }.
export function validarMovimiento({ tipo, monto, motivo }) {
  const n = Math.round(Number(String(monto ?? "").replace(/[$,\s]/g, "")) * 100) / 100;
  if (!["regalo", "ajuste", "reembolso"].includes(tipo)) return { ok: false, error: "Elige el tipo." };
  if (!Number.isFinite(n) || n === 0) return { ok: false, error: "Escribe un monto distinto de cero." };
  if (Math.abs(n) > 100000) return { ok: false, error: "El monto máximo es $100,000." };
  if (tipo === "regalo" && n < 0) return { ok: false, error: "Un regalo suma créditos: usa un monto positivo." };
  const final = tipo === "reembolso" ? -Math.abs(n) : n;
  const m = String(motivo ?? "").trim();
  if (m.length < 5) return { ok: false, error: "Escribe el motivo (lo ve el cliente en su historial)." };
  return { ok: true, datos: { tipo, monto_mxn: final, motivo: m.slice(0, 300) } };
}

// Margen capturado en porcentaje («50» o «50 %») → fracción para el servidor (0.5). null = inválido.
export function margenDesdePorcentaje(texto) {
  const n = Number(String(texto ?? "").replace(/[%\s]/g, ""));
  if (!Number.isFinite(n) || n < 0 || n > 90) return null;
  return Math.round(n * 100) / 10000;
}

export const tcValido = (texto) => {
  const n = Number(String(texto ?? "").replace(/[$\s]/g, ""));
  return Number.isFinite(n) && n >= 1 && n <= 100 ? Math.round(n * 1e4) / 1e4 : null;
};

// Mes actual y anteriores para el selector del administrador (AAAA-MM, en UTC como el servidor).
export function mesesRecientes(ahora = new Date(), cuantos = 6) {
  const out = [];
  for (let i = 0; i < cuantos; i++) {
    const d = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const nombreMes = (aaaamm) => {
  const [a, m] = String(aaaamm ?? "").split("-").map(Number);
  return MESES[m - 1] ? `${MESES[m - 1]} ${a}` : String(aaaamm ?? "");
};

// Clave única por formulario abierto (idempotencia del regalo/ajuste ante doble clic o reintento).
export const claveFormulario = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`).replace(/[^\w-]/g, "");

// ---------------------------------------------------------------- Interruptor del cobro (panel del administrador, 25/12/2026)
// La autoridad es el servidor (services/ia/interruptorCobro.js): IA_COBRO_CREDITOS=false lo apaga siempre, =true lo enciende,
// sin la variable manda el panel. Aquí solo se presenta el estado y se arma la confirmación.
export const CONFIRMACION_ENCENDER = "ENCENDER";
export function estadoCobro(e) {
  if (!e) return null;
  const forzado = e.fuente === "variable";
  return { etiqueta: e.efectivo ? "Encendido" : "Apagado", tono: e.efectivo ? "encendido" : "apagado", forzado, nota: forzado ? (e.nota_variable ?? null) : null };
}
export const confirmacionEncender = (texto) => String(texto ?? "").trim().toUpperCase() === CONFIRMACION_ENCENDER;
const motivoLimpio = (m) => String(m ?? "").trim().slice(0, 300);
export function puedeConfirmarCobro({ activo, confirmar, motivo, bloqueado = false }) {
  if (motivoLimpio(motivo).length < 5) return false;
  if (!activo) return true;
  return !bloqueado && confirmacionEncender(confirmar);
}
// Cuerpo exacto del PUT /checador/ia/admin/cobro.
export function cuerpoCobro({ activo, confirmar, motivo }) {
  return activo ? { activo: true, confirmar: confirmacionEncender(confirmar) ? CONFIRMACION_ENCENDER : String(confirmar ?? "").trim(), motivo: motivoLimpio(motivo) }
    : { activo: false, motivo: motivoLimpio(motivo) };
}
const ORDEN_NIVEL = { bloquea: 0, advierte: 1, recordatorio: 2 };
export const advertenciasOrdenadas = (lista) => [...(lista ?? [])].sort((a, b) => (ORDEN_NIVEL[a.nivel] ?? 3) - (ORDEN_NIVEL[b.nivel] ?? 3));
export const descripcionCambioCobro = (h) => [h.a ? "Encendió" : "Apagó", h.por, h.motivo].filter(Boolean).join(" · ");
