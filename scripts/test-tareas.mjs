// Reglas de Tareas y Checklists (src/lib/tareas/reglas.mjs). node --test scripts/test-tareas.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { motivoNoMover, avancePasos, avanceProyecto, cumplimientoPorPersona, ganaBono, fotoVigente } from "../src/lib/tareas/reglas.mjs";
import { puntajePregunta, calificarRespuestas, valorDePregunta, problemasChecklist, motivoNoEnviar, textoRespuesta, aplicarCorrecciones, fallasPorPregunta } from "../src/lib/tareas/preguntas.mjs";

test("mover tareas: la persona manda a revisión solo con pasos y foto; solo el jefe la da por hecha", () => {
  const t = { estado: "en_proceso", pasos: [{ hecho: true }, { hecho: false }], pideFoto: true, fotos: [] };
  assert.equal(motivoNoMover(t, "revision", "persona"), "Te faltan 1 paso.");
  t.pasos[1].hecho = true;
  assert.equal(motivoNoMover(t, "revision", "persona"), "Sube la foto de evidencia.");
  t.fotos = ["f1"];
  assert.equal(motivoNoMover(t, "revision", "persona"), null);
  assert.match(motivoNoMover(t, "hecho", "persona"), /jefe/);
  assert.equal(motivoNoMover(t, "hecho", "jefe"), null);
  assert.equal(motivoNoMover({ estado: "hecho" }, "en_proceso", "persona"), "Ya está terminada.");
  assert.equal(motivoNoMover(t, "otra", "jefe"), "Columna desconocida.");
});

test("avance de pasos y de proyecto", () => {
  assert.deepEqual(avancePasos([{ hecho: true }, { hecho: false }, { hecho: true }, { hecho: false }]), { hechos: 2, total: 4, porcentaje: 50 });
  assert.deepEqual(avancePasos([]), { hechos: 0, total: 0, porcentaje: 0 });
  const p = avanceProyecto([{ estado: "hecho" }, { estado: "en_proceso", fecha: "2026-11-20" }, { estado: "por_hacer", fecha: "2026-11-30" }], "2026-11-23");
  assert.deepEqual(p, { total: 3, hechas: 1, vencidas: 1, porcentaje: 33 });
});

test("cumplimiento por persona: no enviado cuenta 0, por revisar aún no cuenta, filtro por periodo", () => {
  const envios = [
    { persona: "Ana", fecha: "2026-11-20", estado: "aprobado", calificacion: 100, aTiempo: true },
    { persona: "Ana", fecha: "2026-11-21", estado: "regresado", calificacion: 80, aTiempo: false },
    { persona: "Ana", fecha: "2026-11-22", estado: "por_revisar", calificacion: 90, aTiempo: true },
    { persona: "Beto", fecha: "2026-11-20", estado: "no_enviado" },
    { persona: "Beto", fecha: "2026-11-21", estado: "aprobado", calificacion: 100, aTiempo: true },
    { persona: "Beto", fecha: "2026-10-01", estado: "aprobado", calificacion: 0, aTiempo: true },
  ];
  const r = cumplimientoPorPersona(envios, { desde: "2026-11-16", hasta: "2026-11-30" });
  const ana = r.find((x) => x.persona === "Ana");
  const beto = r.find((x) => x.persona === "Beto");
  assert.equal(ana.promedio, 90);
  assert.deepEqual([ana.asignados, ana.enviados, ana.aTiempo, ana.tarde, ana.porRevisar], [3, 3, 2, 1, 1]);
  assert.equal(beto.promedio, 50);
  assert.deepEqual([beto.asignados, beto.noEnviados], [2, 1]);
  assert.equal(r[0].persona, "Ana", "ordenado de mejor a peor");
  assert.equal(ganaBono(90), true);
  assert.equal(ganaBono(89.9), false);
  assert.equal(ganaBono(null), false);
});

test("fotos: 3 meses", () => {
  assert.equal(fotoVigente("2026-08-25", "2026-11-23"), true);
  assert.equal(fotoVigente("2026-08-24", "2026-11-23"), false);
});

const PREGUNTAS = [
  { id: 1, texto: "¿El área está ordenada?", tipo: "si_no", correcta: "si", peso: 1 },
  { id: 2, texto: "¿Cómo está el área B?", tipo: "opcion", peso: 2, opciones: [{ id: "a", texto: "Limpia", valor: 100 }, { id: "b", texto: "Regular", valor: 50 }, { id: "c", texto: "Sucia", valor: 0 }] },
  { id: 3, texto: "¿Qué está limpio?", tipo: "multiple", peso: 1, opciones: [{ id: "p", texto: "Piso", valor: 40 }, { id: "m", texto: "Mesas", valor: 30 }, { id: "b", texto: "Barra", valor: 30 }, { id: "x", texto: "Extra", valor: 30 }] },
  { id: 4, texto: "Temperatura", tipo: "numero", min: 0, max: 5, unidad: "°C", peso: 2, permiteNA: true },
  { id: 5, texto: "Foto del gas", tipo: "foto", peso: 1 },
  { id: 6, texto: "Observaciones", tipo: "texto" },
  { id: 7, texto: "¿Hay fugas?", tipo: "si_no", correcta: "no", peso: 1 },
];

test("puntaje por tipo de pregunta", () => {
  const [sn, op, mu, nu, fo, tx, neg] = PREGUNTAS;
  assert.equal(puntajePregunta(sn, { valor: "si" }), 100);
  assert.equal(puntajePregunta(sn, { valor: "no" }), 0);
  assert.equal(puntajePregunta(neg, { valor: "no" }), 100, "la buena puede ser «No»");
  assert.equal(puntajePregunta(op, { valor: "b" }), 50);
  assert.equal(puntajePregunta(mu, { valor: ["p", "m"] }), 70);
  assert.equal(puntajePregunta(mu, { valor: ["p", "m", "b", "x"] }), 100, "varias: tope 100");
  assert.equal(puntajePregunta(nu, { valor: 4 }), 100);
  assert.equal(puntajePregunta(nu, { valor: 0 }), 100, "el límite cuenta");
  assert.equal(puntajePregunta(nu, { valor: 7 }), 0);
  assert.equal(puntajePregunta(nu, { na: true }), null, "no aplica no cuenta");
  assert.equal(puntajePregunta(sn, { na: true }), 0, "si no permite N/A, cuenta como sin contestar");
  assert.equal(puntajePregunta(fo, { valor: "url" }), 100);
  assert.equal(puntajePregunta(fo, {}), 0);
  assert.equal(puntajePregunta(tx, { valor: "hola" }), null, "el texto no se califica");
  assert.equal(puntajePregunta(op, undefined), 0, "sin contestar = 0");
});

test("calificación ponderada y valor de cada pregunta", () => {
  const todo = { 1: { valor: "si" }, 2: { valor: "a" }, 3: { valor: ["p", "m", "b"] }, 4: { valor: 3 }, 5: { valor: "u" }, 6: { valor: "ok" }, 7: { valor: "no" } };
  assert.equal(calificarRespuestas(PREGUNTAS, todo), 100);
  // Área B «Sucia» (peso 2 de 8) → 75 %.
  assert.equal(calificarRespuestas(PREGUNTAS, { ...todo, 2: { valor: "c" } }), 75);
  // Temperatura «no aplica» sale del total: 6 pesos restantes, todos bien.
  assert.equal(calificarRespuestas(PREGUNTAS, { ...todo, 4: { na: true } }), 100);
  assert.equal(calificarRespuestas(PREGUNTAS, { ...todo, 4: { na: true }, 2: { valor: "c" } }), 66.7);
  assert.equal(calificarRespuestas([PREGUNTAS[5]], {}), null, "solo texto: no hay calificación");
  assert.equal(valorDePregunta(PREGUNTAS, PREGUNTAS[1]), 25);
  assert.equal(valorDePregunta(PREGUNTAS, PREGUNTAS[5]), null);
});

test("validación al crear un checklist", () => {
  assert.deepEqual(problemasChecklist("Apertura", PREGUNTAS), []);
  const errores = (pregs) => problemasChecklist("X", pregs).map((p) => p.error);
  assert.deepEqual(problemasChecklist("", []).map((p) => p.error), ["Ponle nombre al checklist.", "Agrega al menos una pregunta."]);
  assert.deepEqual(errores([{ id: 1, texto: "", tipo: "si_no" }]), ["Escribe la pregunta."]);
  assert.deepEqual(errores([{ id: 1, texto: "a", tipo: "opcion", opciones: [{ id: 1, texto: "x", valor: 100 }] }]), ["Pon al menos 2 opciones."]);
  assert.deepEqual(errores([{ id: 1, texto: "a", tipo: "opcion", opciones: [{ id: 1, texto: "x", valor: 80 }, { id: 2, texto: "y", valor: 0 }] }]), ["Alguna opción debe valer 100 % (la respuesta ideal)."]);
  assert.deepEqual(errores([{ id: 1, texto: "a", tipo: "multiple", opciones: [{ id: 1, texto: "x", valor: 40 }, { id: 2, texto: "y", valor: 30 }] }]), ["Las opciones juntas deben sumar al menos 100 %."]);
  assert.deepEqual(errores([{ id: 1, texto: "a", tipo: "opcion", opciones: [{ id: 1, texto: "x", valor: 100 }, { id: 2, texto: "", valor: 0 }] }]), ["Hay una opción sin texto."]);
  assert.deepEqual(errores([{ id: 1, texto: "a", tipo: "numero", min: 9, max: 2 }]), ["El mínimo es mayor que el máximo."]);
  assert.deepEqual(errores([{ id: 1, texto: "a", tipo: "texto" }]), ["Agrega al menos una pregunta que se califique (no solo textos o fechas)."]);
});

test("enviar: obligatorias contestadas (o no aplica) y foto donde se pide", () => {
  const ck = { preguntas: [{ id: 1, tipo: "si_no", obligatoria: true }, { id: 2, tipo: "opcion", pideFoto: true }, { id: 3, tipo: "numero", obligatoria: true, permiteNA: true }, { id: 4, tipo: "texto" }] };
  assert.equal(motivoNoEnviar(ck, {}), "Faltan 2 preguntas obligatorias.");
  assert.equal(motivoNoEnviar(ck, { 1: { valor: "si" }, 3: { na: true } }), null, "no aplica cuenta como contestada; la opcional sin contestar se permite");
  assert.equal(motivoNoEnviar(ck, { 1: { valor: "si" }, 2: { valor: "a" }, 3: { valor: 3 } }), "Faltan 1 foto.");
  assert.equal(motivoNoEnviar(ck, { 1: { valor: "si" }, 2: { valor: "a", foto: "f" }, 3: { valor: 3 } }), null);
});

test("corrección del jefe: cambia la respuesta, recalcula y deja historial", () => {
  const resp = { 1: { valor: "si" }, 2: { valor: "a", foto: "f" }, 3: { valor: ["p", "m", "b"] }, 4: { valor: 3 }, 5: { valor: "u" }, 7: { valor: "no" } };
  const { finales, cambios } = aplicarCorrecciones(PREGUNTAS, resp, { 2: { valor: "c" }, 1: { valor: "si" } });
  assert.deepEqual(cambios, [{ pregunta: 2, texto: "¿Cómo está el área B?", antes: "Limpia", despues: "Sucia" }], "solo lo que cambió");
  assert.equal(finales[2].foto, "f", "conserva la foto de la persona");
  assert.equal(calificarRespuestas(PREGUNTAS, finales), 75);
  assert.equal(textoRespuesta(PREGUNTAS[2], { valor: ["p", "b"] }), "Piso, Barra");
  assert.equal(textoRespuesta(PREGUNTAS[3], { valor: 4 }), "4 °C");
  assert.equal(textoRespuesta(PREGUNTAS[3], { na: true }), "No aplica");
});

test("tipos que solo registran: texto corto, texto largo, fecha, fecha y hora", () => {
  const pregs = [
    { id: 1, texto: "¿Ordenada?", tipo: "si_no", correcta: "si", peso: 1 },
    { id: 2, texto: "Folio", tipo: "texto" }, { id: 3, texto: "Notas", tipo: "texto_largo" },
    { id: 4, texto: "Caducidad", tipo: "fecha", obligatoria: true }, { id: 5, texto: "Llegó", tipo: "fecha_hora" },
  ];
  for (const p of pregs.slice(1)) assert.equal(puntajePregunta(p, { valor: "x" }), null, `${p.tipo} no se califica`);
  assert.equal(calificarRespuestas(pregs, { 1: { valor: "si" } }), 100, "solo cuenta la que califica");
  assert.equal(textoRespuesta(pregs[3], { valor: "2026-12-05" }), "05/12/2026");
  assert.equal(textoRespuesta(pregs[4], { valor: "2026-12-05T08:30" }), "05/12/2026 08:30");
  assert.equal(motivoNoEnviar({ preguntas: pregs }, { 1: { valor: "si" } }), "Faltan 1 pregunta obligatoria.", "una fecha obligatoria se pide");
  assert.deepEqual(problemasChecklist("X", pregs.slice(1)).map((p) => p.error), ["Agrega al menos una pregunta que se califique (no solo textos o fechas)."]);
});

test("productividad: las preguntas que más fallan", () => {
  const ck = { id: 1, nombre: "Apertura", preguntas: PREGUNTAS.slice(0, 2) };
  const envios = [
    { checklist: 1, estado: "aprobado", respuestas: { 1: { valor: "si" }, 2: { valor: "c" } } },
    { checklist: 1, estado: "regresado", respuestas: { 1: { valor: "si" }, 2: { valor: "b" } } },
    { checklist: 1, estado: "por_revisar", respuestas: { 1: { valor: "no" }, 2: { valor: "c" } } },
  ];
  const r = fallasPorPregunta(envios, [ck]);
  assert.equal(r[0].pregunta, "¿Cómo está el área B?");
  assert.deepEqual([r[0].veces, r[0].promedio, r[0].porcentajeMal], [2, 25, 100]);
  assert.deepEqual([r[1].promedio, r[1].porcentajeMal], [100, 0], "por revisar aún no cuenta");
});
