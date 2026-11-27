// COPIA del motor del backend (hr360-checkin-backend: services/calculosLft.js, sin cambios debajo de este encabezado)
// SOLO para el backend SIMULADO de las pruebas y capturas (scripts/verify-calculos-lft.mjs, scripts/capturas-ayuda/nomina.mjs).
// La app NO la usa: el panel, el PDF y la calculadora pública muestran lo que responde el servidor.
// scripts/test-calculos-lft.mjs la prueba con los mismos casos resueltos a mano del backend y revisa la huella SHA-256 del
// archivo del backend copiado; si el backend cambia, se vuelve a copiar y se actualiza la huella.
// huella-backend: e63965c091a08daeddbd06481de89cdc1717a91c47e234f0f49a022f97cbe2fb

// Motor único de cálculos de la Ley Federal del Trabajo (27/11/2026). Ver docs/calculos-lft.md.
// Lo usan: finiquitos y liquidaciones (panel y PDF), aguinaldos (panel, PDF y calculadora pública), vacaciones
// (días por ley), contratos (días de vacaciones propuestos) y nómina (salario mínimo del tope de préstamos).
// Funciones PURAS: sin base de datos, sin red, sin reloj (salvo `hoy()` cuando nadie da la fecha).
//
// Reglas de redondeo (una sola vez por concepto):
//   - Salario diario (SD) y salario diario integrado (SDI) a centavos; factor de integración a 4 decimales.
//   - Años de servicio y días proporcionales de vacaciones a 4 decimales (los que se ven en la fórmula).
//   - Cada concepto se redondea a centavos al final; los totales son la suma de los conceptos ya redondeados.
// Todos los importes son BRUTOS: el ISR y las retenciones se calculan aparte.

const VERSION_CALCULO = "lft-2026.1";
const NOTA_BRUTO = "Importes brutos; el ISR y las retenciones se calculan aparte.";

class ErrorCalculo extends Error {}

// ─── Salarios mínimos por año y zona (art. 90–94 LFT; resolución anual de la CONASAMI en el DOF) ──────────────
// zona "general" = resto del país; "zlfn" = Zona Libre de la Frontera Norte. Única tabla del sistema (Nómina incluida).
// Cotejo (27/11/2026, búsqueda web): 2024 y 2025 coinciden con la resolución publicada en el DOF el 19/12/2024
// (248.93 → 278.80 y 374.89 → 419.88). 2026 (315.04 / 440.87, DOF 09/12/2025) coincide en EY México e IDC Online, pero
// no se pudo abrir el texto del DOF: queda «por confirmar». 2023 no se cotejó: «por confirmar». Al publicarse 2027 se
// agrega aquí; mientras tanto se usa el último año cargado y se avisa en pantalla.
const SALARIOS_MINIMOS = Object.freeze([
  Object.freeze({ anio: 2023, general: 207.44, zlfn: 312.41, fuente: "DOF dic/2022 (sin cotejar)", porConfirmar: true }),
  Object.freeze({ anio: 2024, general: 248.93, zlfn: 374.89, fuente: "DOF dic/2023 (cotejado)", porConfirmar: false }),
  Object.freeze({ anio: 2025, general: 278.8, zlfn: 419.88, fuente: "DOF 19/12/2024 (cotejado)", porConfirmar: false }),
  Object.freeze({ anio: 2026, general: 315.04, zlfn: 440.87, fuente: "DOF 09/12/2025 (por confirmar contra el texto del DOF)", porConfirmar: true }),
]);
const ZONAS = Object.freeze({ general: "Salario mínimo general", zlfn: "Zona Libre de la Frontera Norte" });

// ─── Tipos de terminación (arts. 47, 48, 50, 51, 52, 53, 162) ─────────────────────────────────────────────────
// prima: "si" = siempre; "15" = solo con 15 años o más de servicio (art. 162 fr. III). tres = 90 días de SDI.
// veinte: "opcion" = casilla «Incluir 20 días por año (art. 50)», activada por omisión; "no" = no aplica.
// guardado = valor que se escribe en finiquitos.tipo_terminacion (los que ya usaba el panel; no hay valores nuevos).
const TIPOS = Object.freeze({
  renuncia: { etiqueta: "Renuncia voluntaria", guardado: "Renuncia Voluntaria", prima: "15", tres: false, veinte: "no", articulo: "art. 53 fr. I" },
  despido_justificado: { etiqueta: "Despido justificado (art. 47)", guardado: "Despido Justificado", prima: "si", tres: false, veinte: "no", articulo: "art. 47" },
  despido_injustificado: { etiqueta: "Despido injustificado", guardado: "Despido Injustificado", prima: "si", tres: true, veinte: "opcion", articulo: "arts. 48 y 50" },
  rescision_patron: { etiqueta: "Rescisión por causa del patrón (art. 51)", guardado: "Rescisión Artículo 51", prima: "si", tres: true, veinte: "opcion", articulo: "arts. 51 y 52" },
  fin_contrato: { etiqueta: "Terminación de contrato por tiempo u obra determinado", guardado: "Fin de Contrato", prima: "15", tres: false, veinte: "no", articulo: "art. 53 fr. III" },
  muerte_incapacidad: { etiqueta: "Muerte o incapacidad del trabajador", guardado: "Defunción", prima: "si", tres: false, veinte: "no", articulo: "arts. 53 fr. II y IV, 162" },
  mutuo_acuerdo: { etiqueta: "Mutuo acuerdo", guardado: "Mutuo Acuerdo", prima: "15", tres: false, veinte: "no", articulo: "art. 53 fr. I" },
});

const sinAcentos = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function tipoTerminacion(valor) {
  const t = sinAcentos(valor).replace(/[\s-]+/g, "_");
  if (TIPOS[t]) return t;
  const s = sinAcentos(valor);
  if (/injustificad/.test(s)) return "despido_injustificado";
  if (/justificad/.test(s)) return "despido_justificado";
  if (/renuncia/.test(s)) return "renuncia";
  if (/rescisi|art(iculo|\.)?\s*51/.test(s)) return "rescision_patron";
  if (/fin de contrato|terminacion de contrato|tiempo determinado|obra determinad/.test(s)) return "fin_contrato";
  if (/defunci|muerte|incapacidad|fallec/.test(s)) return "muerte_incapacidad";
  if (/mutuo/.test(s)) return "mutuo_acuerdo";
  return null;
}

// ─── Números ──────────────────────────────────────────────────────────────────────────────────────────────────
const redondear = (x, d) => {
  const f = 10 ** d;
  return Math.round(Number((Number(x) * f).toPrecision(15))) / f;
};
const r2 = (x) => redondear(x, 2);
const r4 = (x) => redondear(x, 4);
const num = (v, porOmision = 0) => {
  if (v === null || v === undefined || v === "") return porOmision;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};
const pesos = (x) => `$${Number(x).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const cifra = (x, d = 4) => {
  const v = redondear(x, d);
  return Number.isInteger(v) ? String(v) : v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: d, useGrouping: false });
};
const pct = (x) => `${cifra(x, 2)} %`;

// ─── Fechas (días enteros, sin zona horaria) ─────────────────────────────────────────────────────────────────
const DIA = 86400000;
function aDia(valor, nombre) {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    // mysql2 entrega DATE como medianoche local: se toman año/mes/día locales.
    return Date.UTC(valor.getFullYear(), valor.getMonth(), valor.getDate()) / DIA;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(valor ?? ""));
  if (!m) throw new ErrorCalculo(`Falta una fecha válida: ${nombre}.`);
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const n = Date.UTC(y, mo - 1, d) / DIA;
  const back = new Date(n * DIA);
  if (back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) throw new ErrorCalculo(`Fecha inválida: ${nombre}.`);
  return n;
}
const partes = (n) => {
  const d = new Date(n * DIA);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
};
const iso = (n) => new Date(n * DIA).toISOString().slice(0, 10);
const dma = (n) => {
  const p = partes(n);
  return `${String(p.d).padStart(2, "0")}/${String(p.m).padStart(2, "0")}/${p.y}`;
};
const esBisiesto = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const diasDelAnio = (y) => (esBisiesto(y) ? 366 : 365);
// Aniversario: mismo día y mes n años después; quien entró un 29 de febrero cumple el 1 de marzo en año no bisiesto.
function sumarAnios(n, anios) {
  const p = partes(n);
  const y = p.y + anios;
  if (p.m === 2 && p.d === 29 && !esBisiesto(y)) return Date.UTC(y, 2, 1) / DIA;
  return Date.UTC(y, p.m - 1, p.d) / DIA;
}

// Antigüedad del ingreso a la baja, AMBOS días inclusive. Un año de servicio se cumple el día anterior al aniversario
// (ingreso 01/03/2020 → año cumplido trabajando hasta el 28/02/2021). La fracción es días del año de servicio en curso
// ÷ días de ese año de servicio (365 o 366 si incluye un 29 de febrero).
function antiguedad(fechaIngreso, fechaBaja) {
  const ingreso = aDia(fechaIngreso, "fecha de ingreso");
  const baja = aDia(fechaBaja, "fecha de baja");
  if (baja < ingreso) throw new ErrorCalculo("La fecha de baja no puede ser anterior a la fecha de ingreso.");
  const finExclusivo = baja + 1;
  let completos = Math.max(0, partes(baja).y - partes(ingreso).y);
  while (completos > 0 && sumarAnios(ingreso, completos) > finExclusivo) completos -= 1;
  while (sumarAnios(ingreso, completos + 1) <= finExclusivo) completos += 1;
  const inicioAnio = sumarAnios(ingreso, completos);
  const diasAnioServicio = sumarAnios(ingreso, completos + 1) - inicioAnio;
  const diasCursados = finExclusivo - inicioAnio;
  const anios = r4(completos + diasCursados / diasAnioServicio);
  // Año de servicio «en curso» para vacaciones: si la baja cae justo el último día de un año, ese año se paga completo.
  let anioEnCurso = completos + 1;
  let diasEnCurso = diasCursados;
  let diasAnioEnCurso = diasAnioServicio;
  if (diasCursados === 0 && completos > 0) {
    anioEnCurso = completos;
    const inicioPrevio = sumarAnios(ingreso, completos - 1);
    diasAnioEnCurso = inicioAnio - inicioPrevio;
    diasEnCurso = diasAnioEnCurso;
  }
  return {
    fecha_ingreso: iso(ingreso), fecha_baja: iso(baja), dias_totales: finExclusivo - ingreso,
    anios_completos: completos, dias_anio_actual: diasCursados, dias_anio_servicio: diasAnioServicio, anios,
    anio_en_curso: anioEnCurso, dias_en_curso: diasEnCurso, dias_anio_en_curso: diasAnioEnCurso,
    texto: `${completos} año${completos === 1 ? "" : "s"} + ${diasCursados}/${diasAnioServicio} días = ${cifra(anios)} año${anios === 1 ? "" : "s"}`,
  };
}

// ─── Salario diario (art. 89) ────────────────────────────────────────────────────────────────────────────────
const DIVISORES = Object.freeze({ Mensual: 30, Quincenal: 15, Catorcenal: 14, Semanal: 7, Diario: 1 });
function salarioDiarioDe({ salario, periodicidad = "Mensual", horasPorDia = 8 } = {}) {
  const s = Number(salario);
  if (!Number.isFinite(s) || s <= 0) return 0;
  if (periodicidad === "Por hora") return r2(s * (Number(horasPorDia) || 8));
  const divisor = DIVISORES[periodicidad] ?? 30;
  return r2(s / divisor);
}
const textoSalarioDiario = ({ salario, periodicidad = "Mensual", horasPorDia = 8 }) => {
  const sd = salarioDiarioDe({ salario, periodicidad, horasPorDia });
  if (periodicidad === "Por hora") return `${pesos(salario)} por hora × ${horasPorDia} h = ${pesos(sd)} diarios`;
  const divisor = DIVISORES[periodicidad] ?? 30;
  return divisor === 1 ? `${pesos(sd)} diarios` : `${pesos(salario)} ${String(periodicidad).toLowerCase()} ÷ ${divisor} = ${pesos(sd)} diarios`;
};

// ─── Salario mínimo vigente ──────────────────────────────────────────────────────────────────────────────────
function salarioMinimo(fecha, zona = "general") {
  const z = zona === "zlfn" ? "zlfn" : "general";
  const anio = partes(aDia(fecha, "fecha del salario mínimo")).y;
  let fila = SALARIOS_MINIMOS.find((f) => f.anio === anio);
  let aviso = null;
  if (!fila) {
    const anteriores = SALARIOS_MINIMOS.filter((f) => f.anio < anio);
    fila = anteriores.length ? anteriores[anteriores.length - 1] : SALARIOS_MINIMOS[0];
    aviso = `No hay salario mínimo cargado para ${anio}; se usó el de ${fila.anio} (${pesos(fila[z])}). Pendiente de confirmar.`;
  }
  return { anio: fila.anio, zona: z, zona_texto: ZONAS[z], monto: fila[z], fuente: fila.fuente, por_confirmar: !!(fila.porConfirmar || aviso), aviso };
}

// ─── Vacaciones (art. 76, reforma DOF 27/12/2022, vigente desde 2023) ───────────────────────────────────────
function diasVacacionesLey(anioServicio) {
  const n = Math.floor(Number(anioServicio) || 0);
  if (n <= 0) return 0;
  if (n <= 5) return 10 + 2 * n; // 12, 14, 16, 18, 20
  return 22 + 2 * Math.floor((n - 6) / 5); // 6–10 = 22, 11–15 = 24, 16–20 = 26…
}
// Días de vacaciones del año de servicio en curso a una fecha (para contratos y formularios).
function diasVacacionesALaFecha(fechaIngreso, fecha) {
  const a = antiguedad(fechaIngreso, fecha);
  return diasVacacionesLey(a.anio_en_curso);
}
function tablaVacacionesLey(hasta = 35) {
  return Array.from({ length: hasta }, (_, i) => ({ anios: i + 1, dias: diasVacacionesLey(i + 1) }));
}

// ─── Aguinaldo (art. 87) ────────────────────────────────────────────────────────────────────────────────────
// Proporcional a los días del año calendario trabajados: de max(ingreso, 1-ene) a la fecha de corte, ambos inclusive,
// menos las faltas que RH decida descontar (dato capturable, 0 por omisión), ÷ 365 (366 en bisiesto).
function calcularAguinaldo({ salario_diario, fecha_ingreso, fecha_corte, dias_aguinaldo, faltas = 0 } = {}) {
  const sd = r2(num(salario_diario, NaN));
  if (!Number.isFinite(sd) || sd <= 0) throw new ErrorCalculo("El salario diario debe ser mayor que cero.");
  const ingreso = aDia(fecha_ingreso, "fecha de ingreso");
  const corte = aDia(fecha_corte, "fecha de corte");
  const diasEmpresa = num(dias_aguinaldo, 15);
  if (!Number.isFinite(diasEmpresa) || diasEmpresa < 0) throw new ErrorCalculo("Los días de aguinaldo no son válidos.");
  const faltasN = num(faltas, 0);
  if (!Number.isFinite(faltasN) || faltasN < 0) throw new ErrorCalculo("Los días no trabajados no pueden ser negativos.");
  const avisos = [];
  const dias = Math.max(15, diasEmpresa);
  if (diasEmpresa < 15) avisos.push("La ley pide al menos 15 días de aguinaldo; se usaron 15.");
  const anio = partes(corte).y;
  const inicioAnio = Date.UTC(anio, 0, 1) / DIA;
  if (ingreso > corte) return { aplica: false, motivo: "Ingresó después de la fecha de corte." };
  const desde = Math.max(ingreso, inicioAnio);
  const diasPeriodo = corte - desde + 1;
  const diasAnio = diasDelAnio(anio);
  const diasTrabajados = Math.max(0, diasPeriodo - faltasN);
  const completo = desde === inicioAnio && corte === Date.UTC(anio, 11, 31) / DIA && faltasN === 0;
  const monto = r2((sd * dias * diasTrabajados) / diasAnio);
  const formula = completo
    ? `${cifra(dias)} días × ${pesos(sd)} = ${pesos(monto)} (año completo)`
    : `${cifra(dias)} días × ${cifra(diasTrabajados)}/${diasAnio} días trabajados × ${pesos(sd)} = ${pesos(monto)}`;
  return {
    aplica: true, version: VERSION_CALCULO, anio, salario_diario: sd, dias_aguinaldo: dias,
    periodo_desde: iso(desde), periodo_hasta: iso(corte), dias_periodo: diasPeriodo, faltas: faltasN,
    dias_trabajados: diasTrabajados, dias_anio: diasAnio, es_proporcional: !completo,
    dias_proporcionales: r4((dias * diasTrabajados) / diasAnio), monto, formula,
    explicacion: `Del ${dma(desde)} al ${dma(corte)}: ${diasPeriodo} días${faltasN ? ` − ${cifra(faltasN)} no trabajados` : ""} de ${diasAnio} del año (art. 87 LFT).`,
    avisos, nota: NOTA_BRUTO,
  };
}

// ─── Finiquito y liquidación ────────────────────────────────────────────────────────────────────────────────
// entradas: fecha_ingreso, fecha_baja, tipo_terminacion, salario_diario, dias_salario_pendiente, faltas_aguinaldo,
// dias_aguinaldo, prima_vacacional_porcentaje, dias_vacaciones_anio_empresa, dias_vacaciones_pendientes_anteriores,
// dias_vacaciones_gozadas_anio_actual, zona_salario_minimo, incluir_20_dias, gratificacion_adicional.
function calcularFiniquito(e = {}) {
  const clave = tipoTerminacion(e.tipo_terminacion);
  if (!clave) throw new ErrorCalculo("Elige el tipo de terminación (renuncia, despido, rescisión, fin de contrato, muerte o incapacidad, o mutuo acuerdo).");
  const tipo = TIPOS[clave];
  const sd = r2(num(e.salario_diario, NaN));
  if (!Number.isFinite(sd) || sd <= 0) throw new ErrorCalculo("El salario diario debe ser mayor que cero.");
  const campos = {
    dias_salario_pendiente: num(e.dias_salario_pendiente, 0),
    faltas_aguinaldo: num(e.faltas_aguinaldo, 0),
    dias_aguinaldo: num(e.dias_aguinaldo, 15),
    prima_vacacional_porcentaje: num(e.prima_vacacional_porcentaje, 25),
    dias_vacaciones_anio_empresa: num(e.dias_vacaciones_anio_empresa, 0),
    dias_vacaciones_pendientes_anteriores: num(e.dias_vacaciones_pendientes_anteriores, 0),
    dias_vacaciones_gozadas_anio_actual: num(e.dias_vacaciones_gozadas_anio_actual, 0),
    gratificacion_adicional: num(e.gratificacion_adicional, 0),
  };
  for (const [k, v] of Object.entries(campos)) {
    if (!Number.isFinite(v) || v < 0) throw new ErrorCalculo(`El dato «${k.replace(/_/g, " ")}» debe ser un número igual o mayor que cero.`);
  }
  const a = antiguedad(e.fecha_ingreso, e.fecha_baja);
  const zona = e.zona_salario_minimo === "zlfn" ? "zlfn" : "general";
  const avisos = [];

  // Prestaciones del año: las de la empresa si son mayores que las de ley.
  const diasAguinaldo = Math.max(15, campos.dias_aguinaldo);
  if (campos.dias_aguinaldo < 15) avisos.push("La ley pide al menos 15 días de aguinaldo; se usaron 15.");
  const primaPct = Math.max(25, campos.prima_vacacional_porcentaje);
  if (campos.prima_vacacional_porcentaje < 25) avisos.push("La prima vacacional de ley es de al menos 25 %; se usó 25 %.");
  const diasVacLey = diasVacacionesLey(a.anio_en_curso);
  const diasVacAnio = Math.max(diasVacLey, campos.dias_vacaciones_anio_empresa);

  // SDI (art. 84): SD × (1 + días de aguinaldo/365 + días de vacaciones × % prima/365), factor a 4 decimales.
  const factor = r4(1 + diasAguinaldo / 365 + (diasVacAnio * primaPct) / 100 / 365);
  const sdi = r2(sd * factor);
  const formulaSdi = `${pesos(sd)} × (1 + ${cifra(diasAguinaldo)}/365 + ${cifra(diasVacAnio)} × ${pct(primaPct)}/365) = ${pesos(sd)} × ${factor.toFixed(4)} = ${pesos(sdi)}`;

  const conceptos = [];
  const agregar = (c) => conceptos.push({ nota: null, aplica: true, ...c, monto: r2(c.monto) });

  // 1. Salario pendiente.
  agregar({
    clave: "salario_pendiente", concepto: "Salario pendiente", grupo: "finiquito", articulo: "art. 82",
    monto: campos.dias_salario_pendiente * sd,
    formula: `${cifra(campos.dias_salario_pendiente)} días × ${pesos(sd)} = ${pesos(r2(campos.dias_salario_pendiente * sd))}`,
  });

  // 2. Aguinaldo proporcional (mismo cálculo que el panel de Aguinaldos y la calculadora pública).
  const ag = calcularAguinaldo({ salario_diario: sd, fecha_ingreso: e.fecha_ingreso, fecha_corte: e.fecha_baja, dias_aguinaldo: diasAguinaldo, faltas: campos.faltas_aguinaldo });
  agregar({ clave: "aguinaldo", concepto: "Aguinaldo proporcional", grupo: "finiquito", articulo: "art. 87", monto: ag.monto, formula: ag.formula, nota: ag.explicacion });

  // 3. Vacaciones: pendientes de años anteriores + proporcionales del año en curso − ya gozadas este año (art. 79).
  const proporcionales = r4((diasVacAnio * a.dias_en_curso) / a.dias_anio_en_curso);
  const pendientesAnio = r4(Math.max(0, proporcionales - campos.dias_vacaciones_gozadas_anio_actual));
  const diasVacPagar = r4(campos.dias_vacaciones_pendientes_anteriores + pendientesAnio);
  const montoVac = r2(diasVacPagar * sd);
  const detalleVac = `${cifra(diasVacAnio)} días del año ${a.anio_en_curso} × ${a.dias_en_curso}/${a.dias_anio_en_curso} = ${cifra(proporcionales)}`
    + (campos.dias_vacaciones_gozadas_anio_actual ? ` − ${cifra(campos.dias_vacaciones_gozadas_anio_actual)} gozados` : "")
    + (campos.dias_vacaciones_pendientes_anteriores ? ` + ${cifra(campos.dias_vacaciones_pendientes_anteriores)} pendientes de años anteriores` : "")
    + ` = ${cifra(diasVacPagar)} días`;
  agregar({
    clave: "vacaciones", concepto: "Vacaciones pendientes y proporcionales", grupo: "finiquito", articulo: "arts. 76 y 79",
    monto: montoVac, formula: `${cifra(diasVacPagar)} días × ${pesos(sd)} = ${pesos(montoVac)}`, nota: detalleVac,
  });

  // 4. Prima vacacional (art. 80) sobre los mismos días.
  const montoPrimaVac = r2((diasVacPagar * sd * primaPct) / 100);
  agregar({
    clave: "prima_vacacional", concepto: "Prima vacacional", grupo: "finiquito", articulo: "art. 80",
    monto: montoPrimaVac, formula: `${cifra(diasVacPagar)} días × ${pesos(sd)} × ${pct(primaPct)} = ${pesos(montoPrimaVac)}`,
  });

  // 5. Prima de antigüedad (art. 162) con tope de 2 salarios mínimos (arts. 485 y 486).
  const sm = salarioMinimo(e.fecha_baja, zona);
  if (sm.aviso) avisos.push(sm.aviso);
  const tope = r2(2 * sm.monto);
  const basePrima = Math.min(sd, tope);
  const topada = sd > tope;
  const aplicaPrima = tipo.prima === "si" || a.anios_completos >= 15;
  const explicaTope = topada
    ? `Por ley (arts. 162, 485 y 486) el salario para la prima de antigüedad no puede pasar del doble del salario mínimo (${sm.zona_texto} ${sm.anio}: 2 × ${pesos(sm.monto)} = ${pesos(tope)}); por eso se usa ${pesos(tope)} y no el salario del empleado (${pesos(sd)}).`
    : `El salario del empleado (${pesos(sd)}) no pasa del tope de ley de 2 salarios mínimos (${pesos(tope)}).`;
  const montoPrimaAnt = aplicaPrima ? r2(12 * basePrima * a.anios) : 0;
  agregar({
    clave: "prima_antiguedad", concepto: "Prima de antigüedad", grupo: "indemnizacion", articulo: "art. 162",
    aplica: aplicaPrima, monto: montoPrimaAnt,
    formula: aplicaPrima ? `12 días × ${pesos(basePrima)} × ${cifra(a.anios)} años = ${pesos(montoPrimaAnt)}` : "No aplica",
    nota: aplicaPrima ? explicaTope : `No aplica: en ${tipo.etiqueta.toLowerCase()} solo se paga con 15 años de servicio o más (art. 162 fr. III); lleva ${a.anios_completos}.`,
    tope_aplicado: topada,
  });

  // 6. Indemnización constitucional: 90 días de SDI (arts. 48 y 50 fr. III).
  let monto90 = 0;
  if (tipo.tres) {
    monto90 = r2(90 * sdi);
    agregar({ clave: "indemnizacion_90", concepto: "Indemnización constitucional (90 días)", grupo: "indemnizacion", articulo: "arts. 48 y 50 fr. III", monto: monto90, formula: `90 días × ${pesos(sdi)} (SDI) = ${pesos(monto90)}`, nota: `SDI: ${formulaSdi}` });
  }

  // 7. 20 días por año de servicio (art. 50 fr. II): casilla, activada por omisión donde aplica.
  let incluir20 = false;
  let monto20 = 0;
  if (tipo.veinte === "opcion") {
    incluir20 = e.incluir_20_dias === undefined || e.incluir_20_dias === null || e.incluir_20_dias === "" ? true : e.incluir_20_dias === true || e.incluir_20_dias === 1 || e.incluir_20_dias === "1" || e.incluir_20_dias === "true";
    monto20 = incluir20 ? r2(20 * sdi * a.anios) : 0;
    agregar({
      clave: "veinte_dias", concepto: "20 días por año de servicio", grupo: "indemnizacion", articulo: "arts. 49, 50 fr. II y 52",
      aplica: incluir20, monto: monto20,
      formula: incluir20 ? `20 días × ${pesos(sdi)} (SDI) × ${cifra(a.anios)} años = ${pesos(monto20)}` : "No incluido",
      nota: "Se paga cuando el patrón se niega a reinstalar (art. 49) o en la rescisión por causa del patrón (art. 52). Se puede quitar si no corresponde.",
    });
  }

  // 8. Gratificación adicional pactada (opcional; p. ej. mutuo acuerdo).
  if (campos.gratificacion_adicional > 0) {
    agregar({ clave: "gratificacion", concepto: "Gratificación adicional pactada", grupo: "adicional", articulo: "art. 33", monto: campos.gratificacion_adicional, formula: `Monto pactado = ${pesos(r2(campos.gratificacion_adicional))}` });
  }

  const suma = (g) => r2(conceptos.filter((c) => g.includes(c.grupo)).reduce((t, c) => t + c.monto, 0));
  const subtotalFiniquito = suma(["finiquito"]);
  const subtotalIndemnizacion = suma(["indemnizacion", "adicional"]);
  const total = r2(subtotalFiniquito + subtotalIndemnizacion);

  return {
    version: VERSION_CALCULO,
    tipo: { clave, etiqueta: tipo.etiqueta, guardado: tipo.guardado, articulo: tipo.articulo, prima_antiguedad: tipo.prima, noventa_dias: tipo.tres, veinte_dias: tipo.veinte },
    es_liquidacion: tipo.tres,
    entradas: { ...campos, fecha_ingreso: a.fecha_ingreso, fecha_baja: a.fecha_baja, tipo_terminacion: clave, salario_diario: sd, zona_salario_minimo: zona, incluir_20_dias: incluir20 },
    antiguedad: a,
    salario: { diario: sd, integrado: sdi, factor_integracion: factor, formula_sdi: formulaSdi },
    prestaciones: { dias_aguinaldo: diasAguinaldo, prima_vacacional_porcentaje: primaPct, dias_vacaciones_ley: diasVacLey, dias_vacaciones_anio: diasVacAnio },
    aguinaldo: ag,
    vacaciones: { proporcionales, pendientes_anio: pendientesAnio, a_pagar: diasVacPagar },
    salario_minimo: { ...sm, tope_prima_antiguedad: tope, tope_aplicado: topada, explicacion: explicaTope },
    conceptos, subtotal_finiquito: subtotalFiniquito, subtotal_indemnizacion: subtotalIndemnizacion, total,
    avisos, nota: NOTA_BRUTO,
  };
}

// Columnas históricas de la tabla finiquitos (y del panel) a partir del resultado del motor.
function aColumnasFiniquito(r) {
  const m = (clave) => r.conceptos.find((c) => c.clave === clave)?.monto ?? 0;
  const ent = r.entradas;
  const prima = r.conceptos.find((c) => c.clave === "prima_antiguedad");
  return {
    fecha_ingreso: ent.fecha_ingreso, fecha_baja: ent.fecha_baja,
    dias_trabajados: r.antiguedad.dias_totales, años_trabajados: r.antiguedad.anios.toFixed(4), años_completos: r.antiguedad.anios_completos,
    salario_diario: r.salario.diario.toFixed(2), salario_mensual: r2(r.salario.diario * 30).toFixed(2),
    salario_diario_integrado: r.salario.integrado.toFixed(2),
    tipo_terminacion: r.tipo.guardado, es_liquidacion: r.es_liquidacion,
    dias_aguinaldo: r.prestaciones.dias_aguinaldo, prima_vacacional_porcentaje: r.prestaciones.prima_vacacional_porcentaje,
    dias_vacaciones_ley_año_actual: r.prestaciones.dias_vacaciones_anio,
    dias_no_trabajados: ent.faltas_aguinaldo,
    dias_transcurridos_año_bruto: r.antiguedad.dias_en_curso, dias_transcurridos_año_neto: r.antiguedad.dias_en_curso,
    dias_salario_pendiente: ent.dias_salario_pendiente, monto_salario_pendiente: m("salario_pendiente").toFixed(2),
    dias_aguinaldo_proporcional: r.aguinaldo.dias_proporcionales, monto_aguinaldo_proporcional: m("aguinaldo").toFixed(2),
    periodo_aguinaldo_desde: r.aguinaldo.periodo_desde, periodo_aguinaldo_hasta: r.aguinaldo.periodo_hasta,
    dias_vacaciones_años_anteriores: ent.dias_vacaciones_pendientes_anteriores,
    dias_vacaciones_año_actual_proporcional_bruto: r.vacaciones.proporcionales,
    dias_vacaciones_año_actual_ya_gozadas: ent.dias_vacaciones_gozadas_anio_actual,
    dias_vacaciones_año_actual_pendientes: r.vacaciones.pendientes_anio,
    dias_vacaciones_totales: r.vacaciones.a_pagar,
    monto_vacaciones_no_gozadas: m("vacaciones").toFixed(2), monto_prima_vacacional: m("prima_vacacional").toFixed(2),
    subtotal_finiquito: r.subtotal_finiquito.toFixed(2),
    dias_prima_antiguedad: prima?.aplica ? r4(12 * r.antiguedad.anios) : 0, monto_prima_antiguedad: m("prima_antiguedad").toFixed(2),
    salario_base_prima_antiguedad: Math.min(r.salario.diario, r.salario_minimo.tope_prima_antiguedad).toFixed(2),
    tope_prima_antiguedad: r.salario_minimo.tope_prima_antiguedad.toFixed(2),
    dias_indemnizacion_3_meses: r.es_liquidacion ? 90 : 0,
    dias_20_por_año: r.entradas.incluir_20_dias ? r4(20 * r.antiguedad.anios) : 0, monto_20_por_año: m("veinte_dias").toFixed(2),
    dias_indemnizacion_total: r4((r.es_liquidacion ? 90 : 0) + (r.entradas.incluir_20_dias ? 20 * r.antiguedad.anios : 0)),
    // La columna histórica «indemnización constitucional» guarda los 90 días + los 20 días por año, como antes.
    monto_indemnizacion_constitucional: r2(m("indemnizacion_90") + m("veinte_dias")).toFixed(2),
    dias_salarios_vencidos: 0, monto_salarios_vencidos: "0.00",
    gratificacion_adicional: m("gratificacion").toFixed(2),
    subtotal_liquidacion: r.subtotal_indemnizacion.toFixed(2), total_pagar: r.total.toFixed(2),
    zona_salario_minimo: r.entradas.zona_salario_minimo, incluir_20_dias: r.entradas.incluir_20_dias,
    version_calculo: r.version,
  };
}

// Fecha de hoy en la Ciudad de México (YYYY-MM-DD).
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());

module.exports = {
  VERSION_CALCULO, NOTA_BRUTO, SALARIOS_MINIMOS, ZONAS, TIPOS, ErrorCalculo,
  tipoTerminacion, salarioDiarioDe, textoSalarioDiario, salarioMinimo, antiguedad, diasVacacionesLey,
  diasVacacionesALaFecha, tablaVacacionesLey, calcularAguinaldo, calcularFiniquito, aColumnasFiniquito,
  r2, r4, pesos, esBisiesto, hoy,
};
