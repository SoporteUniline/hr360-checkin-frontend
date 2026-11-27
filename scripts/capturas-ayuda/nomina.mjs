// Capturas del Centro de ayuda · bloque Nómina + Ajustes de la cuenta (27/11/2026).
// Corre el sistema real (next start) con el backend SIMULADO en memoria (mismo estilo que scripts/verify-*.mjs) y guarda
// capturas .webp en public/ayuda/capturas/<modulo>/. Solo datos de demostración («Uniline», «Laura Ríos», «Ana Torres»…).
// Uso:
//   NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build
//   PLAYWRIGHT_MODULE_PATH=/opt/node22/lib/node_modules/playwright node scripts/capturas-ayuda/nomina.mjs [solo=nombre,nombre]
// Cada escena es independiente: si una falla se avisa y siguen las demás (el proceso termina con código 1).
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);
const LFT = require("../lib/calculos-lft-servidor.cjs");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const SALIDA = path.resolve(process.env.CAPTURAS_AYUDA || "public/ayuda/capturas");
const SOLO = (process.argv.find((a) => a.startsWith("solo=")) ?? "").slice(5).split(",").filter(Boolean);

const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const secreto = crypto.randomBytes(24).toString("hex");
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (tipo) => {
  const c = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ tipo_usuario: tipo, exp: Math.floor(Date.now() / 1000) + 3600 })}`;
  return `${c}.${crypto.createHmac("sha256", secreto).update(c).digest("base64url")}`;
};
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], {
  stdio: "ignore", detached: true, env: { ...process.env, JWT_SECRET: secreto },
});
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// ——— Datos de demostración ———
const ZONA = "America/Mexico_City";
const RH = {
  id_usuario: 1, tipo_usuario: "Recruiter", nombre: "Laura Ríos", correo: "laura.rios@uniline.mx", id_empresa: 7, empresas: [7],
  empresas_detalle: [{ id_empresa: 7, nombre: "Uniline", estado: "Activo", zona_horaria: ZONA }], zona_horaria: ZONA,
};
const EMPLEADA = { id_usuario: 15, id_empleado: 15, tipo_usuario: "Empleado", nombre: "Ana Torres", id_empresa: 7, empresas: [7], zona_horaria: ZONA };
const sumar = (f, n) => new Date(Date.parse(`${f}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

// Recibos de una semana (lunes a domingo). Números coherentes con el motor de cálculo del servidor (nominaCalculo.js).
function recibos(inicio, envios = {}) {
  const dia = (i, estado, min, extra, retardo, entrada, salida, pagos) => ({
    fecha: sumar(inicio, i), estado, min, extra, programado: estado === "descanso" ? 0 : 480, entrada, salida, retardo, pagos,
    ...(extra ? { dobles: extra, triples: 0 } : {}),
  });
  const ana = {
    id: 11, id_empleado: 15, estado: "vigente", envio_estado: envios.ana ?? null, transferencia_editada: null, folio: "N5-11",
    datos: {
      empleado: { nombre: "Ana Torres", puesto: "Empacadora", periodo_pago: "Semanal", medio_pago: "Mixto", monto_transferencia: 1500, correo: "ana.torres@correo.mx" },
      resumen: { diasPagados: 5.83, diasRango: 7, diasTrabajados: 5, minTrabajados: 2508, minExtra: 120, minDobles: 120, minTriples: 0, faltas: 1, sinGoce: 0, retardos: 1, domingos: 0, festivosTrab: 0, descansosTrab: 0, sueldo: 210000, diario: 30000, periodoPago: "Semanal" },
      alertas: [],
      dias: [
        dia(0, "trabajado", 600, 120, false, "09:00", "19:00", [{ texto: "2 h extra al doble", importe: 15000 }]),
        dia(1, "trabajado", 480, 0, false, "09:00", "17:00"),
        dia(2, "trabajado", 480, 0, false, "08:58", "17:00"),
        dia(3, "trabajado", 468, 0, true, "09:12", "17:00"),
        dia(4, "falta", 0, 0, false, null, null),
        dia(5, "trabajado", 480, 0, false, "09:00", "17:00"),
        dia(6, "descanso", 0, 0, false, null, null),
      ],
    },
    total_percepciones: 2100, total_descuentos: 0, neto: 2100, transferencia: 1500, efectivo: 600,
    lineas: [
      { clave: "sueldo", concepto: "Sueldo (días pagados)", tipo: "percepcion", cantidad: 5.83, importe: 1750, importe_sugerido: 1750, editado: 0, origen: "calculo" },
      { clave: "horas_dobles", concepto: "Horas extra dobles", tipo: "percepcion", cantidad: 2, importe: 150, importe_sugerido: 150, editado: 0, origen: "calculo" },
      { clave: "concepto:1", concepto: "Despensa", tipo: "percepcion", cantidad: null, importe: 200, importe_sugerido: 200, editado: 0, origen: "concepto", id_concepto: 1 },
      { clave: "concepto:2", concepto: "Bono de puntualidad", tipo: "percepcion", cantidad: null, importe: 0, importe_sugerido: 0, editado: 0, origen: "concepto", id_concepto: 2, nota: "No cumple: 1 retardo" },
      { clave: "concepto:3", concepto: "Bono de asistencia", tipo: "percepcion", cantidad: null, importe: 0, importe_sugerido: 0, editado: 0, origen: "concepto", id_concepto: 3, nota: "No cumple: 1 falta" },
    ],
  };
  const carlos = {
    id: 12, id_empleado: 12, estado: "vigente", envio_estado: envios.carlos ?? null, envio_error: envios.carlos === "error" ? "No se pudo entregar el correo. Intenta de nuevo." : null, transferencia_editada: null, folio: "N5-12",
    datos: {
      empleado: { nombre: "Carlos Terriquez", puesto: "Operador", periodo_pago: "Semanal", medio_pago: "Transferencia", correo: "carlos.t@correo.mx" },
      resumen: { diasPagados: 7, diasRango: 7, diasTrabajados: 6, minTrabajados: 2880, minExtra: 0, minDobles: 0, minTriples: 0, faltas: 0, sinGoce: 0, retardos: 0, domingos: 0, festivosTrab: 0, descansosTrab: 0, sueldo: 245000, diario: 35000, periodoPago: "Semanal" },
      alertas: [],
      dias: [0, 1, 2, 3, 4, 5].map((i) => dia(i, "trabajado", 480, 0, false, "08:00", "16:00")).concat([dia(6, "descanso", 0, 0, false, null, null)]),
    },
    total_percepciones: 3200, total_descuentos: 250, neto: 2950, transferencia: 2950, efectivo: 0,
    lineas: [
      { clave: "sueldo", concepto: "Sueldo (días pagados)", tipo: "percepcion", cantidad: 7, importe: 2450, importe_sugerido: 2450, editado: 0, origen: "calculo" },
      { clave: "concepto:1", concepto: "Despensa", tipo: "percepcion", cantidad: null, importe: 200, importe_sugerido: 200, editado: 0, origen: "concepto", id_concepto: 1 },
      { clave: "concepto:2", concepto: "Bono de puntualidad", tipo: "percepcion", cantidad: null, importe: 250, importe_sugerido: 250, editado: 0, origen: "concepto", id_concepto: 2 },
      { clave: "concepto:3", concepto: "Bono de asistencia", tipo: "percepcion", cantidad: null, importe: 300, importe_sugerido: 300, editado: 0, origen: "concepto", id_concepto: 3 },
      { clave: "prestamo:2", concepto: "Abono a préstamo #2", tipo: "descuento", cantidad: null, importe: 250, importe_sugerido: 250, editado: 0, origen: "calculo", nota: "Saldo $500.00 · abono pactado $250.00" },
    ],
  };
  const frida = {
    id: 13, id_empleado: 13, estado: "vigente", envio_estado: envios.frida ?? null, transferencia_editada: null, folio: "N5-13",
    datos: {
      empleado: { nombre: "Frida Serrano", puesto: "Vendedora", periodo_pago: "Semanal", medio_pago: null },
      resumen: { diasPagados: 5, diasRango: 7, diasTrabajados: 4, minTrabajados: 1920, minExtra: 0, minDobles: 0, minTriples: 0, faltas: 0, sinGoce: 0, retardos: 0, domingos: 0, festivosTrab: 0, descansosTrab: 0, sueldo: 196000, diario: 28000, periodoPago: "Semanal" },
      alertas: [`Ingresó el ${sumar(inicio, 2)}: se pagan solo sus días activos.`, "No tiene medio de pago: se tomó en efectivo."],
      dias: [dia(0, "inactivo", 0, 0, false, null, null), dia(1, "inactivo", 0, 0, false, null, null)]
        .concat([2, 3, 4, 5].map((i) => dia(i, "trabajado", 480, 0, false, "10:00", "18:00")), [dia(6, "descanso", 0, 0, false, null, null)]),
    },
    total_percepciones: 1600, total_descuentos: 0, neto: 1600, transferencia: 0, efectivo: 1600,
    lineas: [
      { clave: "sueldo", concepto: "Sueldo (días pagados)", tipo: "percepcion", cantidad: 5, importe: 1400, importe_sugerido: 1400, editado: 0, origen: "calculo" },
      { clave: "concepto:1", concepto: "Despensa", tipo: "percepcion", cantidad: null, importe: 200, importe_sugerido: 200, editado: 0, origen: "concepto", id_concepto: 1 },
    ],
  };
  return [ana, carlos, frida];
}
const periodoBase = { id_empresa: 7, periodicidad: "Semanal", empleados: 3, total_neto: 6650, total_transferencia: 4450, total_efectivo: 2200, creado_por_nombre: "Laura Ríos" };
const PERIODOS = [
  { ...periodoBase, id: 5, fecha_inicio: "2026-11-16", fecha_fin: "2026-11-22", estado: "borrador", version: 3 },
  { ...periodoBase, id: 4, fecha_inicio: "2026-11-09", fecha_fin: "2026-11-15", estado: "por_autorizar", version: 6 },
  { ...periodoBase, id: 3, fecha_inicio: "2026-11-02", fecha_fin: "2026-11-08", estado: "autorizado", version: 9, total_neto: 6480, autorizado_por_nombre: "Roberto Méndez" },
  { ...periodoBase, id: 2, fecha_inicio: "2026-10-26", fecha_fin: "2026-11-01", estado: "autorizado", version: 8, total_neto: 6300, autorizado_por_nombre: "Roberto Méndez" },
  { ...periodoBase, id: 1, fecha_inicio: "2026-10-26", fecha_fin: "2026-11-01", estado: "cancelado", version: 4, total_neto: 6120, cancelado_por_nombre: "Roberto Méndez", motivo_cancelacion: "Faltaba capturar el bono de productividad." },
];
const reciboEnvios = { 3: { ana: "enviado", carlos: "error", frida: "sin_correo" }, 2: { ana: "enviado", carlos: "enviado", frida: "enviado" } };

const CONCEPTOS = [
  { id: 1, id_empresa: 7, nombre: "Despensa", tipo: "percepcion", forma: "fijo", condicion: null, valor: 200, activo: 1, para_todos: 1, asignados: 0 },
  { id: 2, id_empresa: 7, nombre: "Bono de puntualidad", tipo: "percepcion", forma: "condicionado", condicion: "sin_retardos", valor: 250, activo: 1, para_todos: 0, asignados: 2 },
  { id: 3, id_empresa: 7, nombre: "Bono de asistencia", tipo: "percepcion", forma: "condicionado", condicion: "sin_faltas", valor: 300, activo: 1, para_todos: 0, asignados: 2 },
  { id: 4, id_empresa: 7, nombre: "Descuento por uniforme", tipo: "descuento", forma: "manual", condicion: null, valor: 150, activo: 1, para_todos: 0, asignados: 1 },
  { id: 6, id_empresa: 7, nombre: "Vales de gasolina", tipo: "percepcion", forma: "fijo", condicion: null, valor: 400, activo: 0, para_todos: 0, asignados: 0 },
];
const PERSONAS_BONO = [
  { id_empleado: 15, nombre: "Ana Torres", puesto: "Empacadora", lo_tiene: true, quitado: false, valor: null },
  { id_empleado: 12, nombre: "Carlos Terriquez", puesto: "Operador", lo_tiene: true, quitado: false, valor: 300 },
  { id_empleado: 13, nombre: "Frida Serrano", puesto: "Vendedora", lo_tiene: false, quitado: false, valor: null },
  { id_empleado: 14, nombre: "Héctor León", puesto: "Almacenista", lo_tiene: false, quitado: false, valor: null },
  { id_empleado: 16, nombre: "Valeria Castillo", puesto: "Compras", lo_tiene: false, quitado: false, valor: null },
];
const PRESTAMOS = [
  { id: 3, id_empresa: 7, id_empleado: 15, empleado: "Ana Torres", monto: 3000, abono: 500, num_pagos: 6, saldo: 3000, motivo: "Consulta médica", origen: "empleado", estado: "solicitado", version: 1, firma_estatus: null, creado_en: "2026-11-21T16:00:00Z", solicitado_por_nombre: "Ana Torres" },
  { id: 4, id_empresa: 7, id_empleado: 13, empleado: "Frida Serrano", monto: 2000, abono: 400, num_pagos: 5, saldo: 2000, motivo: "Útiles escolares", origen: "rh", estado: "por_firmar", version: 2, firma_estatus: "pendiente", creado_en: "2026-11-20T17:00:00Z", solicitado_por_nombre: "Laura Ríos" },
  { id: 2, id_empresa: 7, id_empleado: 12, empleado: "Carlos Terriquez", monto: 1000, abono: 250, num_pagos: 4, saldo: 500, motivo: "Reparación del auto", origen: "rh", estado: "vigente", version: 4, firma_estatus: "firmado", creado_en: "2026-10-30T16:00:00Z", solicitado_por_nombre: "Laura Ríos" },
  { id: 1, id_empresa: 7, id_empleado: 14, empleado: "Héctor León", monto: 1500, abono: 300, num_pagos: 5, saldo: 0, motivo: null, origen: "empleado", estado: "liquidado", version: 7, firma_estatus: "firmado", creado_en: "2026-08-01T16:00:00Z", solicitado_por_nombre: "Héctor León" },
];
const MOVIMIENTOS = {
  2: [
    { id: 1, tipo: "abono_nomina", importe: 250, saldo_despues: 750, periodo_inicio: "2026-11-02", periodo_fin: "2026-11-08", registrado_por_nombre: "Roberto Méndez", creado_en: "2026-11-09T18:00:00Z" },
    { id: 2, tipo: "abono_efectivo", importe: 250, saldo_despues: 500, nota: "Pagó en caja", registrado_por_nombre: "Laura Ríos", creado_en: "2026-11-12T18:00:00Z" },
  ],
};
let escenaPrestamosEmpleada = "pedir";
// (27/11/2026) «¿En cuántos pagos?»: plan con la MISMA regla del servidor (centavos enteros, el último lleva el resto) y
// un calendario de demostración. Héctor (quincenal, $6,000) tiene tope de $382.32 por quincena.
const QUINCENAL = new Set([14]);
function planDemo({ monto, num_pagos, abono, saldo = monto, id_empleado }) {
  const total = Math.round(monto * 100);
  let n = Number(num_pagos) || 0;
  let a;
  if (n) a = Math.floor(total / n);
  else { a = Math.round(abono * 100); n = total - a <= 99 ? 1 : 1 + Math.ceil((total - a - 99) / a); }
  const s = Math.round(saldo * 100);
  const restantes = s <= 0 ? 0 : s - a <= 99 ? 1 : 1 + Math.ceil((s - a - 99) / a);
  return { num_pagos: n, abono: a / 100, ultimo: (total - a * (n - 1)) / 100, pagos_restantes: restantes, ultimo_restante: restantes ? (s - a * (restantes - 1)) / 100 : null,
    num_pagos_calculado: !num_pagos, periodo_pago: QUINCENAL.has(Number(id_empleado)) ? "Quincenal" : "Semanal" };
}
const calendarioDemo = (plan) => (plan.pagos_restantes ? { primero: { inicio: "2026-12-01", fin: "2026-12-15" }, ultimo: plan.periodo_pago === "Quincenal" ? { inicio: "2027-02-16", fin: "2027-02-28" } : { inicio: "2027-01-05", fin: "2027-01-11" }, aproximado: false, pagos: plan.pagos_restantes } : null);
function simulacionDemo(b, alEmpleado = false) {
  const plan = planDemo(b);
  const tope = plan.periodo_pago === "Quincenal" ? 382.32 : null;
  const alto = Math.max(plan.abono, plan.ultimo);
  const minimos = tope ? Math.ceil((b.monto * 100) / (tope * 100)) : null;
  const avisos = tope && alto > tope ? [`El abono de $${alto.toFixed(2)} pasa del tope de la ley para cada quincena ($382.32: 30 % de ${alEmpleado ? "lo que ganas" : "lo que gana"} arriba del salario mínimo). Con ${minimos} quincenas o más sí cabe.`] : [];
  return { ok: true, plazo: plan.num_pagos, avisos, tope_periodo: tope, pagos_minimos: tope && alto > tope ? minimos : null, plan, calendario: calendarioDemo(plan) };
}

const SUCURSALES = { sucursales: [{ id_sucursal: 1, nombre: "Matriz Colima", id_empresa: 7, empresa_nombre: "Uniline" }, { id_sucursal: 2, nombre: "Sucursal Manzanillo", id_empresa: 7, empresa_nombre: "Uniline" }] };
const EMPLEADOS_AGUINALDO = [
  { id: 15, id_empleado: 15, id_empresa: 7, nombre_completo: "Ana Torres Paz", puesto: "Empacadora", departamento: "Empaque", fecha_ingreso: "2022-03-01", salario_diario: 300, periodicidad_pago: "Semanal", aguinaldo_dias: 15 },
  { id: 12, id_empleado: 12, id_empresa: 7, nombre_completo: "Carlos Terriquez Gil", puesto: "Operador", departamento: "Producción", fecha_ingreso: "2023-06-12", salario_diario: 350, periodicidad_pago: "Semanal", aguinaldo_dias: 15 },
  { id: 13, id_empleado: 13, id_empresa: 7, nombre_completo: "Frida Serrano Luna", puesto: "Vendedora", departamento: "Ventas", fecha_ingreso: "2026-11-18", salario_diario: 280, periodicidad_pago: "Semanal", aguinaldo_dias: 15 },
  { id: 14, id_empleado: 14, id_empresa: 7, nombre_completo: "Héctor León Ruiz", puesto: "Almacenista", departamento: "Almacén", fecha_ingreso: "2026-02-01", salario_diario: 320, periodicidad_pago: "Quincenal", aguinaldo_dias: 15 },
];
// (27/11/2026) Mismo motor que el servidor (copia de services/calculosLft.js en scripts/lib; ver docs/calculos-lft.md).
function aguinaldo(e, corte, anio, noTrab) {
  const r = LFT.calcularAguinaldo({ salario_diario: e.salario_diario, fecha_ingreso: e.fecha_ingreso, fecha_corte: corte, dias_aguinaldo: e.aguinaldo_dias, faltas: noTrab });
  const a = LFT.antiguedad(e.fecha_ingreso, corte);
  return {
    id_empleado: e.id_empleado, id_empresa: 7, nombre_completo: e.nombre_completo, puesto: e.puesto, departamento: e.departamento, fecha_ingreso: e.fecha_ingreso,
    fecha_corte: corte, dias_trabajados: r.dias_trabajados, dias_periodo: r.dias_periodo, dias_anio: r.dias_anio, años_trabajados: a.anios.toFixed(2), años_completos: a.anios_completos,
    salario_diario: r.salario_diario.toFixed(2), salario_mensual: (r.salario_diario * 30).toFixed(2), periodicidad_pago: e.periodicidad_pago, dias_aguinaldo_ley: r.dias_aguinaldo.toFixed(2),
    dias_aguinaldo_calculado: r.dias_proporcionales.toFixed(4), monto_aguinaldo: r.monto.toFixed(2), es_proporcional: r.es_proporcional, dias_no_trabajados: r.faltas.toFixed(2),
    formula: r.formula, explicacion: r.explicacion, version: r.version,
  };
}
const NO_TRAB = { 15: 0, 12: 0, 13: 0, 14: 2 };
const CALCULOS_AGUINALDO = [
  { id_calculo: 3, nombre_empresa: "Uniline", año_fiscal: 2026, fecha_calculo: "2026-11-27", fecha_corte: "2026-12-15", total_empleados: 4, total_general: 14203.15, estado: "Pendiente" },
  { id_calculo: 2, nombre_empresa: "Uniline", año_fiscal: 2025, fecha_calculo: "2025-12-10", fecha_corte: "2025-12-15", total_empleados: 3, total_general: 13120.5, estado: "Pagado" },
  { id_calculo: 1, nombre_empresa: "Uniline", año_fiscal: 2025, fecha_calculo: "2025-12-08", fecha_corte: "2025-12-15", total_empleados: 3, total_general: 12980, estado: "Cancelado" },
];
// Finiquito con el mismo motor del servidor (finiquitosController.calcularFiniquito → services/calculosLft.js).
const INGRESO_HECTOR = "2024-02-01";
function finiquito(b) {
  const pick = (...k) => k.map((x) => b[x]).find((v) => v !== undefined && v !== null && v !== "");
  const calculo = LFT.calcularFiniquito({
    fecha_ingreso: INGRESO_HECTOR, fecha_baja: b.fecha_baja, tipo_terminacion: b.tipo_terminacion,
    salario_diario: pick("salario_diario_manual", "salario_diario") ?? 320, dias_salario_pendiente: b.dias_salario_pendiente,
    faltas_aguinaldo: b.dias_no_trabajados, dias_aguinaldo: b.dias_aguinaldo_manual, prima_vacacional_porcentaje: b.prima_vacacional_porcentaje_manual,
    dias_vacaciones_anio_empresa: b.dias_vacaciones_ley_año_actual, dias_vacaciones_pendientes_anteriores: b.dias_vacaciones_años_anteriores,
    dias_vacaciones_gozadas_anio_actual: b.dias_vacaciones_año_actual_ya_gozadas, zona_salario_minimo: b.zona_salario_minimo,
    incluir_20_dias: b.incluir_20_dias, gratificacion_adicional: b.gratificacion_adicional,
  });
  return {
    ...LFT.aColumnasFiniquito(calculo), id_empleado: 14, id_empresa: 7, nombre_completo: "Héctor León Ruiz", puesto: "Almacenista", departamento: "Almacén",
    periodicidad_pago: "Quincenal", tipo_calculo: calculo.es_liquidacion ? "liquidacion" : "finiquito", calculo, avisos: calculo.avisos, nota_bruto: LFT.NOTA_BRUTO,
    salario_empleado: { salario_diario: 320, origen: "contrato", texto: "Contrato activo: $4,800.00 quincenal ÷ 15 = $320.00 diarios" },
  };
}
const FINIQUITO_GUARDADO = { id_finiquito: 8, ...finiquito({ salario_diario_manual: 320, fecha_baja: "2026-11-27", tipo_terminacion: "Renuncia Voluntaria", dias_salario_pendiente: 5, dias_vacaciones_años_anteriores: 4 }), estado: "Pendiente", motivo_baja: "Cambio de ciudad", nombre_empresa: "Uniline", calculado_por: "laura.rios@uniline.mx", fecha_calculo: "2026-11-27", calculado_version_anterior: false };
const FINIQUITOS = [
  FINIQUITO_GUARDADO,
  { id_finiquito: 7, id_empleado: 16, nombre_completo: "Valeria Castillo Mora", puesto: "Compras", fecha_ingreso: "2021-05-10", fecha_baja: "2026-10-31", años_trabajados: "5.47", tipo_terminacion: "Despido Injustificado", es_liquidacion: 1, total_pagar: 98450.32, estado: "Pagado", nombre_empresa: "Uniline", fecha_calculo: "2026-10-31" },
  { id_finiquito: 6, id_empleado: 17, nombre_completo: "Mario Ochoa Rivas", puesto: "Chofer", fecha_ingreso: "2025-01-15", fecha_baja: "2026-09-15", años_trabajados: "1.67", tipo_terminacion: "Fin de Contrato", es_liquidacion: 0, total_pagar: 7420.1, estado: "Pagado", nombre_empresa: "Uniline", fecha_calculo: "2026-09-15" },
];

const MODULOS_EMPRESA = [
  ["asistencias", "Asistencias", true], ["empleados", "Empleados", true], ["nomina", "Nómina"], ["vacaciones", "Vacaciones"], ["permisos", "Permisos"],
  ["evaluaciones", "Evaluación de desempeño"], ["reclutamiento", "Reclutamiento"], ["tareas", "Tareas y checklists"], ["activos", "Activos y uniformes"],
  ["documentos", "Gestión documental"], ["turnos_extra", "Turnos extra"], ["induccion", "Inducción digital"], ["comunicados", "Centro de comunicados"],
];
const DESCRIPCIONES = {
  asistencias: "Reloj checador, asistencias, entradas y salidas, incidencias, horas extra y reportes de horas.",
  empleados: "Ficha y expediente del empleado, departamentos, puestos, contratos, actas y catálogos.",
  nomina: "Nóminas, bonos y descuentos, préstamos, finiquitos y aguinaldos.",
  vacaciones: "Saldo de vacaciones por ley, planeación, registro y solicitudes de vacaciones.",
  permisos: "Solicitudes de permisos de los empleados y su aprobación.",
  evaluaciones: "Campañas de evaluación, plantillas, resultados y seguimiento.",
  reclutamiento: "Vacantes, postulaciones, WhatsApp con agente, entrevistas y bolsa de trabajo.",
  tareas: "Tareas y proyectos para tu equipo y checklists que se califican solos.",
  activos: "Inventario, entregas y resguardos de activos y uniformes.",
  documentos: "Biblioteca, plantillas, generar documentos y enviarlos a firmar.",
  turnos_extra: "Programar turnos extra con avisos de ley y seguirlos en vivo.",
  induccion: "Nuevos ingresos: datos, documentos y firma desde el celular, checklist del primer día y ruta de bienvenida.",
  comunicados: "Muro de la empresa y comunicados con confirmación de leído por app, correo, push y aviso emergente.",
};
const modulosEmpresa = () => MODULOS_EMPRESA.map(([clave, nombre, esBase]) => {
  if (esBase) return { clave, nombre, descripcion: DESCRIPCIONES[clave], base: true, derecho: true, activo: true, uso: true, origen: "base", contratar: false, nota: null };
  const derecho = !["documentos", "induccion"].includes(clave);
  const activo = derecho && clave !== "turnos_extra";
  return { clave, nombre, descripcion: DESCRIPCIONES[clave], base: false, derecho, activo, uso: activo, origen: clave === "comunicados" ? "extra" : "plan", contratar: !derecho, nota: clave === "comunicados" ? "Prueba de 30 días" : null };
});

const PAQUETES = [{ id: 1, monto_mxn: 200, iva_mxn: 32, total_mxn: 232 }, { id: 2, monto_mxn: 500, iva_mxn: 80, total_mxn: 580 }, { id: 3, monto_mxn: 1000, iva_mxn: 160, total_mxn: 1160 }];
const CREDITOS = {
  ok: true, disponible: true, cobro_activo: true, saldo_mxn: 84.2, ultima_recarga_mxn: 500, saldo_bajo: true, sin_creditos: false, paquetes: PAQUETES, hay_mas: false, mes: "2026-11",
  movimientos: [
    { id: 41, tipo: "consumo", monto_mxn: -0.07, saldo_despues: 84.2, concepto: "Ley Federal del Trabajo", creado_en: "2026-11-25 16:02:11" },
    { id: 40, tipo: "consumo", monto_mxn: -0.31, saldo_despues: 84.27, concepto: "Clima · plan de acción", creado_en: "2026-11-25 15:40:00" },
    { id: 12, tipo: "regalo", monto_mxn: 18.46, saldo_despues: 84.58, concepto: "Crédito de bienvenida de Adamia AI: US$1.00 × $18.4567 = $18.46 MXN", creado_en: "2026-11-20 18:00:00" },
    { id: 3, tipo: "compra", monto_mxn: 500, saldo_despues: 500, concepto: "Recarga con Stripe", creado_en: "2026-11-02 17:30:00" },
  ],
  consumo_mes: [{ funcion: "clima_plan", nombre: "Clima · plan de acción", usos: 12, mxn: 3.72 }, { funcion: "lft", nombre: "Ley Federal del Trabajo", usos: 140, mxn: 9.8 }], compra: null,
};
const LLAVES = [
  { id: 3, nombre: "Nómina externa", prefijo: "adk_live_Xk29PqLm", permisos: ["empleados:leer", "asistencias:leer"], estado: "activa", creada_en: "2026-11-02 10:14:00", creada_por: "Roberto Méndez", expira_en: "2027-01-31 10:14:00", ultimo_uso_en: "2026-11-26 08:58:12", ultimo_uso_ip: "203.0.113.10", revocada_en: null },
  { id: 2, nombre: "Control de acceso", prefijo: "adk_live_Hh71ZzWq", permisos: ["empleados:leer", "empleados:escribir"], estado: "expirada", creada_en: "2026-08-01 12:00:00", creada_por: "Roberto Méndez", expira_en: "2026-10-30 12:00:00", ultimo_uso_en: "2026-10-29 22:10:00", ultimo_uso_ip: "198.51.100.2", revocada_en: null },
  { id: 1, nombre: "Prueba de integración", prefijo: "adk_live_Aa00Bb11", permisos: ["asistencias:leer"], estado: "revocada", creada_en: "2026-07-15 09:00:00", creada_por: "Roberto Méndez", expira_en: null, ultimo_uso_en: null, ultimo_uso_ip: null, revocada_en: "2026-07-20 18:30:00" },
];
const BITACORA = [
  { id: 90, id_llave: 3, llave: "Nómina externa", prefijo: "adk_live_Xk29PqLm", metodo: "GET", ruta: "/api/integracion/v1/asistencias", estado: 200, ms: 84, ip: "203.0.113.10", creado_en: "2026-11-26 08:58:12" },
  { id: 89, id_llave: 3, llave: "Nómina externa", prefijo: "adk_live_Xk29PqLm", metodo: "GET", ruta: "/api/integracion/v1/empleados", estado: 200, ms: 41, ip: "203.0.113.10", creado_en: "2026-11-26 08:58:10" },
  { id: 88, id_llave: 3, llave: "Nómina externa", prefijo: "adk_live_Xk29PqLm", metodo: "POST", ruta: "/api/integracion/v1/empleados", estado: 403, ms: 6, ip: "203.0.113.10", creado_en: "2026-11-25 19:02:44" },
  { id: 86, id_llave: 3, llave: "Nómina externa", prefijo: "adk_live_Xk29PqLm", metodo: "GET", ruta: "/api/integracion/v1/asistencias", estado: 429, ms: 2, ip: "203.0.113.10", creado_en: "2026-11-24 07:00:03" },
];
const LLAVE_NUEVA = "adk_live_RGVtb0FkYW1pYUF5dWRhXzIwMjZfbm9fZXNfcmVhbA";
const plantillaCumple = {
  tipo: "cumpleanos", personalizada: true, diseno: "festivo", asunto: "¡Feliz cumpleaños, {nombre}!",
  mensaje: "Todo el equipo de {empresa} te desea un gran día. Gracias por tu entrega en {área}; que este año te traiga mucho de lo que buscas.\n\n¡Disfrútalo!",
  envio_correo_auto: true, aviso_campana: true, envio_whatsapp_auto: false, revision: 2, actualizado_por: "Laura Ríos", actualizado_en: "2026-11-20 10:00:00", regla_activa: true,
};
const PLANTILLAS = {
  ok: true, migracion: true, empresa: { id: 7, nombre: "Uniline" }, hora_envio: "9:05", variables: ["nombre", "edad", "años", "área", "empresa", "jefe"],
  disenos: ["festivo", "elegante", "sencillo"], limites: { asunto: 150, mensaje: 2000 }, ejemplo: { nombre: "Ana", nombreCompleto: "Ana Torres", empresa: "Uniline" },
  plantillas: [plantillaCumple, { ...plantillaCumple, tipo: "aniversario", personalizada: false, diseno: "elegante", asunto: "¡Feliz aniversario, {nombre}!", mensaje: "Hoy cumples {años} años con nosotros en {empresa}.", regla_activa: false, actualizado_por: null }],
  whatsapp: {
    version: "2026-11-25.2", nota: "Texto aprobado por WhatsApp; no se puede cambiar.", automatico: { configurado: true, motivo: null },
    plantillas: [
      { tipo: "cumpleanos", clave: "cumpleanos", etiqueta: "Cumpleaños", descripcion: "aprobada por WhatsApp", texto: "¡Feliz cumpleaños, Ana! 🎉 Todo el equipo de Uniline te desea un gran día. Gracias por ser parte de nuestro equipo." },
      { tipo: "aniversario", clave: "aniversario", etiqueta: "Aniversario", descripcion: "aprobada por WhatsApp", texto: "¡Feliz aniversario, Ana! Hoy cumples 3 años en Uniline. Gracias por tu compromiso y por crecer con nosotros." },
    ],
  },
};
const correoHtml = (asunto) => `<!doctype html><html><body style="margin:0;font-family:sans-serif;background:#f3f4f6"><div style="max-width:600px;margin:24px auto;background:#fff;border-radius:14px;padding:24px"><div style="background:#1D5CF5;color:#fff;border-radius:12px;padding:24px"><p style="margin:0;font-size:12px">UNILINE</p><p style="margin:4px 0 0;font-size:24px;font-weight:800">${asunto}</p><p style="margin:12px 0 0"><span style="background:#3B74F7;border-radius:99px;padding:6px 12px;font-weight:700">29 años</span></p></div><p>Todo el equipo de Uniline te desea un gran día. Gracias por tu entrega en Ventas; que este año te traiga mucho de lo que buscas.</p><p>¡Disfrútalo!</p></div></body></html>`;
const REGLAS = [
  ["Felicitar cumpleaños", "diario", null, 0, 1], ["Felicitar aniversario", "diario", null, 0, 1],
  ["Avisar cumpleaños del mes", "mensual", null, 30, 1], ["Avisar aniversarios laborales", "semanal", "lunes", 7, 1],
  ["Contratos por vencer", "semanal", "lunes", 30, 1], ["Reporte de inasistencias", "diario", null, 1, 1], ["Reporte de llegadas tarde", "semanal", "viernes", 7, 0],
].map(([nombre, periodicidad, diaSemana, dias, activa], i) => ({
  id: i + 1, idTipoRegla: i + 1, nombre, tipoNotificacion: "reporte_periodico", periodicidad, diaSemana, diaMes: periodicidad === "mensual" ? 1 : null,
  esPrimerDiaMes: periodicidad === "mensual", esUltimoDiaMes: false, diasAnticipacion: dias, tipoAviso: "antes", avisarUsuario: false, activa: Boolean(activa),
  empresa: "Uniline", idEmpresa: 7, totalEmpleados: nombre.startsWith("Felicitar") ? 0 : 2,
}));
const EMPLEADOS = [
  { id_empleado: 15, id_empresa: 7, nombre: "Ana", apellido_paterno: "Torres", apellido_materno: "Paz", correo: "ana.torres@correo.mx", puesto: "Empacadora" },
  { id_empleado: 12, id_empresa: 7, nombre: "Carlos", apellido_paterno: "Terriquez", apellido_materno: "Gil", correo: "carlos.t@correo.mx", puesto: "Operador" },
  { id_empleado: 13, id_empresa: 7, nombre: "Frida", apellido_paterno: "Serrano", apellido_materno: "Luna", correo: null, puesto: "Vendedora" },
  { id_empleado: 14, id_empresa: 7, nombre: "Héctor", apellido_paterno: "León", apellido_materno: "Ruiz", correo: "hector.leon@correo.mx", puesto: "Almacenista" },
  { id_empleado: 18, id_empresa: 7, nombre: "Laura", apellido_paterno: "Ríos", apellido_materno: "Vega", correo: "laura.rios@uniline.mx", puesto: "Jefa de RH" },
];
const CAMPOS = [
  { id: 1, id_empresa: 7, nombre: "Talla de uniforme", tipo: "seleccion", opciones: ["Chica", "Mediana", "Grande", "Extra grande"], formulario: 1, filtros: 1, pestana: "laborales", despues_de: "fin", activo: 1, orden: 1 },
  { id: 2, id_empresa: 7, nombre: "Número de locker", tipo: "numero", opciones: [], formulario: 1, filtros: 0, pestana: "laborales", despues_de: "fin", activo: 1, orden: 2 },
  { id: 3, id_empresa: 7, nombre: "Alergias", tipo: "texto", opciones: [], formulario: 1, filtros: 0, pestana: "emergencia", despues_de: "fin", activo: 1, orden: 1 },
  { id: 4, id_empresa: 7, nombre: "Turno preferido", tipo: "seleccion", opciones: ["Matutino", "Vespertino"], formulario: 1, filtros: 1, pestana: "jornada", despues_de: "fin", activo: 0, orden: 1 },
];
const ACCESOS = [
  { id_acceso: 21, nombre: "Laura Ríos", correo: "laura.rios@uniline.mx", estado: "Activo" },
  { id_acceso: 22, nombre: "Marco Salas", correo: "marco.salas@uniline.mx", estado: "Activo" },
  { id_acceso: 23, nombre: "Sofía Peña", correo: "sofia.pena@uniline.mx", estado: "Inactivo" },
];
const PERMISOS_ACCESOS = [
  { id_acceso: 21, plantilla: "recursos_humanos", resumen: "Ve 15 módulos, edita 11, todas las empresas" },
  { id_acceso: 22, plantilla: "reclutador", resumen: "Ve 2 módulos, edita 1, todas las empresas" },
  { id_acceso: 23, plantilla: "solo_lectura", resumen: "Ve 15 módulos, edita 0, todas las empresas" },
];
const SUSCRIPCION = {
  suscripcion: {
    nombre_empresa: "Uniline", contrato_id: "CT-2026-0042", estado_empresa: "Activo", estado_contrato: "Vigente", mensualidad_actual: 1450, fecha_vencimiento: "2026-12-05",
    empleados_activos: 24, empleados_archivados: 6, precio_empleado_activo: 55, precio_empleado_archivado: 15, origen: "Stripe",
  },
  resumen: { estatus_financiero: "Con adeudo", saldo_pendiente: 1450, total_pagado: 14500, facturas_pendientes: 1 },
  facturas: [
    { id: 12, periodo_inicio: "2026-11-05", periodo_fin: "2026-12-04", concepto: "Mensualidad ADAMIA · noviembre", estado: "Pendiente", fecha_vencimiento: "2026-12-05", total: 1450, hosted_invoice_url: "https://invoice.stripe.com/i/demo", invoice_pdf: "https://invoice.stripe.com/i/demo/pdf" },
    { id: 11, periodo_inicio: "2026-10-05", periodo_fin: "2026-11-04", concepto: "Mensualidad ADAMIA · octubre", estado: "Pagada Stripe", fecha_vencimiento: "2026-10-05", total: 1450, hosted_invoice_url: "https://invoice.stripe.com/i/demo2", invoice_pdf: "https://invoice.stripe.com/i/demo2/pdf" },
    { id: 10, periodo_inicio: "2026-09-05", periodo_fin: "2026-10-04", concepto: "Mensualidad ADAMIA · septiembre", estado: "Pagada Externa", fecha_vencimiento: "2026-09-05", total: 1450, hosted_invoice_url: null, invoice_pdf: null },
  ],
  pagos: [
    { id: 5, fecha_pago: "2026-10-04", metodo_pago: "Tarjeta", referencia: "Stripe", periodo_cubierto: "Octubre 2026", monto: 1450 },
    { id: 4, fecha_pago: "2026-09-03", metodo_pago: "Transferencia", referencia: "SPEI 004512", periodo_cubierto: "Septiembre 2026", monto: 1450 },
  ],
};

let puedeAutorizar = false;
async function rutas(ctx, usuario) {
  const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type,idempotency-key", "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS" };
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base) return route.continue();
    if (url.hostname !== "api.prueba.invalid") return route.abort();
    const ok = (json, status = 200) => route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(json) });
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const p = url.pathname.replace(/^\/api/, "");
    const m = req.method();
    let cuerpo = null;
    try { cuerpo = req.postData() ? JSON.parse(req.postData()) : null; } catch { cuerpo = null; }
    let r;
    if (p.endsWith("/users/verify/token")) return ok({ user: usuario });
    // Nómina
    if (p === "/checador/nomina/periodos" && m === "GET") return ok({ ok: true, periodos: PERIODOS, puede_autorizar: puedeAutorizar });
    if (p === "/checador/nomina/periodos" && m === "POST") return ok({ ok: true, id: 5 }, 201);
    if ((r = /^\/checador\/nomina\/periodos\/(\d+)$/.exec(p))) {
      const per = PERIODOS.find((x) => x.id === Number(r[1]));
      return ok({ ok: true, periodo: per, recibos: recibos(per.fecha_inicio, reciboEnvios[per.id]), puede_autorizar: puedeAutorizar,
        // (27/11/2026) «Revisar sueldos»: la ficha de alguien no coincide con su contrato vigente → no se autoriza.
        sueldos_por_revisar: conSueldosPorRevisar ? [{ id_empleado: 18, nombre: "Frida Serrano Gil", folio: "CT-0041", sueldo_ficha: 4500, periodo_ficha: "Quincenal", contrato_en_periodo_ficha: 4800 }] : [] });
    }
    if (/^\/checador\/nomina\/periodos\/\d+\/\w+$/.test(p)) return ok({ ok: true });
    if (p === "/checador/nomina/conceptos" && m === "GET") return ok({ ok: true, conceptos: CONCEPTOS, para_todos_disponible: true });
    if ((r = /^\/checador\/nomina\/conceptos\/(\d+)$/.exec(p)) && m === "GET") {
      const c = CONCEPTOS.find((x) => x.id === Number(r[1]));
      return ok({ ok: true, concepto: c, para_todos_disponible: true, personas: PERSONAS_BONO });
    }
    if (p === "/checador/nomina/prestamos" && m === "GET") return ok({ ok: true, prestamos: PRESTAMOS, puede_cancelar_vigente: puedeAutorizar });
    if (p === "/checador/nomina/prestamos" && m === "POST") {
      return ok(simulacionDemo(cuerpo));
    }
    if ((r = /^\/checador\/nomina\/prestamos\/(\d+)$/.exec(p))) {
      const pr = PRESTAMOS.find((x) => x.id === Number(r[1]));
      const plan = planDemo(pr);
      return ok({ ok: true, prestamo: pr, movimientos: MOVIMIENTOS[pr.id] ?? [], avisos: [], plazo: plan.num_pagos, plan, calendario: calendarioDemo(plan), puede_cancelar_vigente: puedeAutorizar });
    }
    if (p === "/checador/nomina/mis-recibos") {
      return ok({ ok: true, recibos: [
        { id: 11, id_empresa: 7, folio: "N3-11", neto: 2100, transferencia: 1500, efectivo: 600, fecha_inicio: "2026-11-02", fecha_fin: "2026-11-08", firma_estatus: "pendiente" },
        { id: 7, id_empresa: 7, folio: "N2-7", neto: 2050, transferencia: 1500, efectivo: 550, fecha_inicio: "2026-10-26", fecha_fin: "2026-11-01", firma_estatus: "firmado" },
      ] });
    }
    if (p === "/checador/nomina/mis-prestamos" && m === "GET") {
      const conPlan = (x) => { const plan = planDemo({ ...x, id_empleado: 14 }); return { ...x, plan, calendario: calendarioDemo(plan) }; };
      const lista = escenaPrestamosEmpleada === "pedir"
        ? [{ ...conPlan(PRESTAMOS[3]), id_empleado: 15, movimientos: [{ tipo: "abono_nomina", importe: 300, saldo_despues: 1200, creado_en: "2026-08-10T18:00:00Z" }, { tipo: "abono_nomina", importe: 1200, saldo_despues: 0, creado_en: "2026-09-10T18:00:00Z" }] }]
        : [{ ...conPlan({ ...PRESTAMOS[0], num_pagos: 6 }), estado: "por_firmar", firma_estatus: "pendiente", movimientos: [] }];
      return ok({ ok: true, periodo_pago: "Quincenal", prestamos: lista });
    }
    if (p === "/checador/nomina/mis-prestamos" && m === "POST") {
      return ok(simulacionDemo({ ...cuerpo, id_empleado: 14 }, true));
    }
    if (p === "/checador/firma-digital/solicitudes/documento") {
      const tipo = url.searchParams.get("tipo_documento");
      if (tipo === "FINIQUITO" || tipo === "LIQUIDACION") return ok({ success: true, solicitud: { id: 31, estatus: "pendiente", nombre_firmante: "Héctor León Ruiz", expires_at: "2026-12-27T18:00:00Z" } });
      return ok({ success: true, solicitud: { estatus: "pendiente", url_firma: "/firmar/demo" } });
    }
    // Empleados y catálogos
    if (p === "/checador/empleados") return ok({ data: EMPLEADOS, total: EMPLEADOS.length });
    if (p.startsWith("/checador/sucursales")) return ok(SUCURSALES);
    if (/^\/empresas\/\d+$/.test(p)) return ok({ id_empresa: 7, nombre_empresa: "Uniline", url_imagen: null });
    // Aguinaldos
    if (p === "/checador/aguinaldos" && m === "GET") return ok({ data: CALCULOS_AGUINALDO, total: CALCULOS_AGUINALDO.length });
    if (p === "/checador/aguinaldos/empleados-activos") return ok({ data: EMPLEADOS_AGUINALDO });
    if ((r = /^\/checador\/aguinaldos\/empleado\/(\d+)\/dias-no-trabajados$/.exec(p))) return ok({ dias_no_trabajados: NO_TRAB[r[1]] ?? 0 });
    if (p === "/checador/aguinaldos/calcular") {
      const res = cuerpo.empleados_ids.map((x) => aguinaldo({ ...EMPLEADOS_AGUINALDO.find((e) => e.id === x.id_empleado), salario_diario: Number(x.salario_diario) }, cuerpo.fecha_corte, cuerpo.año_fiscal, Number(x.dias_no_trabajados) || 0));
      return ok({ resultados: res, total_empleados: res.length, total_general: res.reduce((t, x) => t + Number(x.monto_aguinaldo), 0).toFixed(2), año_fiscal: cuerpo.año_fiscal, fecha_corte: cuerpo.fecha_corte, observaciones: cuerpo.observaciones });
    }
    // Finiquitos
    if (p === "/checador/finiquitos" && m === "GET") return ok({ data: FINIQUITOS, total: FINIQUITOS.length });
    if (p === "/checador/finiquitos/empleados-activos") return ok({ data: [{ id: 14, id_empleado: 14, id_empresa: 7, nombre_completo: "Héctor León Ruiz", fecha_ingreso: INGRESO_HECTOR, puesto: "Almacenista", departamento: "Almacén", periodicidad_pago: "Quincenal", salario_diario: 320, salario_origen: "contrato", salario_texto: "Contrato activo: $4,800.00 quincenal ÷ 15 = $320.00 diarios", aguinaldo_dias: 15, prima_vacacional_porcentaje: 25 }] });
    if (/\/checador\/finiquitos\/empleado\/\d+\/dias-no-trabajados$/.test(p)) return ok({ dias_no_trabajados: 0 });
    if (/\/checador\/finiquitos\/empleado\/\d+\/vacaciones-datos$/.test(p)) return ok({ diasPendientes: 4, diasGozadosAdelantados: 0, diasLeyAñoActual: LFT.diasVacacionesALaFecha(INGRESO_HECTOR, url.searchParams.get("fechaBaja") || "2026-11-27"), primaVacacional: 25, diasAguinaldo: 15 });
    if (p === "/checador/finiquitos/calcular") return ok(finiquito(cuerpo));
    if (p === "/checador/calculos-lft/publico/aguinaldo") {
      const sd = LFT.salarioDiarioDe({ salario: cuerpo.salario, periodicidad: { diario: "Diario", semanal: "Semanal", quincenal: "Quincenal", mensual: "Mensual" }[cuerpo.tipo_salario] });
      const r = LFT.calcularAguinaldo({ salario_diario: sd, fecha_ingreso: cuerpo.fecha_ingreso, fecha_corte: cuerpo.fecha_corte, dias_aguinaldo: cuerpo.dias_aguinaldo, faltas: cuerpo.dias_no_laborados });
      return ok({ ...r, salario_diario_texto: `${LFT.pesos(sd)} diarios` });
    }
    if (p === "/checador/calculos-lft/publico/vacaciones-ley") return ok({ dias: 12, anio_servicio: 1, tabla: LFT.tablaVacacionesLey(35) });
    if (/^\/checador\/finiquitos\/8$/.test(p)) return ok(FINIQUITO_GUARDADO);
    // Ajustes
    if (p === "/checador/users/access") return ok({ data: ACCESOS, total: ACCESOS.length });
    if (p === "/checador/permisos-acceso/catalogo") return ok({ ok: true, empresas: [{ id_empresa: 7, nombre: "Uniline" }, { id_empresa: 9, nombre: "Uniline Norte" }] });
    if (p === "/checador/permisos-acceso") return ok({ ok: true, data: PERMISOS_ACCESOS });
    if (p === "/checador/modulos" && m === "GET") return ok({ ok: true, empresa: 7, plan: { id: 1, configurado: true }, modulos: modulosEmpresa(), puede_cambiar: true });
    if (p === "/auth/passkeys") return ok({ passkeys: [{ id: 1, nombre: "MacBook de Laura", creado_en: "2026-11-10T16:00:00Z", ultimo_uso_en: "2026-11-27T15:00:00Z" }, { id: 2, nombre: "iPhone de Laura", creado_en: "2026-11-12T16:00:00Z", ultimo_uso_en: "2026-11-26T22:00:00Z" }] });
    if (p === "/auth/sesiones") return ok({ sesiones: [{ id: 1, dispositivo: "Chrome en Mac", actual: true, via: "passkey", ultimo_uso_en: "2026-11-27T16:00:00Z" }, { id: 2, dispositivo: "Safari en iPhone", actual: false, via: "passkey", ultimo_uso_en: "2026-11-26T22:00:00Z" }, { id: 3, dispositivo: "Edge en Windows", actual: false, via: "contrasena", ultimo_uso_en: "2026-11-18T14:00:00Z" }] });
    if (p === "/stripe/mi-suscripcion") return ok(SUSCRIPCION);
    if (p === "/checador/ia/creditos") return ok(CREDITOS);
    if (p === "/checador/integraciones/catalogo") return ok({ ok: true, configurada: true, limite_por_minuto: 60, max_activas: 25, retencion_bitacora_dias: 90 });
    if (p === "/checador/integraciones/llaves" && m === "GET") return ok({ ok: true, data: LLAVES });
    if (p === "/checador/integraciones/llaves" && m === "POST") return ok({ ok: true, llave: LLAVE_NUEVA, data: { ...LLAVES[0], id: 4, nombre: cuerpo.nombre } }, 201);
    if (p === "/checador/integraciones/bitacora") return ok({ ok: true, data: BITACORA });
    if (p === "/checador/avisos/plantillas") return ok(PLANTILLAS);
    if (p === "/checador/avisos/plantillas/vista-previa") return ok({ ok: true, subject: "¡Feliz cumpleaños, Ana!", html: correoHtml("¡Feliz cumpleaños, Ana!") });
    if (p === "/checador/reglas-aviso" && m === "GET") return ok(REGLAS);
    if ((r = /^\/checador\/reglas-aviso\/(\d+)$/.exec(p)) && m === "GET") return ok({ ...REGLAS[Number(r[1]) - 1], empleadosSeleccionados: [18, 14] });
    if (p === "/checador/campos-personalizados") return ok(CAMPOS);
    return ok([]);
  });
}

// ——— Guardar en .webp (Chromium convierte la captura PNG) ———
let convertidor = null;
const guardadas = [];
async function guardar(page, modulo, nombre, opciones = {}) {
  await dormir(opciones.espera ?? 500);
  const png = await page.screenshot({ type: "png", ...(opciones.clip ? { clip: opciones.clip } : {}), ...(opciones.fullPage ? { fullPage: true } : {}) });
  const webp = await convertidor.evaluate(async (b) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${b}`)).blob());
    const lienzo = new OffscreenCanvas(bmp.width, bmp.height);
    lienzo.getContext("2d").drawImage(bmp, 0, 0);
    const blob = await lienzo.convertToBlob({ type: "image/webp", quality: 0.8 });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { tipo: blob.type, datos: btoa(s) };
  }, png.toString("base64"));
  if (webp.tipo !== "image/webp") throw new Error(`Chromium no convirtió a webp (${webp.tipo})`);
  const carpeta = path.join(SALIDA, modulo);
  mkdirSync(carpeta, { recursive: true });
  const archivo = path.join(carpeta, `${nombre}.webp`);
  const buf = Buffer.from(webp.datos, "base64");
  writeFileSync(archivo, buf);
  guardadas.push(`${modulo}/${nombre}.webp (${Math.round(buf.length / 1024)} KB)`);
}

// Sube el elemento al inicio de su área con scroll (el panel desplaza un contenedor, no la ventana).
async function alInicio(locator) {
  await locator.first().evaluate((el) => el.scrollIntoView({ block: "start" }));
  await dormir(350);
}

// Recorta al área de un elemento (con margen), dentro de la ventana.
async function areaDe(page, locator, margen = 12) {
  const b = await locator.boundingBox();
  const v = page.viewportSize();
  const x = Math.max(0, b.x - margen);
  const y = Math.max(0, b.y - margen);
  return { x, y, width: Math.min(v.width - x, b.width + margen * 2), height: Math.min(v.height - y, b.height + margen * 2) };
}

async function contexto(browser, usuario, { movil = false } = {}) {
  const ctx = await browser.newContext({ viewport: movil ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: "es-MX", timezoneId: ZONA, isMobile: movil, hasTouch: movil });
  await ctx.addCookies([{ name: "token", value: jwt(usuario.tipo_usuario), url: base }]);
  await rutas(ctx, usuario);
  return ctx;
}
async function abrir(ctx, ruta, esperar) {
  const page = await ctx.newPage();
  await page.goto(base + ruta, { waitUntil: "domcontentloaded" });
  if (esperar) await (typeof esperar === "string" ? page.getByText(esperar).first() : esperar(page)).waitFor({ timeout: 30000 });
  return page;
}

// ——— Escenas ———
let conSueldosPorRevisar = false;
const ESCENAS = {
  async nominaSueldosPorRevisar(b) {
    puedeAutorizar = true;
    conSueldosPorRevisar = true;
    const ctx = await contexto(b, { ...RH, nombre: "Roberto Méndez", correo: "roberto@uniline.mx" });
    const page = await abrir(ctx, "/panel/nomina/4", (pg) => pg.locator("[data-aviso='sueldos-por-revisar']"));
    await guardar(page, "nomina", "nomina-sueldos-por-revisar", { clip: await areaDe(page, page.locator("[data-aviso='sueldos-por-revisar']"), 24) });
    conSueldosPorRevisar = false;
    await ctx.close();
  },
  async nominaLista(b) {
    puedeAutorizar = false;
    const ctx = await contexto(b, RH);
    const page = await abrir(ctx, "/panel/nomina", "Por autorizar");
    await guardar(page, "nomina", "nominas-lista");
    await page.getByRole("button", { name: "Nueva nómina" }).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.getByText("Crear y calcular").waitFor();
    await guardar(page, "nomina", "nueva-nomina", { clip: await areaDe(page, dlg, 24) });
    await ctx.close();
  },
  async nominaDetalle(b) {
    puedeAutorizar = false;
    const ctx = await contexto(b, RH);
    const page = await abrir(ctx, "/panel/nomina/5", (pg) => pg.getByRole("heading", { name: /Nómina del/ }));
    await page.getByText("Ana Torres").first().waitFor();
    await guardar(page, "nomina", "nomina-borrador");
    await page.getByRole("button", { name: "Ver asistencia de Ana Torres" }).click();
    const reg = page.getByRole("region", { name: "Asistencia de Ana Torres" });
    await reg.waitFor();
    await alInicio(reg);
    await guardar(page, "nomina", "asistencia-del-recibo", { clip: await areaDe(page, reg, 16) });
    await page.getByRole("button", { name: "Revisar recibo y ajustar importes" }).click();
    const hoja = page.getByRole("dialog");
    await hoja.getByText("Percepciones").first().waitFor();
    await guardar(page, "nomina", "recibo-panel");
    await hoja.getByLabel("Importe de Bono de puntualidad").fill("250");
    await hoja.getByPlaceholder("Motivo del cambio (opcional)").fill("El retardo fue por el corte de luz");
    await hoja.getByRole("button", { name: /Guardar cambios/ }).scrollIntoViewIfNeeded();
    await guardar(page, "nomina", "recibo-editar-importe");
    await alInicio(hoja.getByText("Agregar bono o descuento"));
    await guardar(page, "nomina", "recibo-agregar-bono");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Enviar a autorizar" }).click();
    const conf = page.getByRole("dialog");
    await conf.getByText("El dueño de la cuenta la revisará").waitFor();
    await guardar(page, "nomina", "enviar-a-autorizar", { clip: await areaDe(page, conf, 24) });
    await ctx.close();
  },
  async nominaDueno(b) {
    puedeAutorizar = true;
    const ctx = await contexto(b, { ...RH, nombre: "Roberto Méndez", correo: "roberto@uniline.mx" });
    const page = await abrir(ctx, "/panel/nomina/4", (pg) => pg.getByRole("button", { name: "Autorizar y enviar recibos" }));
    await guardar(page, "nomina", "nomina-por-autorizar");
    await page.getByRole("button", { name: "Autorizar y enviar recibos" }).click();
    const conf = page.getByRole("dialog");
    await conf.getByText("Se cierra el periodo").waitFor();
    await guardar(page, "nomina", "autorizar-confirmar", { clip: await areaDe(page, conf, 24) });
    await page.keyboard.press("Escape");
    await page.goto(base + "/panel/nomina/3", { waitUntil: "domcontentloaded" });
    await page.getByText("Reintentar envíos").waitFor({ timeout: 30000 });
    await guardar(page, "nomina", "nomina-autorizada");
    await page.getByRole("button", { name: "Cancelar nómina" }).click();
    const canc = page.getByRole("dialog");
    await canc.getByText("Los recibos quedan cancelados").waitFor();
    await canc.getByLabel("Motivo").fill("Se pagó un bono equivocado");
    await guardar(page, "nomina", "cancelar-nomina", { clip: await areaDe(page, canc, 24) });
    await ctx.close();
    puedeAutorizar = false;
  },
  async bonos(b) {
    const ctx = await contexto(b, RH);
    const page = await abrir(ctx, "/panel/nomina/bonos", "Bono de puntualidad");
    await guardar(page, "nomina", "bonos-lista");
    await page.getByRole("button", { name: "Nuevo bono o descuento" }).click();
    const dlg = page.getByRole("dialog");
    await dlg.getByLabel("Nombre").fill("Bono de productividad");
    await dlg.getByLabel("Valor ($)").fill("500");
    await dlg.getByLabel("Cómo se aplica").selectOption("condicionado");
    await dlg.getByLabel("Se paga si…").selectOption("ambas");
    await guardar(page, "nomina", "bono-nuevo", { clip: await areaDe(page, dlg, 24) });
    await page.keyboard.press("Escape");
    await page.goto(base + "/panel/nomina/bonos/2", { waitUntil: "domcontentloaded" });
    await page.getByText("Valor sugerido").waitFor({ timeout: 30000 });
    await page.getByLabel("Frida Serrano lo tiene").check();
    await page.getByLabel("Valor propio de Carlos Terriquez").fill("350");
    await guardar(page, "nomina", "bono-asignar");
    await ctx.close();
  },
  async prestamos(b) {
    const ctx = await contexto(b, RH);
    const page = await abrir(ctx, "/panel/nomina/prestamos", "Por cobrar");
    await guardar(page, "nomina", "prestamos-lista");
    await page.goto(base + "/panel/nomina/prestamos/3", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Aprobar" }).waitFor({ timeout: 30000 });
    await page.getByRole("button", { name: "Aprobar" }).click();
    await page.getByRole("button", { name: "Aprobar y enviar acuerdo" }).waitFor();
    await guardar(page, "nomina", "prestamo-aprobar");
    await page.goto(base + "/panel/nomina/prestamos/2", { waitUntil: "domcontentloaded" });
    await page.getByText("Historial").waitFor({ timeout: 30000 });
    await guardar(page, "nomina", "prestamo-vigente");
    // (27/11/2026) Registrar es una página: Héctor (quincenal), $5,000 en 6 quincenas con su calendario.
    await page.goto(base + "/panel/nomina/prestamos/nuevo?empresa=7", { waitUntil: "domcontentloaded" });
    const form = page.locator("[data-formulario-prestamo]");
    await form.getByRole("combobox").first().fill("Héctor", { timeout: 30000 });
    await page.getByRole("option", { name: /Héctor León/ }).dispatchEvent("mousedown");
    await form.getByLabel("Monto prestado").fill("5000");
    await form.getByLabel("¿En cuántos pagos?").fill("6");
    await form.getByText("6 quincenas de $833.33 · la última de $833.35").waitFor({ timeout: 8000 });
    await guardar(page, "nomina", "prestamo-registrar", { clip: await areaDe(page, form, 24) });
    await ctx.close();
  },
  async miEspacioNomina(b) {
    const ctx = await contexto(b, EMPLEADA, { movil: true });
    const page = await abrir(ctx, "/empleado/panel/mis-recibos", "Mis recibos de pago");
    await page.getByText("Por firmar").first().waitFor({ timeout: 30000 });
    await guardar(page, "nomina", "mis-recibos-celular");
    escenaPrestamosEmpleada = "pedir";
    await page.goto(base + "/empleado/panel/mis-prestamos", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Pedir un préstamo" }).click({ timeout: 30000 });
    await page.getByLabel("¿Cuánto necesitas?").fill("3000");
    await page.getByLabel("¿En cuántas quincenas lo quieres pagar?").fill("6");
    await page.getByText("6 quincenas de $500.00").waitFor({ timeout: 8000 });
    await page.getByLabel("¿Para qué lo necesitas?").fill("Consulta médica");
    await guardar(page, "nomina", "pedir-prestamo-celular");
    escenaPrestamosEmpleada = "firmar";
    await page.goto(base + "/empleado/panel/mis-prestamos", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Firmar acuerdo" }).waitFor({ timeout: 30000 });
    await guardar(page, "nomina", "firmar-acuerdo-celular");
    await ctx.close();
  },
  async aguinaldos(b) {
    const ctx = await contexto(b, RH);
    const page = await abrir(ctx, "/panel/aguinaldos", "Fecha corte");
    await guardar(page, "nomina", "aguinaldos-guardados");
    await page.getByRole("button", { name: "Nuevo Cálculo" }).click();
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Matriz Colima" }).click();
    await page.getByText("Selección de empleados").waitFor({ timeout: 30000 });
    await page.getByLabel("Fecha de corte *").fill("2026-12-31").catch(async () => { await page.locator("input[type=date]").first().fill("2026-12-31"); });
    await page.getByText("Seleccionar / Deseleccionar Todos").click();
    await dormir(1500);
    await alInicio(page.getByText("Configuración del Cálculo"));
    await guardar(page, "nomina", "aguinaldo-configurar");
    await alInicio(page.getByText("Selección de empleados"));
    await guardar(page, "nomina", "aguinaldo-empleados");
    await page.getByRole("button", { name: "Calcular" }).last().click();
    await page.getByText("Resultados del cálculo").waitFor({ timeout: 30000 });
    await alInicio(page.getByText("Resultados del cálculo"));
    await guardar(page, "nomina", "aguinaldo-resultados");
    await ctx.close();
  },
  async finiquitos(b) {
    const ctx = await contexto(b, RH);
    const page = await abrir(ctx, "/panel/finiquitos-y-liquidaciones", "Héctor León Ruiz");
    await guardar(page, "nomina", "finiquitos-lista");
    await page.getByRole("button", { name: "Nuevo Finiquito" }).click();
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Matriz Colima" }).click();
    await page.locator("#finiquito-empleado").fill("Héctor");
    await page.getByRole("button", { name: "Héctor León Ruiz" }).click({ timeout: 15000 });
    await page.getByLabel("Salario diario").waitFor({ timeout: 15000 });
    await page.getByLabel("Días de salario pendientes").fill("5");
    await page.getByText("Ajustes de vacaciones y aguinaldo").click();
    await guardar(page, "nomina", "finiquito-preparar");
    await page.getByRole("button", { name: "Calcular finiquito" }).click();
    await page.getByRole("button", { name: "Guardar y continuar" }).waitFor({ timeout: 15000 });
    await guardar(page, "nomina", "finiquito-calculado");
    await page.getByLabel("Tipo de terminación").selectOption("Despido Injustificado");
    await page.getByRole("button", { name: "Calcular finiquito" }).click();
    await page.getByText("Subtotal indemnización").waitFor({ timeout: 15000 });
    const resumen = page.getByRole("complementary", { name: "Resumen del finiquito" });
    await alInicio(resumen);
    await guardar(page, "nomina", "liquidacion-calculada", { clip: await areaDe(page, resumen, 16) });
    await page.goto(base + "/panel/finiquitos-y-liquidaciones", { waitUntil: "domcontentloaded" });
    await page.getByText("Héctor León Ruiz").first().waitFor({ timeout: 30000 });
    await page.getByRole("button", { name: "Ver", exact: true }).first().click();
    await page.getByText("Firma del documento").waitFor({ timeout: 30000 });
    await page.getByText("Pendiente de firma").waitFor({ timeout: 15000 }).catch(() => {});
    await guardar(page, "nomina", "finiquito-firma-y-pago");
    await ctx.close();
  },
  async calculadoraPublica(b) {
    const ctx = await contexto(b, RH);
    const page = await abrir(ctx, "/calculadora-aguinaldos", "Calcula aguinaldo proporcional");
    await page.getByLabel("Salario diario (MXN)").fill("320");
    await page.getByLabel("Fecha de ingreso").fill("2026-02-01");
    await page.getByLabel("Fecha de corte").fill("2026-12-15");
    await page.getByLabel("Días no laborados en el periodo").fill("2");
    await page.getByText("Monto estimado de aguinaldo").waitFor();
    await guardar(page, "nomina", "calculadora-publica");
    await ctx.close();
  },
  async usuarios(b) {
    const ctx = await contexto(b, RH);
    const page = await abrir(ctx, "/panel/usuarios-con-acceso", "Marco Salas");
    await page.getByText("Recursos Humanos").first().waitFor({ timeout: 15000 });
    await guardar(page, "usuarios", "usuarios-lista");
    await page.getByRole("button", { name: "Nuevo acceso" }).click();
    const dlg = page.getByRole("dialog");
    await dlg.getByPlaceholder("Nombre").fill("Paola Méndez");
    await dlg.getByPlaceholder("Correo").fill("paola.mendez@uniline.mx");
    await dlg.locator("[data-plantilla='recursos_humanos']").first().click();
    await guardar(page, "usuarios", "nuevo-acceso");
    await alInicio(dlg.getByText("Permisos por módulo"));
    await dlg.getByRole("radio", { name: "Nómina: Ver", exact: true }).click();
    await guardar(page, "usuarios", "permisos-por-modulo");
    await alInicio(dlg.getByText("Solo algunas"));
    await dlg.getByText("Solo algunas").click();
    await dlg.getByText("Uniline Norte").click();
    await guardar(page, "usuarios", "empresas-del-acceso");
    await ctx.close();
  },
  async modulos(b) {
    const ctx = await contexto(b, RH);
    const page = await abrir(ctx, "/panel/modulos", "Tus módulos");
    await guardar(page, "modulos", "modulos-lista");
    await page.getByRole("switch", { name: /Vacaciones: activo/ }).click();
    const dlg = page.getByRole("alertdialog");
    await dlg.getByText("Se ocultará para todos").waitFor();
    await guardar(page, "modulos", "apagar-modulo", { clip: await areaDe(page, dlg, 24) });
    await page.keyboard.press("Escape");
    await alInicio(page.getByText("Disponibles para contratar"));
    await guardar(page, "modulos", "modulos-contratar");
    await ctx.close();
  },
  async seguridad(b) {
    const ctx = await contexto(b, RH);
    const page = await abrir(ctx, "/panel/seguridad", "MacBook de Laura");
    await guardar(page, "seguridad", "seguridad-panel");
    await ctx.close();
    const cm = await contexto(b, EMPLEADA, { movil: true });
    const pm = await abrir(cm, "/empleado/panel/seguridad", "Seguridad y Face ID");
    await pm.getByText("Sesiones abiertas").waitFor({ timeout: 30000 });
    await guardar(pm, "seguridad", "seguridad-celular");
    await cm.close();
  },
  async suscripcion(b) {
    const ctx = await contexto(b, RH);
    const page = await abrir(ctx, "/panel/mi-suscripcion", "Resumen de suscripción");
    await guardar(page, "suscripcion", "mi-suscripcion");
    await alInicio(page.getByText("Facturas").last());
    await guardar(page, "suscripcion", "facturas-y-pagos");
    await ctx.close();
  },
  async creditos(b) {
    const ctx = await contexto(b, RH);
    const page = await abrir(ctx, "/panel/creditos-ia", "Saldo disponible");
    await guardar(page, "creditos-ia", "creditos-saldo");
    await alInicio(page.getByText("Movimientos"));
    await guardar(page, "creditos-ia", "creditos-consumo-movimientos");
    await ctx.close();
  },
  async integraciones(b) {
    const ctx = await contexto(b, RH);
    const page = await abrir(ctx, "/panel/integraciones", "Nómina externa");
    // La dirección base de la demo apunta a un servidor de pruebas: se muestra la pública documentada.
    await page.evaluate(() => { for (const c of document.querySelectorAll("section[aria-labelledby='int-como'] code")) c.textContent = "https://adamia.com.mx/api/integracion/v1"; });
    await guardar(page, "integraciones", "integraciones-llaves");
    await page.getByRole("button", { name: "Crear llave" }).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.getByPlaceholder("Ej. Nómina externa").fill("Sistema de nómina");
    await guardar(page, "integraciones", "nueva-llave", { clip: await areaDe(page, dlg, 24) });
    await dlg.getByRole("button", { name: "Crear llave" }).click();
    const creada = page.getByRole("dialog");
    await creada.getByText("Copia tu llave ahora").waitFor();
    await guardar(page, "integraciones", "llave-creada", { clip: await areaDe(page, creada, 24) });
    await page.getByRole("button", { name: "Ya la guardé" }).click();
    await alInicio(page.getByText("Uso reciente").first());
    await guardar(page, "integraciones", "uso-reciente");
    await ctx.close();
  },
  async reglasAviso(b) {
    const ctx = await contexto(b, RH);
    const page = await abrir(ctx, "/panel/reglas-aviso", "Contratos por vencer");
    await guardar(page, "avisos", "reglas-lista");
    await page.getByRole("row", { name: /Contratos por vencer/ }).getByTitle("Editar").click();
    const dlg = page.getByRole("dialog");
    await dlg.getByText("¿A quién enviar el reporte?").waitFor({ timeout: 15000 });
    await guardar(page, "avisos", "regla-configurar");
    await ctx.close();
  },
  async plantillas(b) {
    const ctx = await contexto(b, RH);
    const page = await abrir(ctx, "/panel/plantillas-felicitacion", "Correo de cumpleaños");
    await dormir(1200);
    await guardar(page, "avisos", "plantillas-correo");
    const tabWa = page.getByRole("tab", { name: /WhatsApp/ });
    if (await tabWa.count()) {
      await tabWa.first().click();
      await page.getByText("Texto aprobado por WhatsApp").first().waitFor({ timeout: 10000 });
      await guardar(page, "avisos", "plantillas-whatsapp");
    }
    await ctx.close();
  },
  async campos(b) {
    const ctx = await contexto(b, RH);
    const page = await abrir(ctx, "/panel/campos-personalizados", "Talla de uniforme");
    await guardar(page, "campos-personalizados", "campos-lista");
    await page.getByRole("button", { name: "Nuevo campo" }).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.getByLabel(/Nombre del campo/).fill("Licencia de manejo");
    await guardar(page, "campos-personalizados", "campo-nuevo");
    await ctx.close();
  },
};

let fallas = 0;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(base + "/")).status) break; } catch { /* aún no arranca */ }
    if (i > 300) throw new Error("Next no arrancó");
    await dormir(150);
  }
  const ctxConv = await browser.newContext();
  convertidor = await ctxConv.newPage();
  await convertidor.goto(base + "/robots.txt");
  for (const [nombre, escena] of Object.entries(ESCENAS)) {
    if (SOLO.length && !SOLO.includes(nombre)) continue;
    try {
      await escena(browser);
      console.log(`OK ${nombre}`);
    } catch (e) {
      fallas += 1;
      console.error(`FALLÓ ${nombre}: ${e.message.split("\n")[0]}`);
    }
  }
  console.log(guardadas.join("\n"));
  console.log(`${guardadas.length} capturas guardadas en ${SALIDA}`);
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
  if (fallas) process.exitCode = 1;
}
