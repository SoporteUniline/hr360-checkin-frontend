// Lumo fase B2 (25/11/2026): formulario de la entrevista por enlace (/postular/<token>) y la sección «Entrevista» de la
// ficha. Reglas puras de pantalla: el servidor vuelve a validar todo.

// Documento de un campo: solo la ruta del API que exige sesión (nunca una URL de S3).
const RUTA_ARCHIVO = /^\/reclutamiento\/whatsapp\/conversaciones\/\d{1,10}\/archivos\/\d{1,10}$/;
export const rutaArchivoCampo = (url) => (RUTA_ARCHIVO.test(String(url ?? "")) ? String(url) : null);

const fechaCorta = (s) => {
  const m = String(s ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
};
// «Enlace vigente hasta el 02/12/2026 · lo llenó 1 vez» / «El enlace venció…».
export function textoEstadoFormulario(f) {
  if (!f) return "";
  const llenado = f.envios ? ` · lo llenó ${f.envios === 1 ? "1 vez" : `${f.envios} veces`}` : " · aún no lo llena";
  return f.vigente ? `Enlace vigente hasta el ${fechaCorta(f.expira_en)}${llenado}` : `El enlace venció el ${fechaCorta(f.expira_en)}${llenado}`;
}

// Campos del API → preguntas del formulario público (mismo componente que la página de la vacante).
const TIPO_FORM = { si_no: "select", opciones: "select", numero: "number", fecha: "date", texto: "text" };
export function camposAPreguntas(campos = []) {
  return campos.filter((c) => c.tipo !== "archivo").map((c) => ({
    id: c.id, label: c.texto, type: TIPO_FORM[c.tipo] ?? "text", required: Boolean(c.obligatoria), options: c.tipo === "si_no" ? ["Sí", "No"] : c.opciones ?? [],
  }));
}
export const camposArchivo = (campos = []) => campos.filter((c) => c.tipo === "archivo");
// Valores iniciales (lo que ya contestó por WhatsApp).
export const valoresIniciales = (campos = []) => Object.fromEntries(campos.filter((c) => c.tipo !== "archivo" && c.valor != null).map((c) => [c.id, String(c.valor)]));

const TIPOS_DOC = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
export const MAX_DOC = 10 * 1024 * 1024;
// → { faltan: [ids], errores: {id: texto} } antes de mandar.
export function revisarEnvio(campos = [], valores = {}, archivos = {}) {
  const faltan = [];
  const errores = {};
  for (const c of campos) {
    if (c.tipo === "archivo") {
      const f = archivos[c.id];
      if (f && !TIPOS_DOC.has(f.type)) errores[c.id] = "Sube un PDF, documento de Word o una foto (JPG, PNG o WEBP).";
      else if (f && f.size > MAX_DOC) errores[c.id] = "El archivo pesa más de 10 MB.";
      else if (!f && c.obligatoria && !c.archivo) faltan.push(c.id);
      continue;
    }
    const v = valores[c.id];
    if ((v == null || String(v).trim() === "") && c.obligatoria) faltan.push(c.id);
  }
  return { faltan, errores };
}

export function mensajeFormulario(codigo) {
  switch (codigo) {
    case "FORMULARIO_INVALIDO": return { titulo: "Este enlace no es válido", texto: "Pide uno nuevo en la misma plática de WhatsApp." };
    case "FORMULARIO_VENCIDO": return { titulo: "Este enlace ya venció", texto: "Los enlaces duran 7 días. Pide uno nuevo por WhatsApp." };
    case "VACANTE_CERRADA": return { titulo: "La vacante ya no recibe respuestas", texto: "Gracias por tu interés. Si tienes dudas, escríbenos por WhatsApp." };
    case "SIN_CONSENTIMIENTO": return { titulo: "Este formulario ya no está disponible", texto: "Si quieres continuar, escríbenos por WhatsApp." };
    case "SIN_MIGRACION": return { titulo: "El formulario no está disponible por ahora", texto: "Intenta más tarde o sigue la plática por WhatsApp." };
    default: return { titulo: "No se pudo abrir el formulario", texto: "Revisa tu conexión e intenta de nuevo." };
  }
}
