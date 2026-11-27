// Capturas del Centro de ayuda · Primeros pasos: entrar, el panel, Mi espacio, varias empresas y la propia Ayuda (botón
// «?» y «Ayuda»). Datos de demostración: «Uniline» y «Uniline Norte», Laura Ríos (RH), Ana Torres (empleada).
// Guarda en public/ayuda/capturas/primeros-pasos/. Uso: ver scripts/capturas-ayuda/comun.mjs.
import { chromium, contexto, dormir, guardar, levantarNext } from "./comun.mjs";

const M = "primeros-pasos";
const EMPRESAS = [{ id_empresa: 7, nombre: "Uniline", zona_horaria: "America/Mexico_City" }, { id_empresa: 8, nombre: "Uniline Norte", zona_horaria: "America/Monterrey" }];
const LAURA = { id_usuario: 1, tipo_usuario: "Recruiter", nombre: "Laura Ríos", correo: "laura@uniline.mx", id_empresa: 7, empresas: [7, 8], empresas_detalle: EMPRESAS, zona_horaria: "America/Mexico_City" };
const ANA = { tipo_usuario: "Empleado", id_empleado: 44, id_usuario: 44, nombre: "Ana Torres", correo: "ana.torres@uniline.mx", id_empresa: 7, empresas: [7], empresas_detalle: [EMPRESAS[0]], zona_horaria: "America/Mexico_City" };

function manejar({ ruta, json }) {
  if (ruta.startsWith("/checador/comunicados/muro")) return json({ ok: true, portada: null, pendientes_confirmar: 0, puede_participar: true, siguiente: null, items: [] });
  if (ruta === "/checador/comunicados/popup" || ruta === "/checador/comunicados/mi/popup") return json({ ok: true, popup: null });
  if (ruta === "/checador/comunicados") return json({ ok: true, items: [], total: 0, resumen: { publicados_mes: 0, lectura_promedio: null, confirmaciones_pendientes: 0, programados: 0, pendientes_aprobacion: 0 } });
  if (ruta.startsWith("/checador/reloj/registros-del-dia-empleado")) return json({ registrosHoy: [], zona_horaria: "America/Mexico_City" });
  return undefined;
}

const { base, firmar, cerrar } = await levantarNext();
const browser = await chromium.launch({ args: ["--lang=es-MX"] });
try {
  // ——— Entrar (sin sesión) ———
  {
    const { ctx, page } = await contexto(browser, { base, ancho: 1440, alto: 900, usuario: () => null, manejar });
    await page.goto(base + "/login", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Correo electrónico").waitFor({ timeout: 60000 });
    await page.getByLabel("Correo electrónico").fill("laura@uniline.mx");
    await guardar(page, M, "iniciar-sesion");
    await page.goto(base + "/recuperacion", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Enviar código" }).waitFor({ timeout: 60000 });
    await guardar(page, M, "recuperar-contrasena");
    await ctx.close();
    const tel = await contexto(browser, { base, ancho: 390, alto: 844, usuario: () => null, manejar });
    await tel.page.goto(base + "/login", { waitUntil: "domcontentloaded" });
    await tel.page.getByLabel("Correo electrónico").waitFor({ timeout: 60000 });
    await guardar(tel.page, M, "iniciar-sesion-movil");
    await tel.ctx.close();
  }

  // ——— Panel de RH ———
  {
    const { ctx, page } = await contexto(browser, { base, ancho: 1440, alto: 900, cookie: firmar("Recruiter"), usuario: () => LAURA, manejar });
    await page.goto(base + "/panel/muro", { waitUntil: "domcontentloaded" });
    await page.locator("[data-pantalla='muro-panel']").waitFor({ timeout: 60000 });
    await page.locator('[data-sidebar="content"]').getByRole("button", { name: "Centro de ayuda", exact: true }).waitFor({ timeout: 30000 });
    await guardar(page, M, "panel-general");
    await guardar(page, M, "encabezado-panel", { objetivo: page.locator("header").first() });
    await guardar(page, M, "selector-empresa", { objetivo: page.locator("[data-pantalla='muro-panel'] > div").first(), margen: 8 });
    await page.locator('[data-sidebar="footer"] [data-sidebar="menu-button"]').click();
    await page.getByRole("menuitem", { name: "Cerrar sesión" }).waitFor();
    await guardar(page, M, "menu-usuario", { objetivo: page.getByRole("menu") , margen: 12 });
    await page.keyboard.press("Escape");
    // Ayuda: el botón «?» abre la guía de esta pantalla y «Ayuda» lista las guías del rol.
    await page.locator("[data-boton-ayuda]").click();
    await page.locator("[data-panel-ayuda] [data-guia-abierta]").waitFor({ timeout: 30000 });
    await dormir(400);
    await guardar(page, M, "boton-ayuda");
    await page.keyboard.press("Escape");
    await page.goto(base + "/panel/ayuda", { waitUntil: "domcontentloaded" });
    await page.locator("[data-pantalla='ayuda-app'] [data-guia-app]").first().waitFor({ timeout: 60000 });
    await guardar(page, M, "ayuda-panel");
    await ctx.close();
  }

  // ——— Mi espacio (teléfono) ———
  {
    const { ctx, page } = await contexto(browser, { base, ancho: 390, alto: 844, cookie: firmar("Empleado"), usuario: () => ANA, manejar });
    // Inicio y Mi espacio: sus guías (y capturas) están en mi-espacio/ (talento.mjs).
    await page.goto(base + "/empleado/panel/ayuda", { waitUntil: "domcontentloaded" });
    await page.locator("[data-pantalla='ayuda-app'] [data-guia-app]").first().waitFor({ timeout: 60000 });
    await guardar(page, M, "ayuda-movil");
    await ctx.close();
  }
  console.log("capturas de primeros pasos: listas");
} finally {
  await browser.close();
  cerrar();
}
