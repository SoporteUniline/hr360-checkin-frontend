// Formulario del contrato (27/11/2026, INC-CONTRATO-EDITAR-001): editar no borra ni cambia lo que la persona no tocó.
// Uso: node --test scripts/test-formulario-contrato.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formularioDesdeContrato, cambiosDeEdicion, hayCambios, partirHorario, armarHorario, opcionDe, estaEnLista, JORNADAS, MODALIDADES, TIPOS_OPCIONES,
  validarFormulario, cuerpoDeAlta, formularioParaDuplicar, formularioDesdeFicha, formularioVacio, queSePuedeEditar, pestanaDe, pideFechaFin,
} from "../src/lib/contratos/formularioContrato.mjs";

// Un contrato como lo manda GET /contratos/:id/detalle (SELECT * con DECIMAL en texto), con valores como los escriben
// el convenio, la renovación o la ficha («Quincenal», «Diurna», «Presencial»).
const CONTRATO = {
  id: 7, folio: "CT-2026-0007", id_empresa: 7, id_empleado: 15, tipo_contrato: "Temporal", fecha_inicio: "2026-11-01", fecha_fin: "2027-01-31",
  puesto: "Cajera", departamento: "Ventas", jefe_inmediato_id: 16, salario_base: "5000.00", periodicidad_pago: "Quincenal", moneda: "MXN",
  tipo_jornada: "Diurna", horas_semanales: 48, horario: "Entrada: 08:00 | Salida: 16:00 | Comida: 12:00 - 12:30", dias_vacaciones: 14, aguinaldo_dias: 20,
  prima_vacacional_porcentaje: "30.00", prima_vacacional: "30.00", prestaciones_superiores: "Vales de despensa", lugar_trabajo: "Sucursal Centro",
  modalidad_trabajo: "Presencial", estatus: "activo", notas: "Temporada navideña", congelado: false, firmado_empleado: 0, firmado_empresa: 0,
};

test("RED del incidente: los campos de lista guardados con otras mayúsculas se ven llenos, no en blanco", () => {
  const f = formularioDesdeContrato(CONTRATO);
  assert.equal(f.tipo_contrato, "temporal");
  assert.equal(f.tipo_jornada, "diurna");
  assert.equal(f.modalidad_trabajo, "presencial");
  for (const [valor, lista] of [[f.tipo_contrato, TIPOS_OPCIONES], [f.tipo_jornada, JORNADAS], [f.modalidad_trabajo, MODALIDADES]]) {
    assert.ok(estaEnLista(valor, lista), `${valor} aparece seleccionado en su lista`);
  }
  assert.deepEqual([f.hora_entrada, f.hora_salida, f.hora_comida_inicio, f.hora_comida_fin], ["08:00", "16:00", "12:00", "12:30"]);
  assert.deepEqual([f.salario_base, f.prima_vacacional, f.dias_vacaciones, f.aguinaldo_dias, f.jefe_inmediato_id], ["5000", "30", "14", "20", "16"]);
  // Un valor que no está en la lista se conserva tal cual (la pantalla lo muestra como «guardado»).
  assert.equal(opcionDe("Matutina", JORNADAS), "Matutina");
  assert.equal(estaEnLista("Matutina", JORNADAS), false);
});

test("RED del incidente: abrir y guardar sin tocar nada no manda nada (ni el horario de otro formato)", () => {
  for (const horario of [CONTRATO.horario, "Turno matutino de lunes a sábado", "9:00 a 18:00", null]) {
    const original = formularioDesdeContrato({ ...CONTRATO, horario });
    assert.deepEqual(cambiosDeEdicion(original, { ...original }), {}, `sin cambios con horario ${JSON.stringify(horario)}`);
    assert.equal(hayCambios(original, { ...original }), false);
  }
  const libre = formularioDesdeContrato({ ...CONTRATO, horario: "Turno matutino de lunes a sábado" });
  assert.equal(libre.horario_reconocido, false, "un horario de otro formato se muestra tal cual");
  assert.equal(libre.horario_original, "Turno matutino de lunes a sábado");
  assert.deepEqual([libre.hora_entrada, libre.hora_salida], ["", ""], "y no se inventan 09:00–18:00");
});

test("editar: solo va lo que cambió; el sueldo, la persona y la empresa nunca", () => {
  const original = formularioDesdeContrato(CONTRATO);
  const cambiado = { ...original, puesto: "Cajera principal", salario_base: "9999", periodicidad_pago: "Mensual", id_empleado: "99", id_empresa: "9" };
  assert.deepEqual(cambiosDeEdicion(original, cambiado), { puesto: "Cajera principal" });
  assert.deepEqual(cambiosDeEdicion(original, { ...original, hora_salida: "17:00" }), { horario: "Entrada: 08:00 | Salida: 17:00 | Comida: 12:00 - 12:30" });
  assert.deepEqual(cambiosDeEdicion(original, { ...original, hora_comida_inicio: "", hora_comida_fin: "" }), { horario: "Entrada: 08:00 | Salida: 16:00" });
  assert.deepEqual(cambiosDeEdicion(original, { ...original, notas: "  ", jefe_inmediato_id: "" }), { notas: null, jefe_inmediato_id: null });
  assert.deepEqual(cambiosDeEdicion(original, { ...original, dias_vacaciones: "18", horas_semanales: "40" }), { dias_vacaciones: 18, horas_semanales: 40 });
  // Cambiar a indefinido: se manda el tipo y la fecha de término que quedó (el servidor revisa con lo guardado).
  assert.deepEqual(cambiosDeEdicion(original, { ...original, tipo_contrato: "indefinido" }), { tipo_contrato: "indefinido", fecha_fin: "2027-01-31" });
  assert.equal(hayCambios(original, cambiado), true);
});

test("horario: solo se reconoce el formato de ADAMIA; se arma igual", () => {
  assert.deepEqual(partirHorario("Entrada: 9:00 | Salida: 18:00"), { reconocido: true, original: "Entrada: 9:00 | Salida: 18:00", hora_entrada: "09:00", hora_salida: "18:00", hora_comida_inicio: "", hora_comida_fin: "" });
  assert.equal(partirHorario("De 9:00 a 18:00").reconocido, false);
  assert.equal(partirHorario("Entrada: 25:00 | Salida: 18:00").reconocido, false);
  assert.equal(armarHorario({ hora_entrada: "08:00", hora_salida: "16:00", hora_comida_inicio: "12:00", hora_comida_fin: "12:30" }), "Entrada: 08:00 | Salida: 16:00 | Comida: 12:00 - 12:30");
  assert.equal(armarHorario({ hora_entrada: "", hora_salida: "16:00" }), null);
});

test("validación: lo que pide el servidor y los mínimos de ley, con la pestaña de cada error", () => {
  const vacio = validarFormulario(formularioVacio(), { modo: "nuevo" });
  assert.deepEqual(vacio.map((e) => e.campo), ["id_empresa", "id_empleado", "salario_base", "periodicidad_pago", "tipo_contrato", "fecha_inicio"]);
  assert.deepEqual([...new Set(vacio.map((e) => pestanaDe(e.campo)))], ["persona", "sueldo", "documento"]);
  const f = { ...formularioDesdeContrato(CONTRATO), fecha_fin: "" };
  assert.deepEqual(validarFormulario(f, { modo: "editar" }).map((e) => e.campo), ["fecha_fin"], "temporal sin fecha de término");
  assert.deepEqual(validarFormulario({ ...f, fecha_fin: "2026-10-01" }, { modo: "editar" }).map((e) => e.mensaje), ["La fecha de término no puede ser antes del inicio."]);
  const ley = validarFormulario({ ...f, fecha_fin: "2027-01-31", dias_vacaciones: "10", aguinaldo_dias: "12", prima_vacacional: "20" }, { modo: "editar", vacacionesLey: 12 });
  assert.deepEqual(ley.map((e) => e.campo), ["dias_vacaciones", "aguinaldo_dias", "prima_vacacional"]);
  // Un contrato de antes con menos días que la ley: se pueden corregir otros datos; el mínimo se pide al cambiar ese campo.
  const viejo = { ...f, fecha_fin: "2027-01-31", dias_vacaciones: "6" };
  assert.deepEqual(validarFormulario({ ...viejo, puesto: "Cajera principal" }, { modo: "editar", vacacionesLey: 12, original: viejo }), []);
  assert.deepEqual(validarFormulario({ ...viejo, dias_vacaciones: "8" }, { modo: "editar", vacacionesLey: 12, original: viejo }).map((e) => e.campo), ["dias_vacaciones"]);
  assert.deepEqual(validarFormulario({ ...f, fecha_fin: "2027-01-31", hora_comida_fin: "" }, { modo: "editar" }).map((e) => e.campo), ["hora_comida_inicio"]);
  assert.equal(pideFechaFin("indefinido"), false);
  assert.equal(pideFechaFin("Temporal"), true);
});

test("alta, duplicar y desde la ficha", () => {
  const ficha = formularioDesdeFicha({ id_empresa: 7, id_empleado: 15, salario_base: "2500", periodicidad_pago: "quincenal" });
  assert.deepEqual([ficha.id_empresa, ficha.id_empleado, ficha.salario_base, ficha.periodicidad_pago], ["7", "15", "2500", "Quincenal"]);
  const cuerpo = cuerpoDeAlta({ ...ficha, tipo_contrato: "indefinido", fecha_inicio: "2026-12-01", fecha_fin: "2027-01-01" }, { elaboradoPor: 3 });
  assert.equal(cuerpo.fecha_fin, "2027-01-01");
  assert.equal(cuerpoDeAlta({ ...ficha, tipo_contrato: "indefinido", fecha_inicio: "2026-12-01" }).fecha_fin, null);
  assert.deepEqual([cuerpo.salario_base, cuerpo.periodicidad_pago, cuerpo.horario, cuerpo.es_renovacion, cuerpo.dias_vacaciones, cuerpo.elaborado_por_id],
    [2500, "Quincenal", "Entrada: 09:00 | Salida: 18:00 | Comida: 14:00 - 15:00", 0, null, 3]);

  const dup = formularioParaDuplicar(CONTRATO, { hoy: "2026-11-27" });
  assert.deepEqual([dup.tipo_contrato, dup.fecha_inicio, dup.fecha_fin, dup.periodicidad_pago, dup.periodicidadOrigen, dup.salario_base, dup.puesto, dup.notas],
    ["", "2027-02-01", "", "Quincenal", null, "5000", "Cajera", "Temporada navideña"]);
  assert.equal(cuerpoDeAlta({ ...dup, tipo_contrato: "indefinido" }, { duplicaDe: 7 }).contrato_anterior_id, 7);
  // «quincenal» en minúsculas: los cálculos la leen como mensual; no se copia en silencio como «Quincenal».
  const minus = formularioParaDuplicar({ ...CONTRATO, periodicidad_pago: "quincenal", fecha_fin: null }, { hoy: "2026-11-27" });
  assert.deepEqual([minus.periodicidad_pago, minus.periodicidadOrigen, minus.fecha_inicio], ["", "quincenal", "2026-11-28"]);
});

test("qué se puede editar según el estado (las reglas del servidor)", () => {
  assert.equal(queSePuedeEditar(CONTRATO).editable, true);
  assert.equal(queSePuedeEditar({ ...CONTRATO, estatus: "suspendido" }).editable, true);
  assert.match(queSePuedeEditar({ ...CONTRATO, congelado: true }).motivo, /mandó a firmar o está firmado/);
  assert.equal(queSePuedeEditar({ ...CONTRATO, firmado_empresa: 1 }).editable, false);
  assert.match(queSePuedeEditar({ ...CONTRATO, estatus: "terminado" }).motivo, /ya terminó/);
});
