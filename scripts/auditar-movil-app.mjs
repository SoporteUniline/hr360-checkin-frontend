// Auditoría de la app móvil (reloj checador y vistas del empleado) con la muesca y la barra inferior del iPhone simuladas
// (CDP Emulation.setSafeAreaInsetsOverride: arriba 47 px, abajo 34 px, como un iPhone con Dynamic Island en vertical).
// Mide por pantalla y ancho: 1) contenido debajo de la hora/batería del sistema, 2) botones encima de la barra de inicio,
// 3) desbordes horizontales, 4) textos cortados. Backend simulado: no toca datos reales.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npm run build && node scripts/auditar-movil-app.mjs
//      CAPTURAS=carpeta guarda capturas a 390 px; ANCHOS=320,390 limita los anchos; ESTRICTO=1 sale con error si hay fallas.
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const secreto = crypto.randomBytes(24).toString("hex");
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (tipo) => { const c = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ tipo_usuario: tipo, exp: Math.floor(Date.now() / 1000) + 3600 })}`; return `${c}.${crypto.createHmac("sha256", secreto).update(c).digest("base64url")}`; };
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { stdio: "ignore", detached: true, env: { ...process.env, JWT_SECRET: secreto } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const ARRIBA = 47, ABAJO = 34;
const ANCHOS = (process.env.ANCHOS || "320,375,390,430").split(",").map(Number);

const usuario = { id_usuario: 1, id_empleado: 101, id_empresa: 10, tipo_usuario: "Empleado", esEmpleado: true, nombre: "Alondra Arlin Munguía García", correo: "fixture@example.test", empresas: [10], empresas_detalle: [{ id_empresa: 10, nombre: "Empresa de prueba con nombre largo S.A. de C.V.", zona_horaria: "America/Mexico_City" }] };
const permisos = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, id_empleado: 101, id_tipo_permiso: 2, tipo_permiso_nombre: i % 2 ? "Permiso con goce de sueldo por asunto personal" : "Vacaciones", fecha_inicio: "2026-11-02", fecha_fin: "2026-11-04", estado: ["Pendiente", "Aprobado", "Rechazado"][i % 3], motivo: "Trámite en el registro civil del municipio para acta de nacimiento", dias_trabajo: "Lunes,Martes,Miércoles,Jueves,Viernes", descuenta_vacaciones: 1 }));

function respuesta(p, url, metodo) {
  if (p.endsWith("/users/verify/token")) return { user: usuario };
  if (p.includes("/registros-del-dia")) return { registrosHoy: [{ id: 3, nombre: "Alondra Arlin", apellido_paterno: "Munguía García", entrada: "2026-11-21T15:00:00Z", salida: null, estado: "Abierto" }], activosHoy: 1, totalRegistrosHoy: 1, zona_horaria: "America/Mexico_City" };
  if (/\/panel-empleado\/\d+\/detalle/.test(p)) return { empleado: { nombre: "Alondra Arlin", apellido_paterno: "Munguía García", puesto: "Coordinadora de logística y distribución regional" }, asistencias: { historial: [{ fecha: "2026-11-20", estado: "Presente" }, { fecha: "2026-11-19", estado: "Retardo" }] }, entradas_salidas: { registros: [{ id: 1, fecha: "2026-11-20", hora_entrada: "08:58", hora_salida: "18:02", estado: "A tiempo" }, { id: 2, fecha: "2026-11-19", hora_entrada: "09:12", hora_salida: "-", estado: "Retardo" }] } };
  if (p.endsWith("/vacaciones/mi-saldo")) return { dias_disponibles: 8, dias_cargados: 12, dias_tomados: 4 };
  if (p.includes("/solicitudes-permiso/empleado/")) return { results: permisos.slice(0, 5), total: permisos.length };
  if (p.includes("/holidays/")) return { festivos: [] };
  if (p.endsWith("/tiposPermiso")) return { tiposPermiso: [{ id: 2, nombre: "Vacaciones", es_permiso: 0, descuenta_vacaciones: 1 }, { id: 3, nombre: "Permiso con goce de sueldo por asunto personal", es_permiso: 1 }] };
  if (p.endsWith("/nomina/mis-recibos")) return { ok: true, recibos: [{ id: 11, id_empresa: 10, folio: "N5-11", neto: 12650.5, transferencia: 10000, efectivo: 2650.5, fecha_inicio: "2026-11-01", fecha_fin: "2026-11-15", firma_estatus: "pendiente" }] };
  if (p.endsWith("/nomina/mis-prestamos")) return { ok: true, prestamos: [{ id: 3, id_empresa: 10, monto: 13000, abono: 650, saldo: 11050, estado: "vigente", firma_estatus: "firmado", movimientos: [{ tipo: "abono_nomina", importe: 650, creado_en: "2026-11-16T18:00:00Z" }] }] };
  if (p.includes("/empresas/slug/")) return { id_empresa: 10, nombre: "Empresa de prueba" };
  if (metodo === "GET" && /s$|lista|historial/.test(p)) return [];
  return {};
}

const RUTAS = [
  ["Reloj (empleado)", "/empleado/reloj-checador"],
  ["Reloj (empresa)", "/empresa-prueba"],
  ["Inicio", "/empleado/panel/inicio"],
  ["Asistencia", "/empleado/panel/asistencias"],
  ["Solicitudes", "/empleado/panel/solicitudes"],
  ["Mi espacio", "/empleado/panel/mi-espacio"],
  ["Mis recibos", "/empleado/panel/mis-recibos"],
  ["Mis préstamos", "/empleado/panel/mis-prestamos"],
  ["Mis activos", "/empleado/panel/mis-recursos"],
  ["Evaluaciones", "/empleado/panel/evaluaciones"],
  ["Solicitudes de equipo", "/empleado/panel/solicitudes-equipo"],
  ["Iniciar sesión", "/login"],
];
// Estados extra dentro de una pantalla (pestañas, formularios).
const ESTADOS = {
  "/empleado/panel/solicitudes": [
    ["Nueva solicitud", (pg) => pg.getByRole("button", { name: /Nueva solicitud/ }).click()],
    ["Nueva solicitud por horas", async (pg) => { await pg.getByRole("radio", { name: "Unas horas" }).click(); await pg.getByLabel("Tipo de permiso por horas").selectOption("sale_regresa"); }],
  ],
  "/empleado/reloj-checador": [["Código", (pg) => pg.getByRole("button", { name: /Código/ }).first().click()], ["QR", (pg) => pg.getByRole("button", { name: /^QR/ }).first().click()]],
};

// Se ejecuta en la página: mide contra las zonas del sistema.
function medir({ ARRIBA, ABAJO }) {
  const W = innerWidth, H = innerHeight;
  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < H && r.right > 0 && r.left < W;
  };
  const describe = (el) => {
    const t = (el.getAttribute("aria-label") || el.innerText || el.getAttribute("alt") || el.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ").slice(0, 50);
    return `${el.tagName.toLowerCase()}${t ? ` «${t}»` : ""}`;
  };
  // Parte del elemento que de verdad se ve: recortada por los contenedores con desplazamiento u overflow oculto.
  const visto = (el) => {
    let { top, bottom, left, right } = el.getBoundingClientRect();
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.overflowY !== "visible" || s.overflowX !== "visible") {
        const r = p.getBoundingClientRect();
        top = Math.max(top, r.top); bottom = Math.min(bottom, r.bottom); left = Math.max(left, r.left); right = Math.min(right, r.right);
      }
    }
    return { top, bottom, left, right, vacio: bottom - top < 2 || right - left < 2 };
  };
  const conTexto = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const contenido = [...document.querySelectorAll("body *")].filter((el) => (conTexto(el) || /^(BUTTON|A|IMG|INPUT|SELECT|TEXTAREA|SVG)$/i.test(el.tagName)) && visible(el));
  const interactivo = (el) => /^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(el.tagName) || el.getAttribute("role") === "button";
  const dentroDeScrollX = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const ox = getComputedStyle(p).overflowX; if ((ox === "auto" || ox === "scroll") && p.scrollWidth > p.clientWidth) return true; } return false; };
  const fijoArriba = (el) => { for (let p = el; p && p !== document.body; p = p.parentElement) { const ps = getComputedStyle(p).position; if (ps === "fixed" || ps === "sticky") return true; } return false; };
  const bajoEstado = contenido.filter((el) => { const r = visto(el); return !r.vacio && r.top < ARRIBA - 1 && r.bottom > 2 && (window.scrollY === 0 || fijoArriba(el)); }).map(describe);
  const sobreInicio = contenido.filter((el) => { const r = visto(el); return interactivo(el) && !r.vacio && r.bottom > H - ABAJO + 1 && r.top < H && fijoArriba(el); }).map(describe);
  const desborde = document.documentElement.scrollWidth > W + 1;
  // Los avisos entran deslizándose desde un lado: a media animación no cuentan como desborde (el documento no crece).
  const fuera = contenido.filter((el) => { const r = el.getBoundingClientRect(); return (r.right > W + 1 || r.left < -1) && !dentroDeScrollX(el) && !el.closest(".notistack-SnackbarContainer"); }).map(describe);
  const cortados = contenido.filter((el) => conTexto(el) && el.scrollWidth > el.clientWidth + 1 && /hidden|clip/.test(getComputedStyle(el).overflowX)).map(describe);
  // Avisos (notistack) encima de la barra de inicio o tapando la barra inferior fija de la pantalla.
  const barra = document.querySelector('#reloj-barra-movil, nav[aria-label="Navegación del colaborador"]');
  const techo = barra ? barra.getBoundingClientRect().top : H - ABAJO;
  const avisos = [...document.querySelectorAll(".notistack-SnackbarContainer > *")].filter(visible).filter((el) => el.getBoundingClientRect().bottom > techo + 1 || el.getBoundingClientRect().top < ARRIBA).map(describe);
  const uniq = (a) => [...new Set(a)].slice(0, 8);
  return { avisos: uniq(avisos), bajoEstado: uniq(bajoEstado), sobreInicio: uniq(sobreInicio), desborde, fuera: uniq(fuera), cortados: uniq(cortados), anchoDoc: document.documentElement.scrollWidth };
}

const browser = await chromium.launch();
const reporte = [];
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  for (const ancho of ANCHOS) {
    const ctx = await browser.newContext({ viewport: { width: ancho, height: 844 }, isMobile: true, hasTouch: true, locale: "es-MX", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 AdamiaAppNative" });
    await ctx.addCookies([{ name: "token", value: jwt("Empleado"), url: base }]);
    await ctx.route("**/*", async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      if (url.pathname.startsWith("/api/empresas/check-subscription")) return route.fulfill({ json: { hasActivePlan: true } });
      if (url.origin === base) return route.continue();
      if (url.hostname !== "api.prueba.invalid") return route.abort();
      const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" };
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
      return route.fulfill({ json: respuesta(url.pathname.replace("/api", ""), url, req.method()), headers: cors });
    });
    for (const [nombre, ruta] of RUTAS) {
      if (ruta === "/login") await ctx.clearCookies(); // sin sesión, como la ve quien abre la app
      const pg = await ctx.newPage();
      const cdp = await ctx.newCDPSession(pg);
      await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: { top: ARRIBA, bottom: ABAJO, left: 0, right: 0 } });
      const errores = [];
      pg.on("pageerror", (e) => errores.push(e.message.slice(0, 120)));
      await pg.goto(base + ruta, { waitUntil: "domcontentloaded" }).catch((e) => errores.push(String(e).slice(0, 120)));
      await dormir(2500);
      const estados = [["inicial", null], ...(ESTADOS[ruta] ?? [])];
      for (const [estado, accion] of estados) {
        if (accion) { try { await accion(pg); await dormir(800); } catch (e) { errores.push(`no se pudo abrir ${estado}`); continue; } }
        const m = await pg.evaluate(medir, { ARRIBA, ABAJO });
        reporte.push({ ancho, pantalla: nombre, estado, ruta, ...m, errores: [...errores] });
        if (process.env.CAPTURAS && ancho === 390) await pg.screenshot({ path: `${process.env.CAPTURAS}/movil-${ruta.replace(/\W+/g, "-").replace(/^-|-$/g, "")}-${estado}.png` });
      }
      await pg.close();
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
}

let fallas = 0;
for (const r of reporte) {
  const problemas = [];
  if (r.bajoEstado.length) problemas.push(`debajo de la hora/batería: ${r.bajoEstado.join(", ")}`);
  if (r.sobreInicio.length) problemas.push(`encima de la barra de inicio: ${r.sobreInicio.join(", ")}`);
  if (r.desborde || r.fuera.length) problemas.push(`se sale a lo ancho (${r.anchoDoc}px): ${r.fuera.join(", ")}`);
  if (r.avisos.length) problemas.push(`aviso tapando la barra inferior: ${r.avisos.join(", ")}`);
  if (r.cortados.length) problemas.push(`texto cortado: ${r.cortados.join(", ")}`);
  if (r.errores.length) problemas.push(`errores: ${r.errores.join(" | ")}`);
  fallas += problemas.length ? 1 : 0;
  console.log(`${problemas.length ? "✗" : "✓"} ${r.ancho}px · ${r.pantalla}${r.estado === "inicial" ? "" : ` (${r.estado})`}${problemas.length ? `\n    - ${problemas.join("\n    - ")}` : ""}`);
}
console.log(`\n${reporte.length - fallas} de ${reporte.length} pantallas sin problemas.`);
if (process.env.ESTRICTO && fallas) process.exitCode = 1;
