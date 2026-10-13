// Contract fixture E2E. No real backend or company records are contacted.
// Run after npm run build. PLAYWRIGHT_MODULE_PATH and CHROMIUM_EXECUTABLE_PATH optional.
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH ||
  "playwright");
const root = path.resolve(__dirname, ".."),
  port = 4490,
  base = `http://127.0.0.1:${port}`,
  secret = "evaluation-contract-test-only";
const settings = {
  employeeScore: true,
  employeeCategories: true,
  employeeComments: true,
  employeePlan: true,
  managerResults: true,
  requireApproval: true,
  requireReceipt: true,
  anonymousPeers: true,
  anonymousAscending: true,
  minimumResponses: 3,
};
const template = {
  id: 8,
  versionId: 12,
  version: 1,
  revision: 1,
  name: "Evaluación real",
  description: "Contrato de prueba",
  areaId: null,
  positionId: null,
  archived: false,
  scale: ["Muy bajo", "Bajo", "Medio", "Alto", "Muy alto"].map((label) => ({
    label,
    description: label,
  })),
  bands: [
    { min: 1, max: 2.99, label: "Seguimiento", color: "red" },
    { min: 3, max: 3.99, label: "Cumple", color: "amber" },
    { min: 4, max: 5, label: "Destaca", color: "green" },
  ],
  categories: [
    {
      id: "c1",
      name: "Resultados",
      weight: 100,
      questionWeights: "equal",
      questions: [
        {
          id: "q1",
          text: "Cumple acuerdos",
          type: "boolean",
          required: true,
          scored: true,
          weight: 1,
          yesScore: 5,
          noScore: 1,
          options: [],
        },
      ],
    },
  ],
};
let campaign = {
  id: 7,
  name: "Periodo de prueba",
  description: "",
  model: "self",
  revision: 1,
  status: "draft",
  storedStatus: "draft",
  periodStart: "2026-01-01",
  periodEnd: "2026-01-31",
  opensOn: "2026-02-01",
  dueOn: "2026-02-28",
  timezone: "America/Mexico_City",
  primaryTemplateVersionId: 12,
  groups: [{ key: "self", weight: 100, templateVersionId: 12 }],
  subjectIds: [101],
  subjects: [{ id: 90, employeeId: 101, name: "Persona de prueba" }],
  assignments: [],
  settings,
  reminders: [7, 3, 0],
  recurrence: null,
  capabilities: { canEdit: true, canLaunch: true, canDuplicate: true },
};
const people = [
  {
    id: 101,
    name: "Persona de prueba",
    area: "Ventas",
    position: "Ejecutivo",
    managerId: null,
    active: true,
    levelId: 1,
  },
];
let assignment = {
  id: 15,
  campaignId: 7,
  campaignName: "Periodo de prueba",
  subjectId: 101,
  subjectName: "Persona de prueba",
  evaluatorUserId: 1,
  perspective: "self",
  revision: 1,
  status: "pending",
  template,
  answers: {},
  categoryComments: {},
  comment: "",
  privateNote: "",
  capabilities: { canEdit: true, canSubmit: true },
};
let result = {
  campaignId: 7,
  subjectId: 101,
  campaignName: "Periodo de prueba",
  subjectName: "Persona de prueba",
  score: 4,
  categories: [{ id: "c1", name: "Resultados", score: 4 }],
  groups: [],
  complete: true,
  publication: null,
};
let plans = [];
let profile = "hr",
  calls = [],
  browser,
  server;
const list = (data) => ({
  data,
  pagination: { page: 1, pageSize: 25, total: data.length },
});
const jwt = () => {
  const h = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url"
    ),
    p = Buffer.from(
      JSON.stringify({
        tipo_usuario: "Recruiter",
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString("base64url");
  return `${h}.${p}.${crypto
    .createHmac("sha256", secret)
    .update(`${h}.${p}`)
    .digest("base64url")}`;
};
(async () => {
  const log = fs.openSync("/tmp/adamia-evaluation-server.log", "w");
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "-p",
      String(port),
      "-H",
      "127.0.0.1",
    ],
    {
      cwd: root,
      env: { ...process.env, JWT_SECRET: secret },
      stdio: ["ignore", log, log],
    }
  );
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(base);
      break;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--single-process",
      "--no-zygote",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addCookies([{ name: "token", value: jwt(), url: base }]);
  await context.route("**/*", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (!url.href.startsWith(base)) return route.abort();
    if (url.pathname === "/users/verify/token")
      return route.fulfill({
        json: {
          user: {
            id_usuario: 1,
            id_empresa: 4,
            empresas: [4],
            empresas_detalle: [{ id_empresa: 4, nombre: "Empresa de prueba" }],
            tipo_usuario: "Recruiter",
            nombre: "Prueba",
          },
        },
      });
    const prefix = "/api/checador/evaluaciones-desempeno";
    if (!url.pathname.startsWith(prefix)) {
      if (url.pathname.startsWith("/checador/"))
        return route.fulfill({ json: [] });
      return route.continue();
    }
    assert.equal(url.searchParams.get("empresa"), "4");
    assert.ok(req.headers().authorization?.startsWith("Bearer "));
    const p = url.pathname.slice(prefix.length),
      method = req.method(),
      body = req.postDataJSON();
    calls.push({ p, method, body, headers: req.headers() });
    let data;
    if (p === "/capabilities")
      data = {
        profile,
        employeeId: profile === "employee" ? 101 : null,
        userId: 1,
        scopes:
          profile === "employee"
            ? ["assignments", "results", "plans"]
            : [
                "templates",
                "catalogs",
                "levels",
                "people",
                "settings",
                "permissions",
                "campaigns",
                "assignments",
                "team",
                "results",
                "dashboard",
                "plans",
              ],
        flags: {
          canManageTemplates: profile === "hr",
          canManageCampaigns: profile === "hr",
          canPublishResults: profile === "hr",
        },
        settings,
        limits: { templateName: 160, comment: 4000 },
      };
    else if (p === "/catalogs")
      data = {
        areas: [{ id: 1, name: "Ventas" }],
        positions: [{ id: 1, name: "Ejecutivo" }],
        branches: [],
        levels: [{ id: 1, name: "Operativo", order: 1 }],
        timezone: "America/Mexico_City",
      };
    else if (p === "/people") return route.fulfill({ json: list(people) });
    else if (p === "/templates")
      return route.fulfill({ json: list([template]) });
    else if (p === "/templates/8") data = template;
    else if (p === "/templates/8/versions") {
      assert.equal(body.version, 1);
      data = { ...template, revision: 2, version: 2 };
    } else if (p === "/campaigns" && method === "GET")
      return route.fulfill({ json: list([campaign]) });
    else if (
      (p === "/campaigns/7" && method === "PATCH") ||
      (p === "/campaigns" && method === "POST")
    ) {
      campaign = { ...campaign, ...body, revision: campaign.revision + 1 };
      data = campaign;
    } else if (p === "/campaigns/7") data = campaign;
    else if (p === "/campaigns/7/preview-assignments")
      data = {
        assignments: [
          {
            subjectId: 101,
            perspective: "self",
            evaluatorEmployeeId: 101,
            evaluatorUserId: null,
            evaluatorName: "Persona de prueba",
          },
        ],
      };
    else if (p === "/campaigns/7/assignments") {
      assert.equal(body.version, campaign.revision);
      campaign = {
        ...campaign,
        assignments: body.assignments,
        revision: campaign.revision + 1,
      };
      data = campaign;
    } else if (p === "/campaigns/7/validate")
      data = { valid: true, errors: [] };
    else if (p === "/campaigns/7/launch") {
      assert.ok(req.headers()["idempotency-key"]);
      campaign = {
        ...campaign,
        status: "active",
        capabilities: {
          canEdit: false,
          canClose: true,
          canExtend: true,
          canDuplicate: true,
        },
      };
      data = campaign;
    } else if (p === "/my/assignments")
      return route.fulfill({ json: list([assignment]) });
    else if (p === "/assignments/15") data = assignment;
    else if (p === "/assignments/15/draft" || p === "/assignments/15/submit") {
      assert.equal(body.version, assignment.revision);
      if (p.endsWith("submit")) assert.ok(req.headers()["idempotency-key"]);
      assignment = {
        ...assignment,
        ...body,
        revision: assignment.revision + 1,
        status: p.endsWith("submit") ? "submitted" : "pending",
      };
      data = assignment;
    } else if (p === "/results" || p === "/my/results")
      return route.fulfill({
        json: list([
          profile === "employee"
            ? { ...result, score: undefined, categories: undefined }
            : result,
        ]),
      });
    else if (p === "/campaigns/7/results/101")
      data =
        profile === "employee"
          ? { ...result, score: undefined, categories: undefined }
          : result;
    else if (p === "/campaigns/7/results/101/approve") {
      result = { ...result, approvedAt: new Date().toISOString() };
      data = result;
    } else if (p === "/campaigns/7/results/101/publish") {
      assert.ok(req.headers()["idempotency-key"]);
      result = {
        ...result,
        publication: { publishedAt: new Date().toISOString() },
      };
      data = result;
    } else if (p === "/people/101/history") data = [];
    else if (p === "/plans" && method === "GET")
      return route.fulfill({ json: list(plans) });
    else if (p === "/plans" && method === "POST") {
      data = { ...body, id: 4, revision: 1, status: "pending", updates: [] };
      plans.push(data);
    } else if (p === "/plans/4") data = plans[0];
    else if (p === "/plans/4/updates") {
      assert.equal(body.version, plans[0].revision);
      assert.equal(body.evidence[0].externalUrl, "https://example.test/avance");
      plans[0] = {
        ...plans[0],
        revision: plans[0].revision + 1,
        status: body.status,
        updates: [...plans[0].updates, { ...body, id: 1 }],
      };
      data = plans[0];
    } else if (p === "/campaigns/7/results/101/receipt") {
      assert.equal(body.accepted, true);
      assert.equal(body.typedName, "Persona de prueba");
      result.receipt = { ...body, signedAt: new Date().toISOString() };
      data = result.receipt;
    } else if (p === "/levels") data = [{ id: 1, name: "Operativo", order: 1 }];
    else if (p === "/permissions") data = [];
    else if (p === "/settings")
      data = { config: settings, version: 1, persisted: true };
    else if (p === "/team") return route.fulfill({ json: list([]) });
    else if (p === "/dashboard")
      data = { summary: { assignments: 1, submitted: 0, average: null } };
    else
      return route.fulfill({
        status: 404,
        json: {
          error: {
            code: "NO_ENCONTRADO",
            message: `Fixture no implementada: ${p}`,
          },
        },
      });
    return route.fulfill({ json: { data, requestId: "test" } });
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  page.setDefaultTimeout(20000);
  const go = async (p) => {
    await page.goto(base + "/panel/evaluaciones" + p);
    await page.locator(".ev-module").waitFor();
  };
  await go("/plantillas");
  await page.getByText("Evaluación real", { exact: true }).waitFor();
  assert.equal(await page.getByText("Demostración del módulo").count(), 0);
  console.log("PASS: authenticated API list and no demo profile switcher");
  await go("/plantillas/8");
  await page
    .getByRole("button", { name: "Guardar plantilla", exact: true })
    .click();
  await page.waitForURL("**/evaluaciones/plantillas");
  assert.ok(
    calls.some((c) => c.p === "/templates/8/versions" && c.body.version === 1)
  );
  console.log("PASS: versioned template editor");
  await go("/campanas/7/editar");
  await page.getByRole("button", { name: /Quién evalúa a quién/ }).click();
  await page.getByRole("button", { name: "Proponer asignaciones" }).click();
  await page.getByText("self", { exact: true }).count();
  await page.waitForFunction(() =>
    document.body.innerText.includes("1 evaluaciones por responder")
  );
  await page
    .getByRole("button", { name: "Guardar borrador", exact: true })
    .click();
  await page.waitForURL("**/evaluaciones/campanas/7");
  assert.ok(
    calls.some(
      (c) =>
        c.p === "/campaigns/7/assignments" &&
        c.body.assignments[0].evaluatorEmployeeId === 101
    )
  );
  console.log("PASS: server assignment preview and versioned save");
  await go("/responder/15");
  await page.getByRole("radio", { name: "No", exact: true }).check();
  await page
    .getByRole("button", { name: "Guardar borrador", exact: true })
    .click();
  await page.waitForFunction(() =>
    document.body.innerText.includes("Borrador guardado")
  );
  assert.equal(
    calls.find((c) => c.p === "/assignments/15/draft").body.answers.q1,
    false
  );
  await page
    .getByRole("button", { name: "Enviar evaluación", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar envío", exact: true })
    .click();
  await page.waitForURL("**/evaluaciones/mis-pendientes");
  console.log("PASS: boolean false draft and idempotent submission");
  await go("/resultados/7/101");
  await page.getByRole("button", { name: "Aprobar", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await page.getByText("Publicado", { exact: true }).waitFor();
  console.log("PASS: approve and publish");
  campaign.status = "active";
  await go("/seguimiento");
  await page.getByRole("button", { name: "Nuevo plan", exact: true }).click();
  await page.getByLabel("Campaña", { exact: true }).selectOption("7");
  await page.getByLabel("Colaborador", { exact: true }).selectOption("101");
  await page
    .getByLabel("Acción", { exact: true })
    .fill("Compartir plan semanal");
  await page
    .getByLabel("Criterio de cumplimiento")
    .fill("Cuatro semanas consecutivas");
  await page.getByLabel("Fecha compromiso").fill("2026-12-01");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.getByText("Compartir plan semanal", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Registrar avance", exact: true })
    .click();
  await page.getByLabel("Estado", { exact: true }).selectOption("in_progress");
  await page
    .getByLabel("Avance", { exact: true })
    .fill("Primera semana completada");
  await page.getByLabel("Título de evidencia").fill("Reporte");
  await page
    .getByLabel("Enlace de evidencia")
    .fill("https://example.test/avance");
  await page.getByRole("button", { name: /Agregar enlace/ }).click();
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.locator(".ev-badge").filter({ hasText: "En proceso" }).waitFor();
  assert.equal(plans[0].updates.length, 1);
  console.log("PASS: plan creation and append-only evidence update");
  await go("/configuracion");
  await page
    .getByRole("button", { name: "Guardar preferencias", exact: true })
    .click();
  await page.getByText("Preferencias guardadas", { exact: true }).waitFor();
  assert.equal(
    calls.find((c) => c.p === "/settings" && c.method === "PATCH").body.version,
    1
  );
  console.log("PASS: versioned company settings");
  for (const p of [
    "",
    "/campanas",
    "/mis-pendientes",
    "/equipo",
    "/resultados",
    "/seguimiento",
    "/configuracion",
  ]) {
    await go(p);
    await page.locator("h1").first().waitFor();
  }
  profile = "employee";
  await go("/mis-evaluaciones");
  await page.getByText("Acceso limitado", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("link", { name: "Configuración", exact: true })
      .count(),
    0
  );
  await go("/plantillas");
  await page.getByText("No tienes acceso a esta sección").waitFor();
  console.log("PASS: employee scopes and omitted scores");
  await go("/resultados/7/101");
  assert.equal(await page.getByText("4.00 / 5", { exact: true }).count(), 0);
  await page
    .getByRole("button", { name: "Confirmar recibido", exact: true })
    .click();
  await page
    .getByLabel("Nombre completo", { exact: true })
    .fill("Persona de prueba");
  await page.getByRole("switch").check();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await page.getByText(/Recepción registrada:/).waitFor();
  console.log("PASS: employee receipt without client legal-text override");
  assert.deepEqual(errors, []);
  console.log("PASS: no browser runtime errors");
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    server?.kill("SIGTERM");
  });
