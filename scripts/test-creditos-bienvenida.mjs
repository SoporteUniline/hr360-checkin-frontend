// Crédito de bienvenida y encendido del cobro de Adamia AI (24/12/2026) · lógica de pantalla (src/lib/ia/creditos.mjs).
// Cubre: aviso global de «sin créditos» (402 IA_SIN_CREDITOS) con «Recargar» · pago diferido fallido (OXXO/SPEI) al volver de
// Stripe · monto del regalo en dólares · resumen y cuerpo exacto de la confirmación «Dar crédito de bienvenida a todas».
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EVENTO_SIN_CREDITOS, esSinCreditos, debeAvisarSinCreditos, mensajeRegreso, debeEsperarConfirmacion, bienvenidaUsdDesdeTexto,
  resumenBienvenida, cuerpoBienvenida, tcTexto, RUTA_CREDITOS,
} from "../src/lib/ia/creditos.mjs";

const norm = (s) => String(s).replace(/\s/g, " ");
const sin = (config = {}) => ({ config, response: { status: 402, data: { ok: false, codigo: "IA_SIN_CREDITOS", error: "Sin créditos de Adamia AI. Recarga para seguir usando la IA." } } });

test("402 IA_SIN_CREDITOS desde cualquier pantalla dispara el aviso con «Recargar», salvo opt-out o en la propia pantalla", () => {
  assert.equal(EVENTO_SIN_CREDITOS, "adamia:sin-creditos");
  assert.equal(esSinCreditos(402, { codigo: "IA_SIN_CREDITOS" }), true);
  assert.equal(esSinCreditos(402, { codigo: "OTRO" }), false, "otro 402 (p. ej. de facturación) no");
  assert.equal(esSinCreditos(429, { codigo: "IA_SIN_CREDITOS" }), false);
  assert.equal(debeAvisarSinCreditos(sin(), "/panel/clima"), true);
  assert.equal(debeAvisarSinCreditos(sin({ avisoSinCreditos: false }), "/panel/clima"), false, "Adamia AI ya lo muestra en su lugar");
  assert.equal(debeAvisarSinCreditos(sin(), RUTA_CREDITOS), false, "ya está en la pantalla de recarga");
  assert.equal(debeAvisarSinCreditos({ response: { status: 500 } }, "/panel"), false);
  assert.equal(debeAvisarSinCreditos(undefined, "/panel"), false);
});

test("regreso de Stripe: pago diferido fallido (OXXO/SPEI) se explica y deja de esperar", () => {
  const m = mensajeRegreso({ compra: "ok", folio: 33 }, "fallida");
  assert.equal(m.tono, "alerta");
  assert.match(m.texto, /folio IA-33\) no se completó/);
  assert.match(m.texto, /No se cobró ni se acreditó nada; puedes recargar de nuevo\./);
  assert.equal(debeEsperarConfirmacion({ compra: "ok" }, "fallida"), false);
  assert.match(mensajeRegreso({ compra: "ok", folio: 33 }, "pendiente").texto, /OXXO o por transferencia/);
});

test("monto del crédito de bienvenida en dólares: 0 a 50, hasta 2 decimales", () => {
  assert.equal(bienvenidaUsdDesdeTexto("1"), 1);
  assert.equal(bienvenidaUsdDesdeTexto("US$ 2.50"), 2.5);
  assert.equal(bienvenidaUsdDesdeTexto("0"), 0);
  assert.equal(bienvenidaUsdDesdeTexto(""), null);
  assert.equal(bienvenidaUsdDesdeTexto("1.005"), null);
  assert.equal(bienvenidaUsdDesdeTexto("51"), null);
  assert.equal(bienvenidaUsdDesdeTexto("-1"), null);
});

test("resumen y confirmación: el cuerpo lleva exactamente lo que vio el administrador", () => {
  const v = { disponible: true, listo: true, usd: 1, tipo_cambio: { usd_mxn: 18.4567 }, monto_mxn: 18.46, pendientes: 37, total_mxn: 683.02, motivo: null };
  const r = resumenBienvenida(v);
  assert.equal(norm(r.conversion), "US$1.00 × $18.4567 = $18.46 MXN");
  assert.equal(norm(r.texto), "Se abonarán $18.46 MXN (US$1.00 × $18.4567 = $18.46 MXN) a 37 empresas: total $683.02 MXN. Una sola vez por empresa.");
  assert.deepEqual(cuerpoBienvenida(v), { confirmar: true, usd: 1, tipo_cambio: 18.4567, empresas: 37, total_mxn: 683.02 });
  assert.equal(resumenBienvenida({ ...v, pendientes: 1 }).empresas, "1 empresa");
  const noListo = { disponible: true, listo: false, usd: 1, tipo_cambio: null, pendientes: 4, monto_mxn: 0, total_mxn: 0, motivo: "Registra el tipo de cambio del día antes de regalar." };
  assert.equal(resumenBienvenida(noListo).texto, noListo.motivo);
  assert.equal(resumenBienvenida(noListo).conversion, null);
  assert.equal(resumenBienvenida({ disponible: false }), null);
  assert.equal(norm(tcTexto(20)), "$20.00");
});
