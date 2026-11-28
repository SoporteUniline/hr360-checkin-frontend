// Pruebas del candado del sistema de diseño (scripts/candado-diseno.mjs). Uso: node --test scripts/test-candado-diseno.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { botonNoAzul, compararConExcepciones, contarReglas, contarSrc, etiquetasBoton, MIGRADOS } from "./candado-diseno.mjs";
import { readFileSync } from "node:fs";

test("detecta degradados y peso 800", () => {
  assert.deepEqual(contarReglas('<div className="bg-gradient-to-r from-a to-b font-extrabold" />', "src/x.jsx"), { degradado: 1, "peso-800": 1 });
  assert.deepEqual(contarReglas(".a{background:linear-gradient(red,blue);font-weight: 800}", "src/x.css"), { degradado: 1, "peso-800": 1 });
  assert.deepEqual(contarReglas('<h1 className="font-bold">Hola</h1>', "src/x.jsx"), {});
});

test("lee la etiqueta <Button …> completa aunque tenga flechas y llaves", () => {
  const [e] = etiquetasBoton('<Button onClick={() => a > b} className="bg-green-600">Ok</Button>');
  assert.equal(e, '<Button onClick={() => a > b} className="bg-green-600">');
  assert.equal(etiquetasBoton("<ButtonGroup><Button/></ButtonGroup>").length, 1, "no confunde ButtonGroup");
});

test("botón de otro color: sí con bg-green o bg-[#2563EB] o reactivate; no con variantes ni bg-transparent", () => {
  assert.equal(botonNoAzul('<Button className="bg-green-600 text-white">'), true);
  assert.equal(botonNoAzul('<Button className="bg-[#2563EB] hover:bg-[#1d4ed8]">'), true, "el azul escrito a mano también: usa la variante");
  assert.equal(botonNoAzul('<Button variant="reactivate">'), true);
  assert.equal(botonNoAzul('<Button size="lg">'), false);
  assert.equal(botonNoAzul('<Button variant="outline" className="bg-transparent hover:bg-red-50">'), false, "hover: no es el fondo");
  assert.equal(botonNoAzul('<Button className={`bg-brand ${x}`}>'), false);
});

test("fondos decorativos solo cuentan en archivos migrados; --primary solo en .module.css", () => {
  const pastel = '<section className="bg-purple-50 p-4" />';
  assert.deepEqual(contarReglas(pastel, MIGRADOS[0]), { "fondo-decorativo": 1 });
  assert.deepEqual(contarReglas(pastel, "src/components/formulario/Nuevo.jsx"), { "fondo-decorativo": 1 }, "todo lo nuevo de components/formulario");
  assert.deepEqual(contarReglas(pastel, "src/app/panel/otro/page.jsx"), {});
  assert.deepEqual(contarReglas(".t{--primary:#000}", "src/app/panel/x/x-theme.module.css"), { "primario-propio": 1 });
  assert.deepEqual(contarReglas(":root{--primary:#000}", "src/app/globals.css"), {});
});

test("trinquete: más que la lista falla; menos solo avisa; archivo nuevo falla", () => {
  const ex = { degradado: { "src/a.jsx": 2 } };
  assert.equal(compararConExcepciones({ "src/a.jsx": { degradado: 3 } }, ex).nuevos.length, 1);
  assert.deepEqual(compararConExcepciones({ "src/a.jsx": { degradado: 2 } }, ex), { nuevos: [], bajaron: [] });
  assert.equal(compararConExcepciones({ "src/a.jsx": { degradado: 1 } }, ex).bajaron.length, 1);
  assert.equal(compararConExcepciones({ "src/b.jsx": { "peso-800": 1 } }, ex).nuevos.length, 1);
});

test("el código de hoy pasa el candado y los archivos migrados no tienen degradados, peso 800 ni botones de otro color", () => {
  const ex = JSON.parse(readFileSync(new URL("./candado-diseno.excepciones.json", import.meta.url), "utf8"));
  const conteos = contarSrc();
  assert.deepEqual(compararConExcepciones(conteos, ex).nuevos, []);
  for (const ruta of MIGRADOS) {
    const r = conteos[ruta] ?? {};
    assert.deepEqual([r.degradado ?? 0, r["peso-800"] ?? 0, r["boton-no-azul"] ?? 0], [0, 0, 0], ruta);
  }
});
