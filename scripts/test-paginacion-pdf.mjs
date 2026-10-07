import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularPaginasPdf } from '../src/lib/documentos/paginacionPdf.js';

test('no corta una línea ni deja huecos entre las páginas', () => {
  const paginas = calcularPaginasPdf(2500,1000,[[900,1100]],[[898,920],[990,1010]]);
  assert.equal(paginas[0].fin,898);
  assert.equal(paginas.at(-1).fin,2500);
  for(let i=1;i<paginas.length;i++) assert.equal(paginas[i].inicio,paginas[i-1].fin);
});
test('párrafo mayor que una página se divide entre líneas, sin bucle', () => {
  const paginas = calcularPaginasPdf(2800,1000,[[0,2200]],[[990,1010],[1980,2000]]);
  assert.equal(paginas[0].fin,990);
  assert.equal(paginas[1].fin,1980);
  assert.equal(paginas.at(-1).fin,2800);
});
test('documento corto conserva una página y no agrega una al llegar al borde exacto', () => {
  assert.deepEqual(calcularPaginasPdf(500,1000),[{inicio:0,fin:500}]);
  assert.deepEqual(calcularPaginasPdf(2000,1000),[{inicio:0,fin:1000},{inicio:1000,fin:2000}]);
});
