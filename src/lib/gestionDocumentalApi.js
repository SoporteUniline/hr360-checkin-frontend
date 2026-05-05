import axios from "@/lib/axios";
import Cookies from "js-cookie";

/**
 * Cliente API: Gestión Documental
 * - Plantillas: /checador/gestion-documental/plantillas
 * - Documentos generados: /checador/gestion-documental/documentos
 */
function authHeaders() {
  const token = Cookies.get("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function sanitizeTemplateHtml(raw) {
  let html = String(raw || "").trim();
  if (!html) return "";

  // Si llega en bloque markdown ```html ... ```
  const fenced = html.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    html = fenced[1].trim();
  }

  // Si viene documento completo, extrae solo el body
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch?.[1]) {
    html = bodyMatch[1].trim();
  }

  return html;
}

function buildTemplateFallback() {
  return [
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.55;">',
    '  <div style="border-bottom:3px solid #2563EB;padding-bottom:10px;margin-bottom:20px;">',
    '    <h1 style="margin:0;font-size:24px;color:#2563EB;">Constancia Laboral</h1>',
    '    <p style="margin:6px 0 0 0;color:#6b7280;font-size:13px;">{{empresa.nombre}} · {{fecha.completa}}</p>',
    "  </div>",
    '  <p>Por medio de la presente se hace constar que <strong>{{empleado.nombre}}</strong>, con código <strong>{{empleado.codigo}}</strong>, labora en <strong>{{empresa.nombre}}</strong> en el puesto de <strong>{{empleado.puesto}}</strong>, dentro del área de <strong>{{empleado.departamento}}</strong>.</p>',
    '  <p>Su fecha de ingreso es <strong>{{empleado.fecha_ingreso}}</strong> y percibe un salario de <strong>{{empleado.salario}}</strong>.</p>',
    '  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin:16px 0;">',
    '    <p style="margin:0 0 8px 0;font-weight:700;color:#1f2937;">Datos del empleado</p>',
    '    <p style="margin:4px 0;"><strong>RFC:</strong> {{empleado.rfc}}</p>',
    '    <p style="margin:4px 0;"><strong>CURP:</strong> {{empleado.curp}}</p>',
    '    <p style="margin:4px 0;"><strong>Correo:</strong> {{empleado.email}}</p>',
    "  </div>",
    '  <p>Se expide la presente a petición del interesado para los fines que estime convenientes.</p>',
    '  <div style="display:flex;gap:24px;margin-top:38px;">',
    '    <div style="flex:1;text-align:center;">',
    '      <div style="border-top:1px solid #9ca3af;padding-top:8px;font-size:12px;color:#6b7280;">{{empresa.representante}}<br/>Representante de la empresa</div>',
    "    </div>",
    '    <div style="flex:1;text-align:center;">',
    '      <div style="border-top:1px solid #9ca3af;padding-top:8px;font-size:12px;color:#6b7280;">{{empleado.nombre}}<br/>Empleado</div>',
    "    </div>",
    "  </div>",
    "</div>",
  ].join("");
}

function hasRenderableContent(html) {
  const normalized = String(html || "").trim().toLowerCase();
  if (!normalized) return false;

  // Quitar bloques style/script para validar contenido visible real
  const withoutNonVisual = normalized
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();

  // Debe tener al menos una etiqueta de contenido y texto útil
  const hasContentTag = /<(div|p|h1|h2|h3|table|ul|ol|section|article)\b/i.test(
    withoutNonVisual,
  );
  const textOnly = withoutNonVisual.replace(/<[^>]+>/g, "").trim();

  return hasContentTag && textOnly.length >= 40;
}

function hasNarrativeParagraphs(html) {
  const source = String(html || "");
  if (!source.trim()) return false;

  // Elimina placeholders para verificar que exista redacción real
  const withoutPlaceholders = source.replace(/\{\{[^}]+\}\}/g, " ");
  const withoutStyles = withoutPlaceholders
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");

  const paragraphBlocks = withoutStyles.match(/<(p|li|td|h1|h2|h3)\b[^>]*>([\s\S]*?)<\/\1>/gi) || [];
  const joinedText = paragraphBlocks
    .map((block) => block.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ")
    .trim();

  // Exige texto narrativo mínimo para evitar plantillas “solo variables”
  return paragraphBlocks.length >= 3 && joinedText.length >= 140;
}

const VARIABLE_ALIASES = {
  "empleado.nombre_completo": "empleado.nombre",
  "empleado.fecha_ingreso_formato": "empleado.fecha_ingreso",
};

/**
 * Conjunto único de variables válidas: las que el sistema sabe resolver
 * con datos reales de la BD. Cualquier {{variable}} fuera de aquí se elimina
 * del HTML para evitar placeholders rotos en el documento final.
 */
const VARIABLES_PERMITIDAS = new Set([
  "empleado.nombre", "empleado.codigo", "empleado.puesto",
  "empleado.departamento", "empleado.fecha_ingreso", "empleado.salario",
  "empleado.rfc", "empleado.curp", "empleado.email", "empleado.telefono",
  "empresa.nombre", "empresa.representante",
  "fecha.dia", "fecha.mes", "fecha.anio", "fecha.completa",
]);

function normalizeVariables(html) {
  let normalized = String(html || "");
  Object.entries(VARIABLE_ALIASES).forEach(([from, to]) => {
    const safeFrom = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    normalized = normalized.replace(
      new RegExp(`\\{\\{\\s*${safeFrom}\\s*\\}\\}`, "gi"),
      `{{${to}}}`,
    );
  });
  return normalized;
}

/**
 * Limpia el HTML eliminando líneas/etiquetas que contienen variables NO permitidas
 * para que el documento final no muestre placeholders sin resolver.
 *
 * Estrategia:
 *  1. Quita <p>, <li>, <tr>, <td>, <h1-6> completos cuya ÚNICA variable sea inválida.
 *  2. Si un bloque tiene variables válidas e inválidas mezcladas, solo elimina la variable inválida (incluyendo el label "RFC: " si aparece pegado).
 */
function eliminarVariablesNoPermitidas(html) {
  let cleaned = String(html || "");
  if (!cleaned) return cleaned;

  // 1) Eliminar bloques completos cuya única variable es inválida.
  //    Cubre <p>, <li>, <tr>, <td>, <h1-6>, <div> con un solo {{}}.
  const bloqueRegex = /<(p|li|tr|td|h[1-6]|div)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  cleaned = cleaned.replace(bloqueRegex, (match, _tag, contenido) => {
    const matches = [...contenido.matchAll(/\{\{([^}]+)\}\}/g)];
    if (matches.length === 0) return match;
    const todasInvalidas = matches.every(
      (m) => !VARIABLES_PERMITIDAS.has(m[1].trim()),
    );
    if (todasInvalidas) return "";
    return match;
  });

  // 2) Para los casos restantes (bloques mixtos), eliminar SOLO la variable inválida
  //    y un posible label común antes de ella ("RFC:", "Ciudad:", "Domicilio:" etc.).
  cleaned = cleaned.replace(
    /(?:[A-ZÁÉÍÓÚÑa-záéíóúñ ]{2,20}:\s*)?\{\{([^}]+)\}\}/g,
    (match, key) => (VARIABLES_PERMITIDAS.has(key.trim()) ? match : ""),
  );

  // 3) Limpieza cosmética: párrafos vacíos que quedaron tras la limpieza
  cleaned = cleaned
    .replace(/<(p|li|tr|td|h[1-6]|div)\b[^>]*>\s*<\/\1>/gi, "")
    .replace(/(\s*<br\s*\/?>\s*){2,}/gi, "<br/>");

  return cleaned;
}

function hasCompleteDocumentStructure(html) {
  const source = String(html || "");
  if (!source.trim()) return false;
  const text = source.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const hasHeader =
    /constancia|carta|documento|certifica|a quien corresponda/i.test(text);
  const hasEmployeeData =
    /\{\{empleado\.nombre\}\}|\{\{empleado\.puesto\}\}|\{\{empleado\.fecha_ingreso\}\}/i.test(
      source,
    );
  const hasCompanyData =
    /\{\{empresa\.nombre\}\}|\{\{empresa\.representante\}\}/i.test(source);
  const hasClosing =
    /sin mas|sin más|se expide|se extiende|para los fines|atentamente|quedamos/i.test(
      text,
    );
  const hasSignatureBlock =
    /firma|representante|colaborador|empleado/i.test(text);

  return (
    text.length >= 380 &&
    hasHeader &&
    hasEmployeeData &&
    hasCompanyData &&
    hasClosing &&
    hasSignatureBlock
  );
}

export const plantillasApi = {
  async listar(params = {}) {
    const res = await axios.get("/checador/gestion-documental/plantillas", {
      params,
      headers: authHeaders(),
    });
    return res.data;
  },
  async getById(id) {
    const res = await axios.get(`/checador/gestion-documental/plantillas/${id}`, {
      headers: authHeaders(),
    });
    return res.data;
  },
  async crear(params, payload) {
    const res = await axios.post("/checador/gestion-documental/plantillas", payload, {
      params,
      headers: authHeaders(),
    });
    return res.data;
  },
  async actualizar(id, payload) {
    const res = await axios.put(`/checador/gestion-documental/plantillas/${id}`, payload, {
      headers: authHeaders(),
    });
    return res.data;
  },
  async eliminar(id) {
    const res = await axios.delete(`/checador/gestion-documental/plantillas/${id}`, {
      headers: authHeaders(),
    });
    return res.data;
  },
  async toggle(id, activo) {
    const res = await axios.patch(
      `/checador/gestion-documental/plantillas/${id}/toggle`,
      { activo },
      { headers: authHeaders() },
    );
    return res.data;
  },
};

export const iaApi = {
  async generarPlantilla(payload) {
    const descripcion = String(payload?.descripcion || "").trim();
    const categoria = String(payload?.categoria || "Laboral").trim();
    const nombre = String(payload?.nombre || "Documento").trim();

    const prompt = [
      `Genera una plantilla de documento tipo "${categoria}" llamada "${nombre}".`,
      `Necesidad: ${descripcion}`,
      "Entregame una plantilla completa visualmente profesional.",
      "Incluye encabezado, bloques de contenido, tabla o lista si aplica, y bloque de firmas.",
      "Usa estilo empresarial limpio. El documento debe ser completamente blanco: NO uses background-color, background ni fondos de color en ningún elemento.",
      "Usa variables dinamicas con doble llave cuando aplique.",
      "CATALOGO ESTRICTO de variables (USAR SOLO ESTAS, ninguna otra):",
      "{{empleado.nombre}}, {{empleado.codigo}}, {{empleado.puesto}}, {{empleado.departamento}}, {{empleado.fecha_ingreso}}, {{empleado.salario}}, {{empleado.email}}, {{empleado.telefono}}, {{empleado.rfc}}, {{empleado.curp}}, {{empresa.nombre}}, {{empresa.representante}}, {{fecha.dia}}, {{fecha.mes}}, {{fecha.anio}}, {{fecha.completa}}.",
      "PROHIBIDO: NO uses {{empresa.rfc}}, {{empresa.ciudad}}, {{empresa.domicilio}}, {{empresa.direccion}}, {{empresa.telefono}}, {{empresa.email}} ni ninguna otra que no este en el catalogo. Esos datos NO existen en la base de datos.",
      "Si necesitas mostrar datos de la empresa, limitate a {{empresa.nombre}} y {{empresa.representante}}.",
      "No expliques nada: responde solo con HTML listo para pegar.",
    ].join("\n");

    const requestIa = async (message) => {
      const response = await fetch("/api/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: [],
          context: "template",
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.message) {
        throw new Error(data?.message || "No se pudo generar la plantilla con IA.");
      }
      return sanitizeTemplateHtml(data.message || "");
    };

    // Pipeline: sanitizeTemplateHtml -> normalizeVariables (aliases) -> eliminarVariablesNoPermitidas (filtro estricto)
    const procesar = (raw) =>
      eliminarVariablesNoPermitidas(normalizeVariables(raw));

    // Primer intento normal
    let html = procesar(await requestIa(prompt));

    // Reintento si llega incompleto o sin contenido visible/narrativo
    if (
      !hasRenderableContent(html) ||
      !hasNarrativeParagraphs(html) ||
      !hasCompleteDocumentStructure(html)
    ) {
      const retryPrompt = [
        prompt,
        "",
        "IMPORTANTE: Tu respuesta anterior quedo incompleta.",
        "Devuelve una plantilla COMPLETA, con contenido visible (no solo <style>).",
        "Incluye texto real en parrafos (minimo 4 parrafos de redaccion profesional) y bloque de firmas.",
        "No devuelvas solo placeholders.",
        "Asegura cierre formal y nombres de firma.",
      ].join("\n");
      html = procesar(await requestIa(retryPrompt));
    }

    // Segundo reintento fuerte cuando viene muy corta o cortada
    if (
      !hasRenderableContent(html) ||
      !hasNarrativeParagraphs(html) ||
      !hasCompleteDocumentStructure(html)
    ) {
      const retryPrompt2 = [
        prompt,
        "",
        "REINTENTO FINAL OBLIGATORIO:",
        "Tu salida debe ser una carta laboral completa, NO resumen.",
        "Incluye: encabezado de empresa, fecha, destinatario, cuerpo principal, datos del empleado, clausula de finalidad, despedida formal y dos lineas de firma.",
        "No termines frases con ':' sin completar contenido.",
        "No uses variables fuera del catalogo permitido (recuerda: NADA de empresa.rfc, empresa.ciudad ni empresa.domicilio).",
      ].join("\n");
      html = procesar(await requestIa(retryPrompt2));
    }

    // Fallback final garantizado (también pasa por el sanitizador por seguridad)
    if (
      !hasRenderableContent(html) ||
      !hasNarrativeParagraphs(html) ||
      !hasCompleteDocumentStructure(html)
    ) {
      html = eliminarVariablesNoPermitidas(buildTemplateFallback());
    }

    const variablesUsadas = [
      ...new Set([...html.matchAll(/\{\{([^}]+)\}\}/g)].map((m) => m[1].trim())),
    ];

    return { html, variables: variablesUsadas.join(", ") };
  },
};

export const docGeneradosApi = {
  async listar(params = {}) {
    const res = await axios.get("/checador/gestion-documental/documentos", {
      params,
      headers: authHeaders(),
    });
    return res.data;
  },
  async getById(id) {
    const res = await axios.get(`/checador/gestion-documental/documentos/${id}`, {
      headers: authHeaders(),
    });
    return res.data;
  },
  async crear(params, payload) {
    const res = await axios.post("/checador/gestion-documental/documentos", payload, {
      params,
      headers: authHeaders(),
    });
    return res.data;
  },
  async actualizarEstatus(id, estatus) {
    const res = await axios.patch(
      `/checador/gestion-documental/documentos/${id}/estatus`,
      { estatus },
      { headers: authHeaders() },
    );
    return res.data;
  },
  async eliminar(id) {
    const res = await axios.delete(`/checador/gestion-documental/documentos/${id}`, {
      headers: authHeaders(),
    });
    return res.data;
  },
};
