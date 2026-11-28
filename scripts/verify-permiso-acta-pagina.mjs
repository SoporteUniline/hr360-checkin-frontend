// Verificación en navegador del PERMISO y el ACTA ADMINISTRATIVA en página propia (28/11/2026, pedido del dueño: «pasar a
// página los dos formularios grandes que todavía son ventana»; docs/sistema-diseno.md). Backend SIMULADO con datos de
// demostración, a 1440 y a 390 px. Revisa:
//   · «Nuevo permiso» y «Editar» de la lista llevan a /panel/permisos/nuevo y /panel/permisos/[id]/editar;
//   · crear un permiso manda lo mismo que la ventana de antes (alta masiva) y regresa a la lista con el aviso de éxito;
//   · editar carga el permiso, avisa «Tienes cambios sin guardar» y pregunta antes de salir por «← Permisos»;
//   · ?volver= regresa a la pantalla de origen (solo rutas internas del panel);
//   · «Nueva acta» y «Editar» llevan a /panel/actas-administrativas/nueva y /[id]/editar; el acta va por pasos (datos,
//     hecho, sanción, declaraciones, revisar) y manda lo mismo que antes; editar guarda y regresa;
//   · en cada página: botones de 38 px en escritorio y 48 en celular (principal 56 en celular), campos de 42 / 56,
//     letra de 16/17 (etiquetas y botones de 15 en escritorio), títulos 700, grises ≥ #4B5563, sin degradados ni
//     desborde horizontal (las mismas reglas de scripts/verify-diseno.mjs; mockup v3 del 28/11/2026).
//
// Uso (después de «NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build»):
//   CAPTURAS=/ruta PLAYWRIGHT_MODULE_PATH=/opt/node22/lib/node_modules/playwright node scripts/verify-permiso-acta-pagina.mjs
//   ETAPA=antes → solo toma capturas de lo que abren los botones (para comparar con la versión anterior); no revisa nada.
import assert from "node:assert/strict";
import { chromium, contexto, dormir, levantarNext } from "./capturas-ayuda/comun.mjs";
import { elegir } from "./lib/desplegable.mjs";
import { minimos, revisarDiseno } from "./lib/reglasDiseno.mjs";

const OUT = process.env.CAPTURAS || null;
const SOLO_CAPTURAS = process.env.ETAPA === "antes";
const PREFIJO = SOLO_CAPTURAS ? "antes" : "despues";
// En «antes» la ventana es fija: se captura lo que se ve (una captura de página completa la deja fuera en celular).
const captura = async (page, nombre) => { if (OUT) await page.screenshot({ path: `${OUT}/${PREFIJO}-${nombre}.png`, fullPage: !SOLO_CAPTURAS }); };

const ZONA = "America/Mexico_City";
const EMPRESA = [{ id_empresa: 7, nombre: "Comercializadora Demo", zona_horaria: ZONA }];
const RH = { id_usuario: 1, tipo_usuario: "Recruiter", nombre: "Usuario", apellido_paterno: "Demo", correo: "rh@demo.mx", id_empresa: 7, id_empleado: 16,
  empresas: [7], empresas_detalle: EMPRESA, zona_horaria: ZONA };
const PERSONAS = [
  { id_empleado: 15, id_empresa: 7, nombre: "Persona", apellido_paterno: "Uno", apellido_materno: "Demo", puesto: "Cajera", estado: "Activo" },
  { id_empleado: 16, id_empresa: 7, nombre: "Persona", apellido_paterno: "Dos", apellido_materno: "Demo", puesto: "Jefa de RH", estado: "Activo" },
];
const T = (id, nombre, alcance, goce, horas, cambia, o = {}) => ({ id, clave: `T${id}`, nombre, id_empresa: null, es_base: true, alcance, goce_sueldo: goce,
  horas_no_trabajadas: horas, cambia_al_aplicar: cambia, fijo_ley: 0, cuenta_como_asistencia: alcance === "dia" ? 0 : 1, es_permiso: alcance === "dia" ? 0 : 1, ...o });
const TIPOS_PERMISO = [
  T(1, "✅ Asistencia", "dia", 1, null, 0, { cuenta_como_asistencia: 1 }),
  T(2, "❌ Falta injustificada", "dia", 0, null, 0, { fijo_ley: 1 }),
  T(3, "📝 Falta justificada", "dia", 0, null, 1, { es_permiso: 1 }),
  T(4, "⌚ Entrada después de tiempo", "entrada", 1, "reponen", 1),
];
const MOTIVOS = [{ id: 1, nombre: "Visita al médico", global: true }, { id: 2, nombre: "Permiso personal", global: true }, { id: 6, nombre: "Otro", global: true }];
// Un permiso de la lista (como lo regresa GET /solicitudes-permiso).
const PERMISO = {
  id: 501, id_empleado: 15, id_empresa: 7, id_tipo_permiso: 3, fecha_inicio: "2026-12-07", fecha_fin: "2026-12-08", motivo: "Trámite en el banco",
  estado: "Pendiente", modalidad: "dias", tipo_horas: null, tratamiento: null, hora_inicio: null, hora_fin: null, id_motivo_permiso: 2,
  motivo_permiso: "Permiso personal", goce_sueldo: 0, horas_no_trabajadas: null, empleado_nombre: "Persona Uno Demo", tipo_permiso_nombre: "📝 Falta justificada",
  empleado_id_empresa: 7, dias_trabajo: "L,M,X,J,V", puesto: "Cajera", departamento: "Ventas",
};
const TIPOS_ACTA = [{ id_tipo_acta: 1, nombre_tipo: "Retardos", gravedad: "leve" }, { id_tipo_acta: 2, nombre_tipo: "Faltante de caja", gravedad: "grave" }];
const ACTA = {
  id_acta: 88, id_empresa: 7, id_empleado: 15, id_tipo_acta: 1, folio: "ACTA-0088", fecha_incidente: "2026-11-20", hora_incidente: "10:30",
  lugar_incidente: "Almacén", descripcion_hechos: "Llegó 40 minutos tarde sin avisar.", testigos: "Persona Dos Demo", tipo_sancion: "amonestacion_escrita",
  id_elabora: 16, nombre_cargo_elabora: "Jefa de RH", descargo_trabajador: "", acepta_hechos: 0, es_reincidencia: 0, estatus: "borrador",
  nombre_empleado: "Persona", apellido_paterno_empleado: "Uno", apellido_materno_empleado: "Demo", nombre_tipo_acta: "Retardos", gravedad_tipo: "leve",
  nombre_empresa: "Comercializadora Demo", nombre_quien_elabora: "Persona Dos Demo",
};

const pet = { permisosMasivo: [], permisoPut: [], permisoEstado: [], actaPost: [], actaPut: [] };

function manejar({ ruta, metodo, url, cuerpo, json }) {
  const r = ruta.replace(/^\/checador/, "");
  if (r.startsWith("/empleados/activos")) return json({ data: PERSONAS });
  if (r === "/empleados/16") return json({ ...PERSONAS[1], puesto: "Jefa de RH" });
  if (r === "/empleados" || r.startsWith("/empleados?")) {
    const q = (url.searchParams.get("nombre") || url.searchParams.get("search") || "").toLowerCase();
    const data = PERSONAS.filter((p) => !q || `${p.nombre} ${p.apellido_paterno}`.toLowerCase().includes(q));
    return json({ data, total: data.length, page: 1, totalPages: 1 });
  }
  if (r.startsWith("/tiposPermiso")) return json({ tiposPermiso: TIPOS_PERMISO, total: TIPOS_PERMISO.length });
  if (r.startsWith("/motivos-permiso")) return json({ ok: true, motivos: MOTIVOS });
  if (r.startsWith("/holidays")) return json({ festivos: [] });
  if (r === "/solicitudes-permiso/masivo" && metodo === "POST") { pet.permisosMasivo.push(cuerpo); return json({ ok: true, creados: 1 }); }
  if (r === "/solicitudes-permiso/501" && metodo === "PUT") { pet.permisoPut.push(cuerpo); return json({ ok: true }); }
  if (r === "/solicitudes-permiso/501/estado" && metodo === "PATCH") { pet.permisoEstado.push(cuerpo); return json({ ok: true }); }
  // GET por id: la consulta del backend pisa goce_sueldo con el del tipo (tp.goce_sueldo); la página de edición NO debe
  // usarlo, sino el mismo renglón que da la lista.
  if (r === "/solicitudes-permiso/501") return json({ ...PERMISO, goce_sueldo: 1 });
  if (r.startsWith("/solicitudes-permiso")) {
    return json({ data: [PERMISO], total: 1, estadisticas: { total: 1, pendientes: 1, aprobados: 0, rechazados: 0, cancelados: 0 } });
  }
  if (r.startsWith("/tipos-actas")) return json({ tipos_actas: TIPOS_ACTA, total: TIPOS_ACTA.length });
  if (r === "/administrativeMinutes/create" && metodo === "POST") { pet.actaPost.push(cuerpo); return json({ ok: true, id_acta: 89 }); }
  if (r === "/administrativeMinutes/88" && metodo === "PUT") { pet.actaPut.push(cuerpo); return json({ ok: true }); }
  if (r.startsWith("/administrativeMinutes")) {
    const id = url.searchParams.get("id_acta");
    const data = id && id !== "88" ? [] : [ACTA];
    return json({ data, total: data.length, page: 1, totalPages: 1, stats: { totalActas: 1, totalBorradores: 1, totalElaboradas: 0, totalCerradas: 0, totalGraves: 0 } });
  }
  return undefined;
}

const estilo = (loc) => loc.evaluate((el) => { const s = getComputedStyle(el); return { fondo: s.backgroundColor, borde: s.borderTopColor, ancho: s.borderTopWidth, alto: el.getBoundingClientRect().height, letra: s.fontSize, peso: s.fontWeight }; });
const AZUL = "rgb(37, 99, 235)";
const BLANCO = "rgb(255, 255, 255)";
const GRIS_FRANJA = "rgb(243, 244, 246)";
const BORDE_CAMPO = "rgb(209, 213, 219)";
async function esperar(cond, texto) {
  for (let i = 0; i < 100; i++) { if (cond()) return; await dormir(100); }
  throw new Error(`No llegó: ${texto}`);
}
async function revisarBotones(barra, donde, principal, movil) {
  await dormir(400);
  const m = minimos(movil);
  const p = await estilo(barra.getByRole("button", { name: principal }).first());
  assert.equal(p.fondo, AZUL, `${donde}: «${principal}» en azul`);
  assert.ok(p.alto >= m.principal - 0.5, `${donde}: «${principal}» de ${m.principal} px (mide ${p.alto})`);
  const c = await estilo(barra.getByRole("button", { name: "Cancelar" }));
  assert.deepEqual([c.fondo, c.borde, c.ancho], [BLANCO, BORDE_CAMPO, "1px"], `${donde}: Cancelar gris con contorno`);
  assert.ok(c.alto >= m.boton - 0.5, `${donde}: Cancelar de ${m.boton} px`);
  // Cancelar a la izquierda de la principal en escritorio; en celular la principal va arriba, a todo lo ancho.
  const bp = await barra.getByRole("button", { name: principal }).first().boundingBox();
  const bc = await barra.getByRole("button", { name: "Cancelar" }).boundingBox();
  assert.ok(bp.width > 300 ? bp.y < bc.y : bc.x < bp.x, `${donde}: acomodo de la barra`);
}
async function encabezado(page, donde, titulo, movil) {
  const enc = await estilo(page.locator("[data-encabezado-pagina]"));
  assert.equal(enc.fondo, GRIS_FRANJA, `${donde}: encabezado gris`);
  const h1 = page.locator("[data-encabezado-pagina] h1");
  assert.equal((await h1.innerText()).trim(), titulo, `${donde}: título`);
  const e = await estilo(h1);
  assert.deepEqual([e.letra, e.peso], ["26px", "700"], `${donde}: h1 de 26 en 700`);
}
// Un aviso de notistack con ese texto.
const aviso = (page, texto) => page.locator("#notistack-snackbar, [role=alert], .notistack-MuiContent").filter({ hasText: texto }).first();

// (28/11/2026) Lupa encimada («B🔍scar por nombre…»): el texto de un campo con ícono a la izquierda empieza DESPUÉS del
// ícono (en escritorio `lg:px-3` de la clase de campo le ganaba al `pl-12`). Se mide en el navegador.
async function lupaNoEncima(campo, donde) {
  const r = await campo.evaluate((el) => {
    const icono = el.parentElement.querySelector("svg").getBoundingClientRect();
    return { textoEmpieza: el.getBoundingClientRect().left + parseFloat(getComputedStyle(el).paddingLeft), iconoTermina: icono.right };
  });
  assert.ok(r.textoEmpieza >= r.iconoTermina + 4, `${donde}: la lupa no queda encima del texto (${JSON.stringify(r)})`);
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
    for (const k of Object.keys(pet)) pet[k].length = 0;

    // ——— 1. Permiso nuevo ———
    await page.goto(base + "/panel/permisos", { waitUntil: "domcontentloaded" });
    await page.locator("button[title=Editar]").first().waitFor({ timeout: 60000 }); // ya cargó la lista
    await page.getByRole("button", { name: /Nuevo permiso/ }).first().click({ timeout: 60000 });
    if (SOLO_CAPTURAS) {
      await dormir(1500);
      await captura(page, `permiso-nuevo-${sufijo}`);
      await page.goto(base + "/panel/permisos", { waitUntil: "domcontentloaded" });
      await page.locator("button[title=Editar]").first().click({ timeout: 60000 });
      await dormir(1500);
      await captura(page, `permiso-editar-${sufijo}`);
      await page.goto(base + "/panel/actas-administrativas", { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: /Nueva acta/ }).first().click({ timeout: 60000 });
      await dormir(1500);
      await captura(page, `acta-nueva-${sufijo}`);
      await page.goto(base + "/panel/actas-administrativas", { waitUntil: "domcontentloaded" });
      await page.locator("button[title=Editar]").first().click({ timeout: 60000 });
      await dormir(1500);
      await captura(page, `acta-editar-${sufijo}`);
      await ctx.close();
      console.log(`✔ ${sufijo}: capturas «antes»`);
      continue;
    }
    await page.waitForURL(/\/panel\/permisos\/nuevo(\?|$)/, { timeout: 30000 });
    const vista = page.locator("[data-vista='formulario-permiso']");
    await vista.waitFor({ timeout: 30000 });
    assert.equal(await page.getByRole("dialog").count(), 0, "permiso nuevo: ya no es ventana");
    await encabezado(page, `permiso nuevo ${sufijo}`, "Nuevo permiso", movil);
    assert.equal(await page.locator("[data-encabezado-pagina] a").first().getAttribute("href"), "/panel/permisos", "«← Permisos» vuelve a la lista");
    const barraP = page.locator("[data-barra-formulario]");
    await revisarBotones(barraP, `permiso nuevo ${sufijo}`, "Guardar permiso", movil);
    // Con «Todas las unidades» en la lista, la empresa se elige aquí (como en la ventana).
    assert.equal(await vista.locator("#permiso-empresa").inputValue(), "");
    await dormir(500);
    await captura(page, `permiso-nuevo-${sufijo}`);
    await lupaNoEncima(vista.locator("#permiso-buscar-empleado"), `permiso nuevo ${sufijo}`);
    await vista.locator("#permiso-empresa").selectOption("7");
    await vista.getByText("Persona Uno Demo").waitFor({ timeout: 15000 });
    await revisarDiseno(page, movil, `permiso nuevo ${sufijo}`, "[data-vista='formulario-permiso']");
    // Sin datos: la lista de lo que falta, arriba.
    await barraP.getByRole("button", { name: "Guardar permiso" }).click();
    const faltan = vista.locator("[data-errores-permiso]");
    await faltan.waitFor({ timeout: 5000 });
    assert.match(await faltan.innerText(), /Selecciona el tipo de permiso\.[\s\S]*Selecciona al menos un empleado\./);
    assert.equal(pet.permisosMasivo.length, 0, "sin datos no se manda nada");
    await captura(page, `permiso-nuevo-errores-${sufijo}`);
    await revisarDiseno(page, movil, `permiso nuevo con errores ${sufijo}`, "[data-vista='formulario-permiso']");
    // Llenar: falta justificada por permiso personal, 2 días, una persona.
    await elegir(vista.getByLabel("Qué pasó"), "3");
    await elegir(vista.getByLabel("Motivo", { exact: true }), { label: "Permiso personal" });
    await vista.locator("li", { hasText: "Persona Uno Demo" }).getByRole("checkbox").check();
    await vista.locator("#permiso-fecha-inicio").fill("2026-12-14");
    await vista.locator("#permiso-fecha-fin").fill("2026-12-15");
    await vista.locator("#permiso-observaciones").fill("Trámite personal");
    await barraP.getByText("Tienes cambios sin guardar").waitFor({ timeout: 5000 });
    const campo = await estilo(vista.locator("#permiso-fecha-inicio"));
    assert.deepEqual([Math.round(campo.alto), campo.letra], movil ? [56, "18px"] : [42, "16px"], `permiso ${sufijo}: campo de 42/56 px con letra de 16/18`);
    const combo = await estilo(vista.getByLabel("Qué pasó"));
    assert.ok(combo.alto >= minimos(movil).campo - 0.5 && parseFloat(combo.letra) >= (movil ? 17 : 16), `permiso ${sufijo}: «Qué pasó» del alto de un campo (${combo.alto} px, ${combo.letra})`);
    await captura(page, `permiso-nuevo-lleno-${sufijo}`);
    await revisarDiseno(page, movil, `permiso nuevo lleno ${sufijo}`, "[data-vista='formulario-permiso']");
    await barraP.getByRole("button", { name: "Guardar permiso" }).click();
    await esperar(() => pet.permisosMasivo.length === 1, "POST masivo");
    assert.deepEqual(pet.permisosMasivo[0], { ids_empleados: [15], id_tipo_permiso: 3, fecha_inicio: "2026-12-14", fecha_fin: "2026-12-15",
      motivo: "Trámite personal", id_motivo_permiso: 2, goce: "sin" }, "lo mismo que mandaba la ventana");
    await page.waitForURL(/\/panel\/permisos$/, { timeout: 15000 });
    await aviso(page, "Permiso(s) creado(s) correctamente.").waitFor({ timeout: 5000 });

    // ——— 2. Editar permiso ———
    await page.locator("button[title=Editar]").first().click({ timeout: 30000 });
    await page.waitForURL(/\/panel\/permisos\/501\/editar/, { timeout: 30000 });
    await vista.waitFor({ timeout: 30000 });
    await encabezado(page, `permiso editar ${sufijo}`, "Editar permiso", movil);
    await page.locator("#permiso-empleado").waitFor({ timeout: 15000 });
    await esperar(() => true, "");
    await page.waitForFunction(() => document.querySelector("#permiso-empleado")?.value === "15", null, { timeout: 15000 });
    assert.equal(await vista.locator("#permiso-fecha-inicio").inputValue(), "2026-12-07");
    assert.equal(await vista.locator("#permiso-observaciones").inputValue(), "Trámite en el banco");
    assert.equal(await barraP.getByText("Tienes cambios sin guardar").count(), 0, "al abrir no hay cambios");
    await dormir(500);
    await captura(page, `permiso-editar-${sufijo}`);
    await revisarDiseno(page, movil, `permiso editar ${sufijo}`, "[data-vista='formulario-permiso']");
    await revisarBotones(barraP, `permiso editar ${sufijo}`, "Guardar cambios", movil);
    await vista.locator("#permiso-observaciones").fill("Trámite en el banco, regresa el miércoles");
    await barraP.getByText("Tienes cambios sin guardar").waitFor({ timeout: 5000 });
    // Salir por «← Permisos» con cambios: pregunta; «Seguir editando» se queda con lo escrito.
    await page.locator("[data-encabezado-pagina] a").first().click();
    const pregunta = page.locator("[data-dialogo-cambios]");
    await pregunta.waitFor({ timeout: 5000 });
    await captura(page, `permiso-cambios-sin-guardar-${sufijo}`);
    await pregunta.getByRole("button", { name: "Seguir editando" }).click();
    await pregunta.waitFor({ state: "detached", timeout: 5000 });
    assert.match(page.url(), /\/panel\/permisos\/501\/editar/);
    assert.equal(await vista.locator("#permiso-observaciones").inputValue(), "Trámite en el banco, regresa el miércoles");
    await barraP.getByRole("button", { name: "Guardar cambios" }).click();
    await esperar(() => pet.permisoPut.length === 1, "PUT permiso");
    assert.deepEqual(pet.permisoPut[0], { id_empleado: 15, id_tipo_permiso: 3, fecha_inicio: "2026-12-07", fecha_fin: "2026-12-08",
      motivo: "Trámite en el banco, regresa el miércoles", id_empresa: 7, modalidad: "dias", id_motivo_permiso: 2, goce: "sin" },
    "edición: lo mismo que mandaba la ventana (goce del permiso, no el del tipo)");
    assert.equal(pet.permisoEstado.length, 0, "sin cambio de estado no se manda");
    await page.waitForURL(/\/panel\/permisos$/, { timeout: 15000 });
    await aviso(page, "Permiso actualizado correctamente.").waitFor({ timeout: 5000 });

    // ——— 3. Regresar al origen (?volver=) y Cancelar sin cambios ———
    await page.goto(base + "/panel/permisos/nuevo?volver=%2Fpanel%2Fregistro-asistencia", { waitUntil: "domcontentloaded" });
    await vista.waitFor({ timeout: 30000 });
    await barraP.getByRole("button", { name: "Cancelar" }).click();
    await page.waitForURL(/\/panel\/registro-asistencia$/, { timeout: 15000 });
    await page.goto(base + "/panel/permisos/nuevo?volver=https%3A%2F%2Fejemplo.invalid%2F", { waitUntil: "domcontentloaded" });
    await vista.waitFor({ timeout: 30000 });
    assert.equal(await page.locator("[data-encabezado-pagina] a").first().getAttribute("href"), "/panel/permisos", "un volver externo no se usa");

    // ——— 4. Acta nueva por pasos ———
    // Reloj de la página bajo control (corre normal hasta que se pausa): sirve para la regresión de INC-012 del paso 2.
    await page.clock.install();
    await page.goto(base + "/panel/actas-administrativas", { waitUntil: "domcontentloaded" });
    await page.getByText("ACTA-0088").first().waitFor({ timeout: 60000 }); // ya cargó (y se puede hacer clic)
    await page.getByRole("button", { name: /Nueva acta/ }).first().click({ timeout: 60000 });
    await page.waitForURL(/\/panel\/actas-administrativas\/nueva/, { timeout: 30000 });
    const va = page.locator("[data-vista='formulario-acta']");
    await va.waitFor({ timeout: 30000 });
    assert.equal(await page.getByRole("dialog").count(), 0, "acta nueva: ya no es ventana");
    await encabezado(page, `acta nueva ${sufijo}`, "Nueva acta administrativa", movil);
    const barraA = page.locator("[data-barra-formulario]");
    if (movil) assert.match(await page.locator("[data-pasos-movil]").innerText(), /Paso 1 de 5/);
    else assert.equal(await page.locator("[data-pasos-lista] [data-paso]").count(), 5, "acta: 5 pasos");
    await revisarBotones(barraA, `acta paso 1 ${sufijo}`, "Continuar", movil);
    await dormir(600);
    await captura(page, `acta-nueva-paso1-${sufijo}`);
    await lupaNoEncima(page.locator("#acta-empleado"), `acta paso 1 ${sufijo}`);
    await revisarDiseno(page, movil, `acta paso 1 ${sufijo}`, "[data-vista='formulario-acta']");
    // Continuar sin empleado: error en el campo, se queda en el paso 1.
    await barraA.getByRole("button", { name: "Continuar" }).click();
    await page.locator("#acta-empleado-error").waitFor({ timeout: 5000 });
    assert.equal((await estilo(page.locator("#acta-empleado"))).ancho, "2px", "campo con error: borde de 2 px");
    await captura(page, `acta-nueva-error-${sufijo}`);
    await page.locator("#acta-empleado").fill("Uno");
    await page.getByRole("option", { name: "Persona Uno Demo" }).click();
    await page.locator("#acta-tipo").selectOption({ label: "Retardos (ID 1)" });
    await barraA.getByText("Tienes cambios sin guardar").waitFor({ timeout: 5000 });
    await barraA.getByRole("button", { name: "Continuar" }).click();
    // Paso 2: el hecho.
    await page.locator("#acta-fecha").waitFor({ timeout: 5000 });
    // Regresión INC-012 (el acta perdía lo escrito): «Continuar» con el paso vacío lleva el foco a «Fecha», pero si la
    // persona YA está escribiendo en otro campo no se le quita. Antes el foco llegaba 60 ms después, a ciegas, brincaba a
    // «Fecha» a media palabra y el resto se perdía (POST con testigos o lugar en null). El reloj se pausa para que la
    // espera del foco ocurra justo a la mitad de lo que se teclea, siempre.
    await page.clock.pauseAt(Date.now() + 60_000);
    await barraA.getByRole("button", { name: "Continuar" }).click();
    await page.locator("#acta-descripcion-error").waitFor({ timeout: 5000 });
    await page.locator("#acta-lugar").click();
    await page.keyboard.type("Caja");
    await page.clock.runFor(1000);
    await page.keyboard.type(" 2");
    await page.clock.resume();
    assert.equal(await page.evaluate(() => document.activeElement?.id), "acta-lugar", "el foco no brinca de campo mientras se escribe");
    assert.equal(await page.locator("#acta-lugar").inputValue(), "Caja 2", "lo que se escribe tras el error se queda en su campo");
    assert.equal(await page.locator("#acta-fecha").inputValue(), "", "y no cae en otro campo");
    await page.locator("#acta-fecha").fill("2026-11-25");
    await page.locator("#acta-hora").fill("09:40");
    await page.locator("#acta-descripcion").fill("Faltaron $200 en el corte de caja.");
    await page.locator("#acta-testigos").fill("Persona Dos Demo");
    // Lo escrito sobrevive a cambiar de paso y regresar (el paso se desmonta y se vuelve a montar).
    const pasoHecho = () => page.evaluate(() => ["acta-fecha", "acta-hora", "acta-lugar", "acta-descripcion", "acta-testigos"].map((id) => document.getElementById(id)?.value));
    const HECHO = ["2026-11-25", "09:40", "Caja 2", "Faltaron $200 en el corte de caja.", "Persona Dos Demo"];
    assert.deepEqual(await pasoHecho(), HECHO, "paso 2 lleno");
    await barraA.getByRole("button", { name: "Continuar" }).click();
    await page.locator("#acta-sancion").waitFor({ timeout: 5000 });
    await barraA.getByRole("button", { name: "Atrás" }).click();
    await page.locator("#acta-testigos").waitFor({ timeout: 5000 });
    assert.deepEqual(await pasoHecho(), HECHO, "paso 2 igual tras ir al 3 y regresar");
    await captura(page, `acta-nueva-paso2-${sufijo}`);
    await revisarDiseno(page, movil, `acta paso 2 ${sufijo}`, "[data-vista='formulario-acta']");
    await barraA.getByRole("button", { name: "Continuar" }).click();
    // Paso 3: sanción y quién elabora (se llena con la persona de la sesión).
    await page.locator("#acta-sancion").waitFor({ timeout: 5000 });
    await page.locator("#acta-sancion").selectOption({ label: "Amonestacion Escrita" });
    await page.waitForFunction(() => document.querySelector("#acta-cargo")?.value === "Jefa de RH", null, { timeout: 10000 });
    await captura(page, `acta-nueva-paso3-${sufijo}`);
    await revisarDiseno(page, movil, `acta paso 3 ${sufijo}`, "[data-vista='formulario-acta']");
    await barraA.getByRole("button", { name: "Continuar" }).click();
    // Paso 4: declaraciones.
    await page.locator("#acta-descargo").waitFor({ timeout: 5000 });
    await page.locator("#acta-descargo").fill("Dice que el cambio venía incompleto.");
    await page.getByRole("switch", { name: /acepta los hechos/ }).click();
    await captura(page, `acta-nueva-paso4-${sufijo}`);
    await revisarDiseno(page, movil, `acta paso 4 ${sufijo}`, "[data-vista='formulario-acta']");
    await barraA.getByRole("button", { name: "Continuar" }).click();
    // Paso 5: revisar todo antes de guardar.
    const resumen = page.locator("[data-resumen-acta]");
    await resumen.waitFor({ timeout: 5000 });
    assert.match(await resumen.innerText(), /Persona Uno Demo[\s\S]*Retardos[\s\S]*Faltaron \$200[\s\S]*Amonestacion Escrita[\s\S]*Sí/);
    await captura(page, `acta-nueva-revisar-${sufijo}`);
    await revisarDiseno(page, movil, `acta revisar ${sufijo}`, "[data-vista='formulario-acta']");
    await revisarBotones(barraA, `acta revisar ${sufijo}`, "Guardar acta", movil);
    await barraA.getByRole("button", { name: "Guardar acta" }).click();
    await esperar(() => pet.actaPost.length === 1, "POST acta");
    assert.deepEqual(pet.actaPost[0], {
      id_empresa: "7", id_empleado: "15", id_tipo_acta: "1", fecha_incidente: "2026-11-25", hora_incidente: "09:40", lugar_incidente: "Caja 2",
      descripcion_hechos: "Faltaron $200 en el corte de caja.", testigos: "Persona Dos Demo", tipo_sancion: "amonestacion_escrita", dias_suspension: null,
      descargo_trabajador: "Dice que el cambio venía incompleto.", acepta_hechos: true, id_elabora: "16", nombre_cargo_elabora: "Jefa de RH",
      es_reincidencia: false, id_acta_previa: null,
    }, "lo mismo que mandaba la ventana");
    await page.waitForURL(/\/panel\/actas-administrativas$/, { timeout: 15000 });
    await aviso(page, "Acta creada correctamente").waitFor({ timeout: 5000 });

    // ——— 5. Editar acta ———
    await page.locator("button[title=Editar]").first().click({ timeout: 30000 });
    await page.waitForURL(/\/panel\/actas-administrativas\/88\/editar/, { timeout: 30000 });
    await va.waitFor({ timeout: 30000 });
    await encabezado(page, `acta editar ${sufijo}`, "Editar acta administrativa", movil);
    await page.waitForFunction(() => document.querySelector("#acta-empleado")?.value === "Persona Uno Demo", null, { timeout: 15000 });
    assert.equal(await barraA.getByText("Tienes cambios sin guardar").count(), 0, "al abrir no hay cambios");
    if (!movil) assert.equal(await page.locator("[data-pasos-lista] [data-paso]").filter({ hasText: "Listo" }).count(), 4, "al editar, los otros pasos ya están listos");
    await dormir(500);
    await captura(page, `acta-editar-${sufijo}`);
    await revisarDiseno(page, movil, `acta editar ${sufijo}`, "[data-vista='formulario-acta']");
    await revisarBotones(barraA, `acta editar ${sufijo}`, "Guardar cambios", movil);
    // Ir al paso del hecho y cambiar la descripción; «Guardar cambios» siempre disponible.
    if (movil) { await barraA.getByRole("button", { name: "Siguiente" }).click(); }
    else await page.locator("[data-pasos-lista] [data-paso]").nth(1).click();
    await page.locator("#acta-descripcion").fill("Llegó 40 minutos tarde sin avisar a su jefa.");
    await barraA.getByText("Tienes cambios sin guardar").waitFor({ timeout: 5000 });
    await barraA.getByRole("button", { name: "Guardar cambios" }).click();
    await esperar(() => pet.actaPut.length === 1, "PUT acta");
    assert.deepEqual(pet.actaPut[0], {
      id_empresa: 7, id_empleado: "15", id_tipo_acta: "1", fecha_incidente: "2026-11-20", hora_incidente: "10:30", lugar_incidente: "Almacén",
      descripcion_hechos: "Llegó 40 minutos tarde sin avisar a su jefa.", testigos: "Persona Dos Demo", tipo_sancion: "amonestacion_escrita",
      dias_suspension: null, descargo_trabajador: null, acepta_hechos: false, id_elabora: "16", nombre_cargo_elabora: "Jefa de RH",
      es_reincidencia: false, id_acta_previa: null,
    }, "edición del acta: lo mismo que mandaba la ventana");
    await page.waitForURL(/\/panel\/actas-administrativas$/, { timeout: 15000 });
    await aviso(page, "Acta actualizada correctamente").waitFor({ timeout: 5000 });

    // ——— 6. Acta: Cancelar con cambios pregunta; «Salir sin guardar» regresa a la lista ———
    await page.getByRole("button", { name: /Nueva acta/ }).first().click();
    await va.waitFor({ timeout: 30000 });
    await page.locator("#acta-empleado").fill("Dos");
    await page.getByRole("option", { name: "Persona Dos Demo" }).click();
    await barraA.getByText("Tienes cambios sin guardar").waitFor({ timeout: 5000 });
    await barraA.getByRole("button", { name: "Cancelar" }).click();
    await pregunta.waitFor({ timeout: 5000 });
    await pregunta.getByRole("button", { name: "Salir sin guardar" }).click();
    await page.waitForURL(/\/panel\/actas-administrativas$/, { timeout: 15000 });
    assert.equal(pet.actaPost.length, 1, "salir sin guardar no manda nada");

    assert.deepEqual(errores.filter((m) => !/ResizeObserver|hydrat/i.test(m)), [], `errores en la página (${sufijo})`);
    await ctx.close();
    console.log(`✔ ${sufijo}: permiso nuevo (errores, alta masiva, regreso con aviso), editar (cambios sin guardar, PUT), ?volver=, acta por 5 pasos (POST), editar acta (PUT) y salir sin guardar`);
  }
  ok = true;
} finally {
  await browser.close();
  cerrar();
}
if (!ok) process.exit(1);
