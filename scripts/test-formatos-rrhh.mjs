import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FORMATOS_RRHH, camposFormato, obtenerFormatoRRHH, completarDatosFormato, validarDatosFormato, renderFormatoRRHH, prepararBaseFormato, detectarFormatoBase, resumenViaticos } from '../src/lib/documentos/formatosRRHH.js';
import { guardarCopiaPoliticas } from '../src/lib/plantillasAdamia.js';
import { variablesPrueba, datosPrueba } from './fixtures/formatos-rrhh.mjs';

test('catálogo contiene las veinte bases únicas y códigos estables compatibles', () => {
  assert.equal(FORMATOS_RRHH.length, 20);
  assert.equal(new Set(FORMATOS_RRHH.map(f => f.codigo)).size, 20);
  for (const f of FORMATOS_RRHH) {
    assert.ok(prepararBaseFormato(f).codigo.length <= 50);
    assert.equal(new Set(camposFormato(f).map(c => c.key)).size, camposFormato(f).length);
    assert.ok(camposFormato(f).every(c => ['text','textarea','number','date','email','select','rows'].includes(c.type)));
  }
});
for (const f of FORMATOS_RRHH) test(`${f.nombre}: documento completo y base sin información individual`, () => {
  const datos = datosPrueba(f);
  assert.ok(validarDatosFormato(f, {}));
  assert.equal(validarDatosFormato(f, datos), '');
  const html = renderFormatoRRHH(f, datos, variablesPrueba);
  assert.match(html, /Ana Prueba/);
  assert.match(html, /Empresa de Prueba/);
  assert.doesNotMatch(html, /\[Pendiente:|\[Completar:|\{\{/);
  const base = prepararBaseFormato(f);
  assert.doesNotMatch(base.contenido_html, /Ana Prueba|Laura Prueba|SERIE-PRUEBA|rh@example.test/);
  assert.equal(detectarFormatoBase(base), f);
  assert.equal(detectarFormatoBase({...base, contenido_html: base.contenido_html + '<p>Cambio manual</p>'}), null);
  const malicioso = { ...datos, lugar: '<img src=x onerror="alert(1)">{{empleado.salario}}' };
  const escaped = renderFormatoRRHH(f, malicioso, { ...variablesPrueba, 'empleado.nombre': '<script>1</script>' });
  assert.doesNotMatch(escaped, /<img|<script>|\{\{empleado.salario/);
  assert.match(escaped, /&lt;img/);
});
test('fechas imposibles, cantidades negativas, inventarios vacíos y periodos invertidos se rechazan', () => {
  const f = obtenerFormatoRRHH('viaticos'), d = datosPrueba(f);
  assert.ok(validarDatosFormato(f, {...d, inicio:'2026-02-30'}));
  assert.ok(validarDatosFormato(f, {...d, inicio:'2026-10-09', fin:'2026-10-08'}));
  assert.ok(validarDatosFormato(f, {...d, anticipo:'-1'}));
  assert.ok(validarDatosFormato(f, {...d, gastos:[]}));
  assert.ok(validarDatosFormato(f, {...d, gastos:Array(16).fill(d.gastos[0])}));
  assert.deepEqual(resumenViaticos({...d, anticipo:'1500', gastos:[{importe:'1200.50'}, {importe:'100.25'}]}), {anticipo:1500, comprobado:1300.75, saldo:199.25});
});
test('condicionales no obligan a inventar datos; las decisiones requieren selección expresa', () => {
  const constancia = obtenerFormatoRRHH('constancia-laboral');
  const d = {...datosPrueba(constancia), fin_relacion:''};
  assert.equal(validarDatosFormato(constancia, d), '');
  assert.ok(validarDatosFormato(constancia, {...d, situacion:'Relación laboral concluida'}));
  const imagen = obtenerFormatoRRHH('imagen-voz');
  assert.equal(completarDatosFormato(imagen,{},variablesPrueba).decision, '');
  assert.ok(validarDatosFormato(imagen,{...datosPrueba(imagen),decision:''}));
  assert.match(renderFormatoRRHH(imagen,{...datosPrueba(imagen),decision:'No autorizo el uso de mi imagen y voz'},variablesPrueba), /Si se indica No autorizo, no se concede permiso alguno/);
});
test('los datos se vuelven a obtener de la persona elegida y se respeta un campo borrado', () => {
  const f = obtenerFormatoRRHH('constancia-laboral');
  assert.equal(completarDatosFormato(f,{},variablesPrueba).ingreso, '2024-03-01');
  assert.equal(completarDatosFormato(f,{puesto:''},variablesPrueba).puesto, '');
  assert.equal(completarDatosFormato(f,{}, {...variablesPrueba,'empleado.puesto':'Gerente'}).puesto,'Gerente');
});
test('dos documentos reutilizan una base por empresa sin mezclar datos ni sobrescribir', async () => {
  const f = obtenerFormatoRRHH('responsiva-equipo'), payload = prepararBaseFormato(f), filas = [];
  const api = { listar:async({empresa})=>({data:filas.filter(p=>p.id_empresa===empresa)}),getById:async id=>filas.find(p=>p.id_plantilla===id),crear:async({empresa},body)=>filas.push({...body,id_plantilla:filas.length+1,id_empresa:empresa,activo:1}) };
  const a = await guardarCopiaPoliticas(api,'1',payload);
  assert.equal((await guardarCopiaPoliticas(api,'1',payload)).id_plantilla,a.id_plantilla);
  assert.notEqual((await guardarCopiaPoliticas(api,'2',payload)).id_plantilla,a.id_plantilla);
  assert.equal(filas.length,2);
  filas[0].contenido_html += '<p>Edición de la empresa</p>';
  await assert.rejects(guardarCopiaPoliticas(api,'1',payload),/modificada/);
});
