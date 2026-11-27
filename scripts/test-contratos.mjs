// Contratos · vista de detalle (27/11/2026): reglas de presentación (estado, vigencia, «vence en N días», resumen de
// firmas, UNA acción principal, sueldo en palabras), HTML del contrato limpio, copia del catálogo de variables y las
// reglas de las vistas de detalle (docs/vistas-de-detalle.md): sin fondos degradados, letra y botones mínimos.
// Uso: node --test scripts/test-contratos.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  estadoContrato, vigenciaTexto, alertaVence, firmaResumen, firmantes, accionPrimaria, ETIQUETA_ACCION, lineaDeTiempo, sueldoTarjeta,
  iniciales, dinero, fechaCorta, mensajeDeError, porPeriodo,
} from "../src/lib/contratos/detalleContrato.mjs";
import { limpiarHtmlContrato, resaltarVariables, variablesUsadas } from "../src/lib/contratos/htmlContrato.mjs";
import { VARIABLES_CONTRATO, RAPIDAS, CLAVES_CONTRATO } from "../src/lib/contratos/variablesContrato.mjs";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

test("estado, vigencia y aviso de vencimiento", () => {
  assert.deepEqual(estadoContrato("activo"), { texto: "Vigente", tono: "exito" });
  assert.equal(estadoContrato("Terminado").texto, "Terminado");
  assert.equal(vigenciaTexto({ fecha_inicio: "2025-01-10" }), "Desde 10 ene 2025 · sin fecha de término");
  assert.equal(vigenciaTexto({ fecha_inicio: "2025-01-10", fecha_fin: "2025-07-09" }), "Del 10 ene 2025 al 9 jul 2025");
  assert.equal(alertaVence(null), null);
  assert.equal(alertaVence(45), null);
  assert.deepEqual(alertaVence(12), { texto: "Vence en 12 días", tono: "aviso" });
  assert.deepEqual(alertaVence(1), { texto: "Vence en 1 día", tono: "error" });
  assert.equal(alertaVence(0).texto, "Vence hoy");
  assert.equal(alertaVence(-3).texto, "Venció hace 3 días");
  assert.equal(fechaCorta("2026-11-12 10:42"), "12 nov 2026 · 10:42");
});

test("firmas: resumen, tarjetas y una sola acción principal según el estado", () => {
  const sin = { empleado: { firmado: false }, empresa: { firmado: false }, solicitud: null };
  const empresa = { empleado: { firmado: false }, empresa: { firmado: true, fecha: "2026-11-12", nombre: "Laura Ríos" }, solicitud: null };
  const enviado = { ...empresa, solicitud: { estatus: "pendiente", vence: "2026-11-15 10:00" } };
  const ambos = { empleado: { firmado: true, fecha: "2026-11-13" }, empresa: { firmado: true, fecha: "2026-11-12", nombre: "Laura Ríos" }, solicitud: { estatus: "firmado" } };
  const vigente = { estatus: "activo" };
  assert.equal(firmaResumen(sin).texto, "Sin firmar");
  assert.equal(firmaResumen({ ...sin, empleado: { firmado: true } }).texto, "Falta firma de la empresa");
  assert.equal(firmaResumen(enviado).texto, "Esperando la firma de la persona");
  assert.equal(firmaResumen(ambos).tono, "exito");
  assert.deepEqual([sin, empresa, enviado, ambos].map((f) => accionPrimaria({ contrato: vigente, firma: f })), ["firmar_empresa", "mandar_firmar", "reenviar", "descargar"]);
  assert.equal(accionPrimaria({ contrato: { estatus: "terminado" }, firma: sin }), "descargar");
  assert.equal(ETIQUETA_ACCION.firmar_empresa, "Firmar como empresa");
  const t = firmantes(enviado, "Ana Torres");
  assert.deepEqual(t.map((x) => x.estado), ["enviado", "firmado"]);
  assert.match(t[1].detalle, /Firmó Laura Ríos el 12 nov 2026/);
  assert.match(t[0].detalle, /vence el 15 nov 2026/);
});

test("sueldo en palabras: al mes, el pago y el diario (lo que manda el servidor)", () => {
  assert.deepEqual(sueldoTarjeta({ salario_base: 5250, periodicidad_pago: "Quincenal", salario_diario: 350, salario_mensual: 10500 }),
    { principal: "$10,500", sufijo: "al mes", detalle: "Pago quincenal · $5,250.00 a la quincena · $350.00 diarios" });
  assert.equal(sueldoTarjeta({ salario_base: 10500, periodicidad_pago: "Mensual", salario_diario: 350, salario_mensual: 10500 }).detalle, "Pago mensual · $350.00 diarios");
  // (27/11/2026) CT-2026-0007: 5,000 con «quincenal» en minúsculas, que los cálculos leen como mensual ($166.67 diarios):
  // la quincena es $2,500 (el servidor la manda en `pago`); antes decía «Pago quincenal · $5,000.00».
  const ct7 = { salario_base: 5000, periodicidad_pago: "quincenal", salario_diario: 166.67, salario_mensual: 5000 };
  assert.deepEqual(sueldoTarjeta({ ...ct7, pago: { periodicidad: "Quincenal", monto: 2500 } }),
    { principal: "$5,000", sufijo: "al mes", detalle: "Pago quincenal · $2,500.00 a la quincena · $166.67 diarios" });
  assert.equal(sueldoTarjeta(ct7).detalle, "Pago quincenal · $166.67 diarios", "sin `pago`, no se inventa el monto");
  assert.equal(sueldoTarjeta({ salario_base: 10500, periodicidad_pago: "Mensual", salario_diario: 350, salario_mensual: 10500, pago: { periodicidad: "Quincenal", monto: 5250 } }).detalle,
    "Pago quincenal · $5,250.00 a la quincena · $350.00 diarios", "el vigente se paga en el periodo de la ficha");
  assert.equal(dinero(11142.86), "$11,142.86");
  assert.equal(porPeriodo("Semanal"), "a la semana");
  assert.equal(iniciales("Ana Torres Ruiz"), "AT");
});

test("historial y mensajes de error del servidor", () => {
  const l = lineaDeTiempo([{ id: 2, tipo: "convenio", titulo: "Convenio: sueldo $9,800.00 → $10,500.00", fecha: "2026-11-01 09:00", nombre_usuario: "Laura Ríos" }, { id: 1, tipo: "editado", titulo: "Datos editados", fecha: "2026-10-01 10:00" }]);
  assert.deepEqual(l.map((e) => [e.destacado, e.detalle]), [[true, "1 nov 2026 · 09:00 · Laura Ríos"], [false, "1 oct 2026 · 10:00"]]);
  assert.match(mensajeDeError({ response: { data: { codigo: "FALTAN_DATOS", faltantes: [{ etiqueta: "CURP" }, { etiqueta: "RFC" }] } } }), /Faltan datos para el contrato: CURP, RFC/);
  assert.equal(mensajeDeError({ response: { data: { error: "Ya firmó" } } }), "Ya firmó");
});

test("HTML del contrato: sin scripts ni manejadores; variables resaltadas con su nombre en palabras", () => {
  const limpio = limpiarHtmlContrato('<p onclick="x()">Hola</p><script>alert(1)</script><iframe src="x"></iframe><a href="javascript:alert(1)">y</a>');
  assert.doesNotMatch(limpio, /onclick|<script|<iframe|javascript:/i);
  const r = resaltarVariables("<p>Sueldo: {{contrato.sueldo_letra}} · {{ empleado.curp }} · {{otra.cosa}}</p>");
  assert.match(r, /data-variable="contrato\.sueldo_letra"[^>]*>Sueldo con letra</);
  assert.match(r, />CURP</);
  assert.match(r, />otra\.cosa</);
  assert.deepEqual(variablesUsadas("{{a.b}} {{ a.b }} {{c.d}}"), ["a.b", "c.d"]);
});

test("catálogo de variables (copia del backend): grupos, etiquetas y accesos rápidos válidos", () => {
  assert.deepEqual(VARIABLES_CONTRATO.map((g) => g.grupo), ["Contrato", "Persona", "Empresa", "Fecha"]);
  assert.equal(new Set(CLAVES_CONTRATO).size, CLAVES_CONTRATO.length);
  for (const g of VARIABLES_CONTRATO) for (const [clave, etiqueta] of g.claves) assert.ok(/^[a-z]+\.[a-z_]+$/.test(clave) && etiqueta, clave);
  for (const lista of Object.values(RAPIDAS)) for (const c of lista) assert.ok(CLAVES_CONTRATO.includes(c), c);
  // Lo que pidió el dueño en el editor.
  for (const c of ["contrato.puesto", "contrato.lugar_de_trabajo", "contrato.sueldo", "contrato.sueldo_letra", "contrato.periodicidad", "contrato.fecha_inicio", "contrato.fecha_fin", "contrato.tipo", "contrato.horario", "contrato.dia_descanso", "contrato.prestaciones", "contrato.vacaciones_ley", "contrato.prima_vacacional", "contrato.aguinaldo_dias", "empresa.razon_social", "empresa.representante", "empresa.domicilio_fiscal", "empleado.curp", "empleado.rfc", "empleado.domicilio"]) {
    assert.ok(CLAVES_CONTRATO.includes(c), c);
  }
});

test("vistas de detalle: sin fondos degradados, títulos en 700 (nunca 800) y botones de 48 px", () => {
  const archivos = [
    ...readdirSync(path.join(RAIZ, "src/components/detalle")).map((f) => `src/components/detalle/${f}`),
    "src/app/panel/contratos/[id]/DetalleContrato.jsx", "src/app/panel/contratos/[id]/DialogosContrato.jsx", "src/app/panel/contratos/revisar-sueldos/page.jsx",
    "src/components/documentos/EditorContrato.jsx", "src/components/documentos/PlantillasContratoBase.jsx", "src/components/nomina/AvisoSueldosPorRevisar.jsx",
  ];
  for (const f of archivos) {
    const t = readFileSync(path.join(RAIZ, f), "utf8");
    assert.doesNotMatch(t, /gradient/i, `${f}: el dueño no quiere fondos degradados`);
    assert.doesNotMatch(t, /font-extrabold|font-black|fontWeight:\s*[89]00/, `${f}: títulos en 700`);
    assert.doesNotMatch(t, /text-(xs|\[1[0-4]px\])/, `${f}: letra ≥ 15 px (cuerpo ≥ 16)`);
  }
  assert.match(readFileSync(path.join(RAIZ, "src/components/detalle/BarraAcciones.jsx"), "utf8"), /min-h-12/);
});

test("horario corto para la tarjeta Jornada", async () => {
  const { horarioCorto } = await import("../src/lib/contratos/detalleContrato.mjs");
  assert.equal(horarioCorto("Entrada: 08:00 | Salida: 16:00 | Comida: 12:00 - 12:30"), "08:00 a 16:00 · comida 12:00 a 12:30");
  assert.equal(horarioCorto("L a S de 8 a 16"), "L a S de 8 a 16");
});
