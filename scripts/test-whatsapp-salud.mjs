// Pruebas de la lógica pura de «Salud del agente» y cobro (P7). Uso: node --test scripts/test-whatsapp-salud.mjs
import assert from "node:assert/strict";
import test from "node:test";
import {
  TITULO_TIPO, textoError, tonoSeveridad, formatoMs, formatoUsd, formatoPct, fechaCorta, fechaLarga, haceCuanto, avisoBandeja, tarjetasResumen,
  escalaEje, datosGrafica, rangoUltimosDias, semaforo, ordenarEmpresas,
} from "../src/lib/whatsapp/salud.mjs";

test("errores en lenguaje claro, sin códigos crudos", () => {
  assert.equal(
    textoError({ tipo: "turno_fallido", mensaje: "El agente no pudo contestar: IA_ERROR: 500 The model is overloaded. Please try again later." }),
    "La IA no respondió (Google devolvió: The model is overloaded. Please try again later.)",
  );
  assert.equal(textoError({ tipo: "turno_fallido", mensaje: "El agente no pudo contestar: IA_ERROR: 404" }), "La IA no respondió (Google devolvió el error 404)");
  assert.equal(textoError({ tipo: "turno_fallido", mensaje: "El agente no pudo contestar: IA_SIN_SALDO" }), "La IA no respondió: la IA se quedó sin saldo con el proveedor");
  assert.equal(textoError({ tipo: "turno_fallido", mensaje: "El turno se quedó atorado en «procesando» y ya no se reintenta." }), "El mensaje se quedó atorado y el agente ya no lo reintentó");
  assert.equal(textoError({ tipo: "herramienta_fallida", mensaje: "La herramienta agendar_entrevista falló: ER_LOCK_WAIT" }), "El agente no pudo agendar la entrevista");
  assert.equal(textoError({ tipo: "herramienta_fallida", mensaje: "La herramienta rara falló: x" }), TITULO_TIPO.herramienta_fallida);
  assert.equal(textoError({ tipo: "envio_fallido", mensaje: "Zernio no entregó el archivo: Zernio respondió 400: número no válido" }), "WhatsApp no entregó un archivo (respuesta: Zernio respondió 400: número no válido)");
  assert.equal(textoError({ tipo: "modelo_respaldo", mensaje: "Se usó el modelo de respaldo gemini-2.5-flash (gemini-3 respondió 404 not found)." }), "La IA principal falló y contestó la de respaldo (gemini-2.5-flash)");
  assert.equal(textoError({ tipo: "tope_mes", mensaje: "x" }), "Se alcanzó el tope mensual de gasto de IA");
  assert.equal(textoError({ tipo: "desconocido", mensaje: "" }), "Algo falló en el agente");
  for (const tipo of Object.keys(TITULO_TIPO)) assert.doesNotMatch(textoError({ tipo, mensaje: "IA_ERROR: 500 x" }), /IA_[A-Z]|ER_/, tipo);
  assert.deepEqual(["error", "aviso", "info"].map(tonoSeveridad), ["rojo", "ambar", "gris"]);
});

test("formatos de tiempo, dinero, porcentaje y fechas", () => {
  assert.deepEqual([formatoMs(450), formatoMs(1250), formatoMs(95000), formatoMs(null)], ["450 ms", "1.3 s", "1.6 min", "—"]);
  assert.equal(formatoUsd(0.0123), "0.0123 USD");
  assert.equal(formatoUsd(12.5), "12.50 USD");
  assert.equal(formatoUsd(undefined), "—");
  assert.deepEqual([formatoPct(95.2), formatoPct(null)], ["95.2 %", "—"]);
  assert.equal(fechaCorta("2026-11-23"), "23 nov");
  assert.equal(fechaLarga("2026-11-23"), "lunes 23 de noviembre");
  const ahora = new Date("2026-11-23T18:00:00Z"); // 12:00 en la Ciudad de México
  assert.equal(haceCuanto("2026-11-23 11:55:00.000", ahora), "hace 5 min");
  assert.equal(haceCuanto("2026-11-23 09:00:00", ahora), "hace 3 h");
  assert.equal(haceCuanto("2026-11-20 09:00:00", ahora), "el 20 nov");
  assert.equal(haceCuanto(null, ahora), "");
});

test("aviso de la bandeja solo si el estado no es ok", () => {
  assert.equal(avisoBandeja(null), null);
  assert.equal(avisoBandeja({ estado: "ok", fallas_24h: 0 }), null);
  assert.deepEqual(avisoBandeja({ estado: "error", fallas_24h: 3 }), { texto: "El agente falló 3 veces en las últimas 24 h", tono: "rojo" });
  assert.deepEqual(avisoBandeja({ estado: "aviso", fallas_24h: 1 }), { texto: "El agente falló 1 vez en las últimas 24 h", tono: "ambar" });
  assert.equal(avisoBandeja({ estado: "aviso", fallas_24h: 0 }).texto, "El agente tuvo avisos en las últimas 24 h");
});

test("tarjetas del resumen", () => {
  const t = tarjetasResumen({ turnos: 22, respondidos: 19, pasos_persona: 1, fallidos: 1, sin_respuesta: 0, topes: 0, cancelados: 1, pct_respondidos: 95.2,
    latencia_p50_ms: 1000, latencia_p95_ms: 1900, costo_usd: 0.02, costo_mes_usd: 1.5 });
  assert.deepEqual(t.map((x) => x.clave), ["respondidos", "fallas", "persona", "tiempo", "costo"]);
  assert.deepEqual(t.map((x) => x.valor), ["95.2 %", "1", "1", "1 s", "1.50 USD"]);
  assert.equal(t[0].detalle, "20 de 21 turnos");
  assert.equal(t[1].alerta, true);
  assert.equal(t[3].detalle, "9 de cada 10 en menos de 1.9 s");
  const vacio = tarjetasResumen({});
  assert.deepEqual(vacio.map((x) => x.valor), ["—", "0", "0", "—", "—"]);
});

test("escala del eje y datos de la gráfica", () => {
  assert.deepEqual(escalaEje(0), { max: 4, marcas: [0, 1, 2, 3, 4] });
  assert.deepEqual(escalaEje(7), { max: 8, marcas: [0, 2, 4, 6, 8] });
  assert.deepEqual(escalaEje(37), { max: 40, marcas: [0, 10, 20, 30, 40] });
  assert.deepEqual(escalaEje(130), { max: 150, marcas: [0, 50, 100, 150] });
  const g = datosGrafica([{ fecha: "2026-11-22", respondidos: 5, no_contestados: 2, turnos: 8 }, { fecha: "2026-11-23", respondidos: 0, no_contestados: 0, turnos: 0 }]);
  assert.equal(g.max, 8);
  assert.deepEqual(g.dias.map((d) => [d.contestados, d.sin_contestar, d.total]), [[5, 2, 7], [0, 0, 0]]);
});

test("periodo, semáforo y orden de empresas", () => {
  assert.deepEqual(rangoUltimosDias(7, "2026-12-02"), { desde: "2026-11-26", hasta: "2026-12-02" });
  assert.deepEqual(rangoUltimosDias(30, "2026-03-01"), { desde: "2026-01-31", hasta: "2026-03-01" });
  assert.equal(semaforo("rojo").texto, "Fallando");
  assert.equal(semaforo("raro").texto, "Bien");
  const orden = ordenarEmpresas([
    { nombre_empresa: "B", semaforo: "verde", fallas_24h: 0 }, { nombre_empresa: "A", semaforo: "ambar", fallas_24h: 1 },
    { nombre_empresa: "C", semaforo: "rojo", fallas_24h: 3 }, { nombre_empresa: "D", semaforo: "rojo", fallas_24h: 9 }, { nombre_empresa: "Á", semaforo: "verde", fallas_24h: 0 },
  ]);
  assert.deepEqual(orden.map((e) => e.nombre_empresa), ["D", "C", "A", "Á", "B"]);
});
