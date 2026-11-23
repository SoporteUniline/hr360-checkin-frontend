// Pruebas del calendario de entrevistas tipo Google Calendar. Uso: node --test scripts/test-whatsapp-calendario.mjs
import assert from "node:assert/strict";
import test from "node:test";
import {
  MINUTOS_FILA, diasDeVista, moverVista, rangoAgenda, posicionBloque, ahoraMx, lineaAhora, mesCalendario, moverMes, nombreDia, tituloVista,
  LEYENDA, sePuedeMover, aceptaCita, textoConfirmarMover, aplicarMovimiento,
} from "../src/lib/whatsapp/calendario.mjs";
import { carriles } from "../src/lib/whatsapp/agenda.mjs";

test("días de la vista y navegación", () => {
  assert.deepEqual(diasDeVista("semana", "2026-11-25").map((d) => d.clave), ["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29"]);
  assert.deepEqual(diasDeVista("dia", "2026-11-25").map((d) => d.clave), ["2026-11-25"]);
  assert.deepEqual(diasDeVista("semana", "x"), []);
  assert.equal(moverVista("semana", "2026-11-25", 1), "2026-12-02");
  assert.equal(moverVista("dia", "2026-11-30", 1), "2026-12-01");
  assert.equal(moverVista("dia", "2026-11-25", -1), "2026-11-24");
});

test("rango de horas con citas y horarios libres", () => {
  assert.deepEqual(rangoAgenda([], []), { desde: 8, hasta: 19 });
  assert.deepEqual(rangoAgenda([{ inicio: "2026-11-25 07:30", fin: "2026-11-25 08:00" }], [{ inicio: "2026-11-25 19:30", fin: "2026-11-25 20:15" }]), { desde: 7, hasta: 21 });
  assert.deepEqual(rangoAgenda([{ inicio: "2026-11-25 23:45" }]), { desde: 8, hasta: 24 });
  assert.deepEqual(rangoAgenda([{ inicio: "basura" }]), { desde: 8, hasta: 19 });
});

test("posición de un horario en la rejilla de 30 min", () => {
  assert.equal(MINUTOS_FILA, 30);
  assert.deepEqual(posicionBloque("2026-11-25 10:30", "2026-11-25 11:00", 8, 80), { top: 200, alto: 40, minutos: 30 });
  assert.deepEqual(posicionBloque("2026-11-25 08:00", null, 8, 80), { top: 0, alto: 40, minutos: 30 });
  assert.deepEqual(posicionBloque("2026-11-25 09:00", "2026-11-25 09:05", 8, 80), { top: 80, alto: 20, minutos: 15 }, "mínimo 15 min");
});

test("citas empalmadas lado a lado (carriles)", () => {
  const c = carriles([
    { id: 1, inicio: "2026-11-25 10:00", fin: "2026-11-25 10:30" },
    { id: 2, inicio: "2026-11-25 10:00", fin: "2026-11-25 11:00" },
    { id: 3, inicio: "2026-11-25 10:30", fin: "2026-11-25 11:00" },
    { id: 4, inicio: "2026-11-25 12:00", fin: "2026-11-25 12:30" },
  ]);
  assert.deepEqual(c, { 1: { carril: 0, total: 2 }, 2: { carril: 1, total: 2 }, 3: { carril: 0, total: 2 }, 4: { carril: 0, total: 1 } });
});

test("ahora en México y línea roja", () => {
  const ahora = new Date("2026-11-25T16:30:00Z"); // 10:30 en CDMX
  assert.deepEqual(ahoraMx(ahora), { dia: "2026-11-25", minutos: 630 });
  assert.equal(lineaAhora(ahora, "2026-11-25", 8, 19, 80), 200);
  assert.equal(lineaAhora(ahora, "2026-11-24", 8, 19, 80), null, "otro día");
  assert.equal(lineaAhora(ahora, "2026-11-25", 11, 19, 80), null, "fuera de rango");
});

test("minicalendario del mes (semanas de lunes a domingo)", () => {
  const m = mesCalendario("2026-11-23");
  assert.equal(m.titulo, "noviembre 2026");
  assert.equal(m.primero, "2026-11-01");
  assert.equal(m.semanas.length, 6);
  assert.deepEqual(m.semanas[0][0], { clave: "2026-10-26", numero: 26, delMes: false });
  assert.deepEqual(m.semanas[0][6], { clave: "2026-11-01", numero: 1, delMes: true });
  assert.deepEqual(m.semanas.at(-1).at(-1), { clave: "2026-12-06", numero: 6, delMes: false });
  assert.equal(mesCalendario("2027-02-10").semanas.length, 4, "febrero 2027 empieza en lunes y cabe en 4 semanas");
  assert.equal(moverMes("2026-11-23", 1), "2026-12-01");
  assert.equal(moverMes("2026-01-15", -1), "2025-12-01");
  assert.equal(nombreDia("2026-11-25"), "miércoles 25 de noviembre");
});

test("título de la vista", () => {
  assert.equal(tituloVista("semana", "2026-11-25"), "noviembre 2026");
  assert.equal(tituloVista("semana", "2026-12-01"), "noviembre – diciembre 2026");
  assert.equal(tituloVista("semana", "2026-12-30"), "diciembre 2026 – enero 2027");
  assert.equal(tituloVista("dia", "2026-11-25"), "miércoles 25 de noviembre de 2026");
});

test("mover: qué se puede mover, a dónde, confirmación y vista optimista", () => {
  assert.deepEqual(LEYENDA.map((l) => l.estado), ["agendada", "confirmada", "asistio", "no_asistio", "cancelada"]);
  assert.equal(sePuedeMover({ estado: "agendada" }), true);
  assert.equal(sePuedeMover({ estado: "asistio" }), false);
  const cita = { id: 7, inicio: "2026-11-25 10:00", fin: "2026-11-25 10:30", estado: "agendada", candidato: { nombre: "Ana Ruiz" } };
  assert.equal(aceptaCita({ inicio: "2026-11-26 09:00", libres: 1 }, cita), true);
  assert.equal(aceptaCita({ inicio: "2026-11-26 09:00", libres: 0 }, cita), false);
  assert.equal(aceptaCita({ inicio: "2026-11-25 10:00", libres: 2 }, cita), false, "mismo horario");
  assert.equal(aceptaCita(null, cita), false);
  assert.equal(textoConfirmarMover(cita, "2026-11-26 09:00"), "¿Mover la entrevista de Ana Ruiz del mié 25 nov · 10:00 a.m. al jue 26 nov · 9:00 a.m.? El agente le avisa del cambio por WhatsApp.");
  const r = aplicarMovimiento([cita, { id: 8, inicio: "2026-11-25 11:00" }], { id: 7, inicio: "2026-11-26 09:00" });
  assert.deepEqual(r[0], { ...cita, inicio: "2026-11-26 09:00", fin: "2026-11-26 09:30", moviendo: true });
  assert.equal(r[1].inicio, "2026-11-25 11:00");
  assert.equal(aplicarMovimiento([cita], null)[0], cita);
});
