// Candidato de WhatsApp en el proceso de selección (04/12/2026): etapas rápidas, sugerencia, aviso por WhatsApp (texto
// prellenado y ventana de 24 h), atajos de teclado y filtro de la bandeja. Uso: node --test scripts/test-proceso-whatsapp.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ETAPAS_RAPIDAS, acciones, atajo, avisoValido, cerrada, cuerpoAviso, modoAviso, paramsEtapa, siguienteEtapa, textoAtajo, textoAviso,
  textoEtapa, textoSugerencia, FILTROS_ETAPA,
} from "../src/lib/reclutamiento/procesoWhatsapp.mjs";

test("etapas: selector rápido, siguiente y acciones permitidas", () => {
  assert.deepEqual(ETAPAS_RAPIDAS, ["nuevo", "revision", "entrevista", "oferta"]);
  assert.equal(siguienteEtapa("nuevo"), "revision");
  assert.equal(siguienteEtapa("entrevista"), "oferta");
  assert.equal(siguienteEtapa("oferta"), null, "desde Oferta sigue Contratar");
  assert.equal(siguienteEtapa("descartado"), null);
  assert.deepEqual(acciones("contratado"), { mover: false, descartar: false, contratar: false, reabrir: false });
  assert.equal(acciones("descartado").reabrir, true);
  assert.equal(acciones("revision").contratar, true);
  assert.equal(cerrada("contratado") && cerrada("descartado") && !cerrada("oferta"), true);
  assert.equal(textoEtapa("revision"), "En revisión");
  assert.equal(textoEtapa("otra"), "Sin proceso");
});

test("sugerencia del agente: texto del botón de un clic", () => {
  assert.equal(textoSugerencia({ etapa: "entrevista" }), "El agente sugiere pasar a «Entrevista»");
  assert.equal(textoSugerencia(null), null);
  assert.equal(textoSugerencia({ etapa: "inventada" }), null);
});

test("aviso por WhatsApp: texto prellenado por tipo, ventana de 24 h y plantilla", () => {
  const datos = { nombre: "Mario Soto Ruiz", vacante: "Chofer", empresa: "Empacadora", fechaIngreso: "2026-12-15", sucursal: "Centro" };
  const c = textoAviso("contratado", datos);
  assert.match(c, /^¡Hola, Mario!/);
  assert.match(c, /«Chofer» en Empacadora/);
  assert.match(c, /martes, 15 de diciembre en la sucursal Centro/);
  assert.match(textoAviso("oferta", datos), /queremos ofrecerte el puesto de «Chofer»/);
  assert.match(textoAviso("descartado", { vacante: "Chofer" }), /^¡Hola! Gracias por tu interés en «Chofer»/);
  assert.doesNotMatch(textoAviso("contratado", { nombre: "Ana" }), /fecha de ingreso/, "sin fecha no la inventa");
  assert.equal(textoAviso("otro"), "");
  assert.equal(modoAviso({ ventanaAbierta: true, plantilla: "x" }).via, "texto");
  assert.equal(modoAviso({ ventanaAbierta: false, plantilla: "seguimiento_rh" }).via, "plantilla");
  assert.match(modoAviso({ ventanaAbierta: false, plantilla: "seguimiento_rh" }).nota, /«seguimiento_rh»/);
  assert.equal(modoAviso({ ventanaAbierta: false, plantilla: null }).via, null);
  assert.deepEqual(cuerpoAviso({ tipo: "oferta", texto: "  Hola ", via: "texto" }), { tipo: "oferta", texto: "Hola", confirmado: true });
  assert.deepEqual(cuerpoAviso({ tipo: "contratado", texto: "x", via: "plantilla" }), { tipo: "contratado", via: "plantilla", confirmado: true }, "con plantilla no va texto libre");
  assert.equal(avisoValido({ via: "texto", texto: "  " }), false);
  assert.equal(avisoValido({ via: "texto", texto: "a".repeat(4097) }), false);
  assert.equal(avisoValido({ via: "plantilla" }), true);
  assert.equal(avisoValido({ via: null, texto: "hola" }), false);
});

test("atajos: Alt+Mayús+letra, nunca mientras se escribe ni con Ctrl/Cmd", () => {
  const k = (code, extra = {}) => atajo({ code, altKey: true, shiftKey: true, ...extra });
  assert.equal(k("KeyE"), "siguiente");
  assert.equal(k("KeyN"), "nota");
  assert.equal(k("KeyA"), "sugerencia");
  assert.equal(k("KeyC"), "contratar");
  assert.equal(k("KeyD"), "descartar");
  assert.equal(k("KeyZ"), null);
  assert.equal(k("KeyC", { enCampo: true }), null, "en el cuadro del chat no");
  assert.equal(k("KeyC", { ctrlKey: true }), null);
  assert.equal(atajo({ code: "KeyC", altKey: true }), null, "sin Mayús no");
  assert.equal(textoAtajo("contratar"), "Alt+Mayús+C");
});

test("bandeja: filtro por etapa", () => {
  assert.deepEqual(paramsEtapa("entrevista"), { etapa: "entrevista" });
  assert.deepEqual(paramsEtapa(""), {});
  assert.deepEqual(paramsEtapa("inventada"), {});
  assert.equal(FILTROS_ETAPA[0].valor, "");
  assert.equal(FILTROS_ETAPA.length, 7);
});
