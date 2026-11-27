// Capturas del Centro de ayuda · Muro y comunicados. Mismo backend simulado (contrato de /api/checador/comunicados) y
// mismos datos de demostración que scripts/verify-comunicados.mjs: empresa «Uniline», Laura Ríos (RH), Ana Torres
// (empleada), etc. Guarda en public/ayuda/capturas/comunicados/. Uso: ver scripts/capturas-ayuda/comun.mjs.
import { ARCHIVOS, chromium, contexto, guardar, hace, levantarNext } from "./comun.mjs";

const M = "comunicados";
const LAURA = { id_usuario: 1, tipo_usuario: "Recruiter", nombre: "Laura Ríos", correo: "laura@uniline.mx", id_empresa: 7, empresas: [7], empresas_detalle: [{ id_empresa: 7, nombre: "Uniline", zona_horaria: "America/Mexico_City" }], zona_horaria: "America/Mexico_City" };
const ANA = { tipo_usuario: "Empleado", id_empleado: 44, id_usuario: 44, nombre: "Ana Torres", id_empresa: 7, empresas: [7], empresas_detalle: [{ id_empresa: 7, nombre: "Uniline" }], zona_horaria: "America/Mexico_City" };
const RH = { nombre: "Laura Ríos", iniciales: "LR", rol: "Recursos Humanos" };
const fotos = (n, prefijo) => Array.from({ length: n }, (_, i) => ({ id: i + 1, tipo: "foto", url: `${ARCHIVOS}/${prefijo}-${i + 1}.svg`, nombre: `foto-${i + 1}.jpg` }));
const AUDITORIA = {
  id: 1, tipo: "auditoria", nivel: "confirmacion", titulo: "Auditoría de Protección Civil el jueves 3",
  cuerpo: "El jueves 3 a las 10:00 nos visita Protección Civil. Ese día: uniforme completo, gafete visible, pasillos y salidas de emergencia libres. Si eres brigadista, preséntate a las 9:30 en recepción.",
  autor: RH, publicado_en: hace(120), fecha_evento: "2026-12-03", adjuntos: [{ id: 9, tipo: "pdf", url: `${ARCHIVOS}/checklist.pdf`, nombre: "checklist-proteccion-civil.pdf" }],
  youtube_id: null, reacciones: 4, me_gusta: false, comentarios: 3, permite_reacciones: true, permite_comentarios: true, fijado: false, requiere_confirmar: true, confirmado_en: null, visto_en: null, audiencia_texto: "Sucursal Centro",
};
const COMENTARIOS = [
  { id: 501, padre_id: null, texto: "¡Qué buen partido! La revancha en enero.", autor: { id_empleado: 10, nombre: "Jorge Ramírez" }, creado_en: hace(120), reacciones: 6, me_gusta: false, propio: false, estado: "visible",
    respuestas: [{ id: 502, padre_id: 501, texto: "Ahí estaremos.", autor: { id_empleado: 11, nombre: "Sofía Méndez" }, creado_en: hace(60), reacciones: 0, me_gusta: false, propio: false, estado: "visible" }] },
  { id: 503, padre_id: null, texto: "¿Habrá fotos del equipo completo?", autor: { id_empleado: 44, nombre: "Ana Torres" }, creado_en: hace(40), reacciones: 2, me_gusta: false, propio: true, estado: "visible", respuestas: [] },
];
const MURO = [
  { ...AUDITORIA },
  { id: 2, tipo: "evento", nivel: "normal", titulo: "", cuerpo: "¡Así vivimos el torneo de fútbol de Sucursal Norte! Gracias a todos los que fueron.", autor: RH, publicado_en: hace(60 * 20), adjuntos: fotos(7, "torneo"), youtube_id: null, reacciones: 53, me_gusta: false, comentarios: 3, permite_reacciones: true, permite_comentarios: true, fijado: false, requiere_confirmar: false, audiencia_texto: "Toda la empresa",
    comentarios_recientes: [COMENTARIOS[0], COMENTARIOS[1]].map(({ respuestas: _r, ...c }) => c) },
  { id: 3, tipo: "evento", nivel: "normal", titulo: "Posada 2026: viernes 18 de diciembre", cuerpo: "Cena, rifa y música. ¡Te esperamos!", autor: RH, publicado_en: hace(60 * 24 * 3), adjuntos: fotos(1, "posada"), youtube_id: null, reacciones: 54, me_gusta: true, comentarios: 12, permite_reacciones: true, permite_comentarios: true, fijado: true, requiere_confirmar: false, audiencia_texto: "Toda la empresa" },
  { id: 6, tipo: "politica", nivel: "normal", titulo: "Nuevo reglamento de uso de uniforme", cuerpo: "Consulta el reglamento.", autor: RH, publicado_en: hace(60 * 24 * 9), adjuntos: [{ id: 30, tipo: "pdf", url: `${ARCHIVOS}/reglamento.pdf`, nombre: "reglamento-uniforme.pdf" }], youtube_id: null, reacciones: 3, me_gusta: false, comentarios: 0, permite_reacciones: true, permite_comentarios: false, fijado: false, requiere_confirmar: false, audiencia_texto: "Cajeras" },
];
const LISTA = [
  { id: 1, titulo: AUDITORIA.titulo, tipo: "auditoria", nivel: "confirmacion", estado: "publicado", audiencia_texto: "Sucursal Centro", canales: { app: true, push: true, correo: true, popup: true }, publicado_en: hace(120), total: 42, vistos: 35, confirmados: 30, fijado: false, automatico: false },
  { id: 2, titulo: "Feliz cumpleaños, Ana Torres", tipo: "cumpleanos", nivel: "normal", estado: "publicado", audiencia_texto: "Toda la empresa", canales: { app: true, push: true }, publicado_en: hace(180), total: 186, vistos: 121, confirmados: 0, reacciones: 38, automatico: true },
  { id: 3, titulo: "Posada 2026: viernes 18 de diciembre", tipo: "evento", nivel: "normal", estado: "publicado", audiencia_texto: "Toda la empresa", canales: { app: true, push: true, correo: true }, publicado_en: hace(60 * 24 * 3), total: 186, vistos: 164, confirmados: 0, fijado: true, automatico: false },
  { id: 4, titulo: "Cambio de horario de comedor", tipo: "aviso", nivel: "normal", estado: "programado", audiencia_texto: "Área: Producción", canales: { app: true, push: true }, publicar_en: new Date(Date.now() + 4 * 86400000).toISOString(), total: 63, vistos: 0, confirmados: 0 },
  { id: 5, titulo: "¡Ganamos el torneo de boliche!", tipo: "publicacion", nivel: "normal", estado: "pendiente_aprobacion", audiencia_texto: "Toda la empresa", canales: { app: true }, autor: { nombre: "Jorge Ramírez", rol: "Empleado" }, total: 0 },
];
const DESTINATARIOS = [
  { id_empleado: 20, nombre: "Karla Ortiz", puesto: "Cajera", estado: "confirmado", confirmado_en: hace(30), recordatorios: 0 },
  { id_empleado: 10, nombre: "Jorge Ramírez", puesto: "Almacenista", estado: "visto", visto_en: hace(100), confirmado_en: null, recordatorios: 1 },
  { id_empleado: 11, nombre: "Sofía Méndez", puesto: "Cajera", estado: "visto", visto_en: hace(70), confirmado_en: null, recordatorios: 1 },
  { id_empleado: 12, nombre: "Raúl Hernández", puesto: "Vendedor", estado: "no_visto", recordatorios: 1 },
  { id_empleado: 13, nombre: "Pedro Salas", puesto: "Mantenimiento", estado: "sin_canal", recordatorios: 0 },
];
const AUTOMATICOS = [
  { regla: "cumpleanos", activo: true, audiencia: "empresa", canales: { push: true, correo: false } },
  { regla: "aniversario", activo: true, audiencia: "sucursal", canales: { push: true, correo: true } },
  { regla: "festivo", activo: true, audiencia: "empresa", canales: { push: true, correo: false } },
  { regla: "bienvenida", activo: false, audiencia: "area", canales: { push: false, correo: false } },
];
const CONFIG = { publican_jefes: true, publican_empleados: true, permitir_reacciones: true, permitir_comentarios: true, palabras_bloqueadas: ["palabra-de-ejemplo"], umbral_reportes: 3, hora_automaticos: "08:00" };
const PORTADA = { url: `${ARCHIVOS}/posada-2026.svg`, titulo: "Posada 2026 · ¡ya casi!", enlace: "https://uniline.mx/posada" };
const MODERACION = {
  reportados: [{ id: 91, texto: "[comentario de ejemplo reportado por burla a un compañero]", estado: "visible", reportes: 3, autor: { id_empleado: 12, nombre: "Raúl Hernández" }, comunicado: { id: 3, titulo: "Torneo de fútbol Sucursal Norte" }, motivos: ["Se burla de un compañero"] }],
  retenidos: [{ id: 92, texto: "[comentario de ejemplo con una palabra de la lista]", estado: "retenido", reportes: 0, autor: { id_empleado: 13, nombre: "Pedro Salas" }, comunicado: { id: 2, titulo: "Mensaje de fin de año" } }],
  ocultos: [],
};
let popupMi = null;

function manejar({ ruta, metodo, url, json }) {
  if (!ruta.startsWith("/checador/comunicados")) return undefined;
  const r = ruta.slice("/checador/comunicados".length) || "/";
  let m;
  if (r === "/mi/muro") return json({ ok: true, portada: PORTADA, pendientes_confirmar: 1, puede_publicar: true, items: MURO, siguiente: null });
  if (r === "/mi/popup") return json({ ok: true, popup: popupMi });
  if (r === "/mi/push/clave") return json({ ok: true, habilitado: false });
  if (r === "/mi/preferencias") return json({ ok: true, ocultar_cumpleanos: false });
  if (r === "/mi/publicaciones") return json({ ok: true, items: [{ id: 70, titulo: "", cuerpo: "Foto del convivio de Norte", estado: "rechazado", motivo_rechazo: "Ya se publicó una igual" }, { id: 71, titulo: "", cuerpo: "¡Felicidades al equipo de ventas por la meta del mes!", estado: "pendiente_aprobacion" }] });
  if ((m = r.match(/^\/mi\/(\d+)\/comentarios$/)) || (m = r.match(/^\/muro\/(\d+)\/comentarios$/))) return json({ ok: true, items: COMENTARIOS, siguiente: null, puede_comentar: true, suspendido_hasta: null });
  if ((m = r.match(/^\/mi\/(\d+)$/))) { const x = MURO.find((y) => y.id === Number(m[1])); return json({ ok: true, comunicado: { ...x, visto_en: new Date().toISOString() } }); }
  if (r === "/muro") {
    const seg = (x) => (x.nivel === "confirmacion" ? { total: 42, confirmados: 30, vistos: 35, faltan: 12, texto: "30 de 42 confirmaron" } : { total: 186, vistos: 164, confirmados: 0, faltan: 22, texto: "164 de 186 lo vieron" });
    return json({ ok: true, portada: PORTADA, pendientes_confirmar: 0, puede_participar: true, siguiente: null, items: MURO.map((x) => ({ ...x, requiere_confirmar: false, confirmado_en: null, seguimiento: seg(x) })) });
  }
  if (r === "/" && metodo === "GET") {
    const estado = url.searchParams.get("estado");
    const items = LISTA.filter((x) => !estado || x.estado === estado);
    return json({ ok: true, items, total: items.length, resumen: { publicados_mes: 12, lectura_promedio: 84, confirmaciones_pendientes: 18, programados: 1, pendientes_aprobacion: 1 } });
  }
  if (r === "/audiencia/opciones") return json({ ok: true, sucursales: ["Centro", "Norte"], areas: ["Producción", "Ventas", "Almacén"], puestos: ["Almacenista", "Cajera", "Vendedor"], empleados: [{ id: 12, nombre: "Raúl Hernández", puesto: "Vendedor", area: "Ventas", sucursal: "Centro" }] });
  if (r === "/audiencia/previa") return json({ ok: true, total: 42, con_app: 39, con_correo: 35, sin_canal: 3 });
  if (r === "/popup") return json({ ok: true, popup: null });
  if (r === "/automaticos/previa") {
    const vacio = { cumpleanos: [], aniversario: [], festivo: [], bienvenida: [] };
    return json({ ok: true, hoy: { ...vacio, cumpleanos: [{ titulo: "¡Feliz cumpleaños, Ana!", cuerpo: "Hoy celebramos a Ana Torres, de Ventas en Sucursal Norte. ¡Que tengas un gran día!", activo: true }] }, manana: { ...vacio, cumpleanos: [{ titulo: "a" }, { titulo: "b" }], aniversario: [{ titulo: "c" }] } });
  }
  if (r === "/automaticos") return json({ ok: true, automaticos: AUTOMATICOS });
  if (r === "/config") return json({ ok: true, ...CONFIG, config: CONFIG, push_habilitado: false });
  if (r === "/portada") return json({ ok: true, portada: PORTADA });
  if (r === "/moderacion") return json({ ok: true, conteos: { reportados: 1, retenidos: 1, ocultos: 0 }, items: MODERACION[url.searchParams.get("filtro") ?? "reportados"] });
  if ((m = r.match(/^\/(\d+)\/destinatarios$/))) {
    const filtro = url.searchParams.get("filtro");
    const items = filtro === "confirmaron" ? DESTINATARIOS.filter((d) => d.estado === "confirmado") : filtro === "faltan" ? DESTINATARIOS.filter((d) => d.estado !== "confirmado") : DESTINATARIOS;
    return json({ ok: true, items, conteos: { total: 42, confirmados: 30, vistos: 35, vistos_sin_confirmar: 5, no_vistos: 4, sin_canal: 3, faltan: 12 }, total: items.length, pagina: 1, por_pagina: 50 });
  }
  if ((m = r.match(/^\/(\d+)$/)) && metodo === "GET") {
    const fila = LISTA.find((x) => x.id === Number(m[1])) ?? LISTA[0];
    return json({ ok: true, comunicado: { ...fila, cuerpo: AUDITORIA.cuerpo, autor: RH, fecha_evento: "2026-12-03", adjuntos: fila.id === 1 ? AUDITORIA.adjuntos : [], audiencia: { todos: false, sucursales: ["Centro"], areas: [], puestos: [], empleados: [] }, version: 1 },
      entregas: { app: { destinatarios: 42, vistos: 35 }, push: { activo: true, enviados: 37, fallidos: 0, omitidos: 2, habilitado: true }, correo: { activo: true, enviados: 35, fallidos: 1, omitidos: 0 }, popup: { activo: true, cerrados: 4 } } });
  }
  return json({ ok: true });
}

const { base, firmar, cerrar } = await levantarNext();
const browser = await chromium.launch({ args: ["--lang=es-MX"] });
try {
  // ——— Panel de RH (1440 × 900) ———
  {
    const { ctx, page } = await contexto(browser, { base, ancho: 1440, alto: 900, cookie: firmar("Recruiter"), usuario: () => LAURA, manejar });
    await page.goto(base + "/panel/muro", { waitUntil: "domcontentloaded" });
    const muro = page.locator("[data-pantalla='muro-panel']");
    await muro.locator("[data-post='1']").waitFor({ timeout: 60000 });
    await guardar(page, M, "muro-panel");
    await muro.locator("[data-menu-post='2']").click();
    await page.getByRole("menuitem", { name: "Fijar arriba del muro" }).waitFor();
    await guardar(page, M, "menu-publicacion", { objetivo: muro.locator("[data-post='2'] header"), margen: 120 });
    await page.keyboard.press("Escape");
    await muro.locator("[data-cambiar-portada]").click();
    const dlg = page.getByRole("dialog", { name: "Portada del muro" });
    await dlg.locator("[data-portada-editor] img").waitFor();
    await guardar(page, M, "cambiar-portada", { objetivo: dlg });
    await page.keyboard.press("Escape");

    await page.goto(base + "/panel/comunicados/nuevo", { waitUntil: "domcontentloaded" });
    await page.locator("[data-pantalla='redactar']").waitFor({ timeout: 60000 });
    await page.getByLabel("Tipo").selectOption("auditoria");
    await page.getByLabel("Título").fill("Auditoría de Protección Civil el jueves 3");
    await page.getByLabel("Mensaje").fill(AUDITORIA.cuerpo);
    await page.getByRole("radio", { name: /Requiere confirmación de leído/ }).check();
    await page.getByRole("button", { name: "Área, puesto, sucursal o persona" }).click();
    const elegir = page.locator("[data-elegir-audiencia]");
    await elegir.getByText("Centro", { exact: true }).waitFor({ timeout: 20000 });
    await elegir.getByText("Centro", { exact: true }).click();
    await guardar(page, M, "elegir-audiencia", { objetivo: page.getByRole("dialog", { name: "Elegir para quién" }) });
    await elegir.getByRole("button", { name: "Listo" }).click();
    await page.locator("[data-previa]").getByText(/42 empleados activos/).waitFor({ timeout: 20000 });
    await page.getByLabel("Correo electrónico").check();
    await page.getByLabel("Aviso emergente").check();
    await guardar(page, M, "redactar", { objetivo: page.locator("[data-pantalla='redactar']") });

    await page.goto(base + "/panel/comunicados/administrar", { waitUntil: "domcontentloaded" });
    await page.locator("[data-comunicado='1']").waitFor({ timeout: 60000 });
    await guardar(page, M, "administrar", { objetivo: page.locator("[data-pantalla='comunicados']") });
    await page.getByRole("button", { name: /Por aprobar/ }).click();
    await page.locator("[data-comunicado='5']").getByRole("button", { name: "Aprobar y publicar" }).waitFor({ timeout: 20000 });
    await guardar(page, M, "por-aprobar", { objetivo: page.locator("[data-pantalla='comunicados']") });

    await page.goto(base + "/panel/comunicados/1", { waitUntil: "domcontentloaded" });
    await page.locator("[data-destinatarios] [data-destinatario='13']").waitFor({ timeout: 60000 });
    await guardar(page, M, "seguimiento", { objetivo: page.locator("[data-pantalla='seguimiento']") });

    await page.goto(base + "/panel/comunicados/moderacion", { waitUntil: "domcontentloaded" });
    await page.locator("[data-comentario-moderar='91']").waitFor({ timeout: 60000 });
    await page.locator("[data-reglas-muro]").waitFor({ timeout: 20000 });
    await guardar(page, M, "moderacion", { objetivo: page.locator("[data-pantalla='moderacion']") });

    await page.goto(base + "/panel/comunicados/automaticos", { waitUntil: "domcontentloaded" });
    await page.locator("[data-regla='cumpleanos']").waitFor({ timeout: 60000 });
    await page.locator("[data-previa-hoy]").getByText("¡Feliz cumpleaños, Ana!").waitFor({ timeout: 20000 });
    await guardar(page, M, "automaticos", { objetivo: page.locator("[data-pantalla='automaticos']") });
    await ctx.close();
  }

  // ——— Mi espacio (teléfono, 390 × 844) ———
  {
    const { ctx, page } = await contexto(browser, { base, ancho: 390, alto: 844, cookie: firmar("Empleado"), usuario: () => ANA, manejar });
    await page.goto(base + "/empleado/panel/muro", { waitUntil: "domcontentloaded" });
    const muro = page.locator("[data-pantalla='muro']");
    await muro.locator("[data-post='1']").waitFor({ timeout: 60000 });
    await guardar(page, M, "muro-empleado-movil");
    await muro.locator("[data-post='2'] [data-escribe-comentario='2']").click();
    await muro.locator("[data-comentarios='2'] [data-comentario='501']").waitFor({ timeout: 20000 });
    await guardar(page, M, "comentarios-movil", { objetivo: muro.locator("[data-post='2']") });
    await guardar(page, M, "preferencias-movil", { objetivo: muro.locator("[data-preferencias]") });

    await page.goto(base + "/empleado/panel/muro/1", { waitUntil: "domcontentloaded" });
    await page.locator("[data-confirmar]").waitFor({ timeout: 60000 });
    await page.getByLabel("Leí el comunicado y estoy enterado").check();
    await guardar(page, M, "confirmar-movil", { objetivo: page.locator("[data-confirmar]"), margen: 16 });

    await page.goto(base + "/empleado/panel/muro/publicar", { waitUntil: "domcontentloaded" });
    await page.locator("[data-pantalla='publicar']").waitFor({ timeout: 60000 });
    await page.getByLabel("¿Qué quieres compartir?").fill("¡Felicidades al equipo de ventas por la meta del mes!");
    await page.locator("[data-mis-publicaciones]").waitFor({ timeout: 20000 });
    await guardar(page, M, "publicar-movil", { completa: true });

    popupMi = { ...AUDITORIA, cerrar_con: "confirmar" };
    await page.goto(base + "/empleado/panel/inicio", { waitUntil: "domcontentloaded" });
    await page.locator("[data-aviso-emergente]").waitFor({ timeout: 60000 });
    await guardar(page, M, "aviso-emergente-movil");
    popupMi = null;
    await ctx.close();
  }
  console.log("capturas de comunicados: listas");
} finally {
  await browser.close();
  cerrar();
}
