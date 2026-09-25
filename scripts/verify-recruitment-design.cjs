/* End-to-end design verification. Uses only a local API fixture and fictitious data.
 * Requirements: Playwright + Chromium available in the execution environment.
 * CHROMIUM_EXECUTABLE_PATH is optional. No production credentials are used.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");

const repo = path.resolve(__dirname, "..");
const output =
  process.env.RECRUITMENT_TEST_OUTPUT ||
  fs.mkdtempSync(path.join(os.tmpdir(), "adamia-recruitment-"));
fs.mkdirSync(output, { recursive: true });
const port = process.env.RECRUITMENT_TEST_PORT || "4410";
const base = `http://127.0.0.1:${port}`;
const secret = "reclutamiento-local-fixture";
const log = fs.openSync(path.join(output, "server.log"), "w");
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "-p", port, "-H", "127.0.0.1"],
  {
    cwd: repo,
    env: {
      ...process.env,
      NEXT_PUBLIC_RUTA_BACKEND: "http://fixture.local/api",
      JWT_SECRET: secret,
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: ["ignore", log, log],
  }
);
let browser, page;
const errors = [],
  writes = [];
function token() {
  const body =
    Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url") +
    "." +
    Buffer.from(
      JSON.stringify({ tipo_usuario: "Recruiter", exp: Math.floor(Date.now() / 1000) + 3600 })
    ).toString("base64url");
  return body + "." + crypto.createHmac("sha256", secret).update(body).digest("base64url");
}
async function screenshot(name, target = page) {
  await target.screenshot({
    path: path.join(output, `${name}.png`),
    fullPage: !(await target.getByRole("dialog").count()),
  });
}
async function noOverflow(target = page) {
  assert(
    await target.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    "Horizontal page overflow"
  );
  const clipped = await target.evaluate(() =>
    Array.from(
      document.querySelectorAll('[role="dialog"], [role="tab"], [class*="dialogFooter"] button')
    )
      .filter((element) => {
        if (!element.getClientRects().length) return false;
        const rect = element.getBoundingClientRect();
        return rect.left < -1 || rect.right > innerWidth + 1;
      })
      .map((element) => ({
        text: element.textContent.slice(0, 80),
        rect: element.getBoundingClientRect().toJSON(),
      }))
  );
  assert.deepEqual(clipped, [], "Clipped dialog or tabs");
}
async function main() {
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      await fetch(base + "/reclutamiento-demo/example/example");
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "es-MX",
  });
  await context.addCookies([{ name: "token", value: token(), domain: "127.0.0.1", path: "/" }]);
  await context.route("http://fixture.local/**", (route) => {
    if (route.request().method() !== "GET") writes.push(route.request().url());
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        route.request().url().includes("/users/verify/token")
          ? {
              user: {
                id_usuario: 1,
                id_empresa: 1,
                nombre: "Cuenta de prueba",
                correo: "prueba@example.test",
                tipo_usuario: "Recruiter",
              },
            }
          : { data: [], sucursales: [] }
      ),
    });
  });
  await context.route(/https:\/\/(maps.googleapis|connect.facebook|www.facebook)/, (route) =>
    route.fulfill({ status: 200, body: "" })
  );
  context.on("page", (target) => target.on("pageerror", (error) => errors.push(error.message)));
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(base + "/panel/reclutamiento", { timeout: 90000 });
  await page
    .getByRole("button", { name: "Nueva vacante", exact: true })
    .waitFor({ timeout: 60000 });
  await noOverflow();
  await screenshot("vacancies-desktop");
  assert.equal(await page.locator("article").count(), 5);
  console.log("PASS first render, protected navigation and desktop layout");
  if (process.env.RECRUITMENT_SMOKE_ONLY === "1") return;

  await page.getByRole("button", { name: "Nueva vacante", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Siguiente", exact: true }).click();
  await dialog.getByText("Escribe el nombre del puesto.", { exact: true }).waitFor();
  await dialog.getByLabel("Nombre del puesto *", { exact: true }).fill("Coordinador de talento");
  await dialog.getByLabel("Sucursal *", { exact: true }).selectOption("centro");
  const editor = dialog.getByRole("textbox", { name: "Acerca del puesto", exact: true });
  await editor.fill("Ayúdanos a encontrar al próximo equipo.");
  await editor.press("Control+a");
  await dialog.getByRole("button", { name: "Negrita", exact: true }).click();
  await screenshot("create-desktop");
  await dialog.getByRole("button", { name: "Siguiente", exact: true }).click();
  await dialog.getByRole("button", { name: "Agregar pregunta", exact: true }).click();
  await dialog
    .getByLabel("Título de la pregunta", { exact: true })
    .fill("¿Cuándo puedes comenzar?");
  await dialog.getByLabel("Tipo de respuesta", { exact: true }).selectOption("select");
  await dialog
    .getByLabel("Opciones de respuesta", { exact: true })
    .fill("Esta semana\nEn dos semanas\nEl próximo mes");
  await dialog.getByLabel("Respuesta obligatoria", { exact: true }).check();
  await dialog.getByRole("button", { name: "Listo", exact: true }).click();
  await dialog.getByRole("button", { name: "Subir pregunta 6", exact: true }).click();
  assert.match(
    await dialog.getByRole("button", { name: /Arrastrar pregunta 5:/ }).getAttribute("aria-label"),
    /Cuándo/
  );
  const handle = dialog.getByRole("button", { name: /Arrastrar pregunta 5:/ });
  await handle.focus();
  await handle.press("Space");
  await page.waitForFunction(() => document.querySelector('[data-dragging="true"]'));
  await handle.press("ArrowUp");
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll('[id^="DndLiveRegion"]')).some((element) =>
      element.textContent.includes("over droppable area experience")
    )
  );
  await page.keyboard.press("Space");
  await dialog.getByRole("button", { name: /Arrastrar pregunta 4: ¿Cuándo/ }).waitFor();
  await screenshot("questions-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow();
  await screenshot("questions-mobile");
  await dialog.getByRole("button", { name: "Siguiente", exact: true }).click();
  await noOverflow();
  await screenshot("publish-mobile");
  await dialog.getByRole("button", { name: "Publicar prueba", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByRole("heading", { name: "Coordinador de talento", exact: true }).waitFor();
  const publicPath = await page
    .getByRole("link", { name: "Abrir vista pública", exact: true })
    .getAttribute("href");
  await noOverflow();
  await screenshot("publication-mobile");
  console.log(
    "PASS create validation, rich text, configurable required questions, reorder, publication"
  );

  const publicPage = await context.newPage();
  publicPage.setDefaultTimeout(15000);
  await publicPage.goto(base + publicPath);
  await publicPage.getByRole("heading", { name: "Coordinador de talento", exact: true }).waitFor();
  assert(
    (await publicPage.locator("strong").allTextContents()).includes(
      "Ayúdanos a encontrar al próximo equipo."
    )
  );
  await noOverflow(publicPage);
  await screenshot("public-desktop", publicPage);
  await publicPage.setViewportSize({ width: 390, height: 844 });
  await noOverflow(publicPage);
  await screenshot("public-mobile", publicPage);
  await publicPage.getByLabel("Nombre completo *", { exact: true }).fill("Elena Prueba");
  await publicPage.getByLabel("Correo electrónico *", { exact: true }).fill("elena@example.test");
  await publicPage.getByLabel("Teléfono *", { exact: true }).fill("3312345678");
  await publicPage
    .getByLabel("¿Cuánta experiencia tienes en un puesto similar? *", { exact: true })
    .selectOption("1 a 3 años");
  await publicPage
    .getByLabel("¿Cuándo puedes comenzar? *", { exact: true })
    .selectOption("En dos semanas");
  await publicPage
    .getByLabel("Entiendo que esta es una demostración y estoy usando datos ficticios.")
    .check();
  await publicPage
    .getByRole("button", { name: "Enviar postulación de prueba", exact: true })
    .click();
  await publicPage
    .getByRole("heading", { name: "¡Listo! Recibimos tu prueba", exact: true })
    .waitFor();
  await page.getByRole("tab", { name: /^Candidatos/ }).click();
  await page.getByRole("button", { name: /Elena Prueba/ }).click();
  await dialog.getByText("En dos semanas", { exact: true }).waitFor();
  await noOverflow();
  await screenshot("candidate-mobile");
  await dialog.getByRole("tab", { name: "Seguimiento", exact: true }).click();
  await dialog
    .getByLabel("Agregar una nota", { exact: true })
    .fill("Perfil revisado en la demostración.");
  await dialog.getByRole("button", { name: "Guardar nota", exact: true }).click();
  await dialog.getByText("Perfil revisado en la demostración.", { exact: false }).waitFor();
  await dialog.getByLabel("Etapa del proceso", { exact: true }).selectOption("offer");
  await dialog.getByRole("tab", { name: "Contratar", exact: true }).click();
  await dialog.getByLabel("Fecha de ingreso *", { exact: true }).fill("2027-01-10");
  await dialog.getByLabel("Sucursal de alta *", { exact: true }).selectOption("centro");
  for (const label of [
    "Datos del candidato revisados",
    "Oferta aceptada",
    "Documentación verificada",
  ])
    await dialog.getByLabel(label, { exact: true }).check();
  await screenshot("hiring-mobile");
  await dialog
    .getByRole("button", { name: "Completar contratación de prueba", exact: true })
    .click();
  await dialog.getByText("Contratación de ejemplo completada", { exact: true }).waitFor();
  await dialog.getByRole("button", { name: "Cerrar", exact: true }).click();
  console.log(
    "PASS public application -> candidate answers -> note -> offer -> hiring, cross-tab synchronization"
  );

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("button", { name: "Acciones de Coordinador de talento", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Pausar postulaciones", exact: true }).click();
  await dialog.getByRole("button", { name: "Pausar vacante", exact: true }).click();
  await publicPage.reload();
  await publicPage
    .getByRole("heading", { name: "Postulaciones no disponibles", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Acciones de Coordinador de talento", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Duplicar como borrador", exact: true }).click();
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.getByRole("button", { name: "Volver a vacantes", exact: true }).click();
  await page.getByRole("button", { name: "Página siguiente", exact: true }).click();
  await page.getByText("Página 2 de 2", { exact: true }).waitFor();
  await page
    .getByRole("searchbox", { name: "Buscar en todas las vacantes", exact: true })
    .fill("COORDINADOR");
  assert.equal(await page.locator("article").count(), 2);
  await page.getByText("Página 1 de 1", { exact: true }).waitFor();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar", exact: true }).click();
  const file = await download;
  await file.saveAs(path.join(output, file.suggestedFilename()));
  assert(
    fs
      .readFileSync(path.join(output, file.suggestedFilename()), "utf8")
      .includes("Coordinador de talento")
  );
  await page.reload();
  await page.getByRole("button", { name: "Coordinador de talento", exact: true }).waitFor();
  await page.getByRole("tab", { name: "Contrataciones", exact: true }).click();
  await page
    .getByRole("button", { name: "Abrir expediente de Elena Prueba", exact: true })
    .waitFor();
  await screenshot("hiring-desktop");
  assert.deepEqual(writes, [], "Demo must never send API mutations");
  assert.deepEqual(errors, [], "Browser errors");
  console.log(
    "PASS pause/public state, duplicate, search beyond current page, CSV download, reload persistence"
  );
  console.log("PASS no real API writes and no JavaScript errors");
}
main()
  .catch(async (error) => {
    console.error(error);
    if (page) {
      await screenshot("failure").catch(() => {});
      console.log(
        (
          await page
            .locator("body")
            .innerText()
            .catch(() => "")
        ).slice(-6000)
      );
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    server.kill("SIGTERM");
    fs.closeSync(log);
    console.log("Artifacts:", output);
  });
