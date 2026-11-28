// Verificación en navegador del SISTEMA DE DISEÑO de formularios (28/11/2026, mockup aprobado; docs/sistema-diseno.md)
// con el backend SIMULADO y datos de demostración, a 1440 y a 390 px. En cada página migrada revisa:
//   · botones de 38 px en escritorio y de 48 en celular (el principal de 56 en celular); campos de 42 / 56 px
//     (mockup v3, 28/11/2026: en escritorio se usan con el mouse; medidas en scripts/lib/reglasDiseno.mjs);
//   · Guardar en azul ADAMIA (#2563eb) y Cancelar gris con contorno (#D1D5DB sobre blanco);
//   · encabezado de página gris (#F3F4F6);
//   · letra de 16 px en escritorio y 17 en celular (la ayuda, la ruta y las etiquetas de estado, marcadas `data-chico`,
//     y en escritorio las etiquetas de los campos y el texto de los botones pueden ser de 15);
//   · títulos (h1–h3) en peso 700;
//   · texto gris no más claro que #4B5563;
//   · sin degradados y sin desborde horizontal;
//   · la ventana chica (crear puesto) NO se cierra al hacer clic afuera (sí con Esc, Cancelar o la X).
// Páginas: contrato nuevo y editar (pasos en pestañas, grilla a todo el ancho y resumen), alta de empleado y la ventana «Nuevo puesto». El permiso y el acta en página
// se revisan con las mismas reglas (scripts/lib/reglasDiseno.mjs) en scripts/verify-permiso-acta-pagina.mjs.
//
// Uso (después de «NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build»):
//   CAPTURAS=/ruta PLAYWRIGHT_MODULE_PATH=/opt/node22/lib/node_modules/playwright node scripts/verify-diseno.mjs
//   ETAPA=antes → solo toma las capturas (sirve para comparar antes y después de un cambio de diseño); no revisa nada.
//   ANCHOS=1920,1366,390 → otros anchos (por omisión 1440 y 390). Los menores de 1024 px se revisan como celular.
import assert from "node:assert/strict";
import { chromium, contexto, dormir, levantarNext } from "./capturas-ayuda/comun.mjs";
import { minimos, revisarDiseno } from "./lib/reglasDiseno.mjs";

const OUT = process.env.CAPTURAS || null;
const SOLO_CAPTURAS = process.env.ETAPA === "antes";
const PREFIJO = SOLO_CAPTURAS ? "antes" : "despues";
const captura = async (page, nombre) => { if (OUT) await page.screenshot({ path: `${OUT}/${PREFIJO}-${nombre}.png`, fullPage: true }); };

const ZONA = "America/Mexico_City";
const EMPRESA = [{ id_empresa: 7, nombre: "Comercializadora Demo", zona_horaria: ZONA }];
const RH = { id_usuario: 1, tipo_usuario: "Recruiter", nombre: "Usuario", apellido_paterno: "Demo", correo: "rh@demo.mx", id_empresa: 7, empresas: [7], empresas_detalle: EMPRESA, zona_horaria: ZONA };
const PERSONAS = [
  { id_empleado: 15, id_empresa: 7, nombre: "Persona", apellido_paterno: "Uno", apellido_materno: "Demo", puesto: "Cajera", departamento: "Ventas", fecha_ingreso: "2024-03-01", estado: "Activo", correo: "uno@demo.mx" },
  { id_empleado: 16, id_empresa: 7, nombre: "Persona", apellido_paterno: "Dos", apellido_materno: "Demo", puesto: "Almacenista", departamento: "Almacén", fecha_ingreso: "2025-02-01", estado: "Activo", correo: "dos@demo.mx" },
];
// Un contrato vigente para «editar» (datos de demostración; el detalle como lo manda GET /contratos/:id/detalle).
const CONTRATO = {
  id: 41, id_contrato: 41, folio: "CT-2026-0041", id_empresa: 7, id_empleado: 15, nombre_empleado: "Persona Uno Demo", empresa: "Comercializadora Demo",
  puesto: "Cajera", departamento: "Ventas", lugar_trabajo: "Sucursal Centro", tipo_contrato: "indefinido", estatus: "activo", fecha_inicio: "2025-01-10",
  fecha_fin: null, salario_base: 6000, periodicidad_pago: "Quincenal", moneda: "MXN", tipo_jornada: "Diurna", horas_semanales: 48,
  horario: "Entrada: 08:00 | Salida: 16:00 | Comida: 12:00 - 12:30", modalidad_trabajo: "Presencial", jefe_inmediato_id: null, dias_vacaciones: 12,
  aguinaldo_dias: 15, prima_vacacional: 25, prestaciones_superiores: "Vales de despensa", notas: null, congelado: false, fecha_ingreso: "2024-03-01",
};
const DETALLE = {
  contrato: CONTRATO, vigencia: { dias_para_vencer: null },
  sueldo: { salario_base: 6000, periodicidad_pago: "Quincenal", salario_diario: 400, salario_mensual: 12000, pago: { periodicidad: "Quincenal", monto: 6000 } },
  firma: { empleado: { firmado: false }, empresa: { firmado: false }, solicitud: null }, eventos: [], convenios: [], otros_vigentes: [],
};
const PUESTOS = [{ id_puesto: 1, nombre_puesto: "Cajera", id_empresa: 7, nombre_empresa: "Comercializadora Demo" }, { id_puesto: 2, nombre_puesto: "Almacenista", id_empresa: 7, nombre_empresa: "Comercializadora Demo" }];

function manejar({ ruta, json }) {
  const r = ruta.replace(/^\/checador/, "");
  if (r.startsWith("/empleados/activos")) return json({ data: PERSONAS });
  if (r.startsWith("/empleados/puestos")) return json([{ id: 1, nombre: "Cajera" }, { id: 2, nombre: "Almacenista" }]);
  if (r === "/empleados" || r.startsWith("/empleados?")) return json({ data: PERSONAS, total: PERSONAS.length, page: 1, totalPages: 1 });
  if (r.startsWith("/puestos")) return json({ puestos: PUESTOS, total: PUESTOS.length, page: 1, totalPages: 1 });
  if (ruta.startsWith("/calculos-lft/publico/vacaciones-ley")) return json({ dias: 12, anio_servicio: 1 });
  if (r === "/contratos/41/detalle") return json(DETALLE);
  return undefined;
}

const estilo = (loc) => loc.evaluate((el) => { const s = getComputedStyle(el); return { fondo: s.backgroundColor, borde: s.borderTopColor, ancho: s.borderTopWidth, alto: el.getBoundingClientRect().height, letra: s.fontSize, peso: s.fontWeight }; });
const AZUL = "rgb(37, 99, 235)";
const BLANCO = "rgb(255, 255, 255)";
const GRIS_FRANJA = "rgb(243, 244, 246)";
const BORDE_CAMPO = "rgb(209, 213, 219)";

/** Guardar azul (38 px en escritorio, 56 en celular) y Cancelar gris con contorno (38 / 48), dentro de `zona`. */
async function revisarBotones(zona, donde, { principal, cancelar = "Cancelar", movil }) {
  await dormir(400); // los botones cambian de color con transición (transition-colors): se lee ya terminado
  const m = minimos(movil);
  const p = await estilo(zona.getByRole("button", { name: principal }).first());
  assert.equal(p.fondo, AZUL, `${donde}: «${principal}» en azul ADAMIA`);
  assert.ok(movil ? p.alto >= m.principal - 0.5 : Math.round(p.alto) === m.principal, `${donde}: «${principal}» de ${m.principal} px (mide ${p.alto})`);
  assert.equal(p.peso, "600", `${donde}: «${principal}» en peso 600`);
  if (!movil) assert.equal(p.letra, "15px", `${donde}: «${principal}» con letra de 15 px`);
  const c = await estilo(zona.getByRole("button", { name: cancelar }).first());
  assert.deepEqual([c.fondo, c.borde, c.ancho], [BLANCO, BORDE_CAMPO, "1px"], `${donde}: «${cancelar}» gris con contorno`);
  assert.ok(movil ? c.alto >= m.boton - 0.5 : Math.round(c.alto) === m.boton, `${donde}: «${cancelar}» de ${m.boton} px (mide ${c.alto})`);
}

const { base, firmar, cerrar } = await levantarNext();
const browser = await chromium.launch({ args: ["--lang=es-MX"] });
let ok = false;
try {
  const ANCHOS = (process.env.ANCHOS || "1440,390").split(",").map(Number);
  for (const [ancho, alto, sufijo] of ANCHOS.map((a) => [a, a < 1024 ? 844 : a >= 1600 ? 1080 : 900, String(a)])) {
    const movil = ancho < 1024;
    const { ctx, page } = await contexto(browser, { base, ancho, alto, cookie: firmar("Recruiter", { id_usuario: 1 }), usuario: () => RH, manejar });
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message));

    // 1. Contrato nuevo en página con pasos guiados.
    await page.goto(base + "/panel/contratos/nuevo", { waitUntil: "domcontentloaded" });
    await page.locator("#ct-id_empleado").waitFor({ timeout: 60000 });
    await page.locator("#ct-id_empleado").selectOption("15").catch(() => {});
    await dormir(600);
    await captura(page, `contrato-nuevo-${sufijo}`);
    if (!SOLO_CAPTURAS) {
      const enc = await estilo(page.locator("[data-encabezado-pagina]"));
      assert.equal(enc.fondo, GRIS_FRANJA, "contrato: encabezado gris");
      const h1 = await estilo(page.locator("[data-encabezado-pagina] h1"));
      assert.deepEqual([h1.letra, h1.peso], ["26px", "700"], "contrato: título de página de 26 px en 700");
      if (movil) {
        assert.match(await page.locator("[data-pasos-movil]").innerText(), /Paso 1 de 5/);
        assert.equal(await page.locator("[data-pasos-pestanas]").isVisible(), false, "en celular no se ven las pestañas de pasos");
      } else {
        assert.equal(await page.locator("[data-pasos-pestanas] [role=tab]").count(), 5, "contrato: 5 pestañas de pasos arriba");
        assert.equal(await page.locator("[data-pasos-pestanas] [aria-selected=true]").count(), 1);
      }
      const seccion = await estilo(page.locator("[data-seccion-formulario] [data-franja]").first());
      assert.equal(seccion.fondo, GRIS_FRANJA, "contrato: franja gris de la sección");
      const campo = await estilo(page.locator("#ct-puesto"));
      assert.deepEqual([Math.round(campo.alto), campo.letra], movil ? [56, "18px"] : [42, "16px"], "contrato: campo de 42/56 px con letra de 16/18");
      const barra = page.locator("[data-barra-formulario]");
      await revisarBotones(barra, `contrato ${sufijo}`, { principal: "Continuar", movil });
      await revisarDiseno(page, movil, `contrato paso 1 ${sufijo}`);
      // Continuar con lo obligatorio del paso hecho → paso 2; Atrás regresa.
      await page.locator("#ct-puesto").fill("Cajera");
      await barra.getByRole("button", { name: "Continuar" }).click();
      await page.locator("#ct-periodicidad_pago").waitFor();
      if (movil) assert.match(await page.locator("[data-pasos-movil]").innerText(), /Paso 2 de 5 · Sueldo y pago[\s\S]*40 %/);
      else assert.equal(await page.locator("[data-pasos-pestanas] [data-paso]").first().getAttribute("data-estado-paso"), "listo");
      // Error de un campo: borde rojo de 2 px y mensaje debajo.
      await barra.getByRole("button", { name: "Continuar" }).click();
      const conError = await estilo(page.locator("#ct-salario_base"));
      assert.equal(conError.ancho, "2px", "un campo con error lleva borde de 2 px");
      assert.equal(conError.borde, "rgb(220, 38, 38)", "y en rojo #DC2626");
      await page.locator("#ct-salario_base-error").waitFor();
      await captura(page, `contrato-error-${sufijo}`);
      await revisarDiseno(page, movil, `contrato paso 2 con error ${sufijo}`);
      await barra.getByRole("button", { name: "Atrás" }).click();
      await page.locator("#ct-puesto").waitFor();
      // Mockup v3: grilla que se acomoda al ancho (4 columnas desde 1600 px, 3 desde 1200, 2 desde 768, 1 en celular) y
      // resumen a la derecha desde 1200 px (con menos, plegable abajo).
      const columnas = await page.locator("[data-panel='persona'] > div").last().evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
      assert.equal(columnas, ancho >= 1600 ? 4 : ancho >= 1200 ? 3 : ancho >= 768 ? 2 : 1, `contrato ${sufijo}: columnas de la grilla`);
      assert.equal(await page.locator("[data-resumen-formulario]").isVisible(), ancho >= 1200, `contrato ${sufijo}: resumen a la derecha`);
      assert.equal(await page.locator("[data-resumen-plegable]").isVisible(), ancho < 1200, `contrato ${sufijo}: resumen plegable abajo`);
      if (ancho >= 1200) assert.equal(Math.round((await page.locator("[data-resumen-formulario]").boundingBox()).width), 320, "resumen de 320 px");
    }

    // 1b. Editar un contrato: todos los pasos listos, se guarda desde cualquiera; resumen con el sueldo del servidor.
    await page.goto(base + "/panel/contratos/41/editar", { waitUntil: "domcontentloaded" });
    await page.locator("#ct-puesto").waitFor({ timeout: 60000 });
    await dormir(600);
    await captura(page, `contrato-editar-${sufijo}`);
    if (!SOLO_CAPTURAS) {
      if (!movil) assert.equal(await page.locator("[data-pasos-pestanas] [data-estado-paso='listo']").count(), 4, "editar: los otros pasos, listos");
      await revisarBotones(page.locator("[data-barra-formulario]"), `contrato editar ${sufijo}`, { principal: "Guardar cambios", movil });
      await revisarDiseno(page, movil, `contrato editar ${sufijo}`);
      const resumen = page.locator(ancho >= 1200 ? "[data-resumen-formulario]" : "[data-resumen-plegable]");
      if (ancho < 1200) await resumen.locator("summary").click();
      assert.deepEqual(await resumen.locator("[data-resumen] dd").allInnerTexts(),
        ["Persona Uno Demo", "Cajera · Ventas", "$12,000.00", "$6,000.00", "$400.00", "Diurna · 48 h a la semana · 08:00 a 16:00", "10 ene 2025", "Nada"]);
    }

    // 2. Alta de empleado (FormularioEmpleado).
    await page.goto(base + "/panel/empleados", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: movil ? /^Nuevo$/ : "Nuevo empleado" }).first().click({ timeout: 60000 });
    await page.getByRole("tab", { name: "Personal" }).waitFor({ timeout: 60000 });
    await dormir(600);
    await captura(page, `empleado-nuevo-${sufijo}`);
    if (!SOLO_CAPTURAS) {
      const guardar = page.locator("[data-boton-guardar]:visible").first();
      const g = await estilo(guardar);
      assert.equal(g.fondo, AZUL, `empleado ${sufijo}: Registrar en azul`);
      assert.ok(g.alto >= (movil ? 55.5 : 37.5), `empleado ${sufijo}: Registrar de ${movil ? 56 : 38} px (mide ${g.alto})`);
      const titulos = await page.locator("[data-vista='ficha-empleado'] :is(h1,h2,h3)").evaluateAll((els) => els.filter((e) => e.offsetWidth).map((e) => getComputedStyle(e).fontWeight));
      assert.ok(titulos.length && titulos.every((p) => p === "700"), `empleado ${sufijo}: títulos en 700 (${titulos})`);
      const campoNombre = await estilo(page.locator("[data-vista='ficha-empleado'] input[data-control='campo']:visible").first());
      assert.deepEqual([Math.round(campoNombre.alto), campoNombre.letra], movil ? [56, "18px"] : [42, "16px"], `empleado ${sufijo}: campos de 42/56 px con letra de 16/18`);
      const enc = await estilo(page.locator("[data-encabezado-ficha]"));
      assert.equal(enc.fondo, GRIS_FRANJA, `empleado ${sufijo}: encabezado gris`);
      // Las 4 pestañas del alta, cada una con las reglas del sistema de diseño.
      for (const pestana of ["Personal", "Trabajo", "Checador y acceso", "Pago"]) {
        await page.getByRole("tab", { name: pestana }).click();
        await dormir(700);
        await revisarDiseno(page, movil, `empleado alta · ${pestana} ${sufijo}`, "[data-vista='ficha-empleado']");
      }
      await page.getByRole("tab", { name: "Personal" }).click();
    }

    // 3. Ventana chica: crear puesto.
    await page.goto(base + "/panel/catalogos/puestos", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Nuevo puesto" }).first().click({ timeout: 60000 });
    const ventana = page.getByRole("dialog");
    await ventana.waitFor();
    await dormir(500);
    await captura(page, `ventana-puesto-${sufijo}`);
    if (!SOLO_CAPTURAS) {
      const franja = await estilo(ventana.locator("[data-franja]"));
      assert.equal(franja.fondo, GRIS_FRANJA, "ventana: franja gris");
      const x = await estilo(ventana.getByRole("button", { name: "Cerrar" }));
      assert.ok(x.alto >= minimos(movil).icono - 0.5, `ventana: X de ${minimos(movil).icono} px (mide ${x.alto})`);
      // Vacía: Guardar deshabilitado en gris sólido (#E5E7EB), no azul desvanecido.
      assert.equal((await estilo(ventana.getByRole("button", { name: "Guardar" }))).fondo, "rgb(229, 231, 235)", "ventana vacía: Guardar deshabilitado en gris");
      await ventana.getByRole("combobox", { name: /Empresa/ }).click();
      await page.getByRole("option", { name: "Comercializadora Demo" }).click();
      await ventana.getByLabel(/Nombre del puesto/).fill("Supervisor de piso");
      await revisarBotones(ventana, `ventana ${sufijo}`, { principal: "Guardar", movil });
      await revisarDiseno(page, movil, `ventana puesto ${sufijo}`, "[role=dialog]");
      if (movil) await page.touchscreen.tap(6, 6); else await page.mouse.click(6, 6);
      await dormir(400);
      assert.equal(await ventana.count(), 1, "un clic afuera no cierra la ventana chica");
      assert.equal(await ventana.getByLabel(/Nombre del puesto/).inputValue(), "Supervisor de piso", "y no se pierde lo escrito");
      await page.keyboard.press("Escape");
      await ventana.waitFor({ state: "detached", timeout: 5000 });
      await page.getByRole("button", { name: "Nuevo puesto" }).first().click();
      await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();
      await page.getByRole("dialog").waitFor({ state: "detached", timeout: 5000 });
    }

    assert.deepEqual(errores.filter((m) => !/ResizeObserver|hydrat/i.test(m)), [], `errores en la página (${sufijo})`);
    await ctx.close();
    console.log(`✔ ${sufijo}: ${SOLO_CAPTURAS ? "capturas «antes»" : "contrato (pasos, campos, error, botones), alta de empleado y ventana chica según el sistema de diseño"}`);
  }
  ok = true;
} finally {
  await browser.close();
  cerrar();
}
if (!ok) process.exit(1);
