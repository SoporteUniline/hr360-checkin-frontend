// Créditos de Adamia AI · lógica de pantalla (src/lib/ia/creditos.mjs): indicador, avisos, historial, regreso de Stripe,
// vista previa del precio del administrador (misma fórmula que el backend) y validación de formularios.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  textoIndicador, tonoSaldo, avisoSaldo, montoMovimiento, etiquetaTipo, mensajeRegreso, debeEsperarConfirmacion, precioEjemplo,
  validarMovimiento, margenDesdePorcentaje, tcValido, mesesRecientes, nombreMes, mxn, porcentaje, claveFormulario, MENSAJE_SIN_CREDITOS,
} from "../src/lib/ia/creditos.mjs";

const norm = (s) => s.replace(/\s/g, " ");

test("indicador: «Saldo de Adamia AI: $X MXN»; sin migración no se muestra", () => {
  assert.equal(norm(textoIndicador({ disponible: true, saldo_mxn: 1234.5 })), "Saldo de Adamia AI: $1,234.50 MXN");
  assert.equal(norm(textoIndicador({ disponible: true, saldo_mxn: 0 })), "Saldo de Adamia AI: $0.00 MXN");
  assert.equal(textoIndicador({ disponible: false }), null);
  assert.equal(textoIndicador(undefined), null);
});

test("tono y aviso del saldo", () => {
  assert.equal(tonoSaldo({ disponible: true, sin_creditos: true }), "sin");
  assert.equal(tonoSaldo({ disponible: true, saldo_bajo: true }), "bajo");
  assert.equal(tonoSaldo({ disponible: true }), "normal");
  assert.equal(avisoSaldo({ disponible: true, cobro_activo: true, sin_creditos: true }).texto, MENSAJE_SIN_CREDITOS);
  assert.equal(MENSAJE_SIN_CREDITOS, "Sin créditos de Adamia AI. Recarga para seguir usando la IA.");
  assert.match(avisoSaldo({ disponible: true, cobro_activo: true, saldo_bajo: true }).texto, /20 %/);
  assert.equal(avisoSaldo({ disponible: true, cobro_activo: true }), null);
  assert.equal(avisoSaldo({ disponible: true, cobro_activo: false }).tono, "info", "medición: se explica que aún no descuenta");
  assert.equal(avisoSaldo({ disponible: false }), null);
});

test("historial: montos con signo y etiquetas", () => {
  assert.equal(norm(montoMovimiento(500)), "+ $500.00");
  assert.equal(norm(montoMovimiento(-0.07)), "− $0.07");
  assert.equal(norm(montoMovimiento(0)), "$0.00");
  assert.equal(etiquetaTipo("compra"), "Recarga");
  assert.equal(etiquetaTipo("regalo"), "Cortesía de ADAMIA");
  assert.equal(etiquetaTipo("raro"), "raro");
});

test("regreso de Stripe: éxito, en espera, revisión y cancelado", () => {
  assert.equal(mensajeRegreso({}, null), null);
  assert.equal(mensajeRegreso({ compra: "ok", folio: 12 }, "pagada").tono, "exito");
  assert.match(mensajeRegreso({ compra: "ok", folio: 12, simulada: true }, "pagada").texto, /prueba/);
  assert.match(mensajeRegreso({ compra: "ok", folio: 12 }, "pendiente").texto, /confirmando/);
  assert.equal(mensajeRegreso({ compra: "ok", folio: 12 }, "revisar").tono, "alerta");
  assert.match(mensajeRegreso({ compra: "cancelada", folio: 12 }, null).texto, /No se hizo ningún cargo/);
  assert.equal(debeEsperarConfirmacion({ compra: "ok" }, "pendiente"), true);
  assert.equal(debeEsperarConfirmacion({ compra: "ok" }, "pagada"), false);
  assert.equal(debeEsperarConfirmacion({ compra: "cancelada" }, "pendiente"), false);
});

test("vista previa del precio: la fórmula del dueño y el techo al centavo", () => {
  assert.equal(precioEjemplo({ costoUsd: 1, tipoCambio: 20, margen: 0.5 }), 40);
  assert.equal(precioEjemplo({ costoUsd: 0.0017, tipoCambio: 20, margen: 0.5 }), 0.07);
  assert.equal(precioEjemplo({ costoUsd: 0.0017, tipoCambio: 18.5, margen: 0.6 }), 0.08);
  assert.equal(precioEjemplo({ costoUsd: 0.00025, tipoCambio: 20, margen: 0.5 }), 0.01);
  assert.equal(precioEjemplo({ costoUsd: 1, tipoCambio: 20, margen: 1 }), null);
});

test("formulario de regalo/ajuste: motivo obligatorio, signo según el tipo", () => {
  assert.deepEqual(validarMovimiento({ tipo: "regalo", monto: "$1,000", motivo: "Cortesía de arranque" }),
    { ok: true, datos: { tipo: "regalo", monto_mxn: 1000, motivo: "Cortesía de arranque" } });
  assert.equal(validarMovimiento({ tipo: "reembolso", monto: "150", motivo: "Devolución en Stripe" }).datos.monto_mxn, -150);
  assert.equal(validarMovimiento({ tipo: "ajuste", monto: "-20.5", motivo: "Corrección de saldo" }).datos.monto_mxn, -20.5);
  assert.equal(validarMovimiento({ tipo: "regalo", monto: "-5", motivo: "no se puede" }).ok, false);
  assert.equal(validarMovimiento({ tipo: "regalo", monto: "0", motivo: "cero pesos" }).ok, false);
  assert.equal(validarMovimiento({ tipo: "regalo", monto: "10", motivo: "x" }).ok, false);
  assert.equal(validarMovimiento({ tipo: "otro", monto: "10", motivo: "motivo largo" }).ok, false);
});

test("margen en porcentaje, tipo de cambio, meses y formato", () => {
  assert.equal(margenDesdePorcentaje("50"), 0.5);
  assert.equal(margenDesdePorcentaje("62.5 %"), 0.625);
  assert.equal(margenDesdePorcentaje("95"), null);
  assert.equal(margenDesdePorcentaje("abc"), null);
  assert.equal(tcValido("$18.4567"), 18.4567);
  assert.equal(tcValido("0"), null);
  assert.deepEqual(mesesRecientes(new Date(Date.UTC(2026, 0, 15)), 3), ["2026-01", "2025-12", "2025-11"]);
  assert.equal(nombreMes("2026-11"), "noviembre 2026");
  assert.equal(norm(mxn(46.4)), "$46.40");
  assert.equal(porcentaje(0.5), "50 %");
  assert.match(claveFormulario(), /^[\w-]{8,80}$/);
});
