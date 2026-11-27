// Capturas del Centro de ayuda · arnés común (27/11/2026). Levanta «next start» del build ya hecho, firma sesiones de
// prueba, simula el backend con datos de DEMOSTRACIÓN (nunca datos reales) y guarda cada captura en WebP (calidad ~80,
// máx. ~200 KB) en public/ayuda/capturas/<modulo>/<nombre>.webp. La conversión a WebP usa «sharp», que ya es dependencia
// del proyecto (Next lo usa para las imágenes); Playwright solo guarda PNG o JPEG.
// Uso (después de «NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build»):
//   PLAYWRIGHT_MODULE_PATH=/opt/node22/lib/node_modules/playwright node scripts/capturas-ayuda/<bloque>.mjs
// Cada bloque (comunicados.mjs, primeros-pasos.mjs…) define sus pantallas y su API simulada con `manejar`.
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

export const REPO = process.cwd();
const require = createRequire(REPO + "/package.json");
export const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const sharp = require("sharp");
export const API_ORIGEN = "https://api.prueba.invalid";
export const ARCHIVOS = "https://archivos.prueba.invalid";
export const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
export const hace = (min) => new Date(Date.now() - min * 60000).toISOString();

/** Levanta Next en un puerto libre. → { base, firmar(tipo, extra), cerrar() } */
export async function levantarNext() {
  const secret = randomUUID();
  const reserva = createServer();
  await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
  const port = reserva.address().port;
  await new Promise((r) => reserva.close(r));
  const base = `http://127.0.0.1:${port}`;
  const next = spawn(process.execPath, [REPO + "/node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { cwd: REPO, stdio: "ignore", env: { ...process.env, JWT_SECRET: secret } });
  for (let i = 0; ; i++) {
    try { if ((await fetch(base + "/login")).status < 500) break; } catch { /* aún no */ }
    if (i > 240) { next.kill("SIGTERM"); throw new Error("Next no arrancó (¿falta el build?)"); }
    await dormir(250);
  }
  const firmar = (tipo, extra = {}) => {
    const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
    const payload = Buffer.from(JSON.stringify({ tipo_usuario: tipo, id_usuario: -1, ...extra, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
    return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
  };
  return { base, firmar, cerrar: () => next.kill("SIGTERM") };
}

const svg = (texto, color, w = 1200, h = 800) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${color}"/><text x="${w / 2}" y="${h / 2 + 24}" font-size="72" font-family="sans-serif" fill="#fff" text-anchor="middle">${texto}</text></svg>`;
const COLORES = ["#2563eb", "#0f766e", "#7c3aed", "#b45309", "#be123c", "#334155", "#15803d"];

/**
 * Contexto del navegador con el backend simulado (también lo usa scripts/verify-ayuda.mjs). manejar({ ruta, metodo, url, cuerpo, json, route }) devuelve la
 * respuesta o undefined (entonces responde «{}»). usuario(): el de /users/verify/token en ese momento.
 */
export async function contexto(browser, { base, ancho, alto, cookie = null, usuario, modulos = () => null, manejar = () => undefined }) {
  const movil = ancho < 1024;
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, locale: "es-MX", timezoneId: "America/Mexico_City", deviceScaleFactor: 1, hasTouch: movil, isMobile: movil, reducedMotion: "reduce" });
  if (cookie) await ctx.addCookies([{ name: "token", value: cookie, url: base }]);
  // Sin aviso de cookies en las capturas (ya está decidido en este navegador de prueba).
  await ctx.addInitScript(() => { try { localStorage.setItem("adamia_cookies_publicidad", "rechazadas"); } catch { /* nada */ } });
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" };
    let atendida = false;
    const json = (data, status = 200) => { atendida = true; return route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(data) }); };
    if (url.origin === base) return json({});
    if (url.origin === ARCHIVOS) {
      if (url.pathname.endsWith(".pdf")) return route.fulfill({ status: 200, contentType: "application/pdf", body: "%PDF-1.4\n%%EOF" });
      const n = Number(url.pathname.match(/(\d+)\.svg$/)?.[1] ?? 0);
      const etiqueta = decodeURIComponent(url.pathname.split("/").pop().replace(/-\d+\.svg$|\.svg$/, "")).replace(/-/g, " ");
      return route.fulfill({ status: 200, contentType: "image/svg+xml", body: svg(etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1), COLORES[n % COLORES.length]) });
    }
    if (url.hostname === "i.ytimg.com") return route.fulfill({ status: 200, contentType: "image/svg+xml", body: svg("Video", "#111827") });
    if (url.origin !== API_ORIGEN) return route.abort();
    if (req.method() === "OPTIONS") return json({});
    const ruta = url.pathname.replace(/^\/api/, "");
    // modulos(): { todos, modulos: { idEmpresa: [claves] } } o null (sin filtro de módulos).
    if (ruta === "/users/verify/token") return json({ user: usuario(), ...(modulos() ? { modulos: modulos() } : {}) });
    if (ruta === "/checador/modulos/activos" && modulos()) return json({ ok: true, ...modulos() });
    let cuerpo = null;
    try { cuerpo = JSON.parse(req.postData() ?? "null"); } catch { cuerpo = null; }
    const r = await manejar({ ruta, metodo: req.method(), url, cuerpo, json, route, cors });
    if (!atendida && r === undefined) return json({});
    return r;
  });
  const page = await ctx.newPage();
  return { ctx, page, movil };
}

/**
 * Guarda una captura en public/ayuda/capturas/<modulo>/<nombre>.webp. objetivo: Locator (recorta a ese elemento) o
 * null (la ventana). recorte: { x, y, width, height } de la ventana (p. ej. para dejar fuera un mapa que no carga en la
 * prueba). Baja la calidad si pasa de ~200 KB.
 */
export async function guardar(page, modulo, nombre, { objetivo = null, completa = false, margen = 0, recorte = null } = {}) {
  await dormir(350);
  let png;
  if (recorte) png = await page.screenshot({ clip: recorte });
  else if (objetivo && margen) {
    await objetivo.scrollIntoViewIfNeeded();
    const c = await objetivo.boundingBox();
    const v = page.viewportSize();
    const desp = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
    const x = Math.max(0, c.x + desp.x - margen);
    const y = Math.max(0, c.y + desp.y - margen);
    png = await page.screenshot({ clip: { x, y, width: Math.min(v.width - x, c.width + margen * 2), height: c.height + margen * 2 }, fullPage: true });
  } else png = objetivo ? await objetivo.screenshot() : await page.screenshot({ fullPage: completa });
  const dir = path.join(REPO, "public/ayuda/capturas", modulo);
  mkdirSync(dir, { recursive: true });
  const destino = path.join(dir, `${nombre}.webp`);
  for (const calidad of [80, 72, 64, 56]) {
    writeFileSync(destino, await sharp(png).webp({ quality: calidad, effort: 6 }).toBuffer());
    if (statSync(destino).size <= 200 * 1024) break;
  }
  if (process.env.CAPTURAS) writeFileSync(path.join(process.env.CAPTURAS, `ayuda-${modulo}-${nombre}.png`), png);
  console.log(`  · ${modulo}/${nombre}.webp (${Math.round(statSync(destino).size / 1024)} KB)`);
  return destino;
}
