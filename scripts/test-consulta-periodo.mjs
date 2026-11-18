import assert from "node:assert/strict";
import test from "node:test";
import { cargarPeriodoCompleto, parametrosPeriodo } from "../src/lib/asistencia/consultaPeriodo.mjs";

const filtros = {
  idEmpresa: 7, fechaInicio: "2026-11-01", fechaFin: "2026-11-15",
  filtroEmpleado: "ana", filtroDepartamento: ["Ventas", "Cocina"], filtroTipoRegistro: "",
  filtroEstadoAsistencia: null, soloPresentes: true, horasExtra: true, sinGoceDeSueldo: true,
};

test("los parámetros llevan empresa, fechas y solo los filtros activos", () => {
  const p = parametrosPeriodo(filtros);
  assert.equal(p.get("empresa"), "7");
  assert.equal(p.get("fechaInicio"), "2026-11-01");
  assert.equal(p.get("limit"), "1");
  assert.equal(p.get("filtroEmpleado"), "ana");
  assert.equal(p.get("filtroDepartamento"), JSON.stringify(["Ventas", "Cocina"]));
  assert.equal(p.has("filtroTipoRegistro"), false);
  assert.equal(p.has("filtroEstadoAsistencia"), false);
  assert.equal(p.get("soloPresentes"), "1");
  assert.equal(p.get("horasExtra"), "1");
  assert.equal(p.get("sinGoceDeSueldo"), "0");
  assert.equal(p.has("soloAusentes"), false);
});

test("pide el total y después todo el periodo (no solo la página visible)", async () => {
  const pedidos = [];
  const fetcher = async (url) => {
    pedidos.push(new URL(url, "http://x").searchParams);
    return pedidos.length === 1
      ? { total: 3, registros: [{ id: 1 }] }
      : { total: 3, registros: [{ id: 1 }, { id: 2 }, { id: 3 }] };
  };
  const r = await cargarPeriodoCompleto(fetcher, filtros);
  assert.equal(pedidos.length, 2);
  assert.equal(pedidos[0].get("limit"), "1");
  assert.equal(pedidos[1].get("limit"), "3");
  assert.equal(pedidos[1].get("filtroEmpleado"), "ana");
  assert.deepEqual(r, { registros: [{ id: 1 }, { id: 2 }, { id: 3 }], total: 3, completo: true });
});

test("detecta cuando el servidor devuelve menos registros de los que reporta", async () => {
  let n = 0;
  const fetcher = async () => (++n === 1 ? { total: 500 } : { registros: new Array(100).fill({}) });
  const r = await cargarPeriodoCompleto(fetcher, filtros);
  assert.equal(r.completo, false);
  assert.equal(r.total, 500);
  assert.equal(r.registros.length, 100);
});

test("periodo vacío o sin empresa: no hace la segunda consulta", async () => {
  let llamadas = 0;
  const fetcher = async () => { llamadas++; return { total: 0 }; };
  assert.deepEqual(await cargarPeriodoCompleto(fetcher, filtros), { registros: [], total: 0, completo: true });
  assert.equal(llamadas, 1);
  assert.deepEqual(await cargarPeriodoCompleto(fetcher, { ...filtros, idEmpresa: null }), { registros: [], total: 0, completo: true });
  assert.equal(llamadas, 1);
});

test("un error de red se propaga (Exportar no entrega un archivo a medias)", async () => {
  await assert.rejects(cargarPeriodoCompleto(async () => { throw new Error("red"); }, filtros), /red/);
});
