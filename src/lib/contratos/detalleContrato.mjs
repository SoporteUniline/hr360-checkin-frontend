// Contratos · reglas de presentación de la vista de detalle (27/11/2026, docs/vistas-de-detalle.md y, en el backend,
// docs/contratos.md). Puro: sin React ni red, lo prueba scripts/test-contratos.mjs. El sueldo, las firmas y el historial
// los manda el servidor (GET /contratos/:id/detalle); aquí solo se ponen en palabras.

export const TIPOS = {
  indefinido: "Tiempo indeterminado",
  temporal: "Tiempo determinado",
  obra_determinada: "Obra determinada",
  capacitacion: "Capacitación inicial",
  prueba: "Periodo de prueba",
  prestacion_servicios: "Prestación de servicios",
};
export const TIPOS_OPCIONES = Object.entries(TIPOS).map(([value, label]) => ({ value, label }));
export const PERIODICIDADES = ["Semanal", "Catorcenal", "Quincenal", "Mensual"];

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const FECHA = /^(\d{4})-(\d{2})-(\d{2})/;

export const dinero = (n, { centavos = true } = {}) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  const conCentavos = centavos && Math.round(v * 100) % 100 !== 0;
  return `$${v.toLocaleString("es-MX", { minimumFractionDigits: conCentavos || centavos === "siempre" ? 2 : 0, maximumFractionDigits: 2 })}`;
};

/** "2025-01-10" → "10 ene 2025"; con hora ("2026-11-12 10:42") → "12 nov 2026 · 10:42". */
export function fechaCorta(valor) {
  const m = FECHA.exec(String(valor ?? ""));
  if (!m) return "";
  const hora = /\d{2}:\d{2}/.exec(String(valor).slice(10))?.[0];
  return `${Number(m[3])} ${MESES[Number(m[2]) - 1]} ${m[1]}${hora ? ` · ${hora}` : ""}`;
}

const POR_PERIODO = { Mensual: "al mes", Quincenal: "a la quincena", Catorcenal: "a la catorcena", Semanal: "a la semana", Diario: "al día", "Por hora": "por hora" };
export const porPeriodo = (p) => POR_PERIODO[p] ?? "";
export const pagoTexto = (p) => (p ? `Pago ${String(p).toLowerCase()}` : "");

export function estadoContrato(estatus) {
  const e = String(estatus ?? "").toLowerCase();
  if (e === "activo") return { texto: "Vigente", tono: "exito" };
  if (e === "suspendido") return { texto: "Suspendido", tono: "aviso" };
  if (e === "terminado") return { texto: "Terminado", tono: "neutro" };
  if (e === "cancelado") return { texto: "Cancelado", tono: "neutro" };
  return { texto: estatus || "Sin estatus", tono: "neutro" };
}
export const estaCerrado = (estatus) => ["terminado", "cancelado"].includes(String(estatus ?? "").toLowerCase());

export function vigenciaTexto({ fecha_inicio, fecha_fin }) {
  if (!fecha_inicio) return "";
  return fecha_fin ? `Del ${fechaCorta(fecha_inicio)} al ${fechaCorta(fecha_fin)}` : `Desde ${fechaCorta(fecha_inicio)} · sin fecha de término`;
}

/** Aviso de vencimiento (solo contratos vigentes con fecha de fin). → null | { texto, tono } */
export function alertaVence(dias) {
  if (dias == null || !Number.isFinite(Number(dias))) return null;
  const d = Number(dias);
  if (d < 0) return { texto: `Venció hace ${-d} ${-d === 1 ? "día" : "días"}`, tono: "error" };
  if (d === 0) return { texto: "Vence hoy", tono: "error" };
  if (d <= 30) return { texto: `Vence en ${d} ${d === 1 ? "día" : "días"}`, tono: d <= 7 ? "error" : "aviso" };
  return null;
}

/** Resumen de las dos firmas para el encabezado. */
export function firmaResumen(firma) {
  const empleado = Boolean(firma?.empleado?.firmado);
  const empresa = Boolean(firma?.empresa?.firmado);
  if (empleado && empresa) return { texto: "Firmado por las dos partes", tono: "exito" };
  if (empleado) return { texto: "Falta firma de la empresa", tono: "aviso" };
  if (empresa) return { texto: firma?.solicitud?.estatus === "pendiente" || firma?.solicitud?.estatus === "abierto" ? "Esperando la firma de la persona" : "Falta firma de la persona", tono: "aviso" };
  return { texto: "Sin firmar", tono: "aviso" };
}

/** Las dos tarjetas de «El documento»: quién firmó y cuándo. */
export function firmantes(firma, nombrePersona) {
  const solicitud = firma?.solicitud;
  const enviado = solicitud && ["pendiente", "abierto"].includes(solicitud.estatus);
  return [
    {
      rol: nombrePersona ? `Persona: ${nombrePersona}` : "Persona trabajadora",
      estado: firma?.empleado?.firmado ? "firmado" : enviado ? "enviado" : "pendiente",
      detalle: firma?.empleado?.firmado
        ? `Firmó el ${fechaCorta(firma.empleado.fecha) || "—"}`
        : enviado ? `Se le mandó a firmar${solicitud.vence ? ` · el enlace vence el ${fechaCorta(solicitud.vence)}` : ""}` : "Pendiente",
    },
    {
      rol: "Empresa",
      estado: firma?.empresa?.firmado ? "firmado" : "pendiente",
      detalle: firma?.empresa?.firmado ? `Firmó ${firma.empresa.nombre ?? "RH"} el ${fechaCorta(firma.empresa.fecha) || "—"}` : "Pendiente",
    },
  ];
}

/**
 * La acción principal (una sola) según el estado: firmar como empresa → mandar a firmar → copiar el enlace (si ya se
 * mandó) → descargar el PDF. Un contrato terminado solo se descarga.
 */
export function accionPrimaria({ contrato, firma }) {
  if (estaCerrado(contrato?.estatus)) return "descargar";
  if (!firma?.empresa?.firmado) return "firmar_empresa";
  if (!firma?.empleado?.firmado) {
    return firma?.solicitud && ["pendiente", "abierto"].includes(firma.solicitud.estatus) ? "reenviar" : "mandar_firmar";
  }
  return "descargar";
}

export const ETIQUETA_ACCION = {
  firmar_empresa: "Firmar como empresa",
  mandar_firmar: "Mandar a firmar",
  reenviar: "Volver a mandar a firmar",
  descargar: "Descargar PDF",
};

/** Eventos del servidor → renglones de la línea de tiempo. */
export function lineaDeTiempo(eventos = []) {
  const IMPORTANTES = new Set(["firma_empleado", "firma_empresa", "convenio", "creado", "terminado", "renovado"]);
  return (eventos ?? []).map((e) => ({
    id: e.id,
    titulo: e.titulo,
    detalle: [fechaCorta(e.fecha), e.nombre_usuario].filter(Boolean).join(" · "),
    destacado: IMPORTANTES.has(e.tipo),
  }));
}

/** Sueldo diario y mensual en palabras para la tarjeta «Sueldo». */
export function sueldoTarjeta(sueldo) {
  if (!sueldo) return null;
  const principal = sueldo.periodicidad_pago === "Mensual" ? sueldo.salario_base : sueldo.salario_mensual;
  return {
    principal: `${dinero(principal)}`,
    sufijo: "al mes",
    detalle: [pagoTexto(sueldo.periodicidad_pago), sueldo.periodicidad_pago !== "Mensual" ? `${dinero(sueldo.salario_base, { centavos: "siempre" })} ${porPeriodo(sueldo.periodicidad_pago)}` : null,
      `${dinero(sueldo.salario_diario, { centavos: "siempre" })} diarios`].filter(Boolean).join(" · "),
  };
}

/** Iniciales para el avatar del encabezado («Ana Torres Ruiz» → «AT»). */
export const iniciales = (nombre) => String(nombre ?? "").trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "—";

/** El mensaje del servidor cuando una acción se rechaza (409 con código), en palabras para RH. */
export function mensajeDeError(error, porOmision = "No se pudo completar la acción.") {
  const datos = error?.response?.data;
  if (datos?.codigo === "FALTAN_DATOS" && Array.isArray(datos.faltantes)) {
    return `Faltan datos para el contrato: ${datos.faltantes.map((f) => f.etiqueta).join(", ")}. Complétalos en la ficha o en el contrato.`;
  }
  return datos?.error || error?.message || porOmision;
}

/** "Entrada: 08:00 | Salida: 16:00 | Comida: 12:00 - 12:30" → "08:00 a 16:00 · comida 12:00 a 12:30". */
export function horarioCorto(horario) {
  const h = String(horario ?? "").trim();
  const horas = h.match(/\d{1,2}:\d{2}/g) ?? [];
  if (!/entrada/i.test(h) || horas.length < 2) return h;
  return `${horas[0]} a ${horas[1]}${horas.length >= 4 ? ` · comida ${horas[2]} a ${horas[3]}` : ""}`;
}
