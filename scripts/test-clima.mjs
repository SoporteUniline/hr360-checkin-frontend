// Clima y NOM-035 en el navegador: pasos de la encuesta (una pregunta por pantalla), Guía I condicional, filtros de la
// Guía II/III, cuerpo que se manda al servidor, mapa de calor, editor y destinatarios. node --test scripts/test-clima.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/lib/clima/modelo.mjs";

const clima = {
  tipo: "clima",
  secciones: [
    {
      titulo: "Uno",
      preguntas: [
        { clave: "enps", tipo: "enps", texto: "¿Recomendarías…?", requerida: true },
        { clave: "a", tipo: "escala", texto: "A", requerida: true },
      ],
    },
    { titulo: "Abiertas", preguntas: [{ clave: "abi", tipo: "abierta", texto: "¿Algo más?", requerida: false }] },
  ],
};

const nom = {
  tipo: "nom035",
  cuestionarios: [
    {
      clave: "I",
      secciones: [
        { clave: "I", titulo: "I", encabezado: "¿Ha presenciado…", reactivos: ["a", "b"] },
        { clave: "II", titulo: "II", reactivos: ["c"] },
        { clave: "III", titulo: "III", reactivos: ["d", "e"] },
        { clave: "IV", titulo: "IV", reactivos: ["f"] },
      ],
    },
    {
      clave: "II",
      opciones: [{ valor: "siempre", texto: "Siempre" }],
      secciones: [
        {
          intro: "Intro 1",
          condicion: null,
          items: [
            { numero: 1, texto: "Uno" },
            { numero: 2, texto: "Dos" },
          ],
        },
        {
          intro: "Clientes",
          condicion: { clave: "clientes", pregunta: "En mi trabajo debo brindar servicio a clientes o usuarios:" },
          items: [{ numero: 41, texto: "Enojados" }],
        },
        {
          intro: "Jefe",
          condicion: { clave: "jefe", pregunta: "Soy jefe de otros trabajadores:" },
          items: [{ numero: 44, texto: "Tarde" }],
        },
      ],
    },
  ],
};

test("clima: una pregunta por pantalla, abiertas opcionales, avance y cuerpo", () => {
  const pasos = M.pasosEncuesta(clima, {});
  assert.deepEqual(
    pasos.map((p) => p.id),
    ["q:enps", "q:a", "q:abi"]
  );
  const r = { "q:enps": 9, "q:a": 4 };
  assert.equal(M.avance(pasos, r), 100);
  assert.equal(M.primeroSinResponder(pasos, { "q:enps": 9 }), 1);
  assert.deepEqual(M.armarRespuesta(clima, r), { respuestas: { enps: 9, a: 4 } });
});

test("NOM-035: Guía I termina si la sección I es toda «No»; con un «Sí» siguen II a IV", () => {
  const solo = M.pasosEncuesta(nom, { "g1:I:0": "no", "g1:I:1": "no" }).filter((p) => p.id.startsWith("g1:"));
  assert.equal(solo.length, 2);
  const todos = M.pasosEncuesta(nom, { "g1:I:0": "si" }).filter((p) => p.id.startsWith("g1:"));
  assert.deepEqual(
    todos.map((p) => p.id),
    ["g1:I:0", "g1:I:1", "g1:II:0", "g1:III:0", "g1:III:1", "g1:IV:0"]
  );
  const cuerpo = M.armarRespuesta(nom, { "g1:I:0": "no", "g1:I:1": "no" });
  assert.deepEqual(cuerpo.guia1, { I: ["no", "no"] });
  const conSi = M.armarRespuesta(nom, { "g1:I:0": "si", "g1:II:0": "si" });
  assert.deepEqual(conSi.guia1, { I: ["si", "no"], II: ["si"], III: ["no", "no"], IV: ["no"] });
});

test("NOM-035: preguntas condicionales (clientes, jefe) solo si contestó «Sí»", () => {
  const ids = (r) =>
    M.pasosEncuesta(nom, r)
      .filter((p) => !p.id.startsWith("g1:"))
      .map((p) => p.id);
  assert.deepEqual(ids({}), ["i:1", "i:2", "f:clientes", "f:jefe"]);
  assert.deepEqual(ids({ "f:clientes": "si" }), ["i:1", "i:2", "f:clientes", "i:41", "f:jefe"]);
  const cuerpo = M.armarRespuesta(nom, {
    "i:1": "siempre",
    "i:2": "nunca",
    "f:clientes": "no",
    "f:jefe": "si",
    "i:44": "casi_nunca",
    "i:41": "siempre",
  });
  assert.deepEqual(cuerpo.guia, { filtros: { clientes: false, jefe: true }, items: { 1: "siempre", 2: "nunca", 44: "casi_nunca" } });
});

test("mapa de calor y «dónde poner atención» solo con lo que mandó el servidor", () => {
  const r = {
    suficiente: true,
    respuestas: 12,
    general: 7,
    dimensiones: [
      { clave: "a", nombre: "A", valor: 7 },
      { clave: "b", nombre: "B", valor: 8 },
    ],
    grupos: [
      {
        nombre: "Caja",
        n: 6,
        general: 6,
        dimensiones: [
          { clave: "a", valor: 5.1 },
          { clave: "b", valor: 9 },
        ],
      },
    ],
  };
  const m = M.mapaCalor(r);
  assert.deepEqual(
    m.filas.map((f) => f.nombre),
    ["Caja", "Toda la empresa"]
  );
  assert.deepEqual(m.filas[0].celdas, [5.1, 9]);
  assert.deepEqual(M.atencion(r, 1), [{ grupo: "Caja", dimension: "A", valor: 5.1 }]);
  assert.deepEqual(M.mapaCalor({ suficiente: false }), { columnas: [], filas: [] });
  assert.equal(M.colorCalor(5.9), "bg-red-100 text-red-800");
  assert.equal(M.colorCalor(null), "bg-slate-100 text-slate-400");
  assert.equal(M.fmtEnps(28), "+28");
  assert.equal(M.fmtDelta(0.4).texto, "▲ 0.4");
  assert.equal(M.fmtDelta(-1).tono, "text-red-700");
  assert.equal(M.fmtDelta(5, { puntos: true }).texto, "▲ 5 pts");
});

test("editor: agregar, cambiar tipo, mover, quitar y aplicar la propuesta de Adamia AI", () => {
  let d = { secciones: [{ clave: "s1", titulo: "S", preguntas: [] }] };
  d = M.agregarPregunta(d, 0, { ...M.nuevaPregunta("sino", "¿Verdad que tu jefe te trata bien y te apoya?"), clave: "x" });
  d = M.agregarPregunta(d, 0, { ...M.nuevaPregunta("escala", "Otra"), clave: "y" });
  d = M.moverPregunta(d, "y", -1);
  assert.deepEqual(
    M.preguntasDe(d).map((q) => q.clave),
    ["y", "x"]
  );
  d = M.aplicarPropuesta(d, "x", ["Mi jefe directo me trata con respeto.", "Cuando tengo un problema, mi jefe me ayuda."]);
  const qs = M.preguntasDe(d);
  assert.equal(qs.length, 3);
  assert.deepEqual(
    qs.slice(1).map((q) => q.tipo),
    ["escala", "escala"]
  );
  assert.equal(qs[1].clave, "x");
  d = M.cambiarPregunta(d, "y", { tipo: "opcion" });
  assert.equal(M.preguntasDe(d)[0].opciones.length, 2);
  d = M.cambiarPregunta(d, "y", { tipo: "abierta" });
  assert.equal(M.preguntasDe(d)[0].opciones, undefined);
  assert.equal(M.preguntasDe(d)[0].requerida, false);
  d = M.quitarPregunta(d, "y");
  assert.equal(M.preguntasDe(d).length, 2);
  assert.equal(M.textoMinutos(1), "1 minuto");
  assert.equal(M.textoMinutos(7), "7 minutos");
  assert.equal(
    M.minutosEstimados({
      secciones: [
        {
          preguntas: Array(30)
            .fill({ tipo: "escala" })
            .concat([{ tipo: "abierta" }, { tipo: "abierta" }]),
        },
      ],
    }),
    7
  );
});

test("destinatarios: resumen en chips y antigüedad", () => {
  assert.deepEqual(M.resumenDestinatarios({ modo: "todos" }), ["Toda la empresa"]);
  assert.deepEqual(
    M.resumenDestinatarios({ modo: "filtro", areas: ["Caja"], puestos: [3], antiguedad: { maxMeses: 6 } }, [{ id: 3, nombre: "Cajero" }]),
    ["Área: Caja", "Puesto: Cajero", "Antigüedad: menos de 6 meses"]
  );
  assert.equal(M.claveAntiguedad({ minMeses: null, maxMeses: 6 }), "lt6");
  assert.equal(M.llaveBorrador(4), "adamia-clima-borrador:4");
  assert.equal(M.llaveBorrador(4, "abcdefghijklmnopq"), "adamia-clima-borrador:liga:abcdefghijkl");
  assert.equal(M.masDias("2026-11-30", 1), "2026-12-01");
});
