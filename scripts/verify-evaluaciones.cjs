/* Frontend E2E con autenticación ficticia. No usa API ni datos de producción.
 * Ejecutar con Playwright y Chromium instalados; variables opcionales:
 * PLAYWRIGHT_MODULE_PATH, CHROMIUM_EXECUTABLE_PATH, AGENT_BROWSER_BIN,
 * EVALUATIONS_TEST_OUTPUT, NEXT_FONT_GOOGLE_MOCKED_RESPONSES.
 */
const assert = require("node:assert/strict"),
  http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  crypto = require("node:crypto");
const { spawn, execFile } = require("node:child_process"),
  { promisify } = require("node:util");
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE_PATH || "playwright",
);
const repo = path.resolve(__dirname, ".."),
  output =
    process.env.EVALUATIONS_TEST_OUTPUT ||
    fs.mkdtempSync(path.join(os.tmpdir(), "adamia-evaluaciones-")),
  port = Number(process.env.EVALUATIONS_TEST_PORT || 4470),
  base = `http://127.0.0.1:${port}`,
  secret = "performance-browser-fixture-only";
fs.mkdirSync(output, { recursive: true });
let companyId = 10,
  userId = 10,
  authRole = "Recruiter";
const backendRequests = [],
  errors = [],
  checks = [];
const fixture = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", base);
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") return res.end("{}");
  backendRequests.push({ method: req.method, path: req.url });
  if (req.url.includes("/users/verify/token"))
    return res.end(
      JSON.stringify({
        user: {
          id_usuario: userId,
          id_empleado: 1,
          id_empresa: companyId,
          empresas: [companyId],
          empresas_detalle: [
            {
              id_empresa: companyId,
              nombre: "Empresa ficticia",
              zona_horaria: "America/Mexico_City",
            },
          ],
          tipo_usuario: authRole,
          esEmpleado: authRole === "Empleado",
          nombre: "Prueba",
          apellido_paterno: "Local",
          zona_horaria: "America/Mexico_City",
        },
      }),
    );
  res.end("[]");
});
const jwt = (role) => {
  const h = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url",
    ),
    p = Buffer.from(
      JSON.stringify({
        tipo_usuario: role,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url");
  return `${h}.${p}.${crypto.createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url")}`;
};
let server, browser, page, log;
const mark = (s) => {
  checks.push(s);
  console.log("PASS", s);
};
(async () => {
  await new Promise((resolve) => fixture.listen(0, "127.0.0.1", resolve));
  log = fs.openSync(path.join(output, "server.log"), "w");
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "-p",
      String(port),
      "-H",
      "127.0.0.1",
    ],
    {
      cwd: repo,
      env: {
        ...process.env,
        JWT_SECRET: secret,
        NEXT_PUBLIC_RUTA_BACKEND: `http://127.0.0.1:${fixture.address().port}`,
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", log, log],
    },
  );
  for (let i = 0; i < 90; i++) {
    try {
      const response = await fetch(`${base}/panel/evaluaciones`, {
        redirect: "manual",
      });
      if (response.status === 307) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  if (process.env.AGENT_BROWSER_BIN) {
    try {
      const env = {
        ...process.env,
        AGENT_BROWSER_EXECUTABLE_PATH: process.env.CHROMIUM_EXECUTABLE_PATH,
      };
      const result = await promisify(execFile)(
        process.env.AGENT_BROWSER_BIN,
        ["--session", "evaluaciones-check", "open", `${base}/login`],
        { env, timeout: 45000 },
      );
      fs.writeFileSync(
        path.join(output, "agent-browser.log"),
        result.stdout + result.stderr,
      );
      await promisify(execFile)(
        process.env.AGENT_BROWSER_BIN,
        ["--session", "evaluaciones-check", "snapshot", "-i"],
        { env, timeout: 15000 },
      ).then((r) =>
        fs.appendFileSync(path.join(output, "agent-browser.log"), r.stdout),
      );
      await promisify(execFile)(
        process.env.AGENT_BROWSER_BIN,
        ["--session", "evaluaciones-check", "close"],
        { env, timeout: 15000 },
      );
    } catch (e) {
      fs.writeFileSync(path.join(output, "agent-browser.log"), e.message);
      console.log(
        "Agent-browser unavailable; verifying with Playwright:",
        e.message.slice(0, 180),
      );
    }
  }
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--single-process",
      "--no-zygote",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addCookies([
    { name: "token", value: jwt("Recruiter"), url: base },
  ]);
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (
      url.includes("/browser-tools/font/") &&
      process.env.NEXT_FONT_GOOGLE_MOCKED_RESPONSES
    )
      return route.fulfill({
        contentType: "font/woff2",
        body: fs.readFileSync(
          path.join(
            path.dirname(process.env.NEXT_FONT_GOOGLE_MOCKED_RESPONSES),
            "font/package/files/inter-latin-400-normal.woff2",
          ),
        ),
      });
    if (
      url.startsWith(base) ||
      url.startsWith(`http://127.0.0.1:${fixture.address().port}`) ||
      url.startsWith("data:")
    )
      return route.continue();
    return route.abort();
  });
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(90000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  const go = async (url) => {
    await page.goto(base + "/panel/evaluaciones" + (url ? "/" + url : ""), {
      waitUntil: "domcontentloaded",
    });
    await page.locator(".ev-module h1").waitFor({ timeout: 60000 });
  };
  const nav = async (name) => {
    await page
      .locator(".ev-nav")
      .getByRole("link", { name, exact: true })
      .click();
    const headings = {
      Resumen: "Evaluación de desempeño",
      Plantillas: "Plantillas de evaluación",
      Campañas: "Campañas de evaluación",
      Resultados: "Resultados e historial",
      Tablero: "Tablero de desempeño",
      Configuración: "Configuración de evaluaciones",
      "Mis evaluaciones": "Mis evaluaciones recibidas",
      "Mis pendientes": "Mis evaluaciones pendientes",
    };
    if (headings[name])
      await page
        .getByRole("heading", { name: headings[name], exact: true })
        .waitFor();
    else await page.locator(".ev-module h1").waitFor();
  };
  const actor = async (id) => {
    await page.getByLabel("Probar como perfil ficticio").selectOption(id);
    await page.waitForURL(
      base +
        "/panel/evaluaciones" +
        (id === "p-mariana" ? "/mis-pendientes" : ""),
    );
    await page
      .getByRole("heading", {
        name:
          id === "p-rh"
            ? "Evaluación de desempeño"
            : id === "p-jefe"
              ? "Desempeño de mi equipo"
              : "Mis evaluaciones pendientes",
        exact: true,
      })
      .waitFor();
  };
  const shot = async (name) =>
    page.screenshot({
      path: path.join(output, name + ".png"),
      fullPage: true,
      animations: "disabled",
      style: ".notistack-SnackbarContainer {visibility:hidden!important}",
    });
  const noOverflow = async () =>
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
      "Page must not overflow horizontally",
    );
  await go("");
  assert.match(
    await page.locator(".ev-module h1").innerText(),
    /Evaluación de desempeño/,
  );
  await shot("01-resumen-desktop");
  await noOverflow();
  mark("Entry, auth integration and desktop dashboard");
  await nav("Plantillas");
  await page
    .getByRole("link", { name: "Nueva plantilla", exact: true })
    .click();
  await page
    .getByLabel("Nombre de plantilla", { exact: true })
    .fill("E2E · Formato completo");
  await page
    .getByLabel("Nombre de categoría 1", { exact: true })
    .fill("Competencia de prueba");
  await page
    .getByLabel("Pregunta 1.1", { exact: true })
    .fill("Escala de prueba");
  for (const [type, label] of [
    ["boolean", "Sí o no de prueba"],
    ["text", "Explica tu respuesta"],
    ["choice", "Elige una opción"],
    ["number", "Resultado numérico"],
  ]) {
    await page
      .getByRole("button", { name: "Agregar pregunta", exact: true })
      .click();
    const n = await page.locator(".ev-question-editor").count();
    await page.getByLabel(`Pregunta 1.${n}`, { exact: true }).fill(label);
    await page
      .getByLabel(`Tipo de pregunta 1.${n}`, { exact: true })
      .selectOption(type);
  }
  await page
    .getByRole("button", { name: "Subir pregunta 1.5", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("Pregunta 1.4", { exact: true }).inputValue(),
    "Resultado numérico",
  );
  await page.getByRole("button", { name: "Vista previa", exact: true }).click();
  assert.equal(await page.getByRole("radiogroup").count(), 2);
  await page
    .getByRole("button", { name: "Guardar plantilla", exact: true })
    .click();
  await page.getByText("E2E · Formato completo", { exact: true }).waitFor();
  mark(
    "Template editor: five response types, reorder, preview and persistence",
  );
  await nav("Campañas");
  await page
    .getByRole("link", { name: "Nueva evaluación", exact: true })
    .click();
  await page
    .getByLabel("Nombre de campaña", { exact: true })
    .fill("E2E · Autoevaluación");
  await page
    .getByLabel("Plantilla principal", { exact: true })
    .selectOption({ label: "E2E · Formato completo · v1" });
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: /^Autoevaluación/ }).click();
  await page.getByLabel("Evaluar a Mariana López", { exact: true }).check();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByRole("switch", {
      name: "Colaborador puede ver su calificación",
      exact: true,
    })
    .uncheck();
  await page
    .getByRole("switch", {
      name: "Colaborador puede ver comentarios",
      exact: true,
    })
    .uncheck();
  await shot("02-programar-desktop");
  await page
    .getByRole("button", { name: "Iniciar campaña", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Iniciar campaña", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "E2E · Autoevaluación", exact: true })
    .waitFor();
  mark("Create campaign, eligible assignments, 100% validation and launch");
  await actor("p-mariana");
  await page
    .getByPlaceholder("Buscar persona o campaña…")
    .fill("E2E · Autoevaluación");
  await page.getByRole("link", { name: "Evaluar", exact: true }).click();
  await page
    .getByRole("button", { name: "Escala de prueba: 4, Alto", exact: true })
    .click();
  await page
    .getByRole("radiogroup", { name: "Sí o no de prueba", exact: true })
    .getByLabel("No", { exact: true })
    .check();
  await page
    .getByLabel("Explica tu respuesta", { exact: true })
    .fill("Respuesta libre de prueba");
  await page
    .getByRole("radiogroup", { name: "Elige una opción", exact: true })
    .getByLabel("Opción 2", { exact: true })
    .check();
  await page
    .getByLabel("Resultado numérico (0 a 10)", { exact: true })
    .fill("0");
  await page
    .getByLabel("Comentarios finales", { exact: true })
    .fill("Fortaleza visible del colaborador");
  await page
    .getByLabel("Nota privada para RH", { exact: true })
    .fill("NOTA PRIVADA E2E");
  await page
    .getByRole("button", { name: "Guardar borrador", exact: true })
    .click();
  await page.waitForTimeout(100);
  await page.reload();
  await page.getByLabel("Probar como perfil ficticio").waitFor(); // Reload returns to default RH; access stays protected.
  await actor("p-mariana");
  await page
    .getByPlaceholder("Buscar persona o campaña…")
    .fill("E2E · Autoevaluación");
  await page.getByRole("link", { name: "Continuar", exact: true }).click();
  assert.equal(
    await page
      .getByLabel("Resultado numérico (0 a 10)", { exact: true })
      .inputValue(),
    "0",
  );
  await shot("03-responder-desktop");
  await page
    .getByRole("button", { name: "Enviar evaluación", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar envío", exact: true })
    .click();
  mark("Draft survives reload, numeric zero/false, all five answers submitted");
  await actor("p-rh");
  await nav("Resultados");
  await page
    .getByPlaceholder("Buscar colaborador, campaña o área…")
    .fill("E2E · Autoevaluación");
  await page.getByRole("link", { name: "Ver evaluación", exact: true }).click();
  assert.match(await page.locator(".ev-large-score").innerText(), /2.75/);
  await page
    .getByRole("button", { name: "Aprobar resultado", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Aprobar", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Publicar para el colaborador", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Publicar", exact: true })
    .click();
  await page
    .getByText("Resultado publicado", { exact: true })
    .first()
    .waitFor();
  mark("Weighted result 2.75; approval and publication");
  await page
    .getByRole("button", { name: "Plan de seguimiento", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Agregar acción", exact: true })
    .click();
  await page
    .getByLabel("Acción a realizar", { exact: true })
    .fill("E2E · Mejorar organización");
  await page
    .getByLabel("Criterio de cumplimiento", { exact: true })
    .fill("Entregar un plan cada lunes");
  await page.getByLabel("Fecha compromiso", { exact: true }).fill("2026-12-01");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Guardar seguimiento", exact: true })
    .click();
  await page.getByText("E2E · Mejorar organización", { exact: true }).waitFor();
  await actor("p-mariana");
  await nav("Mis evaluaciones");
  await page.getByPlaceholder("Buscar campaña…").fill("E2E · Autoevaluación");
  await page.getByRole("link", { name: "Ver evaluación", exact: true }).click();
  assert.ok(
    !(await page.locator(".ev-module").innerText()).includes(
      "NOTA PRIVADA E2E",
    ),
  );
  assert.equal(await page.locator(".ev-large-score").count(), 0);
  assert.ok(
    !(await page.locator(".ev-module").innerText()).includes(
      "Fortaleza visible del colaborador",
    ),
  );
  await page
    .getByRole("button", { name: "Confirmar recibido", exact: true })
    .click();
  await page
    .getByLabel("Nombre para confirmar recibido", { exact: true })
    .fill("Mariana López");
  await page
    .getByLabel("Observaciones de recepción", { exact: true })
    .fill("Recibido; solicito conversar sobre el resultado.");
  await page.getByRole("switch", { name: /Confirmo que recibí/ }).check();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar recibido", exact: true })
    .click();
  await page.getByText(/Recepción registrada el/).waitFor();
  await shot("04-resultado-desktop");
  mark(
    "Employee publication visibility, private-note exclusion and receipt with disagreement",
  );
  await page
    .getByRole("button", { name: "Plan de seguimiento", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ver seguimiento", exact: true })
    .click();
  await page
    .getByLabel("Avance del plan", { exact: true })
    .selectOption("completed");
  await page
    .getByLabel("Notas de seguimiento", { exact: true })
    .fill("Objetivo cumplido");
  await page
    .getByLabel("Título de evidencia", { exact: true })
    .fill("Plan semanal");
  await page
    .getByLabel("Enlace a evidencia", { exact: true })
    .fill("https://example.com/evidencia");
  await page
    .getByRole("button", { name: "Agregar enlace", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Guardar seguimiento", exact: true })
    .click();
  await page
    .locator("tbody")
    .getByText("Completado", { exact: true })
    .waitFor();
  mark("Plan owner updates status, notes and evidence");
  await actor("p-rh");
  await nav("Tablero");
  await shot("05-tablero-desktop");
  await page
    .getByRole("button", { name: "Exportar resultados", exact: true })
    .click();
  await nav("Configuración");
  await shot("06-permisos-desktop");
  await nav("Plantillas");
  await page
    .getByPlaceholder("Buscar plantilla, área o puesto…")
    .fill("liderazgo");
  assert.equal(await page.locator(".ev-table tbody tr").count(), 1);
  await page.getByRole("link", { name: "Editar", exact: true }).click();
  await page
    .getByRole("button", { name: "Pesos y escala", exact: true })
    .click();
  await shot("07-pesos-desktop");
  mark("Executive dashboard, exports, search and scale view");
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await nav("Resumen");
    await noOverflow();
    await shot(`08-resumen-mobile-${width}`);
    await actor("p-jefe");
    await nav("Mis pendientes");
    await noOverflow();
    await page.getByPlaceholder("Buscar persona o campaña…").fill("Carlos");
    await page.getByRole("link", { name: "Continuar", exact: true }).click();
    await page
      .getByRole("heading", { name: "Evaluar a Carlos", exact: true })
      .waitFor();
    await noOverflow();
    await shot(`09-respuesta-mobile-${width}`);
    await actor("p-rh");
  }
  mark("Desktop and mobile 390/320: responsive views and no page overflow");
  // Employee route shares the same scoped demo; another tenant gets a fresh isolated dataset.
  authRole = "Empleado";
  await page.close();
  page = await context.newPage();
  page.setDefaultNavigationTimeout(90000);
  page.on("pageerror", (e) => errors.push(e.message));
  await context.addCookies([
    { name: "token", value: jwt("Empleado"), url: base },
  ]);
  await page.goto(base + "/empleado/panel/evaluaciones");
  await page
    .getByRole("heading", { name: "Mis evaluaciones pendientes", exact: true })
    .waitFor();
  mark("Employee route and default employee profile");
  companyId = 99;
  userId = 99;
  authRole = "Recruiter";
  await context.addCookies([
    { name: "token", value: jwt("Recruiter"), url: base },
  ]);
  await go("plantillas");
  assert.equal(
    await page.getByText("E2E · Formato completo", { exact: true }).count(),
    0,
  );
  assert.ok(
    await page
      .getByText("Evaluación general de desempeño", { exact: true })
      .count(),
  );
  mark("User/company storage isolation");
  assert.deepEqual(errors, []);
  assert.ok(
    backendRequests.every((r) => r.method === "GET"),
    "No backend mutations",
  );
  assert.ok(!(await page.locator("[data-nextjs-dialog]").count()));
  mark("No page errors, no error overlay and no backend mutations");
  fs.writeFileSync(
    path.join(output, "report.json"),
    JSON.stringify({ checks, errors, backendRequests }, null, 2),
  );
})()
  .catch(async (e) => {
    console.error(e.stack);
    if (page) {
      await page
        .screenshot({ path: path.join(output, "failure.png"), fullPage: true })
        .catch(() => {});
      fs.writeFileSync(
        path.join(output, "failure.txt"),
        await page
          .locator("body")
          .innerText()
          .catch(() => ""),
      );
    }
    fs.writeFileSync(
      path.join(output, "report.json"),
      JSON.stringify({ checks, errors, error: e.message }, null, 2),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    if (server) server.kill("SIGTERM");
    fixture.close();
    if (log) fs.closeSync(log);
  });
