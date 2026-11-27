// Verificación en navegador de Contratos (27/11/2026) con el backend SIMULADO y datos de demostración. 1440, 390 y 360:
//   1. Lista → la fila abre la vista de detalle (/panel/contratos/[id]); ?id= redirige al detalle.
//   2. Detalle: encabezado limpio (blanco con filo azul, SIN degradado), una acción principal, tarjetas Sueldo («el que
//      usan la nómina…»), Jornada, Prestaciones, Historial y El documento con las dos firmas.
//   3. Firmar como empresa → «Mandar a firmar» genera el PDF en el navegador y pide el enlace al flujo de firma digital
//      (tipo CONTRATO) → la tarjeta de la persona pasa a «enviado».
//   4. Cambiar sueldo con convenio: el servidor recibe el sueldo, la fecha y el motivo; la tarjeta y el historial cambian.
//   5. «Revisar sueldos»: la diferencia ficha ≠ contrato y su solución; la «periodicidad por confirmar» (hoy / como dice
//      y la decisión); la nómina muestra el aviso (con los dos motivos) y no deja autorizar.
//   2b. Editar en página con pestañas (solo manda lo que cambió; sueldo de solo lectura; aviso al salir con cambios).
//   2c. Ventanas: no se cierran con clic o toque afuera; sí con Esc y la X. «Más acciones» (menú) sí.
//   2d. Alta en página: errores por pestaña; duplicar copia condiciones y encadena la renovación.
//   6. Editor de plantillas (categoría Contrato): «Se usa para», «Datos que se llenan solos» insertan {{contrato.*}} y la
//      vista previa con un empleado la llena el servidor.
//   En cada pantalla: letra ≥ 16 px (≥ 17 px en celular, salvo etiquetas y pastillas `data-chico`), títulos en 700,
//   botones ≥ 48 px, sin desborde horizontal y sin fondos degradados.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build
//      CAPTURAS=/ruta PLAYWRIGHT_MODULE_PATH=/opt/node22/lib/node_modules/playwright node scripts/verify-contratos.mjs
import assert from "node:assert/strict";
import { chromium, contexto, dormir, levantarNext } from "./capturas-ayuda/comun.mjs";

const OUT = process.env.CAPTURAS || null;
const captura = async (page, nombre, completa = false) => { if (OUT) await page.screenshot({ path: `${OUT}/${nombre}.png`, fullPage: completa }); };
const ZONA = "America/Mexico_City";
const EMPRESA = [{ id_empresa: 7, nombre: "Comercializadora Demo", zona_horaria: ZONA }];
const RH = { id_usuario: 1, tipo_usuario: "Recruiter", nombre: "Laura", apellido_paterno: "Ríos", correo: "laura.rios@demo.mx", id_empresa: 7, empresas: [7], empresas_detalle: EMPRESA, zona_horaria: ZONA };
const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date());
const enDias = (n) => { const d = new Date(`${hoy}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

const DOCUMENTO = `<h1 style="text-align:center">CONTRATO INDIVIDUAL DE TRABAJO POR TIEMPO INDETERMINADO</h1>
<p>Que celebran, por una parte, <strong>Comercializadora Demo, S.A. de C.V.</strong>, representada por Laura Ríos Méndez, y por la otra <strong>Ana Torres Ruiz</strong>, al tenor de las siguientes cláusulas:</p>
<p><strong>PRIMERA. Puesto y servicios.</strong> La persona trabajadora prestará sus servicios como <strong>Cajera</strong> en <strong>Sucursal Centro</strong> (arts. 20 y 25 de la Ley).</p>
<p><strong>SEXTA. Salario.</strong> La empresa pagará un salario de <strong>$5,250.00 (CINCO MIL DOSCIENTOS CINCUENTA PESOS 00/100 M.N.)</strong> por cada periodo de pago quincenal.</p>
<table style="width:100%"><tr><td>Laura Ríos Méndez<br/>Por LA EMPRESA</td><td>Ana Torres Ruiz<br/>LA PERSONA TRABAJADORA</td></tr></table>`;

function estadoInicial() {
  return {
    contrato: {
      id: 142, id_contrato: 142, folio: "CT-2026-0142", folio_contrato: "CT-2026-0142", id_empresa: 7, id_empleado: 15, nombre_empleado: "Ana Torres Ruiz", empresa: "Comercializadora Demo",
      puesto: "Cajera", departamento: "Ventas", sucursal: "Sucursal Centro", lugar_trabajo: "Sucursal Centro", tipo_contrato: "indefinido", estatus: "activo",
      fecha_inicio: "2025-01-10", fecha_fin: null, salario_base: 5250, periodicidad_pago: "Quincenal", tipo_jornada: "Diurna", horas_semanales: 48,
      horario: "Entrada: 08:00 | Salida: 16:00 | Comida: 12:00 - 12:30", horario_texto: "de 08:00 a 16:00 horas, con descanso para tomar alimentos de 12:00 a 12:30 horas",
      descanso: "domingo", modalidad_trabajo: "Presencial", jefe_inmediato_id: null, moneda: "MXN", dias_vacaciones: 12, aguinaldo_dias: 15, prima_vacacional: 25, prestaciones_superiores: "Vales de despensa, Uniforme",
      notas: null, congelado: false, tiene_pdf: false, fecha_ingreso: "2024-03-01",
    },
    firma: { empleado: { firmado: false, fecha: null }, empresa: { firmado: false, fecha: null, nombre: null }, solicitud: null },
    eventos: [{ id: 1, tipo: "creado", titulo: "Contrato creado · renovación de CT-2024-0098", fecha: "2025-01-10 09:00", nombre_usuario: "Laura Ríos" }],
    convenios: [],
    diferencias: [{ id_empleado: 17, nombre: "Carla Paz Medina", id_contrato: 77, folio: "CT-2025-0077", sueldo_ficha: 6000, periodo_ficha: "Quincenal", salario_contrato: 13000, periodicidad_contrato: "Mensual", contrato_en_periodo_ficha: 6500, diferencia: 500 }],
    // (27/11/2026, opción C) Un contrato con «quincenal» en minúsculas: hoy se paga como mensual.
    periodicidades: [{ motivo: "periodicidad_por_confirmar", id_empleado: 18, nombre: "Dora Gil Mora", id_contrato: 7, folio: "CT-2026-0007", salario_contrato: 5000,
      periodicidad_guardada: "quincenal", periodicidad_como_dice: "Quincenal", hoy: { periodicidad: "Quincenal", mensual: 5000, monto: 2500 },
      como_dice: { periodicidad: "Quincenal", mensual: 10000, monto: 5000 } }],
    pedidos: { periodicidad: [], convenio: [], solicitud: 0, preparar: 0, resolver: [], vistaPrevia: [], editar: [], crear: [] },
  };
}
let E = estadoInicial();
const sd = () => Math.round((E.contrato.salario_base / 15) * 100) / 100;
const detalle = () => ({
  contrato: E.contrato,
  vigencia: { dias_para_vencer: null },
  sueldo: { salario_base: E.contrato.salario_base, periodicidad_pago: E.contrato.periodicidad_pago, salario_diario: sd(), salario_mensual: Math.round(E.contrato.salario_base * 2 * 100) / 100, es_el_vigente: true, diferencia_ficha: null,
    vigente: { origen: "contrato", salario: E.contrato.salario_base, periodicidad: "Quincenal" },
    pago: { periodicidad: "Quincenal", monto: E.contrato.salario_base } },
  vacaciones_ley: 14,
  firma: E.firma, otros_vigentes: [], cadena: { anterior: { id: 98, folio: "CT-2024-0098" }, siguiente: null },
  eventos: [...E.eventos].reverse(), convenios: E.convenios, migracion: true,
});
const LISTA = () => [
  { id: 142, folio: "CT-2026-0142", nombre_empleado: "Ana Torres Ruiz", empresa: "Comercializadora Demo", puesto: "Cajera", tipo_contrato: "indefinido", fecha_inicio: "2025-01-10", fecha_fin: null, estatus: "activo", salario_base: E.contrato.salario_base, id_empresa: 7, id_empleado: 15 },
  { id: 98, folio: "CT-2026-0098", nombre_empleado: "Beto Ríos Lara", empresa: "Comercializadora Demo", puesto: "Almacenista", tipo_contrato: "temporal", fecha_inicio: "2026-06-01", fecha_fin: enDias(12), estatus: "activo", salario_base: 4800, id_empresa: 7, id_empleado: 16 },
];
const BASES = [
  { clave: "indeterminado", tipo_contrato: "indefinido", nombre: "Contrato por tiempo indeterminado (base ADAMIA)", descripcion: "Base sugerida por ADAMIA con cláusulas estándar de la Ley Federal del Trabajo. Revísala con tu abogado antes de usarla.", contenido_html: "<p>{{empleado.nombre_completo}} · {{contrato.sueldo_letra}}</p>" },
  { clave: "determinado", tipo_contrato: "temporal", nombre: "Contrato por tiempo determinado (base ADAMIA)", descripcion: "Base sugerida por ADAMIA con cláusulas estándar de la Ley Federal del Trabajo. Revísala con tu abogado antes de usarla.", contenido_html: "<p>{{contrato.causa}}</p>" },
];
const evento = (tipo, titulo) => E.eventos.push({ id: E.eventos.length + 1, tipo, titulo, fecha: `${hoy} 10:42`, nombre_usuario: "Laura Ríos" });
const NOMINA = () => ({ ok: true, puede_autorizar: true, sueldos_por_revisar: [...E.diferencias.map((d) => ({ motivo: "diferencia", ...d })), ...E.periodicidades],
  periodo: { id: 5, id_empresa: 7, periodicidad: "Quincenal", fecha_inicio: "2026-11-16", fecha_fin: "2026-11-30", estado: "por_autorizar", version: 3, total_neto: 0, total_transferencia: 0, total_efectivo: 0, creado_por_nombre: "Laura Ríos" },
  recibos: [] });

function manejar({ ruta, metodo, cuerpo, json }) {
  const r = ruta.replace(/^\/checador/, "");
  if (r === "/contratos" && metodo === "GET") return json({ data: LISTA(), total: 2, estadisticas: { total: 2, activos: 2, porVencer: 1, vencidos: 0 } });
  if (r === "/contratos/142/detalle") return json(detalle());
  if (r === "/contratos/142/documento") return json({ congelado: E.contrato.congelado, html: DOCUMENTO, faltantes: [], plantilla: { id_plantilla: null, nombre: "Contrato por tiempo indeterminado (base ADAMIA)", origen: "base" } });
  if (r === "/contratos/142/firmar-empresa" && metodo === "POST") {
    E.firma.empresa = { firmado: true, fecha: hoy, nombre: "Laura Ríos" };
    E.contrato.congelado = true;
    evento("firma_empresa", "Firmó la empresa: Laura Ríos");
    return json({ ok: true, firmado_empresa: true, completo: false });
  }
  if (r === "/contratos/142/preparar-firma" && metodo === "POST") { E.pedidos.preparar += 1; return json({ html: DOCUMENTO, hash: "a".repeat(64), folio: "CT-2026-0142" }); }
  if (r === "/firma-digital/solicitudes" && metodo === "POST") {
    E.pedidos.solicitud += 1;
    E.firma.solicitud = { id: 31, estatus: "pendiente", creada: `${hoy} 10:45`, vence: `${enDias(3)} 10:45`, firmada: null };
    evento("enviado_a_firma", "Se mandó a firmar a la persona");
    return json({ success: true, id_solicitud: 31, token: "tok-demo-123", url_firma: "/firmar/tok-demo-123" }, 201);
  }
  if (r === "/firma-digital/solicitudes/documento") return json({ success: true, solicitud: E.firma.solicitud ? { ...E.firma.solicitud, url_firma: "/firmar/tok-demo-123" } : null });
  if (r === "/contratos/142/convenio" && metodo === "POST") {
    E.pedidos.convenio.push(cuerpo);
    const antes = E.contrato.salario_base;
    E.contrato.salario_base = Number(cuerpo.salario_nuevo);
    E.convenios.unshift({ id: 1, salario_anterior: antes, salario_nuevo: E.contrato.salario_base, fecha_efectiva: cuerpo.fecha_efectiva, nombre_usuario: "Laura Ríos" });
    evento("convenio", `Convenio: sueldo $${antes.toLocaleString("es-MX", { minimumFractionDigits: 2 })} → $${E.contrato.salario_base.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`);
    return json({ id_convenio: 1, salario_anterior: antes, salario_nuevo: E.contrato.salario_base, periodicidad: "Quincenal" }, 201);
  }
  // Editar en página (INC-CONTRATO-EDITAR-001) y alta / duplicar.
  if (r === "/contratos/142" && metodo === "PUT") {
    E.pedidos.editar.push(cuerpo);
    Object.assign(E.contrato, cuerpo);
    evento("editado", "Datos del contrato editados");
    return json({ ok: true, cerrados: [] });
  }
  if (r === "/contratos" && metodo === "POST") { E.pedidos.crear.push(cuerpo); return json({ id: 142, folio: "CT-2026-0143", cerrados: ["CT-2026-0142"] }, 201); }
  if (r.startsWith("/empleados/activos")) {
    return json({ data: [{ id_empleado: 15, nombre: "Ana", apellido_paterno: "Torres", apellido_materno: "Ruiz", puesto: "Cajera", departamento: "Ventas", fecha_ingreso: "2024-03-01" },
      { id_empleado: 16, nombre: "Beto", apellido_paterno: "Ríos", apellido_materno: "Lara", puesto: "Almacenista", departamento: "Almacén", fecha_ingreso: "2025-02-01" }] });
  }
  if (r.startsWith("/empleados/puestos")) return json([{ id: 1, nombre: "Cajera" }, { id: 2, nombre: "Almacenista" }]);
  if (r.startsWith("/calculos-lft/publico/vacaciones-ley")) return json({ dias: 14, anio_servicio: 2 });
  if (r === "/contratos/revisar-sueldos") return json({ diferencias: E.diferencias, periodicidades: E.periodicidades, duplicados: [], migracion: true });
  if (r === "/contratos/periodicidad/resolver" && metodo === "POST") {
    E.pedidos.periodicidad.push(cuerpo);
    E.periodicidades = E.periodicidades.filter((x) => x.id_contrato !== cuerpo.id_contrato);
    return json({ ok: true, antes: "quincenal", despues: cuerpo.decision === "mensual" ? "Mensual" : "Quincenal", salario_base: 5000 });
  }
  if (r === "/contratos/revisar-sueldos/resolver" && metodo === "POST") {
    E.pedidos.resolver.push(cuerpo);
    E.diferencias = E.diferencias.filter((d) => d.id_empleado !== cuerpo.id_empleado);
    return json({ ok: true, decision: cuerpo.decision });
  }
  if (r === "/contratos/plantillas-base") return json({ bases: BASES, variables: [] });
  if (r === "/contratos/142/vista-previa" && metodo === "POST") {
    E.pedidos.vistaPrevia.push(cuerpo.contenido_html);
    return json({ html: String(cuerpo.contenido_html).replace(/\{\{\s*contrato\.sueldo_letra\s*\}\}/g, "CINCO MIL DOSCIENTOS CINCUENTA PESOS 00/100 M.N."), faltantes: [] });
  }
  if (r === "/nomina/periodos/5") return json(NOMINA());
  if (r.startsWith("/nomina/periodos")) return json({ ok: true, periodos: [], puede_autorizar: true });
  if (r.startsWith("/gestion-documental/plantillas")) return json({ data: [], total: 0 });
  if (/^\/empresas\/\d+$/.test(ruta)) return json({ id_empresa: 7, nombre_empresa: "Comercializadora Demo", url_imagen: null });
  if (metodo === "GET") return json([]);
  return undefined;
}

// ——— Reglas de lectura del dueño ———
async function revisarLectura(page, movil, donde) {
  const r = await page.evaluate((minimo) => {
    const raiz = document.querySelector("[data-vista]") ?? document.body;
    const visible = (el) => { const b = el.getBoundingClientRect(); const s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
    const chicos = [];
    const botones = [];
    const titulos = [];
    const degradados = [];
    for (const el of raiz.querySelectorAll("*")) {
      if (!visible(el)) continue;
      const s = getComputedStyle(el);
      if (/gradient/.test(s.backgroundImage)) degradados.push(el.tagName);
      const tieneTexto = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (tieneTexto && !el.closest("[data-chico]") && parseFloat(s.fontSize) < minimo) chicos.push(`${el.tagName} ${parseFloat(s.fontSize)}px «${el.textContent.trim().slice(0, 40)}»`);
      if ((el.tagName === "BUTTON" || el.hasAttribute("data-accion")) && el.getBoundingClientRect().height < 47.5) botones.push(`«${el.textContent.trim().slice(0, 30)}» ${Math.round(el.getBoundingClientRect().height)}px`);
      if (/^H[1-3]$/.test(el.tagName) && Number(s.fontWeight) !== 700) titulos.push(`${el.tagName} ${s.fontWeight}`);
    }
    return { chicos, botones, titulos, degradados, doc: document.documentElement.scrollWidth, ventana: window.innerWidth };
  }, movil ? 17 : 16);
  assert.deepEqual(r.chicos, [], `${donde}: letra chica`);
  assert.deepEqual(r.botones, [], `${donde}: botones de menos de 48 px`);
  assert.deepEqual(r.titulos, [], `${donde}: títulos que no son 700`);
  assert.deepEqual(r.degradados, [], `${donde}: fondos degradados`);
  assert.ok(r.doc <= r.ventana + 1, `${donde}: scroll horizontal (${r.doc} > ${r.ventana})`);
}
const ignorar = (m) => /ResizeObserver|Failed to load resource|hydrat/i.test(m);

const { base, firmar, cerrar } = await levantarNext();
const browser = await chromium.launch({ args: ["--lang=es-MX"] });
let ok = false;
try {
  for (const [ancho, alto, sufijo] of [[1440, 1000, "1440"], [390, 844, "390"], [360, 780, "360"]]) {
    E = estadoInicial();
    const movil = ancho < 1024;
    const completo = ancho !== 360;
    const { ctx, page } = await contexto(browser, { base, ancho, alto, cookie: firmar("Recruiter", { id_usuario: 1 }), usuario: () => RH, manejar });
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message));
    // Botón de acción visible: en escritorio la barra; en celular la barra fija o «Más acciones».
    const accion = async (texto) => {
      if (!movil) return page.getByRole("toolbar", { name: "Acciones del contrato" }).getByRole("button", { name: texto, exact: true }).click();
      // Radix deja el resto de la página «aria-hidden» mientras cierra un diálogo: se espera a que se vaya.
      await page.locator("[role=dialog]").first().waitFor({ state: "detached", timeout: 15000 }).catch(() => {});
      await dormir(300);
      const barra = page.locator("[data-barra-movil]");
      const boton = barra.locator("[data-accion]").filter({ hasText: new RegExp(`^${texto.replace(/[()]/g, "\\$&")}$`) });
      if (await boton.count()) return boton.click();
      await barra.getByRole("button", { name: "Más acciones" }).click();
      return page.getByRole("dialog").getByRole("button", { name: texto, exact: true }).click();
    };

    // 1. Lista → detalle; ?id= redirige.
    await page.goto(base + "/panel/contratos", { waitUntil: "domcontentloaded" });
    await page.locator("[data-abrir-contrato='142']").waitFor({ timeout: 60000 });
    await page.locator("[data-abrir-contrato='142']").click();
    await page.waitForURL(/\/panel\/contratos\/142$/, { timeout: 30000 });
    await page.getByRole("heading", { level: 1, name: "Ana Torres Ruiz" }).waitFor({ timeout: 30000 });
    await page.goto(base + "/panel/contratos?id=142", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/panel\/contratos\/142$/, { timeout: 30000 });
    await page.locator("[data-tarjeta='sueldo']").waitFor({ timeout: 30000 });

    // 2. Detalle según la maqueta, sin degradado.
    const enc = await page.locator("[data-encabezado-detalle]").evaluate((el) => { const s = getComputedStyle(el); return { fondo: s.backgroundImage, color: s.backgroundColor, filo: s.borderTopWidth, colorFilo: s.borderTopColor }; });
    assert.deepEqual([enc.fondo, enc.color, enc.filo, enc.colorFilo], ["none", "rgb(255, 255, 255)", "4px", "rgb(44, 86, 232)"], "encabezado blanco con filo azul de 4 px");
    await page.getByText("CONTRATO CT-2026-0142 · TIEMPO INDETERMINADO", { exact: false }).first().waitFor();
    assert.equal(await page.locator("[data-sueldo]").innerText(), "$10,500 al mes");
    await page.getByText("Pago quincenal · $5,250.00 a la quincena · $350.00 diarios").waitFor();
    await page.getByText("Este es el sueldo que usan la nómina, los finiquitos y los aguinaldos.").waitFor();
    await page.locator("[data-tarjeta='jornada']").getByText("Domingo").waitFor();
    await page.locator("[data-tarjeta='prestaciones']").getByText("14 días (ley)").waitFor();
    await page.locator("[data-tarjeta='historial']").getByText("Contrato creado · renovación de CT-2024-0098").waitFor();
    await page.locator("[data-documento]").getByText("CONTRATO INDIVIDUAL DE TRABAJO POR TIEMPO INDETERMINADO").waitFor();
    assert.deepEqual(await page.locator("[data-firma]").evaluateAll((els) => els.map((e) => e.dataset.firma)), ["pendiente", "pendiente"]);
    const principal = movil ? page.locator("[data-barra-movil] [data-accion]").first() : page.getByRole("toolbar", { name: "Acciones del contrato" }).locator("[data-accion]").first();
    assert.equal((await principal.innerText()).trim(), "Firmar como empresa", "una sola acción principal: firmar como empresa");
    if (!movil) {
      const textos = await page.getByRole("toolbar", { name: "Acciones del contrato" }).locator("[data-accion]").allInnerTexts();
      assert.deepEqual(textos.map((t) => t.trim()), ["Firmar como empresa", "Mandar a firmar", "Descargar PDF", "Cambiar sueldo (convenio)", "Renovar", "Terminar contrato", "Editar datos"]);
      const primarios = await page.getByRole("toolbar", { name: "Acciones del contrato" }).locator("[data-accion]").evaluateAll((els) => els.filter((e) => getComputedStyle(e).backgroundColor === "rgb(44, 86, 232)").length);
      assert.equal(primarios, 1, "una sola principal (azul lleno)");
    }
    await revisarLectura(page, movil, `detalle ${sufijo}`);
    await captura(page, `detalle-${sufijo}`, true);
    if (!movil) await captura(page, `detalle-${sufijo}-pantalla`);

    // 2b. Editar EN PÁGINA, con pestañas (INC-CONTRATO-EDITAR-001: la ventana vieja mostraba en blanco «Diurna» y
    //     «Presencial» y al guardar mandaba todo). Solo se manda lo que cambió; el sueldo es de solo lectura.
    const abrirEditar = async () => {
      await page.goto(base + "/panel/contratos/142", { waitUntil: "domcontentloaded" });
      await page.locator("[data-tarjeta='sueldo']").waitFor({ timeout: 30000 });
      if (movil) {
        await page.locator("[data-barra-movil]").getByRole("button", { name: "Más acciones" }).click();
        await page.getByRole("dialog").locator("[data-accion='editar']").click();
      } else {
        await page.getByRole("toolbar", { name: "Acciones del contrato" }).locator("[data-accion='editar']").click();
      }
      await page.waitForURL(/\/panel\/contratos\/142\/editar$/, { timeout: 30000 });
      await page.locator("[data-vista='formulario-contrato']").waitFor({ timeout: 30000 });
      await page.locator("#ct-puesto").waitFor({ timeout: 30000 });
    };
    await abrirEditar();
    const encE = await page.locator("[data-encabezado-detalle]").evaluate((el) => { const st = getComputedStyle(el); return [st.backgroundImage, st.backgroundColor, st.borderTopWidth]; });
    assert.deepEqual(encE, ["none", "rgb(255, 255, 255)", "4px"], "editar: encabezado blanco con filo azul");
    assert.deepEqual((await page.locator("[data-pestanas] [role=tab]").allInnerTexts()).map((t) => t.trim()), ["Persona y puesto", "Sueldo", "Jornada", "Prestaciones", "Documento"]);
    assert.equal(await page.locator("#ct-puesto").inputValue(), "Cajera");
    assert.equal(await page.locator("#ct-modalidad_trabajo").inputValue(), "presencial", "«Presencial» guardado se ve seleccionado, no en blanco");
    await revisarLectura(page, movil, `editar · persona ${sufijo}`);
    await captura(page, `editar-persona-${sufijo}`, true);
    await page.getByRole("tab", { name: "Sueldo" }).click();
    await page.locator("[data-sueldo-solo-lectura]").getByText("Pago quincenal · $5,250.00 a la quincena · $350.00 diarios").waitFor();
    assert.equal(await page.locator("#ct-salario_base").count(), 0, "el sueldo no se edita aquí");
    await page.locator("[data-sueldo-solo-lectura]").getByRole("button", { name: "Cambiar sueldo (convenio)" }).waitFor();
    await revisarLectura(page, movil, `editar · sueldo ${sufijo}`);
    await captura(page, `editar-sueldo-${sufijo}`, true);
    await page.getByRole("tab", { name: "Jornada" }).click();
    assert.equal(await page.locator("#ct-tipo_jornada").inputValue(), "diurna", "«Diurna» guardado se ve seleccionado");
    assert.deepEqual([await page.locator("#ct-hora_entrada").inputValue(), await page.locator("#ct-hora_salida").inputValue(), await page.locator("#ct-hora_comida_fin").inputValue()], ["08:00", "16:00", "12:30"]);
    await revisarLectura(page, movil, `editar · jornada ${sufijo}`);
    await captura(page, `editar-jornada-${sufijo}`, true);
    await page.getByRole("tab", { name: "Prestaciones" }).click();
    assert.equal(await page.locator("#ct-dias_vacaciones").inputValue(), "12");
    await page.getByRole("tab", { name: "Documento" }).click();
    assert.equal(await page.locator("#ct-tipo_contrato").inputValue(), "indefinido");
    await revisarLectura(page, movil, `editar · documento ${sufijo}`);
    const guardarE = movil ? page.locator("[data-barra-movil] [data-accion='guardar']") : page.locator("[data-barra-guardar] [data-accion='guardar']");
    const cancelarE = movil ? page.locator("[data-barra-movil] [data-accion='cancelar']") : page.locator("[data-barra-guardar] [data-accion='cancelar']");
    assert.ok(await guardarE.isVisible() && await cancelarE.isVisible(), "Guardar y Cancelar siempre a la vista");
    if (movil) assert.ok((await guardarE.boundingBox()).height >= 55.5, "Guardar de 56 px en celular");
    // Sin cambios, Cancelar regresa sin preguntar.
    await cancelarE.click();
    await page.waitForURL(/\/panel\/contratos\/142$/, { timeout: 30000 });
    // Con cambios: Cancelar pregunta; «Seguir editando» se queda; Guardar manda SOLO el puesto.
    await abrirEditar();
    await page.locator("#ct-puesto").fill("Cajera principal");
    await cancelarE.click();
    await page.locator("[data-dialogo-cambios]").waitFor({ timeout: 15000 });
    // La ventana compartida «Tienes cambios sin guardar» se lee a los 60 años: letra ≥ 16 px y botones ≥ 48 px.
    const guardia = await page.locator("[data-dialogo-cambios]").evaluate((el) => ({
      letra: Math.min(...[...el.querySelectorAll("p, button")].map((x) => parseFloat(getComputedStyle(x).fontSize))),
      alto: Math.min(...[...el.querySelectorAll("button")].map((x) => x.offsetHeight)), // offsetHeight: sin la animación de entrada (zoom)
    }));
    assert.ok(guardia.letra >= 16 && guardia.alto >= 47.5, `ventana de cambios sin guardar: ${JSON.stringify(guardia)}`);
    await page.locator("[data-dialogo-cambios]").getByRole("button", { name: "Seguir editando" }).click();
    await page.locator("[data-dialogo-cambios]").waitFor({ state: "detached" });
    assert.match(page.url(), /\/142\/editar$/);
    await guardarE.click();
    await page.waitForURL(/\/panel\/contratos\/142$/, { timeout: 30000 });
    assert.deepEqual(E.pedidos.editar.at(-1), { puesto: "Cajera principal" }, "solo se manda lo que cambió");
    await page.getByText(/Cajera principal/).first().waitFor({ timeout: 15000 });

    // 2c. Ventanas: no se cierran con un clic o toque afuera; sí con Esc y con la X (dialog.jsx, para todas).
    await accion("Cambiar sueldo (convenio)");
    const ventana = page.getByRole("dialog");
    await ventana.getByLabel(/Sueldo nuevo/).fill("5600");
    if (movil) await page.touchscreen.tap(6, 6); else await page.mouse.click(6, 6);
    await dormir(400);
    assert.equal(await ventana.count(), 1, "un clic afuera no cierra la ventana");
    assert.equal(await ventana.getByLabel(/Sueldo nuevo/).inputValue(), "5600", "y no se pierde lo capturado");
    await page.keyboard.press("Escape");
    await ventana.waitFor({ state: "detached", timeout: 5000 });
    await accion("Cambiar sueldo (convenio)");
    await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
    await page.getByRole("dialog").waitFor({ state: "detached", timeout: 5000 });
    if (movil) {
      // «Más acciones» es un menú, no una ventana: se cierra al tocar afuera.
      await page.locator("[data-barra-movil]").getByRole("button", { name: "Más acciones" }).click();
      await page.getByRole("dialog").waitFor();
      await page.touchscreen.tap(6, 6);
      await page.getByRole("dialog").waitFor({ state: "detached", timeout: 5000 });
    }
    E.contrato.puesto = "Cajera";

    // 2d. Alta en página: vacía marca los errores por pestaña; duplicar copia las condiciones y encadena.
    await page.goto(base + "/panel/contratos/nuevo", { waitUntil: "domcontentloaded" });
    await page.locator("#ct-id_empleado").waitFor({ timeout: 60000 });
    await (movil ? page.locator("[data-barra-movil] [data-accion='guardar']") : page.locator("[data-barra-guardar] [data-accion='guardar']")).click();
    await page.locator("[data-errores]").waitFor();
    assert.deepEqual((await page.locator("[data-errores] button").allInnerTexts()).map((t) => t.trim()), ["Persona y puesto (1)", "Sueldo (2)", "Documento (2)"]);
    assert.equal(E.pedidos.crear.length, 0, "no se manda nada con datos faltantes");
    await revisarLectura(page, movil, `nuevo con errores ${sufijo}`);
    await captura(page, `nuevo-errores-${sufijo}`, true);
    await page.goto(base + "/panel/contratos/nuevo?duplicar=142", { waitUntil: "domcontentloaded" });
    await page.locator("#ct-puesto").waitFor({ timeout: 60000 });
    assert.equal(await page.locator("#ct-puesto").inputValue(), "Cajera");
    await page.getByRole("tab", { name: "Documento" }).click();
    await page.locator("#ct-tipo_contrato").selectOption("indefinido");
    await page.getByRole("tab", { name: "Sueldo" }).click();
    assert.equal(await page.locator("#ct-periodicidad_pago").inputValue(), "Quincenal");
    assert.equal(await page.locator("#ct-salario_base").inputValue(), "5250");
    await captura(page, `duplicar-sueldo-${sufijo}`, true);
    await (movil ? page.locator("[data-barra-movil] [data-accion='guardar']") : page.locator("[data-barra-guardar] [data-accion='guardar']")).click();
    await page.waitForURL(/\/panel\/contratos\/142$/, { timeout: 30000 });
    const alta = E.pedidos.crear.at(-1);
    assert.deepEqual([alta.id_empleado, alta.tipo_contrato, alta.salario_base, alta.periodicidad_pago, alta.es_renovacion, alta.contrato_anterior_id, alta.horario, alta.modalidad_trabajo],
      [15, "indefinido", 5250, "Quincenal", 1, 142, "Entrada: 08:00 | Salida: 16:00 | Comida: 12:00 - 12:30", "presencial"]);
    E = estadoInicial();
    await page.goto(base + "/panel/contratos/142", { waitUntil: "domcontentloaded" });
    await page.locator("[data-tarjeta='sueldo']").waitFor({ timeout: 30000 });

    if (completo) {
      // 3. Firmas.
      await accion("Firmar como empresa");
      await page.getByRole("dialog").getByRole("button", { name: "Firmar contrato" }).click();
      await page.locator("[data-firma='firmado']").waitFor({ timeout: 15000 });
      await page.locator("[data-tarjeta='historial']").getByText("Firmó la empresa: Laura Ríos").waitFor();
      assert.equal((await principal.innerText()).trim(), "Mandar a firmar", "después de firmar la empresa, la principal es mandar a firmar");
      await accion("Mandar a firmar");
      await page.getByRole("dialog").getByRole("button", { name: "Generar enlace de firma" }).click();
      await page.locator("[data-enlace-firma]").waitFor({ timeout: 60000 });
      assert.match(await page.locator("[data-enlace-firma]").innerText(), /\/firmar\/tok-demo-123$/);
      assert.deepEqual([E.pedidos.preparar, E.pedidos.solicitud], [1, 1], "congela el texto y crea la solicitud de firma");
      await revisarLectura(page, movil, `enlace de firma ${sufijo}`);
      await captura(page, `mandar-a-firmar-${sufijo}`);
      await page.getByRole("dialog").getByRole("button", { name: "Listo" }).click();
      await page.locator("[data-firma='enviado']").waitFor({ timeout: 15000 });
      await page.getByText("Esperando la firma de la persona").first().waitFor({ timeout: 15000 }).catch(() => assert.ok(movil, "el encabezado dice que espera la firma"));

      // 4. Convenio.
      await accion("Cambiar sueldo (convenio)");
      const dlg = page.getByRole("dialog");
      await dlg.getByLabel(/Sueldo nuevo/).fill("5500");
      await dlg.getByLabel("Motivo (opcional)").fill("Revisión anual");
      await dlg.locator("[data-sueldo-actual]").getByText("$5,500.00 a la quincena").waitFor();
      await revisarLectura(page, movil, `convenio ${sufijo}`);
      await captura(page, `convenio-${sufijo}`);
      await dlg.getByRole("button", { name: "Guardar convenio" }).click();
      await page.locator("[data-sueldo]").getByText("$11,000").waitFor({ timeout: 15000 });
      assert.deepEqual([E.pedidos.convenio[0].salario_nuevo, E.pedidos.convenio[0].fecha_efectiva, E.pedidos.convenio[0].motivo], [5500, hoy, "Revisión anual"]);
      await page.locator("[data-tarjeta='historial']").getByText("Convenio: sueldo $5,250.00 → $5,500.00").waitFor();
      await revisarLectura(page, movil, `detalle después ${sufijo}`);
      await captura(page, `detalle-firmas-convenio-${sufijo}`, true);
    }

    // 5. Revisar sueldos y el aviso de la nómina.
    await page.goto(base + "/panel/nomina/5", { waitUntil: "domcontentloaded" });
    await page.locator("[data-aviso='sueldos-por-revisar']").waitFor({ timeout: 60000 });
    await page.getByText(/Carla Paz Medina/).first().waitFor();
    await page.locator("[data-periodicidad-por-confirmar]").getByText(/Dora Gil Mora: contrato CT-2026-0007 dice «quincenal»/).waitFor();
    assert.equal(await page.getByRole("button", { name: "Autorizar y enviar recibos" }).isDisabled(), true, "no se autoriza con sueldos por revisar");
    await captura(page, `nomina-bloqueada-${sufijo}`);
    await page.locator("[data-aviso='sueldos-por-revisar']").getByRole("link", { name: "Revisar sueldos" }).click();
    await page.waitForURL(/\/panel\/contratos\/revisar-sueldos$/, { timeout: 30000 });
    await page.locator("[data-diferencia='17']").waitFor({ timeout: 30000 });
    await page.locator("[data-diferencia='17']").getByText("$6,000.00 a la quincena").waitFor();
    // Periodicidad por confirmar: cómo se paga hoy y cómo quedaría como dice.
    const per = page.locator("[data-periodicidad='7']");
    await per.getByText("$5,000.00 «quincenal»").waitFor();
    await per.getByText("Se paga como mensual: $5,000.00 al mes = $2,500.00 a la quincena").waitFor();
    await per.getByText("Si es por quincena (como dice): $10,000.00 al mes = $5,000.00 a la quincena").waitFor();
    await per.getByRole("button", { name: "Es por quincena (como dice)" }).waitFor();
    await per.getByRole("button", { name: "Era mensual" }).waitFor();
    await page.locator("[data-diferencia='17']").getByText(/\$13,000\.00 al mes \(= \$6,500\.00 a la quincena\)/).waitFor();
    await revisarLectura(page, movil, `revisar sueldos ${sufijo}`);
    await captura(page, `revisar-sueldos-${sufijo}`, true);
    if (completo) {
      await per.getByRole("button", { name: "Es por quincena (como dice)" }).click();
      await page.getByRole("dialog").getByText(/queda en \$5,000\.00 quincenal \(\$10,000\.00 al mes = \$5,000\.00 a la quincena\)\. El monto no cambia/).waitFor();
      await captura(page, `periodicidad-confirmar-${sufijo}`);
      await page.getByRole("dialog").getByRole("button", { name: "Confirmar" }).click();
      await page.locator("[data-seccion='periodicidad']").waitFor({ state: "detached", timeout: 15000 });
      assert.deepEqual(E.pedidos.periodicidad[0], { id_empresa: 7, id_empleado: 18, id_contrato: 7, decision: "como_dice" });
      await page.locator("[data-diferencia='17']").getByRole("button", { name: "Usar el del contrato" }).click();
      await page.getByRole("dialog").getByText(/La ficha queda en \$6,500\.00 a la quincena/).waitFor();
      await page.getByRole("dialog").getByRole("button", { name: "Confirmar" }).click();
      await page.locator("[data-vacio]").waitFor({ timeout: 15000 });
      assert.deepEqual(E.pedidos.resolver[0], { id_empresa: 7, id_empleado: 17, decision: "usar_contrato" });
    }

    // 6. Editor de plantillas de contrato.
    await page.goto(base + "/panel/gestion-documental/plantillas/editor?categoria=Contrato", { waitUntil: "domcontentloaded" });
    await page.locator("[data-panel-contrato]").waitFor({ timeout: 60000 });
    await page.getByLabel("Se usa para").selectOption("indefinido");
    const panel = page.locator("[data-panel-contrato]");
    for (const t of ["Sueldo", "Sueldo con letra", "Periodicidad", "Fecha de inicio", "Horario", "Prestaciones", "Nombre completo", "CURP", "RFC", "Domicilio", "Razón social", "Representante", "Domicilio fiscal"]) {
      await panel.getByRole("button", { name: t, exact: true }).waitFor();
    }
    const alto48 = await panel.locator("[data-variable]").evaluateAll((els) => els.every((e) => e.getBoundingClientRect().height >= 47.5));
    assert.ok(alto48, "botones de datos ≥ 48 px");
    const editor = page.locator("[contenteditable]");
    await editor.click();
    await page.keyboard.type("Salario: ");
    await panel.getByRole("button", { name: "Sueldo con letra", exact: true }).click();
    assert.match(await editor.innerText(), /\{\{contrato\.sueldo_letra\}\}/);
    if (completo) {
      await page.getByRole("button", { name: "Vista previa con un empleado" }).click();
      await page.locator("[data-resultado-vista-previa]").getByText(/CINCO MIL DOSCIENTOS CINCUENTA PESOS 00\/100 M\.N\./).waitFor({ timeout: 15000 });
      assert.match(E.pedidos.vistaPrevia[0], /\{\{contrato\.sueldo_letra\}\}/, "el servidor llena el texto que se está editando");
    }
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(desborde <= 1, `editor ${sufijo}: scroll horizontal`);
    await captura(page, `editor-plantilla-contrato-${sufijo}`, true);

    // Plantillas base (pestaña Contratos).
    await page.goto(base + "/panel/gestion-documental/plantillas?pestana=contratos", { waitUntil: "domcontentloaded" });
    await page.locator("[data-base='indeterminado']").waitFor({ timeout: 60000 });
    await page.locator("[data-base='indeterminado']").getByText(/Revísala con tu abogado/).waitFor();
    await captura(page, `plantillas-base-${sufijo}`, true);

    assert.deepEqual(errores.filter((m) => !ignorar(m)), [], `errores: ${errores.join(" | ")}`);
    await ctx.close();
    console.log(`✔ ${sufijo}: lista → detalle, editar en página (pestañas, solo lo cambiado, aviso al salir), ventanas que no se cierran afuera, alta y duplicar, ${completo ? "firmas, convenio, " : ""}revisar sueldos, nómina bloqueada, editor de plantillas; letra, botones, sin desborde ni degradados`);
  }
  ok = true;
  console.log("verify-contratos: todo bien");
} finally {
  await browser.close();
  cerrar();
  await dormir(100);
  if (!ok) process.exitCode = 1;
}
