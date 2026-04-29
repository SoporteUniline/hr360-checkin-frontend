import { NextResponse } from "next/server";

const SALES_KNOWLEDGE_BASE = `
ADAMIA es un sistema de Recursos Humanos en la nube.
Contacto comercial: soporte@adamia.mx y WhatsApp +52 317 388 7959.
Funciones clave: reloj checador facial + GPS, gestion de empleados, asistencias, vacaciones y permisos, reportes, contratos digitales, actas, notificaciones y portal web empresarial.
Planes: mensual (0%), semestral (10% off), anual (20% off).
Prueba: 7 dias gratis.
Enlaces: contratar https://planes.hr360.mx/contratar-plan y cotizar https://planes.hr360.mx/cotiza.
`;

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function isGreeting(text) {
  const t = normalizeText(text);
  if (!t) return false;
  return /^(hola|holi|hello|buenas|buen dia|buen día|que tal|qué tal|hey|hi)\b/.test(t);
}

function isPureGreeting(text) {
  const t = normalizeText(text);
  if (!t) return false;
  return /^(hola|holi|hello|buenas|buen dia|buen día|que tal|qué tal|hey|hi|buenas tardes|buenos dias|buenos días|buenas noches)[!. ]*$/.test(
    t
  );
}

function hasConversationHistory(history = []) {
  const valid = history.filter((item) => item && String(item.text || "").trim());
  return valid.length > 1;
}

function getSystemPrompt(context) {
  if (context === "template") {
    return [
      "Eres un experto en recursos humanos y redaccion de documentos laborales en Mexico.",
      "Genera una plantilla visual completa en HTML para ADAMIA.",
      "Responde unicamente con HTML del cuerpo del documento (sin markdown, sin html/head/body).",
      "CATALOGO ESTRICTO de variables permitidas (USA SOLO ESTAS, ninguna otra):",
      "{{empleado.nombre}}, {{empleado.codigo}}, {{empleado.puesto}}, {{empleado.departamento}}, {{empleado.fecha_ingreso}}, {{empleado.salario}}, {{empleado.email}}, {{empleado.telefono}}, {{empleado.rfc}}, {{empleado.curp}}, {{empresa.nombre}}, {{empresa.representante}}, {{fecha.dia}}, {{fecha.mes}}, {{fecha.anio}}, {{fecha.completa}}.",
      "PROHIBIDO: NO uses {{empresa.rfc}}, {{empresa.ciudad}}, {{empresa.domicilio}}, {{empresa.direccion}}, {{empresa.telefono}}, {{empresa.email}} ni otras: esos datos NO existen en la base.",
      "Si necesitas datos de la empresa, limitate a {{empresa.nombre}} y {{empresa.representante}}.",
      "Incluye estructura completa: encabezado, subtitulo, bloques de contenido, lista o tabla si aporta valor y bloque de firmas.",
      "Incluye estilos inline o en <style> dentro del contenido para que se vea profesional en WYSIWYG.",
      "Usa paleta ADAMIA: #2563EB (azul), #7C3AED (morado), grises neutros elegantes.",
      "Mantente profesional, claro y listo para usar sin ediciones manuales.",
      "Permite etiquetas: h1, h2, h3, p, strong, em, ul, ol, li, hr, br, table, thead, tbody, tr, th, td.",
      "No agregues bloques markdown ni explicaciones fuera del HTML.",
    ].join(" ");
  }

  if (context === "privacy") {
    return [
      "Eres el asistente de privacidad de ADAMIA.",
      "Responde en espanol claro y profesional.",
      "Enfocate en: datos personales, derechos ARCO, seguridad, politicas y contacto.",
      "No inventes datos legales; si no tienes certeza, indicalo y sugiere contacto a privacidad@adamia.mx.",
      "Si el usuario solo saluda, responde con un saludo breve y pregunta en que tema de privacidad necesita ayuda.",
      "No envies de inmediato al correo en el primer saludo; primero intenta ayudar.",
      "Mantente breve (maximo 6-8 lineas).",
    ].join(" ");
  }

  return [
    "Eres el asistente comercial de ADAMIA, amigable y natural.",
    "Responde en espanol claro y persuasivo, sin exagerar ni inventar informacion.",
    "Usa esta base para responder: " + SALES_KNOWLEDGE_BASE,
    "Enfocate en funcionalidades, cotizacion, contratacion, beneficios y siguiente paso.",
    "Flujo sugerido: si pide cotizar, pregunta empleados; si ya hay empleados, guia a /cotiza.",
    "Invita a continuar con /cotiza o /contratar-plan cuando aplique.",
    "Si no tienes un dato exacto, dilo y ofrece siguiente paso.",
    "Mantente breve (maximo 6-8 lineas).",
  ].join(" ");
}

function mapHistoryToGeminiContents(history = []) {
  return history
    .filter((item) => item && typeof item.text === "string" && item.text.trim())
    .slice(-10)
    .map((item) => ({
      role: item.role === "assistant" || item.role === "bot" ? "model" : "user",
      parts: [{ text: item.text.trim() }],
    }));
}

function extractEmployees(text) {
  const message = String(text || "");
  const sumMatch = message.match(
    /(\d+)\s+(?:en|de)\s+(?:calle|campo|ruta|exterior|afuera).*?(?:y|mas|más|\+)\s*(\d+)\s+(?:en|de)\s+(?:oficina|admin|administracion|administración|interior|dentro)/i
  );
  if (sumMatch) {
    return Number.parseInt(sumMatch[1], 10) + Number.parseInt(sumMatch[2], 10);
  }

  const plusMe = message.match(/(\d+)\s*(?:y\s*yo|más\s*yo|incluyéndome|me\s*incluyo)/i);
  if (plusMe) {
    return Number.parseInt(plusMe[1], 10) + 1;
  }

  const totalMatch = message.match(/(\d+)\s+(?:en\s+)?total/i);
  if (totalMatch) {
    return Number.parseInt(totalMatch[1], 10);
  }

  const patterns = [
    /(\d+)\s*(empleado|usuario|persona|trabajador|colaborador|gente)/i,
    /tengo\s+(\d+)/i,
    /tenemos\s+(\d+)/i,
    /somos\s+(\d+)/i,
    /son\s+(\d+)/i,
    /^(\d+)$/,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return Number.parseInt(match[1], 10);
    }
  }

  return null;
}

function extractName(text) {
  const raw = String(text || "").trim();
  if (!raw || raw.length > 50) return null;
  if (/\d/.test(raw)) return null;

  const blockedNames = new Set([
    "hola",
    "holi",
    "buenas",
    "hello",
    "gracias",
    "adios",
    "adiós",
    "ok",
    "vale",
    "listo",
    "perfecto",
  ]);

  const normalizeCandidate = (candidate) =>
    String(candidate || "")
      .replace(/[.,;:!?¡¿]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const cleanCandidate = (candidate) => {
    const normalized = normalizeCandidate(candidate);
    if (!normalized) return null;
    const lower = normalizeText(normalized);
    const firstChunk = normalized.split(/\s+(?:y|pero|porque|para)\s+/i)[0]?.trim() || normalized;
    const firstChunkLower = normalizeText(firstChunk);
    if (!firstChunk || blockedNames.has(firstChunkLower)) return null;
    if (!/^[a-záéíóúñ]+(?:\s+[a-záéíóúñ]+){0,2}$/i.test(firstChunk)) return null;
    return firstChunk;
  };

  // Detecta nombre aunque venga con saludo o con mas contexto.
  const explicit = raw.match(/(?:^|\b)(?:me llamo|soy|mi nombre es)\s+([a-záéíóúñ\s]{2,50})/i);
  if (explicit?.[1]) {
    const explicitName = cleanCandidate(explicit[1]);
    if (explicitName) return explicitName;
  }

  const actionWords = [
    "quiero",
    "necesito",
    "busco",
    "cotizar",
    "contratar",
    "ayuda",
    "cuanto",
    "cuánto",
    "precio",
    "plan",
    "funcion",
  ];
  if (actionWords.some((word) => normalizeText(raw).includes(word))) return null;
  if (blockedNames.has(normalizeText(raw))) return null;

  const plainNameMatch = raw.match(/^([a-záéíóúñ]{2,}(?:\s+[a-záéíóúñ]+){0,2})$/i);
  if (plainNameMatch?.[1]) {
    const plainName = cleanCandidate(plainNameMatch[1]);
    if (plainName) return plainName;
  }

  return null;
}

function getConversationContext(history = []) {
  let empleados = null;
  let nombre = null;

  const userMessages = history.filter(
    (item) => item && item.role === "user" && typeof item.text === "string"
  );
  for (const item of userMessages) {
    const maybeEmployees = extractEmployees(item.text);
    if (Number.isInteger(maybeEmployees) && maybeEmployees > 0) empleados = maybeEmployees;
    const maybeName = extractName(item.text);
    if (maybeName) nombre = maybeName;
  }

  return { empleados, nombre };
}

function isQuoteIntent(text) {
  const t = normalizeText(text);
  return (
    t.includes("cotiz") ||
    t.includes("precio") ||
    t.includes("costo") ||
    t.includes("cuanto") ||
    t.includes("cuánto") ||
    t.includes("plan")
  );
}

function isEmployeeOnlyIntent(text) {
  const t = normalizeText(text);
  if (!t) return false;
  return (
    /^(\d{1,6})$/.test(t) ||
    /^(tenemos|tengo|somos|son)\s+\d{1,6}(\s+empleados?)?$/.test(t) ||
    /^\d{1,6}\s+empleados?$/.test(t)
  );
}

function isCreativeOrGeneralIntent(text) {
  const t = normalizeText(text);
  return (
    t.includes("acrostico") ||
    t.includes("acróstico") ||
    t.includes("recomendacion") ||
    t.includes("recomendación") ||
    t.includes("estrategia") ||
    t.includes("ideas") ||
    t.includes("resumen") ||
    t.includes("explicame") ||
    t.includes("explícame")
  );
}

function getSalesFAQReply(text) {
  const t = normalizeText(text);

  if (/que es adamia|qué es adamia|quien es adamia|quién es adamia|de que trata adamia|de qué trata adamia/.test(t)) {
    return [
      "ADAMIA es una plataforma web de Recursos Humanos para empresas.",
      "Te ayuda a controlar asistencias, gestionar empleados, vacaciones, contratos y reportes en un solo lugar.",
      "Tambien incluye reloj checador facial + GPS y notificaciones.",
      "Si quieres, te explico los modulos o te cotizo segun tu numero de empleados.",
    ].join("\n");
  }

  if (/que incluye|qué incluye|funcion|modulo|m[oó]dulo|que hace|qué hace|ofrece/.test(t)) {
    return [
      "ADAMIA incluye:",
      "• Reloj checador facial + GPS",
      "• Gestion de empleados y expedientes",
      "• Asistencias, vacaciones y permisos",
      "• Contratos digitales y reportes",
      "• Notificaciones y portal web empresarial",
      "Si quieres, te cotizo segun tus empleados.",
    ].join("\n");
  }

  if (/precio|costo|cuanto vale|cuánto vale|planes/.test(t)) {
    return [
      "Manejamos 3 esquemas:",
      "• Mensual (0% descuento)",
      "• Semestral (10% OFF)",
      "• Anual (20% OFF)",
      "Te comparto una cotizacion exacta si me dices cuantas personas tienes.",
    ].join("\n");
  }

  if (/implementaci[oó]n|arranque|capacitaci[oó]n|acompa[ñn]amiento/.test(t)) {
    return "Si, ADAMIA incluye acompanamiento de implementacion para que el arranque sea rapido y ordenado.";
  }

  if (/soporte|ayuda|atencion|atenci[oó]n|contacto|whatsapp/.test(t)) {
    return "Claro. Te atendemos en soporte@adamia.mx y WhatsApp +52 317 388 7959.";
  }

  if (/seguridad|datos|privacidad|protecci[oó]n/.test(t)) {
    return "ADAMIA aplica buenas practicas de seguridad y control de acceso para proteger la informacion. Si quieres un detalle de privacidad, te lo explico.";
  }

  return null;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function buildQuote(empleados) {
  const empleadosNum = Math.max(1, Math.min(500000, Number(empleados || 1)));
  const base = 39;
  const factor = Math.max(0.55, 1 - Math.log10(Math.max(1, empleadosNum)) / 6);
  const mensual = Math.round(empleadosNum * base * factor);
  const total6 = Math.round(mensual * 6 * 0.9);
  const total12 = Math.round(mensual * 12 * 0.8);
  const semestralMes = Math.round(total6 / 6);
  const anualMes = Math.round(total12 / 12);
  const ahorro6 = mensual * 6 - total6;
  const ahorro12 = mensual * 12 - total12;

  return {
    empleados: empleadosNum,
    mensualMes: mensual,
    mensualTotal: mensual,
    semestralMes,
    semestralTotal: total6,
    anualMes,
    anualTotal: total12,
    ahorro6,
    ahorro12,
  };
}

function buildQuoteResponse({ empleados, nombre }) {
  const q = buildQuote(empleados);
  const salutation = nombre ? `${nombre}, aqui esta tu referencia para ${q.empleados} empleados:` : `Aqui tienes una referencia para ${q.empleados} empleados:`;

  return [
    salutation,
    `• Mensual: ${formatCurrency(q.mensualMes)}/mes`,
    `• Semestral (10% OFF): ${formatCurrency(q.semestralMes)}/mes (total ${formatCurrency(q.semestralTotal)}, ahorras ${formatCurrency(q.ahorro6)})`,
    `• Anual (20% OFF): ${formatCurrency(q.anualMes)}/mes (total ${formatCurrency(q.anualTotal)}, ahorras ${formatCurrency(q.ahorro12)})`,
    "Incluye reloj checador facial + GPS, asistencias, vacaciones, contratos y reportes.",
    "Cotiza formalmente en https://planes.hr360.mx/cotiza o contrata en https://planes.hr360.mx/contratar-plan.",
  ].join("\n");
}

function buildSalesOfflineReply(message) {
  const t = normalizeText(message);

  if (t.includes("acrostico") || t.includes("acróstico")) {
    return [
      "Claro, aqui tienes un acrostico de ADAMIA enfocado en RRHH:",
      "A - Automatiza procesos de personas.",
      "D - Digitaliza asistencias y expedientes.",
      "A - Ahorra tiempo operativo en RRHH.",
      "M - Mide indicadores en tiempo real.",
      "I - Integra control, orden y trazabilidad.",
      "A - Acompana el crecimiento de tu empresa.",
      "",
      "3 recomendaciones para una empresa de logistica (87 empleados):",
      "1) Estandariza turnos y reglas de asistencia por centro operativo.",
      "2) Activa alertas de incidencias para supervisores por ruta/turno.",
      "3) Usa reportes semanales de puntualidad y ausentismo para decisiones rapidas.",
    ].join("\n");
  }

  return "En este momento no pude conectar con Gemini, pero sigo activo para ayudarte con ADAMIA. Si quieres, te explico funciones o te cotizo por numero de empleados.";
}

function buildTemplateOfflineReply() {
  return [
    '<style>',
    '  .adamia-doc{font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.5;}',
    '  .adamia-header{border-bottom:3px solid #2563EB;padding-bottom:10px;margin-bottom:20px;}',
    '  .adamia-title{margin:0;font-size:24px;color:#2563EB;font-weight:700;}',
    '  .adamia-subtitle{margin:6px 0 0 0;font-size:13px;color:#6b7280;}',
    '  .adamia-card{border:1px solid #e5e7eb;border-left:4px solid #7C3AED;border-radius:8px;padding:14px;margin:14px 0;background:#fafafa;}',
    '  .adamia-signatures{margin-top:34px;display:flex;justify-content:space-between;gap:20px;}',
    '  .adamia-signatures div{flex:1;text-align:center;}',
    '  .adamia-line{border-top:1px solid #9ca3af;margin-top:48px;padding-top:8px;font-size:12px;color:#6b7280;}',
    '</style>',
    '<div class="adamia-doc">',
    '  <div class="adamia-header">',
    '    <h1 class="adamia-title">Constancia Laboral</h1>',
    '    <p class="adamia-subtitle">Emitida por {{empresa.nombre}} el {{fecha.completa}}</p>',
    "  </div>",
    '  <p>Por medio de la presente, se hace constar que <strong>{{empleado.nombre}}</strong>, con código interno <strong>{{empleado.codigo}}</strong>, labora en <strong>{{empresa.nombre}}</strong> desempeñando el puesto de <strong>{{empleado.puesto}}</strong> dentro del área de <strong>{{empleado.departamento}}</strong>, desde la fecha <strong>{{empleado.fecha_ingreso}}</strong>.</p>',
    '  <div class="adamia-card">',
    '    <h3 style="margin:0 0 8px 0;color:#7C3AED;">Datos relevantes</h3>',
    '    <ul style="margin:0;padding-left:20px;">',
    '      <li>Empresa: {{empresa.nombre}}</li>',
    '      <li>RFC empleado: {{empleado.rfc}}</li>',
    '      <li>CURP empleado: {{empleado.curp}}</li>',
    '      <li>Salario mensual: {{empleado.salario}}</li>',
    '    </ul>',
    "  </div>",
    '  <p>La presente constancia se expide a solicitud de la parte interesada para los fines legales y administrativos que a su derecho convengan.</p>',
    '  <p>Sin más por el momento, quedamos a sus órdenes.</p>',
    '  <div class="adamia-signatures">',
    '    <div><div class="adamia-line">{{empresa.representante}}<br/>Representante de la empresa</div></div>',
    '    <div><div class="adamia-line">{{empleado.nombre}}<br/>Colaborador</div></div>',
    "  </div>",
    "</div>",
  ].join("");
}

function sanitizeTemplateHtml(raw) {
  const text = String(raw || "").trim();
  if (!text) return "";
  // Si Gemini responde con bloque markdown, extrae el contenido interno.
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  return text;
}

async function getGeminiModelCandidates(apiKey) {
  const preferred = process.env.GEMINI_MODEL?.trim();
  const defaults = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
  ];
  const priority = preferred ? [preferred, ...defaults] : defaults;

  try {
    const listEndpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(listEndpoint, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`ListModels fallo: ${response.status} ${JSON.stringify(data)}`);
    }

    const available = (data?.models || [])
      .filter((m) => Array.isArray(m?.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"))
      .map((m) => String(m?.name || "").replace(/^models\//, "").trim())
      .filter(Boolean);

    if (!available.length) {
      return [...new Set(priority)];
    }

    // Primero modelos prioritarios disponibles, luego el resto.
    const ordered = [
      ...priority.filter((p) => available.includes(p)),
      ...available.filter((a) => !priority.includes(a)),
    ];
    return [...new Set(ordered)];
  } catch (error) {
    console.error(error?.message || error);
    return [...new Set(priority)];
  }
}

async function requestGemini({ apiKey, model, systemPrompt, contents }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 500,
      },
    }),
    cache: "no-store",
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Gemini ${model} fallo: ${response.status} ${JSON.stringify(data)}`);
  }

  const answer =
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || "")
      .join("\n")
      .trim() || "";

  if (!answer) {
    throw new Error(`Gemini ${model} respondio sin contenido.`);
  }

  return answer;
}

export async function POST(req) {
  try {
    const { message, history = [], context = "sales" } = await req.json();
    const cleanMessage = String(message || "").trim();
    if (!cleanMessage) {
      return NextResponse.json({ message: "Mensaje vacio." }, { status: 400 });
    }

    let creativeIntent = false;
    if (context === "sales") {
      const faqReply = getSalesFAQReply(cleanMessage);
      if (faqReply) {
        return NextResponse.json({ message: faqReply });
      }

      const baseCtx = getConversationContext(history);
      const currentEmployees = extractEmployees(cleanMessage);
      const currentName = extractName(cleanMessage);
      const empleadosFinal = currentEmployees || baseCtx.empleados;
      const nombreFinal = currentName || baseCtx.nombre;
      const wantsQuote = isQuoteIntent(cleanMessage);
      const employeeOnlyIntent = isEmployeeOnlyIntent(cleanMessage);
      creativeIntent = isCreativeOrGeneralIntent(cleanMessage);

      if (
        empleadosFinal &&
        nombreFinal &&
        (wantsQuote || employeeOnlyIntent || currentEmployees || currentName) &&
        !creativeIntent
      ) {
        return NextResponse.json({
          message: buildQuoteResponse({
            empleados: empleadosFinal,
            nombre: nombreFinal,
          }),
        });
      }

      if (empleadosFinal && !nombreFinal && (wantsQuote || employeeOnlyIntent) && !creativeIntent) {
        return NextResponse.json({
          message: `Perfecto, para ${empleadosFinal} empleados. ¿Me compartes tu nombre para personalizar la cotizacion?`,
        });
      }

      if ((wantsQuote || employeeOnlyIntent) && !empleadosFinal && !creativeIntent) {
        return NextResponse.json({
          message: "Claro. ¿Para cuantos empleados necesitas ADAMIA?",
        });
      }
    }

    // Primera impresion: saludo solo cuando realmente es un saludo corto.
    if (isPureGreeting(cleanMessage) && !hasConversationHistory(history)) {
      const greetingMessage =
        context === "privacy"
          ? "Hola, bienvenido al asistente de privacidad de ADAMIA. Puedo ayudarte con datos personales, derechos ARCO, seguridad y politicas. ¿Que tema quieres revisar?"
          : "Hola, soy el asistente de ADAMIA. Te ayudo con funciones, precios y planes. Si quieres, te cotizo segun tu numero de empleados.";
      return NextResponse.json({ message: greetingMessage });
    }

    const apiKey = String(
      process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || ""
    ).trim();
    if (!apiKey) {
      if (context === "template") {
        return NextResponse.json({
          message: buildTemplateOfflineReply(),
        });
      }
      return NextResponse.json({
        message:
          "Puedo ayudarte con informacion de ADAMIA, funciones, precios y contratacion. Si quieres cotizar, dime cuantas personas tienen en tu empresa.",
      });
    }

    const contents = [
      ...mapHistoryToGeminiContents(history),
      { role: "user", parts: [{ text: cleanMessage }] },
    ];

    const models = await getGeminiModelCandidates(apiKey);
    const systemPrompt = getSystemPrompt(context);
    const geminiErrors = [];
    for (const model of models) {
      try {
        // Para plantillas, permitimos una respuesta más larga y visual.
        if (context === "template") {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents,
              generationConfig: {
                temperature: 0.75,
                maxOutputTokens: 1800,
              },
            }),
            cache: "no-store",
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(`Gemini ${model} template fallo: ${response.status} ${JSON.stringify(data)}`);
          }
          const raw =
            data?.candidates?.[0]?.content?.parts
              ?.map((part) => part?.text || "")
              .join("\n")
              .trim() || "";
          const html = sanitizeTemplateHtml(raw);
          if (!html) throw new Error(`Gemini ${model} template sin contenido.`);
          return NextResponse.json({ message: html });
        }

        const answer = await requestGemini({ apiKey, model, systemPrompt, contents });
        return NextResponse.json({ message: answer });
      } catch (modelError) {
        const detail = modelError?.message || String(modelError);
        geminiErrors.push(detail);
        console.error(detail);
      }
    }

    // Evita status 502 en UI cuando la IA externa falla; entrega respuesta util local.
    const debugDetail =
      process.env.NODE_ENV !== "production" && geminiErrors.length
        ? `\n[Debug Gemini]: ${geminiErrors.slice(0, 2).join(" | ")}`
        : "";

    if (context === "template") {
      return NextResponse.json({
        message: buildTemplateOfflineReply(),
      });
    }

    if (context === "sales") {
      return NextResponse.json({
        message: creativeIntent
          ? `${buildSalesOfflineReply(cleanMessage)}${debugDetail}`
          : `No pude conectar con Gemini en este momento, pero puedo ayudarte con funciones, precios y contratacion de ADAMIA.${debugDetail}`,
      });
    }

    return NextResponse.json({
      message:
        `No pude conectar con Gemini en este momento. Si quieres, te apoyo con dudas generales de privacidad y te canalizo a privacidad@adamia.mx.${debugDetail}`,
    });
  } catch (error) {
    console.error("Error en /api/bot:", error);
    return NextResponse.json(
      { message: "Error interno al consultar el asistente." },
      { status: 500 }
    );
  }
}

