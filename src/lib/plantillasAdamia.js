/** Catálogo público de formatos base. Nunca contiene datos de una empresa. */
export const ACUSE_POLITICAS = Object.freeze({
  codigo: "acuse-lectura-politicas",
  nombre: "Acuse de recepción y lectura de políticas",
  descripcion: "Identifica las políticas entregadas, su versión y el medio de consulta. Incluye constancia de lectura y reserva de derechos.",
  categoria: "RRHH",
  version: "1.0",
  revision: "2026-10-07",
  fuente: "https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf",
});

export const PLANTILLAS_ADAMIA = Object.freeze([ACUSE_POLITICAS]);

export function escapeDocumentText(value) {
  // Las llaves también se escapan: un campo libre no puede introducir variables.
  return String(value ?? "").replace(/[&<>"'{}]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    "{": "&#123;", "}": "&#125;",
  })[char]);
}

export function empresasDocumentales(user) {
  const ids = new Set((user?.empresas || []).map(String));
  if (user?.id_empresa) ids.add(String(user.id_empresa));
  return [...ids].filter((id) => /^\d+$/.test(id) && Number(id) > 0).map((id) => {
    const detalle = user?.empresas_detalle?.find((item) => String(item.id_empresa) === id);
    return { id, nombre: detalle?.nombre_empresa || detalle?.nombre || `Empresa ${id}` };
  });
}

function normalizar(datos) {
  return {
    lugar: String(datos.lugar || "").trim(),
    medio: String(datos.medio || "").trim(),
    contacto: String(datos.contacto || "").trim(),
    politicas: (datos.politicas || []).map((p) => ({
      nombre: String(p.nombre || "").trim(),
      version: String(p.version || "").trim(),
      referencia: String(p.referencia || "").trim(),
    })),
  };
}

export function validarAcusePoliticas(datos) {
  const d = normalizar(datos);
  if (!d.lugar) return "Indica el lugar o centro de trabajo.";
  if (!d.medio) return "Indica cómo se entregan las políticas.";
  if (!d.contacto) return "Indica el área y el medio de contacto para aclaraciones.";
  if (!d.politicas.length || d.politicas.length > 20) return "Agrega entre 1 y 20 políticas.";
  if (d.politicas.some((p) => !p.nombre || !p.version || !p.referencia)) {
    return "Completa el nombre, la versión o fecha de emisión y la referencia de cada política.";
  }
  if ([d.lugar, d.medio, d.contacto, ...d.politicas.flatMap(Object.values)].some((v) => v.length > 500)) {
    return "Cada campo admite hasta 500 caracteres.";
  }
  return "";
}

export function crearHtmlAcusePoliticas(datos) {
  const d = normalizar(datos);
  const texto = (value, pendiente) => escapeDocumentText(value || pendiente);
  const filas = (d.politicas.length ? d.politicas : [{}]).map((p, index) => `<tr>
    <td>${index + 1}</td><td>${texto(p.nombre, "Nombre de la política")}</td>
    <td>${texto(p.version, "Versión / fecha de emisión")}</td>
    <td>${texto(p.referencia, "Archivo, anexo o ubicación de consulta")}</td>
  </tr>`).join("");
  return `<!-- ADAMIA:acuse-lectura-politicas:1.0 -->
<div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.5;font-size:12px;">
  <p style="font-size:11px;color:#64748b;">{{empresa.nombre}}</p>
  <h1 style="font-size:21px;margin:0 0 12px;">Acuse de recepción y lectura de políticas</h1>
  <p><strong>Lugar:</strong> ${texto(d.lugar, "Lugar o centro de trabajo")}<br/><strong>Fecha de emisión:</strong> {{fecha.completa}}</p>
  <p><strong>Persona trabajadora:</strong> {{empleado.nombre}}<br/><strong>Código:</strong> {{empleado.codigo}}<br/><strong>Puesto:</strong> {{empleado.puesto}}<br/><strong>Departamento:</strong> {{empleado.departamento}}</p>
  <h2 style="font-size:14px;margin-top:20px;">1. Documentos identificados</h2>
  <p>El presente acuse se refiere exclusivamente a los documentos y versiones siguientes:</p>
  <table style="width:100%;border-collapse:collapse;font-size:11px;">
    <thead><tr><th>No.</th><th>Política o documento</th><th>Versión / emisión</th><th>Referencia para consulta</th></tr></thead>
    <tbody>${filas}</tbody>
  </table>
  <p style="margin-top:12px;"><strong>Medio de entrega:</strong> ${texto(d.medio, "Medio de entrega")}<br/><strong>Aclaraciones y observaciones:</strong> ${texto(d.contacto, "Área y contacto")}</p>
  <h2 style="font-size:14px;margin-top:20px;">2. Constancia de recepción y lectura</h2>
  <p>Al firmar este documento, hago constar que recibí o tuve acceso a una copia íntegra y consultable de los documentos arriba identificados, que los leí y que conozco el canal indicado para plantear dudas u observaciones y solicitar una copia. Si falta algún documento o no he concluido su lectura, solicitaré su entrega o aclaración antes de firmar.</p>
  <p>Me comprometo a observar las disposiciones aplicables a mis funciones en cuanto sean compatibles con la legislación laboral y mis condiciones de trabajo. La firma se refiere únicamente a las versiones identificadas; las actualizaciones deberán comunicarse por separado.</p>
  <h2 style="font-size:14px;margin-top:20px;">3. Alcance del acuse</h2>
  <p>Este acuse no implica renuncia a derechos laborales, autorización de descuentos ni aceptación de sanciones automáticas. Tampoco modifica por sí mismo las condiciones de trabajo ni valida disposiciones contrarias a la ley.</p>
  <p>Cuando alguno de los documentos sea un Reglamento Interior de Trabajo, este acuse no sustituye su formación, depósito, reparto y difusión conforme a los artículos 422 a 425 de la Ley Federal del Trabajo.</p>
  <div style="margin-top:32px;border-top:1px solid #94a3b8;padding-top:10px;">
    <p><strong>{{empleado.nombre}}</strong><br/>Firma de la persona trabajadora — recepción y lectura</p>
    <p style="font-size:11px;color:#64748b;">Firma autógrafa: ____________________ &nbsp; Fecha: ____________________<br/>Si se utiliza firma electrónica, se conserva la evidencia y fecha de la solicitud de firma asociada a este documento.</p>
  </div>
  <p style="font-size:10px;color:#64748b;margin-top:20px;">Referencia normativa: LFT, artículos 5, 33, 134 fracción I y 422 a 425. Formato base ADAMIA ${ACUSE_POLITICAS.version}; revisión ${ACUSE_POLITICAS.revision}. No es un formato oficial de la autoridad.</p>
</div>`;
}

export async function prepararPlantillaPoliticas(empresa, datos) {
  if (!/^\d+$/.test(String(empresa)) || Number(empresa) <= 0) throw new Error("Selecciona una empresa válida.");
  const error = validarAcusePoliticas(datos);
  if (error) throw new Error(error);
  const contenido_html = crearHtmlAcusePoliticas(datos);
  const bytes = new TextEncoder().encode(`${empresa}:${contenido_html}`);
  const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const codigo = `AD-POL-${Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16)}`;
  return {
    codigo,
    nombre: ACUSE_POLITICAS.nombre,
    descripcion: `Acuse de las políticas identificadas para ${normalizar(datos).lugar}. Base ADAMIA ${ACUSE_POLITICAS.version}.`,
    categoria: ACUSE_POLITICAS.categoria,
    variables: [...new Set([...contenido_html.matchAll(/\{\{([^}]+)\}\}/g)].map((m) => m[1]))].join(", "),
    contenido_html,
  };
}

/** Reutiliza solo una copia idéntica, nunca sobrescribe una personalización. */
export async function guardarCopiaPlantilla(api, empresa, payload) {
  const buscar = async () => {
    const respuesta = await api.listar({ empresa, search: payload.codigo });
    const filas = Array.isArray(respuesta) ? respuesta : respuesta?.data || [];
    const encontrada = filas.find((p) => p.codigo === payload.codigo);
    if (!encontrada) return null;
    const completa = await api.getById(encontrada.id_plantilla);
    if (completa.id_empresa != null && String(completa.id_empresa) !== String(empresa)) {
      throw new Error("La plantilla no pertenece a la empresa seleccionada.");
    }
    if (completa.contenido_html !== payload.contenido_html || [0, "0", false].includes(completa.activo)) {
      throw new Error("Ya existe una copia modificada o inactiva. Revísala en Mis plantillas antes de continuar.");
    }
    return { ...completa, id_plantilla: encontrada.id_plantilla };
  };
  const existente = await buscar();
  if (existente) return existente;
  try {
    await api.crear({ empresa }, payload);
  } catch (error) {
    // Un timeout o conflicto puede ocurrir después de guardar. Consultar antes de repetir.
    const recuperada = await buscar();
    if (recuperada) return recuperada;
    throw error;
  }
  const guardada = await buscar();
  if (!guardada) throw new Error("No se pudo confirmar la copia guardada. Revisa Mis plantillas antes de volver a intentar.");
  return guardada;
}

// Compatibilidad con el formulario de acuse existente.
export const guardarCopiaPoliticas = guardarCopiaPlantilla;
