// Estado del consentimiento del rostro a partir de la última solicitud de firma (pura; scripts/test-consentimiento.mjs).
const fechaCorta = (v) => {
  const d = new Date(String(v ?? "").replace(" ", "T") + (/[zZ]|[+-]\d{2}:?\d{2}$/.test(String(v ?? "")) ? "" : "Z"));
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Mexico_City" });
};

export function estadoConsentimiento(solicitud, ahora = Date.now()) {
  if (solicitud?.estatus === "firmado") {
    const f = fechaCorta(solicitud.signed_at);
    return { tipo: "firmado", etiqueta: "Firmado", detalle: f ? `Firmado el ${f}.` : "Firmado." };
  }
  const vence = solicitud?.expires_at ? Date.parse(String(solicitud.expires_at).replace(" ", "T") + (String(solicitud.expires_at).endsWith("Z") ? "" : "Z")) : NaN;
  if (["pendiente", "abierto"].includes(solicitud?.estatus) && solicitud?.url_firma && (Number.isNaN(vence) || vence > ahora)) {
    return { tipo: "esperando", etiqueta: "Esperando firma", detalle: solicitud.estatus === "abierto" ? "El empleado ya abrió el documento." : "Se generó el documento y falta que el empleado lo firme." };
  }
  const vencido = ["pendiente", "abierto"].includes(solicitud?.estatus);
  return { tipo: "pendiente", etiqueta: "Consentimiento pendiente", detalle: vencido ? "El enlace anterior venció." : "Este empleado aún no ha firmado su consentimiento." };
}
