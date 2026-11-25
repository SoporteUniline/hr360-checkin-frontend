// Verificación en navegador real de «Créditos de Adamia AI» con backend simulado, a 1440 y 390 px:
//   - Dueño/RH: pantalla de créditos con saldo en pesos, aviso de saldo bajo, paquetes con IVA, consumo del mes e historial;
//     nunca muestra costo, margen ni USD. «Recargar» manda empresa + paquete y redirige a Stripe (se intercepta, no se paga).
//   - Regreso de Stripe (?compra=ok&folio=): «confirmando…» mientras el webhook no acredita y «¡Listo!» cuando sí.
//   - Indicador en Adamia AI: «Saldo de Adamia AI: $X MXN» (ya no «Uso … USD»); sin créditos, el 402 muestra «Recargar créditos».
//   - Administrador: KPIs (costo, cobrado, ganancia), aviso de tipo de cambio de más de 30 días, ejemplo de la fórmula
//     ($1 USD × $20 → $40.00), tabla/tarjetas por empresa y regalo con motivo (body exacto, con clave de idempotencia).
//   - Sin desplazamiento lateral, objetivos táctiles ≥ 44 px en celular y sin errores de JavaScript.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build && node scripts/verify-creditos-ia.mjs
// CAPTURAS=<carpeta> guarda capturas (deviceScaleFactor 2).
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const secreto = randomUUID();
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], {
  stdio: "ignore", env: { ...process.env, JWT_SECRET: secreto },
});
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const capturas = process.env.CAPTURAS;
const foto = async (page, nombre, completa = true) => { if (capturas) { await dormir(450); await page.screenshot({ path: `${capturas}/${nombre}.png`, fullPage: completa }); } };

function token(tipo) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const c = `${b({ alg: "HS256", typ: "JWT" })}.${b({ tipo_usuario: tipo, id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })}`;
  return `${c}.${createHmac("sha256", secreto).update(c).digest("base64url")}`;
}

const usuarios = {
  Recruiter: { id_usuario: -1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "Diego Dueño", correo: "dueno@x.mx", empresas: [10],
    empresas_detalle: [{ id_empresa: 10, nombre: "Uniline", estado: "Activo", zona_horaria: "America/Mexico_City" }], zona_horaria: "America/Mexico_City" },
  Admin: { id_usuario: -1, tipo_usuario: "Admin", nombre: "Admin ADAMIA", correo: "admin@adamia.mx" },
};
const paquetes = [{ id: 1, monto_mxn: 200, iva_mxn: 32, total_mxn: 232 }, { id: 2, monto_mxn: 500, iva_mxn: 80, total_mxn: 580 }, { id: 3, monto_mxn: 1000, iva_mxn: 160, total_mxn: 1160 }];
const movimientos = [
  { id: 41, tipo: "consumo", monto_mxn: -0.07, saldo_despues: 84.2, concepto: "Ley Federal del Trabajo", creado_en: "2026-11-25 16:02:11" },
  { id: 40, tipo: "consumo", monto_mxn: -0.31, saldo_despues: 84.27, concepto: "Clima · plan de acción", creado_en: "2026-11-25 15:40:00" },
  { id: 12, tipo: "regalo", monto_mxn: 50, saldo_despues: 84.58, concepto: "Cortesía de bienvenida", creado_en: "2026-11-20 18:00:00" },
  { id: 3, tipo: "compra", monto_mxn: 500, saldo_despues: 500, concepto: "Recarga con Stripe", creado_en: "2026-11-02 17:30:00" },
];
const creditosBase = { ok: true, disponible: true, cobro_activo: true, saldo_mxn: 84.2, ultima_recarga_mxn: 500, saldo_bajo: true, sin_creditos: false,
  paquetes, movimientos, hay_mas: false, mes: "2026-11",
  consumo_mes: [{ funcion: "clima_plan", nombre: "Clima · plan de acción", usos: 12, mxn: 3.72 }, { funcion: "lft", nombre: "Ley Federal del Trabajo", usos: 140, mxn: 9.8 }], compra: null };
const estadoIa = (creditos) => ({ ok: true, activo: true, tope_mensual_usd: 5, limite_hora_usuario: 30, puede_activar: true, gasto_mes_usd: 0.42, usos_mes: 152,
  modelo: "gemini-2.5-flash", lft: { reforma: "2026-05-14", articulos: 1260 }, creditos });
const resumenAdmin = {
  ok: true, mes: "2026-11", cobro_activo: true,
  tipo_cambio: { usd_mxn: 20, fuente: "admin", registrado_en: "2026-10-16 15:00:00", dias: 40, aviso: "El tipo de cambio tiene 40 días. Actualízalo.",
    historial: [{ id: 2, usd_mxn: 20, fecha_referencia: "2026-10-16", fuente: "DOF", registrado_por: "Admin ADAMIA", creado_en: "2026-10-16 15:00:00" }] },
  margen_global: 0.5,
  paquetes: [{ id: 1, monto_mxn: 200, activo: true, orden: 1 }, { id: 2, monto_mxn: 500, activo: true, orden: 2 }, { id: 3, monto_mxn: 1000, activo: true, orden: 3 }],
  empresas: [
    { id_empresa: 10, empresa: "Uniline", usos: 152, costo_usd: 0.6512, costo_usd_whatsapp: 0.31, costo_mxn_cobrado: 6.82, cobrado_mxn: 13.52, ganancia_mxn: 6.7, no_cubierto_mxn: 0,
      precio_sin_cobro_mxn: 0, compras_mxn: 500, ajustes_mxn: 50, saldo_mxn: 84.2, margen: null },
    { id_empresa: 11, empresa: "Distribuidora del Pacífico con un nombre comercial largo", usos: 40, costo_usd: 0.068, costo_usd_whatsapp: 0, costo_mxn_cobrado: 1.36,
      cobrado_mxn: 3.1, ganancia_mxn: 1.74, no_cubierto_mxn: 0.04, precio_sin_cobro_mxn: 0, compras_mxn: 0, ajustes_mxn: 0, saldo_mxn: 0, margen: 0.6 },
  ],
  totales: { costo_usd: 0.7192, costo_usd_whatsapp: 0.31, costo_mxn_cobrado: 8.18, cobrado_mxn: 16.62, ganancia_mxn: 8.44, no_cubierto_mxn: 0.04, precio_sin_cobro_mxn: 0, compras_mxn: 500 },
};

async function contexto(browser, { tipo, ancho, alto, creditos = creditosBase, preguntar = null, compraTras = null }) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 2, locale: "es-MX", timezoneId: "America/Mexico_City",
    hasTouch: ancho < 500, isMobile: ancho < 500 });
  await ctx.addCookies([{ name: "token", value: token(tipo), url: base }]);
  const pedidos = [];
  const stripe = [];
  let consultasCompra = 0;
  const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" };
  await ctx.route("https://checkout.stripe.com/**", (route) => { stripe.push(route.request().url()); return route.fulfill({ status: 200, contentType: "text/html", body: "<h1>Stripe Checkout (simulado)</h1>" }); });
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.hostname === "checkout.stripe.com") return route.fallback();
    if (url.pathname === "/api/empresas/check-status") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ hasActivePlan: true, slug: "uniline" }) });
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    if (url.hostname !== "api.prueba.invalid") return route.abort();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const ok = (json, status = 200) => route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(json) });
    const p = url.pathname.replace("/api", "");
    let cuerpo = null;
    try { cuerpo = req.postDataJSON(); } catch {}
    pedidos.push({ metodo: req.method(), ruta: p, query: url.search, cuerpo });
    if (p.endsWith("/users/verify/token")) return ok({ user: usuarios[tipo] });
    if (p === "/checador/ia/creditos") {
      if (url.searchParams.get("folio") && compraTras) {
        consultasCompra += 1;
        const pagada = consultasCompra >= compraTras;
        return ok({ ...creditos, saldo_mxn: pagada ? 584.2 : creditos.saldo_mxn, saldo_bajo: !pagada, compra: { folio: 5, estado: pagada ? "pagada" : "pendiente" } });
      }
      return ok(creditos);
    }
    if (p === "/checador/ia/creditos/recargar") return ok({ ok: true, url: "https://checkout.stripe.com/c/pay/cs_test_verify", id_compra: 5, simulada: false });
    if (p === "/checador/ia/estado") return ok(estadoIa(creditos));
    if (p === "/checador/ia/lft/preguntar") return preguntar ? ok(...preguntar) : ok({ ok: true, id_conversacion: 1, respuesta: "16 días (Art. 76 LFT).", articulos: [] });
    if (p === "/checador/ia/admin/creditos") return ok(resumenAdmin);
    if (/^\/checador\/ia\/admin\/creditos\/\d+\/movimientos$/.test(p)) {
      if (req.method() === "POST") return ok({ ok: true, duplicado: false, id_movimiento: 99, saldo_mxn: 584.2 }, 201);
      return ok({ ok: true, cuadre: { cuadra: true, suma: 8420, saldo: 8420, movimientos: 4 }, movimientos: movimientos.map((m) => ({ ...m, funcion: null, motivo: m.concepto, referencia: `x:${m.id}`, no_cubierto_mxn: 0, creado_por: "Sistema" })) });
    }
    if (p.endsWith("/checador/asistencias")) return ok({ registros: [], total: 0, page: 1, aplicarPaginacion: false });
    if (p.includes("eventos-checada")) return route.abort();
    return ok({});
  });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  return { ctx, page, pedidos, stripe, errores };
}

const sinDesborde = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const pequenos = (loc) => loc.evaluate((raiz) => [...raiz.querySelectorAll("button, a, input, select, [role=radio]")]
  .filter((el) => el.offsetParent !== null && !el.disabled && !el.classList.contains("sr-only"))
  .map((el) => { const r = el.getBoundingClientRect(); const objetivo = el.closest("label") ?? el; return { t: (el.innerText || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 30), h: Math.round(Math.max(r.height, objetivo.getBoundingClientRect().height)) }; })
  .filter((x) => x.h < 44));
const prohibido = /USD|costo|margen|tipo de cambio|ganancia/i;

let exito = false;
const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(base + "/login")).status) break; } catch {}
    if (i > 200) throw new Error("Next no arrancó");
    await dormir(150);
  }

  for (const [ancho, alto] of [[1440, 900], [390, 844]]) {
    // ───── 1) Pantalla de créditos del dueño + recarga (redirige a Stripe, interceptado) ─────
    {
      const { page, pedidos, stripe, errores } = await contexto(browser, { tipo: "Recruiter", ancho, alto });
      await page.goto(base + "/panel/creditos-ia", { waitUntil: "domcontentloaded" });
      await page.getByRole("heading", { name: "Créditos de Adamia AI" }).waitFor({ timeout: 30000 });
      const saldo = page.locator("[data-saldo]");
      await saldo.waitFor();
      assert.match((await saldo.innerText()).replace(/\s/g, " "), /\$84\.20 MXN/);
      const texto = await page.locator("div.mx-auto.max-w-4xl").innerText();
      assert.ok(!prohibido.test(texto), `el cliente no ve costo ni margen: ${texto.match(prohibido)?.[0]}`);
      assert.match(texto, /bajó del 20 % de tu última recarga/);
      assert.match(texto, /\+ IVA \$80\.00 · total \$580\.00/);
      assert.match(texto, /Ley Federal del Trabajo[\s\S]*140 consultas[\s\S]*\$9\.80/);
      assert.match(texto, /Total[\s\S]*\$13\.52/);
      assert.match(texto, /Cortesía de ADAMIA · Cortesía de bienvenida[\s\S]*\+ \$50\.00/);
      assert.match(texto, /− \$0\.07/);
      assert.match(texto, /El agente de WhatsApp no usa estos créditos/);
      assert.ok(pedidos.some((x) => x.ruta === "/checador/ia/creditos" && /empresa=10/.test(x.query)));
      assert.ok(await sinDesborde(page), `sin desborde lateral a ${ancho}`);
      if (ancho < 500) assert.deepEqual(await pequenos(page.locator("div.mx-auto.max-w-4xl")), [], "táctiles ≥ 44 px");
      await foto(page, `${ancho}-creditos`);
      await Promise.all([page.waitForURL(/checkout\.stripe\.com/), page.getByRole("button", { name: "Recargar $500.00" }).click()]);
      const pedido = pedidos.find((x) => x.ruta === "/checador/ia/creditos/recargar");
      assert.deepEqual(pedido.cuerpo, { empresa: 10, id_paquete: 2 }, "solo empresa y paquete (el monto lo pone el servidor)");
      assert.deepEqual(stripe, ["https://checkout.stripe.com/c/pay/cs_test_verify"]);
      await foto(page, `${ancho}-recarga-stripe`, false);
      assert.deepEqual(errores, [], `sin errores de JS (créditos ${ancho})`);
    }

    // ───── 2) Regreso de Stripe: espera el webhook y luego confirma ─────
    {
      const { page, errores } = await contexto(browser, { tipo: "Recruiter", ancho, alto, compraTras: 2 });
      await page.goto(base + "/panel/creditos-ia?compra=ok&folio=5", { waitUntil: "domcontentloaded" });
      await page.getByText("Estamos confirmando tu pago con el banco (folio IA-5)").waitFor({ timeout: 30000 });
      await foto(page, `${ancho}-regreso-confirmando`, false);
      await page.getByText("¡Listo! Tu recarga (folio IA-5) ya está en tu saldo.").waitFor({ timeout: 15000 });
      assert.match((await page.locator("[data-saldo]").innerText()).replace(/\s/g, " "), /\$584\.20/);
      await foto(page, `${ancho}-regreso-listo`, false);
      assert.deepEqual(errores, []);
    }

    // ───── 3) Indicador en Adamia AI y bloqueo sin créditos ─────
    {
      const sin = { ...creditosBase, saldo_mxn: 0, saldo_bajo: true, sin_creditos: true };
      const { page, errores } = await contexto(browser, { tipo: "Recruiter", ancho, alto, creditos: sin,
        preguntar: [{ ok: false, error: "Sin créditos de Adamia AI. Recarga para seguir usando la IA.", codigo: "IA_SIN_CREDITOS" }, 402] });
      await page.goto(base + "/panel/creditos-ia", { waitUntil: "domcontentloaded" });
      await page.getByRole("heading", { name: "Créditos de Adamia AI" }).waitFor({ timeout: 30000 });
      await page.getByRole("button", { name: "Adamia AI", exact: true }).click();
      const hoja = page.getByRole("dialog", { name: "Adamia AI" });
      await hoja.waitFor();
      const ind = hoja.locator("[data-indicador-creditos]");
      await ind.waitFor();
      assert.match((await ind.innerText()).replace(/\s/g, " "), /Saldo de Adamia AI: \$0\.00 MXN · Sin créditos Recargar/);
      assert.ok(!/Uso este mes/.test(await hoja.innerText()), "ya no muestra el uso en USD");
      assert.equal(await hoja.getByRole("button", { name: "Cambiar tope" }).count(), 0, "con cobro por créditos no hay tope en USD");
      await hoja.getByLabel("Tu pregunta").fill("¿Cuántos días de vacaciones?");
      await hoja.getByRole("button", { name: "Enviar pregunta" }).click();
      const alerta = hoja.getByRole("alert");
      await alerta.waitFor();
      assert.match(await alerta.innerText(), /Sin créditos de Adamia AI\. Recarga para seguir usando la IA\.\s*Recargar créditos/);
      assert.equal(await alerta.getByRole("link", { name: "Recargar créditos" }).getAttribute("href"), "/panel/creditos-ia");
      await foto(page, `${ancho}-indicador-sin-creditos`, false);
      assert.deepEqual(errores, []);
    }

    // ───── 4) Panel del administrador ─────
    {
      const { page, pedidos, errores } = await contexto(browser, { tipo: "Admin", ancho, alto });
      await page.goto(base + "/dashboard/creditos-ia", { waitUntil: "domcontentloaded" });
      await page.getByRole("heading", { name: "Créditos de Adamia AI" }).waitFor({ timeout: 30000 });
      await page.getByText("Cobro por créditos ENCENDIDO").waitFor();
      const raiz = page.locator("div.mx-auto.max-w-6xl");
      const texto = await raiz.innerText();
      assert.match(texto, /Costo de IA\s*\$0\.7192/);
      assert.match(texto, /Ganancia\s*\$8\.44/);
      assert.match(texto, /El tipo de cambio tiene 40 días\. Actualízalo\./);
      assert.match((await page.locator("[data-ejemplo-precio]").innerText()).replace(/\s/g, " "), /costo \$1 USD × \$20\.00 → \$40\.00 MXN \+ IVA/);
      await page.getByLabel("Margen (%)").fill("60");
      assert.match((await page.locator("[data-ejemplo-precio]").innerText()).replace(/\s/g, " "), /→ \$50\.00 MXN/);
      await page.getByLabel("Margen (%)").fill("50");
      assert.match(texto, /Distribuidora del Pacífico/);
      assert.ok(await sinDesborde(page), `sin desborde lateral a ${ancho}`);
      if (ancho < 500) {
        assert.equal(await page.locator("table").isVisible(), false, "en celular, tarjetas en vez de tabla");
        assert.deepEqual(await pequenos(raiz), [], "táctiles ≥ 44 px");
      }
      await foto(page, `${ancho}-admin`);
      // Regalar con motivo.
      await raiz.getByRole("button", { name: /^Regalar$/ }).first().click();
      const dialogo = page.getByRole("dialog", { name: "Regalar o ajustar créditos" });
      await dialogo.waitFor();
      await dialogo.getByRole("button", { name: "Guardar" }).click();
      await dialogo.getByText("Escribe un monto distinto de cero.").waitFor();
      await dialogo.getByLabel(/Monto/).fill("500");
      await dialogo.getByLabel("Motivo").fill("Créditos de arranque");
      await foto(page, `${ancho}-admin-regalo`, false);
      await dialogo.getByRole("button", { name: "Guardar" }).click();
      await dialogo.waitFor({ state: "detached" });
      const p = pedidos.find((x) => x.metodo === "POST" && /\/admin\/creditos\/10\/movimientos$/.test(x.ruta));
      assert.ok(p, "se envió el regalo a la empresa 10");
      assert.deepEqual({ ...p.cuerpo, clave: undefined }, { tipo: "regalo", monto_mxn: 500, motivo: "Créditos de arranque", clave: undefined });
      assert.match(p.cuerpo.clave, /^[\w-]{8,80}$/, "clave de idempotencia");
      assert.deepEqual(errores, [], `sin errores de JS (admin ${ancho})`);
    }
  }

  exito = true;
  console.log("OK · créditos del dueño (saldo, aviso 20 %, paquetes + IVA, consumo, historial; sin costo ni margen) · recarga → Stripe interceptado con solo empresa y paquete · regreso: confirmando → ¡Listo! · indicador «Saldo de Adamia AI: $X MXN» y 402 con «Recargar créditos» · admin (KPIs, aviso TC 40 días, fórmula $1 → $40, regalo con motivo y clave) · 1440 y 390 sin desborde · táctiles ≥ 44 px · sin errores de JS");
} finally {
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
