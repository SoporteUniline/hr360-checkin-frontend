// Verificación en navegador de la LETRA de ADAMIA (28/11/2026, el dueño aprobó «v3 con Plus Jakarta Sans en todo
// ADAMIA»; docs/sistema-diseno.md). Plus Jakarta Sans es un poco más ancha que Inter: aquí se revisa que no corte
// textos ni desborde en las pantallas principales, con el backend SIMULADO y datos de demostración.
//   Pantallas: listas con EncabezadoPagina (Permisos, Empleados, Contratos), Nómina, y la app del empleado (Inicio y
//   Reloj). Anchos: 1920, 1366 y 390 px.
//   Revisa: 1) la letra que se ve es Plus Jakarta Sans (document.fonts y getComputedStyle del body);
//           2) sin desborde horizontal de la página;
//           3) sin textos recortados: un elemento con texto cuyo contenido no cabe (scrollWidth > clientWidth) y que
//              esconde lo que sobra (overflow distinto de visible). Los `truncate` hechos a propósito (con title o
//              aria-label que dice el texto completo) no cuentan, ni el texto solo para lectores de pantalla (sr-only).
//              Los recortes que YA había con Inter (medidos el 28/11/2026 con ETAPA=antes, iguales con la letra nueva)
//              están en CONOCIDOS: no los causó la letra; si aparece uno nuevo, falla.
// Uso (después de «NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build»):
//   CAPTURAS=/ruta PLAYWRIGHT_MODULE_PATH=/opt/node22/lib/node_modules/playwright node scripts/verify-letra.mjs
//   ETAPA=antes → solo toma las capturas y anota lo que encuentra (sirve para comparar con la letra anterior).
import assert from "node:assert/strict";
import { chromium, contexto, dormir, levantarNext } from "./capturas-ayuda/comun.mjs";

const OUT = process.env.CAPTURAS || null;
const SOLO_CAPTURAS = process.env.ETAPA === "antes";
const PREFIJO = SOLO_CAPTURAS ? "antes" : "despues";

const ZONA = "America/Mexico_City";
const EMPRESA = { id_empresa: 7, nombre: "Comercializadora Demo", estado: "Activo", zona_horaria: ZONA };
const RH = { id_usuario: 1, tipo_usuario: "Recruiter", nombre: "Usuario", apellido_paterno: "Demo", correo: "rh@demo.mx", id_empresa: 7, id_empleado: 16,
  empresas: [7], empresas_detalle: [EMPRESA], zona_horaria: ZONA };
const EMPLEADO = { id_usuario: 15, id_empleado: 15, esEmpleado: true, tipo_usuario: "Empleado", id_empresa: 7, nombre: "Persona Uno", correo: "uno@demo.mx",
  empresas: [7], empresas_detalle: [EMPRESA], zona_horaria: ZONA };
const PERSONAS = [
  { id_empleado: 15, id_empresa: 7, nombre: "Persona", apellido_paterno: "Uno", apellido_materno: "Demostración", puesto: "Encargada de sucursal", departamento: "Ventas y atención a clientes", fecha_ingreso: "2024-03-01", estado: "Activo", correo: "persona.uno@demo.mx", telefono: "5512345678", numero_empleado: "A-0015" },
  { id_empleado: 16, id_empresa: 7, nombre: "Persona", apellido_paterno: "Dos", apellido_materno: "Demo", puesto: "Jefa de Recursos Humanos", departamento: "Recursos Humanos", fecha_ingreso: "2025-02-01", estado: "Activo", correo: "persona.dos@demo.mx", telefono: "5587654321", numero_empleado: "A-0016" },
];
const PERMISO = {
  id: 501, id_empleado: 15, id_empresa: 7, id_tipo_permiso: 3, fecha_inicio: "2026-12-07", fecha_fin: "2026-12-08", motivo: "Trámite en el banco",
  estado: "Pendiente", modalidad: "dias", id_motivo_permiso: 2, motivo_permiso: "Permiso personal", goce_sueldo: 0, empleado_nombre: "Persona Uno Demostración",
  tipo_permiso_nombre: "📝 Falta justificada", empleado_id_empresa: 7, dias_trabajo: "L,M,X,J,V", puesto: "Encargada de sucursal", departamento: "Ventas",
};
const CONTRATO = {
  id_contrato: 41, folio: "CT-0041", id_empresa: 7, id_empleado: 15, nombre_empleado: "Persona Uno Demostración", empresa: "Comercializadora Demo",
  tipo_contrato: "indefinido", fecha_inicio: "2025-01-10", fecha_fin: null, salario_base: 5250, periodicidad_pago: "Quincenal", estatus: "activo", puesto: "Encargada de sucursal",
};
const hoy = new Date().toLocaleDateString("en-CA", { timeZone: ZONA });

function manejar({ ruta, url, json }) {
  const r = ruta.replace(/^\/checador/, "");
  if (r.startsWith("/empleados/activos")) return json({ data: PERSONAS });
  if (r === "/empleados" || r.startsWith("/empleados?")) return json({ data: PERSONAS, total: PERSONAS.length, page: 1, totalPages: 1 });
  if (r.startsWith("/solicitudes-permiso")) return json({ data: [PERMISO], total: 1, estadisticas: { total: 1, pendientes: 1, aprobados: 0, rechazados: 0, cancelados: 0 } });
  if (r.startsWith("/tiposPermiso")) return json({ tiposPermiso: [], total: 0 });
  if (r.startsWith("/contratos")) return json({ data: [CONTRATO], contratos: [CONTRATO], total: 1, page: 1, totalPages: 1 });
  if (r.includes("registros-del-dia-empleado")) return json({ registrosHoy: [{ id: 1, entrada: `${hoy} 08:02:00`, salida: null, tipo_registro_nombre: "Asistencia" }], zona_horaria: ZONA, comida: null });
  if (r.includes("/comunicados/")) return json({ ok: true, portada: null, pendientes_confirmar: 0, items: [], siguiente: null, popup: null });
  if (r.includes("eventos-checada") || r.endsWith("/stream")) return json({});
  if (url.pathname.startsWith("/api/empresas/check-subscription")) return json({ hasActivePlan: true });
  return undefined;
}

// Recortes que ya existían con Inter (mismo texto y misma pantalla); no son de la letra. Se arreglan en su módulo.
const CONOCIDOS = [
  /^span «Reclutamiento y selección»/, // menú lateral: el nombre del grupo no cabe en 240 px (se corta con «…»)
  /^span «Todas las unidades de negocio»/, // filtro de Permisos: la opción larga se corta con «…» dentro del selector
  /^span «Reloj Checador»/, /^span «Configuración»/, // barra de abajo del panel en celular: 5 accesos en 390 px
  /^p «(Encargada de sucursal|Jefa de Recursos Humanos) · /, // tarjeta de Empleados en celular: puesto · área con «…»
];

const PANTALLAS = [
  { nombre: "permisos", ruta: "/panel/permisos", usuario: "rh", espera: "button[title=Editar]" },
  { nombre: "empleados", ruta: "/panel/empleados", usuario: "rh", espera: "[data-encabezado-pagina], h1" },
  { nombre: "contratos", ruta: "/panel/contratos", usuario: "rh", espera: "[data-encabezado-pagina], h1" },
  { nombre: "nomina", ruta: "/panel/nomina", usuario: "rh", espera: "h1" },
  { nombre: "empleado-inicio", ruta: "/empleado/panel/inicio", usuario: "empleado", espera: "h1, h2" },
  { nombre: "empleado-reloj", ruta: "/empleado/reloj-checador", usuario: "empleado", espera: "body" },
];

/** Letra del body, si Plus Jakarta Sans ya cargó, desborde de la página y textos recortados. */
const revisar = (page) => page.evaluate(async () => {
  await document.fonts.ready;
  const visible = (el) => { const b = el.getBoundingClientRect(); const s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
  const recortes = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el) || /^(INPUT|SELECT|TEXTAREA|svg|path|IMG|CANVAS|VIDEO)$/i.test(el.tagName)) continue;
    const tieneTexto = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!tieneTexto) continue;
    const s = getComputedStyle(el);
    const esconde = s.overflowX !== "visible" || s.textOverflow === "ellipsis";
    if (!esconde || el.clientWidth <= 2 || el.scrollWidth <= el.clientWidth + 1) continue; // ≤ 2 px: sr-only
    // Truncado a propósito: el texto completo está en title o aria-label (o en un ancestro cercano).
    const titulo = el.closest("[title], [aria-label]");
    if (titulo && (titulo.getAttribute("title") || titulo.getAttribute("aria-label") || "").trim()) continue;
    recortes.push(`${el.tagName.toLowerCase()} «${el.textContent.trim().slice(0, 50)}» (${el.scrollWidth} > ${el.clientWidth})`);
  }
  const familia = getComputedStyle(document.body).fontFamily;
  // next/font nombra la familia como la variable del código (plusJakartaSans) o «Plus Jakarta Sans».
  const cargada = [...document.fonts].some((f) => /jakarta/i.test(f.family.replace(/\s/g, "")) && f.status === "loaded");
  return { familia, cargada, recortes, doc: document.documentElement.scrollWidth, ventana: window.innerWidth };
});

const { base, firmar, cerrar } = await levantarNext();
const browser = await chromium.launch({ args: ["--lang=es-MX"] });
const resumen = [];
let ok = false;
try {
  for (const [ancho, alto] of [[1920, 1080], [1366, 768], [390, 844]]) {
    for (const quien of ["rh", "empleado"]) {
      const usuario = quien === "rh" ? RH : EMPLEADO;
      const cookie = quien === "rh" ? firmar("Recruiter", { id_usuario: 1 }) : firmar("Empleado", { id_usuario: 15 });
      const { ctx, page } = await contexto(browser, { base, ancho, alto, cookie, usuario: () => usuario, manejar });
      const errores = [];
      page.on("pageerror", (e) => errores.push(e.message));
      for (const p of PANTALLAS.filter((x) => x.usuario === quien)) {
        await page.goto(base + p.ruta, { waitUntil: "domcontentloaded" });
        await page.locator(p.espera).first().waitFor({ timeout: 60000 }).catch(() => {});
        await dormir(1800);
        if (OUT) await page.screenshot({ path: `${OUT}/${PREFIJO}-letra-${p.nombre}-${ancho}.png` });
        const r = await revisar(page);
        resumen.push({ pantalla: p.nombre, ancho, ...r });
        console.log(`${p.nombre} @${ancho}: letra «${r.familia.split(",")[0]}» · cargada ${r.cargada} · desborde ${r.doc > r.ventana + 1 ? `${r.doc} > ${r.ventana}` : "no"} · recortes ${r.recortes.length}${r.recortes.length ? `\n    - ${r.recortes.join("\n    - ")}` : ""}`);
        if (!SOLO_CAPTURAS) {
          assert.ok(r.cargada && /jakarta/i.test(r.familia.replace(/\s/g, "")), `${p.nombre} @${ancho}: la letra es Plus Jakarta Sans (${r.familia})`);
          assert.ok(r.doc <= r.ventana + 1, `${p.nombre} @${ancho}: desborde horizontal (${r.doc} > ${r.ventana})`);
          assert.deepEqual(r.recortes.filter((t) => !CONOCIDOS.some((c) => c.test(t))), [], `${p.nombre} @${ancho}: textos recortados nuevos`);
        }
      }
      assert.deepEqual(errores.filter((m) => !/ResizeObserver|hydrat/i.test(m)), [], `errores en la página (${quien} @${ancho})`);
      await ctx.close();
    }
  }
  ok = true;
} finally {
  await browser.close();
  cerrar();
}
if (!ok) process.exit(1);
console.log(`✔ Letra: ${resumen.length} pantallas revisadas${SOLO_CAPTURAS ? " (capturas «antes»)" : " sin desborde ni textos recortados, con Plus Jakarta Sans"}`);
