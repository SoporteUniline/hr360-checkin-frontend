// Prueba de navegador (red simulada) de la entrega desemp1 de Evaluación del desempeño: plantillas base, tablero de
// campaña con mapa de calor y brecha, PDF, Adamia AI (pregunta, resumen 360, plan sugerido, borrador del jefe que NO se
// guarda solo), evidencia objetiva, aviso de privacidad del empleado y estado de WhatsApp. A 1440 y 390 px: sin scroll
// horizontal, botones táctiles ≥ 44 px y texto ≥ 13 px en lo nuevo. No contacta ningún backend real.
// Uso (después de `npx next build`): PLAYWRIGHT_MODULE_PATH=… CAPTURAS=/ruta node scripts/verify-evaluaciones-tablero.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");

const root = path.resolve(__dirname, "..");
const port = 4491;
const base = `http://127.0.0.1:${port}`;
const secret = "evaluation-dashboard-test-only";
const capturas = process.env.CAPTURAS || path.join(root, ".capturas-evaluaciones");
fs.mkdirSync(capturas, { recursive: true });

const settings = {
  employeeScore: true, employeeCategories: true, employeeComments: true, employeePlan: true, managerResults: true,
  requireApproval: true, requireReceipt: true, anonymousPeers: true, anonymousAscending: true, minimumResponses: 3,
  closeWithAvailable: false, whatsappNotices: false, aiManagerDraft: false, privacyNoticeRequired: false,
};
const template = {
  id: 8, versionId: 12, version: 1, revision: 1, name: "Operativo planta", description: "", areaId: null, positionId: null, archived: false,
  scale: ["No lo hace", "A veces", "Lo esperado", "Por encima", "Ejemplo a seguir"].map((label) => ({ label, description: label })),
  bands: [{ min: 1, max: 2.99, label: "Seguimiento", color: "red" }, { min: 3, max: 3.99, label: "En progreso", color: "amber" }, { min: 4, max: 5, label: "Buen desempeño", color: "green" }],
  categories: [
    { id: 1, name: "Calidad del trabajo", weight: 60, questionWeights: "equal", questions: [{ id: 11, text: "Entrega su trabajo conforme al estándar del puesto, sin retrabajos.", type: "scale", required: true, scored: true, options: [] }, { id: 12, text: "Mantiene limpia y ordenada su área de trabajo (5S).", type: "scale", required: true, scored: true, options: [] }] },
    { id: 2, name: "Seguridad e higiene", weight: 40, questionWeights: "equal", questions: [{ id: 21, text: "Usa siempre el equipo de protección.", type: "scale", required: true, scored: true, options: [] }] },
  ],
};
const biblioteca = ["operativo", "administrativo", "ventas", "liderazgo"].map((key, i) => ({
  key, version: "2026-11-26",
  name: `Desempeño · ${["Personal operativo", "Personal administrativo", "Ventas y atención a clientes", "Jefes y supervisores"][i]}`,
  description: "Competencias con conductas observables, escala de 5 niveles y pesos que suman 100 %.",
  suggestedPreset: "180", questions: 13,
  competencies: [
    { key: "calidad", name: "Calidad del trabajo", weight: 25, behaviors: ["Entrega sin retrabajos.", "Revisa antes de entregar."] },
    { key: "productividad", name: "Productividad", weight: 20, behaviors: ["Cumple la cantidad asignada."] },
    { key: "seguridad", name: "Seguridad e higiene", weight: 20, behaviors: ["Usa equipo de protección."] },
    { key: "responsabilidad", name: "Responsabilidad y puntualidad", weight: 20, behaviors: ["Llega a tiempo."] },
    { key: "equipo", name: "Trabajo en equipo", weight: 15, behaviors: ["Ayuda a sus compañeros."] },
  ],
}));
const campaign = {
  id: 7, name: "Evaluación anual 2026", description: "", model: "180", revision: 3, status: "active", storedStatus: "active",
  periodStart: "2026-01-01", periodEnd: "2026-11-30", opensOn: "2026-11-01", dueOn: "2026-12-15", timezone: "America/Mexico_City",
  primaryTemplateVersionId: 12, groups: [{ key: "descending", weight: 80, templateVersionId: 12 }, { key: "self", weight: 20, templateVersionId: 12 }],
  subjectIds: [101, 102], subjects: [{ id: 90, employeeId: 101, name: "Ana Torres Paz" }, { id: 91, employeeId: 102, name: "Beto Ruiz" }],
  assignments: [{ id: 55, subjectId: 101, perspective: "descending", evaluatorName: "Jorge Jefe", status: "pending" }],
  settings, reminders: [7, 3, 0], recurrence: null, capabilities: { canClose: true, canExtend: true, canDuplicate: true },
};
const areas = [{ id: 1, name: "Producción y mantenimiento" }, { id: 2, name: "Almacén" }, { id: 3, name: "Ventas mostrador" }];
const analytics = {
  campaignName: campaign.name,
  campaign: { id: 7, status: "active", partialMode: false },
  progress: {
    subjects: 24, assignments: 48, submitted: 40, pending: 8, percent: 83.33, evaluatorsMissing: 5,
    byPerspective: [{ key: "descending", label: "Descendente · Jefe", total: 24, done: 22 }, { key: "self", label: "Autoevaluación", total: 24, done: 18 }],
    missing: [{ assignmentId: 55, perspective: "descending", perspectiveLabel: "Descendente · Jefe", evaluatorName: "Jorge Jefe", subjectId: 101, subjectName: "Ana Torres Paz", status: "pending" },
      { assignmentId: 56, perspective: "self", perspectiveLabel: "Autoevaluación", evaluatorName: "Carla Gil Hernández", subjectId: 103, subjectName: "Carla Gil Hernández", status: "draft" }],
  },
  distribution: { n: 18, average: 3.74, bands: { below: 3, mid: 8, high: 7 }, partial: 0, withoutResult: 6 },
  byArea: [{ ...areas[1], people: 6, n: 5, average: 3.2, bands: { below: 2, mid: 2, high: 1 }, progress: 75 }, { ...areas[0], people: 12, n: 9, average: 3.9, bands: { below: 1, mid: 4, high: 4 }, progress: 88 }, { ...areas[2], people: 6, n: 4, average: 4.1, bands: { below: 0, mid: 2, high: 2 }, progress: 83 }],
  competencies: [{ key: "seguridad", name: "Seguridad e higiene", n: 18, average: 3.1 }, { key: "calidad", name: "Calidad del trabajo", n: 18, average: 3.8 }, { key: "equipo", name: "Trabajo en equipo", n: 18, average: 4.2 }],
  heatmap: {
    areas,
    rows: [
      { key: "seguridad", name: "Seguridad e higiene", cells: [{ areaId: 1, n: 9, average: 3.3 }, { areaId: 2, n: 5, average: 2.6 }, { areaId: 3, n: 2, average: 3.6 }] },
      { key: "calidad", name: "Calidad del trabajo", cells: [{ areaId: 1, n: 9, average: 3.9 }, { areaId: 2, n: 5, average: 3.4 }, { areaId: 3, n: 4, average: 4.2 }] },
      { key: "equipo", name: "Trabajo en equipo", cells: [{ areaId: 1, n: 9, average: 4.3 }, { areaId: 2, n: 5, average: 3.9 }, { areaId: 3, n: 4, average: 4.4 }] },
    ],
  },
  gap: {
    threshold: 0.5, n: 16, average: 0.42, overrate: 6, underrate: 1,
    people: [{ employeeId: 101, name: "Ana Torres Paz", area: "Almacén", self: 4.8, manager: 3.2, gap: 1.6, signal: "sobreestima" }, { employeeId: 102, name: "Beto Ruiz", area: "Ventas mostrador", self: 3.6, manager: 4.4, gap: -0.8, signal: "subestima" }],
    byCompetency: [{ key: "seguridad", name: "Seguridad e higiene", n: 16, average: 0.7 }],
  },
  people: [],
  nom035: { factor: "Evaluación y reconocimiento del desempeño", guia: "Guía de referencia III", dominio: "Reconocimiento del desempeño", evaluados: 24, publicados: 10, acuses: 7, retroalimentacionPct: 41.7, acusePct: 70, nota: "Indicador de apoyo; no sustituye las guías de la NOM-035." },
};
const result = {
  campaignId: 7, subjectId: 101, campaignName: campaign.name, subjectName: "Ana Torres Paz", score: 3.52, partial: false,
  band: { label: "En progreso", color: "amber" },
  categories: [{ id: 1, key: "calidad", name: "Calidad del trabajo", score: 3.8 }, { id: 2, key: "seguridad", name: "Seguridad e higiene", score: 3.1 }],
  groups: [{ key: "descending", weight: 80, total: 1, done: 1, score: 3.4, comments: ["Cuida la calidad; falta usar siempre el equipo de protección."] }, { key: "self", weight: 20, total: 1, done: 1, score: 4, comments: [] }],
  publication: null, complete: true,
};
const evidencia = {
  periodo: { inicio: "2026-01-01", fin: "2026-11-30" },
  asistencia: { diasLaborables: 240, diasTrabajados: 226, faltas: 2, retardos: 7, asistenciaPct: 99.1, puntualidadPct: 96.9, horasExtra: 31.5, justificadas: { total: 12, incapacidad: 4, maternidad: 0, vacaciones: 6, permiso_con_goce: 2, permiso_sin_goce: 0 }, festivos: 6, sinHorario: false, alertas: [] },
  tareas: { asignadas: 40, hechas: 36, aTiempo: 31, vencidas: 2, cumplimientoPct: 90, aTiempoPct: 86.1 },
  checklists: { asignados: 220, enviados: 214, aTiempo: 205, noEnviados: 6, promedio: 92.4, enviadosPct: 97.3 },
  fuente: "Mismas reglas que nómina.",
};
const aviso = {
  id: "aviso_evaluacion_desempeno", version: "2026-11-26", titulo: "Aviso de privacidad de la evaluación del desempeño",
  secciones: [{ titulo: "Qué datos se usan", texto: "Tus respuestas, tu calificación y un resumen de asistencia; las ausencias justificadas nunca cuentan en tu contra." }, { titulo: "Inteligencia artificial", texto: "La IA nunca califica ni envía nada sola." }],
};

let profile = "hr";
let avisoAceptado = null;
const calls = [];
const list = (data) => ({ data, pagination: { page: 1, pageSize: 25, total: data.length } });
const jwt = () => {
  const h = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const p = Buffer.from(JSON.stringify({ tipo_usuario: "Recruiter", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${h}.${p}.${crypto.createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url")}`;
};

function responder(p, method, body) {
  if (p === "/capabilities") {
    const hr = profile === "hr";
    return {
      profile, employeeId: hr ? null : profile === "manager" ? 18 : 101, userId: hr ? 1 : null,
      scopes: hr ? ["templates", "catalogs", "levels", "people", "settings", "permissions", "campaigns", "assignments", "team", "results", "dashboard", "plans"] : profile === "manager" ? ["people", "assignments", "team", "results", "plans"] : ["people", "assignments", "results", "plans"],
      flags: { canManageTemplates: hr, canManageCampaigns: hr, canViewCampaigns: hr, canPublishResults: hr, canViewDashboard: hr },
      settings, limits: { templateName: 160, comment: 4000 },
    };
  }
  if (p === "/template-library") return biblioteca;
  if (p === "/template-library/operativo/copy") return { ...template, id: 8 };
  if (p === "/templates/8") return template;
  if (p === "/campaigns/7") return campaign;
  if (p === "/campaigns/7/analytics") return analytics;
  if (p === "/campaigns/7/ai-ask") return { respuesta: "Seguridad e higiene es la competencia más baja (3.1) y Almacén la peor área en ella (2.6).", cifras: [{ dato: "Seguridad · Almacén", valor: "2.6" }], siguientePaso: "Revisar con el jefe de almacén el uso del equipo de protección.", minimoGrupo: 3 };
  if (p === "/campaigns/7/results/101") return result;
  if (p === "/campaigns/7/results/101/ai-summary") return body?.soloGuardado ? { vacio: true } : { resumen: "Desempeño constante con buena calidad.", fortalezas: ["Calidad del trabajo"], oportunidades: ["Uso del equipo de protección"], privadas: [] };
  if (p === "/campaigns/7/results/101/ai-plan") return { acciones: [{ titulo: "Capacitación en seguridad", competencia: "Seguridad e higiene", medidaDeExito: "0 incidentes y 100 % de uso de equipo en 3 auditorías", dias: 60 }], sugerencia: true };
  if (p === "/people/101/history" || p === "/people/101/evolution")
    return [{ campaignId: 5, campaignName: "Anual 2025", score: 3.1, categories: [{ key: "calidad", name: "Calidad del trabajo", score: 3.3 }], comparable: null }, { campaignId: 7, campaignName: "Anual 2026", score: 3.52, categories: [{ key: "calidad", name: "Calidad del trabajo", score: 3.8 }], comparable: true }];
  if (p === "/assignments/55")
    return { id: 55, campaignId: 7, subjectId: 101, subjectName: "Ana Torres Paz", perspective: "descending", status: "pending", revision: 1, template, answers: { 11: 3 }, categoryComments: {}, comment: "", privateNote: "", capabilities: { canEdit: true, canSubmit: true }, campaign: { name: campaign.name, periodStart: campaign.periodStart, periodEnd: campaign.periodEnd, dueOn: campaign.dueOn } };
  if (p === "/assignments/55/evidence") return evidencia;
  if (p === "/ai/status") return { activo: true, migracion: true, panel: profile === "hr", jefes: true, usosMes: 3, creditos: null };
  if (p === "/assignments/55/ai-draft") return { respuestas: [{ id: 11, valor: 5, razon: "Sin devoluciones en el periodo." }, { id: 12, valor: 4, razon: "Checklists al 92 %." }, { id: 21, valor: 3, razon: "Dos observaciones de seguridad." }], comentario: "Buen periodo: calidad constante; reforzar seguridad.", advertencias: [], sugerencia: true, aviso: "Sugerencia de Adamia AI: revisa cada respuesta. Nada se guarda ni se envía hasta que tú lo hagas." };
  if (p === "/privacy-notice") return { aviso, requerido: false, migracion: true, aceptadoEn: avisoAceptado, nom035: analytics.nom035 };
  if (p === "/privacy-notice/accept") {
    avisoAceptado = "2026-11-26T10:00:00Z";
    return { version: aviso.version, aceptadoEn: avisoAceptado };
  }
  if (p === "/settings") return { config: settings, version: 2, persisted: true };
  if (p === "/whatsapp/status") return { configurado: false, motivo: "Falta configurar el número de notificaciones", migracion: true, plantillas: [{ nombre: "adamia_evaluacion_pendiente", cuerpo: "Hola {{1}}, tienes una evaluación de desempeño por responder…" }], version: "2026-11-26.1", ultimos30Dias: [] };
  if (p === "/dashboard") return { average: 3.74, n: 18 };
  return undefined;
}

async function revisarMovil(page, nombre, ancho) {
  const r = await page.evaluate(() => {
    const doc = document.documentElement;
    const nuevos = [...document.querySelectorAll(".ev-base-card, .ev-kpis, .ev-heat, .ev-ai-box, .ev-evidence, .ev-privacy, .ev-ai-answer, .ev-bar-row")];
    const textos = nuevos.flatMap((n) => [...n.querySelectorAll("p, li, span, strong, small, em, button, label")]).filter((n) => n.textContent.trim() && n.offsetParent);
    const chicos = textos.filter((n) => parseFloat(getComputedStyle(n).fontSize) < 13).map((n) => `${n.tagName}:${n.textContent.trim().slice(0, 30)}`);
    const botones = nuevos.flatMap((n) => [...n.querySelectorAll("button")]).filter((b) => b.offsetParent);
    const bajos = botones.filter((b) => b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim().slice(0, 30));
    return { scroll: doc.scrollWidth - doc.clientWidth, chicos, bajos };
  });
  assert.ok(r.scroll <= 1, `${nombre} @${ancho}: scroll horizontal de ${r.scroll}px`);
  assert.deepEqual(r.chicos, [], `${nombre} @${ancho}: texto < 13px`);
  assert.deepEqual(r.bajos, [], `${nombre} @${ancho}: botón < 44px`);
}

(async () => {
  const log = fs.openSync(path.join(capturas, "servidor.log"), "w");
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: root, env: { ...process.env, JWT_SECRET: secret }, stdio: ["ignore", log, log], detached: true,
  });
  let browser;
  try {
    for (let i = 0; i < 80; i++) {
      try {
        await fetch(base);
        break;
      } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"] });
    const errores = [];
    for (const ancho of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width: ancho, height: ancho > 500 ? 1000 : 844 }, deviceScaleFactor: 1 });
      await context.addCookies([{ name: "token", value: jwt(), url: base }]);
      const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type,idempotency-key", "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS" };
      await context.route("**/*", async (route) => {
        const req = route.request();
        const url = new URL(req.url());
        if (url.origin === base) return route.continue();
        const fulfill = (o) => route.fulfill({ ...o, headers: { ...cors, ...(o.headers || {}) } });
        if (req.method() === "OPTIONS") return fulfill({ status: 204 });
        if (url.pathname.endsWith("/users/verify/token"))
          return fulfill({ json: { user: { id_usuario: 1, id_empresa: 4, empresas: [4], empresas_detalle: [{ id_empresa: 4, nombre: "Empresa de prueba" }], tipo_usuario: "Recruiter", nombre: "Prueba" } } });
        const prefix = "/api/checador/evaluaciones-desempeno";
        if (!url.pathname.startsWith(prefix)) return fulfill({ json: [] });
        assert.equal(url.searchParams.get("empresa"), "4");
        const p = url.pathname.slice(prefix.length);
        const body = req.postDataJSON();
        calls.push({ p, method: req.method(), body });
        if (p.endsWith("report.pdf")) return fulfill({ status: 200, body: Buffer.from("%PDF-1.7 prueba"), headers: { "content-type": "application/pdf" } });
        if (["/templates", "/campaigns", "/results", "/my/results", "/plans", "/my/assignments", "/people", "/levels", "/permissions", "/team"].includes(p) && req.method() === "GET") {
          return fulfill({ json: list(p === "/my/assignments" ? [{ id: 55, subjectName: "Ana Torres Paz", campaignName: campaign.name, perspective: "descending", dueOn: "2026-12-15", status: "pending" }] : p === "/templates" ? [template] : []) });
        }
        const data = responder(p, req.method(), body);
        if (data === undefined) return fulfill({ json: { data: null } });
        return fulfill({ json: { data, requestId: "prueba" } });
      });
      const page = await context.newPage();
      page.on("pageerror", (e) => errores.push(`${ancho}: ${e.message}`));
      const ir = async (ruta, esperar) => {
        await page.goto(`${base}/panel/evaluaciones${ruta}`);
        await page.getByText(esperar, { exact: false }).first().waitFor({ timeout: 20000 });
      };

      // 1. Plantillas base.
      profile = "hr";
      await ir("/plantillas", "Plantillas base listas para usar");
      await page.locator(".ev-base-card").nth(3).waitFor();
      assert.equal(await page.locator(".ev-base-card").count(), 4);
      await page.screenshot({ path: path.join(capturas, `plantillas-base-${ancho}.png`), fullPage: true });
      await revisarMovil(page, "plantillas", ancho);
      await page.locator(".ev-base-card").first().getByRole("button", { name: "Usar esta plantilla" }).click();
      await page.waitForURL(/plantillas\/8/);
      assert.ok(calls.some((c) => c.p === "/template-library/operativo/copy" && c.method === "POST"));

      // 2. Tablero de campaña + «pregúntale a tus resultados».
      await ir("/campanas/7", "Tablero de la campaña");
      await page.getByText("Mapa de calor").first().waitFor();
      await page.getByRole("button", { name: /Ver quién falta/ }).click();
      await page.getByText("Carla Gil Hernández").first().waitFor();
      await page.getByLabel("Tu pregunta").fill("¿Qué competencia reforzamos primero?");
      await page.getByRole("button", { name: "Preguntar" }).click();
      await page.getByText("Seguridad e higiene es la competencia más baja").waitFor();
      await page.screenshot({ path: path.join(capturas, `tablero-campania-${ancho}.png`), fullPage: true });
      await revisarMovil(page, "tablero", ancho);
      const [descarga] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "PDF de campaña" }).click()]);
      assert.equal(descarga.suggestedFilename(), "informe-campania-7.pdf");

      // 3. Resultado de una persona: PDF, resumen 360, plan sugerido → formulario de plan prellenado, evolución.
      await ir("/resultados/7/101", "Resultado de evaluación");
      await page.getByRole("button", { name: /Resumir con IA/ }).click();
      await page.getByText("Desempeño constante con buena calidad.").waitFor();
      await page.getByRole("button", { name: /Sugerir plan/ }).click();
      await page.getByText("Capacitación en seguridad").first().waitFor();
      await page.getByText("Evolución").first().waitFor();
      await page.screenshot({ path: path.join(capturas, `resultado-ia-${ancho}.png`), fullPage: true });
      await revisarMovil(page, "resultado", ancho);
      await page.getByRole("button", { name: "Crear plan con esta acción" }).click();
      await page.locator('input[value="Capacitación en seguridad"]').first().waitFor({ timeout: 10000 });
      assert.ok(!calls.some((c) => c.p === "/plans" && c.method === "POST"), "el plan sugerido no se guarda solo");
      await page.keyboard.press("Escape");

      // 4. Responder como jefe: evidencia y borrador con IA que llena el formulario SIN guardar ni enviar.
      profile = "manager";
      await ir("/responder/55", "Evidencia del periodo");
      await page.getByText("Asistencia 99.1 %").waitFor();
      await page.getByRole("button", { name: /Preparar borrador/ }).click();
      await page.getByText("Sin devoluciones en el periodo.").waitFor();
      await page.getByRole("button", { name: "Llenar las vacías" }).click();
      await page.getByText(/respuesta\(s\) llenadas/).waitFor();
      assert.ok(!calls.some((c) => /\/assignments\/55\/(draft|submit)$/.test(c.p)), "la IA no guarda ni envía");
      await page.screenshot({ path: path.join(capturas, `responder-evidencia-ia-${ancho}.png`), fullPage: true });
      await revisarMovil(page, "responder", ancho);

      // 5. Empleado: aviso de privacidad en «Por responder».
      profile = "employee";
      avisoAceptado = null;
      await ir("/mis-pendientes", "Aviso de privacidad de la evaluación");
      await page.screenshot({ path: path.join(capturas, `empleado-aviso-${ancho}.png`), fullPage: true });
      await revisarMovil(page, "aviso", ancho);
      await page.getByRole("button", { name: "Lo leí" }).click();
      await page.getByText("Leíste el aviso de privacidad").waitFor();
      assert.ok(calls.some((c) => c.p === "/privacy-notice/accept" && c.body.version === "2026-11-26"));

      // 6. Configuración: opciones nuevas y WhatsApp.
      profile = "hr";
      await ir("/configuracion", "Avisos por WhatsApp");
      await page.getByText("Al cerrar incompleta, calcular con lo respondido").waitFor();
      await page.screenshot({ path: path.join(capturas, `configuracion-whatsapp-${ancho}.png`), fullPage: true });
      await context.close();
    }
    assert.deepEqual(errores, [], "sin errores de ejecución");
    console.log(`OK: pantallas de desemp1 a 1440 y 390 px. Capturas en ${capturas}`);
  } finally {
    await browser?.close();
    try {
      process.kill(-server.pid);
    } catch {}
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
