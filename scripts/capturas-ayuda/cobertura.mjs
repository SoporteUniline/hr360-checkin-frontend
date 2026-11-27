// Capturas del Centro de ayuda · pantallas que se cubrieron al integrar los bloques (27/11/2026): Áreas de Check
// (catalogos/areas-de-check) y la entrada de Evaluación de desempeño (evaluaciones/como-funciona-la-evaluacion).
// Datos de demostración: «Uniline», Laura Ríos (RH). El mapa de Google no carga en la prueba (no hay red): la ventana
// del área se recorta arriba del mapa. Uso: ver scripts/capturas-ayuda/comun.mjs.
import { chromium, contexto, dormir, guardar, levantarNext } from "./comun.mjs";

const EMPRESAS = [{ id_empresa: 7, nombre: "Uniline", zona_horaria: "America/Mexico_City" }];
const LAURA = { id_usuario: 1, tipo_usuario: "Recruiter", nombre: "Laura Ríos", correo: "laura@uniline.mx", id_empresa: 7, empresas: [7], empresas_detalle: EMPRESAS, zona_horaria: "America/Mexico_City" };

const SUCURSALES = [{ id_sucursal: 1, nombre: "Matriz", id_empresa: 7, empresa_nombre: "Uniline" }, { id_sucursal: 2, nombre: "Sucursal Norte", id_empresa: 7, empresa_nombre: "Uniline" }];
const AREAS = [
  { id_area: 1, nombre_area: "Oficina Centro", empresa_nombre: "Uniline", unidad_negocio: "Matriz", radio_metros: 100, latitud: 19.432608, longitud: -99.133209 },
  { id_area: 2, nombre_area: "Almacén Norte", empresa_nombre: "Uniline", unidad_negocio: "Sucursal Norte", radio_metros: 250, latitud: 25.686614, longitud: -100.316113 },
  { id_area: 3, nombre_area: "Obra Lomas", empresa_nombre: "Uniline", unidad_negocio: "Matriz", radio_metros: 400, latitud: 19.420835, longitud: -99.219574 },
];

// Evaluación de desempeño (mismo contrato que scripts/verify-evaluaciones-vistas.mjs).
const EV = "/checador/evaluaciones-desempeno";
const SCOPES_RH = ["templates", "catalogs", "levels", "people", "settings", "permissions", "campaigns", "assignments", "team", "results", "dashboard", "plans", "objectives", "calibration", "feedback"];
const lista = (data) => ({ data, pagination: { page: 1, pageSize: 25, total: data.length } });
const CAMPANAS = [
  { id: 7, name: "Desempeño · Cuarto trimestre 2026", model: "360", dueOn: "2026-12-11", status: "active", submitted: 40, pending: 8 },
  { id: 6, name: "Autoevaluación de ingreso", model: "self", dueOn: "2026-12-18", status: "scheduled", submitted: 0, pending: 12 },
  { id: 5, name: "Desempeño · Tercer trimestre 2026", model: "180", dueOn: "2026-09-30", status: "closed", submitted: 46, pending: 0 },
];

function manejar({ ruta, json }) {
  if (ruta === "/checador/area_check2") return json({ data: AREAS, total: AREAS.length });
  if (ruta.startsWith("/checador/sucursales")) return json({ sucursales: SUCURSALES });
  if (ruta.startsWith(EV)) {
    const e = ruta.slice(EV.length);
    if (e === "/capabilities") return json({ data: { profile: "hr", employeeId: null, userId: 1, scopes: SCOPES_RH, flags: { canViewCampaigns: true, canManageCampaigns: true, canManageTemplates: true }, settings: {}, limits: { templateName: 160, comment: 4000 } } });
    if (e === "/my/assignments") return json(lista([]));
    if (e === "/dashboard") return json({ data: { summary: { campaigns: 3, activeCampaigns: 1, submitted: 86, pending: 20, average: 3.9 } } });
    if (e === "/campaigns") return json(lista(CAMPANAS));
    return json(lista([]));
  }
  if (ruta.startsWith("/checador/comunicados")) return json({ ok: true, items: [], popup: null });
  return undefined;
}

const { base, firmar, cerrar } = await levantarNext();
const browser = await chromium.launch({ args: ["--lang=es-MX"] });
try {
  const { ctx, page } = await contexto(browser, { base, ancho: 1440, alto: 900, cookie: firmar("Recruiter"), usuario: () => LAURA, manejar });
  // ——— Áreas de Check ———
  await page.goto(base + "/panel/catalogos/areas-check", { waitUntil: "domcontentloaded" });
  await page.getByText("Oficina Centro").waitFor({ timeout: 60000 });
  await dormir(600);
  await guardar(page, "catalogos", "areas-de-check");
  await page.getByRole("button", { name: "Nueva área" }).first().click();
  await page.getByText("Define nombre, radio y ubicación en el mapa.").waitFor({ timeout: 30000 });
  const ventana = page.getByText("Define nombre, radio y ubicación en el mapa.").locator("xpath=ancestor::div[contains(@class,'max-w-4xl')][1]");
  await page.getByText("Nombre del área").locator("xpath=following::input[1]").fill("Obra Norte");
  await page.getByLabel("Radio permitido (metros)").fill("150");
  await dormir(400);
  const caja = await ventana.boundingBox();
  const finTexto = await page.getByText("El radio se mide desde el centro").boundingBox();
  await guardar(page, "catalogos", "areas-de-check-nueva", { recorte: { x: caja.x, y: caja.y, width: caja.width, height: finTexto.y + finTexto.height + 16 - caja.y } });
  await page.keyboard.press("Escape");

  // ——— Evaluación de desempeño: la entrada lleva a Campañas ———
  await page.goto(base + "/panel/evaluaciones", { waitUntil: "domcontentloaded" });
  await page.waitForURL("**/panel/evaluaciones/campanas", { timeout: 60000 });
  await page.getByText("Desempeño · Cuarto trimestre 2026").waitFor({ timeout: 30000 });
  await dormir(800);
  await guardar(page, "evaluaciones", "campanas");
  await ctx.close();
} finally {
  await browser.close();
  cerrar();
}
