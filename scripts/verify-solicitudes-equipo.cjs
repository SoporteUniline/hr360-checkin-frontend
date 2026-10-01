/* Integración completa contra un backend local ficticio; nunca usa datos ni
 * credenciales de producción. Requiere Playwright + Chromium disponibles.
 * Opcionales: CHROMIUM_EXECUTABLE_PATH, PLAYWRIGHT_MODULE_PATH,
 * TEAM_TEST_OUTPUT, TEAM_TEST_PORT, NEXT_FONT_GOOGLE_MOCKED_RESPONSES.
 */
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { spawn, spawnSync } = require("node:child_process");
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE_PATH || "playwright",
);
const repo = path.resolve(__dirname, "..");
const output =
  process.env.TEAM_TEST_OUTPUT ||
  fs.mkdtempSync(path.join(os.tmpdir(), "adamia-equipo-"));
fs.mkdirSync(output, { recursive: true });
const port = Number(process.env.TEAM_TEST_PORT || 4420);
const base = `http://127.0.0.1:${port}`;
const secret = "local-team-fixture-not-production";
const workdays = "Lunes,Martes,Miércoles,Jueves,Viernes";
const staff = [
  { id_empleado: 1, id_empresa: 10, nombre_completo: "Responsable de prueba" },
  {
    id_empleado: 2,
    id_empresa: 10,
    nombre_completo: "Mariana López",
    id_autoriza_vacaciones: 1,
    id_autoriza_permisos: 8,
    dias_trabajo: workdays,
    puesto: "Analista de operaciones",
  },
  {
    id_empleado: 3,
    id_empresa: 10,
    nombre_completo: "Carlos Ramírez",
    id_autoriza_permisos: 1,
    id_autoriza_vacaciones: 8,
    dias_trabajo: workdays,
  },
  {
    id_empleado: 4,
    id_empresa: 10,
    nombre_completo: "Persona fuera del equipo",
    id_autoriza_vacaciones: 8,
  },
  {
    id_empleado: 5,
    id_empresa: 999,
    nombre_completo: "Otra empresa",
    id_autoriza_vacaciones: 1,
  },
];
const vacation = {
  id_empleado: 2,
  tipo_permiso_nombre: "Vacaciones",
  descuenta_vacaciones: 1,
  dias_trabajo: workdays,
};
let requests = [
  {
    ...vacation,
    id: 101,
    estado: "Pendiente",
    fecha_inicio: "2026-10-01",
    fecha_fin: "2026-10-02",
    motivo: "Viaje familiar",
    marca_tiempo: "2026-09-30T12:00:00Z",
  },
  {
    ...vacation,
    id: 102,
    estado: "Pendiente",
    fecha_inicio: "2026-10-12",
    fecha_fin: "2026-10-16",
    motivo: "Descanso",
    marca_tiempo: "2026-09-29T12:00:00Z",
    id_periodo_vacaciones: 7,
  },
  {
    id: 103,
    id_empleado: 3,
    tipo_permiso_nombre: "Permiso personal",
    descuenta_vacaciones: 0,
    estado: "Pendiente",
    fecha_inicio: "2026-10-08",
    fecha_fin: "2026-10-08",
    marca_tiempo: "2026-09-28T12:00:00Z",
  },
  ...Array.from({ length: 15 }, (_, i) => ({
    ...vacation,
    id: 200 + i,
    estado: i === 1 ? "Rechazado" : i === 2 ? "Cancelado" : "Aprobado",
    fecha_inicio: `2026-${String(1 + Math.floor(i / 2)).padStart(2, "0")}-${i % 2 ? "15" : "02"}`,
    fecha_fin: `2026-${String(1 + Math.floor(i / 2)).padStart(2, "0")}-${i % 2 ? "16" : "03"}`,
    marca_tiempo: `2026-${String(1 + Math.floor(i / 2)).padStart(2, "0")}-01`,
  })),
  { ...vacation, id: 800, id_empleado: 1, estado: "Pendiente" },
  { ...vacation, id: 801, id_empleado: 4, estado: "Pendiente" },
  { ...vacation, id: 802, id_empleado: 5, estado: "Pendiente" },
  { ...vacation, id: 803, id_empleado: 3, estado: "Pendiente" },
  {
    ...vacation,
    id: 804,
    descuenta_vacaciones: 0,
    tipo_permiso_nombre: "Permiso personal",
    estado: "Pendiente",
  },
];
let rosterDenied = false,
  balanceDenied = false,
  holidaysDenied = false,
  omitTotal = false,
  emptyTeam = false;
const writes = [],
  reads = [];
function paginate(rows, url, key) {
  const limit = Math.min(3, Number(url.searchParams.get("limit") || 10));
  const page = Number(url.searchParams.get("page") || 1);
  return {
    [key]: rows.slice((page - 1) * limit, page * limit),
    ...(!omitTotal ? { total: rows.length } : {}),
  };
}
const fixture = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://local");
  res.setHeader("Access-Control-Allow-Origin", base);
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Content-Type", "application/json");
  const send = (data, status = 200) => {
    res.statusCode = status;
    res.end(JSON.stringify(data));
  };
  if (req.method === "OPTIONS") return send({});
  if (!req.headers.authorization) return send({ error: "Unauthorized" }, 401);
  reads.push(url.pathname);
  if (url.pathname.endsWith("/users/verify/token"))
    return send({
      user: {
        id_usuario: 10,
        id_empleado: 1,
        id_empresa: 10,
        empresas: [10],
        tipo_usuario: "Empleado",
        esEmpleado: true,
        nombre: "Responsable",
        zona_horaria: "America/Mexico_City",
      },
    });
  if (url.pathname === "/checador/empleados")
    return rosterDenied
      ? send({}, 403)
      : send(paginate(emptyTeam ? staff.slice(0, 1) : staff, url, "data"));
  if (url.pathname.includes("/solicitudes-permiso/empleado/"))
    return send(
      paginate(
        requests.filter(
          (row) => String(row.id_empleado) === url.pathname.split("/").pop(),
        ),
        url,
        "results",
      ),
    );
  if (url.pathname.endsWith("/por-autorizar"))
    return send(
      paginate(
        requests.filter(
          (row) =>
            [101, 102, 103].includes(row.id) && row.estado === "Pendiente",
        ),
        url,
        "results",
      ),
    );
  if (url.pathname.endsWith("/estado") && req.method === "PATCH") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw),
      row = requests.find(
        (row) => String(row.id) === url.pathname.split("/").at(-2),
      );
    assert.ok([101, 102, 103].includes(row.id));
    assert.equal(body.actualizado_por, 10);
    if (row.estado !== "Pendiente")
      return send({ error: "Already resolved" }, 409);
    row.estado = body.estado;
    row.fecha_actualizacion = "2026-10-01";
    writes.push({ id: row.id, ...body });
    return send({ success: true });
  }
  if (url.pathname.endsWith("/vacaciones/reporte"))
    return balanceDenied
      ? send({}, 403)
      : send([
          {
            id_empleado: 2,
            dias_cargados: 16,
            dias_tomados: 4,
            dias_disponibles: 12,
          },
          { id_empleado: 4, dias_disponibles: 999 },
        ]);
  if (url.pathname.includes("/vacaciones/cargados/"))
    return send({
      periodos: [
        {
          id: 7,
          anios: 2,
          dias: 16,
          fecha_inicio: "2026-01-01",
          fecha_fin: "2026-12-31",
          estado: "Activa",
        },
      ],
    });
  if (url.pathname.includes("/holidays/"))
    return holidaysDenied
      ? send({}, 403)
      : send({ festivos: [{ fecha: "2026-10-05" }] });
  return send({});
});
function token(role = "Empleado") {
  const body =
    Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url") +
    "." +
    Buffer.from(
      JSON.stringify({
        tipo_usuario: role,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url");
  return (
    body +
    "." +
    crypto.createHmac("sha256", secret).update(body).digest("base64url")
  );
}
let server, browser, page;
const pageErrors = [];
async function api(pathname = "", options = {}) {
  return fetch(base + "/api/solicitudes-equipo" + pathname, {
    ...options,
    headers: { Cookie: `token=${token()}`, Origin: base, ...options.headers },
  });
}
async function screenshot(name) {
  await page.screenshot({
    path: path.join(output, `${name}.png`),
    fullPage: !(await page.getByRole("dialog").count()),
    animations: "disabled",
  });
}
async function noOverflow() {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "Horizontal page overflow",
  );
}
async function main() {
  await new Promise((resolve) => fixture.listen(0, "127.0.0.1", resolve));
  const backend = `http://127.0.0.1:${fixture.address().port}`;
  const log = fs.openSync(path.join(output, "server.log"), "w");
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
        NEXT_PUBLIC_RUTA_BACKEND: backend,
        JWT_SECRET: secret,
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", log, log],
    },
  );
  for (let i = 0; i < 120; i++) {
    try {
      await fetch(base + "/favicon.ico");
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  // Attempt the prescribed CLI verification when the environment provides it.
  if (process.env.AGENT_BROWSER_BIN) {
    const result = spawnSync(
      process.env.AGENT_BROWSER_BIN,
      [
        "--executable-path",
        process.env.CHROMIUM_EXECUTABLE_PATH,
        "open",
        base + "/empleado/panel/solicitudes-equipo",
      ],
      { timeout: 25000, encoding: "utf8", env: process.env },
    );
    fs.writeFileSync(
      path.join(output, "agent-browser.log"),
      `${result.stdout || ""}\n${result.stderr || ""}\n${result.error || ""}`,
    );
    console.log(
      "agent-browser:",
      result.status === 0
        ? "available"
        : "unavailable; verify using Playwright Chromium",
    );
  }
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "es-MX",
  });
  await context.addCookies([
    { name: "token", value: token(), domain: "127.0.0.1", path: "/" },
  ]);
  await context.route(
    /https:\/\/(maps.googleapis.com|connect.facebook.net|www.facebook.com)/,
    (route) => route.fulfill({ status: 200, body: "" }),
  );
  page = await context.newPage();
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.clock.setFixedTime(new Date("2026-10-01T18:00:00Z"));
  await page.goto(base + "/empleado/panel/solicitudes-equipo");
  await page
    .getByRole("tab", { name: /Por autorizar/ })
    .waitFor({ timeout: 60000 });
  assert.equal(await page.locator("[data-nextjs-dialog]").count(), 0);
  await noOverflow();
  await screenshot("01-pendientes");
  console.log("Browser: page loaded, key controls render, no error overlay.");
  const all = await (await api()).json();
  assert.deepEqual(
    all.team.map((row) => row.id),
    [2, 3],
  );
  assert.equal(all.requests.length, 18);
  assert.ok(
    all.requests.every((row) => ![800, 801, 802, 803, 804].includes(row.id)),
  );
  assert.ok(
    !reads.some((url) => /empleado\/(4|5)$/.test(url)),
    "must not fetch outsider history",
  );
  omitTotal = true;
  assert.equal((await (await api()).json()).requests.length, 18);
  omitTotal = false;
  assert.equal((await fetch(base + "/api/solicitudes-equipo")).status, 401);
  for (const id of [800, 801, 802, 803, 804, 999])
    assert.equal((await api(`/${id}`)).status, 404);
  assert.equal(
    (
      await api("/101", {
        method: "POST",
        headers: { Origin: "https://evil.example" },
        body: JSON.stringify({ estado: "Aprobado" }),
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await api("/101", {
        method: "POST",
        body: JSON.stringify({ estado: "Deleted" }),
      })
    ).status,
    400,
  );
  rosterDenied = true;
  assert.equal((await api()).status, 403);
  rosterDenied = false;
  balanceDenied = true;
  const unavailable = await (await api("/101")).json();
  assert.equal(unavailable.balance, null);
  assert.ok(unavailable.warning);
  balanceDenied = false;
  holidaysDenied = true;
  assert.equal((await (await api()).json()).holidaysAvailable, false);
  holidaysDenied = false;
  await page.getByRole("button", { name: /Mariana López.*2 días/ }).click();
  await page
    .getByText("No informado en esta solicitud", { exact: true })
    .waitFor();
  await page.getByText(/martes.*06.*oct.*2026/).waitFor();
  await page.getByText("Ver periodos registrados (1)").click();
  await screenshot("02-detalle");
  await noOverflow();
  await page.getByRole("button", { name: "Aprobar", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar decisión" }).click();
  await page
    .getByRole("tab", { name: "Por autorizar 2", exact: true })
    .waitFor();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].estado, "Aprobado");
  assert.equal(
    (
      await api("/101", {
        method: "POST",
        body: JSON.stringify({ estado: "Rechazado" }),
      })
    ).status,
    409,
  );
  await page.getByRole("tab", { name: "Historial", exact: true }).click();
  await page.getByRole("button", { name: "Página siguiente" }).waitFor();
  await page.getByRole("textbox", { name: "Buscar solicitudes" }).fill("200");
  assert.equal(
    await page.getByRole("button", { name: /Mariana López.*Revisar/ }).count(),
    1,
  );
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar" }).click();
  const download = await downloadPromise;
  await download.saveAs(path.join(output, "historial.csv"));
  assert.ok(
    fs
      .readFileSync(path.join(output, "historial.csv"), "utf8")
      .includes("2026-01-02"),
  );
  await page.getByRole("textbox", { name: "Buscar solicitudes" }).fill("");
  await screenshot("03-historial");
  await page.getByRole("tab", { name: "Calendario", exact: true }).click();
  await page
    .getByRole("heading", { name: "octubre 2026", exact: true })
    .waitFor();
  await screenshot("04-calendario-mes");
  await page.getByRole("button", { name: "Año", exact: true }).click();
  await page.getByRole("button", { name: "Ver diciembre de 2026" }).waitFor();
  await screenshot("05-calendario-anual");
  await page.getByRole("button", { name: "Ver diciembre de 2026" }).click();
  await page
    .getByRole("heading", { name: "diciembre 2026", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Hoy", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow();
  await screenshot("06-movil-calendario");
  await page.getByRole("tab", { name: /Por autorizar/ }).click();
  await page.getByRole("button", { name: /Mariana López.*5 días/ }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByText("Periodo de cargo", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Aprobar", exact: true }).waitFor();
  await screenshot("07-movil-detalle");
  const approveRect = await page
    .getByRole("button", { name: "Aprobar", exact: true })
    .boundingBox();
  assert.ok(
    approveRect.y >= 0 && approveRect.y + approveRect.height <= 845,
    "Mobile decision buttons must be in viewport",
  );
  await noOverflow();
  await page.getByRole("button", { name: "Rechazar", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar decisión" }).click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page
    .getByRole("tab", { name: "Por autorizar 1", exact: true })
    .waitFor();
  await page.getByRole("button", { name: /Carlos Ramírez.*Revisar/ }).click();
  await page.getByRole("button", { name: "Aprobar", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar decisión" }).click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByText("Todo al día", { exact: true }).waitFor();
  await page.getByRole("tab", { name: "Historial", exact: true }).click();
  assert.equal(
    await page.getByRole("tab", { name: "Calendario", exact: true }).count(),
    1,
  );
  await noOverflow();
  await screenshot("08-movil-historial");
  emptyTeam = true;
  await page.getByRole("button", { name: "Actualizar solicitudes" }).click();
  await page
    .getByText("Aún no tienes colaboradores asignados", { exact: true })
    .waitFor();
  emptyTeam = false;
  assert.deepEqual(pageErrors, []);
  assert.equal(writes.length, 3);
  fs.writeFileSync(
    path.join(output, "result.json"),
    JSON.stringify(
      {
        passed: true,
        writes,
        pageErrors,
        checks: [
          "scope",
          "all-pages",
          "authentication",
          "csrf",
          "permissions",
          "balance-unavailable",
          "no-inferred-period",
          "approve",
          "reject",
          "stale-action",
          "search-all",
          "csv",
          "calendar-month-year",
          "mobile",
          "empty-team",
          "zero-pending",
        ],
      },
      null,
      2,
    ),
  );
  console.log(`All checks passed. Evidence: ${output}`);
}
main()
  .catch(async (error) => {
    console.error(error);
    if (page) {
      await screenshot("failure").catch(() => {});
      console.error((await page.locator("body").innerText()).slice(-12000));
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    server?.kill("SIGTERM");
    fixture.close();
  });
