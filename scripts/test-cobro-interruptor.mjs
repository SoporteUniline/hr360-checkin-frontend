// Interruptor del cobro de Adamia AI (25/12/2026) · lógica de pantalla (src/lib/ia/creditos.mjs).
// Cliente: mientras el cobro esté apagado (cobro_activo === false) se dice «Gratis por ahora…» en vez de hacer pensar que se
// cobra (indicador del pie de Adamia AI y de Clima, y pantalla de créditos). Administrador: estado efectivo, nota cuando la
// variable del servidor lo fuerza, confirmación escrita ENCENDER, advertencias ordenadas y cuerpo exacto del PUT.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MENSAJE_COBRO_GRATIS, textoIndicador, tonoSaldo, avisoSaldo, cobroGratis, estadoCobro, confirmacionEncender, cuerpoCobro,
  advertenciasOrdenadas, puedeConfirmarCobro, descripcionCambioCobro,
} from "../src/lib/ia/creditos.mjs";

const norm = (s) => String(s).replace(/\s/g, " ");

test("cliente con el cobro apagado: «Gratis por ahora» en el indicador y en la pantalla de créditos", () => {
  assert.equal(MENSAJE_COBRO_GRATIS, "Gratis por ahora: el cobro de Adamia AI aún no está activo");
  const apagado = { disponible: true, cobro_activo: false, saldo_mxn: 0, saldo_bajo: true, sin_creditos: false };
  assert.equal(cobroGratis(apagado), true);
  assert.equal(textoIndicador(apagado), MENSAJE_COBRO_GRATIS, "ya no «Saldo de Adamia AI: $0.00 MXN»");
  assert.equal(tonoSaldo(apagado), "gratis", "ni rojo ni ámbar mientras no se cobra");
  const aviso = avisoSaldo(apagado);
  assert.equal(aviso.tono, "info");
  assert.match(aviso.texto, /^Gratis por ahora: el cobro de Adamia AI aún no está activo/);
  assert.ok(!/bajó del 20 %/.test(aviso.texto), "sin aviso de saldo bajo mientras es gratis");
});

test("cliente con el cobro activo (o sin el dato): se ve el saldo como siempre", () => {
  const activo = { disponible: true, cobro_activo: true, saldo_mxn: 84.2 };
  assert.equal(cobroGratis(activo), false);
  assert.equal(norm(textoIndicador(activo)), "Saldo de Adamia AI: $84.20 MXN");
  assert.equal(tonoSaldo({ ...activo, sin_creditos: true }), "sin");
  assert.equal(cobroGratis({ disponible: true, saldo_mxn: 1 }), false, "sin cobro_activo no se promete que es gratis");
  assert.equal(cobroGratis({ disponible: false, cobro_activo: false }), false, "sin la migración no hay créditos que mostrar");
  assert.equal(textoIndicador({ disponible: false, cobro_activo: false }), null);
});

test("administrador: estado efectivo y nota cuando la variable del servidor manda", () => {
  assert.deepEqual(estadoCobro({ efectivo: true, fuente: "panel", panel: true }), { etiqueta: "Encendido", tono: "encendido", forzado: false, nota: null });
  assert.equal(estadoCobro({ efectivo: false, fuente: "panel", panel: false }).etiqueta, "Apagado");
  const forzado = estadoCobro({ efectivo: false, fuente: "variable", panel: true, variable: "apagado", nota_variable: "La variable del servidor IA_COBRO_CREDITOS lo fuerza APAGADO" });
  assert.deepEqual([forzado.etiqueta, forzado.forzado], ["Apagado", true]);
  assert.match(forzado.nota, /IA_COBRO_CREDITOS/);
  assert.equal(estadoCobro(null), null);
});

test("confirmación escrita: solo ENCENDER (sin importar mayúsculas ni espacios) y motivo de 5 letras", () => {
  assert.equal(confirmacionEncender("ENCENDER"), true);
  assert.equal(confirmacionEncender("  encender "), true);
  assert.equal(confirmacionEncender("ENCENDE"), false);
  assert.equal(confirmacionEncender(""), false);
  assert.equal(puedeConfirmarCobro({ activo: true, confirmar: "ENCENDER", motivo: "Arranque" }), true);
  assert.equal(puedeConfirmarCobro({ activo: true, confirmar: "ENCENDER", motivo: "ok" }), false, "motivo corto");
  assert.equal(puedeConfirmarCobro({ activo: true, confirmar: "si", motivo: "Arranque" }), false);
  assert.equal(puedeConfirmarCobro({ activo: false, confirmar: "", motivo: "Pausa de precios" }), true, "apagar no pide ENCENDER");
  assert.equal(puedeConfirmarCobro({ activo: true, confirmar: "ENCENDER", motivo: "Arranque", bloqueado: true }), false, "sin TC no se puede");
});

test("cuerpo exacto del PUT /admin/cobro", () => {
  assert.deepEqual(cuerpoCobro({ activo: true, confirmar: " encender ", motivo: "  Arranque aprobado  " }), { activo: true, confirmar: "ENCENDER", motivo: "Arranque aprobado" });
  assert.deepEqual(cuerpoCobro({ activo: false, confirmar: "x", motivo: "Pausa por precios" }), { activo: false, motivo: "Pausa por precios" });
});

test("advertencias: primero la que bloquea, luego las que advierten y al final los recordatorios", () => {
  const lista = [
    { codigo: "STRIPE_EVENTOS_ASYNC", nivel: "recordatorio", texto: "r" },
    { codigo: "BIENVENIDA_PENDIENTE", nivel: "advierte", texto: "a" },
    { codigo: "SIN_TIPO_CAMBIO", nivel: "bloquea", texto: "b" },
  ];
  assert.deepEqual(advertenciasOrdenadas(lista).map((x) => x.nivel), ["bloquea", "advierte", "recordatorio"]);
  assert.deepEqual(advertenciasOrdenadas(undefined), []);
});

test("historial: «Encendió» / «Apagó» con quién y motivo", () => {
  assert.equal(descripcionCambioCobro({ de: false, a: true, por: "Admin ADAMIA (#100)", motivo: "Arranque" }), "Encendió · Admin ADAMIA (#100) · Arranque");
  assert.equal(descripcionCambioCobro({ de: true, a: false, por: "Diego", motivo: null }), "Apagó · Diego");
});
