// Regresión (23/11/2026, «empiezo a escribir y se cierra solo»): la firma a pantalla completa del celular NO debe
// cerrarse cuando el sistema saca de pantalla completa o hace «atrás» (gesto de borde de Android/iPhone al empezar a
// firmar). Solo se cierra con «X» o al guardar, y conserva lo dibujado. Backend simulado en memoria.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npm run build && node scripts/verify-firma-grande.mjs
import assert from "node:assert/strict";
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
const c = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ tipo_usuario: "Empleado", exp: Math.floor(Date.now() / 1000) + 3600 })}`;
const jwt = `${c}.${crypto.createHmac("sha256", secreto).update(c).digest("base64url")}`;
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { stdio: "ignore", detached: true, env: { ...process.env, JWT_SECRET: secreto } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const estado = { firma: false, puts: 0 };

const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" };
  const probar = async (viewport, nombre) => {
    const ctx = await browser.newContext({ viewport, locale: "es-MX", hasTouch: true, isMobile: true });
    await ctx.addCookies([{ name: "token", value: jwt, url: base }]);
    estado.firma = false;
    await ctx.route("**/*", async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      if (url.origin === base) return route.continue();
      if (url.hostname !== "api.prueba.invalid") return route.abort();
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
      const ok = (json) => route.fulfill({ status: 200, json, headers: cors });
      const p = url.pathname.replace("/api", "");
      if (p.endsWith("/users/verify/token")) return ok({ user: { id_usuario: 15, id_empleado: 15, tipo_usuario: "Empleado", nombre: "Ana Torres", empresas: [7] } });
      if (p === "/checador/mi-espacio/firma" && req.method() === "PUT") { estado.puts += 1; estado.firma = true; return ok({ ok: true }); }
      if (p === "/checador/mi-espacio/firma") return ok({ ok: true, tiene_firma: estado.firma, tiene_pin: false, firma_actualizada_en: estado.firma ? "2026-11-23 18:00:00" : null, pin_actualizado_en: null, bloqueado_hasta: null });
      return ok({});
    });
    const pg = await ctx.newPage();
    const errores = [];
    pg.on("pageerror", (e) => errores.push(e.message));
    await pg.goto(base + "/empleado/panel/mi-firma", { waitUntil: "domcontentloaded" });
    const ruta = new URL(pg.url()).pathname;
    await pg.getByRole("button", { name: "Registrar firma" }).click({ timeout: 20000 });
    const dialogo = pg.locator("[data-firma-pantalla]");
    await dialogo.waitFor();
    const lienzo = dialogo.locator("canvas");
    const r = await lienzo.boundingBox();
    // Trazo que arranca pegado al borde (como cuando se dispara el gesto del sistema).
    await pg.mouse.move(r.x + 4, r.y + r.height / 2);
    await pg.mouse.down();
    for (let i = 1; i <= 10; i++) await pg.mouse.move(r.x + 4 + i * (r.width / 14), r.y + r.height / 2 + (i % 2 ? 20 : -20));
    await pg.mouse.up();
    const guardar = dialogo.getByRole("button", { name: "Guardar firma" });
    assert.ok(await guardar.isEnabled(), `${nombre}: hay trazo`);

    // Lo que hace el sistema con el gesto de borde: sale de pantalla completa y/o va «atrás».
    await pg.evaluate(() => (document.fullscreenElement ? document.exitFullscreen() : null));
    await dormir(300);
    await pg.evaluate(() => window.history.back());
    await dormir(800);
    assert.ok(await dialogo.isVisible(), `${nombre}: la firma sigue abierta tras salir de pantalla completa y «atrás»`);
    assert.equal(new URL(pg.url()).pathname, ruta, `${nombre}: no se fue de la página`);
    assert.ok(await guardar.isEnabled(), `${nombre}: conserva lo dibujado`);

    // «X» cierra y deja el historial limpio (sin la entrada propia).
    await dialogo.getByRole("button", { name: "Cerrar sin guardar" }).click();
    await dialogo.waitFor({ state: "detached" });
    await dormir(300);
    assert.equal(new URL(pg.url()).pathname, ruta, `${nombre}: «X» no se va de la página`);
    assert.ok(!(await pg.evaluate(() => window.history.state?.firmaGrande)), `${nombre}: sin entrada propia en el historial`);

    // Abrir, dibujar y guardar: se manda y se cierra.
    const antes = estado.puts;
    await pg.getByRole("button", { name: "Registrar firma" }).click();
    await dialogo.waitFor();
    const r2 = await lienzo.boundingBox();
    await pg.mouse.move(r2.x + r2.width * 0.2, r2.y + r2.height * 0.5);
    await pg.mouse.down();
    await pg.mouse.move(r2.x + r2.width * 0.6, r2.y + r2.height * 0.4, { steps: 8 });
    await pg.mouse.up();
    await guardar.click();
    await dialogo.waitFor({ state: "detached" });
    assert.equal(estado.puts, antes + 1, `${nombre}: guardó una vez`);
    await pg.getByText("Listo, tu firma quedó guardada.").waitFor();
    assert.equal(new URL(pg.url()).pathname, ruta, `${nombre}: sigue en la página tras guardar`);
    assert.deepEqual(errores, [], `${nombre}: sin errores de página`);
    await ctx.close();
  };
  await probar({ width: 390, height: 844 }, "vertical");
  await probar({ width: 844, height: 390 }, "horizontal");
  console.log("OK verify-firma-grande: salir de pantalla completa o «atrás» no cierra la firma ni pierde el trazo (vertical y horizontal); «X» y «Guardar» sí cierran, historial limpio.");
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { /* ya terminó */ }
}
