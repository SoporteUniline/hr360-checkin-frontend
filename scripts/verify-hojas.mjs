// Hojas de celular (Drawer, vaul) · 27/11/2026, regla del dueño (docs/vistas-de-detalle.md): una hoja con contenido
// (filtros, detalle) NO se cierra con un toque afuera; solo con su X o botón de cerrar, con Esc o deslizándola. Las que son
// un MENÚ (menú del Navbar en celular, `<DrawerContent menu>`) sí se cierran al tocar afuera.
//   1. Empleados (390 y 360): «Filtros» → toque afuera no cierra; la X de 48 px cierra; Esc cierra.
//   2. Asistencias (390): «Filtros» → toque afuera no cierra; la X cierra; «Ver resultados» cierra.
//   (El menú del Navbar en celular es `menu` y sí se cierra afuera; esa página no se abre con el backend simulado. El
//   comportamiento «menú» se prueba con «Más acciones» en scripts/verify-contratos.mjs.)
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build
//      PLAYWRIGHT_MODULE_PATH=/opt/node22/lib/node_modules/playwright node scripts/verify-hojas.mjs
import assert from "node:assert/strict";
import { chromium, contexto, dormir, levantarNext } from "./capturas-ayuda/comun.mjs";

const OUT = process.env.CAPTURAS || null;
const ZONA = "America/Mexico_City";
const EMPRESA = [{ id_empresa: 7, nombre: "Comercializadora Demo", zona_horaria: ZONA }];
const RH = { id_usuario: 1, tipo_usuario: "Recruiter", nombre: "Laura", apellido_paterno: "Ríos", correo: "laura.rios@demo.mx", id_empresa: 7, empresas: [7], empresas_detalle: EMPRESA, zona_horaria: ZONA };
const EMPLEADOS = [
  { id_empleado: 15, nombre: "Ana", apellido_paterno: "Torres", apellido_materno: "Ruiz", puesto: "Cajera", departamento: "Ventas", estado: "Activo", id_empresa: 7 },
  { id_empleado: 16, nombre: "Beto", apellido_paterno: "Ríos", apellido_materno: "Lara", puesto: "Almacenista", departamento: "Almacén", estado: "Activo", id_empresa: 7 },
];
function manejar({ ruta, metodo, json }) {
  const r = ruta.replace(/^\/checador/, "");
  if (r.startsWith("/empleados") && metodo === "GET" && !/\/\d+/.test(r)) return json({ data: EMPLEADOS, total: EMPLEADOS.length, totalPages: 1, page: 1 });
  if (metodo === "GET") return json([]);
  return undefined;
}

const hoja = (page) => page.locator("[role=dialog]");
const tocarAfuera = async (page) => { await page.touchscreen.tap(6, 6); await dormir(500); };
const ignorar = (m) => /ResizeObserver|Failed to load resource|hydrat/i.test(m);

const { base, firmar, cerrar } = await levantarNext();
const browser = await chromium.launch({ args: ["--lang=es-MX"] });
let ok = false;
try {
  for (const [ancho, alto] of [[390, 844], [360, 780]]) {
    const { ctx, page } = await contexto(browser, { base, ancho, alto, cookie: firmar("Recruiter", { id_usuario: 1 }), usuario: () => RH, manejar });
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message));

    // 1. Empleados.
    await page.goto(base + "/panel/empleados", { waitUntil: "domcontentloaded" });
    const abrir = page.getByRole("button", { name: "Filtros", exact: true });
    await abrir.waitFor({ timeout: 60000 });
    await abrir.click();
    await hoja(page).waitFor({ timeout: 15000 });
    await dormir(600);
    await tocarAfuera(page);
    assert.equal(await hoja(page).count(), 1, `empleados ${ancho}: un toque afuera no cierra los filtros`);
    const x = hoja(page).getByRole("button", { name: "Cerrar filtros" });
    const caja = await x.boundingBox();
    assert.ok(caja.width >= 47.5 && caja.height >= 47.5, `X de 48 px (${caja.width}×${caja.height})`);
    if (OUT) await page.screenshot({ path: `${OUT}/hoja-filtros-empleados-${ancho}.png` });
    await x.click();
    await hoja(page).waitFor({ state: "detached", timeout: 10000 });
    await abrir.click();
    await hoja(page).waitFor({ timeout: 15000 });
    await dormir(400);
    await page.keyboard.press("Escape");
    await hoja(page).waitFor({ state: "detached", timeout: 10000 });

    if (ancho === 390) {
      // 2. Asistencias.
      await page.goto(base + "/panel/registro-asistencia", { waitUntil: "domcontentloaded" });
      const abrirA = page.locator("button:has(svg.lucide-list-filter)").first();
      await abrirA.waitFor({ timeout: 60000 });
      await abrirA.click();
      await hoja(page).waitFor({ timeout: 15000 });
      await dormir(600);
      await tocarAfuera(page);
      assert.equal(await hoja(page).count(), 1, "asistencias: un toque afuera no cierra los filtros");
      await hoja(page).getByRole("button", { name: "Cerrar filtros" }).click();
      await hoja(page).waitFor({ state: "detached", timeout: 10000 });
      await abrirA.click();
      await hoja(page).waitFor({ timeout: 15000 });
      await hoja(page).getByRole("button", { name: "Ver resultados" }).click();
      await hoja(page).waitFor({ state: "detached", timeout: 10000 });
    }

    assert.deepEqual(errores.filter((m) => !ignorar(m)), [], `errores: ${errores.join(" | ")}`);
    await ctx.close();
    console.log(`✔ ${ancho}: los filtros no se cierran al tocar afuera; sí con la X (48 px), Esc${ancho === 390 ? "; asistencias igual y «Ver resultados» cierra" : ""}`);
  }
  ok = true;
  console.log("verify-hojas: todo bien");
} finally {
  await browser.close();
  cerrar();
  await dormir(100);
  if (!ok) process.exitCode = 1;
}
