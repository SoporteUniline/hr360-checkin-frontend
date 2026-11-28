// Verificación en navegador del SISTEMA DE DISEÑO de formularios (28/11/2026, mockup aprobado; docs/sistema-diseno.md)
// con el backend SIMULADO y datos de demostración, a 1440 y a 390 px. En cada página migrada revisa:
//   · botones de al menos 48 px y el principal de 56 px;
//   · Guardar en azul ADAMIA (#2563eb) y Cancelar gris con contorno (#D1D5DB sobre blanco);
//   · encabezado de página gris (#F3F4F6);
//   · letra de 16 px en escritorio y 17 en celular (la ayuda, la ruta y las etiquetas de estado, marcadas `data-chico`,
//     pueden ser de 15/16);
//   · títulos (h1–h3) en peso 700;
//   · texto gris no más claro que #4B5563;
//   · sin degradados y sin desborde horizontal;
//   · la ventana chica (crear puesto) NO se cierra al hacer clic afuera (sí con Esc, Cancelar o la X).
// Páginas: contrato nuevo (pasos guiados), alta de empleado y la ventana «Nuevo puesto».
//
// Uso (después de «NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build»):
//   CAPTURAS=/ruta PLAYWRIGHT_MODULE_PATH=/opt/node22/lib/node_modules/playwright node scripts/verify-diseno.mjs
//   ETAPA=antes → solo toma las capturas (sirve para comparar antes y después de un cambio de diseño); no revisa nada.
import assert from "node:assert/strict";
import { chromium, contexto, dormir, levantarNext } from "./capturas-ayuda/comun.mjs";

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
const PUESTOS = [{ id_puesto: 1, nombre_puesto: "Cajera", id_empresa: 7, nombre_empresa: "Comercializadora Demo" }, { id_puesto: 2, nombre_puesto: "Almacenista", id_empresa: 7, nombre_empresa: "Comercializadora Demo" }];

function manejar({ ruta, json }) {
  const r = ruta.replace(/^\/checador/, "");
  if (r.startsWith("/empleados/activos")) return json({ data: PERSONAS });
  if (r.startsWith("/empleados/puestos")) return json([{ id: 1, nombre: "Cajera" }, { id: 2, nombre: "Almacenista" }]);
  if (r === "/empleados" || r.startsWith("/empleados?")) return json({ data: PERSONAS, total: PERSONAS.length, page: 1, totalPages: 1 });
  if (r.startsWith("/puestos")) return json({ puestos: PUESTOS, total: PUESTOS.length, page: 1, totalPages: 1 });
  if (ruta.startsWith("/calculos-lft/publico/vacaciones-ley")) return json({ dias: 12, anio_servicio: 1 });
  return undefined;
}

// ——— Reglas del sistema de diseño ———
async function revisarDiseno(page, movil, donde, raizSelector = "[data-vista]") {
  const r = await page.evaluate(({ minimo, raizSelector }) => {
    const raiz = document.querySelector(raizSelector) ?? document.body;
    const visible = (el) => { const b = el.getBoundingClientRect(); const s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
    const rgb = (c) => (c.match(/[\d.]+/g) ?? []).map(Number);
    const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
    const LIMITE_GRIS = lum([75, 85, 99]); // #4B5563
    const chicos = []; const botones = []; const titulos = []; const degradados = []; const grises = [];
    for (const el of raiz.querySelectorAll("*")) {
      if (!visible(el)) continue;
      const s = getComputedStyle(el);
      if (/gradient/.test(s.backgroundImage)) degradados.push(el.tagName);
      const tieneTexto = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      // Pueden ser de 15 px: lo marcado data-chico (ayuda, ruta, etiquetas de estado), la ayuda y el error de los
      // campos de shadcn (form-description / form-message, 15 px en escritorio como el mockup) y los encabezados de tabla.
      const chico = el.closest("[data-chico], [data-slot='form-description'], [data-slot='form-message'], th");
      if (tieneTexto && !chico && parseFloat(s.fontSize) < minimo) chicos.push(`${el.tagName} ${parseFloat(s.fontSize)}px «${el.textContent.trim().slice(0, 40)}»`);
      if (tieneTexto && chico && parseFloat(s.fontSize) < 15) chicos.push(`${el.tagName} ${parseFloat(s.fontSize)}px «${el.textContent.trim().slice(0, 40)}» (data-chico, mínimo 15)`);
      // Botones de acción: ≥ 48 px. No cuentan los de renglones de tabla (44 px), la X de las ventanas (44 px, se
      // revisa aparte) ni los interruptores y casillas.
      if (el.tagName === "BUTTON" && !el.closest("table") && !el.matches("[role=switch], [role=checkbox], [role=radio], [aria-label='Cerrar']") && el.getBoundingClientRect().height < 47.5) botones.push(`«${(el.textContent.trim() || el.getAttribute("aria-label") || "").slice(0, 30)}» ${Math.round(el.getBoundingClientRect().height)}px`);
      if (/^H[1-3]$/.test(el.tagName) && Number(s.fontWeight) !== 700) titulos.push(`${el.tagName} ${s.fontWeight} «${el.textContent.trim().slice(0, 30)}»`);
      if (tieneTexto && !el.closest("button,[disabled],[data-estado]")) {
        const c = rgb(s.color);
        const gris = Math.max(...c.slice(0, 3)) - Math.min(...c.slice(0, 3)) < 40;
        const l = lum(c);
        if (gris && l > LIMITE_GRIS + 0.002 && l < 0.85) grises.push(`${el.tagName} ${s.color} «${el.textContent.trim().slice(0, 30)}»`);
      }
    }
    return { chicos, botones, titulos, degradados, grises, doc: document.documentElement.scrollWidth, ventana: window.innerWidth };
  }, { minimo: movil ? 17 : 16, raizSelector });
  assert.deepEqual(r.chicos, [], `${donde}: letra chica`);
  assert.deepEqual(r.botones, [], `${donde}: botones de menos de 48 px`);
  assert.deepEqual(r.titulos, [], `${donde}: títulos que no son 700`);
  assert.deepEqual(r.degradados, [], `${donde}: fondos degradados`);
  assert.deepEqual(r.grises, [], `${donde}: texto gris más claro que #4B5563`);
  assert.ok(r.doc <= r.ventana + 1, `${donde}: desborde horizontal (${r.doc} > ${r.ventana})`);
}

const estilo = (loc) => loc.evaluate((el) => { const s = getComputedStyle(el); return { fondo: s.backgroundColor, borde: s.borderTopColor, ancho: s.borderTopWidth, alto: el.getBoundingClientRect().height, letra: s.fontSize, peso: s.fontWeight }; });
const AZUL = "rgb(37, 99, 235)";
const BLANCO = "rgb(255, 255, 255)";
const GRIS_FRANJA = "rgb(243, 244, 246)";
const BORDE_CAMPO = "rgb(209, 213, 219)";

/** Guardar azul de 56 px y Cancelar gris con contorno, dentro de `zona`. */
async function revisarBotones(zona, donde, { principal, cancelar = "Cancelar" }) {
  const p = await estilo(zona.getByRole("button", { name: principal }).first());
  assert.equal(p.fondo, AZUL, `${donde}: «${principal}» en azul ADAMIA`);
  assert.ok(p.alto >= 55.5, `${donde}: «${principal}» de 56 px (mide ${p.alto})`);
  assert.equal(p.peso, "600", `${donde}: «${principal}» en peso 600`);
  const c = await estilo(zona.getByRole("button", { name: cancelar }).first());
  assert.deepEqual([c.fondo, c.borde, c.ancho], [BLANCO, BORDE_CAMPO, "1px"], `${donde}: «${cancelar}» gris con contorno`);
  assert.ok(c.alto >= 47.5, `${donde}: «${cancelar}» de 48 px`);
}

const { base, firmar, cerrar } = await levantarNext();
const browser = await chromium.launch({ args: ["--lang=es-MX"] });
let ok = false;
try {
  for (const [ancho, alto, sufijo] of [[1440, 1000, "1440"], [390, 844, "390"]]) {
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
      assert.deepEqual([h1.letra, h1.peso], [movil ? "26px" : "30px", "700"], "contrato: título de página");
      if (movil) {
        assert.match(await page.locator("[data-pasos-movil]").innerText(), /Paso 1 de 5/);
        assert.equal(await page.locator("[data-pasos-lista]").isVisible(), false, "en celular no se ve la lista de pasos");
      } else {
        assert.equal(await page.locator("[data-pasos-lista] [data-paso]").count(), 5, "contrato: 5 pasos a la izquierda");
        assert.equal(await page.locator("[data-pasos-lista] [aria-current=step]").count(), 1);
      }
      const seccion = await estilo(page.locator("[data-seccion-formulario] [data-franja]").first());
      assert.equal(seccion.fondo, GRIS_FRANJA, "contrato: franja gris de la sección");
      const campo = await estilo(page.locator("#ct-puesto"));
      assert.deepEqual([Math.round(campo.alto), campo.letra], movil ? [56, "18px"] : [52, "17px"], "contrato: campo de 52/56 px con letra de 17/18");
      const barra = page.locator("[data-barra-formulario]");
      await revisarBotones(barra, `contrato ${sufijo}`, { principal: "Continuar" });
      await revisarDiseno(page, movil, `contrato paso 1 ${sufijo}`);
      // Continuar con lo obligatorio del paso hecho → paso 2; Atrás regresa.
      await page.locator("#ct-puesto").fill("Cajera");
      await barra.getByRole("button", { name: "Continuar" }).click();
      await page.locator("#ct-periodicidad_pago").waitFor();
      if (movil) assert.match(await page.locator("[data-pasos-movil]").innerText(), /Paso 2 de 5 · Sueldo y pago[\s\S]*40 %/);
      else assert.match(await page.locator("[data-pasos-lista] [data-paso]").first().innerText(), /Listo/);
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
      assert.ok(g.alto >= (movil ? 55.5 : 47.5), `empleado ${sufijo}: Registrar de ${movil ? 56 : 48} px (mide ${g.alto})`);
      const titulos = await page.locator("[data-vista='ficha-empleado'] :is(h1,h2,h3)").evaluateAll((els) => els.filter((e) => e.offsetWidth).map((e) => getComputedStyle(e).fontWeight));
      assert.ok(titulos.length && titulos.every((p) => p === "700"), `empleado ${sufijo}: títulos en 700 (${titulos})`);
      const campoNombre = await estilo(page.locator("[data-vista='ficha-empleado'] input[data-control='campo']").first());
      assert.deepEqual([Math.round(campoNombre.alto), campoNombre.letra], movil ? [56, "18px"] : [52, "17px"], `empleado ${sufijo}: campos de 52/56 px con letra de 17/18`);
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
      assert.ok(x.alto >= 43.5, "ventana: X de 44 px");
      await revisarBotones(ventana, `ventana ${sufijo}`, { principal: "Guardar" });
      await ventana.getByLabel(/Nombre del puesto/).fill("Supervisor de piso");
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
