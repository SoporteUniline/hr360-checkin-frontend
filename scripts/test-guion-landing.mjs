// Escenas animadas de la portada (guion.mjs) y sus datos de ejemplo (novedades.mjs): el reloj de pasos, la plática de
// WhatsApp derivada de los mensajes y que lo que se muestra respete lo que WhatsApp y el agente permiten de verdad.
import assert from "node:assert/strict";
import test from "node:test";
import {
  corre, duracionChat, espera, marcasChat, pasoInicial, pasosChat, repetir, siguiente, textoControl, vistaChat,
} from "../src/components/landing/home/guion.mjs";
import { CHAT, CLIMA, FICHA_RH, MURO, TABLERO } from "../src/components/landing/home/novedades.mjs";

test("al hidratar: lo que se ve o no debe moverse queda completo; lo de abajo vuelve al inicio", () => {
  assert.equal(pasoInicial({ total: 9, reducido: true, visible: false }), 9);
  assert.equal(pasoInicial({ total: 9, reducido: false, visible: true }), 9);
  assert.equal(pasoInicial({ total: 9, reducido: false, visible: false }), 0);
});

test("avanza paso a paso, repite pocas vueltas y se queda en el final", () => {
  const cfg = { total: 2, vueltas: 2 };
  assert.deepEqual(siguiente({ paso: 0, vuelta: 0 }, cfg), { paso: 1, vuelta: 0 });
  assert.deepEqual(siguiente({ paso: 2, vuelta: 0 }, cfg), { paso: 0, vuelta: 1 });
  assert.equal(siguiente({ paso: 2, vuelta: 1 }, cfg), null);
  assert.deepEqual(repetir({ vueltas: 3 }), { paso: 0, vuelta: 2 });
  assert.equal(siguiente({ paso: 2, vuelta: 2 }, { total: 2, vueltas: 3 }), null, "«Ver de nuevo» da una sola vuelta");
});

test("esperas: la duración del paso, una base si falta y la pausa larga al final", () => {
  const cfg = { total: 3, duraciones: [100, 200], pausaFinal: 9000 };
  assert.equal(espera(0, cfg), 100);
  assert.equal(espera(2, cfg), 900);
  assert.equal(espera(3, cfg), 9000);
  assert.equal(espera(1, { ...cfg, duraciones: (p) => p * 10 }), 10);
});

test("solo corre si se ve, la pestaña está al frente, nadie la pausó y se permite movimiento", () => {
  assert.equal(corre({ visible: true, pausado: false, reducido: false, oculto: false }), true);
  for (const k of ["pausado", "reducido", "oculto"]) assert.equal(corre({ visible: true, pausado: false, reducido: false, oculto: false, [k]: true }), false);
  assert.equal(corre({ visible: false, pausado: false, reducido: false, oculto: false }), false);
});

test("botón real de control: pausar, reanudar o ver de nuevo; sin botón con reducir movimiento", () => {
  assert.equal(textoControl({ reducido: false, pausado: false, terminado: false }), "Pausar animación");
  assert.equal(textoControl({ reducido: false, pausado: true, terminado: false }), "Reanudar animación");
  assert.equal(textoControl({ reducido: false, pausado: false, terminado: true }), "Ver de nuevo");
  assert.equal(textoControl({ reducido: true, pausado: false, terminado: false }), null);
});

test("chat: «escribiendo…» antes de cada respuesta del agente y el botón se toca antes de la respuesta", () => {
  const msgs = [
    { de: "yo", texto: "Hola" },
    { de: "ia", texto: "¿Aceptas?", botones: ["Acepto", "No acepto"] },
    { de: "yo", toca: "Acepto", texto: "Acepto" },
  ];
  assert.deepEqual(pasosChat(msgs).map((p) => p.tipo), ["msg", "escribe", "msg", "toca", "msg", "lee"]);
  assert.equal(vistaChat(msgs, 2).escribiendo, true);
  assert.equal(vistaChat(msgs, 2).leidoHasta, 0, "al escribir el agente, el «Hola» ya se leyó");
  assert.equal(vistaChat(msgs, 4).tocando, "Acepto");
  assert.ok(vistaChat(msgs, 5).leidoHasta < 2, "la respuesta con botón aún no se lee");
  const fin = vistaChat(msgs, 99);
  assert.equal(fin.completo, true);
  assert.equal(fin.leidoHasta, 2);
  assert.deepEqual([...fin.mostrados].sort(), [0, 1, 2]);
  assert.equal(duracionChat({ tipo: "escribe", i: 1 }, msgs), 1100);
});

test("el guion real termina con todo a la vista, leído y con la ficha de RH completa", () => {
  const total = pasosChat(CHAT.mensajes).length;
  const fin = vistaChat(CHAT.mensajes, total);
  assert.equal(fin.completo, true);
  assert.equal(fin.mostrados.size, CHAT.mensajes.length);
  assert.equal(fin.escribiendo, false);
  const marcas = marcasChat(CHAT.mensajes, fin);
  for (const m of ["aviso", "acepto", "nombre", "califica", "sucursal", "cita", "confirmada"]) assert.ok(marcas.has(m), `marca ${m}`);
  const inicio = marcasChat(CHAT.mensajes, vistaChat(CHAT.mensajes, 0));
  assert.equal(inicio.size, 0);
  // Una vuelta completa dura lo suficiente para leerla, sin hacer esperar de más (entre 30 y 60 s).
  const ms = pasosChat(CHAT.mensajes).reduce((t, p) => t + duracionChat(p, CHAT.mensajes), 0);
  assert.ok(ms > 30_000 && ms < 60_000, `duración del chat ${ms} ms`);
});

test("lo que se ve en el chat es posible en WhatsApp y en el agente de ADAMIA", () => {
  for (const [i, m] of CHAT.mensajes.entries()) {
    if (m.botones) {
      // Botones de respuesta: máximo 3 y 20 caracteres (zernio.js); la respuesta tocada es uno de ellos.
      assert.ok(m.botones.length <= 3, `máximo 3 botones (mensaje ${i})`);
      for (const b of m.botones) assert.ok(b.length <= 20, `«${b}» cabe en 20 caracteres`);
      const resp = CHAT.mensajes[i + 1];
      if (resp?.toca) assert.ok(m.botones.includes(resp.toca), `«${resp.toca}» es un botón del mensaje anterior`);
    }
    if (m.toca) assert.equal(CHAT.mensajes[i - 1].de, "ia", "solo se toca un botón del agente");
  }
  // Aviso de privacidad con los 3 botones de Lumo/ADAMIA antes de cualquier otra cosa del agente.
  const primeraIa = CHAT.mensajes.find((m) => m.de === "ia");
  assert.deepEqual(primeraIa.botones, ["Acepto", "Leer aviso", "No acepto"]);
  assert.match(primeraIa.texto, /aviso-privacidad/);
  // El agente nunca pide CURP, RFC, NSS, datos bancarios ni identificaciones.
  const textoIa = CHAT.mensajes.filter((m) => m.de === "ia").map((m) => m.texto).join(" ");
  assert.doesNotMatch(textoIa, /\b(CURP|RFC|NSS|CLABE|INE)\b|tarjeta|contraseña/i);
});

test("datos de ejemplo: personas ficticias y cifras coherentes", () => {
  const todo = JSON.stringify({ CHAT, CLIMA, FICHA_RH, MURO, TABLERO });
  assert.doesNotMatch(todo, /\b(Diego|Luis)\b/, "sin nombres reales del equipo");
  assert.equal(CLIMA.participacion.pct, Math.round((CLIMA.participacion.contestadas / CLIMA.participacion.invitados) * 100));
  assert.ok(CLIMA.sugerencias.every((s) => CLIMA.dimensiones.some(([d]) => d === s.dimension)), "cada sugerencia es de una dimensión medida");
  assert.ok(MURO.aviso.confirmaron.hasta <= MURO.aviso.confirmaron.de);
  const trabajando = TABLERO.contadores.find((c) => c.clave === "trabajando");
  assert.equal(trabajando.hasta - trabajando.desde, TABLERO.llegadas.length, "cada llegada suma una persona trabajando");
});
