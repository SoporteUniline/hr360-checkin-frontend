// Verificación en navegador de Clima y NOM-035 con backend simulado: plantillas → editar → lanzar → contestar en el
// celular → tablero → NOM-035 (Guía I confidencial e informe) → liga personal. Revisa que no haya desborde a 390 ni
// a 1440 px y que lo que se manda al servidor no lleve datos de la persona.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api NEXT_PUBLIC_RUTA_DOMAIN=https://dev.adamia.com.mx npm run build
//      && node scripts/verify-clima.mjs   (CAPTURAS=<carpeta> guarda capturas a 1440 y 390)
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { datosSimulados } from "./lib/clima-simulado.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");

const secret = randomUUID();
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], {
  stdio: "ignore",
  env: { ...process.env, JWT_SECRET: secret },
});
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function token(tipo) {
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: tipo, id_usuario: -1, exp: Math.floor(Date.now() / 1000) + 3600 })).toString(
    "base64url"
  );
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}
const empresa = { id_empresa: 7, nombre: "Tiendas del Centro", estado: "Activo", zona_horaria: "America/Mexico_City" };
const RH = {
  id_usuario: -1,
  tipo_usuario: "Recruiter",
  id_empresa: 7,
  nombre: "Rosa RH",
  empresas: [7],
  empresas_detalle: [empresa],
  zona_horaria: "America/Mexico_City",
};
const ANA = { ...RH, tipo_usuario: "Empleado", id_empleado: 101, nombre: "Ana Torres" };

const S = datosSimulados();
const errores = [];
const fallidas = [];
let exito = false;
let pagina = null;
const browser = await chromium.launch();

async function sesion(usuario, viewport) {
  const ctx = await browser.newContext({
    viewport,
    locale: "es-MX",
    timezoneId: "America/Mexico_City",
    acceptDownloads: true,
    hasTouch: viewport.width < 500,
  });
  if (usuario) await ctx.addCookies([{ name: "token", value: token(usuario.tipo_usuario), url: base }]);
  const pg = await ctx.newPage();
  pagina = pg;
  pg.on("pageerror", (e) => errores.push(e.message));
  pg.on("requestfailed", (r) => fallidas.push(`${r.method()} ${r.url()} ${r.failure()?.errorText}`));
  await pg.route("**/*", (route) => S.atender(route, { base, usuario }));
  return pg;
}
const captura = (pg, nombre) =>
  process.env.CAPTURAS ? pg.screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png`, fullPage: true }) : null;
// (25/11/2026) Contestar en el celular: la encuesta ocupa toda la pantalla (la barra de la app no tapa nada), la
// pregunta se lee grande y «Anterior / Siguiente» quedan completos y tocables dentro de la pantalla.
async function pantallaCompletaLegible(pg, nombre, enApp = true) {
  const r = await pg.evaluate(() => {
    const vh = window.innerHeight;
    const botones = [...document.querySelectorAll("button")].filter((b) =>
      /^(Anterior|Siguiente|Enviar respuestas|Enviando…)$/.test(b.innerText.trim())
    );
    const visibles = botones.map((b) => {
      const c = b.getBoundingClientRect();
      const arriba = document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2);
      return {
        texto: b.innerText.trim(),
        dentro: c.top >= 0 && c.bottom <= vh + 0.5,
        alto: c.height,
        propio: b === arriba || b.contains(arriba),
      };
    });
    const h2 = document.querySelector("#pregunta-actual");
    const opcion = document.querySelector('[role="group"] button');
    return {
      visibles,
      pregunta: h2 ? parseFloat(getComputedStyle(h2).fontSize) : 0,
      opcion: opcion ? parseFloat(getComputedStyle(opcion).fontSize) : 0,
      completa: Boolean(document.querySelector("[data-encuesta-pantalla-completa]")),
    };
  });
  assert.equal(r.visibles.length, 2, `${nombre}: Anterior y Siguiente/Enviar`);
  for (const v of r.visibles) {
    assert.ok(v.dentro, `${nombre}: «${v.texto}» completo dentro de la pantalla`);
    assert.ok(v.propio, `${nombre}: nada tapa «${v.texto}»`);
    assert.ok(v.alto >= 44, `${nombre}: «${v.texto}» tocable`);
  }
  assert.ok(r.pregunta >= 24, `${nombre}: pregunta en letra grande (${r.pregunta}px)`);
  assert.ok(r.opcion >= 17, `${nombre}: opciones en letra grande (${r.opcion}px)`);
  if (enApp) assert.ok(r.completa, `${nombre}: en pantalla completa`);
}

async function sinDesborde(pg, nombre) {
  await dormir(150);
  const r = await pg.evaluate(() => ({ ancho: document.documentElement.scrollWidth, ventana: window.innerWidth }));
  assert.ok(r.ancho <= r.ventana + 1, `${nombre}: la página se desborda (${r.ancho} > ${r.ventana})`);
}
const ir = (pg, ruta) => pg.goto(base + ruta, { waitUntil: "domcontentloaded" });

try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(base + "/login")).status) break;
    } catch {
      /* aún no */
    }
    if (i > 200) throw new Error("Next no arrancó");
    await dormir(150);
  }

  // 1) Plantillas: las 5 profesionales; «Usar plantilla» copia Clima general a la empresa y abre el editor.
  const rh = await sesion(RH, { width: 1440, height: 1000 });
  await ir(rh, "/panel/clima/encuestas");
  const plantillas = rh.getByRole("region", { name: "Plantillas profesionales" });
  await plantillas.getByRole("heading", { name: "Clima general" }).waitFor({ timeout: 30000 });
  assert.equal(await plantillas.locator("article h3").count(), 6, "5 plantillas + empezar en blanco");
  await plantillas.getByText("Guía III (más de 50)").waitFor();
  await sinDesborde(rh, "plantillas 1440");
  await captura(rh, "1440-plantillas");

  // 1b) Adamia AI arma una encuesta desde una descripción, la revisa (propuesta aplicada) y agrega 3 preguntas.
  const cajaIa = rh.getByRole("region", { name: "Créala con Adamia AI" });
  await cajaIa.getByText(/Uso de Adamia AI este mes: 12 consultas/).waitFor({ timeout: 15000 });
  await cajaIa.getByRole("button", { name: "¿Por qué se va la gente?" }).click();
  await cajaIa.getByRole("button", { name: "Armar encuesta" }).click();
  await rh.waitForURL("**/panel/clima/encuestas/editor/12", { timeout: 30000 });
  await rh.getByLabel("Texto de la pregunta 3").waitFor({ timeout: 30000 });
  await rh.getByRole("button", { name: "Revisar preguntas" }).click();
  await rh.getByText("Adamia AI · esta pregunta influye en la respuesta y pregunta dos cosas").waitFor({ timeout: 15000 });
  await rh.getByText(/La pregunta 1 influye en la respuesta/).waitFor();
  await sinDesborde(rh, "editor con revisión 1440");
  await captura(rh, "1440-editor-adamia-ai");
  await rh.getByRole("button", { name: "Usar propuesta" }).click();
  assert.equal(await rh.getByLabel("Texto de la pregunta 1").inputValue(), "Mi jefe directo me trata con respeto.");
  assert.equal(await rh.getByLabel("Tipo de la pregunta 2").inputValue(), "escala");
  await rh.getByRole("button", { name: "Pedir 3 preguntas más a Adamia AI" }).click();
  await rh.getByLabel("Texto de la pregunta 7").waitFor({ timeout: 15000 });
  for (let i = 0; i < 40 && S.estado.plantillaIa.definicion.secciones.flatMap((x) => x.preguntas).length !== 7; i++) await dormir(100);
  const deIa = S.estado.plantillaIa.definicion.secciones;
  assert.deepEqual(deIa[0].preguntas.map((q) => q.texto).slice(-3), [
    "Sé a quién acudir si tengo un problema.",
    "Mi capacitación fue suficiente.",
    "Me siento parte del equipo.",
  ]);
  assert.equal(deIa[1].preguntas.length, 1, "las nuevas no van a la sección de abiertas");
  assert.match(S.estado.llamadasIa[0].cuerpo.descripcion, /se va la gente/);
  console.log("PASS: Adamia AI crea, revisa (propuesta) y agrega 3 preguntas; muestra el uso del mes");
  await ir(rh, "/panel/clima/encuestas");
  await plantillas.getByRole("heading", { name: "Clima general" }).waitFor({ timeout: 30000 });
  await plantillas.locator("article").filter({ hasText: "Clima general" }).getByRole("button", { name: "Usar plantilla" }).click();
  await rh.waitForURL("**/panel/clima/encuestas/editor/11", { timeout: 30000 });
  console.log("PASS: plantillas profesionales y copia editable");

  // 2) Editor: cambia texto, agrega una pregunta de opción y se guarda solo.
  await rh.getByLabel("Texto de la pregunta 2").fill("Mi jefe directo me trata con respeto.");
  await rh.getByRole("button", { name: "Agregar pregunta a la sección 1" }).click();
  await rh.getByLabel("Texto de la pregunta 5").fill("¿Qué turno prefieres?");
  await rh.getByLabel("Tipo de la pregunta 5").selectOption("opcion");
  await rh.getByLabel("Opción 1 de la pregunta 5").fill("Mañana");
  await rh.getByLabel("Opción 2 de la pregunta 5").fill("Tarde");
  await rh.getByText("Borrador guardado").waitFor({ timeout: 10000 });
  for (
    let i = 0;
    i < 40 &&
    !S.estado.plantilla.definicion.secciones[0].preguntas.some(
      (q) => q.texto === "¿Qué turno prefieres?" && q.opciones?.[1]?.texto === "Tarde"
    );
    i++
  )
    await dormir(100);
  assert.ok(S.estado.guardados > 0, "se guardó en el servidor");
  assert.equal(S.estado.plantilla.definicion.secciones[0].preguntas[1].texto, "Mi jefe directo me trata con respeto.");
  await rh.getByRole("button", { name: "Vista previa" }).click();
  await rh.getByRole("dialog").getByText("Pregunta 1 de 6").waitFor();
  await rh.keyboard.press("Escape");
  await sinDesborde(rh, "editor 1440");
  await captura(rh, "1440-editor");
  console.log("PASS: editor (texto, tipo opción, guardado con versión, vista previa)");

  // 3) Lanzar: por área (Caja + Ventas), fechas, recordatorio y canales; aviso de privacidad de equipos pequeños
  //    (25/11/2026: ya no «esos resultados se verán solo juntos»; clima los muestra desde 1 respuesta).
  await rh.getByRole("button", { name: "Siguiente: lanzar →" }).click();
  await rh.waitForURL("**/panel/clima/encuestas/lanzar/21", { timeout: 30000 });
  await rh.getByRole("button", { name: "Por área o puesto" }).click();
  await rh.getByRole("button", { name: "Caja", exact: true }).click();
  await rh.getByRole("button", { name: "Reparto", exact: true }).click();
  await rh.getByText("9 personas").first().waitFor();
  await rh.getByText("Equipos pequeños (Reparto): las respuestas no llevan nombre, pero RH podría deducir quién contestó.").waitFor();
  assert.equal(await rh.getByText(/se verán solo juntos|no se podrán mostrar/).count(), 0, "sin el aviso del mínimo de 5");
  await rh.getByRole("checkbox", { name: /WhatsApp/ }).isDisabled();
  await sinDesborde(rh, "lanzar 1440");
  await captura(rh, "1440-lanzar");
  await rh.getByRole("button", { name: "Programar encuesta" }).click();
  await rh.waitForURL("**/panel/clima/encuestas", { timeout: 30000 });
  assert.deepEqual(S.estado.campania.destinatarios.areas, ["Caja", "Reparto"]);
  assert.equal(S.estado.campania.estado, "activa");
  await rh.getByRole("button", { name: "Participación" }).first().click();
  await rh.getByText("Quién ya contestó (nunca qué contestó).").waitFor();
  console.log("PASS: lanzar con destinatarios, fechas, canales y seguimiento de participación");

  // 4) Tablero (1440): clima general, eNPS, participación, NOM-035 y mapa de calor con todos los grupos (Reparto con 4).
  await ir(rh, "/panel/clima");
  await rh.getByText("Clima general", { exact: true }).waitFor({ timeout: 30000 });
  await rh.getByText("+28").waitFor();
  await rh.getByText("142 de 165 personas").waitFor();
  const mapa = rh.getByRole("region", { name: "Por área y dimensión" });
  assert.equal(await mapa.getByRole("row").count(), 7, "5 áreas + toda la empresa + encabezado");
  assert.equal(await mapa.getByText("Reparto").count(), 1, "Reparto (4 respuestas) ya aparece");
  assert.equal(await mapa.getByText(/no se muestran por separado/).count(), 0, "ningún grupo oculto en clima");
  const descarga = rh.waitForEvent("download");
  await rh.getByRole("button", { name: "Descargar informe PDF" }).click();
  assert.match((await descarga).suggestedFilename(), /informe-clima-30\.pdf/);
  await sinDesborde(rh, "tablero 1440");
  await captura(rh, "1440-tablero");
  console.log("PASS: tablero con todos los grupos (sin mínimo de 5 en clima) e informe PDF");

  // 4a) Empresa chica: 1 de 3 contestó y se ven resultados, el grupo y el comentario (antes «Sin resultados que mostrar»).
  await rh.getByLabel("Medición").selectOption("31");
  await rh.getByText("1 de 3 personas").waitFor({ timeout: 30000 });
  assert.equal(await rh.getByText("Sin resultados que mostrar").count(), 0);
  assert.equal(await rh.getByText(/al menos 5/).count(), 0);
  const mapaChico = rh.getByRole("region", { name: "Por área y dimensión" });
  await mapaChico.getByText("Taller").first().waitFor();
  await rh.getByText("Comentarios abiertos (1)", { exact: false }).click();
  await rh.getByText("Que haya más herramientas.", { exact: false }).first().waitFor();
  assert.equal(await rh.getByRole("button", { name: "Descargar informe PDF" }).isEnabled(), true);
  await sinDesborde(rh, "tablero 1 respuesta 1440");
  await captura(rh, "1440-tablero-1-respuesta");
  await rh.getByLabel("Medición").selectOption("30");
  await rh.getByText("142 de 165 personas").waitFor({ timeout: 30000 });
  console.log("PASS: tablero con 1 respuesta: resultados, grupo, comentario y PDF disponibles");

  // 4b) Adamia AI en el tablero: temas con cita anonimizada, plan de acción y convertirlo en tareas.
  const temas = rh.getByRole("region", { name: "Lo que dicen" });
  await temas.getByRole("button", { name: "Agrupar comentarios" }).click();
  await temas.getByText("Horarios y descansos").waitFor({ timeout: 15000 });
  await temas.getByText("«Los sábados salimos tarde y nadie avisa con tiempo.»", { exact: false }).waitFor();
  const plan = rh.getByRole("region", { name: "Plan de acción sugerido" });
  await plan.getByRole("button", { name: "Proponer plan" }).click();
  await plan.getByText("Publicar los horarios del sábado con 1 semana de anticipación.", { exact: false }).waitFor({ timeout: 15000 });
  await sinDesborde(rh, "tablero con IA 1440");
  await captura(rh, "1440-tablero-adamia-ai");
  await plan.getByRole("button", { name: "Convertir en tareas →" }).click();
  const dt = rh.getByRole("dialog", { name: "Convertir en tareas" });
  for (const sel of await dt.getByRole("combobox").all()) await sel.selectOption({ index: 1 });
  await dt.getByRole("button", { name: "Crear 2 tareas" }).click();
  await rh.getByText("Se crearon 2 tareas en el módulo de Tareas.").waitFor({ timeout: 15000 });
  assert.equal(S.estado.tareas.length, 2);
  assert.ok(S.estado.tareas.every((t) => t.empresa === 7 && t.id_responsable === 101 && /^\d{4}-\d{2}-\d{2}$/.test(t.fecha_limite)));
  assert.match(S.estado.tareas[0].titulo, /^Almacén · Carga de trabajo: Publicar/);
  console.log("PASS: Adamia AI agrupa comentarios, propone plan y lo convierte en tareas");

  // 5) NOM-035 (1440): nivel final, dominios con semáforo, Guía I confidencial y canalización, obligaciones e informe STPS.
  await ir(rh, "/panel/clima/nom035");
  await rh.getByRole("heading", { name: "NOM-035 · Factores de riesgo psicosocial" }).waitFor({ timeout: 30000 });
  await rh.getByText("Guía de referencia III (más de 50 trabajadores)", { exact: false }).waitFor();
  await rh.getByText("3 personas requieren valoración clínica.").waitFor();
  await rh.getByRole("button", { name: "Ver y canalizar →" }).click();
  const dlg = rh.getByRole("dialog");
  await dlg.getByText("Luis Pérez").waitFor();
  await dlg.getByRole("checkbox").first().check();
  for (let i = 0; i < 30 && !S.estado.canalizados.length; i++) await dormir(100);
  assert.deepEqual(S.estado.canalizados, [{ id: 1, canalizado: true }]);
  await rh.keyboard.press("Escape");
  await rh.getByRole("checkbox", { name: /política de prevención/ }).check();
  for (let i = 0; i < 30 && !S.estado.cumplimiento.politica_en; i++) await dormir(100);
  assert.ok(S.estado.cumplimiento.politica_en, "política marcada");
  const informe = rh.waitForEvent("download");
  await rh.getByRole("button", { name: "Informe para inspección STPS" }).click();
  assert.match((await informe).suggestedFilename(), /informe-nom035-40\.pdf/);
  await sinDesborde(rh, "nom035 1440");
  await captura(rh, "1440-nom035");
  const prog = rh.getByRole("region", { name: "Programa de intervención" });
  await prog.getByRole("button", { name: "Proponer programa" }).click();
  await prog.getByText("Respetar descansos y publicar horarios con anticipación.", { exact: false }).waitFor({ timeout: 15000 });
  await prog.getByRole("button", { name: "Crear acciones y responsables →" }).click();
  await rh
    .getByRole("dialog", { name: "Convertir en tareas" })
    .getByText(/NOM-035 · Jornada de trabajo/)
    .waitFor();
  await rh.keyboard.press("Escape");
  console.log("PASS: NOM-035 con semáforo, Guía I confidencial, obligaciones e informe STPS");

  // 6) Vistas del panel a 390.
  const cel = await sesion(RH, { width: 390, height: 844 });
  for (const [ruta, texto, nombre] of [
    ["/panel/clima", "Dónde poner atención", "390-tablero"],
    ["/panel/clima/encuestas", "Plantillas profesionales", "390-plantillas"],
    ["/panel/clima/encuestas/editor/11", "Siguiente: lanzar →", "390-editor"],
    ["/panel/clima/nom035", "Por categoría y dominio", "390-nom035"],
  ]) {
    await ir(cel, ruta);
    await cel.getByText(texto, { exact: true }).first().waitFor({ timeout: 30000 });
    await sinDesborde(cel, nombre);
    await captura(cel, nombre);
  }
  S.estado.campania.estado = "borrador";
  await ir(cel, "/panel/clima/encuestas/lanzar/21");
  await cel.getByText("1 · ¿Quién contesta?").waitFor({ timeout: 30000 });
  await sinDesborde(cel, "390-lanzar");
  await captura(cel, "390-lanzar");
  S.estado.campania.estado = "activa";
  console.log("PASS: panel de clima sin desborde a 390 px (resumen del dueño en celular)");

  // 7) Ana contesta en su celular: una pregunta por pantalla, «Anónima», avance, progreso guardado y envío.
  const ana = await sesion(ANA, { width: 390, height: 844 });
  await ir(ana, "/empleado/panel/encuestas");
  await ana.getByRole("link", { name: /Clima general/ }).click({ timeout: 30000 });
  await ana.getByText("Pregunta 1 de 6").waitFor({ timeout: 30000 });
  await ana.getByText("Anónima", { exact: true }).waitFor();
  await ana.getByText("Tus respuestas no llevan tu nombre. En equipos pequeños, RH podría deducir quién contestó.").waitFor();
  assert.equal(await ana.getByText(/grupos de 5 o más/).count(), 0, "clima ya no promete grupos de 5 o más");
  await sinDesborde(ana, "390-contestar");
  await pantallaCompletaLegible(ana, "390-contestar");
  await ana.getByRole("button", { name: "9", exact: true }).click();
  await ana.getByText("Pregunta 2 de 6").waitFor();
  await captura(ana, "390-contestar");
  await ana.getByRole("button", { name: "De acuerdo", exact: true }).click();
  await ana.getByText("Pregunta 3 de 6").waitFor();
  await ana.reload({ waitUntil: "domcontentloaded" });
  await ana.getByText("Pregunta 3 de 6").waitFor({ timeout: 30000 }); // retoma donde iba (guardado en el teléfono)
  await ana.getByRole("button", { name: "Totalmente de acuerdo" }).click();
  await ana.getByText("Pregunta 4 de 6").waitFor();
  await ana.getByRole("button", { name: "Sí", exact: true }).click();
  await ana.getByText("Pregunta 5 de 6").waitFor();
  await ana.getByRole("button", { name: "Tarde", exact: true }).click();
  await ana.getByText("Pregunta 6 de 6").waitFor();
  await ana.getByLabel("Tu respuesta").fill("Que los horarios se publiquen antes.");
  await ana.getByRole("button", { name: "Enviar respuestas" }).click();
  await ana.getByText("¡Gracias por contestar!").waitFor({ timeout: 15000 });
  const turno = S.estado.campania.definicion.secciones[0].preguntas[4].clave;
  assert.deepEqual(S.estado.respuestas.at(-1), {
    respuestas: { enps: 9, lid1: 4, car1: 5, her1: "si", [turno]: "o2", abi1: "Que los horarios se publiquen antes." },
  });
  assert.doesNotMatch(JSON.stringify(S.estado.respuestas), /Ana|101|Torres/, "el cuerpo no lleva datos de la persona");
  assert.equal(
    await ana.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("adamia-clima-borrador")).length),
    0,
    "borrador borrado al enviar"
  );
  console.log("PASS: contestar en el celular (una por pantalla, anónima, progreso guardado y sin datos personales)");

  // 8) NOM-035 en el celular: Guía I con un «Sí» abre II a IV; filtros de clientes y jefe; aviso de confidencialidad.
  await ir(ana, "/empleado/panel/encuestas/41");
  await ana.getByText("Parte 1 · Guía I (con tu nombre y confidencial).").waitFor({ timeout: 30000 });
  // La NOM-035 conserva su regla: Guías II/III anónimas por grupo de 5 o más.
  await ana.getByText(/los resultados se muestran en grupos de 5 o más/).waitFor();
  await captura(ana, "390-nom035-inicio");
  await ana.getByRole("button", { name: "Empezar" }).click();
  await ana.getByText("Confidencial", { exact: true }).waitFor();
  await ana.getByRole("button", { name: "Sí", exact: true }).click();
  await ana.getByText(/Pregunta 2 de \d+/).waitFor();
  // Resto de la Guía I «No», filtros: atiende clientes «Sí», es jefe «No»; reactivos «Casi siempre».
  const enviar = ana.getByRole("button", { name: "Enviar respuestas" });
  for (let i = 0; i < 40 && !((await enviar.isVisible()) && (await enviar.isEnabled())); i++) {
    const t = await ana.locator("#pregunta-actual").innerText();
    const grupo = ana.getByRole("group");
    const boton = /brindar servicio a clientes/.test(t)
      ? grupo.getByRole("button", { name: "Sí", exact: true })
      : /jefe de otros/.test(t)
      ? grupo.getByRole("button", { name: "No", exact: true })
      : grupo.getByRole("button").nth(1);
    await boton.click();
    await dormir(260);
  }
  await sinDesborde(ana, "390-nom035-pregunta");
  await pantallaCompletaLegible(ana, "390-nom035-pregunta");
  await captura(ana, "390-nom035-pregunta");
  await ana.getByRole("button", { name: "Enviar respuestas" }).click();
  await ana.getByText("¡Gracias por contestar!").waitFor({ timeout: 15000 });
  const nom = S.estado.respuestas.at(-1);
  assert.deepEqual(Object.keys(nom.guia1), ["I", "II", "III", "IV"]);
  assert.deepEqual(nom.guia.filtros, { clientes: true, jefe: false });
  assert.deepEqual(Object.keys(nom.guia.items).map(Number), [1, 2, 3, 65, 66]);
  console.log("PASS: NOM-035 en el celular (Guía I condicional y filtros oficiales)");

  // 9) Liga personal sin sesión.
  const pub = await sesion(null, { width: 390, height: 844 });
  await ir(pub, `/encuesta/${S.TOKEN}`);
  await pub.getByText("Pregunta 1 de 6").waitFor({ timeout: 30000 });
  await sinDesborde(pub, "390-liga");
  await pantallaCompletaLegible(pub, "390-liga", false);
  await captura(pub, "390-liga-personal");
  console.log("PASS: liga personal sin contraseña");

  assert.deepEqual(errores, [], `errores en la página: ${errores.join(" | ")}`);
  exito = true;
  console.log("OK: verificación de Clima y NOM-035 completa");
} finally {
  if (!exito && pagina)
    console.error(
      "Se quedó en",
      pagina.url(),
      "→",
      (
        await pagina
          .locator("body")
          .innerText()
          .catch(() => "")
      ).slice(0, 600),
      "\nFallidas:",
      fallidas.slice(-8),
      "\nErrores:",
      errores
    );
  await browser.close();
  next.kill();
  if (!exito) process.exitCode = 1;
}
