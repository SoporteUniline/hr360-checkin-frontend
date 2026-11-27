// Capturas del Centro de ayuda · bloque «Gestión de personal y documentos» (empleados, catálogos, inducción,
// gestión documental, activos y uniformes, tareas y checklists, avisos y Mi espacio).
// Sistema real (next start) con API SIMULADA: nada sale a internet y solo hay datos de demostración (Uniline, Laura Ríos,
// Ana Torres…), con el mismo estilo de los scripts/verify-*.mjs.
// Uso:
//   NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build
//   PLAYWRIGHT_MODULE_PATH=/opt/node22/lib/node_modules/playwright node scripts/capturas-ayuda/personal.mjs [grupo …]
// Grupos: empleados catalogos induccion documentos activos tareas avisos (sin argumentos: todos).
// Salida: public/ayuda/capturas/<modulo>/<nombre>.webp (1440×900 panel, 390×844 celular, deviceScaleFactor 1, calidad ~80).
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { mkdirSync, statSync } from "node:fs";
import path from "node:path";

const REPO = process.cwd();
const require = createRequire(REPO + "/package.json");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const sharp = require("sharp");
const SALIDA = path.join(REPO, "public/ayuda/capturas");
const API_ORIGEN = "https://api.prueba.invalid";

// ───────── servidor ─────────
const secreto = randomUUID();
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
const next = spawn(process.execPath, [REPO + "/node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"],
  { cwd: REPO, stdio: "ignore", env: { ...process.env, JWT_SECRET: secreto } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const jwt = (u) => {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const c = `${b({ alg: "HS256", typ: "JWT" })}.${b({ tipo_usuario: u.tipo_usuario, id_usuario: u.id_usuario, ...(u.id_empleado ? { id_empleado: u.id_empleado } : {}), exp: Math.floor(Date.now() / 1000) + 3600 })}`;
  return `${c}.${createHmac("sha256", secreto).update(c).digest("base64url")}`;
};

// ───────── datos de demostración ─────────
const HOY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
const dia = (n) => new Date(Date.parse(`${HOY}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const ANIO = Number(HOY.slice(0, 4));
const EMPRESA = { id_empresa: 7, nombre: "Uniline", nombre_empresa: "Uniline", estado: "Activo", zona_horaria: "America/Mexico_City" };
const LAURA = { id_usuario: 1, tipo_usuario: "Recruiter", nombre: "Laura Ríos", correo: "laura@uniline.mx", id_empresa: 7, empresas: [7], empresas_detalle: [EMPRESA], empresa: EMPRESA, zona_horaria: "America/Mexico_City" };
const ANA_USUARIO = { tipo_usuario: "Empleado", id_empleado: 15, id_usuario: 15, nombre: "Ana Torres", correo: "ana@uniline.mx", id_empresa: 7, empresas: [7], empresas_detalle: [EMPRESA] };

const sinc = (estado, n = 1) => ({ estado, total: n, sincronizados: estado === "sincronizado" ? n : 0 });
const persona = (id, nombre, ap, am, o = {}) => ({
  id_empleado: id, id_empresa: 7, nombre, apellido_paterno: ap, apellido_materno: am, nombre_empresa: "Uniline", estado: "Activo",
  correo: `${nombre.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")}@uniline.mx`, telefono: "3312345678", fecha_ingreso: "2024-03-04",
  unidad_negocio: "Matriz", sucursal: "Matriz", sincronizacion_checador: sinc("sincronizado"), horarios: [], ...o,
});
const EMPLEADOS = [
  persona(15, "Ana", "Torres", "Ruiz", { puesto: "Cajera", departamento: "Ventas", nip: "1015", fecha_ingreso: "2023-02-13" }),
  persona(16, "Carlos", "Andrey", "Luna", { puesto: "Supervisor", departamento: "Operación", nip: "1016", fecha_ingreso: "2021-08-02" }),
  persona(17, "Diego", "Paz", "Herrera", { puesto: "Auxiliar de sistemas", departamento: "Sistemas", nip: "1017", unidad_negocio: "Norte", sucursal: "Norte" }),
  persona(18, "Frida", "Serrano", "Gil", { puesto: "Vendedora", departamento: "Ventas", nip: "1018", sincronizacion_checador: sinc("pendiente") }),
  persona(19, "José", "Ramírez", "Ortiz", { puesto: "Almacenista", departamento: "Operación", nip: "", sincronizacion_checador: { estado: "sin_nip" } }),
  persona(20, "Valeria", "Castillo", "Mora", { puesto: "Compradora", departamento: "Compras", nip: "1020", unidad_negocio: "Norte", sucursal: "Norte" }),
  persona(21, "Beto", "Soto", "Lara", { puesto: "Cajero", departamento: "Ventas", nip: "1021", estado: "Inactivo", fecha_baja: dia(-20), motivo_baja: "Renuncia voluntaria", sincronizacion_checador: { estado: "eliminado" } }),
];
const HORARIO = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((d, i) => (i < 5
  ? { dia: d, entrada: "09:00", salida_comida: "14:00", regreso_comida: "15:00", salida: "18:00" }
  : { dia: d, entrada: i === 5 ? "09:00" : "", salida_comida: "", regreso_comida: "", salida: i === 5 ? "14:00" : "" }));
const ANA = {
  ...EMPLEADOS[0], curp: "TORA900101MJCRRN01", rfc: "TORA900101AB1", nss: "12345678901", sexo: "Femenino", estado_civil: "Soltera",
  fecha_nacimiento: "1990-01-01", direccion: "Av. Juárez 120, Centro, Guadalajara, Jal. 44100", correo_notificaciones: "ana.torres@correo.mx",
  horarios: HORARIO, hrs_por_dia: 8, hrs_de_comida: 1, periodo_pago: "Quincenal", forma_pago: "Transferencia", forma_calculo: "$", sueldo: 6500,
  medio_pago: "Transferencia", cuenta_bancaria: { banco: "BBVA", tipo_cuenta: "CLABE", numero_cuenta: "012320001234567891" }, metodo_chequeo: "codigo_cara",
  cierre_turno: "Automático", id_jefe_inmediato: 16, descriptor_facial: Array.from({ length: 128 }, (_, i) => Math.sin(i) / 10), campos_personalizados: { 1: "Turno A" },
};
const CAMPOS = [
  { id: 1, id_empresa: 7, nombre: "Cuadrilla", tipo: "seleccion", opciones: ["Turno A", "Turno B", "Turno C"], formulario: true, filtros: true, pestana: "laborales", despues_de: "fin", activo: true, orden: 1 },
  { id: 2, id_empresa: 7, nombre: "Talla de playera", tipo: "texto", opciones: [], formulario: true, filtros: false, pestana: "personales", despues_de: "fin", activo: true, orden: 2 },
  { id: 3, id_empresa: 7, nombre: "Años de experiencia", tipo: "numero", opciones: [], formulario: true, filtros: true, pestana: "laborales", despues_de: "fin", activo: false, orden: 3 },
];
const catalogo = (clave, nombres) => nombres.map((n, i) => ({ [clave]: i + 1, id: i + 1, nombre: n, nombre_puesto: n, id_empresa: 7, empresa_nombre: "Uniline", unidad_negocio: "Uniline", nombre_sucursal: "Uniline" }));
const DEPARTAMENTOS = catalogo("id_departamento", ["Ventas", "Operación", "Sistemas", "Compras", "Recursos Humanos"]);
const PUESTOS = catalogo("id_puesto", ["Cajera", "Supervisor", "Auxiliar de sistemas", "Vendedora", "Almacenista", "Compradora"]);
const ESTADOS_CIVILES = catalogo("id_estado_civil", ["Soltera", "Casado", "Unión libre", "Divorciada", "Viudo"]);
const SUCURSALES = [
  { id_unidad: 1, id_sucursal: 1, nombre: "Matriz", id_empresa: 7, nombre_empresa: "Uniline", empresa: "Uniline", rfcEmpleador: "UNI010101AB1", razonSocialEmpleador: "Uniline S.A. de C.V.", telefono: "3331234567", correo: "matriz@uniline.mx", domicilioEmpleador: "Av. Juárez 120, Centro, Guadalajara, Jal." },
  { id_unidad: 2, id_sucursal: 2, nombre: "Norte", id_empresa: 7, nombre_empresa: "Uniline", empresa: "Uniline", rfcEmpleador: "UNI010101AB1", razonSocialEmpleador: "Uniline S.A. de C.V.", telefono: "3337654321", correo: "norte@uniline.mx", domicilioEmpleador: "Av. Patria 800, Zapopan, Jal." },
];

// Imagen de una firma (PNG) para «Mi firma» y el resguardo.
const FIRMA_PNG = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="160"><path d="M20 120 C 60 20, 90 20, 110 100 S 160 150, 190 70 S 250 20, 270 110 S 330 140, 360 60 L 460 90" stroke="#1e3a8a" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`)).png().toBuffer();

// ───────── API simulada ─────────
// Cada manejador recibe { p (ruta sin /api), q (URLSearchParams), m (método), cuerpo } y devuelve [datos, estado] o undefined.
const json = (d, s = 200) => [d, s];
const manejadores = [];
const ruta = (metodo, patron, fn) => manejadores.push({ metodo, patron, fn });

// Base del panel y de Mi espacio.
ruta("GET", /^\/checador\/avisos\/proximos$/, () => json(AVISOS_RH));
ruta("GET", /^\/checador\/modulos\/activos$/, () => json({}));

// Empleados.
ruta("GET", /^\/checador\/empleados$/, ({ q }) => {
  const limite = Number(q.get("limit") || 10);
  return json({ data: EMPLEADOS.slice(0, limite), total: EMPLEADOS.length, page: 1, totalPages: 1,
    estadisticas: { total_empleados: 7, empleados_activos: 6, empleados_nuevos_mes: 1, total_departamentos: 5 } });
});
ruta("GET", /^\/checador\/empleados\/validar$/, () => json({}));
ruta("GET", /^\/checador\/empleados\/15$/, () => json(ANA));
ruta("GET", /^\/checador\/empleados\/(\d+)$/, ({ p }) => json({ ...ANA, ...EMPLEADOS.find((e) => String(e.id_empleado) === p.split("/").pop()) }));
ruta("GET", /^\/checador\/empleados\/\d+\/contactos-emergencia$/, () => json({ contactos: [{ id: 1, nombre: "María Ruiz Pérez", parentesco: "Mamá", telefono: "3398765432", celular: "", correo: "", es_principal: 1 }] }));
ruta("GET", /^\/checador\/mi-espacio\/firma\/empleado\/\d+$/, () => json({ tiene_firma: true, tiene_pin: true, intentos_fallidos: 2, bloqueado_hasta: null, historial: [] }));
ruta("GET", /^\/checador\/mi-espacio\/rostro\/empleado\/\d+$/, () => json({ cambios: [{ origen: "empleado", creado_en: `${dia(-3)} 17:15:00`, consentimiento_version: "1.0", visto_por_rh: 0 }] }));
ruta("GET", /^\/checador\/campos-personalizados$/, () => json(CAMPOS));
ruta("GET", /^\/checador\/turnos$/, () => json({ data: [{ id_turno: 1, nombre: "Matutino L-V", activo: 1 }], turnos: [{ id_turno: 1, nombre: "Matutino L-V", activo: 1 }] }));
ruta("GET", /^\/checador\/departamentos$/, () => json({ departamentos: DEPARTAMENTOS, data: DEPARTAMENTOS, total: DEPARTAMENTOS.length }));
ruta("GET", /^\/checador\/puestos$/, () => json({ puestos: PUESTOS, data: PUESTOS, total: PUESTOS.length }));
ruta("GET", /^\/checador\/estados-civiles$/, () => json({ estados_civiles: ESTADOS_CIVILES, data: ESTADOS_CIVILES, total: ESTADOS_CIVILES.length }));
ruta("GET", /^\/checador\/sucursales$/, () => json({ sucursales: SUCURSALES, data: SUCURSALES, total: SUCURSALES.length }));
ruta("GET", /^\/users\/1$/, () => json({ ...LAURA, telefono: "3330001122" }));
ruta("GET", /^\/checador\/empleados\/panel-empleado\/lista$/, () => json({ lista_empleados: EMPLEADOS.map((e) => ({ ...e, nombre_completo: `${e.nombre} ${e.apellido_paterno} ${e.apellido_materno}`, empresa: "Uniline" })) }));
ruta("GET", /^\/checador\/empleados\/panel-empleado\/\d+\/detalle$/, () => json({
  informacion_general: { curp: ANA.curp, rfc: ANA.rfc, nss: ANA.nss, fecha_nacimiento: ANA.fecha_nacimiento, email_corporativo: "ana@uniline.mx", email_personal: "ana.torres@correo.mx", antiguedad: "2 años", id_empleado: 15, nombre_completo: "Ana Torres Ruiz", puesto: "Cajera", departamento: "Ventas", empresa: "Uniline", unidad_negocio: "Matriz", fecha_ingreso: "2023-02-13", estado: "Activo", correo: "ana@uniline.mx", telefono: "3312345678", id_empresa: 7 },
}));
// Expediente digital (pestaña Documentos de la ficha y Panel empleado).
const CATEGORIAS_EXP = [["Identificación", "#2563EB"], ["Contractual", "#7c3aed"], ["Fiscal", "#059669"], ["Médico", "#dc2626"]].map(([nombre, color], i) => ({ id_categoria: i + 1, id: i + 1, nombre, color, activo: 1, es_sistema: 1 }));
const DOCS_EXP = [
  { id: 1, nombre_documento: "INE (frente y vuelta)", categoria_nombre: "Identificación", categoria_color: "#2563EB", estatus: "NO_VENCE", archivo_mime: "application/pdf", obligatorio: 1, created_at: `${dia(-300)} 10:00:00`, origen: "subido" },
  { id: 2, nombre_documento: "Contrato individual de trabajo", categoria_nombre: "Contractual", categoria_color: "#7c3aed", estatus: "VIGENTE", archivo_mime: "application/pdf", obligatorio: 1, created_at: `${dia(-300)} 10:05:00`, fecha_vencimiento: dia(65), origen: "generado", estatus_firma: "firmado" },
  { id: 3, nombre_documento: "Constancia de situación fiscal", categoria_nombre: "Fiscal", categoria_color: "#059669", estatus: "NO_VENCE", archivo_mime: "application/pdf", obligatorio: 0, created_at: `${dia(-200)} 12:00:00`, origen: "subido" },
  { id: 4, nombre_documento: "Certificado médico", categoria_nombre: "Médico", categoria_color: "#dc2626", estatus: "POR_VENCER", archivo_mime: "image/jpeg", obligatorio: 0, created_at: `${dia(-340)} 09:00:00`, fecha_vencimiento: dia(18), origen: "subido" },
];
ruta("GET", /^\/checador\/expediente\/categorias\/\d+(\/activas)?$/, () => json({ categorias: CATEGORIAS_EXP }));
ruta("GET", /^\/checador\/expediente\/documentos\/\d+$/, () => json({ documentos: DOCS_EXP }));
ruta("GET", /^\/checador\/expediente\/documentos\/\d+\/stats$/, () => json({ total: 4, vigentes: 3, por_vencer: 1, vencidos: 0, obligatorios: 2, completitud_pct: 100 }));
// Mi espacio: firma, PIN y rostro.
ruta("GET", /^\/checador\/mi-espacio\/firma$/, () => json({ tiene_firma: true, firma_actualizada_en: `${dia(-12)} 16:30:00`, tiene_pin: true, pin_actualizado_en: `${dia(-12)} 16:32:00`, bloqueado_hasta: null }));
ruta("GET", /^\/checador\/mi-espacio\/rostro$/, () => json({ tiene_rostro: true, actualizado_en: `${dia(-30)} 15:00:00`, origen: "rh" }));

const AVISOS_RH = { ok: true, visible: false, avisos: [], conteos: {}, total: 0 }; // se llena más abajo (grupo avisos)

function responder({ p, q, m, cuerpo }) {
  for (const h of manejadores) {
    if (h.metodo !== m && !(h.metodo === "*")) continue;
    if (!h.patron.test(p)) continue;
    const r = h.fn({ p, q, m, cuerpo });
    if (r) return r;
  }
  return null;
}

async function instalarMocks(ctx, usuario, extra = null) {
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" };
    const enviar = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(data) });
    if (url.origin === base && !url.pathname.startsWith("/api/") && !url.pathname.startsWith("/internal/")) return route.continue();
    if (url.origin !== base && url.origin !== API_ORIGEN) return route.abort();
    if (req.method() === "OPTIONS") return enviar({});
    const p = url.pathname.replace(/^\/api/, "");
    if (p.endsWith("/users/verify/token")) return enviar({ user: usuario });
    if (p.includes("eventos-checada")) return route.abort();
    if (p === "/checador/mi-espacio/firma/imagen" || p.startsWith("/checador/firma-imagen")) return route.fulfill({ status: 200, contentType: "image/png", headers: cors, body: FIRMA_PNG });
    let cuerpo = null;
    try { cuerpo = JSON.parse(req.postData() ?? "null"); } catch { cuerpo = null; }
    const arg = { p, q: url.searchParams, m: req.method(), cuerpo, local: url.origin === base };
    const propio = extra?.(arg);
    if (propio) return enviar(propio[0], propio[1]);
    const r = responder(arg);
    if (r) return enviar(r[0], r[1]);
    return enviar({});
  });
}

// ───────── capturas ─────────
const PANEL = { width: 1440, height: 900 };
const CELULAR = { width: 390, height: 844 };
let browser;
const hechas = [];
let ultimaPagina = null;
const fallidas = [];

async function abrir({ usuario = LAURA, viewport = PANEL, extra = null, camara = false } = {}) {
  const movil = viewport.width < 600;
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: "es-MX", timezoneId: "America/Mexico_City", hasTouch: movil, isMobile: movil,
    permissions: camara ? ["camera"] : [] });
  await ctx.addCookies([{ name: "token", value: jwt(usuario), url: base }]);
  await instalarMocks(ctx, usuario, extra);
  const page = await ctx.newPage();
  ultimaPagina = page;
  page.on("pageerror", (e) => console.warn(`  (error de página) ${e.message.slice(0, 160)}`));
  return { ctx, page };
}

// Guarda la captura en webp (~80); si pasa de 200 KB baja la calidad. `zona`: locator o {x,y,width,height} para recortar.
async function guardar(page, modulo, nombre, { zona = null, completa = false, espera = 600 } = {}) {
  await dormir(espera);
  // Sin la barra de avisos de Next ni el cursor parpadeando.
  await page.addStyleTag({ content: "nextjs-portal{display:none!important} *{caret-color:transparent!important}" }).catch(() => {});
  const opciones = { type: "png", animations: "disabled" };
  const png = zona && typeof zona.screenshot === "function"
    ? await zona.first().screenshot(opciones)
    : await page.screenshot({ ...opciones, fullPage: completa, ...(zona ? { clip: zona } : {}) });
  const carpeta = path.join(SALIDA, modulo);
  mkdirSync(carpeta, { recursive: true });
  const archivo = path.join(carpeta, `${nombre}.webp`);
  let calidad = 80;
  for (;;) {
    let img = sharp(png);
    const meta = await img.metadata();
    if (meta.height > 2600) img = img.extract({ left: 0, top: 0, width: meta.width, height: 2600 });
    await img.webp({ quality: calidad }).toFile(archivo);
    const kb = statSync(archivo).size / 1024;
    if (kb <= 200 || calidad <= 45) { hechas.push(`${modulo}/${nombre}.webp (${Math.round(kb)} KB)`); break; }
    calidad -= 10;
  }
}

async function escena(nombre, fn) {
  if (process.env.SOLO && !nombre.includes(process.env.SOLO)) return; // SOLO=<texto>: solo las escenas que lo contienen
  try {
    await fn();
  } catch (e) {
    fallidas.push(`${nombre}: ${e.message.split("\n")[0]}`);
    // DEPURAR=<carpeta>: guarda cómo quedó la pantalla al fallar.
    if (process.env.DEPURAR && ultimaPagina) await ultimaPagina.screenshot({ path: path.join(process.env.DEPURAR, `${nombre.replace(/\s+/g, "-")}.png`) }).catch(() => {});
    console.warn(`✗ ${nombre}: ${e.message.split("\n")[0]}`);
  }
}

const GRUPOS = {};

// ===== Empleados =====
GRUPOS.empleados = async () => {
  await escena("empleados lista", async () => {
    const { ctx, page } = await abrir();
    await page.goto(base + "/panel/empleados", { waitUntil: "domcontentloaded" });
    await page.getByText("Lista de empleados").waitFor({ timeout: 30000 });
    await page.getByText("Ana Torres").first().waitFor();
    await guardar(page, "empleados", "lista-empleados");
    await page.getByTitle("Dar de baja").first().click();
    await page.getByRole("dialog").getByPlaceholder(/Renuncia voluntaria/).fill("Renuncia voluntaria");
    await guardar(page, "empleados", "dialogo-dar-de-baja", { zona: page.getByRole("dialog") });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Importar empleados" }).click();
    await guardar(page, "empleados", "importar-empleados", { zona: page.getByRole("dialog") });
    await page.keyboard.press("Escape");
    await dormir(300);
    await page.getByRole("button", { name: "Sincronizar con reloj" }).click();
    await guardar(page, "empleados", "sincronizar-con-reloj", { zona: page.getByRole("dialog") });
    await page.keyboard.press("Escape");
    await dormir(300);
    await page.getByTitle(/Cambiar contraseña/).first().click();
    await guardar(page, "empleados", "cambiar-contrasena", { zona: page.getByRole("dialog") });
    await ctx.close();
  });

  await escena("empleados alta", async () => {
    const { ctx, page } = await abrir();
    await page.goto(base + "/panel/empleados", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Nuevo empleado" }).first().click();
    await page.getByRole("tab", { name: "Personal" }).waitFor();
    await page.getByPlaceholder("Ingrese el nombre del empleado").fill("Lucía");
    await guardar(page, "empleados", "alta-personal");
    await page.getByRole("button", { name: "Registrar" }).first().click();
    await dormir(700);
    await guardar(page, "empleados", "alta-error-obligatorio");
    await ctx.close();
  });

  await escena("empleados ficha", async () => {
    const { ctx, page } = await abrir();
    await page.goto(base + "/panel/empleados?id=15", { waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: "Personal" }).waitFor({ timeout: 30000 });
    await page.getByText("Información personal").waitFor();
    await guardar(page, "empleados", "ficha-personal");
    await page.getByRole("tab", { name: "Trabajo" }).click();
    await page.getByText("Puesto y organización").waitFor();
    await guardar(page, "empleados", "ficha-trabajo");
    await page.getByText("Jornada laboral").first().scrollIntoViewIfNeeded();
    await guardar(page, "empleados", "ficha-jornada");
    await page.getByRole("tab", { name: "Checador y acceso" }).click();
    await page.getByText("Firma y PIN").waitFor();
    await guardar(page, "empleados", "ficha-checador");
    await page.locator("[data-reconocimiento-columnas]").scrollIntoViewIfNeeded();
    await guardar(page, "empleados", "ficha-rostro-firma-pin", { zona: page.locator("[data-reconocimiento-columnas]") });
    await page.getByRole("tab", { name: "Pago" }).click();
    await page.getByText("Datos de nómina").waitFor();
    await guardar(page, "empleados", "ficha-pago");
    await page.getByRole("tab", { name: "Documentos" }).click();
    await dormir(1200);
    await guardar(page, "empleados", "ficha-documentos");
    await page.getByRole("tab", { name: "Personal" }).click();
    await page.getByPlaceholder("Ingrese el nombre del empleado").fill("Ana María");
    await dormir(300);
    await guardar(page, "empleados", "ficha-cambios-sin-guardar", { zona: page.locator("[data-encabezado-ficha]") });
    await page.getByPlaceholder("Ingrese el nombre del empleado").fill("Ana");
    await dormir(300);
    const credencial = page.locator("[data-boton-credencial]");
    if (await credencial.count()) {
      await credencial.first().click();
      await guardar(page, "empleados", "credencial-y-qr", { zona: page.getByRole("dialog") });
    }
    await ctx.close();
  });

  await escena("empleados celular", async () => {
    const { ctx, page } = await abrir({ viewport: CELULAR });
    await page.goto(base + "/panel/empleados", { waitUntil: "domcontentloaded" });
    await page.getByText("Ana Torres").first().waitFor({ timeout: 30000 });
    await guardar(page, "empleados", "lista-empleados-celular");
    await ctx.close();
  });

  await escena("panel empleado", async () => {
    const { ctx, page } = await abrir();
    await page.goto(base + "/panel/panel-empleado?emp=15", { waitUntil: "domcontentloaded" });
    await page.getByText("Directorio").first().waitFor({ timeout: 30000 });
    await dormir(1500);
    await guardar(page, "empleados", "panel-empleado");
    await ctx.close();
  });

  await escena("mi cuenta", async () => {
    const { ctx, page } = await abrir();
    await page.goto(base + "/panel/cuenta", { waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: "Seguridad" }).waitFor({ timeout: 30000 });
    await guardar(page, "empleados", "mi-cuenta");
    await page.getByRole("tab", { name: "Seguridad" }).click();
    await guardar(page, "empleados", "mi-cuenta-seguridad");
    await ctx.close();
  });

  await escena("mi firma y rostro", async () => {
    const { ctx, page } = await abrir({ usuario: ANA_USUARIO, viewport: CELULAR });
    await page.goto(base + "/empleado/panel/mi-espacio", { waitUntil: "domcontentloaded" });
    await page.getByText("Mi firma y PIN").first().waitFor({ timeout: 30000 });
    await guardar(page, "empleados", "mi-espacio-menu");
    await page.goto(base + "/empleado/panel/mi-firma", { waitUntil: "domcontentloaded" });
    await page.getByText("Mi PIN secreto").waitFor({ timeout: 30000 });
    await guardar(page, "empleados", "mi-firma-y-pin");
    await page.getByRole("button", { name: "Cambiar mi PIN" }).click().catch(() => {});
    await page.getByText("Nuevo PIN (6 dígitos)").scrollIntoViewIfNeeded().catch(() => {});
    await guardar(page, "empleados", "cambiar-mi-pin");
    await page.goto(base + "/empleado/panel/mi-rostro", { waitUntil: "domcontentloaded" });
    await page.getByText("Tu rostro está registrado").waitFor({ timeout: 30000 });
    await guardar(page, "empleados", "mi-rostro");
    await ctx.close();
  });
};

// ===== Catálogos =====
GRUPOS.catalogos = async () => {
  await escena("catalogos", async () => {
    const { ctx, page } = await abrir();
    for (const [rutaCat, nombre, boton] of [
      ["/panel/catalogos/departamentos", "departamentos", "Nuevo departamento"],
      ["/panel/catalogos/puestos", "puestos", "Nuevo puesto"],
      ["/panel/catalogos/estado-civil", "estado-civil", "Nuevo estado civil"],
      ["/panel/catalogos/unidades-de-negocio", "unidades-de-negocio", "Nueva unidad de negocio"],
    ]) {
      await page.goto(base + rutaCat, { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: boton }).first().waitFor({ timeout: 30000 });
      await dormir(800);
      await guardar(page, "catalogos", nombre);
      await page.getByRole("button", { name: boton }).first().click();
      await guardar(page, "catalogos", `${nombre}-nuevo`, { zona: page.getByRole("dialog") });
      await page.keyboard.press("Escape");
    }
    await page.goto(base + "/panel/campos-personalizados", { waitUntil: "domcontentloaded" });
    await page.getByText("Cuadrilla").first().waitFor({ timeout: 30000 });
    await guardar(page, "catalogos", "campos-personalizados");
    await page.getByRole("button", { name: "Nuevo campo" }).first().click();
    await page.getByLabel(/Nombre del campo/).fill("Turno de comedor");
    await guardar(page, "catalogos", "campos-personalizados-nuevo", { zona: page.getByRole("dialog") });
    await ctx.close();
  });
};

// ===== Inducción digital ===== (mismos datos de demostración que scripts/verify-induccion.mjs)
const TOKEN_INGRESO = "TkVn4Lx0Q2b9mPq7Rs1Uv3Wx5Yz8Ab6Cd0Ef2Gh4Ij8";
const CAT_IND = {
  documentos_base: [
    { clave: "ine", nombre: "INE (frente y vuelta)", categoria: "Identificación", caras: 2 }, { clave: "curp", nombre: "CURP", categoria: "Identificación", caras: 1 },
    { clave: "csf", nombre: "Constancia de situación fiscal (RFC)", categoria: "Fiscal", caras: 1 }, { clave: "domicilio", nombre: "Comprobante de domicilio", categoria: "Identificación", caras: 1, antiguedad_meses: 3 },
    { clave: "acta_nacimiento", nombre: "Acta de nacimiento", categoria: "Identificación", caras: 1 },
  ],
  categorias: ["Identificación", "Contractual", "Fiscal", "Académico", "Médico", "Capacitación"],
  roles: [{ id_rol: 1, nombre: "Recursos Humanos", id_empleado: 50, persona: "Laura Ríos" }, { id_rol: 2, nombre: "Sistemas", id_empleado: 51, persona: "Diego Paz" }, { id_rol: 3, nombre: "Almacén", id_empleado: null, persona: null }],
  personas: [{ id: 50, nombre: "Laura Ríos" }, { id: 51, nombre: "Diego Paz" }, { id: 60, nombre: "Carlos Andrey" }],
  formatos: [{ id: 11, nombre: "Contrato tiempo determinado" }, { id: 12, nombre: "Reglamento interior de trabajo" }, { id: 13, nombre: "Aviso de privacidad para empleados" }, { id: 14, nombre: "Política NOM-035" }],
  puestos: ["Almacenista", "Auxiliar contable", "Cajera", "Vendedor"], areas: ["Ventas", "Operación"], sucursales: ["Centro", "Norte"],
  tareas_activo: true, whatsapp: { configurado: true }, limites: {}, dia: { min: -30, max: 90 },
};
const CONT_CAJERA = {
  documentos: [
    { clave: "ine", nombre: "INE (frente y vuelta)", obligatorio: true, caras: 2, propio: false }, { clave: "curp", nombre: "CURP", obligatorio: true, caras: 1, propio: false },
    { clave: "csf", nombre: "Constancia fiscal (RFC)", obligatorio: true, caras: 1, propio: false }, { clave: "domicilio", nombre: "Comprobante de domicilio", obligatorio: true, antiguedad_meses: 3, caras: 1, propio: false },
    { clave: "propio_antecedentes", nombre: "Carta de antecedentes no penales", obligatorio: false, propio: true, caras: 1 }, { clave: "propio_medico", nombre: "Certificado médico", obligatorio: false, propio: true, vence_meses: 12, caras: 1 },
  ],
  firmas: [{ clave: "doc11", id_plantilla_doc: 11, nombre: "Contrato individual", obligatorio: true }, { clave: "doc12", id_plantilla_doc: 12, nombre: "Reglamento interior de trabajo", obligatorio: true }, { clave: "doc13", id_plantilla_doc: 13, nombre: "Aviso de privacidad para empleados", obligatorio: true }, { clave: "doc14", id_plantilla_doc: 14, nombre: "Política NOM-035", obligatorio: true }],
  ruta: [{ id: "quienes", tipo: "contenido", titulo: "Quiénes somos", descripcion: "texto y video tuyo", video_url: "https://videos.uniline.mx/quienes", obligatorio: true }, { id: "caja", tipo: "curso", titulo: "Curso: atención en caja", obligatorio: true }],
  tareas: [
    { id: "imss", titulo: "Alta en el IMSS", responsable: { tipo: "rol", id_rol: 1 }, dia: -1 }, { id: "pv", titulo: "Usuario en punto de venta", responsable: { tipo: "rol", id_rol: 2 }, dia: 1 },
    { id: "presentar", titulo: "Presentarla al equipo", responsable: { tipo: "jefe" }, dia: 1 }, { id: "uniforme", titulo: "Uniforme y gafete", responsable: { tipo: "rol", id_rol: 3 }, dia: 1, liga: "activos" },
    { id: "unoauno", titulo: "Primera reunión 1 a 1", responsable: { tipo: "jefe" }, dia: 5 },
  ],
};
const av = (datos, l, t, firma, rostro, extra = {}) => ({ datos, documentos: { listos: l, total: t }, firma, rostro, por_revisar: 0, rechazados: 0, listo_para_alta: false, ...extra });
const TAREAS_IND = [
  ["Recursos Humanos", "Laura Ríos", [["Expediente completo (7 documentos)", true], ["Contrato y reglamento firmados", true], ["Alta en el IMSS", false, -1]]],
  ["Sistemas", "Diego Paz", [["Correo de la empresa", true], ["Usuario en el punto de venta", false]]],
  ["Jefe directo", "Carlos Andrey", [["Presentarlo con el equipo", true], ["Recorrido por la sucursal", true], ["Primera reunión 1 a 1 (agendada para el viernes)", false, 5]]],
  ["Almacén", "Rafa Soto", [["Uniforme talla M (2 playeras)", true, 1, "activos"]]],
].flatMap(([grupo, resp, ts], g) => ts.map(([titulo, hecha, d = 1, liga = null], i) => ({
  id: g * 10 + i + 1, clave: `t${g}${i}`, titulo, descripcion: null, grupo, responsable_tipo: "rol", id_responsable: 50 + g, responsable_nombre: resp, dia: d, plazo: d < 0 ? "1 día antes" : `Día ${d}`,
  fecha_limite: d < 0 ? HOY : dia(d - 1), liga, estado: hecha ? "hecha" : "pendiente", id_tarea: 900 + g * 10 + i,
})));
const PLANTILLAS_IND = [
  { id: 1, nombre: "Cajera", alcance: "puesto", alcance_valor: "Cajera", origen: "sugerida", version: 3, vigente: true, contenido: CONT_CAJERA, resumen: { documentos: 6, firmas: 4, ruta: 2, tareas: 5 } },
  { id: 2, nombre: "Plantilla general", alcance: "general", alcance_valor: null, origen: "sugerida", version: 1, vigente: true, contenido: CONT_CAJERA, resumen: { documentos: 6, firmas: 4, ruta: 2, tareas: 5 } },
];
const PROCESOS = [
  { id: 1, nombre: "María", apellido_paterno: "Torres", iniciales: "MT", origen: "reclutamiento", puesto: "Cajera", sucursal: "Centro", fecha_ingreso: dia(3), estado: "en_proceso", abierto: true, avance: av(true, 5, 7, false, false), siguiente: { clave: "en_proceso", texto: "Falta INE y comprobante" }, checklist: { hechas: 0, total: 5, atrasadas: 0 } },
  { id: 2, nombre: "José", apellido_paterno: "Ramírez", iniciales: "JR", origen: "manual", puesto: "Almacenista", sucursal: null, fecha_ingreso: dia(5), estado: "por_revisar", abierto: true, avance: av(true, 7, 7, true, true, { listo_para_alta: true }), siguiente: { clave: "dar_alta", texto: "Revisar y dar de alta" }, checklist: { hechas: 1, total: 5, atrasadas: 0 } },
  { id: 3, nombre: "Lucía", apellido_paterno: "Pérez", iniciales: "LP", origen: "reclutamiento", puesto: "Auxiliar contable", sucursal: null, fecha_ingreso: dia(10), estado: "invitado", abierto: false, avance: av(false, 0, 6, false, false), siguiente: { clave: "sin_abrir", texto: "Invitación enviada · sin abrir" }, checklist: { hechas: 0, total: 5, atrasadas: 0 } },
  { id: 4, nombre: "Andrés", apellido_paterno: "Gómez", iniciales: "AG", origen: "manual", puesto: "Vendedor", sucursal: "Centro", fecha_ingreso: HOY, estado: "alta", abierto: true, avance: av(true, 7, 7, true, true), siguiente: { clave: "alta", texto: "Dado de alta" }, checklist: { hechas: 6, total: 9, atrasadas: 1 } },
];
const DOCS_JOSE = [
  { id: 201, clave: "ine", cara: 1, nombre: "INE (frente y vuelta) · frente", estado: "aprobado" }, { id: 202, clave: "ine", cara: 2, nombre: "INE (frente y vuelta) · vuelta", estado: "recibido" },
  { id: 203, clave: "domicilio", cara: 1, nombre: "Comprobante de domicilio", estado: "recibido" },
];
function detalleIngreso(id) {
  const fila = PROCESOS.find((p) => p.id === id);
  const b = { ...fila, id_jefe: 60, jefe: "Carlos Andrey", telefono: "5512345678", correo: "jose@correo.mx", plantilla_nombre: fila.puesto === "Vendedor" ? "Vendedor" : "Plantilla general", plantilla_version: 1, vence_en: `${dia(14)}T06:00:00.000Z`, eventos: [], ruta: { total: 5, listos: 2 } };
  if (id === 4) return { ...b, hora_ingreso: "08:58", datos: null, requeridos: [], documentos: [], firmas: [{ clave: "doc11", nombre: "Contrato", obligatorio: true, firmado_en: "x" }], tareas: TAREAS_IND };
  return {
    ...b, hora_ingreso: "09:00", datos: { curp: "RAJO900101HDFMSS08", rfc: "RAJO900101AB1", direccion: "Calle 1, Centro, CDMX 06000", telefono: "5511112222", clabe: "002010077777777771", banco: "BBVA" },
    requeridos: [{ clave: "ine", nombre: "INE (frente y vuelta)", obligatorio: true, caras: 2, con_dato: false }, { clave: "domicilio", nombre: "Comprobante de domicilio", obligatorio: true, caras: 1, antiguedad_meses: 3, con_dato: false }, { clave: "nss", nombre: "Número de seguridad social (IMSS)", obligatorio: true, caras: 1, con_dato: true }],
    documentos: DOCS_JOSE, firmas: [{ clave: "doc11", nombre: "Contrato individual", obligatorio: true, firmado_en: "x" }],
    tareas: TAREAS_IND.slice(0, 5).map((t, i) => ({ ...t, id: 100 + i, estado: i === 0 ? "hecha" : "pendiente", id_responsable: i === 4 ? null : t.id_responsable, responsable_nombre: i === 4 ? null : t.responsable_nombre, grupo: i === 4 ? "Jefe directo" : t.grupo })),
  };
}
const PUBLICO = {
  datos: { curp: "TOAM940318MDFRRR09", telefono: "5512345678", fecha_nacimiento: "1994-03-18", rfc: "TOAM940318AB1", direccion: "Calle Hidalgo 45, Centro, Guadalajara, Jal. 44100", contacto_emergencia: "Rosa Torres", telefono_emergencia: "3311223344" },
  documentos: [
    { clave: "ine", nombre: "INE (frente y vuelta)", obligatorio: true, tipo: "archivo", caras: 2, estado: "recibido", caras_subidas: [1, 2], instrucciones: "" },
    { clave: "curp", nombre: "CURP", obligatorio: true, tipo: "archivo", caras: 1, estado: "aprobado", caras_subidas: [1] },
    { clave: "csf", nombre: "Constancia de situación fiscal (RFC)", obligatorio: true, tipo: "archivo", caras: 1, estado: "recibido", caras_subidas: [1] },
    { clave: "nss", nombre: "Número de seguridad social (IMSS)", obligatorio: true, tipo: "dato_o_archivo", dato: "nss", caras: 1, estado: "pendiente", caras_subidas: [], instrucciones: "Escríbelo o sube tu constancia" },
    { clave: "domicilio", nombre: "Comprobante de domicilio", obligatorio: true, tipo: "archivo", caras: 1, estado: "rechazado", motivo: "Tiene más de 3 meses", caras_subidas: [], antiguedad_meses: 3 },
    { clave: "clabe", nombre: "Cuenta para tu pago (CLABE)", obligatorio: true, tipo: "dato_o_archivo", dato: "clabe", caras: 1, estado: "pendiente", caras_subidas: [], instrucciones: "Estado de cuenta o captura del banco" },
  ],
  firmas: CONT_CAJERA.firmas.map((f, i) => ({ clave: f.clave, nombre: f.nombre, obligatorio: true, firmado: false, leido: i < 2 })),
};
function vistaPublica() {
  const p = PUBLICO;
  const oblig = p.documentos.filter((d) => d.obligatorio);
  return {
    persona: { nombre: "María", apellido_paterno: "Torres", puesto: "Cajera", sucursal: "Centro" }, empresa: { nombre: "Uniline", logo: null },
    fecha_ingreso: dia(3), hora_ingreso: "09:00", fecha_texto: "el lunes a las 9:00 a. m.", estado: "en_proceso", editable: true,
    vence_en: `${dia(14)}T06:00:00.000Z`, firmado: false, datos: p.datos,
    campos: [["fecha_nacimiento", "Fecha de nacimiento", true], ["curp", "CURP", true], ["rfc", "RFC", true], ["nss", "Número de seguridad social", false], ["direccion", "Domicilio", true], ["correo", "Correo", false], ["telefono", "Teléfono", true], ["contacto_emergencia", "Contacto de emergencia", true], ["telefono_emergencia", "Teléfono de emergencia", true], ["banco", "Banco", false], ["clabe", "CLABE", false]].map(([clave, etiqueta, requerido]) => ({ clave, etiqueta, requerido })),
    documentos: p.documentos, firmas: p.firmas, rostro: { registrado: false },
    avance: { datos: true, documentos: { listos: oblig.filter((d) => ["recibido", "con_dato", "aprobado"].includes(d.estado)).length, total: oblig.length }, firma: false, rostro: false, completo: false, rechazados: [{ clave: "domicilio", nombre: "Comprobante de domicilio", motivo: "Tiene más de 3 meses" }] },
  };
}
const RUTA_ANDRES = {
  empresa: "Uniline", nombre: "Ana", puesto: "Cajera", jefe: "Carlos Andrey", rh: "Laura Ríos", fecha_ingreso: HOY, listos: 2, total: 5,
  pasos: [
    { id: "quienes", tipo: "contenido", titulo: "Quiénes somos", descripcion: "Misión, valores e historia", duracion_min: 3, visto: true, disponible: true, texto: "Somos Uniline." },
    { id: "equipo", tipo: "equipo", titulo: "Tu equipo", descripcion: "Tu jefe Carlos y tus compañeros de Centro", visto: true, disponible: true, jefe: "Carlos Andrey", companeros: ["Frida Serrano", "Beto Soto"], sucursal: "Centro" },
    { id: "checar", tipo: "contenido", titulo: "Cómo checar y pedir permisos", descripcion: "Video de 2 min · reloj, comida y vacaciones", visto: false, disponible: true, texto: "Checa desde la app.", video_url: "https://videos.uniline.mx/checar" },
    { id: "caja", tipo: "curso", titulo: "Curso: atención en caja", descripcion: "Obligatorio para tu puesto", obligatorio: true, visto: false, disponible: true, texto: "Lee el manual.", pdf_url: "https://docs.uniline.mx/caja.pdf" },
    { id: "mes", tipo: "encuesta", titulo: "¿Cómo te fue en tu primer mes?", ciclo: "ingreso30", abre_el: dia(30), visto: false, disponible: false },
  ],
};
ruta("GET", /^\/checador\/induccion\/catalogo$/, () => json(CAT_IND));
ruta("GET", /^\/checador\/induccion\/plantillas$/, () => json({ plantillas: PLANTILLAS_IND }));
ruta("GET", /^\/checador\/induccion\/plantillas\/(\d+)$/, ({ p }) => json({ plantilla: PLANTILLAS_IND.find((x) => String(x.id) === p.split("/").pop()) }));
ruta("GET", /^\/checador\/induccion\/aplica$/, () => json({ plantilla: { id: 1, nombre: "Cajera", alcance: "puesto", alcance_valor: "Cajera" } }));
ruta("GET", /^\/checador\/induccion\/procesos$/, () => json({ hoy: HOY, resumen: { preingreso: 2, por_revisar: 1, entran_semana: 2, tareas_atrasadas: 1 }, procesos: PROCESOS }));
ruta("POST", /^\/checador\/induccion\/procesos$/, () => json({ proceso: { id: 9 }, liga: `https://adamia.com.mx/ingreso/${TOKEN_INGRESO}`, envio: { canal: "whatsapp", estado: "enviado" } }, 201));
ruta("GET", /^\/checador\/induccion\/procesos\/(\d+)$/, ({ p }) => json({ proceso: detalleIngreso(Number(p.split("/").pop())) }));
ruta("GET", /^\/checador\/induccion\/mi-ruta$/, () => json({ ruta: RUTA_ANDRES }));
ruta("GET", new RegExp(`^/checador/induccion/publico/${TOKEN_INGRESO}$`), () => json(vistaPublica()));
ruta("GET", new RegExp(`^/checador/induccion/publico/${TOKEN_INGRESO}/formatos/(doc\\d+)$`), ({ p }) => json({ clave: p.split("/").pop(), nombre: "Contrato individual", html: "<h3>Contrato individual de trabajo</h3><p>Contrato que celebran Uniline y María Torres, quien se desempeñará como Cajera en la sucursal Centro a partir de su primer día de trabajo.</p><ul><li>Jornada de 48 horas a la semana.</li><li>Salario y prestaciones según la ley y el reglamento interior.</li></ul>" }));

GRUPOS.induccion = async () => {
  await escena("induccion panel", async () => {
    const { ctx, page } = await abrir();
    await page.goto(base + "/panel/plantillas-induccion", { waitUntil: "domcontentloaded" });
    await page.getByText("Tus plantillas").waitFor({ timeout: 30000 });
    await guardar(page, "induccion", "plantillas-de-induccion");
    await page.goto(base + "/panel/plantillas-induccion/1", { waitUntil: "domcontentloaded" });
    await page.getByText("1 · Documentos que pides").waitFor({ timeout: 30000 });
    await guardar(page, "induccion", "editor-de-plantilla");
    await page.getByText("3 · Tareas y responsables").scrollIntoViewIfNeeded();
    await guardar(page, "induccion", "editor-tareas-y-responsables");
    await page.goto(base + "/panel/nuevos-ingresos", { waitUntil: "domcontentloaded" });
    await page.locator("[data-proceso='1']").waitFor({ timeout: 30000 });
    await guardar(page, "induccion", "nuevos-ingresos");
    await page.getByRole("button", { name: "Invitar a un nuevo ingreso" }).click();
    const dlg = page.getByRole("dialog");
    await dlg.getByLabel("Nombre", { exact: true }).fill("Lucía");
    await dlg.getByLabel("Apellido paterno").fill("Pérez");
    await dlg.getByLabel("Celular (WhatsApp)").fill("3312345678");
    await dlg.getByLabel("Puesto").fill("Cajera");
    await dlg.getByLabel("Primer día").fill(dia(7));
    await dlg.getByLabel("Hora de entrada").fill("09:00");
    await dormir(800);
    await guardar(page, "induccion", "invitar-nuevo-ingreso", { zona: dlg });
    await dlg.getByRole("button", { name: "Enviar invitación" }).click();
    await dlg.getByText("Invitación lista").waitFor({ timeout: 15000 });
    await guardar(page, "induccion", "invitacion-lista", { zona: dlg });
    await page.goto(base + "/panel/nuevos-ingresos/2", { waitUntil: "domcontentloaded" });
    await page.locator("[data-documento='203']").waitFor({ timeout: 30000 });
    await guardar(page, "induccion", "revisar-y-dar-de-alta");
    await guardar(page, "induccion", "revisar-documentos", { zona: page.locator("#rev-docs").locator("xpath=..") });
    await page.locator("[data-documento='203']").getByRole("button", { name: "Rechazar" }).click();
    await page.getByRole("dialog").getByRole("textbox").fill("La fecha del recibo tiene más de 3 meses.");
    await guardar(page, "induccion", "rechazar-documento", { zona: page.getByRole("dialog") });
    await page.keyboard.press("Escape");
    await page.goto(base + "/panel/nuevos-ingresos/4", { waitUntil: "domcontentloaded" });
    await page.getByText("Primera reunión 1 a 1").first().waitFor({ timeout: 30000 });
    await guardar(page, "induccion", "checklist-primer-dia");
    await ctx.close();
  });
  await escena("induccion celular", async () => {
    const { ctx, page } = await abrir({ viewport: CELULAR, camara: true });
    await page.goto(base + `/ingreso/${TOKEN_INGRESO}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Continuar" }).first().waitFor({ timeout: 30000 });
    await guardar(page, "induccion", "liga-datos");
    await page.getByRole("button", { name: "Documentos", exact: true }).click();
    await page.locator("[data-documento='nss']").waitFor({ timeout: 15000 });
    await guardar(page, "induccion", "liga-documentos");
    await page.getByRole("button", { name: "Firma y rostro", exact: true }).click();
    await page.getByText("Reglamento interior de trabajo").first().waitFor({ timeout: 15000 });
    await guardar(page, "induccion", "liga-firma-y-rostro");
    await page.getByRole("button", { name: "Leer" }).first().click();
    await page.getByRole("button", { name: "Ya lo leí" }).waitFor({ timeout: 15000 });
    await guardar(page, "induccion", "liga-leer-formato");
    await ctx.close();
  });
  await escena("induccion bienvenida", async () => {
    const { ctx, page } = await abrir({ usuario: ANA_USUARIO, viewport: CELULAR });
    await page.goto(base + "/empleado/panel/bienvenida", { waitUntil: "domcontentloaded" });
    await page.locator("[data-paso='checar']").waitFor({ timeout: 30000 });
    await guardar(page, "induccion", "ruta-de-bienvenida");
    await ctx.close();
  });
};

// ===== Gestión documental =====
function pdfDemo(lineas) {
  const contenido = ["BT /F1 13 Tf 40 760 Td"].concat(lineas.map((l, i) => `${i ? "0 -22 Td " : ""}(${l.replace(/[()\\]/g, "")}) Tj`)).concat(["ET"]).join("\n");
  const objs = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"];
  let out = "%PDF-1.4\n";
  const offs = objs.map((o, i) => { const at = out.length; out += `${i + 1} 0 obj\n${o}\nendobj\n`; return at; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, "latin1");
}
const PDF_CONTRATO = pdfDemo(["CONTRATO INDIVIDUAL DE TRABAJO", "", "Que celebran Uniline S.A. de C.V. y Ana Torres Ruiz,", "quien se desempena como Cajera en la sucursal Matriz.", "", "PRIMERA. Jornada de 48 horas a la semana.", "SEGUNDA. Salario y prestaciones de ley.", "TERCERA. Lugar de trabajo: Av. Juarez 120, Guadalajara."]);
const PLANTILLAS_DOC = [
  { id_plantilla: 1, codigo: "carta_trabajo", nombre: "Carta de trabajo", categoria: "Laboral", descripcion: "Constancia de empleo con puesto, salario y antigüedad.", activo: 1, contenido_html: "<p>A quien corresponda: {{empleado.nombre}} labora en {{empresa.nombre}} como {{empleado.puesto}} desde {{empleado.fecha_ingreso}}.</p>" },
  { id_plantilla: 2, codigo: "contrato_determinado", nombre: "Contrato por tiempo determinado", categoria: "Legal", descripcion: "Contrato individual con fecha de término.", activo: 1, contenido_html: "<p>Contrato que celebran {{empresa.nombre}} y {{empleado.nombre}}.</p>" },
  { id_plantilla: 3, codigo: "reglamento_interior", nombre: "Acuse de reglamento interior", categoria: "RRHH", descripcion: "Constancia de que la persona recibió el reglamento.", activo: 1, contenido_html: "<p>Recibí el reglamento interior de {{empresa.nombre}}.</p>" },
  { id_plantilla: 4, codigo: "amonestacion", nombre: "Amonestación por escrito", categoria: "Administrativo", descripcion: "Formato para registrar una amonestación.", activo: 0, contenido_html: "<p>Amonestación.</p>" },
];
const DOCS_EMITIDOS = [
  { id_documento: 31, folio: "DOC-0031", nombre_documento: "Carta de trabajo · Ana Torres Ruiz", nombre_empleado: "Ana Torres Ruiz", id_empleado: 15, id_empresa: 7, nombre_plantilla: "Carta de trabajo", estatus: "emitido", fecha_creacion: `${dia(-1)} 10:20:00`, contenido_html: "<h2 style='text-align:center'>Carta de trabajo</h2><p>A quien corresponda:</p><p>Por medio de la presente hacemos constar que <b>Ana Torres Ruiz</b> labora en <b>Uniline</b> como <b>Cajera</b> desde el 13 de febrero de 2023.</p><p>Se extiende la presente para los fines que a la interesada convengan.</p><p style='margin-top:40px'>Atentamente,<br>Laura Ríos · Recursos Humanos</p>" },
  { id_documento: 30, folio: "DOC-0030", nombre_documento: "Contrato por tiempo determinado · Frida Serrano Gil", nombre_empleado: "Frida Serrano Gil", id_empleado: 18, id_empresa: 7, nombre_plantilla: "Contrato por tiempo determinado", estatus: "firmado", fecha_creacion: `${dia(-6)} 12:00:00`, contenido_html: "<p>Contrato.</p>" },
  { id_documento: 29, folio: "DOC-0029", nombre_documento: "Acuse de reglamento interior · Diego Paz Herrera", nombre_empleado: "Diego Paz Herrera", id_empleado: 17, id_empresa: 7, nombre_plantilla: "Acuse de reglamento interior", estatus: "emitido", fecha_creacion: `${dia(-9)} 09:30:00`, contenido_html: "<p>Acuse.</p>" },
  { id_documento: 28, folio: "DOC-0028", nombre_documento: "Carta de trabajo · Carlos Andrey Luna", nombre_empleado: "Carlos Andrey Luna", id_empleado: 16, id_empresa: 7, nombre_plantilla: "Carta de trabajo", estatus: "borrador", fecha_creacion: `${dia(-15)} 16:45:00`, contenido_html: "<p>Carta.</p>" },
];
const BIBLIOTECA = [
  { id_documento_gd: 1, titulo: "Reglamento interior de trabajo", descripcion: "Versión vigente depositada ante el CFCRL.", id_categoria: 1, nombre_categoria: "Políticas internas", version: 3, subido_por_nombre: "Laura Ríos", nombre_archivo: "reglamento-interior-v3.pdf", tipo_archivo: "pdf", fecha_creacion: `${dia(-40)} 10:00:00`, s3_key: "x" },
  { id_documento_gd: 2, titulo: "Manual de bienvenida", descripcion: "Quiénes somos, valores y beneficios.", id_categoria: 2, nombre_categoria: "Capacitación", version: 1, subido_por_nombre: "Laura Ríos", nombre_archivo: "manual-bienvenida.pdf", tipo_archivo: "pdf", fecha_creacion: `${dia(-90)} 11:00:00`, s3_key: "x" },
  { id_documento_gd: 3, titulo: "Política de vacaciones", descripcion: "Cómo se piden y aprueban las vacaciones.", id_categoria: 1, nombre_categoria: "Políticas internas", version: 2, subido_por_nombre: "Carlos Andrey", nombre_archivo: "politica-vacaciones.docx", tipo_archivo: "docx", fecha_creacion: `${dia(-20)} 09:00:00`, s3_key: "x" },
];
const CONTRATOS = [
  { id: 41, folio: "CT-0041", nombre_empleado: "Frida Serrano Gil", puesto: "Vendedora", tipo_contrato: "temporal", fecha_inicio: dia(-170), fecha_fin: dia(10), estatus: "activo", empresa: "Uniline", id_empresa: 7 },
  { id: 40, folio: "CT-0040", nombre_empleado: "Ana Torres Ruiz", puesto: "Cajera", tipo_contrato: "indefinido", fecha_inicio: "2023-02-13", fecha_fin: null, estatus: "activo", empresa: "Uniline", id_empresa: 7 },
  { id: 39, folio: "CT-0039", nombre_empleado: "José Ramírez Ortiz", puesto: "Almacenista", tipo_contrato: "periodo_prueba", fecha_inicio: dia(-40), fecha_fin: dia(-10), estatus: "activo", empresa: "Uniline", id_empresa: 7 },
  { id: 38, folio: "CT-0038", nombre_empleado: "Beto Soto Lara", puesto: "Cajero", tipo_contrato: "temporal", fecha_inicio: dia(-400), fecha_fin: dia(-35), estatus: "terminado", empresa: "Uniline", id_empresa: 7 },
];
const ACTAS = [
  { id_acta: 12, folio: "ACT-0012", id_empleado: 19, nombre_empleado: "José", apellido_paterno_empleado: "Ramírez", apellido_materno_empleado: "Ortiz", nombre_tipo_acta: "Falta injustificada", gravedad_tipo: "Leve", fecha_incidente: dia(-2), estatus: "borrador", nombre_empresa: "Uniline", unidad_negocio: "Matriz", id_empresa: 7 },
  { id_acta: 11, folio: "ACT-0011", id_empleado: 18, nombre_empleado: "Frida", apellido_paterno_empleado: "Serrano", apellido_materno_empleado: "Gil", nombre_tipo_acta: "Retardos reiterados", gravedad_tipo: "Leve", fecha_incidente: dia(-12), estatus: "elaborada", nombre_empresa: "Uniline", unidad_negocio: "Matriz", id_empresa: 7 },
  { id_acta: 10, folio: "ACT-0010", id_empleado: 21, nombre_empleado: "Beto", apellido_paterno_empleado: "Soto", apellido_materno_empleado: "Lara", nombre_tipo_acta: "Faltante en caja", gravedad_tipo: "Grave", fecha_incidente: dia(-60), estatus: "cerrada", nombre_empresa: "Uniline", unidad_negocio: "Matriz", id_empresa: 7 },
];
ruta("GET", /^\/checador\/gestion-documental$/, () => json({ data: BIBLIOTECA }));
ruta("GET", /^\/checador\/gestion-documental\/categorias$/, () => json({ data: [{ id_categoria: 1, nombre: "Políticas internas", color: "#2563EB" }, { id_categoria: 2, nombre: "Capacitación", color: "#059669" }] }));
ruta("GET", /^\/checador\/gestion-documental\/plantillas$/, ({ q }) => { const d = q.get("activo") === "1" ? PLANTILLAS_DOC.filter((x) => x.activo) : PLANTILLAS_DOC; return json({ data: d, total: d.length }); });
ruta("GET", /^\/checador\/gestion-documental\/plantillas\/(\d+)$/, ({ p }) => json(PLANTILLAS_DOC.find((x) => String(x.id_plantilla) === p.split("/").pop())));
ruta("GET", /^\/checador\/gestion-documental\/documentos$/, () => json({ data: DOCS_EMITIDOS, total: DOCS_EMITIDOS.length, totalPages: 1 }));
ruta("GET", /^\/empresas\/7$/, () => json({ id_empresa: 7, nombre_empresa: "Uniline", nombre_dueno: "Laura Ríos", representante: "Laura Ríos" }));
ruta("GET", /^\/checador\/contratos$/, () => json({ data: CONTRATOS, total: CONTRATOS.length, estadisticas: { total: 4, activos: 3, porVencer: 1, vencidos: 1 } }));
ruta("GET", /^\/checador\/administrativeMinutes$/, () => json({ data: ACTAS, total: ACTAS.length, page: 1, totalPages: 1, stats: { totalActas: 3, totalBorradores: 1, totalElaboradas: 1, totalCerradas: 1, totalGraves: 1 } }));
ruta("GET", /^\/checador\/empleados\/activos$/, () => json({ data: EMPLEADOS.filter((e) => e.estado === "Activo"), total: 6 }));
ruta("GET", /^\/checador\/tipos-actas$/, () => json({ tipos_actas: [{ id_tipo_acta: 1, nombre: "Falta injustificada", clasificacion: "Falta", gravedad: "Leve" }, { id_tipo_acta: 2, nombre: "Retardos reiterados", clasificacion: "Falta", gravedad: "Leve" }, { id_tipo_acta: 3, nombre: "Faltante en caja", clasificacion: "Falta", gravedad: "Grave" }], total: 3 }));
ruta("GET", /^\/checador\/gestion-documental\/documentos\/(\d+)$/, ({ p }) => json(DOCS_EMITIDOS.find((x) => String(x.id_documento) === p.split("/").pop())));
ruta("GET", /^\/checador\/firma-digital\/solicitudes\/documento$/, () => json({ success: true, solicitud: null }));
ruta("POST", /^\/checador\/firma-digital\/solicitudes$/, () => json({ success: true, id_solicitud: 5, token: "tok-demo", url_firma: "/firmar/tok-demo", expires_at: `${dia(3)}T18:00:00.000Z`, firmante: { nombre: "Ana Torres Ruiz", correo: "ana@uniline.mx" } }, 201));
ruta("GET", /^\/checador\/firma-digital\/publica\/tok-demo$/, () => json({ success: true, solicitud: { id: 1, nombre_documento: "Contrato individual de trabajo · Ana Torres Ruiz", nombre_firmante: "Ana Torres Ruiz", documento_url: "https://docs.uniline.mx/contrato.pdf" }, firma_con_pin: { disponible: true, tiene_firma: true, tiene_pin: true, bloqueado_hasta: null } }));

GRUPOS.documentos = async () => {
  await escena("documentos panel", async () => {
    const { ctx, page } = await abrir();
    await page.goto(base + "/panel/gestion-documental/biblioteca", { waitUntil: "domcontentloaded" });
    await page.getByText("Reglamento interior de trabajo").first().waitFor({ timeout: 30000 });
    await guardar(page, "documentos", "biblioteca");
    await page.getByRole("button", { name: "Subir documento" }).first().click().catch(() => {});
    if (await page.getByRole("dialog").count()) { await guardar(page, "documentos", "biblioteca-subir", { zona: page.getByRole("dialog") }); await page.keyboard.press("Escape"); }
    await page.goto(base + "/panel/gestion-documental/plantillas", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: "Usar" }).first().waitFor({ timeout: 30000 });
    await guardar(page, "documentos", "plantillas-adamia");
    await page.getByRole("button", { name: "Mis plantillas" }).or(page.getByRole("tab", { name: "Mis plantillas" })).first().click();
    await page.getByText("Carta de trabajo").first().waitFor({ timeout: 30000 });
    await guardar(page, "documentos", "plantillas-mis-plantillas");
    await page.goto(base + "/panel/gestion-documental/plantillas/editor?id=1", { waitUntil: "domcontentloaded" });
    await page.getByText("Variables disponibles").first().waitFor({ timeout: 30000 });
    await dormir(800);
    await guardar(page, "documentos", "editor-de-plantilla");
    await page.goto(base + "/panel/gestion-documental/generar", { waitUntil: "domcontentloaded" });
    await page.getByText("Selecciona una plantilla").first().waitFor({ timeout: 30000 });
    await dormir(800);
    await guardar(page, "documentos", "generar-documento");
    await page.getByText("Carta de trabajo", { exact: true }).first().click();
    await page.getByRole("button", { name: /Siguiente/ }).click();
    await page.getByText("Selecciona un empleado").first().waitFor({ timeout: 15000 });
    await page.getByText("Ana Torres Ruiz").first().click();
    await dormir(800);
    await guardar(page, "documentos", "generar-elegir-empleado");
    await page.getByRole("button", { name: "Vista previa" }).last().click();
    await dormir(1500);
    await guardar(page, "documentos", "generar-vista-previa");
    await page.goto(base + "/panel/gestion-documental/documentos", { waitUntil: "domcontentloaded" });
    await page.getByText("DOC-0031").first().waitFor({ timeout: 30000 });
    await guardar(page, "documentos", "documentos-emitidos");
    await page.locator("tr", { hasText: "DOC-0031" }).locator("button").first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Solicitar firma" }).waitFor({ timeout: 15000 });
    await guardar(page, "documentos", "ver-documento-solicitar-firma", { zona: page.getByRole("dialog") });
    await page.getByRole("dialog").getByRole("button", { name: "Solicitar firma" }).click();
    await page.getByRole("dialog").getByText("Firma pendiente").waitFor({ timeout: 20000 });
    // El enlace real se arma con el dominio del sistema; aquí se muestra con el dominio público, no con el servidor de prueba.
    await page.getByRole("dialog").locator("input[readonly]").evaluate((el) => { el.value = el.value.replace(/^https?:\/\/[^/]+/, "https://adamia.com.mx"); });
    await guardar(page, "documentos", "firma-pendiente-copiar-enlace", { zona: page.getByRole("dialog") });
    await page.keyboard.press("Escape");
    await page.goto(base + "/panel/contratos", { waitUntil: "domcontentloaded" });
    await page.getByText("CT-0041").first().waitFor({ timeout: 30000 });
    await guardar(page, "documentos", "contratos");
    await page.getByRole("button", { name: "Nuevo contrato" }).first().click();
    await guardar(page, "documentos", "nuevo-contrato", { zona: page.getByRole("dialog") });
    await page.keyboard.press("Escape");
    await page.goto(base + "/panel/actas-administrativas", { waitUntil: "domcontentloaded" });
    await page.getByText("ACT-0012").first().waitFor({ timeout: 30000 });
    await guardar(page, "documentos", "actas-administrativas");
    await page.getByRole("button", { name: "Nueva acta" }).first().click();
    await guardar(page, "documentos", "nueva-acta", { zona: page.getByRole("dialog") });
    await ctx.close();
  });
  await escena("documentos firmar celular", async () => {
    const pdfs = ({ p, local }) => null;
    const { ctx, page } = await abrir({ usuario: ANA_USUARIO, viewport: CELULAR, camara: true });
    await ctx.route("https://docs.uniline.mx/**", (r) => r.fulfill({ status: 200, contentType: "application/pdf", headers: { "Access-Control-Allow-Origin": "*" }, body: PDF_CONTRATO }));
    await ctx.route(`${API_ORIGEN}/api/checador/firma-digital/publica/tok-demo/documento`, (r) => r.fulfill({ status: 200, contentType: "application/pdf", headers: { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true" }, body: PDF_CONTRATO }));
    void pdfs;
    await page.goto(base + "/firmar/tok-demo", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "¿Cómo quieres firmar?" }).waitFor({ timeout: 30000 });
    await guardar(page, "documentos", "firmar-elegir-metodo");
    await page.getByRole("button", { name: /Firmar con mi PIN/ }).click();
    await page.getByRole("heading", { name: "Revisa tu documento" }).waitFor({ timeout: 15000 });
    await dormir(2500);
    await guardar(page, "documentos", "firmar-revisar-documento");
    const continuar = page.getByRole("button", { name: "Continuar a la firma" });
    await page.waitForFunction(() => ![...document.querySelectorAll("button")].find((b) => b.textContent.includes("Continuar a la firma"))?.disabled, null, { timeout: 30000 });
    await continuar.click();
    await page.getByRole("heading", { name: "Tu PIN, el último paso" }).waitFor({ timeout: 15000 });
    await guardar(page, "documentos", "firmar-con-pin");
    await ctx.close();
  });
};

// ===== Activos y uniformes ===== (estado de demostración con la forma de scripts/verify-activos.mjs)
const producto = (id, type, name, o = {}) => ({
  id, type, name, code: `${type === "asset" ? "ACT" : "UNI"}-${id}`, category: type === "asset" ? "Cómputo" : "Playeras", categoryId: type === "asset" ? "1" : "2",
  serial: type === "asset" ? `SN-${id}7781` : "", variant: "", size: type === "uniform" ? "M" : "", color: type === "uniform" ? "Azul" : "", returnable: true,
  minimum: 2, cost: type === "asset" ? 15800 : 180, renewalMonths: type === "asset" ? 0 : 12, active: true, version: 1, stock: 5, repair: 0, retired: 0, locationId: "1", location: "Almacén Matriz", ...o,
});
const ESTADO_ACTIVOS = {
  version: 1, companyId: "7", revision: "7", company: { id: "7", name: "Uniline" },
  employees: [
    { id: "15", name: "Ana Torres Ruiz", role: "Cajera", roleId: "1", department: "Ventas", branch: "Matriz", active: true, size: "M", pantsSize: "30", shoeSize: "24", shoeSystem: "MX", notes: "" },
    { id: "16", name: "Carlos Andrey Luna", role: "Supervisor", roleId: "2", department: "Operación", branch: "Matriz", active: true, size: "L", pantsSize: "", shoeSize: "", shoeSystem: "", notes: "" },
    { id: "17", name: "Diego Paz Herrera", role: "Auxiliar de sistemas", roleId: "3", department: "Sistemas", branch: "Norte", active: true, size: "M", pantsSize: "", shoeSize: "", shoeSystem: "", notes: "" },
  ],
  roles: [], branches: [], locations: [{ id: "1", name: "Almacén Matriz", active: true }, { id: "2", name: "Bodega Norte", active: true }],
  balances: [], catalogReady: true,
  products: [
    producto("101", "asset", "Laptop Dell Latitude 5420"), producto("102", "asset", "Terminal punto de venta", { stock: 1, minimum: 2 }), producto("103", "asset", "Radio Motorola", { stock: 4, repair: 1 }),
    producto("201", "uniform", "Playera polo", { stock: 24, minimum: 10 }), producto("202", "uniform", "Gafete con portagafete", { stock: 3, minimum: 5, returnable: false }),
  ],
  categories: [{ id: "1", type: "asset", name: "Cómputo", active: true }, { id: "2", type: "uniform", name: "Playeras", active: true }],
  deliveries: [{
    id: "501", folio: "E-501", employeeId: "15", employee: { name: "Ana Torres Ruiz", role: "Cajera" }, date: dia(-5), due: "", mode: "Asignación", note: "Sin golpes. Incluye cargador.",
    actor: "Laura Ríos", status: "confirmed", acknowledgement: "pending", ackNote: "", ackDate: "", cancelReason: "", version: 1,
    lines: [
      { id: "9001", productId: "201", locationId: "1", qty: 2, returned: 0, lost: 0, snapshot: { type: "uniform", name: "Playera polo", code: "UNI-201", size: "M", returnable: true } },
      { id: "9002", productId: "102", locationId: "1", qty: 1, returned: 0, lost: 0, snapshot: { type: "asset", name: "Terminal punto de venta", code: "ACT-102", serial: "SN-1027781", returnable: true } },
    ],
  }],
  movements: [], maintenance: [], kits: [], requests: [], employeeId: null,
};
GRUPOS.activos = async () => {
  const extra = ({ p, local }) => (local && p.startsWith("/internal/control-activos/mis-recursos") ? json({ state: { ...ESTADO_ACTIVOS, employeeId: "15", employees: [ESTADO_ACTIVOS.employees[0]] } })
    : local && p.startsWith("/internal/control-activos") ? json({ state: ESTADO_ACTIVOS }) : null);
  await escena("activos panel", async () => {
    const { ctx, page } = await abrir({ extra });
    await page.goto(base + "/panel/activos?empresa=7", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Activos y uniformes" }).waitFor({ timeout: 30000 });
    await dormir(800);
    await guardar(page, "activos", "inicio");
    await page.goto(base + "/panel/activos/inventario?tipo=activos&empresa=7", { waitUntil: "domcontentloaded" });
    await page.getByText("Laptop Dell Latitude 5420").first().waitFor({ timeout: 30000 });
    await guardar(page, "activos", "inventario");
    await page.goto(base + "/panel/activos/inventario/nuevo?tipo=uniformes&empresa=7", { waitUntil: "domcontentloaded" });
    await page.getByText("Datos del artículo").first().waitFor({ timeout: 30000 });
    await guardar(page, "activos", "registrar-articulo");
    await page.goto(base + "/panel/activos/inventario/102?empresa=7", { waitUntil: "domcontentloaded" });
    await page.getByText("Ficha del artículo").first().waitFor({ timeout: 30000 });
    await guardar(page, "activos", "ficha-del-articulo");
    await page.goto(base + "/panel/activos/personas?empresa=7", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Personas" }).waitFor({ timeout: 30000 });
    await guardar(page, "activos", "personas");
    await page.goto(base + "/panel/activos/personas/15?empresa=7", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Ana Torres Ruiz" }).waitFor({ timeout: 30000 });
    await guardar(page, "activos", "persona-detalle");
    await page.goto(base + "/panel/activos/entregar?empleado=15&empresa=7", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Nueva entrega" }).waitFor({ timeout: 30000 });
    await page.getByRole("button", { name: "Agregar", exact: true }).click().catch(() => {});
    await dormir(400);
    await guardar(page, "activos", "nueva-entrega");
    await page.goto(base + "/panel/activos/recibir?empresa=7", { waitUntil: "domcontentloaded" });
    await dormir(1500);
    await guardar(page, "activos", "recibir-devolucion");
    await page.goto(base + "/panel/activos/resguardos/501?empresa=7", { waitUntil: "domcontentloaded" });
    await page.getByText("Resguardo de activos y uniformes").first().waitFor({ timeout: 30000 });
    await guardar(page, "activos", "resguardo");
    await page.goto(base + "/panel/activos/ajustes/categorias?tipo=activos&empresa=7", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Categorías de activos" }).waitFor({ timeout: 30000 });
    await guardar(page, "activos", "ajustes-categorias");
    await page.goto(base + "/panel/activos/ajustes/paquetes?empresa=7", { waitUntil: "domcontentloaded" });
    await dormir(1500);
    await guardar(page, "activos", "ajustes-paquetes");
    await page.goto(base + "/panel/activos/revision?empresa=7", { waitUntil: "domcontentloaded" });
    await dormir(1500);
    await guardar(page, "activos", "revision-y-mantenimiento");
    await ctx.close();
  });
  await escena("activos celular", async () => {
    const { ctx, page } = await abrir({ usuario: ANA_USUARIO, viewport: CELULAR, extra });
    await page.goto(base + "/empleado/panel/mis-recursos?empresa=7", { waitUntil: "domcontentloaded" });
    await page.getByText("Mis resguardos").first().waitFor({ timeout: 30000 });
    await guardar(page, "activos", "mis-activos-y-uniformes");
    await ctx.close();
  });
};

// ===== Tareas y checklists =====
const PERSONAS_T = [
  { id: 15, nombre: "Ana Torres", puesto: "Cajera", id_puesto: 1, sucursal: "Matriz", departamento: "Ventas", id_jefe_inmediato: 16, hoy: "en_jornada" },
  { id: 17, nombre: "Diego Paz", puesto: "Auxiliar de sistemas", id_puesto: 3, sucursal: "Norte", departamento: "Sistemas", id_jefe_inmediato: 16, hoy: "salio" },
  { id: 18, nombre: "Frida Serrano", puesto: "Vendedora", id_puesto: 4, sucursal: "Matriz", departamento: "Ventas", id_jefe_inmediato: 16, hoy: "sin_checar" },
  { id: 19, nombre: "José Ramírez", puesto: "Almacenista", id_puesto: 5, sucursal: "Matriz", departamento: "Operación", id_jefe_inmediato: 16, hoy: "en_jornada" },
];
const paso = (id, texto, hecho) => ({ id, texto, hecho: hecho ? 1 : 0 });
const TAREAS_T = [
  { id: 1, titulo: "Revisar extintores", id_proyecto: 1, id_responsable: 19, prioridad: "alta", estado: "en_proceso", fecha_limite: dia(1), pide_foto: 1, version: 1, pasos: [paso(1, "Ver fecha de carga", true), paso(2, "Firmar bitácora", false)], comentarios: [], fotos: [], historial: [] },
  { id: 2, titulo: "Decorar el comedor", id_proyecto: null, id_responsable: 15, prioridad: "media", estado: "por_hacer", fecha_limite: dia(3), pide_foto: 0, version: 1, pasos: [], comentarios: [], fotos: [], historial: [] },
  { id: 3, titulo: "Inventario de playeras", id_proyecto: 1, id_responsable: 18, prioridad: "media", estado: "revision", fecha_limite: HOY, pide_foto: 1, version: 1, pasos: [paso(3, "Contar tallas", true), paso(4, "Subir foto del anaquel", true)], comentarios: [{ de: "Frida Serrano", texto: "Listo, faltan 3 playeras M." }], fotos: [], historial: [] },
  { id: 4, titulo: "Configurar terminal de cobro", id_proyecto: 1, id_responsable: 17, prioridad: "alta", estado: "hecho", fecha_limite: dia(-2), pide_foto: 0, version: 1, pasos: [paso(5, "Instalar", true)], comentarios: [], fotos: [], historial: [] },
  { id: 5, titulo: "Limpiar bodega", id_proyecto: null, id_responsable: 19, prioridad: "baja", estado: "por_hacer", fecha_limite: dia(-1), pide_foto: 0, version: 1, pasos: [], comentarios: [], fotos: [], historial: [] },
];
const PREG = (id, texto, tipo, o = {}) => ({ id, texto, tipo, peso: 1, obligatoria: 1, permite_na: 0, pide_foto: 0, correcta: tipo === "si_no" ? "si" : null, opciones: [], ...o });
const CHECKLISTS_T = [
  { id: 1, nombre: "Apertura de sucursal", version: 1, frecuencia: "diario", dias_semana: "", hora_limite: "09:30", revisa: "jefe_inmediato", solo_si_checo: 1,
    asignaciones: [{ tipo: "puesto", id_puesto: 1 }],
    preguntas: [PREG(1, "¿Se abrió la cortina a tiempo?", "si_no"), PREG(2, "¿Cómo está el área de cajas?", "opcion", { pide_foto: 1, opciones: [{ id: 1, texto: "Limpia", valor: 100 }, { id: 2, texto: "Regular", valor: 50 }, { id: 3, texto: "Sucia", valor: 0 }] }), PREG(3, "Temperatura del refrigerador", "numero", { minimo: 1, maximo: 5, unidad: "°C" }), PREG(4, "Firma de quien abre", "firma")] },
  { id: 2, nombre: "Cierre de caja", version: 1, frecuencia: "semanal", dias_semana: "1,3,5", hora_limite: "21:00", revisa: "rh", solo_si_checo: 1, asignaciones: [{ tipo: "puesto", id_puesto: 1 }], preguntas: [PREG(5, "¿Cuadró el corte?", "si_no")] },
];
const ENVIO_REVISAR = { id: 70, id_checklist: 1, id_empleado: 15, checklist: "Apertura de sucursal", persona: "Ana Torres", fecha: HOY, a_tiempo: 1, calificacion: 83, estado: "por_revisar" };
ruta("GET", /^\/checador\/tareas\/modulo$/, () => json({ activo: true, puede_activar: true, derecho: true }));
ruta("GET", /^\/checador\/tareas\/panel$/, () => json({ hoy: HOY, proyectos: [{ id: 1, nombre: "Apertura sucursal Norte", descripcion: "Todo lo necesario para abrir la nueva sucursal.", color: "#2563eb", id_responsable_empleado: 16, fecha_fin: dia(20) }],
  tareas: TAREAS_T, personas: PERSONAS_T, checklists: CHECKLISTS_T, puestos: [{ id: 1, nombre: "Cajera" }, { id: 3, nombre: "Auxiliar de sistemas" }, { id: 4, nombre: "Vendedora" }, { id: 5, nombre: "Almacenista" }], sucursales: ["Matriz", "Norte"], departamentos: ["Ventas", "Operación", "Sistemas"] }));
ruta("GET", /^\/checador\/tareas\/envios$/, ({ q }) => json({ envios: q.get("estado") === "por_revisar" ? [ENVIO_REVISAR] : [{ ...ENVIO_REVISAR }, { id: 71, id_checklist: 1, id_empleado: 18, estado: "pendiente", fecha: HOY }] }));
ruta("GET", /^\/checador\/tareas\/envios\/70$/, () => json({ envio: { ...ENVIO_REVISAR, version: 1, checklist_nombre: "Apertura de sucursal", calificacion_persona: 83, nota: "El refri 3 hace ruido.",
  respuestas: [
    { id_pregunta: 1, pregunta_texto: "¿Se abrió la cortina a tiempo?", tipo: "si_no", peso: 1, pregunta: CHECKLISTS_T[0].preguntas[0], respuesta: { valor: "si" } },
    { id_pregunta: 2, pregunta_texto: "¿Cómo está el área de cajas?", tipo: "opcion", peso: 1, pregunta: CHECKLISTS_T[0].preguntas[1], respuesta: { valor: 2 } },
    { id_pregunta: 3, pregunta_texto: "Temperatura del refrigerador", tipo: "numero", peso: 1, pregunta: CHECKLISTS_T[0].preguntas[2], respuesta: { valor: 4 } },
  ] } }));
ruta("GET", /^\/checador\/tareas\/cumplimiento$/, () => json({ personas: [
  { id_empleado: 15, nombre: "Ana Torres", puesto: "Cajera", sucursal: "Matriz", asignados: 12, enviados: 12, a_tiempo: 11, tarde: 1, no_enviados: 0, por_revisar: 1, promedio: 94.5 },
  { id_empleado: 18, nombre: "Frida Serrano", puesto: "Vendedora", sucursal: "Matriz", asignados: 12, enviados: 10, a_tiempo: 8, tarde: 2, no_enviados: 2, por_revisar: 0, promedio: 78 },
], fallas: [{ id_pregunta: 2, pregunta: "¿Cómo está el área de cajas?", checklist: "Apertura de sucursal", promedio: 62, veces: 22, mal: 9 }] }));
ruta("GET", /^\/checador\/tareas\/mis-tareas$/, () => json({ hoy: HOY, tareas: TAREAS_T.filter((t) => t.id_responsable === 15).concat([{ ...TAREAS_T[0], id: 6, id_responsable: 15, titulo: "Acomodar exhibidor de temporada" }]), proyectos: [{ id: 1, nombre: "Apertura sucursal Norte", color: "#2563eb" }], personas: PERSONAS_T }));
ruta("GET", /^\/checador\/tareas\/mis-checklists$/, () => json({ hoy: HOY, checklists: [{ envio: { id: 80, estado: "pendiente", fecha: HOY }, checklist: { id: 1, nombre: "Apertura de sucursal", hora_limite: "09:30", preguntas: CHECKLISTS_T[0].preguntas } }] }));

GRUPOS.tareas = async () => {
  await escena("tareas panel", async () => {
    const { ctx, page } = await abrir();
    await page.goto(base + "/panel/tareas", { waitUntil: "domcontentloaded" });
    await page.getByText("Revisar extintores").first().waitFor({ timeout: 30000 });
    await guardar(page, "tareas", "tablero");
    await page.getByRole("button", { name: "Nueva tarea" }).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.getByLabel("Qué hay que hacer").fill("Revisar extintores de la sucursal Norte");
    await guardar(page, "tareas", "nueva-tarea", { zona: dlg });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /Inventario de playeras/ }).first().click();
    await guardar(page, "tareas", "tarea-en-revision", { zona: page.getByRole("dialog") });
    await page.keyboard.press("Escape");
    await page.goto(base + "/panel/tareas/proyectos", { waitUntil: "domcontentloaded" });
    await page.getByText("Apertura sucursal Norte").first().waitFor({ timeout: 30000 });
    await guardar(page, "tareas", "proyectos");
    await page.goto(base + "/panel/checklists", { waitUntil: "domcontentloaded" });
    await page.getByText("Apertura de sucursal").first().waitFor({ timeout: 30000 });
    await guardar(page, "tareas", "checklists");
    await page.getByRole("button", { name: "Nuevo checklist" }).first().click();
    await page.getByRole("button", { name: "Empezar en blanco" }).click().catch(() => {});
    await dormir(800);
    await guardar(page, "tareas", "nuevo-checklist");
    await page.goto(base + "/panel/checklists/revisar", { waitUntil: "domcontentloaded" });
    await page.locator("[data-calificacion]").first().waitFor({ timeout: 30000 });
    await guardar(page, "tareas", "revisar-checklist");
    await page.goto(base + "/panel/checklists/cumplimiento", { waitUntil: "domcontentloaded" });
    await page.getByText("Ana Torres").first().waitFor({ timeout: 30000 });
    await guardar(page, "tareas", "cumplimiento");
    await ctx.close();
  });
  await escena("tareas celular", async () => {
    const { ctx, page } = await abrir({ usuario: ANA_USUARIO, viewport: CELULAR });
    await page.goto(base + "/empleado/panel/tareas", { waitUntil: "domcontentloaded" });
    await page.getByText("Apertura de sucursal").first().waitFor({ timeout: 30000 });
    await guardar(page, "tareas", "mis-tareas");
    await page.getByRole("button", { name: /^Apertura de sucursal/ }).click();
    await dormir(1000);
    await guardar(page, "tareas", "contestar-checklist");
    await ctx.close();
  });
};

// ===== Avisos (campana) y plantillas de felicitación ===== (datos con la forma de scripts/verify-avisos.mjs)
const msgCumple = (n) => [{ clave: "cumpleanos", etiqueta: "Cumpleaños", descripcion: "aprobada por WhatsApp", texto: `¡Feliz cumpleaños, ${n}! 🎉 Todo el equipo de Uniline te desea un gran día. Gracias por ser parte de nuestro equipo.` }];
const msgAniv = (n, a) => [{ clave: "aniversario", etiqueta: "Aniversario", descripcion: "aprobada por WhatsApp", texto: `¡Feliz aniversario, ${n}! Hoy cumples ${a} ${a === 1 ? "año" : "años"} en Uniline. Gracias por tu compromiso y por crecer con nosotros.` }];
const aviso = (o) => ({ correo: { disponible: true, visible: "a•••@correo.mx", motivo: null }, felicitado: { whatsapp: false, correo: false, correo_automatico: false }, ...o });
Object.assign(AVISOS_RH, {
  visible: true, alcance: "empresa", puede_editar_plantillas: true, empresa: { id: 7, nombre: "Uniline" }, zona_horaria: "America/Mexico_City", hoy: HOY, migracion: true,
  auto: { cumpleanos: { correo: true, hora: "9:05" }, aniversario: { correo: false, hora: "9:05" } }, total: 4, conteos: { cumpleanos: 2, aniversario: 1, contrato: 1 },
  avisos: [
    aviso({ clave: `cumpleanos-15-${ANIO}`, tipo: "cumpleanos", id_empleado: 15, nombre: "Ana Torres Ruiz", nombre_corto: "Ana", area: "Ventas", fecha: HOY, dias: 0, grupo: "hoy", anio: ANIO, edad: 36, whatsapp: { telefono: "523312345678", visible: "+52 33 •••• 5678", motivo: null, mensajes: msgCumple("Ana") } }),
    aviso({ clave: `aniversario-16-${ANIO}`, tipo: "aniversario", id_empleado: 16, nombre: "Carlos Andrey Luna", nombre_corto: "Carlos", area: "Operación", fecha: dia(1), dias: 1, grupo: "manana", anio: ANIO, anios: 3, whatsapp: { telefono: null, visible: null, motivo: "No tiene teléfono registrado en su ficha.", mensajes: msgAniv("Carlos", 3) }, correo: { disponible: false, visible: null, motivo: "No tiene correo de notificaciones en su ficha." } }),
    { clave: "contrato-41", tipo: "contrato", id_contrato: 41, id_empleado: 18, nombre: "Frida Serrano Gil", area: "Ventas", fecha: dia(1), dias: 1, grupo: "manana", tipo_contrato: "Determinado" },
    aviso({ clave: `cumpleanos-17-${ANIO}`, tipo: "cumpleanos", id_empleado: 17, nombre: "Diego Paz Herrera", nombre_corto: "Diego", area: "Sistemas", fecha: dia(4), dias: 4, grupo: "semana", anio: ANIO, edad: 29, whatsapp: { telefono: "523398765432", visible: "+52 33 •••• 5432", motivo: null, mensajes: msgCumple("Diego") } }),
  ],
});
const PLANT_CUMPLE = { tipo: "cumpleanos", personalizada: false, diseno: "festivo", asunto: "¡Feliz cumpleaños, {nombre}!", mensaje: "Todo el equipo de {empresa} te desea un gran día. Gracias por tu entrega en {área}; que este año te traiga mucho de lo que buscas.\n\n¡Disfrútalo!", envio_correo_auto: true, aviso_campana: true, envio_whatsapp_auto: false, revision: 0, actualizado_por: null, actualizado_en: null, regla_activa: true };
ruta("GET", /^\/checador\/avisos\/plantillas$/, () => json({
  ok: true, migracion: true, empresa: { id: 7, nombre: "Uniline" }, hora_envio: "9:05", variables: ["nombre", "edad", "años", "área", "empresa", "jefe"], disenos: ["festivo", "elegante", "sencillo"], limites: { asunto: 150, mensaje: 2000 },
  ejemplo: { nombre: "Ana", nombreCompleto: "Ana Torres", empresa: "Uniline" },
  plantillas: [PLANT_CUMPLE, { ...PLANT_CUMPLE, tipo: "aniversario", diseno: "elegante", asunto: "¡Feliz aniversario, {nombre}!", mensaje: "Hoy cumples {años} con nosotros en {empresa}. ¡Gracias por crecer con nosotros!", regla_activa: false }],
  whatsapp: { version: "2026-11-25.2", nota: "Texto aprobado por WhatsApp; no se puede cambiar.", automatico: { configurado: true, motivo: null },
    plantillas: [...msgCumple("Ana").map((m) => ({ ...m, tipo: "cumpleanos" })), ...msgAniv("Ana", 3).map((m) => ({ ...m, tipo: "aniversario" }))] },
}));
const CORREO_HTML = "<!doctype html><html><body style=\"margin:0;font-family:sans-serif;background:#f3f4f6\"><div style=\"max-width:600px;margin:24px auto;background:#fff;border-radius:14px;padding:24px\"><div style=\"background:#1D5CF5;color:#fff;border-radius:12px;padding:24px\"><p style=\"margin:0;font-size:12px\">UNILINE</p><p style=\"margin:4px 0 0;font-size:24px;font-weight:800\">¡Feliz cumpleaños, Ana!</p></div><p>Todo el equipo de Uniline te desea un gran día. Gracias por tu entrega en Ventas.</p><p>¡Disfrútalo!</p></div></body></html>";
ruta("POST", /^\/checador\/avisos\/(plantillas|felicitaciones)\/vista-previa$/, () => json({ ok: true, asunto: "¡Feliz cumpleaños, Ana!", html: CORREO_HTML, para: "a•••@correo.mx", plantilla: "sistema" }));

GRUPOS.avisos = async () => {
  await escena("avisos", async () => {
    const { ctx, page } = await abrir();
    await page.goto(base + "/panel/empleados", { waitUntil: "domcontentloaded" });
    await page.getByText("Lista de empleados").waitFor({ timeout: 30000 });
    await page.locator("[data-campana-avisos] button").first().click().catch(async () => { await page.getByRole("button", { name: /Avisos de los próximos 7 días/ }).click(); });
    await page.getByText("Ana Torres Ruiz").last().waitFor({ timeout: 15000 });
    await guardar(page, "avisos", "campana-de-avisos", { zona: { x: 700, y: 0, width: 740, height: 760 } });
    await page.getByRole("button", { name: "Felicitar a Ana Torres Ruiz" }).click();
    await dormir(1200);
    await guardar(page, "avisos", "felicitar", { zona: page.getByRole("dialog") });
    await page.keyboard.press("Escape");
    await page.goto(base + "/panel/plantillas-felicitacion", { waitUntil: "domcontentloaded" });
    await page.getByText("Plantillas de felicitación").first().waitFor({ timeout: 30000 });
    await dormir(1200);
    await guardar(page, "avisos", "plantillas-de-felicitacion");
    await page.getByText("Envío y avisos").first().scrollIntoViewIfNeeded();
    await guardar(page, "avisos", "plantillas-envio-y-avisos");
    await ctx.close();
  });
};

// ───────── ejecución ─────────
const pedidos = process.argv.slice(2);
const grupos = pedidos.length ? pedidos : Object.keys(GRUPOS);
let codigo = 0;
try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 200) throw new Error("Next no arrancó"); await dormir(150); }
  browser = await chromium.launch({ args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
  for (const g of grupos) {
    if (!GRUPOS[g]) { console.warn(`Grupo desconocido: ${g}`); codigo = 1; continue; }
    console.log(`— ${g}`);
    await GRUPOS[g]();
  }
} finally {
  await browser?.close();
  next.kill();
}
console.log(`\nCapturas (${hechas.length}):\n  ${hechas.join("\n  ")}`);
if (fallidas.length) { console.log(`\nNo se pudieron tomar (${fallidas.length}):\n  ${fallidas.join("\n  ")}`); codigo = 1; }
process.exitCode = codigo;
