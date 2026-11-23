// Reglas de Tareas y Checklists (src/lib/tareas/reglas.mjs). node --test scripts/test-tareas.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { motivoNoMover, avancePasos, avanceProyecto, calificar, cumplimientoPorPersona, ganaBono, fotoVigente } from "../src/lib/tareas/reglas.mjs";

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

test("calificación ponderada por peso", () => {
  const puntos = [{ id: 1, peso: 1 }, { id: 2, peso: 1 }, { id: 3, peso: 2 }];
  assert.equal(calificar(puntos, { 1: true, 2: true, 3: true }), 100);
  assert.equal(calificar(puntos, { 1: true, 2: true, 3: false }), 50, "el punto que pesa doble resta la mitad");
  assert.equal(calificar(puntos, { 3: true }), 50);
  assert.equal(calificar([{ id: 1 }, { id: 2 }, { id: 3 }], { 1: true, 2: true }), 66.7, "sin peso cuentan 1");
  assert.equal(calificar([], {}), 0);
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

test("enviar checklist: obligatorios hechos y foto en los marcados que la piden", async () => {
  const { motivoNoEnviar } = await import("../src/lib/tareas/reglas.mjs");
  const ck = { puntos: [{ id: 1, obligatorio: true }, { id: 2, pideFoto: true }, { id: 3 }, { id: 4, obligatorio: true, pideFoto: true }] };
  assert.equal(motivoNoEnviar(ck, {}, {}), "Faltan 2 puntos obligatorios.");
  assert.equal(motivoNoEnviar(ck, { 1: true, 4: true, 2: true }, {}), "Faltan 2 fotos.");
  assert.equal(motivoNoEnviar(ck, { 1: true, 4: true }, { 4: "f" }), null, "un no obligatorio sin marcar se permite");
  assert.equal(motivoNoEnviar(ck, { 4: true }, {}), "Faltan 1 punto obligatorio y 1 foto.");
});
