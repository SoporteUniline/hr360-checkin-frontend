// Verificación en navegador del Centro de comunicados (27/11/2026) con el backend simulado (contrato de
// /api/checador/comunicados): panel de RH (lista, redactar, seguimiento, automáticos, moderación y portada), aviso
// emergente (no se cierra con clic al fondo) y Mi espacio (muro con portada, fijadas, fotos, video, PDF, me gusta,
// comentarios, confirmar de leído, publicar y preferencias).
// Escritorio (1440) y teléfono (390): sin scroll horizontal, objetivos táctiles ≥ 44 px (teléfono) y texto ≥ 13 px en lo
// nuevo; lo que se manda al servidor; el texto de las personas se muestra como texto (sin HTML).
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build
//      CAPTURAS=/ruta/capturas PLAYWRIGHT_MODULE_PATH=… node scripts/verify-comunicados.mjs
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const REPO = process.cwd();
const OUT = process.env.CAPTURAS || null;
const API_ORIGEN = "https://api.prueba.invalid";
const ARCHIVOS = "https://archivos.prueba.invalid";
const require = createRequire(REPO + "/package.json");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const secret = randomUUID();
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
// COMUNICADOS_DEV=1: con «next dev» (para iterar sin reconstruir; el resultado que cuenta es con «next start»).
const next = spawn(process.execPath, [REPO + "/node_modules/next/dist/bin/next", process.env.COMUNICADOS_DEV ? "dev" : "start", "-p", String(port), "-H", "127.0.0.1"],
  { cwd: REPO, stdio: "ignore", env: { ...process.env, JWT_SECRET: secret } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const firmar = (tipo, extra = {}) => {
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: tipo, id_usuario: -1, ...extra, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
};
const hace = (min) => new Date(Date.now() - min * 60000).toISOString();
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const svg = (texto, color) => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="${color}"/><text x="600" y="420" font-size="72" font-family="sans-serif" fill="#fff" text-anchor="middle">${texto}</text></svg>`;
const COLORES = ["#2563eb", "#0f766e", "#7c3aed", "#b45309", "#be123c", "#334155", "#15803d"];

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

function estadoInicial() {
  return {
    pedidos: [],
    popupPanel: null,
    popupMi: null,
    push: false,
    lista: [
      { id: 1, titulo: AUDITORIA.titulo, tipo: "auditoria", nivel: "confirmacion", estado: "publicado", audiencia_texto: "Sucursal Centro", canales: { app: true, push: true, correo: true, popup: true }, publicado_en: hace(120), total: 42, vistos: 35, confirmados: 30, reacciones: 4, comentarios: 3, fijado: false, automatico: false },
      { id: 2, titulo: "Feliz cumpleaños, Ana Torres", tipo: "cumpleanos", nivel: "normal", estado: "publicado", audiencia_texto: "Toda la empresa", canales: { app: true, push: true }, publicado_en: hace(180), total: 186, vistos: 121, confirmados: 0, reacciones: 38, comentarios: 9, fijado: false, automatico: true },
      { id: 3, titulo: "Posada 2026: viernes 18 de diciembre", tipo: "evento", nivel: "normal", estado: "publicado", audiencia_texto: "Toda la empresa", canales: { app: true, push: true, correo: true }, publicado_en: hace(60 * 24 * 3), total: 186, vistos: 164, confirmados: 0, reacciones: 54, comentarios: 12, fijado: true, automatico: false },
      { id: 4, titulo: "Cambio de horario de comedor", tipo: "aviso", nivel: "normal", estado: "programado", audiencia_texto: "Área: Producción", canales: { app: true, push: true }, publicar_en: new Date(Date.now() + 4 * 86400000).toISOString(), total: 63, vistos: 0, confirmados: 0 },
      { id: 5, titulo: "¡Ganamos el torneo de boliche!", tipo: "publicacion", nivel: "normal", estado: "pendiente_aprobacion", audiencia_texto: "Toda la empresa", canales: { app: true }, autor: { nombre: "Jorge Ramírez", rol: "Empleado" }, total: 0 },
    ],
    destinatarios: [
      { id_empleado: 10, nombre: "Jorge Ramírez", puesto: "Almacenista", estado: "visto", visto_en: hace(100), confirmado_en: null, recordatorios: 1 },
      { id_empleado: 11, nombre: "Sofía Méndez", puesto: "Cajera", estado: "visto", visto_en: hace(70), confirmado_en: null, recordatorios: 1 },
      { id_empleado: 12, nombre: "Luis Hernández", puesto: "Vendedor", estado: "no_visto", recordatorios: 1 },
      { id_empleado: 13, nombre: "Pedro Salas", puesto: "Mantenimiento", estado: "sin_canal", recordatorios: 0, avisado_persona_por: null, avisado_persona_en: null },
    ],
    automaticos: [
      { regla: "cumpleanos", activo: true, audiencia: "empresa", canales: { push: true, correo: false, popup: false }, id_plantilla: null },
      { regla: "aniversario", activo: true, audiencia: "sucursal", canales: { push: true, correo: true, popup: false }, id_plantilla: null },
      { regla: "festivo", activo: true, audiencia: "empresa", canales: { push: true, correo: false, popup: false }, id_plantilla: null },
      { regla: "bienvenida", activo: false, audiencia: "area", canales: { push: false, correo: false, popup: false }, id_plantilla: null },
    ],
    config: { publican_jefes: true, publican_empleados: true, permitir_reacciones: true, permitir_comentarios: true, palabras_bloqueadas: ["tonto"], umbral_reportes: 3, hora_automaticos: "08:00" },
    portada: { url: `${ARCHIVOS}/portada.svg`, titulo: "Posada 2026 · ¡ya casi!", enlace: "https://uniline.mx/posada" },
    moderacion: {
      reportados: [{ id: 91, texto: "[comentario reportado por burla a un compañero]", estado: "visible", reportes: 3, autor: { id_empleado: 12, nombre: "Luis Hernández" }, comunicado: { id: 3, titulo: "Torneo de fútbol Sucursal Norte" }, motivos: ["Se burla de un compañero"] }],
      retenidos: [{ id: 92, texto: "[comentario con una palabra de la lista]", estado: "retenido", reportes: 0, autor: { id_empleado: 13, nombre: "Pedro Salas" }, comunicado: { id: 2, titulo: "Mensaje de fin de año" } }],
      ocultos: [],
    },
    muro: [
      { ...AUDITORIA },
      { id: 2, tipo: "evento", nivel: "normal", titulo: "", cuerpo: "¡Así vivimos el torneo de fútbol de Sucursal Norte! Gracias a todos los que fueron. <img src=x onerror=alert(1)>", autor: RH, publicado_en: hace(60 * 20), adjuntos: fotos(7, "torneo"), youtube_id: null, reacciones: 53, me_gusta: false, comentarios: 2, permite_reacciones: true, permite_comentarios: true, fijado: false, requiere_confirmar: false, audiencia_texto: "Toda la empresa" },
      { id: 3, tipo: "evento", nivel: "normal", titulo: "Posada 2026: viernes 18 de diciembre", cuerpo: "Cena, rifa y música. ¡Te esperamos!", autor: RH, publicado_en: hace(60 * 24 * 3), adjuntos: fotos(1, "posada"), youtube_id: null, reacciones: 54, me_gusta: true, comentarios: 12, permite_reacciones: true, permite_comentarios: true, fijado: true, requiere_confirmar: false, audiencia_texto: "Toda la empresa" },
      { id: 4, tipo: "aviso", nivel: "normal", titulo: "Mensaje de fin de año", cuerpo: "Mensaje de fin de año para todo el equipo.", autor: { nombre: "Diego León", iniciales: "DL", rol: "Dirección" }, publicado_en: hace(60 * 24 * 4), adjuntos: [], youtube_id: "dQw4w9WgXcQ", reacciones: 98, me_gusta: false, comentarios: 21, permite_reacciones: true, permite_comentarios: true, fijado: false, requiere_confirmar: false, audiencia_texto: "Toda la empresa" },
      { id: 6, tipo: "politica", nivel: "normal", titulo: "Nuevo reglamento de uso de uniforme", cuerpo: "Consulta el reglamento.", autor: RH, publicado_en: hace(60 * 24 * 9), adjuntos: [{ id: 30, tipo: "pdf", url: `${ARCHIVOS}/reglamento.pdf`, nombre: "reglamento-uniforme.pdf" }], youtube_id: null, reacciones: 3, me_gusta: false, comentarios: 0, permite_reacciones: true, permite_comentarios: false, fijado: false, requiere_confirmar: false, audiencia_texto: "Cajeras" },
    ],
    comentarios: [
      { id: 501, padre_id: null, texto: "¡Qué buen partido! La revancha en enero.", autor: { id_empleado: 10, nombre: "Jorge Ramírez" }, creado_en: hace(120), reacciones: 6, me_gusta: false, propio: false, estado: "visible",
        respuestas: [{ id: 502, padre_id: 501, texto: "Ahí estaremos.", autor: { id_empleado: 11, nombre: "Sofía Méndez" }, creado_en: hace(60), reacciones: 0, me_gusta: false, propio: false, estado: "visible" }] },
      { id: 503, padre_id: null, texto: "¿Habrá fotos del equipo completo?", autor: { id_empleado: 44, nombre: "Ana Torres" }, creado_en: hace(40), reacciones: 2, me_gusta: false, propio: true, estado: "visible", respuestas: [] },
    ],
    siguienteId: 600,
  };
}
let S = estadoInicial();
let usuario = LAURA;
let permisos = null; // acceso con permisos (null = dueño)
const destCliente = (d) => ({ ...d, estado: d.avisado_persona_en && d.estado === "sin_canal" ? "sin_canal" : d.estado });
const conteos = () => ({ total: 42, confirmados: 30, vistos: 35, vistos_sin_confirmar: 5, no_vistos: 4, sin_canal: 3, faltan: 12, avisados_en_persona: S.destinatarios.filter((d) => d.avisado_persona_en).length });

async function instalarMocks(ctx) {
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" };
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(data) });
    if (url.origin === base) return json({});
    if (url.origin === ARCHIVOS) {
      if (url.pathname.endsWith(".pdf")) return route.fulfill({ status: 200, contentType: "application/pdf", body: "%PDF-1.4\n%%EOF" });
      const n = Number(url.pathname.match(/(\d+)\.svg$/)?.[1] ?? 0);
      return route.fulfill({ status: 200, contentType: "image/svg+xml", body: svg(url.pathname.includes("portada") ? "Posada 2026" : `Foto ${n}`, COLORES[n % COLORES.length]) });
    }
    if (url.hostname === "i.ytimg.com") return route.fulfill({ status: 200, contentType: "image/svg+xml", body: svg("YouTube", "#111827") });
    if (url.hostname === "www.youtube-nocookie.com") return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>video</title><body style='background:#000;color:#fff'>Reproductor</body>" });
    if (url.origin !== API_ORIGEN) return route.abort();
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname.replace(/^\/api/, "");
    if (p === "/users/verify/token") return json(permisos ? { user: { ...usuario, esAcceso: true }, permisos } : { user: usuario });
    if (!p.startsWith("/checador/comunicados")) return json({});
    const ruta = p.slice("/checador/comunicados".length) || "/";
    const metodo = req.method();
    let cuerpo = null;
    const tipo = req.headers()["content-type"] ?? "";
    if (tipo.includes("application/json")) { try { cuerpo = JSON.parse(req.postData() ?? "null"); } catch { cuerpo = null; } }
    else if (tipo.includes("multipart")) {
      const texto = (req.postDataBuffer() ?? Buffer.alloc(0)).toString("latin1");
      const datos = texto.match(/name="datos"\r\n\r\n([\s\S]*?)\r\n--/)?.[1];
      cuerpo = { multipart: true, texto, datos: datos ? JSON.parse(Buffer.from(datos, "latin1").toString("utf8")) : null };
    }
    S.pedidos.push({ metodo, ruta, params: url.searchParams, cuerpo, auth: req.headers().authorization ?? null });
    let m;
    // ——— Mi espacio ———
    if (ruta === "/mi/muro") {
      const segunda = url.searchParams.get("cursor") === "c2";
      return json({ ok: true, portada: segunda ? undefined : S.portada, pendientes_confirmar: S.muro[0].confirmado_en ? 0 : 1, items: segunda ? S.muro.slice(4) : S.muro.slice(0, 4), siguiente: segunda ? null : "c2" });
    }
    if (ruta === "/mi/popup") return json({ ok: true, popup: S.popupMi });
    if (ruta === "/mi/push/clave") return json({ ok: true, habilitado: S.push, vapid_public_key: S.push ? "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U" : null });
    if (ruta === "/mi/preferencias") return json({ ok: true, ocultar_cumpleanos: metodo === "PUT" ? cuerpo?.ocultar_cumpleanos : false });
    if (ruta === "/mi/publicaciones" && metodo === "POST") return json({ ok: true, comunicado: { id: 77, estado: "pendiente_aprobacion" }, estado: "pendiente_aprobacion" }, 201);
    if (ruta === "/mi/publicaciones") return json({ ok: true, items: [{ id: 70, titulo: "", cuerpo: "Foto del convivio de Norte", estado: "rechazado", motivo_rechazo: "Ya se publicó una igual" }] });
    if ((m = ruta.match(/^\/mi\/(\d+)\/posponer$/))) { S.popupMi = null; return json({ ok: true, cerrado: true }); }
    if ((m = ruta.match(/^\/mi\/(\d+)\/confirmar$/))) { const x = S.muro.find((y) => y.id === Number(m[1])); x.confirmado_en = new Date().toISOString(); x.requiere_confirmar = false; return json({ ok: true, confirmado_en: x.confirmado_en }); }
    if ((m = ruta.match(/^\/mi\/(\d+)\/me-gusta$/))) { const x = S.muro.find((y) => y.id === Number(m[1])); x.me_gusta = !x.me_gusta; x.reacciones += x.me_gusta ? 1 : -1; await dormir(250); return json({ ok: true, me_gusta: x.me_gusta, reacciones: x.reacciones }); }
    if ((m = ruta.match(/^\/mi\/(\d+)\/comentarios$/)) && metodo === "GET") return json({ ok: true, items: S.comentarios, siguiente: null, puede_comentar: true, suspendido_hasta: null });
    if ((m = ruta.match(/^\/mi\/(\d+)\/comentarios$/)) && metodo === "POST") {
      const c = { id: S.siguienteId++, padre_id: cuerpo.padre_id ?? null, texto: cuerpo.texto, autor: { id_empleado: 44, nombre: "Ana Torres" }, creado_en: new Date().toISOString(), reacciones: 0, me_gusta: false, propio: true, estado: /tonto/i.test(cuerpo.texto) ? "retenido" : "visible", respuestas: [] };
      if (c.padre_id) S.comentarios.find((x) => x.id === c.padre_id).respuestas.push(c); else S.comentarios.push(c);
      return json({ ok: true, comentario: c, estado: c.estado }, 201);
    }
    if ((m = ruta.match(/^\/mi\/comentarios\/(\d+)\/me-gusta$/))) {
      const c = S.comentarios.flatMap((x) => [x, ...x.respuestas]).find((x) => x.id === Number(m[1]));
      c.me_gusta = !c.me_gusta; c.reacciones += c.me_gusta ? 1 : -1;
      return json({ ok: true, me_gusta: c.me_gusta, reacciones: c.reacciones });
    }
    if ((m = ruta.match(/^\/mi\/comentarios\/(\d+)\/reportar$/))) return json({ ok: true, reportado: true, ya_reportado: false, oculto: false });
    if ((m = ruta.match(/^\/mi\/comentarios\/(\d+)$/)) && metodo === "DELETE") { const c = S.comentarios.find((x) => x.id === Number(m[1])); if (c) Object.assign(c, { borrado: true, texto: null, estado: "borrado" }); return json({ ok: true, borrado: true }); }
    if ((m = ruta.match(/^\/mi\/(\d+)$/))) { const x = S.muro.find((y) => y.id === Number(m[1])); return x ? json({ ok: true, comunicado: { ...x, visto_en: x.visto_en ?? new Date().toISOString() } }) : json({ ok: false, codigo: "NO_ENCONTRADO", mensaje: "Ese comunicado no existe o no lo puedes ver." }, 404); }
    // ——— Panel ———
    if (ruta === "/" && metodo === "GET") {
      const nivel = url.searchParams.get("nivel"); const estado = url.searchParams.get("estado");
      const items = S.lista.filter((x) => (!nivel || x.nivel === nivel) && (!estado || (estado === "automaticos" ? x.automatico : x.estado === estado)));
      return json({ ok: true, items, total: items.length, resumen: { publicados_mes: 12, lectura_promedio: 84, confirmaciones_pendientes: 18, programados: 1, pendientes_aprobacion: S.lista.filter((x) => x.estado === "pendiente_aprobacion").length } });
    }
    if (ruta === "/" && metodo === "POST" && S.rechazarCrear) { S.rechazarCrear = false; return json({ ok: false, codigo: "VALIDACION", code: "VALIDACION", mensaje: "Revisa los datos.", error: "Revisa los datos.", campos: { titulo: "El título ya existe hoy." } }, 422); }
    if (ruta === "/" && metodo === "POST") return json({ ok: true, comunicado: { ...S.lista[0], adjuntos: [] }, adjuntos: [], entregas: {} }, 201);
    if (ruta === "/audiencia/opciones") return json({ ok: true, sucursales: ["Centro", "Norte"], areas: ["Producción", "Ventas"], puestos: ["Almacenista", "Cajera"], empleados: [{ id: 12, nombre: "Luis Hernández", puesto: "Vendedor", area: "Ventas", sucursal: "Centro" }] });
    if (ruta === "/audiencia/previa") {
      const a = JSON.parse(url.searchParams.get("audiencia") ?? "{}");
      return json(a.todos ? { ok: true, total: 186, con_app: 170, con_correo: 150, sin_canal: 9 } : { ok: true, total: 42, con_app: 39, con_correo: 35, sin_canal: 3 });
    }
    if (ruta === "/popup") return json({ ok: true, popup: S.popupPanel });
    if ((m = ruta.match(/^\/popup\/(\d+)\/confirmar$/))) { S.popupPanel = null; return json({ ok: true, confirmado_en: new Date().toISOString() }); }
    if ((m = ruta.match(/^\/popup\/(\d+)\/posponer$/))) { S.popupPanel = null; return json({ ok: true }); }
    if (ruta === "/automaticos/previa") {
      const vacio = { cumpleanos: [], aniversario: [], festivo: [], bienvenida: [] };
      return json({ ok: true, hoy: { ...vacio, fecha: "2026-11-27", cumpleanos: [{ titulo: "¡Feliz cumpleaños, Ana!", cuerpo: "Hoy celebramos a Ana Torres, de Ventas en Sucursal Norte. ¡Que tengas un gran día!", persona: "Ana Torres", activo: true }] },
        manana: { ...vacio, fecha: "2026-11-28", cumpleanos: [{ titulo: "a" }, { titulo: "b" }], aniversario: [{ titulo: "c" }] }, reglas: S.automaticos });
    }
    if (ruta === "/automaticos" && metodo === "GET") return json({ ok: true, automaticos: S.automaticos });
    if (ruta === "/automaticos" && metodo === "PUT") { S.automaticos = cuerpo.reglas; return json({ ok: true, automaticos: S.automaticos }); }
    if (ruta === "/config" && metodo === "GET") return json({ ok: true, ...S.config, config: S.config, push_habilitado: false });
    if (ruta === "/config" && metodo === "PUT") { const { empresa: _e, ...resto } = cuerpo; Object.assign(S.config, resto); return json({ ok: true, ...S.config, config: S.config }); }
    if (ruta === "/portada" && metodo === "GET") return json({ ok: true, portada: S.portada });
    if (ruta === "/portada" && metodo === "PUT") { S.portada = { ...S.portada, titulo: "Nueva portada" }; return json({ ok: true, portada: S.portada }); }
    if (ruta === "/moderacion") return json({ ok: true, conteos: { reportados: S.moderacion.reportados.length, retenidos: S.moderacion.retenidos.length, ocultos: S.moderacion.ocultos.length }, items: S.moderacion[url.searchParams.get("filtro") ?? "reportados"] });
    if ((m = ruta.match(/^\/moderacion\/comentarios\/(\d+)$/))) {
      const id = Number(m[1]);
      for (const k of ["reportados", "retenidos"]) {
        const i = S.moderacion[k].findIndex((x) => x.id === id);
        if (i >= 0) { const [c] = S.moderacion[k].splice(i, 1); if (cuerpo.accion === "ocultar") S.moderacion.ocultos.push({ ...c, estado: "oculto", historial: [{ accion: "ocultar", por: "Laura Ríos", en: new Date().toISOString() }] }); }
      }
      return json({ ok: true, id, estado: cuerpo.accion });
    }
    if (ruta === "/moderacion/suspender") return json({ ok: true, ...cuerpo });
    if ((m = ruta.match(/^\/(\d+)\/destinatarios\/(\d+)\/avisado-persona$/))) {
      const d = S.destinatarios.find((x) => x.id_empleado === Number(m[2]));
      Object.assign(d, { avisado_persona_por: "Laura Ríos", avisado_persona_en: new Date().toISOString() });
      return json({ ok: true });
    }
    if ((m = ruta.match(/^\/(\d+)\/destinatarios$/))) {
      const filtro = url.searchParams.get("filtro");
      const items = filtro === "confirmaron" ? [{ id_empleado: 20, nombre: "Karla Ortiz", puesto: "Cajera", estado: "confirmado", confirmado_en: hace(30), recordatorios: 0 }] : S.destinatarios.map(destCliente);
      return json({ ok: true, items, conteos: conteos(), filtro, pagina: 1, por_pagina: 50, total: filtro === "faltan" ? 12 : filtro === "confirmaron" ? 30 : 42 });
    }
    if ((m = ruta.match(/^\/(\d+)\/recordar$/))) return json({ ok: true, enviados: 12 });
    if ((m = ruta.match(/^\/(\d+)\/fijar$/))) { S.lista.find((x) => x.id === Number(m[1])).fijado = cuerpo.fijado; return json({ ok: true, fijado: cuerpo.fijado }); }
    if ((m = ruta.match(/^\/(\d+)\/(aprobar|rechazar|archivar)$/))) { const x = S.lista.find((y) => y.id === Number(m[1])); if (x) x.estado = { aprobar: "publicado", rechazar: "rechazado", archivar: "archivado" }[m[2]]; return json({ ok: true }); }
    if ((m = ruta.match(/^\/(\d+)\/constancia\.pdf$/))) return route.fulfill({ status: 200, contentType: "application/pdf", headers: cors, body: "%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF" });
    if ((m = ruta.match(/^\/(\d+)$/)) && metodo === "GET") {
      const fila = S.lista.find((x) => x.id === Number(m[1]));
      const adjuntos = Number(m[1]) === 1 ? AUDITORIA.adjuntos : [];
      return json({ ok: true, comunicado: { ...fila, cuerpo: AUDITORIA.cuerpo, autor: RH, fecha_evento: "2026-12-03", adjuntos, audiencia: { todos: false, sucursales: ["Centro"], areas: [], puestos: [], empleados: [] }, version: 1 }, adjuntos,
        entregas: { app: { destinatarios: 42, vistos: 35 }, push: { activo: true, enviados: 37, fallidos: 0, omitidos: 2, habilitado: true }, correo: { activo: true, enviados: 35, fallidos: 1, omitidos: 0 }, popup: { activo: true, cerrados: 4 } } });
    }
    return json({});
  });
}

async function revisar(page, selector, { movil }) {
  await dormir(400);
  const r = await page.evaluate(({ selector, movil }) => {
    const raiz = document.querySelector(selector);
    if (!raiz) return { falta: selector };
    const anchoDoc = document.documentElement.scrollWidth;
    const chicos = [];
    const letra = [];
    for (const el of raiz.querySelectorAll("button, a[href], input[type=checkbox], input[type=radio], select, input:not([type]), input[type=date], input[type=datetime-local], input[type=url], input[type=search], input[type=number], textarea")) {
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height || getComputedStyle(el).visibility === "hidden" || el.closest(".sr-only")) continue;
      const objetivo = el.closest("label") ?? el;
      const ob = objetivo.getBoundingClientRect();
      if (movil && ob.height < 43.5 && b.height < 43.5) chicos.push(`${el.tagName} «${(el.innerText || el.getAttribute("aria-label") || el.value || "").trim().slice(0, 30)}» ${Math.round(ob.height)}px`);
    }
    const caminante = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    while (caminante.nextNode()) {
      const n = caminante.currentNode;
      if (!n.textContent.trim() || !n.parentElement) continue;
      const estilo = getComputedStyle(n.parentElement);
      if (estilo.display === "none" || n.parentElement.closest(".sr-only, [aria-hidden=true]")) continue;
      if (parseFloat(estilo.fontSize) < 12.99) letra.push(`«${n.textContent.trim().slice(0, 30)}» ${estilo.fontSize}`);
    }
    return { anchoDoc, ventana: window.innerWidth, chicos, letra };
  }, { selector, movil });
  assert.equal(r.falta, undefined, `falta ${r.falta}`);
  assert.ok(r.anchoDoc <= r.ventana, `${selector}: scroll horizontal (${r.anchoDoc} > ${r.ventana})`);
  assert.deepEqual(r.chicos, [], `${selector}: objetivos táctiles < 44 px`);
  assert.deepEqual(r.letra, [], `${selector}: texto < 13 px`);
}

const captura = async (page, nombre, completa = true) => { if (OUT) await page.screenshot({ path: `${OUT}/${nombre}.png`, fullPage: completa }); };
const ultimo = (metodo, ruta) => S.pedidos.filter((x) => x.metodo === metodo && (ruta instanceof RegExp ? ruta.test(x.ruta) : x.ruta === ruta)).at(-1);

async function contexto(browser, { ancho, alto, cookie }) {
  const movil = ancho < 1024;
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, locale: "es-MX", timezoneId: "America/Mexico_City", deviceScaleFactor: movil ? 2 : 1, hasTouch: movil, isMobile: movil, acceptDownloads: true, permissions: ["notifications"] });
  if (cookie) await ctx.addCookies([{ name: "token", value: cookie, url: base }]);
  await instalarMocks(ctx);
  return { ctx, movil };
}

/** El aviso emergente NO se cierra con un clic (o toque) al fondo. */
async function noCierraConFondo(page, movil) {
  const dlg = page.locator("[data-aviso-emergente]");
  await dlg.waitFor({ timeout: 30000 });
  const caja = await dlg.boundingBox();
  const punto = { x: 6, y: Math.max(6, Math.round(caja.y / 2)) };
  if (movil) await page.touchscreen.tap(punto.x, punto.y); else await page.mouse.click(punto.x, punto.y);
  await dormir(500);
  assert.equal(await dlg.count(), 1, "un clic al fondo no cierra el aviso");
  return dlg;
}

async function recorridoPanel(browser, { ancho, alto, sufijo }) {
  S = estadoInicial();
  usuario = LAURA;
  const { ctx, movil } = await contexto(browser, { ancho, alto, cookie: firmar("Recruiter") });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));

  // ——— 1. Lista con resumen y filtros ———
  await page.goto(base + "/panel/comunicados", { waitUntil: "domcontentloaded" });
  await page.locator("[data-comunicado='1']").waitFor({ timeout: 40000 });
  assert.deepEqual(await Promise.all(["publicados_mes", "lectura_promedio", "confirmaciones_pendientes", "programados"].map((k) => page.locator(`[data-kpi='${k}']`).innerText().then((t) => t.split("\n").at(-1).trim()))), ["12", "84 %", "18 personas", "1"]);
  assert.match(await page.locator("[data-comunicado='1']").innerText(), /Auditoría de Protección Civil el jueves 3[\s\S]*Requiere confirmación[\s\S]*Auditoría[\s\S]*Sucursal Centro · 42[\s\S]*App · Correo · Push · Aviso[\s\S]*30 de 42 confirmaron/);
  assert.match(await page.locator("[data-comunicado='2']").innerText(), /Automático[\s\S]*121 lo vieron · 38 felicitaciones/);
  assert.match(await page.locator("[data-comunicado='4']").innerText(), /Programado[\s\S]*Se publica el/);
  assert.equal(await page.locator("[data-comunicado='3'] [aria-label='Fijado en el muro']").count(), 1);
  await page.locator("[data-aviso-aprobar]").getByText("1 publicación de un empleado espera tu aprobación.").waitFor();
  await revisar(page, "[data-pantalla='comunicados']", { movil });
  await captura(page, `1-panel-lista-${sufijo}`);
  await page.getByRole("button", { name: "Requieren confirmación" }).click();
  await page.locator("[data-comunicado='2']").waitFor({ state: "detached" });
  assert.equal(ultimo("GET", "/").params.get("nivel"), "confirmacion");
  // Aprobar el post de un empleado
  await page.getByRole("button", { name: /Por aprobar/ }).click();
  await page.locator("[data-comunicado='5']").getByRole("button", { name: "Aprobar y publicar" }).click();
  await page.getByText("«¡Ganamos el torneo de boliche!» quedó publicada en el muro.").waitFor();
  assert.ok(ultimo("POST", "/5/aprobar"));
  assert.equal(ultimo("POST", "/5/aprobar").cuerpo.empresa, 7);

  // ——— 2. Redactar ———
  await page.goto(base + "/panel/comunicados/nuevo", { waitUntil: "domcontentloaded" });
  await page.locator("[data-pantalla='redactar']").waitFor({ timeout: 30000 });
  await page.getByLabel("Tipo").selectOption("auditoria");
  await page.getByLabel("Título").fill(AUDITORIA.titulo);
  await page.getByLabel("Mensaje").fill(AUDITORIA.cuerpo);
  await page.locator("[data-publicar]").first().click();
  await page.getByText("Elige para quién es").first().waitFor();
  assert.equal(S.pedidos.filter((x) => x.metodo === "POST" && x.ruta === "/").length, 0, "no se manda sin audiencia");
  await page.getByRole("button", { name: "Área, puesto, sucursal o persona" }).click();
  const elegir = page.locator("[data-elegir-audiencia]");
  await elegir.getByRole("tab", { name: "Sucursales" }).click();
  await elegir.getByLabel("Centro").check();
  await page.getByRole("button", { name: "Listo" }).click();
  await page.locator("[data-previa]").getByText("42 empleados activos · 39 con app · 35 con correo").waitFor();
  assert.equal(JSON.parse(ultimo("GET", "/audiencia/previa").params.get("audiencia")).sucursales[0], "Centro");
  await page.locator("[data-entrada-fotos]").setInputFiles([{ name: "f1.png", mimeType: "image/png", buffer: PNG }, { name: "f2.png", mimeType: "image/png", buffer: PNG }]);
  await page.locator("[data-entrada-pdf]").setInputFiles({ name: "checklist-proteccion-civil.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF") });
  await page.locator("[data-pdf-elegido]").getByText("checklist-proteccion-civil.pdf").waitFor();
  assert.equal(await page.locator("[data-foto-nueva]").count(), 2);
  await page.getByLabel("Video de YouTube (opcional)").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await page.locator("[data-youtube-previa='dQw4w9WgXcQ']").waitFor();
  await page.getByLabel("Requiere confirmación de leído").check();
  await page.getByLabel("Correo electrónico").check();
  await page.getByLabel("Aviso emergente").check();
  await page.getByRole("button", { name: "Publicar a 42 personas" }).first().waitFor();
  await revisar(page, "[data-pantalla='redactar']", { movil });
  await captura(page, `2-panel-redactar-${sufijo}`);
  // 422 VALIDACION: el mensaje de cada campo junto al campo
  S.rechazarCrear = true;
  await page.getByRole("button", { name: "Publicar a 42 personas" }).first().click();
  await page.locator("#c-titulo-error").getByText("El título ya existe hoy.").waitFor();
  assert.equal(await page.getByLabel("Título").getAttribute("aria-invalid"), "true");
  await page.getByRole("button", { name: "Publicar a 42 personas" }).first().click();
  await page.locator("[data-pantalla='seguimiento']").waitFor({ timeout: 30000 });
  const post = ultimo("POST", "/");
  assert.ok(post.cuerpo.multipart, "multipart");
  const d = post.cuerpo.datos;
  assert.deepEqual([d.empresa, d.tipo, d.nivel, d.publicar, d.youtube_url, d.recordatorio_auto, d.recordatorios_max], [7, "auditoria", "confirmacion", "ahora", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", true, 3]);
  assert.deepEqual(d.audiencia, { todos: false, sucursales: ["Centro"], areas: [], puestos: [], empleados: [] });
  assert.deepEqual(d.canales, { push: true, correo: true, popup: true });
  assert.equal((post.cuerpo.texto.match(/name="fotos"; filename="f\d\.png"/g) ?? []).length, 2);
  assert.match(post.cuerpo.texto, /name="pdf"; filename="checklist-proteccion-civil\.pdf"\r\nContent-Type: application\/pdf/);

  // ——— 3. Seguimiento ———
  await page.locator("[data-kpi='confirmados']").getByText("30").waitFor({ timeout: 30000 });
  assert.deepEqual(await Promise.all(["confirmados", "vistos", "no_vistos", "sin_canal"].map((k) => page.locator(`[data-kpi='${k}']`).innerText().then((t) => t.split("\n").at(-1).trim()))), ["30", "5", "4", "3"]);
  assert.equal(await page.getByRole("tab", { name: "Faltan (12)" }).getAttribute("aria-selected"), "true");
  assert.match(await page.locator("[data-destinatario='10']").innerText(), /Jorge Ramírez[\s\S]*Almacenista[\s\S]*Abrió \d+:\d{2}, sin confirmar[\s\S]*1 recordatorio/);
  assert.match(await page.locator("[data-entregas]").innerText(), /App[\s\S]*42 destinatarios · 35 lo vieron[\s\S]*Push[\s\S]*37 entregados · 2 sin permiso[\s\S]*Correo[\s\S]*35 enviados · 1 rebotado/);
  assert.match(await page.locator("[data-asi-lo-ven]").innerText(), /Auditoría · requiere confirmación[\s\S]*Adjunto: checklist-proteccion-civil\.pdf/);
  await revisar(page, "[data-pantalla='seguimiento']", { movil });
  await captura(page, `3-panel-seguimiento-${sufijo}`);
  await page.locator("[data-destinatario='13']").getByRole("button", { name: "Marcar avisado en persona" }).click();
  await page.locator("[data-destinatario='13']").getByText(/Avisado en persona por Laura Ríos/).waitFor();
  assert.ok(ultimo("POST", "/1/destinatarios/13/avisado-persona"));
  await page.getByRole("button", { name: "Recordar a los 12 que faltan" }).click();
  await page.getByText("Listo: le recordamos a las 12 personas que faltan.").waitFor();
  const [descarga] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Descargar constancia (PDF)" }).click()]);
  assert.equal(descarga.suggestedFilename(), "constancia-comunicado-1.pdf");
  await page.getByRole("button", { name: "Fijar en el muro" }).click();
  await page.getByText("Fijado arriba del muro.").waitFor();
  assert.equal(ultimo("POST", "/1/fijar").cuerpo.fijado, true);
  await page.getByRole("tab", { name: "Confirmaron (30)" }).click();
  await page.locator("[data-destinatario='20']").getByText(/Confirmó/).waitFor();

  // ——— 4. Automáticos ———
  await page.goto(base + "/panel/comunicados/automaticos", { waitUntil: "domcontentloaded" });
  await page.locator("[data-regla='cumpleanos']").waitFor({ timeout: 30000 });
  assert.match(await page.locator("[data-regla='festivo']").innerText(), /Días festivos oficiales[\s\S]*2 días antes/);
  assert.match(await page.locator("[data-regla='cumpleanos']").innerText(), /8:00 del día/);
  await page.locator("[data-previa-hoy]").getByText("Mañana: 2 cumpleaños y 1 aniversario").waitFor();
  await page.locator("[data-regla='bienvenida']").getByText("No").click();
  await page.getByLabel("Hora").selectOption("09:00");
  await revisar(page, "[data-pantalla='automaticos']", { movil });
  await captura(page, `4-panel-automaticos-${sufijo}`);
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await page.getByText("Comunicados automáticos guardados.").waitFor();
  assert.equal(ultimo("PUT", "/automaticos").cuerpo.reglas.find((r) => r.regla === "bienvenida").activo, true);
  assert.equal(ultimo("PUT", "/config").cuerpo.hora_automaticos, "09:00");

  // ——— 5. Moderación, reglas y portada ———
  await page.goto(base + "/panel/comunicados/moderacion", { waitUntil: "domcontentloaded" });
  await page.locator("[data-comentario-moderar='91']").waitFor({ timeout: 30000 });
  assert.match(await page.locator("[data-comentario-moderar='91']").innerText(), /En «Torneo de fútbol Sucursal Norte» · reportado por 3 personas[\s\S]*Luis Hernández:/);
  assert.equal(await page.locator("[data-portada-editor] img").getAttribute("src"), `${ARCHIVOS}/portada.svg`);
  await revisar(page, "[data-pantalla='moderacion']", { movil });
  await captura(page, `5-panel-moderacion-${sufijo}`);
  await page.locator("[data-comentario-moderar='91']").getByRole("button", { name: "Ocultar comentario" }).click();
  await page.getByText("Comentario oculto (queda en la bitácora).").waitFor();
  assert.equal(ultimo("POST", "/moderacion/comentarios/91").cuerpo.accion, "ocultar");
  await page.getByRole("tab", { name: /Retenidos por palabra/ }).click();
  await page.locator("[data-comentario-moderar='92']").getByRole("button", { name: "Publicarlo" }).click();
  await page.getByText("Comentario publicado.").waitFor();
  await page.getByRole("tab", { name: "Ocultos" }).click();
  await page.locator("[data-comentario-moderar='91']").getByText(/oculto por Laura Ríos/).waitFor();
  await page.getByLabel("Solo RH y dirección").check();
  await page.getByLabel("Palabras bloqueadas").fill("tonto\nidiota, Tonto");
  await page.getByRole("button", { name: "Guardar reglas" }).click();
  await page.getByText("Reglas del muro guardadas.").waitFor();
  const reglas = ultimo("PUT", "/config").cuerpo;
  assert.deepEqual([reglas.publican_jefes, reglas.publican_empleados, reglas.palabras_bloqueadas], [false, false, ["tonto", "idiota"]]);
  await page.locator("[data-entrada-portada]").setInputFiles({ name: "posada.png", mimeType: "image/png", buffer: PNG });
  await page.getByLabel("Título (opcional)").fill("Nueva portada");
  await page.getByLabel("Enlace (opcional, https)").fill("http://uniline.mx");
  await page.getByRole("button", { name: "Guardar portada" }).click();
  await page.getByText("El enlace debe empezar con https://").waitFor();
  assert.equal(ultimo("PUT", "/portada"), undefined, "no se manda un enlace http");
  await page.getByLabel("Enlace (opcional, https)").fill("https://uniline.mx/posada");
  await page.getByRole("button", { name: "Guardar portada" }).click();
  await page.getByText("Portada guardada: ya se ve arriba del muro.").waitFor();
  const portada = ultimo("PUT", "/portada").cuerpo.texto;
  assert.match(portada, /name="imagen"; filename="posada\.png"/);
  assert.match(portada, /name="enlace"\r\n\r\nhttps:\/\/uniline\.mx\/posada/);
  await captura(page, `5b-panel-reglas-portada-${sufijo}`);

  // ——— 6. Aviso emergente en el panel (confirmación): no se cierra con clic al fondo ni con Escape ———
  S.popupPanel = { ...AUDITORIA, cerrar_con: "confirmar" };
  await page.goto(base + "/panel/comunicados", { waitUntil: "domcontentloaded" });
  const dlg = await noCierraConFondo(page, movil);
  await page.keyboard.press("Escape");
  await dormir(300);
  assert.equal(await dlg.count(), 1, "Escape no cierra uno de confirmación");
  assert.ok(await dlg.getByRole("button", { name: "Confirmar de leído" }).isDisabled(), "sin la casilla no se confirma");
  await revisar(page, "[data-aviso-emergente]", { movil });
  await captura(page, `6-panel-aviso-emergente-${sufijo}`, false);
  await dlg.getByLabel("Leí el comunicado y estoy enterado").check();
  await dlg.getByRole("button", { name: "Confirmar de leído" }).click();
  await dlg.waitFor({ state: "detached" });
  assert.match(ultimo("POST", "/popup/1/confirmar").cuerpo.dispositivo, /·/);
  await ctx.close();

  // ——— Acceso de solo consulta («comunicados: ver»): ve todo, sin acciones de publicar, moderar ni configurar ———
  S = estadoInicial();
  permisos = { plantilla: "personalizado", modulos: { comunicados: "ver" }, empresas: [7] };
  const lectura = await contexto(browser, { ancho, alto, cookie: firmar("Recruiter") });
  const pl = await lectura.ctx.newPage();
  pl.on("pageerror", (e) => errores.push(e.message));
  await pl.goto(base + "/panel/comunicados", { waitUntil: "domcontentloaded" });
  await pl.locator("[data-comunicado='1']").waitFor({ timeout: 30000 });
  assert.equal(await pl.getByRole("link", { name: "Nuevo comunicado" }).count(), 0, "sin «Nuevo comunicado»");
  await pl.goto(base + "/panel/comunicados/1", { waitUntil: "domcontentloaded" });
  await pl.locator("[data-destinatario='13']").waitFor({ timeout: 30000 });
  for (const n of ["Fijar en el muro", "Archivar", "Marcar avisado en persona"]) assert.equal(await pl.getByRole("button", { name: n }).count(), 0, n);
  assert.equal(await pl.getByRole("button", { name: /^Recordar a/ }).count(), 0);
  assert.equal(await pl.getByRole("button", { name: "Descargar constancia (PDF)" }).count(), 1, "la constancia sí se descarga");
  await pl.goto(base + "/panel/comunicados/moderacion", { waitUntil: "domcontentloaded" });
  await pl.locator("[data-comentario-moderar='91']").waitFor({ timeout: 30000 });
  assert.equal(await pl.getByRole("button", { name: "Ocultar comentario" }).count(), 0);
  assert.equal(await pl.getByRole("button", { name: "Guardar reglas" }).count(), 0);
  assert.equal(await pl.locator("[data-portada-editor]").count(), 0);
  await lectura.ctx.close();
  permisos = null;
  assert.deepEqual(errores.filter((e) => !/ResizeObserver/i.test(e)), [], `errores de la página: ${errores.join(" | ")}`);
}

async function recorridoEmpleado(browser, { ancho, alto, sufijo }) {
  S = estadoInicial();
  usuario = ANA;
  S.popupMi = { ...S.muro[3], cerrar_con: "posponer" }; // normal (video)
  S.push = sufijo === "390";
  const { ctx, movil } = await contexto(browser, { ancho, alto, cookie: firmar("Empleado", { id_empleado: 44, id_empresa: 7, empresas: [7] }) });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("dialog", (d) => { errores.push(`diálogo inesperado: ${d.message()}`); d.dismiss(); });

  // ——— Liga del correo y del push: /login?next=/mi-espacio/comunicados/<id> → el detalle en Mi espacio ———
  // (Se revisan las redirecciones del middleware sin seguirlas: Next arma la URL con «localhost» y el navegador de la
  // prueba usa 127.0.0.1, otro origen sin la cookie.)
  const ir = async (ruta, cookie) => { const r = await fetch(base + ruta, { redirect: "manual", headers: cookie ? { cookie: `token=${cookie}` } : {} }); return [r.status, new URL(r.headers.get("location") ?? "/", base).pathname + new URL(r.headers.get("location") ?? "/", base).search]; };
  const tokenAna = firmar("Empleado", { id_empleado: 44, id_empresa: 7, empresas: [7] });
  assert.deepEqual(await ir("/mi-espacio/comunicados/1"), [307, "/login?next=%2Fmi-espacio%2Fcomunicados%2F1"], "sin sesión: al login recordando la liga");
  assert.deepEqual(await ir("/login?next=%2Fmi-espacio%2Fcomunicados%2F6", tokenAna), [307, "/mi-espacio/comunicados/6"], "el login respeta next");
  assert.deepEqual(await ir("/mi-espacio/comunicados/6", tokenAna), [307, "/empleado/panel/muro/6"], "empleado: al detalle");
  assert.deepEqual(await ir("/mi-espacio/comunicados/6", firmar("Recruiter")), [307, "/panel/comunicados"], "usuario del panel: a Comunicados");

  // ——— 7. Muro: aviso emergente normal (no cierra al fondo; Escape sí) ———
  await page.goto(base + "/empleado/panel/muro", { waitUntil: "domcontentloaded" });
  const aviso = await noCierraConFondo(page, movil);
  await captura(page, `7a-empleado-aviso-normal-${sufijo}`, false);
  await page.keyboard.press("Escape");
  await aviso.waitFor({ state: "detached" });
  assert.ok(ultimo("POST", "/mi/4/posponer"), "cerrar un normal lo marca visto (posponer)");

  // Portada, franja de pendientes, fijada y publicaciones
  const portada = page.locator("[data-portada]");
  await portada.waitFor({ timeout: 30000 });
  assert.equal(await portada.getAttribute("href"), "https://uniline.mx/posada");
  assert.equal(await portada.getAttribute("target"), "_blank");
  assert.match(await portada.innerText(), /Posada 2026 · ¡ya casi!/);
  assert.match(await page.locator("[data-franja-pendientes]").innerText(), /1 comunicado por confirmar: Auditoría de Protección Civil el jueves 3/);
  assert.equal(await page.locator("[data-franja-pendientes]").getAttribute("href"), "/empleado/panel/muro/1");
  assert.equal(await page.locator("[data-fijadas] [data-post='3']").count(), 1, "fijada arriba");
  assert.match(await page.locator("[data-fijadas] [data-post='3']").innerText(), /Fijada/);
  const torneo = page.locator("[data-post='2']");
  assert.match(await torneo.innerText(), /<img src=x onerror=alert\(1\)>/, "el texto se muestra como texto");
  assert.equal(await page.locator("img[src='x']").count(), 0, "sin HTML del usuario");
  assert.match(await torneo.locator("[data-mosaico='7']").innerText(), /\+4/);
  assert.match(await torneo.innerText(), /Tú y 53 más|53 me gusta/);
  await revisar(page, "[data-pantalla='muro']", { movil });
  await captura(page, `7b-empleado-muro-${sufijo}`);
  // Me gusta optimista
  await torneo.getByRole("button", { name: "Me gusta" }).click();
  await torneo.locator("[data-reacciones]").getByText("Tú y 53 más").waitFor({ timeout: 200 });
  assert.equal(await torneo.getByRole("button", { name: "Me gusta" }).getAttribute("aria-pressed"), "true");
  await dormir(400);
  assert.ok(ultimo("POST", "/mi/2/me-gusta"));
  // Visor de fotos
  await torneo.getByRole("button", { name: "Ver foto 1 de 7" }).click();
  const visor = page.locator("[data-visor]");
  await visor.getByText("Foto 1 de 7").waitFor();
  await visor.getByRole("button", { name: "Foto siguiente" }).click();
  await visor.getByText("Foto 2 de 7").waitFor();
  await page.keyboard.press("ArrowLeft");
  await visor.getByText("Foto 1 de 7").waitFor();
  await captura(page, `7c-empleado-visor-${sufijo}`, false);
  await visor.getByRole("button", { name: "Cerrar fotos" }).click();
  await visor.waitFor({ state: "detached" });
  // Video de YouTube: nada de YouTube hasta tocar; luego el reproductor sin cookies
  const video = page.locator("[data-post='4']");
  assert.equal(await video.locator("iframe").count(), 0);
  await video.getByRole("button", { name: "Reproducir video de YouTube aquí mismo" }).click();
  assert.match(await video.locator("iframe").getAttribute("src"), /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?rel=0&autoplay=1$/);
  // Segunda página (PDF)
  await page.getByRole("button", { name: "Ver más publicaciones" }).click();
  const pdf = page.locator("[data-post='6'] [data-pdf]");
  await pdf.waitFor();
  assert.equal(await pdf.getAttribute("href"), `${ARCHIVOS}/reglamento.pdf`);
  assert.equal(await page.locator("[data-post='6']").getByRole("link", { name: "Comentar" }).count(), 0, "sin comentarios si no se permiten");
  // Push (solo si el servidor lo tiene) y preferencias
  assert.equal(await page.locator("[data-push]").count(), S.push ? 1 : 0, "push solo si está configurado");
  if (S.push) {
    // Chromium sin interfaz responde «denied» a las notificaciones: se revisa que la tarjeta diga lo que corresponde.
    const permiso = await page.evaluate(() => Notification.permission);
    const tarjeta = page.locator("[data-push]");
    if (permiso === "denied") await tarjeta.getByText("Las notificaciones están bloqueadas en este navegador").waitFor();
    else await tarjeta.getByRole("button", { name: "Activar notificaciones" }).waitFor();
  }
  await page.getByLabel("Ocultar mi cumpleaños").check({ force: true });
  await page.getByText("Tu cumpleaños ya no se publicará en el muro.").waitFor();
  assert.equal(ultimo("PUT", "/mi/preferencias").cuerpo.ocultar_cumpleanos, true);
  await captura(page, `7d-empleado-muro-final-${sufijo}`);

  // ——— 8. Detalle: confirmar de leído y comentarios ———
  await page.locator("[data-franja-pendientes]").click();
  await page.locator("[data-pantalla='detalle-post']").waitFor({ timeout: 30000 });
  await page.locator("[data-confirmar]").waitFor({ timeout: 30000 });
  assert.ok(await page.getByRole("button", { name: "Confirmar de leído" }).isDisabled());
  await page.locator("[data-comentario='501']").waitFor();
  await revisar(page, "[data-pantalla='detalle-post']", { movil });
  await captura(page, `8a-empleado-detalle-${sufijo}`);
  await page.getByLabel("Leí el comunicado y estoy enterado").check();
  await page.getByRole("button", { name: "Confirmar de leído" }).click();
  await page.locator("[data-confirmado]").getByText(/Confirmaste de leído el/).waitFor();
  assert.match(ultimo("POST", "/mi/1/confirmar").cuerpo.dispositivo, /·/);
  // Comentar, responder (un nivel), me gusta en comentario, reportar, borrar el propio
  await page.locator("#nuevo-comentario").fill("Yo llevo el botiquín.");
  await page.getByRole("button", { name: "Comentar", exact: true }).click();
  await page.getByText("Yo llevo el botiquín.").waitFor();
  assert.deepEqual(ultimo("POST", "/mi/1/comentarios").cuerpo, { texto: "Yo llevo el botiquín.", padre_id: null });
  await page.locator("[data-comentario='502']").getByRole("button", { name: "Responder" }).click();
  await page.locator("#respuesta-501").fill("¡Cuenten conmigo!");
  await page.locator("[data-escribir='respuesta-501']").getByRole("button", { name: "Responder" }).click();
  await page.getByText("¡Cuenten conmigo!").waitFor();
  assert.equal(ultimo("POST", "/mi/1/comentarios").cuerpo.padre_id, 501, "responder a una respuesta va al comentario raíz");
  await page.locator("#nuevo-comentario").fill("Eso es de tonto");
  await page.getByRole("button", { name: "Comentar", exact: true }).click();
  await page.getByText("Tu comentario quedó en revisión: se publicará cuando RH lo revise.").waitFor();
  await page.locator("[data-me-gusta-comentario='501']").click();
  await page.locator("[data-me-gusta-comentario='501']").getByText("Me gusta (7)").waitFor();
  await page.locator("[data-comentario='501']").getByRole("button", { name: "Reportar" }).click();
  await page.getByRole("dialog", { name: "Reportar comentario" }).getByRole("button", { name: "Reportar" }).click();
  await page.getByText("Gracias. RH revisará el comentario.").waitFor();
  await page.locator("[data-comentario='503']").getByRole("button", { name: "Borrar" }).click();
  await page.getByRole("dialog", { name: "Borrar tu comentario" }).getByRole("button", { name: "Borrar" }).click();
  await page.getByText("Comentario eliminado").waitFor();
  assert.ok(ultimo("DELETE", "/mi/comentarios/503"));
  await revisar(page, "[data-comentarios]", { movil });
  await captura(page, `8b-empleado-comentarios-${sufijo}`);

  // ——— 9. Publicar (queda pendiente de aprobación) ———
  await page.goto(base + "/empleado/panel/muro/publicar", { waitUntil: "domcontentloaded" });
  await page.locator("[data-pantalla='publicar']").waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await page.getByText("Escribe algo para publicar.").waitFor();
  await page.getByLabel("¿Qué quieres compartir?").fill("Foto del convivio de Norte");
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await page.locator("[data-resultado='ok']").getByText(/pendiente de aprobación/).waitFor();
  assert.equal(ultimo("POST", "/mi/publicaciones").cuerpo.datos.cuerpo, "Foto del convivio de Norte");
  await page.locator("[data-mis-publicaciones]").getByText("Motivo: Ya se publicó una igual").waitFor();
  await revisar(page, "[data-pantalla='publicar']", { movil });
  await captura(page, `9-empleado-publicar-${sufijo}`);
  assert.ok(S.pedidos.filter((x) => x.ruta.startsWith("/mi")).every((x) => /^Bearer /.test(x.auth ?? "")), "con la sesión del empleado");
  await ctx.close();
  assert.deepEqual(errores.filter((e) => !/ResizeObserver/i.test(e)), [], `errores de la página: ${errores.join(" | ")}`);
}

try {
  for (let i = 0; i < 90; i++) {
    try { if ((await fetch(base + "/login")).status < 500) break; } catch { /* aún no */ }
    await dormir(500);
  }
  const browser = await chromium.launch();
  for (const [ancho, alto, sufijo] of [[1440, 900, "1440"], [390, 844, "390"]]) {
    await recorridoPanel(browser, { ancho, alto, sufijo });
    console.log(`✔ panel ${sufijo}`);
    await recorridoEmpleado(browser, { ancho, alto, sufijo });
    console.log(`✔ Mi espacio ${sufijo}`);
  }
  await browser.close();
  console.log("verify-comunicados: todo bien");
} finally {
  next.kill("SIGTERM");
}
