// Acta administrativa en página propia, POR PASOS (28/11/2026, pedido del dueño: los formularios grandes dejan de ser
// ventana; docs/sistema-diseno.md). Reglas puras de la página: pasos, qué campo va en cada paso, rutas y textos. La
// validación (esquema zod) y lo que se manda al backend NO cambian: viven en
// src/app/panel/actas-administrativas/formulario/useFormularioActa.js, igual que en NewActaModal.jsx.
//   /panel/actas-administrativas/nueva            ?volver=<ruta>
//   /panel/actas-administrativas/<id_acta>/editar ?volver=<ruta>
import { conParametros } from "../formulario/rutaRegreso.mjs";

export const RUTA_ACTAS = "/panel/actas-administrativas";

export const rutaNuevaActa = ({ volver = null } = {}) => conParametros(`${RUTA_ACTAS}/nueva`, { volver });
export const rutaEditarActa = (id, { volver = null } = {}) =>
  conParametros(`${RUTA_ACTAS}/${encodeURIComponent(String(id))}/editar`, { volver });

// Los pasos siguen el orden en que se levanta un acta: a quién y de qué tipo, qué pasó (con testigos), la sanción y
// quién la elabora, lo que declara la persona y, al final, revisar todo antes de guardar. La firma NO va aquí: se manda a
// firmar desde el detalle del acta (AdministrativeDetailsModal), como hasta hoy.
export const PASOS_ACTA = [
  { clave: "persona", texto: "Persona y tipo de acta" },
  { clave: "hecho", texto: "Qué pasó" },
  { clave: "sancion", texto: "Sanción y quién la elabora" },
  { clave: "declaraciones", texto: "Declaraciones" },
  { clave: "revisar", texto: "Revisar y guardar" },
];

/** Campos del formulario (nombres del esquema) que se llenan en cada paso. */
export const CAMPOS_PASO = {
  persona: ["empresa", "empleado", "tipoActa"],
  hecho: ["fechaIncidente", "horaIncidente", "lugar", "descripcion", "testigos"],
  sancion: ["sancion", "elabora", "cargoElabora"],
  declaraciones: ["descargo", "aceptaHechos", "esReincidencia"],
  revisar: [],
};

/** Paso donde está un campo (o null). */
export function pasoDeCampo(campo) {
  for (const [paso, campos] of Object.entries(CAMPOS_PASO)) if (campos.includes(campo)) return paso;
  return null;
}

/** Errores por paso: { persona: 1, hecho: 2 } a partir de los errores de react-hook-form ({ campo: { message } }). */
export function erroresPorPaso(errores = {}) {
  const cuenta = {};
  for (const campo of Object.keys(errores ?? {})) {
    const paso = pasoDeCampo(campo);
    if (paso) cuenta[paso] = (cuenta[paso] ?? 0) + 1;
  }
  return cuenta;
}

/** Primer paso (en orden) que tiene errores, o null. */
export function primerPasoConError(errores = {}) {
  const cuenta = erroresPorPaso(errores);
  return PASOS_ACTA.find((p) => cuenta[p.clave])?.clave ?? null;
}

/** Primer campo con error dentro de un paso (para llevarle el foco), o null. */
export function primerCampoConError(errores = {}, paso) {
  return (CAMPOS_PASO[paso] ?? []).find((c) => errores?.[c]) ?? null;
}

// Sanciones del acta (las mismas cuatro de la ventana) y su texto: «amonestacion_escrita» → «Amonestacion Escrita»
// (mismo texto que mostraba la ventana; no se cambia para no confundir a quien ya lo conoce).
export const SANCIONES = ["amonestacion_verbal", "amonestacion_escrita", "suspension", "rescision"];
export function formatearTexto(str) {
  if (!str) return "";
  return String(str).split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/** Sí / No para el resumen. */
export const siNo = (v) => (v ? "Sí" : "No");
