// Franja «requiere atención» de la bandeja de WhatsApp (wa2, 25/11/2026). Funciones puras: del resumen que manda
// GET /reclutamiento/whatsapp/conversaciones (`atencion: { total, primeros: [{ id, contacto, motivo }] }`) al texto de la
// franja. El servidor ya cuenta solo las empresas de la sesión y deja fuera las conversaciones que tomó un reclutador.
import { nombreContacto } from "./telefono.mjs";

const normal = (s) => String(s ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

// Motivo que guarda el agente → frase corta para la franja (el motivo completo se ve en el chat).
const MOTIVOS = [
  [/^pidio hablar con una persona/, (n) => `${n} pidió hablar con una persona`],
  [/^aprobar agenda/, (n) => `${n} espera que apruebes su entrevista`],
  [/^respuesta de filtro contradictoria/, (n) => `${n}: revisa una respuesta de filtro`],
  [/^vacante alterna: /, (n, m, original) => `${n} podría interesarle «${original.replace(/^vacante alterna:\s*/i, "").replace(/\s*\(.*\)\s*$/, "").trim()}»`],
  [/^(limite de respuestas|tope mensual)/, (n) => `${n}: el agente llegó a su límite`],
  [/^(el agente (de ia )?fallo|el agente no (pudo|genero)|el agente fallo)/, (n) => `${n}: el agente no pudo contestar`],
  [/^sin horarios disponibles/, (n) => `${n}: no hay horarios para su entrevista`],
  [/^no eligio horario/, (n) => `${n} no eligió horario`],
  [/^pidio (cancelar|cambiar) la cita/, (n, m) => `${n} pidió ${m[1]} su cita`],
];
const MAX_MOTIVO = 70;

/** Una conversación del resumen → «Ana Ruiz pidió hablar con una persona». */
export function detalleAtencion(item) {
  const nombre = nombreContacto(item?.contacto);
  const motivo = String(item?.motivo ?? "").trim();
  const n = normal(motivo);
  for (const [patron, frase] of MOTIVOS) {
    const m = n.match(patron);
    if (m) return frase(nombre, m, motivo);
  }
  if (!motivo) return `${nombre} necesita que lo atiendas`;
  return `${nombre}: ${motivo.length > MAX_MOTIVO ? `${motivo.slice(0, MAX_MOTIVO - 1).trimEnd()}…` : motivo}`;
}

/**
 * Resumen del API → { total, titulo, detalle, otros, idPrimero } o null si nadie pide atención.
 * otros: cuántos más hay además del primero (para «y 2 más»).
 */
export function franjaAtencion(atencion) {
  const total = Number(atencion?.total) || 0;
  const primeros = Array.isArray(atencion?.primeros) ? atencion.primeros : [];
  if (total <= 0) return null;
  const primero = primeros[0] ?? null;
  return {
    total,
    titulo: total === 1 ? "1 candidato necesita atención" : `${total} candidatos necesitan atención`,
    detalle: primero ? detalleAtencion(primero) : "",
    otros: Math.max(0, total - 1),
    idPrimero: primero?.id ?? null,
  };
}

/**
 * Qué hace «Ver»: con un solo candidato (o con el filtro «Atención» ya puesto) abre el primero; con varios, filtra la
 * lista por «Atención». → { tipo: 'abrir', id } | { tipo: 'filtrar' } | null
 */
export function accionFranja(franja, filtroActual) {
  if (!franja) return null;
  if ((franja.total === 1 || filtroActual === "atencion") && franja.idPrimero != null) return { tipo: "abrir", id: franja.idPrimero };
  return { tipo: "filtrar" };
}

/** Texto del botón según lo que hará. */
export const textoAccionFranja = (franja, filtroActual) => (accionFranja(franja, filtroActual)?.tipo === "abrir" ? "Abrir chat" : "Ver");
