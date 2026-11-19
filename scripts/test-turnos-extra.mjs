import { test } from "node:test";
import assert from "node:assert/strict";
import {
  semanaDe, textoSemana, textoDia, duracion, faseTurno, estadoPersona, salioAntes,
  filtrarCandidatos, departamentos, resumenSeleccion,
} from "../src/lib/asistencia/turnosExtra.mjs";

test("semana lunes–domingo y textos", () => {
  assert.deepEqual(semanaDe("2027-01-22"), { inicio: "2027-01-18", fin: "2027-01-24" });
  assert.deepEqual(semanaDe("2027-01-24"), { inicio: "2027-01-18", fin: "2027-01-24" });
  assert.equal(textoSemana(semanaDe("2027-01-22")), "Semana 18 – 24 ene 2027");
  assert.equal(textoSemana(semanaDe("2027-02-01")), "Semana 1 – 7 feb 2027");
  assert.equal(textoSemana(semanaDe("2026-12-30")), "Semana 28 dic – 3 ene 2027");
  assert.equal(textoDia("2027-01-22"), "Vie 22 ene");
});

test("duración, también cruzando medianoche", () => {
  assert.equal(duracion("11:00", "19:00"), 480);
  assert.equal(duracion("22:00", "02:00"), 240);
  assert.equal(duracion("10:00", "10:00"), 0);
});

test("fase del turno según la hora", () => {
  const t = { fecha: "2027-01-22", hora_inicio: "11:00", hora_fin: "19:00", estado: "programado" };
  const min = (h) => Math.floor(Date.UTC(2027, 0, 22, h) / 60000);
  assert.equal(faseTurno(t, min(9)), "programado");
  assert.equal(faseTurno(t, min(15)), "en_curso");
  assert.equal(faseTurno(t, min(20)), "terminado");
  assert.equal(faseTurno({ ...t, estado: "cancelado" }, min(15)), "cancelado");
});

test("estado de la persona", () => {
  assert.equal(estadoPersona({ estado: "trabajando", llegoTarde: 42 }).texto, "Llegó 42 min tarde");
  assert.equal(estadoPersona({ estado: "trabajando", llegoTarde: 0 }).tono, "azul");
  assert.equal(estadoPersona({ estado: "no_se_presento" }).texto, "No se ha presentado");
  assert.equal(estadoPersona({ estado: "termino", llegoTarde: 0 }).texto, "Terminó");
});

const lista = [
  { id_empleado: 1, nombre_empleado: "Iván Delgado", departamento: "Producción", salida_anterior: "2027-01-22 09:02:00", duracion: 480, triples: 0, grave: true, avisos: [{ nivel: "grave" }] },
  { id_empleado: 2, nombre_empleado: "Hilda Ramos", departamento: "Almacén", salida_anterior: null, duracion: 480, triples: 120, grave: false, avisos: [{ nivel: "aviso" }] },
  { id_empleado: 3, nombre_empleado: "Gabriel Núñez", departamento: "Producción", salida_anterior: "2027-01-21 19:00:00", duracion: 480, triples: 0, grave: false, avisos: [{ nivel: "info" }] },
];

test("filtro «salieron hoy de su turno», departamento y búsqueda sin acentos", () => {
  assert.equal(salioAntes(lista[0], "2027-01-22", "11:00"), true);
  assert.equal(salioAntes(lista[2], "2027-01-22", "11:00"), false); // salió hace 16 h
  const f = (o) => filtrarCandidatos(lista, { fecha: "2027-01-22", horaInicio: "11:00", ...o }).map((c) => c.id_empleado);
  assert.deepEqual(f({ filtro: "salieron" }), [1]);
  assert.deepEqual(f({ filtro: "depto:Producción" }), [1, 3]);
  assert.deepEqual(f({ buscar: "nunez" }), [3]);
  assert.deepEqual(departamentos(lista), [{ nombre: "Producción", total: 2 }, { nombre: "Almacén", total: 1 }]);
});

test("resumen de lo elegido", () => {
  const r = resumenSeleccion(lista, new Set([1, 2]));
  assert.equal(r.personas, 2);
  assert.equal(r.minutos, 960);
  assert.equal(r.triples, 120);
  assert.equal(r.conAvisos, 2);
  assert.deepEqual(r.graves.map((g) => g.id_empleado), [1]);
});
