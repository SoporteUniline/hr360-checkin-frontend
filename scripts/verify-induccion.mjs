// Verificación en navegador de Inducción digital (27/12/2026), las 7 pantallas de la maqueta con el backend simulado:
//   0 Plantillas de inducción (lista + editor) · 1 Nuevos ingresos (tablero) · 2 Checklist del primer día (y revisión de
//   documentos) · 3 Invitación (vista del WhatsApp) · 4 Preingreso en el celular (datos y documentos) · 5 Firma y rostro
//   · 6 Ruta de bienvenida en Mi espacio.
// Escritorio (1440) y teléfono (390): sin scroll horizontal, objetivos táctiles ≥ 44 px (teléfono) y texto ≥ 13 px en lo
// nuevo; lo que se manda al servidor; cámara simulada de Chromium para la foto de evidencia.
// Uso: NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build
//      CAPTURAS=/ruta/capturas PLAYWRIGHT_MODULE_PATH=… node scripts/verify-induccion.mjs
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const REPO = process.cwd();
const OUT = process.env.CAPTURAS || null;
const API_ORIGEN = "https://api.prueba.invalid";
const require = createRequire(REPO + "/package.json");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const secret = randomUUID();
const reserva = createServer();
await new Promise((r) => reserva.listen(0, "127.0.0.1", r));
const port = reserva.address().port;
await new Promise((r) => reserva.close(r));
const base = `http://127.0.0.1:${port}`;
// INDUCCION_DEV=1: con «next dev» (para iterar sin reconstruir; el resultado que cuenta es con «next start»).
const next = spawn(process.execPath, [REPO + "/node_modules/next/dist/bin/next", process.env.INDUCCION_DEV ? "dev" : "start", "-p", String(port), "-H", "127.0.0.1"],
  { cwd: REPO, stdio: "ignore", env: { ...process.env, JWT_SECRET: secret } });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const firmar = (tipo, extra = {}) => {
  const head = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ tipo_usuario: tipo, id_usuario: -1, ...extra, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
};
const HOY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
const masDias = (n) => new Date(Date.parse(`${HOY}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const TOKEN = "TkVn4Lx0Q2b9mPq7Rs1Uv3Wx5Yz8Ab6Cd0Ef2Gh4Ij8";
const LAURA = {
  id_usuario: 1, tipo_usuario: "Recruiter", nombre: "Laura Ríos", correo: "laura@uniline.mx", id_empresa: 7, empresas: [7],
  empresas_detalle: [{ id_empresa: 7, nombre: "Uniline" }], zona_horaria: "America/Mexico_City",
};
const ANDRES = { tipo_usuario: "Empleado", id_empleado: 44, id_usuario: 44, nombre: "Andrés Gómez", id_empresa: 7, empresas: [7], empresas_detalle: [{ id_empresa: 7, nombre: "Uniline" }] };

const CATALOGO = {
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
const CONTENIDO_CAJERA = {
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
const tareasAndres = () => [
  ["Recursos Humanos", "Laura Ríos", [["Expediente completo (7 documentos)", true], ["Contrato y reglamento firmados", true], ["Alta en el IMSS", false, -1]]],
  ["Sistemas", "Diego Paz", [["Correo de la empresa", true], ["Usuario en el punto de venta", false]]],
  ["Jefe directo", "Carlos Andrey", [["Presentarlo con el equipo", true], ["Recorrido por la sucursal", true], ["Primera reunión 1 a 1 (agendada para el viernes)", false, 5]]],
  ["Almacén", "Rafa Soto", [["Uniforme talla M (2 playeras)", true, 1, "activos"]]],
].flatMap(([grupo, resp, ts], g) => ts.map(([titulo, hecha, dia = 1, liga = null], i) => ({
  id: g * 10 + i + 1, clave: `t${g}${i}`, titulo, descripcion: null, grupo, responsable_tipo: "rol", id_responsable: 50 + g, responsable_nombre: resp, dia, plazo: dia < 0 ? "1 día antes" : `Día ${dia}`,
  fecha_limite: dia < 0 ? HOY : masDias(dia - 1), liga, estado: hecha ? "hecha" : "pendiente", id_tarea: 900 + g * 10 + i,
})));

function estadoInicial() {
  return {
    pedidos: [],
    plantillas: [
      { id: 1, nombre: "Cajera", alcance: "puesto", alcance_valor: "Cajera", origen: "sugerida", version: 3, vigente: true, contenido: CONTENIDO_CAJERA, resumen: { documentos: 6, firmas: 4, ruta: 2, tareas: 5 } },
      { id: 2, nombre: "Plantilla general", alcance: "general", alcance_valor: null, origen: "sugerida", version: 1, vigente: true, contenido: CONTENIDO_CAJERA, resumen: { documentos: 6, firmas: 4, ruta: 2, tareas: 5 } },
    ],
    procesos: [
      { id: 1, nombre: "María", apellido_paterno: "Torres", iniciales: "MT", origen: "reclutamiento", puesto: "Cajera", sucursal: "Centro", fecha_ingreso: masDias(3), estado: "en_proceso", abierto: true, avance: av(true, 5, 7, false, false), siguiente: { clave: "en_proceso", texto: "Falta INE y comprobante" }, checklist: { hechas: 0, total: 5, atrasadas: 0 } },
      { id: 2, nombre: "José", apellido_paterno: "Ramírez", iniciales: "JR", origen: "manual", puesto: "Almacenista", sucursal: null, fecha_ingreso: masDias(5), estado: "por_revisar", abierto: true, avance: av(true, 7, 7, true, true, { listo_para_alta: true }), siguiente: { clave: "dar_alta", texto: "Revisar y dar de alta" }, checklist: { hechas: 1, total: 5, atrasadas: 0 } },
      { id: 3, nombre: "Lucía", apellido_paterno: "Pérez", iniciales: "LP", origen: "reclutamiento", puesto: "Auxiliar contable", sucursal: null, fecha_ingreso: masDias(10), estado: "invitado", abierto: false, avance: av(false, 0, 6, false, false), siguiente: { clave: "sin_abrir", texto: "Invitación enviada · sin abrir" }, checklist: { hechas: 0, total: 5, atrasadas: 0 } },
      { id: 4, nombre: "Andrés", apellido_paterno: "Gómez", iniciales: "AG", origen: "manual", puesto: "Vendedor", sucursal: "Centro", fecha_ingreso: HOY, estado: "alta", abierto: true, avance: av(true, 7, 7, true, true), siguiente: { clave: "alta", texto: "Dado de alta" }, checklist: { hechas: 6, total: 9, atrasadas: 1 } },
    ],
    tareas: tareasAndres(),
    jose: [
      { id: 201, clave: "ine", cara: 1, nombre: "INE (frente y vuelta) · frente", estado: "recibido" }, { id: 202, clave: "ine", cara: 2, nombre: "INE (frente y vuelta) · vuelta", estado: "recibido" },
      { id: 203, clave: "domicilio", cara: 1, nombre: "Comprobante de domicilio", estado: "recibido" },
    ],
    publico: {
      datos: { curp: "TOAM940318MDFRRR09", telefono: "5512345678" }, rostro: false,
      documentos: [
        { clave: "ine", nombre: "INE (frente y vuelta)", obligatorio: true, tipo: "archivo", caras: 2, estado: "recibido", caras_subidas: [1, 2], instrucciones: "" },
        { clave: "curp", nombre: "CURP", obligatorio: true, tipo: "archivo", caras: 1, estado: "recibido", caras_subidas: [1] },
        { clave: "csf", nombre: "Constancia de situación fiscal (RFC)", obligatorio: true, tipo: "archivo", caras: 1, estado: "recibido", caras_subidas: [1] },
        { clave: "nss", nombre: "Número de seguridad social (IMSS)", obligatorio: true, tipo: "dato_o_archivo", dato: "nss", caras: 1, estado: "pendiente", caras_subidas: [], instrucciones: "Escríbelo o sube tu constancia" },
        { clave: "domicilio", nombre: "Comprobante de domicilio", obligatorio: true, tipo: "archivo", caras: 1, estado: "rechazado", motivo: "Tiene más de 3 meses", caras_subidas: [], antiguedad_meses: 3 },
        { clave: "clabe", nombre: "Cuenta para tu pago (CLABE)", obligatorio: true, tipo: "dato_o_archivo", dato: "clabe", caras: 1, estado: "pendiente", caras_subidas: [], instrucciones: "Estado de cuenta o captura del banco" },
      ],
      firmas: CONTENIDO_CAJERA.firmas.map((f) => ({ clave: f.clave, nombre: f.nombre, obligatorio: true, firmado: false })),
      estado: "en_proceso",
    },
    ruta: {
      empresa: "Uniline", nombre: "Andrés", puesto: "Vendedor", jefe: "Carlos Andrey", rh: "Laura Ríos", fecha_ingreso: HOY, listos: 2, total: 5,
      pasos: [
        { id: "quienes", tipo: "contenido", titulo: "Quiénes somos", descripcion: "Misión, valores e historia", duracion_min: 3, visto: true, disponible: true, texto: "Somos Uniline." },
        { id: "equipo", tipo: "equipo", titulo: "Tu equipo", descripcion: "Tu jefe Carlos y tus compañeros de Centro", visto: true, disponible: true, jefe: "Carlos Andrey", companeros: ["Ana Ruiz", "Beto Paz"], sucursal: "Centro" },
        { id: "checar", tipo: "contenido", titulo: "Cómo checar y pedir permisos", descripcion: "Video de 2 min · reloj, comida y vacaciones", visto: false, disponible: true, texto: "Checa desde la app.", video_url: "https://videos.uniline.mx/checar" },
        { id: "caja", tipo: "curso", titulo: "Curso: atención en caja", descripcion: "Obligatorio para tu puesto", obligatorio: true, visto: false, disponible: true, texto: "Lee el manual.", pdf_url: "https://docs.uniline.mx/caja.pdf" },
        { id: "mes", tipo: "encuesta", titulo: "¿Cómo te fue en tu primer mes?", ciclo: "ingreso30", abre_el: masDias(30), visto: false, disponible: false },
      ],
    },
  };
}
let S = estadoInicial();
let usuario = LAURA;

function vistaPublica() {
  const p = S.publico;
  const oblig = p.documentos.filter((d) => d.obligatorio);
  const listos = oblig.filter((d) => ["recibido", "con_dato", "aprobado"].includes(d.estado)).length;
  const datosOk = ["curp", "rfc", "fecha_nacimiento", "direccion", "telefono", "contacto_emergencia", "telefono_emergencia"].every((k) => p.datos[k]);
  return {
    persona: { nombre: "María", apellido_paterno: "Torres", puesto: "Cajera", sucursal: "Centro" }, empresa: { nombre: "Uniline", logo: null },
    fecha_ingreso: masDias(3), hora_ingreso: "09:00", fecha_texto: "lunes 1 de diciembre a las 9:00 a. m.", estado: p.estado, editable: ["invitado", "en_proceso"].includes(p.estado),
    vence_en: `${masDias(14)}T06:00:00.000Z`, firmado: p.firmas.every((f) => f.firmado), datos: p.datos,
    campos: [["fecha_nacimiento", "Fecha de nacimiento", true], ["curp", "CURP", true], ["rfc", "RFC", true], ["nss", "Número de seguridad social", false], ["direccion", "Domicilio", true], ["correo", "Correo", false], ["telefono", "Teléfono", true], ["contacto_emergencia", "Contacto de emergencia", true], ["telefono_emergencia", "Teléfono de emergencia", true], ["banco", "Banco", false], ["clabe", "CLABE", false]].map(([clave, etiqueta, requerido]) => ({ clave, etiqueta, requerido })),
    documentos: p.documentos, firmas: p.firmas, rostro: { registrado: p.rostro },
    avance: { datos: datosOk, documentos: { listos, total: oblig.length }, firma: p.firmas.every((f) => f.firmado), rostro: p.rostro, completo: false, rechazados: p.documentos.filter((d) => d.estado === "rechazado").map((d) => ({ clave: d.clave, nombre: d.nombre, motivo: d.motivo })) },
  };
}

function detalle(id) {
  const fila = S.procesos.find((p) => p.id === id);
  const base = { ...fila, id_jefe: 60, jefe: "Carlos Andrey", telefono: "5512345678", correo: "x@x.mx", plantilla_nombre: fila.puesto === "Vendedor" ? "Vendedor" : "Plantilla general", plantilla_version: 1, vence_en: `${masDias(14)}T06:00:00.000Z`, eventos: [], ruta: { total: 5, listos: 2 } };
  if (id === 4) return { ...base, hora_ingreso: "08:58", datos: null, requeridos: [], documentos: [], firmas: [{ clave: "doc11", nombre: "Contrato", obligatorio: true, firmado_en: "x" }], tareas: S.tareas };
  return {
    ...base, hora_ingreso: "09:00", datos: { curp: "RAJO900101HDFMSS08", rfc: "RAJO900101AB1", direccion: "Calle 1, Centro, CDMX 06000", telefono: "5511112222", clabe: "002010077777777771", banco: "BBVA" },
    requeridos: [{ clave: "ine", nombre: "INE (frente y vuelta)", obligatorio: true, caras: 2, con_dato: false }, { clave: "domicilio", nombre: "Comprobante de domicilio", obligatorio: true, caras: 1, antiguedad_meses: 3, con_dato: false }, { clave: "nss", nombre: "Número de seguridad social (IMSS)", obligatorio: true, caras: 1, con_dato: true }],
    documentos: S.jose, firmas: [{ clave: "doc11", nombre: "Contrato individual", obligatorio: true, firmado_en: "x" }],
    tareas: S.tareas.slice(0, 5).map((t, i) => ({ ...t, id: 100 + i, estado: i === 0 ? "hecha" : "pendiente", id_responsable: i === 4 ? null : t.id_responsable, responsable_nombre: i === 4 ? null : t.responsable_nombre, grupo: i === 4 ? "Jefe directo" : t.grupo })),
  };
}

async function instalarMocks(ctx) {
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base && !url.pathname.startsWith("/api/")) return route.continue();
    const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" };
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(data) });
    if (url.origin === base) return json({});
    if (!["https://videos.uniline.mx", "https://docs.uniline.mx"].includes(url.origin) && url.origin !== API_ORIGEN) return route.abort();
    if (url.origin !== API_ORIGEN) return route.fulfill({ status: 200, contentType: "text/plain", body: "ok" });
    if (req.method() === "OPTIONS") return json({});
    const p = url.pathname.replace(/^\/api/, "");
    if (p === "/users/verify/token") return json({ user: usuario });
    if (!p.startsWith("/checador/induccion")) return json({});
    const ruta = p.slice("/checador/induccion".length);
    let cuerpo = null;
    const tipo = req.headers()["content-type"] ?? "";
    if (tipo.includes("application/json")) { try { cuerpo = JSON.parse(req.postData() ?? "null"); } catch { cuerpo = null; } }
    else if (tipo.includes("multipart")) cuerpo = { multipart: true, tamano: req.postDataBuffer()?.length ?? 0, texto: (req.postDataBuffer() ?? Buffer.alloc(0)).toString("latin1") };
    S.pedidos.push({ metodo: req.method(), ruta, params: url.search, cuerpo });
    let m;
    if (ruta === "/catalogo") return json(CATALOGO);
    if (ruta === "/plantillas" && req.method() === "GET") return json({ plantillas: S.plantillas });
    if ((m = ruta.match(/^\/plantillas\/(\d+)$/)) && req.method() === "GET") return json({ plantilla: S.plantillas.find((x) => String(x.id) === m[1]) });
    if ((m = ruta.match(/^\/plantillas\/(\d+)$/)) && req.method() === "PUT") {
      const x = S.plantillas.find((y) => String(y.id) === m[1]);
      if (cuerpo.version !== x.version) return json({ codigo: "VERSION", error: "Alguien más guardó esta plantilla mientras la editabas. Recarga para ver sus cambios." }, 409);
      Object.assign(x, { nombre: cuerpo.nombre, contenido: cuerpo.contenido, version: x.version + 1 });
      return json({ plantilla: x });
    }
    if (ruta === "/roles" && req.method() === "PUT") return json({ roles: cuerpo.roles });
    if (ruta.startsWith("/aplica")) return json({ plantilla: { id: 1, nombre: "Cajera", alcance: "puesto", alcance_valor: "Cajera" } });
    if (ruta === "/procesos" && req.method() === "GET") return json({ hoy: HOY, resumen: { preingreso: 2, por_revisar: 1, entran_semana: 2, tareas_atrasadas: 1 }, procesos: S.procesos });
    if (ruta === "/procesos" && req.method() === "POST") {
      if (!cuerpo?.nombre) return json({ codigo: "VALIDACION", error: "Revisa", campos: { nombre: "Escribe el nombre." } }, 422);
      return json({ proceso: { id: 9 }, liga: `https://adamia.mx/ingreso/${TOKEN}`, envio: { canal: "correo", estado: "respaldo" } }, 201);
    }
    if ((m = ruta.match(/^\/procesos\/(\d+)$/))) return json({ proceso: detalle(Number(m[1])) });
    if ((m = ruta.match(/^\/procesos\/(\d+)\/tareas\/(\d+)$/))) {
      const t = S.tareas.find((x) => String(x.id) === m[2]);
      if (t && typeof cuerpo.hecha === "boolean") t.estado = cuerpo.hecha ? "hecha" : "pendiente";
      return json({ ok: true });
    }
    if ((m = ruta.match(/^\/procesos\/2\/documentos\/(\d+)$/))) {
      const d = S.jose.find((x) => String(x.id) === m[1]);
      Object.assign(d, { estado: cuerpo.decision === "aprobar" ? "aprobado" : "rechazado", motivo: cuerpo.motivo ?? null });
      return json({ ok: true });
    }
    if (ruta.match(/^\/procesos\/2\/documentos\/\d+\/archivo$/)) return json({ url: "https://docs.uniline.mx/archivo-firmado", expira_en_segundos: 300 });
    if (ruta === "/procesos/2/alta") return json({ id_empleado: 88, vinculado: false, expediente: 5 }, 201);
    if (ruta === "/mi-ruta") return json({ ruta: S.ruta });
    if ((m = ruta.match(/^\/mi-ruta\/pasos\/([^/]+)\/visto$/))) {
      const x = S.ruta.pasos.find((y) => y.id === decodeURIComponent(m[1]));
      x.visto = true;
      S.ruta.listos = S.ruta.pasos.filter((y) => y.visto).length;
      return json({ ok: true });
    }
    // Liga pública
    if (ruta === `/publico/${TOKEN}`) return json(vistaPublica());
    if (ruta === `/publico/${"x".repeat(43)}`) return json({ codigo: "ENLACE_VENCIDO", error: "Esta liga ya venció. Pide a Recursos Humanos que te mande una nueva." }, 410);
    if (ruta === `/publico/${TOKEN}/datos`) { S.publico.datos = { ...S.publico.datos, ...cuerpo.datos }; for (const d of S.publico.documentos) if (d.dato && S.publico.datos[d.dato]) d.estado = "con_dato"; return json(vistaPublica()); }
    if (ruta === `/publico/${TOKEN}/documentos`) {
      const clave = cuerpo.texto.match(/name="clave"\r\n\r\n([a-z_]+)/)?.[1];
      const d = S.publico.documentos.find((x) => x.clave === clave);
      Object.assign(d, { estado: "recibido", motivo: null, caras_subidas: [1] });
      return json({ documento: { id: 1, clave, cara: 1, estado: "recibido" } }, 201);
    }
    if ((m = ruta.match(new RegExp(`^/publico/${TOKEN}/formatos/(doc\\d+)$`)))) return json({ clave: m[1], nombre: "Contrato individual", html: "<h3>Contrato individual de trabajo</h3><p>Contrato que celebran Uniline y María Torres, CURP TOAM940318MDFRRR09.</p><ul><li>Jornada de 48 horas.</li></ul><script>alert(1)</script>" });
    if (ruta === `/publico/${TOKEN}/firmar`) { for (const f of S.publico.firmas) f.firmado = true; return json({ firmadas: S.publico.firmas.map((f) => f.clave) }, 201); }
    if (ruta === `/publico/${TOKEN}/terminar`) { S.publico.estado = "por_revisar"; return json({ estado: "por_revisar" }); }
    return json({});
  });
}

async function revisar(page, selector, { movil }) {
  await dormir(400);
  const r = await page.evaluate(({ selector, movil }) => {
    const raiz = document.querySelector(selector);
    if (!raiz) return { falta: selector };
    const anchoDoc = document.documentElement.scrollWidth;
    const chicos = [];
    const letra = [];
    for (const el of raiz.querySelectorAll("button, a[href], input[type=checkbox], input[type=radio], select, input:not([type]), input[type=date], input[type=time], input[type=email], input[type=number], textarea")) {
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height || getComputedStyle(el).visibility === "hidden" || el.closest(".sr-only")) continue;
      if (el.closest("[data-slot='dialog-content'] > button.absolute")) continue; // la X del diálogo (shadcn) tiene su propio estándar
      const objetivo = el.closest("label") ?? el;
      const ob = objetivo.getBoundingClientRect();
      if (movil && ob.height < 43.5 && b.height < 43.5) chicos.push(`${el.tagName} «${(el.innerText || el.getAttribute("aria-label") || el.value || "").trim().slice(0, 30)}» ${Math.round(ob.height)}px`);
    }
    const caminante = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    while (caminante.nextNode()) {
      const n = caminante.currentNode;
      if (!n.textContent.trim() || !n.parentElement) continue;
      const estilo = getComputedStyle(n.parentElement);
      if (estilo.display === "none" || n.parentElement.closest(".sr-only, [aria-hidden=true]")) continue;
      if (parseFloat(estilo.fontSize) < 12.99) letra.push(`«${n.textContent.trim().slice(0, 30)}» ${estilo.fontSize}`);
    }
    return { anchoDoc, ventana: window.innerWidth, chicos, letra };
  }, { selector, movil });
  assert.equal(r.falta, undefined, `falta ${r.falta}`);
  assert.ok(r.anchoDoc <= r.ventana, `${selector}: scroll horizontal (${r.anchoDoc} > ${r.ventana})`);
  assert.deepEqual(r.chicos, [], `${selector}: objetivos táctiles < 44 px`);
  assert.deepEqual(r.letra, [], `${selector}: texto < 13 px`);
}

const captura = async (page, nombre, completa = true) => { if (OUT) await page.screenshot({ path: `${OUT}/${nombre}.png`, fullPage: completa }); };
const trazar = async (page, lienzo) => {
  const r = await lienzo.boundingBox();
  await page.mouse.move(r.x + r.width * 0.15, r.y + r.height * 0.6);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(r.x + r.width * (0.15 + i * 0.055), r.y + r.height * (i % 2 ? 0.35 : 0.65));
  await page.mouse.up();
};

async function contexto(browser, { ancho, alto, cookie }) {
  const movil = ancho < 1024;
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, locale: "es-MX", timezoneId: "America/Mexico_City", deviceScaleFactor: movil ? 2 : 1, hasTouch: movil, isMobile: movil, permissions: ["clipboard-read", "clipboard-write", "camera"] });
  if (cookie) await ctx.addCookies([{ name: "token", value: cookie, url: base }]);
  await instalarMocks(ctx);
  return { ctx, movil };
}

async function recorrido(browser, { ancho, alto, sufijo }) {
  S = estadoInicial();
  usuario = LAURA;
  const { ctx, movil } = await contexto(browser, { ancho, alto, cookie: firmar("Recruiter") });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));

  // ——— 0. Plantillas de inducción: lista y editor ———
  await page.goto(base + "/panel/plantillas-induccion", { waitUntil: "domcontentloaded" });
  await page.locator("[data-plantilla='1']").waitFor({ timeout: 40000 });
  assert.match(await page.locator("[data-plantilla='1']").innerText(), /Cajera[\s\S]*Puesto: Cajera[\s\S]*6 documentos · 4 a firmar · 2 pasos de bienvenida · 5 tareas/);
  await revisar(page, "[data-pantalla='plantillas-induccion']", { movil });
  await captura(page, `0a-plantillas-lista-${sufijo}`);
  await page.locator("[data-plantilla='1']").getByRole("link", { name: "Editar" }).click();
  await page.locator("[data-pantalla='editor-plantilla']").waitFor({ timeout: 30000 });
  await page.getByRole("heading", { name: "Plantilla de inducción: Cajera" }).waitFor();
  assert.match(await page.locator("[data-doc='domicilio']").innerText(), /Obligatorio · máx\. 3 meses/);
  assert.match(await page.locator("[data-doc='propio_medico']").innerText(), /Propio · Opcional · vence en 1 año/);
  assert.match(await page.locator("[data-firma='11']").innerText(), /tu formato «Contrato tiempo determinado»/);
  assert.equal(await page.locator("[data-tarea='presentar'] select[aria-label='Responsable']").inputValue(), "jefe");
  assert.equal(await page.locator("[data-tarea='imss'] select[aria-label='Cuándo']").inputValue(), "-1");
  await revisar(page, "[data-pantalla='editor-plantilla']", { movil });
  await captura(page, `0b-plantilla-editor-${sufijo}`);
  // Editar: agregar una tarea del jefe a 3 días y guardar (control de versión).
  await page.getByRole("button", { name: "Agregar tarea" }).click();
  const nueva = page.locator("[data-tarea]").last();
  await nueva.getByLabel("Tarea", { exact: true }).fill("Revisar su primera semana");
  await nueva.locator("select[aria-label='Cuándo']").selectOption("3");
  await page.getByRole("button", { name: "Guardar plantilla" }).click();
  await page.getByText("Plantilla guardada").waitFor();
  const put = S.pedidos.find((x) => x.metodo === "PUT" && x.ruta === "/plantillas/1");
  assert.equal(put.cuerpo.version, 3);
  assert.deepEqual(put.cuerpo.contenido.tareas.at(-1).responsable, { tipo: "jefe" });
  assert.equal(put.cuerpo.contenido.tareas.at(-1).dia, 3);

  // ——— 1. Nuevos ingresos (tablero) ———
  await page.goto(base + "/panel/nuevos-ingresos", { waitUntil: "domcontentloaded" });
  await page.locator("[data-proceso='1']").waitFor({ timeout: 30000 });
  assert.match(await page.locator("[data-proceso='1']").innerText(), /María Torres[\s\S]*Vino de Reclutamiento[\s\S]*Cajera · Sucursal Centro[\s\S]*✓ Datos[\s\S]*Documentos 5\/7[\s\S]*Falta INE y comprobante/);
  assert.equal(await page.locator("[data-proceso='2']").getByRole("link", { name: "Revisar y dar de alta" }).count(), 1);
  assert.match(await page.locator("[data-proceso='3']").innerText(), /Invitación enviada · sin abrir[\s\S]*Reenviar por WhatsApp/);
  assert.match(await page.locator("[data-proceso='4']").innerText(), /Ingresó hoy[\s\S]*hoy[\s\S]*checklist del primer día 6\/9[\s\S]*Ver checklist/);
  assert.equal(await page.locator("[data-kpi='tareas_atrasadas']").innerText().then((t) => t.match(/\d+/)[0]), "1");
  await revisar(page, "[data-pantalla='nuevos-ingresos']", { movil });
  await captura(page, `1-nuevos-ingresos-${sufijo}`);

  // ——— 3. Invitación manual con la vista del WhatsApp ———
  await page.getByRole("button", { name: "Invitar a un nuevo ingreso" }).click();
  const dlg = page.getByRole("dialog", { name: "Invitar a un nuevo ingreso" });
  await dlg.waitFor();
  await dlg.getByRole("button", { name: "Enviar invitación" }).click();
  assert.match(await dlg.innerText(), /Escribe el nombre\.[\s\S]*Escribe su celular/);
  assert.equal(S.pedidos.filter((x) => x.metodo === "POST" && x.ruta === "/procesos").length, 0, "no se manda inválida");
  await dlg.getByLabel("Nombre", { exact: true }).fill("María");
  await dlg.getByLabel("Apellido paterno").fill("Torres");
  await dlg.getByLabel("Celular (WhatsApp)").fill("55 1234 5678");
  await dlg.getByLabel("Puesto").fill("Cajera");
  await dlg.getByLabel("Sucursal").selectOption("Centro");
  await dlg.getByLabel("Jefe directo").selectOption("60");
  await dlg.getByLabel("Primer día").fill(masDias(3));
  await dlg.locator("[data-plantilla-aplica]").getByText("Cajera").first().waitFor();
  assert.match(await dlg.locator("[data-vista-whatsapp]").innerText(), /Hola María, Uniline registró tu ingreso como Cajera\. Tu primer día: .* a las 9:00 a\. m\., y para completar tu alta/);
  await revisar(page, "[role='dialog']", { movil });
  await captura(page, `3-invitacion-whatsapp-${sufijo}`, false);
  await dlg.getByRole("button", { name: "Enviar invitación" }).click();
  const lista = page.locator("[data-invitacion-lista]");
  await lista.waitFor();
  const post = S.pedidos.find((x) => x.metodo === "POST" && x.ruta === "/procesos");
  assert.deepEqual([post.cuerpo.empresa, post.cuerpo.nombre, post.cuerpo.id_jefe, post.cuerpo.sucursal, post.cuerpo.hora_ingreso], [7, "María", 60, "Centro", "09:00"]);
  assert.match(await lista.innerText(), /le mandamos la invitación por correo/);
  assert.equal(await lista.locator("[data-liga]").innerText(), `https://adamia.mx/ingreso/${TOKEN}`);
  await captura(page, `3b-invitacion-lista-${sufijo}`, false);
  await lista.getByRole("button", { name: "Listo" }).click();
  assert.ok(!(await page.evaluate(() => JSON.stringify(localStorage) + JSON.stringify(sessionStorage))).includes(TOKEN), "la liga no se guarda en el navegador");

  // ——— 2. Checklist del primer día (Andrés, ya dado de alta) ———
  await page.goto(base + "/panel/nuevos-ingresos/4", { waitUntil: "domcontentloaded" });
  await page.locator("[data-pantalla='detalle-ingreso']").waitFor({ timeout: 30000 });
  await page.getByRole("heading", { name: "Andrés Gómez · primer día" }).waitFor();
  assert.match(await page.locator("[data-checklist-cuenta]").innerText(), /6 de 9 listas/);
  for (const g of ["Recursos Humanos", "Sistemas", "Jefe directo", "Almacén"]) assert.equal(await page.getByRole("region", { name: g }).count(), 1, g);
  assert.match(await page.getByRole("region", { name: "Almacén" }).innerText(), /Se conecta con Activos y uniformes/);
  await page.getByLabel(/Usuario en el punto de venta/).check();
  await page.locator("[data-checklist-cuenta]").getByText("7 de 9 listas").waitFor();
  assert.ok(S.pedidos.some((x) => x.metodo === "PUT" && x.ruta === "/procesos/4/tareas/12" && x.cuerpo.hecha === true));
  await revisar(page, "[data-pantalla='detalle-ingreso']", { movil });
  await captura(page, `2-checklist-primer-dia-${sufijo}`);

  // ——— Revisión de documentos (José, por revisar): rechazar con motivo, aprobar ———
  await page.goto(base + "/panel/nuevos-ingresos/2", { waitUntil: "domcontentloaded" });
  await page.locator("[data-documento='203']").waitFor({ timeout: 30000 });
  await page.locator("[data-documento='203']").getByRole("button", { name: "Rechazar" }).click();
  const rech = page.getByRole("dialog", { name: /Rechazar/ });
  await rech.getByRole("button", { name: "Rechazar" }).click();
  await rech.getByText("Escribe qué debe corregir.").waitFor();
  await rech.getByLabel("¿Qué debe corregir?").fill("Tiene más de 3 meses; sube uno reciente.");
  await rech.getByRole("button", { name: "Rechazar" }).click();
  await rech.waitFor({ state: "detached" });
  assert.ok(S.pedidos.some((x) => x.ruta === "/procesos/2/documentos/203" && x.cuerpo.decision === "rechazar" && /3 meses/.test(x.cuerpo.motivo)));
  await page.locator("[data-documento='201']").getByRole("button", { name: "Aprobar" }).click();
  await page.locator("[data-documento='201']").getByText("Aprobado").waitFor();
  assert.match(await page.locator("[data-documento='203']").innerText(), /Rechazado[\s\S]*Motivo: Tiene más de 3 meses/);
  assert.equal(await page.locator("[data-requerido='nss']").getByText("Lo escribió en sus datos").count(), 1);
  assert.ok(await page.locator("[data-dar-alta]").isEnabled());
  await revisar(page, "[data-pantalla='detalle-ingreso']", { movil });
  await captura(page, `2b-revision-documentos-${sufijo}`);
  await page.locator("[data-dar-alta]").click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Dar de alta" }).click();
  await page.getByText("quedó dado de alta como empleado").waitFor();
  await ctx.close();

  // ——— 4 y 5. Liga pública en el celular (sin sesión) ———
  const pub = await contexto(browser, { ancho, alto });
  const pp = await pub.ctx.newPage();
  pp.on("pageerror", (e) => errores.push(e.message));
  await pp.goto(base + `/ingreso/${"x".repeat(43)}`, { waitUntil: "domcontentloaded" });
  await pp.getByRole("heading", { name: "Esta liga ya venció" }).waitFor({ timeout: 30000 });
  await pp.goto(base + `/ingreso/${TOKEN}`, { waitUntil: "domcontentloaded" });
  await pp.getByRole("heading", { name: "Hola María, completa tu ingreso" }).waitFor({ timeout: 30000 });
  assert.ok(await pp.locator("[data-paso='datos']").isVisible(), "empieza donde se quedó: datos incompletos");
  assert.match(await pp.getByRole("alert").first().innerText(), /te pide corregir: Comprobante de domicilio \(Tiene más de 3 meses\)/);
  await pp.getByLabel("RFC").fill("BEBA940318AB1");
  await pp.getByLabel("RFC").blur();
  await pp.getByText("El RFC no coincide con tu CURP").waitFor();
  await pp.getByLabel("RFC").fill("TOAM940318AB1");
  await pp.getByLabel("Fecha de nacimiento").fill("1994-03-18");
  await pp.getByLabel("Domicilio").fill("Av. Juárez 120, Centro, Guadalajara, 44100");
  await pp.getByLabel("Contacto de emergencia").fill("Rosa Torres");
  await pp.getByLabel("Teléfono de emergencia").fill("5587654321");
  await revisar(pp, "main", { movil });
  await captura(pp, `4a-preingreso-datos-${sufijo}`);
  await pp.getByRole("button", { name: "Continuar" }).click();
  await pp.locator("[data-paso='documentos']").waitFor();
  const datosPut = S.pedidos.filter((x) => x.ruta === `/publico/${TOKEN}/datos`).at(-1);
  assert.equal(datosPut.cuerpo.datos.rfc, "TOAM940318AB1");
  assert.match(await pp.locator("[data-documento='domicilio']").innerText(), /Corrige: Tiene más de 3 meses/);
  await revisar(pp, "main", { movil });
  await captura(pp, `4b-preingreso-documentos-${sufijo}`);
  // Subir el comprobante (foto) y escribir el NSS.
  await pp.locator("[data-entrada-camara='domicilio-1']").setInputFiles({ name: "agua.jpg", mimeType: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]) });
  await pp.locator("[data-documento='domicilio'][data-estado='recibido']").waitFor();
  const subida = S.pedidos.find((x) => x.ruta === `/publico/${TOKEN}/documentos`);
  assert.match(subida.cuerpo.texto, /name="clave"\r\n\r\ndomicilio/);
  await pp.locator("[data-documento='nss']").getByRole("button", { name: "Escribir el número" }).click();
  await pp.getByLabel("Número de seguridad social (11 dígitos)").fill("12345678901");
  await pp.locator("[data-documento='nss']").getByRole("button", { name: "Guardar" }).click();
  await pp.locator("[data-documento='nss'][data-estado='con_dato']").waitFor();
  await pp.locator("[data-documento='clabe']").getByRole("button", { name: "Escribir el número" }).click();
  await pp.getByLabel("CLABE (18 dígitos)").fill("002010077777777771");
  await pp.locator("[data-documento='clabe']").getByRole("button", { name: "Guardar" }).click();
  await pp.locator("[data-documento='clabe'][data-estado='con_dato']").waitFor();
  assert.match(await pp.locator("[data-cuenta-documentos]").innerText(), /6 de 6 listos/);
  await pp.getByRole("button", { name: "Continuar" }).click();

  // Firma: leer (HTML saneado), aceptar, dibujar; el rostro con su aviso.
  await pp.locator("[data-paso='firma']").waitFor();
  await pp.locator("[data-firma='doc11']").getByRole("button", { name: "Leer" }).click();
  const leer = pp.getByRole("dialog", { name: "Contrato individual" });
  await leer.locator("[data-formato='doc11']").getByText("Contrato que celebran Uniline y María Torres").waitFor();
  assert.equal(await leer.locator("script").count(), 0, "el formato se muestra saneado");
  await revisar(pp, "[role='dialog']", { movil });
  await captura(pp, `5a-leer-formato-${sufijo}`, false);
  await leer.getByRole("button", { name: "Ya lo leí" }).click();
  for (const c of ["doc12", "doc13", "doc14"]) await pp.locator(`[data-firma='${c}'] input[type=checkbox]`).check();
  await pp.locator("[data-rostro='pendiente']").getByRole("button", { name: "Registrar" }).click();
  await pp.getByText("Tu consentimiento para usar tu rostro").waitFor();
  assert.ok(await pp.getByRole("button", { name: "Continuar a la cámara" }).isDisabled(), "sin aceptar el aviso no hay cámara");
  await revisar(pp, "main", { movil });
  await captura(pp, `5b-firma-y-rostro-${sufijo}`);
  // (El rostro se toma con face-api y la cámara real; aquí se simula que ya lo registró y se recarga.)
  S.publico.rostro = true;
  await pp.reload({ waitUntil: "domcontentloaded" });
  await pp.getByRole("button", { name: "Firma y rostro" }).click();
  await pp.locator("[data-rostro='listo']").waitFor({ timeout: 30000 });
  for (const c of ["doc11", "doc12", "doc13", "doc14"]) await pp.locator(`[data-firma='${c}'] input[type=checkbox]`).check();
  await pp.getByRole("button", { name: "Firmar y terminar" }).click();
  await pp.getByText("Dibuja tu firma.").waitFor();
  if (movil) {
    await pp.getByRole("button", { name: "Dibujar mi firma" }).click();
    const pantalla = pp.locator("[data-firma-pantalla]");
    await pantalla.waitFor();
    await trazar(pp, pantalla.locator("canvas"));
    await pantalla.getByRole("button", { name: "Usar esta firma" }).click();
  } else {
    await trazar(pp, pp.locator("[data-firma-grande='pagina'] canvas"));
    await pp.getByRole("button", { name: "Usar esta firma" }).click();
  }
  await pp.locator("[data-firma-lista]").waitFor();
  await pp.getByRole("button", { name: "Firmar y terminar" }).click();
  const foto = pp.getByRole("dialog", { name: "Foto de evidencia" });
  await foto.waitFor();
  await dormir(1200); // la cámara simulada de Chromium arranca
  await captura(pp, `5c-foto-evidencia-${sufijo}`, false);
  await foto.getByRole("button", { name: "Tomar foto y firmar" }).click();
  await pp.getByRole("heading", { name: "¡Listo! Ya enviaste todo" }).waitFor({ timeout: 20000 });
  const firma = S.pedidos.find((x) => x.ruta === `/publico/${TOKEN}/firmar`);
  assert.match(firma.cuerpo.texto, /name="claves"\r\n\r\n\["doc11","doc12","doc13","doc14"\]/);
  assert.match(firma.cuerpo.texto, /name="firma"; filename="firma\.png"\r\nContent-Type: image\/png/);
  assert.match(firma.cuerpo.texto, /name="evidencia"; filename="evidencia\.jpg"\r\nContent-Type: image\/jpeg/);
  assert.ok(S.pedidos.some((x) => x.ruta === `/publico/${TOKEN}/terminar`));
  assert.ok(S.pedidos.filter((x) => x.ruta.startsWith("/publico")).every((x) => !x.headers?.authorization), "sin sesión");
  await revisar(pp, "main", { movil });
  await captura(pp, `5d-enviado-${sufijo}`);
  await pub.ctx.close();

  // ——— 6. Ruta de bienvenida en Mi espacio ———
  usuario = ANDRES;
  const emp = await contexto(browser, { ancho, alto, cookie: firmar("Empleado", { id_empleado: 44, id_empresa: 7, empresas: [7] }) });
  const pe = await emp.ctx.newPage();
  pe.on("pageerror", (e) => errores.push(e.message));
  await pe.goto(base + "/empleado/panel/bienvenida", { waitUntil: "domcontentloaded" });
  await pe.locator("[data-pantalla='ruta-bienvenida'] h1").waitFor({ timeout: 30000 });
  assert.match(await pe.locator("h1").innerText(), /¡Te damos la bienvenida a Uniline, Andrés!/);
  assert.match(await pe.locator("[data-ruta-cuenta]").innerText(), /2 de 5 listos/);
  assert.match(await pe.locator("[data-paso='mes']").innerText(), /se abre el/);
  assert.match(await pe.getByText("¿Dudas?").locator("..").innerText(), /Pregúntale a Carlos \(tu jefe\) o a Laura de Recursos Humanos/);
  await revisar(pe, "[data-pantalla='ruta-bienvenida']", { movil });
  await captura(pe, `6a-ruta-bienvenida-${sufijo}`);
  await pe.locator("[data-paso='checar']").getByRole("button", { name: "Ver" }).click();
  assert.equal(await pe.locator("[data-paso='checar']").getByRole("link", { name: /Ver video/ }).getAttribute("href"), "https://videos.uniline.mx/checar");
  await captura(pe, `6b-ruta-paso-abierto-${sufijo}`);
  await pe.locator("[data-paso='checar']").getByRole("button", { name: "Marcar como visto" }).click();
  await pe.locator("[data-ruta-cuenta]").getByText("3 de 5 listos").waitFor();
  await emp.ctx.close();

  assert.deepEqual(errores.filter((e) => !/ResizeObserver|face-api|tfjs/i.test(e)), [], `errores de la página: ${errores.join(" | ")}`);
}

try {
  for (let i = 0; i < 90; i++) {
    try { if ((await fetch(base + "/login")).status < 500) break; } catch { /* aún no */ }
    await dormir(500);
  }
  const browser = await chromium.launch({ args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
  await recorrido(browser, { ancho: 1440, alto: 900, sufijo: "1440" });
  console.log("✔ escritorio 1440");
  await recorrido(browser, { ancho: 390, alto: 844, sufijo: "390" });
  console.log("✔ teléfono 390");
  await browser.close();
  console.log("verify-induccion: todo bien");
} finally {
  next.kill("SIGTERM");
}
