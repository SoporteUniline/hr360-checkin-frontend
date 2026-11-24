// Regresión: la firma a pantalla completa del celular NO debe
// cerrarse cuando el sistema saca de pantalla completa o hace «atrás» (gesto de borde de Android/iPhone al empezar a
// firmar). Solo se cierra con «X» o al guardar, y conserva lo dibujado. Si el PUT falla (500), el error se ve
// (role="alert"), la firma sigue abierta y el trazo se conserva; no se muestra éxito. Backend simulado en memoria.
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
const estado = { firma: false, puts: 0, fallar: false };

const browser = await chromium.launch();
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" };
  const nuevoContexto = async (opciones) => {
    const ctx = await browser.newContext({ locale: "es-MX", ...opciones });
    await ctx.addCookies([{ name: "token", value: jwt, url: base }]);
    estado.firma = false;
    estado.fallar = false;
    await ctx.route("**/*", async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      if (url.origin === base) return route.continue();
      if (url.hostname !== "api.prueba.invalid") return route.abort();
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
      const ok = (json) => route.fulfill({ status: 200, json, headers: cors });
      const p = url.pathname.replace("/api", "");
      if (p.endsWith("/users/verify/token")) return ok({ user: { id_usuario: 15, id_empleado: 15, tipo_usuario: "Empleado", nombre: "Ana Torres", empresas: [7] } });
      if (p === "/checador/mi-espacio/firma" && req.method() === "PUT") {
        estado.puts += 1;
        if (estado.fallar) return route.fulfill({ status: 500, json: { error: "Falla simulada del servidor" }, headers: cors });
        estado.firma = true;
        return ok({ ok: true });
      }
      if (p === "/checador/mi-espacio/firma") return ok({ ok: true, tiene_firma: estado.firma, tiene_pin: false, firma_actualizada_en: estado.firma ? "2026-11-23 18:00:00" : null, pin_actualizado_en: null, bloqueado_hasta: null });
      return ok({});
    });
    return ctx;
  };
  const trazar = async (pg, lienzo) => {
    const r = await lienzo.boundingBox();
    await pg.mouse.move(r.x + r.width * 0.2, r.y + r.height * 0.5);
    await pg.mouse.down();
    await pg.mouse.move(r.x + r.width * 0.6, r.y + r.height * 0.4, { steps: 8 });
    await pg.mouse.up();
  };
  const probar = async (viewport, nombre) => {
    const ctx = await nuevoContexto({ viewport, hasTouch: true, isMobile: true });
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

    // Abrir, dibujar y guardar con el servidor fallando (500): error visible, sigue abierta, trazo intacto.
    const antes = estado.puts;
    await pg.getByRole("button", { name: "Registrar firma" }).click();
    await dialogo.waitFor();
    await trazar(pg, lienzo);
    estado.fallar = true;
    await guardar.click();
    const alerta = dialogo.getByRole("alert");
    await alerta.waitFor();
    assert.match(await alerta.innerText(), /Falla simulada del servidor/, `${nombre}: muestra el error del servidor`);
    assert.ok(await dialogo.isVisible(), `${nombre}: la firma sigue abierta tras el 500`);
    assert.ok(await guardar.isEnabled(), `${nombre}: conserva el trazo tras el 500`);
    assert.equal(await pg.getByText("Listo, tu firma quedó guardada.").count(), 0, `${nombre}: sin éxito antes de confirmar`);

    // Reintento con el mismo trazo: se manda y se cierra.
    estado.fallar = false;
    await guardar.click();
    await dialogo.waitFor({ state: "detached" });
    assert.equal(estado.puts, antes + 2, `${nombre}: un intento fallido y uno bueno`);
    await pg.getByText("Listo, tu firma quedó guardada.").waitFor();
    assert.equal(new URL(pg.url()).pathname, ruta, `${nombre}: sigue en la página tras guardar`);
    assert.deepEqual(errores, [], `${nombre}: sin errores de página`);
    await ctx.close();
  };
  await probar({ width: 390, height: 844 }, "vertical");
  await probar({ width: 844, height: 390 }, "horizontal");

  // Computadora (lienzo en la página): el 500 también se ve y el trazo se conserva.
  {
    const ctx = await nuevoContexto({ viewport: { width: 1280, height: 800 } });
    const pg = await ctx.newPage();
    await pg.goto(base + "/empleado/panel/mi-firma", { waitUntil: "domcontentloaded" });
    const zona = pg.locator('[data-firma-grande="pagina"]');
    await zona.waitFor({ timeout: 20000 });
    await trazar(pg, zona.locator("canvas"));
    const guardar = zona.getByRole("button", { name: "Guardar firma" });
    estado.fallar = true;
    await guardar.click();
    await zona.getByRole("alert").filter({ hasText: "Falla simulada del servidor" }).waitFor();
    assert.ok(await guardar.isEnabled(), "escritorio: conserva el trazo tras el 500");
    assert.equal(await pg.getByText("Listo, tu firma quedó guardada.").count(), 0, "escritorio: sin éxito antes de confirmar");
    estado.fallar = false;
    await guardar.click();
    await pg.getByText("Listo, tu firma quedó guardada.").waitFor();
    await ctx.close();
  }
  console.log("OK verify-firma-grande: salir de pantalla completa o «atrás» no cierra la firma ni pierde el trazo (vertical y horizontal); «X» y «Guardar» sí cierran, historial limpio; un 500 al guardar se avisa sin cerrar ni perder el trazo (celular y computadora).");
} finally {
  await browser.close();
  try { process.kill(-next.pid); } catch { /* ya terminó */ }
}
