// «Plan de acción sugerido» de Adamia AI → acciones del plan con un clic (lógica pura de src/lib/clima/sugerencias.mjs).
// node --test scripts/test-clima-sugerencias.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import * as S from "../src/lib/clima/sugerencias.mjs";

const sugerencias = [
  { dimension: "carga", accion: "Publicar los horarios del sábado con 1 semana de anticipación.", porque: "Carga 52 %" },
  { dimension: "reconocimiento", accion: "Reconocimiento mensual por área desde la app.", porque: "Reconocimiento 52 %" },
  { dimension: "crecimiento", accion: "plática 1 a 1 de plan de carrera con cada persona", porque: "Crecimiento 55 %" },
];
const plan = [{ id: 501, dimension: "crecimiento", texto: "Plática 1 a 1 de plan de carrera con cada persona", responsable: { id: 1 }, fecha_limite: "2026-12-15" }];

test("misma identidad que el servidor: sin mayúsculas, acentos, espacios ni punto final; la dimensión cuenta", () => {
  assert.equal(S.claveAccion("  Plática 1 a 1 de plan  de carrera. ", "crecimiento"), "crecimiento|platica 1 a 1 de plan de carrera");
  assert.equal(S.claveAccion("Algo", null), S.claveAccion("algo!", undefined));
  assert.notEqual(S.claveAccion("Algo", "a"), S.claveAccion("Algo", null));
});

test("marca «Ya está en el plan» y deja por agregar solo lo que falta", () => {
  const e = S.estadoSugerencias(sugerencias, plan);
  assert.deepEqual(
    e.map((x) => [x.enPlan, x.idAccion]),
    [
      [false, null],
      [false, null],
      [true, 501],
    ]
  );
  assert.equal(S.porAgregar(sugerencias, plan).length, 2);
  assert.equal(S.porAgregar(sugerencias, [...plan, { id: 9, dimension: "carga", texto: sugerencias[0].accion }]).length, 1);
  // Misma frase con otra dimensión no es la misma acción.
  assert.equal(S.estadoSugerencias([{ ...sugerencias[2], dimension: null }], plan)[0].enPlan, false);
});

test("el cuerpo va al endpoint de siempre sin responsable ni fecha y sin empresa", () => {
  const c = S.cuerpoAccion({ ...sugerencias[0], accion: `  ${"a".repeat(320)} ` });
  assert.deepEqual(Object.keys(c), ["texto", "dimension", "id_responsable", "fecha_limite"]);
  assert.equal(c.texto.length, 300);
  assert.equal(c.id_responsable, null);
  assert.equal(c.fecha_limite, null);
  assert.equal(S.cuerpoAccion({ accion: "Publicar horarios" }).dimension, null);
});

test("falta asignar: responsable y fecha", () => {
  assert.deepEqual(S.faltaAsignar({ responsable: null, fecha_limite: null }), ["responsable", "fecha límite"]);
  assert.equal(S.textoFalta({ responsable: null, fecha_limite: null }), "Falta asignar responsable y fecha límite");
  assert.equal(S.textoFalta({ responsable: { id: 3 }, fecha_limite: null }), "Falta asignar fecha límite");
  assert.equal(S.textoFalta(plan[0]), "");
  assert.equal(S.porAsignar([plan[0], { responsable: null, fecha_limite: "2026-12-01" }, { responsable: null }]), 2);
});

test("resumen de «Agregar todas»: agregadas, ya estaban (DUPLICADA) y fallidas", () => {
  const ok = S.resumenAgregadas([{ ok: true }, { ok: true }]);
  assert.equal(ok.texto, "Se agregaron 2 acciones al plan. Asigna responsable y fecha en el plan.");
  assert.equal(ok.variante, "success");
  const mixto = S.resumenAgregadas([{ ok: true }, { ok: false, codigo: "DUPLICADA" }, { ok: false, codigo: "LIMITE", error: "Una medición admite hasta 50 acciones." }]);
  assert.equal(mixto.texto, "Se agregó 1 acción al plan · 1 ya estaba · 1 no se pudo agregar: Una medición admite hasta 50 acciones. Asigna responsable y fecha en el plan.");
  assert.equal(mixto.variante, "warning");
  assert.equal(S.resumenAgregadas([{ ok: false, codigo: "DUPLICADA" }]).texto, "1 ya estaba.");
  assert.equal(S.resumenAgregadas([{ ok: false, codigo: "ERROR", error: "x" }]).variante, "error");
  assert.equal(S.resumenAgregadas([]).texto, "No había acciones por agregar.");
});

test("nombre de la dimensión para mostrar", () => {
  const dims = [{ clave: "carga", nombre: "Carga de trabajo" }];
  assert.equal(S.nombreDimension("carga", dims), "Carga de trabajo");
  assert.equal(S.nombreDimension(null, dims), "General");
  assert.equal(S.nombreDimension("otra", dims), "otra");
});
