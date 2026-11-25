// Dashboard de resultados de clima (diseño aprobado 25/11/2026): barras apiladas, eNPS, barra divergente contra la
// empresa, «vs. anterior», anillo de participación, mapa por área (2 grupos o más), comentarios, evolución y plan de
// acción. Lógica pura de src/lib/clima/modelo.mjs. node --test scripts/test-clima-resultados.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/lib/clima/modelo.mjs";

const fav = (favorable, neutral, desfavorable) => ({ favorable, neutral, desfavorable, n: 10 });

test("aviso de confianza: señal con menos de 10 respuestas, confiable con 10 o más (mismo texto que el PDF)", () => {
  assert.equal(M.CONFIANZA_MINIMA, 10);
  const s = M.textoConfianza(4, "senal");
  assert.equal(s.titulo, "Con 4 respuestas, lee esto como una señal, no como una medición firme.");
  assert.match(s.detalle, /Con 10 o más respuestas el aviso cambia a «confiable»\.$/);
  assert.equal(M.textoConfianza(1).titulo, "Con 1 respuesta, lee esto como una señal, no como una medición firme.");
  assert.equal(M.textoConfianza(10).titulo, "Con 10 respuestas, la lectura es confiable.");
  assert.equal(M.textoConfianza(9).titulo.includes("señal"), true, "sin confianza explícita se deduce del número");
});

test("barras apiladas: solo segmentos con ancho, colores de la maqueta y texto accesible", () => {
  assert.deepEqual(M.segmentosFavorabilidad(fav(92, 6, 2)), [
    { clave: "favorable", pct: 92, color: "#16A34A" },
    { clave: "neutral", pct: 6, color: "#CBD5E1" },
    { clave: "desfavorable", pct: 2, color: "#DC2626" },
  ]);
  assert.deepEqual(M.segmentosFavorabilidad(fav(100, 0, 0)).map((x) => x.clave), ["favorable"]);
  assert.deepEqual(M.segmentosFavorabilidad(null), []);
  assert.equal(M.etiquetaFavorabilidad(fav(92, 6, 2)), "92 % favorable, 6 % neutral, 2 % desfavorable");
  assert.equal(M.etiquetaFavorabilidad(null), "Sin respuestas");
});

test("eNPS: barra detractores · pasivos · promotores y personas en singular o plural", () => {
  const e = { valor: 100, promotores: 100, pasivos: 0, detractores: 0, n: 4, conteo: { promotores: 4, pasivos: 0, detractores: 0 } };
  assert.deepEqual(M.segmentosEnps(e).map((x) => [x.clave, x.pct]), [["promotores", 100]]);
  assert.equal(M.detalleEnps(e), "4 promotores · 0 pasivos · 0 detractores");
  assert.equal(M.detalleEnps({ ...e, conteo: { promotores: 1, pasivos: 1, detractores: 1 } }), "1 promotor · 1 pasivo · 1 detractor");
  assert.equal(M.detalleEnps({ promotores: 50, pasivos: 30, detractores: 20 }), "50 % promotores · 30 % pasivos · 20 % detractores");
  assert.equal(M.detalleEnps(null), "Sin pregunta de recomendación");
  assert.equal(M.tonoEnps(28), "#15803D");
  assert.equal(M.tonoEnps(-3), "#B91C1C");
});

test("barra divergente contra la empresa: 20 puntos llenan media columna y la etiqueta siempre cabe", () => {
  assert.deepEqual(M.divergente(100, 92), { dif: 8, positivo: true, ancho: 16, texto: "+8", aria: "8 puntos sobre la empresa" });
  assert.deepEqual(M.divergente(81, 92), { dif: -11, positivo: false, ancho: 22, texto: "−11", aria: "11 puntos bajo la empresa" });
  assert.equal(M.divergente(20, 92).ancho, 40, "tope: 40 % de la columna (deja lugar a la etiqueta)");
  assert.equal(M.divergente(92, 92).texto, "±0");
  assert.equal(M.divergente(91, 92).aria, "1 punto bajo la empresa");
  assert.equal(M.divergente(null, 92), null);
});

test("tabla de dimensiones: % favorable, contra la empresa y «vs. anterior» con ▲ ▼ o «—»", () => {
  const clima = {
    favorabilidad: fav(80, 15, 5),
    dimensiones: [
      { clave: "a", nombre: "Ambiente", favorabilidad: fav(90, 10, 0) },
      { clave: "b", nombre: "Bienestar", favorabilidad: fav(70, 20, 10) },
      { clave: "c", nombre: "Nueva", favorabilidad: null },
    ],
  };
  const primera = M.filasDimensiones(clima);
  assert.deepEqual(primera.map((f) => [f.nombre, f.favorable, f.contraEmpresa?.texto ?? null, f.anterior.texto]), [
    ["Ambiente", 90, "+10", "—"],
    ["Bienestar", 70, "−10", "—"],
    ["Nueva", null, null, "—"],
  ]);
  const comp = { dimensiones: [{ clave: "a", favorable: 5 }, { clave: "b", favorable: -3 }, { clave: "c", favorable: null }] };
  const segunda = M.filasDimensiones(clima, comp);
  assert.deepEqual(segunda.map((f) => f.anterior.texto), ["▲ 5", "▼ 3", "—"]);
  assert.equal(segunda[0].anterior.aria, "subió 5 puntos");
  assert.equal(segunda[1].anterior.tono, "#B91C1C");
  assert.equal(M.vsAnterior(0).texto, "= 0");
  assert.equal(M.vsAnterior(1).aria, "subió 1 punto");
});

test("participación: anillo y texto contra la meta de 70 %", () => {
  assert.deepEqual(M.anillo(57), { circunferencia: 213.6, lleno: 121.8, pct: 57 }, "igual que la maqueta (121.8 de 213.6)");
  assert.equal(M.anillo(140).pct, 100);
  assert.equal(M.anillo(null).lleno, 0);
  assert.deepEqual(M.textoParticipacion(4, 7), { texto: "Bajo la meta de 70 % · faltaron 3", tono: "#92400E", color: "#F59E0B" });
  assert.equal(M.textoParticipacion(6, 7).texto, "Arriba de la meta de 70 %");
  assert.equal(M.textoParticipacion(2, 3).texto, "Bajo la meta de 70 % · faltó 1");
  assert.equal(M.textoParticipacion(0, 0).texto, "Bajo la meta de 70 %");
});

test("pregunta por pregunta: de la más favorable a la menos, sin las que no tienen respuestas", () => {
  const qs = [
    { clave: "a", favorabilidad: fav(50, 50, 0) },
    { clave: "b", favorabilidad: fav(100, 0, 0) },
    { clave: "c", favorabilidad: null },
    { clave: "d", favorabilidad: fav(50, 25, 25) },
  ];
  assert.deepEqual(M.preguntasOrdenadas(qs).map((q) => q.clave), ["b", "a", "d"]);
  assert.deepEqual(M.preguntasOrdenadas(undefined), []);
});

test("mapa por área: solo con 2 grupos o más, % favorable por dimensión y color por rango", () => {
  const dims = (a, b) => [
    { clave: "a", nombre: "A", favorabilidad: a === null ? null : fav(a, 100 - a, 0) },
    { clave: "b", nombre: "B", favorabilidad: fav(b, 100 - b, 0) },
  ];
  const base = { suficiente: true, respuestas: 9, favorabilidad: fav(70, 30, 0), dimensiones: dims(70, 70) };
  assert.equal(M.mapaFavorable({ ...base, grupos: [{ nombre: "Caja", n: 9, favorabilidad: fav(70, 30, 0), dimensiones: dims(70, 70) }] }), null);
  const m = M.mapaFavorable({
    ...base,
    grupos: [
      { nombre: "Caja", n: 4, favorabilidad: fav(60, 40, 0), dimensiones: dims(null, 60) },
      { nombre: "Ventas", n: 5, favorabilidad: fav(80, 20, 0), dimensiones: dims(80, 80) },
    ],
  });
  assert.deepEqual(m.filas.map((f) => [f.nombre, f.n, f.total, f.celdas]), [
    ["Caja", 4, 60, [null, 60]],
    ["Ventas", 5, 80, [80, 80]],
    ["Toda la empresa", 9, 70, [70, 70]],
  ]);
  assert.equal(M.colorFavorable(75), "bg-green-100 text-green-900");
  assert.equal(M.colorFavorable(60), "bg-amber-100 text-amber-900");
  assert.equal(M.colorFavorable(59), "bg-red-100 text-red-900");
  assert.equal(M.colorFavorable(null), "bg-slate-100 text-slate-500");
  assert.equal(M.mapaFavorable({ suficiente: false }), null);
});

test("comentarios: total y vista corta por pregunta («Ver todos»)", () => {
  const r = M.resumenComentarios([
    { clave: "a", texto: "¿Qué te gusta?", respuestas: ["uno", "dos", "tres"] },
    { clave: "b", texto: "¿Qué cambiarías?", respuestas: [] },
    { clave: "c", texto: "¿Algo más?", respuestas: ["x"] },
  ]);
  assert.equal(r.total, 4);
  assert.deepEqual(r.grupos.map((g) => [g.clave, g.visibles, g.resto]), [
    ["a", ["uno", "dos"], 1],
    ["c", ["x"], 0],
  ]);
  assert.equal(M.resumenComentarios(null).total, 0);
});

test("evolución: línea con 2 mediciones o más; con una sola no se dibuja y se sugiere repetir en 6 meses", () => {
  assert.equal(M.lineaEvolucion([{ id: 1, cierra_el: "2026-11-24", favorable: 92 }]), null);
  assert.equal(M.lineaEvolucion([{ favorable: 92 }, { favorable: null }]), null, "sin dato no cuenta");
  const l = M.lineaEvolucion(
    [
      { id: 1, cierra_el: "2026-05-20", favorable: 50 },
      { id: 2, cierra_el: "2026-11-24", favorable: 100 },
    ],
    { ancho: 300, alto: 140, margen: { izq: 30, der: 10, arr: 10, aba: 30 } }
  );
  assert.equal(l.d, "M30 60 L290 10");
  assert.deepEqual(l.puntos.map((p) => p.etiqueta), ["may 26", "nov 26"]);
  assert.deepEqual(l.guias.map((g) => g.y), [110, 60, 10]);
  assert.equal(l.aria, "Evolución del % favorable: may 26 50 %, nov 26 100 %");
  // Con el margen por defecto, el último punto deja lugar a su etiqueta (no se corta a la derecha).
  const def = M.lineaEvolucion([{ cierra_el: "2026-05-20", favorable: 60 }, { cierra_el: "2026-11-24", favorable: 70 }]);
  assert.ok(def.puntos.at(-1).x <= def.ancho - 20);
  assert.equal(M.sugerenciaSiguiente("2026-11-24"), "mayo 2027");
  assert.equal(M.sugerenciaSiguiente("2026-06-30"), "diciembre 2026");
  assert.equal(M.sugerenciaSiguiente(null), null);
});

test("plan de acción: estados, resumen, seguimiento y validación antes de mandar", () => {
  assert.deepEqual(Object.keys(M.ESTADOS_ACCION), ["pendiente", "en_curso", "lograda", "no_lograda"]);
  assert.equal(M.resumenPlan([{ estado: "lograda" }, { estado: "en_curso" }]), "1 de 2 logradas");
  assert.equal(M.resumenPlan([]), "");
  assert.equal(M.fechaLarga("2026-12-15"), "15 dic 2026");
  assert.equal(M.fechaLarga(null), "Sin fecha");
  const a = { dimension: "cre", seguimiento: null };
  assert.equal(M.textoSeguimiento(a, "Crecimiento").texto, "Se revisa sola en la próxima encuesta: si Crecimiento sube, lo verás aquí.");
  const s = { medicion: { nombre: "Clima mayo" }, antes: 81, despues: 88, delta: 7, subio: true };
  assert.equal(M.textoSeguimiento({ ...a, seguimiento: s }, "Crecimiento").texto, "▲ Crecimiento subió de 81 % a 88 % en «Clima mayo».");
  assert.equal(M.textoSeguimiento({ ...a, seguimiento: { ...s, despues: 70, delta: -11, subio: false } }, "Crecimiento").tono, "#B91C1C");
  assert.equal(M.textoSeguimiento({ dimension: null }).texto, "Acción general: no se liga a una dimensión.");
  assert.deepEqual(M.erroresAccion({ texto: " a ", id_responsable: "", fecha_limite: "" }), {
    texto: "Escribe qué se va a hacer.",
    id_responsable: "Elige a la persona responsable.",
    fecha_limite: "Elige la fecha límite.",
  });
  assert.deepEqual(M.erroresAccion({ texto: "Plática 1 a 1", id_responsable: "12", fecha_limite: "2026-12-15" }), {});
  assert.equal(M.erroresAccion({ texto: "x".repeat(301), id_responsable: 1, fecha_limite: "2026-12-15" }).texto, "Máximo 300 caracteres.");
});
