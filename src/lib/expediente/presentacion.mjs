// Expediente laboral por etapas (28/11/2026): reglas de PRESENTACIÓN, puras y sin navegador. Las reglas de ley (plazos,
// qué se exige a quién) viven en el backend (modules/attendance/services/expedienteLey.js, docs/expediente-ley.md); aquí
// solo se decide cómo mostrarlas: textos, tonos, qué botones lleva cada documento y los mensajes de error.

// Estados de la lista de ley. Los pasos (Ingreso y Salida) hablan de «hecho»; los documentos, de «lo tiene».
const ESTADO = Object.freeze({
  cumplido: { paso: "Hecho", documento: "Lo tiene", tono: "verde" },
  por_vencer: { paso: "Vence pronto", documento: "Vence pronto", tono: "ambar" },
  vencido: { paso: "Vencido", documento: "Vencido", tono: "rojo" },
  falta: { paso: "Falta", documento: "Falta", tono: "rojo" },
  no_aplica: { paso: "No aplica", documento: "No aplica", tono: "gris" },
});

export function etiquetaEstado(item) {
  const e = ESTADO[item?.estado] ?? ESTADO.falta;
  return { texto: item?.paso ? e.paso : e.documento, tono: e.tono };
}

const fechaMx = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "");
export { fechaMx };

// «Marcado por RH el 27/11/2026 10:00» (marca a mano) o de dónde salió (documento, otro módulo).
export function origenItem(item) {
  if (!item) return null;
  if (item.origen === "manual" && item.marca) {
    const cuando = item.marca.en ? ` el ${fechaMx(item.marca.en)}${String(item.marca.en).length > 10 ? ` ${String(item.marca.en).slice(11, 16)}` : ""}` : "";
    const por = item.marca.por ? ` por ${item.marca.por}` : "";
    return `${item.estado === "no_aplica" ? "Marcado «no aplica»" : "Marcado a mano"}${por}${cuando}${item.marca.nota ? `: ${item.marca.nota}` : ""}`;
  }
  if (item.origen === "vinculado" && item.vinculo) return `Viene de ${item.vinculo.titulo}`;
  if (item.origen === "documento") return "Con documento en el expediente";
  return item.motivo ?? null;
}

// Plazo de guarda en palabras.
export function textoGuarda(guarda) {
  if (!guarda) return null;
  const confirmar = guarda.por_confirmar ? " (plazo por confirmar con abogado)" : "";
  if (guarda.puede_depurarse) return `Su plazo de guarda terminó: puede depurarse${confirmar}.`;
  if (guarda.hasta) return `Se conserva hasta el ${fechaMx(guarda.hasta)}${confirmar}.`;
  if (guarda.mientras_relacion) return `Se conserva mientras dure la relación laboral y después de la baja${confirmar}.`;
  return null;
}

// Botones de cada documento propio (los vinculados solo se ven en su módulo).
export function accionesDocumento(doc, { puedeEditar = false } = {}) {
  const acciones = ["ver"];
  if (!puedeEditar || doc?.origen === "GENERADO") return acciones;
  const vigente = doc?.estatus_manual === "ACTIVO";
  if (vigente) acciones.push("reemplazar", "archivar");
  if (doc?.estatus_manual === "ARCHIVADO" && !doc?.reemplazado_por_id) acciones.push("restaurar");
  if (doc?.guarda?.puede_depurarse) acciones.push("depurar");
  return acciones;
}

// Tono del porcentaje de cumplimiento.
export const tonoPorcentaje = (p) => (Number(p) >= 100 ? "verde" : Number(p) >= 70 ? "ambar" : "rojo");

// Resumen corto para el encabezado y el tablero.
export function textoResumen(r) {
  if (!r) return "";
  if (!r.total) return "Nada de ley le aplica todavía.";
  const partes = [`${r.cumplidos} de ${r.total} de ley`];
  if (r.faltan) partes.push(`${r.faltan} ${r.faltan === 1 ? "falta" : "faltan"}`);
  if (r.vencidos) partes.push(`${r.vencidos} ${r.vencidos === 1 ? "vencido" : "vencidos"}`);
  if (r.por_vencer) partes.push(`${r.por_vencer} por vencer`);
  return partes.join(" · ");
}

// Mensaje claro de un error del backend (409 en plazo, 428 confirmar, 503 sin migración, 403…).
export function mensajeError(err, porDefecto = "No se pudo completar la acción.") {
  const r = err?.response;
  const datos = r?.data;
  if (datos && typeof datos === "object" && datos.error) return datos.error;
  if (r?.status === 403) return "No tienes permiso para hacer esto en este expediente.";
  if (r?.status === 503) return "Falta preparar la base de datos para esta función. Avísale a soporte de ADAMIA.";
  if (!r) return "No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.";
  return porDefecto;
}

// Parámetros del tablero de la empresa (solo los que tienen valor).
export function consultaTablero({ estado = "activos", departamento = "", sucursal = "", q = "", incompletos = false } = {}) {
  const p = new URLSearchParams();
  if (estado && estado !== "activos") p.set("estado", estado);
  if (departamento) p.set("departamento", departamento);
  if (sucursal) p.set("sucursal", sucursal);
  if (String(q).trim()) p.set("q", String(q).trim());
  if (incompletos) p.set("incompletos", "1");
  const s = p.toString();
  return s ? `?${s}` : "";
}

// Nombre del archivo que manda el servidor (Content-Disposition) o uno por omisión.
export function nombreDescarga(cabecera, porDefecto) {
  const m = /filename="?([^";]+)"?/i.exec(String(cabecera ?? ""));
  return m ? m[1] : porDefecto;
}

// Cuántos pasos faltan en una etapa (para el título de la sección).
export function pendientesEtapa(etapa) {
  const pasos = etapa?.pasos ?? [];
  return pasos.filter((p) => p.estado === "falta" || p.estado === "vencido").length;
}

// Carpetas que tienen algo (documentos o vínculos) primero; las vacías se muestran juntas al final.
export function ordenarCarpetas(carpetas = []) {
  const llenas = carpetas.filter((c) => (c.documentos?.length ?? 0) + (c.vinculos?.length ?? 0) > 0);
  const vacias = carpetas.filter((c) => !llenas.includes(c));
  return { llenas, vacias };
}

// ¿Se puede marcar a mano? Solo pasos de Ingreso y Salida, solo quien edita.
export const puedeMarcar = (item, puedeEditar) => Boolean(puedeEditar && item?.paso);

// Qué documento de ley se puede subir desde un paso (los que no son «paso sin archivo»).
export const puedeSubir = (item, puedeEditar) => Boolean(puedeEditar && item?.documento && item?.estado !== "no_aplica");

// Tamaño legible.
export function tamano(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// Con responseType «blob» (descargas), el error del backend llega como Blob: se lee para mostrar su mensaje.
export async function leerErrorBlob(err) {
  const datos = err?.response?.data;
  if (datos && typeof datos.text === "function") {
    try {
      err.response.data = JSON.parse(await datos.text());
    } catch {
      err.response.data = null;
    }
  }
  return err;
}
