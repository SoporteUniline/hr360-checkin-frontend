// Formato homologado de los PDF de ADAMIA (23/11/2026): nombre de archivo sin
// datos personales y, en cada página, logotipo ADAMIA y «Generado con ADAMIA ·
// fecha · Página X de Y». Genera los PDF reales con jsPDF en Node.
// Uso: node --test scripts/test-pdf-marca.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";

register(new URL("./lib/alias-src.mjs", import.meta.url));

const { jsPDF } = await import("jspdf");
const { autoTable } = await import("jspdf-autotable");
const dayjs = (await import("dayjs")).default;
const { nombreArchivoPdf, limpiarParte, fechaArchivo, numeroEmpleadoArchivo } = await import("../src/lib/nombreArchivo.mjs");
const { dibujarPieAdamia, dibujarEncabezadoAdamia, fechaHoraGeneracion, mm } = await import("../src/lib/pdfMarcaAdamia.mjs");
const { dibujarConsentimientoRostro } = await import("../src/lib/legal/consentimientoRostroPdf.mjs");
const { dibujarResguardo, nombreArchivoResguardo } = await import("../src/lib/activos/pdfResguardo.mjs");
const { dibujarMatrizAsistencia } = await import("../src/lib/asistencia/matrizPdf.mjs");

const LOGO = `data:image/png;base64,${readFileSync(new URL("../public/assets/adamia-pdf.png", import.meta.url)).toString("base64")}`;
const FECHA = new Date(2026, 10, 22, 9, 5); // 22/11/2026 09:05 local

// Texto (Helvetica: jsPDF guarda el texto tal cual) e imágenes dibujadas en una página.
function pagina(doc, n) {
  const ops = doc.internal.pages[n].join("\n");
  const texto = [...ops.matchAll(/\((.*?)\) Tj/g)].map((m) => m[1].replace(/\\([()\\])/g, "$1")).join("\n");
  const imagenes = (ops.match(/\/I\d+ Do/g) || []).length;
  return { texto, imagenes };
}
const paginas = (doc) => Array.from({ length: doc.internal.getNumberOfPages() }, (_, i) => pagina(doc, i + 1));
function pieEnCadaPagina(doc) {
  const ps = paginas(doc);
  ps.forEach((p, i) => {
    assert.ok(p.texto.includes(`Página ${i + 1} de ${ps.length}`), `«Página ${i + 1} de ${ps.length}» en la página ${i + 1}:\n${p.texto}`);
    assert.ok(p.texto.includes(`Generado con ADAMIA · ${fechaHoraGeneracion(FECHA)}`), `«Generado con ADAMIA» en la página ${i + 1}`);
    assert.ok(p.imagenes >= 1, `logotipo en la página ${i + 1}`);
  });
  return ps;
}

// ——— Nombre de archivo ———
test("nombre: ejemplo del dueño, sin acentos ni nombre del empleado", () => {
  assert.equal(nombreArchivoPdf({ documento: "Consentimiento rostro", empleado: 1234, fecha: "2026-11-22" }), "Consentimiento-rostro-Emp-1234-2026-11-22.pdf");
  assert.equal(limpiarParte("Acuerdo de préstamo · Año/Niño «ñ» #1"), "Acuerdo-de-prestamo-Ano-Nino-n-1");
  const n = nombreArchivoPdf({ documento: "Acta administrativa", folio: "AC-0007", empleado: { id_empleado: 9, nombre_empleado: "Ana Pérez" }, fecha: "2026-11-22" });
  assert.equal(n, "Acta-administrativa-Folio-AC-0007-Emp-9-2026-11-22.pdf");
  assert.match(n, /^[A-Za-z0-9.-]+$/);
});

test("nombre: número de empleado antes que el id; `id` a secas no es empleado", () => {
  assert.equal(numeroEmpleadoArchivo({ no_empleado: "A-77", id_empleado: 5 }), "A-77");
  assert.equal(numeroEmpleadoArchivo({ codigo_empleado: " ", id_empleado: 5 }), "5");
  assert.equal(numeroEmpleadoArchivo({ id: 44, folio: "C-1" }), "", "en un contrato `id` es del documento");
  assert.equal(nombreArchivoPdf({ documento: "Contrato", folio: "C-1", empleado: { id: 44 }, fecha: "2026-11-22" }), "Contrato-Folio-C-1-2026-11-22.pdf");
});

test("nombre: periodo, fecha local y extensión", () => {
  assert.equal(nombreArchivoPdf({ documento: "Reporte horas", periodo: { inicio: "2026-11-01", fin: "2026-11-15" } }), "Reporte-horas-2026-11-01-al-2026-11-15.pdf");
  assert.equal(nombreArchivoPdf({ documento: "Reporte horas", empleado: { id_empleado: 3 }, periodo: { inicio: "2026-11-01", fin: "2026-11-01" }, extension: "xls" }), "Reporte-horas-Emp-3-2026-11-01.xls");
  assert.equal(fechaArchivo(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
  assert.equal(nombreArchivoPdf({ fecha: "2026-01-02" }), "Documento-2026-01-02.pdf");
});

// ——— Pie y encabezado ———
test("pie homologado en cada página, en mm y en pt (vertical y horizontal)", () => {
  for (const op of [{ unit: "mm", format: "a4" }, { unit: "pt", format: "a4" }, { unit: "mm", format: "a4", orientation: "landscape" }]) {
    const doc = new jsPDF(op);
    doc.addPage();
    doc.addPage();
    dibujarPieAdamia(doc, { logo: LOGO, documento: "Prueba", detalle: "Folio #1", fecha: FECHA });
    const ps = pieEnCadaPagina(doc);
    assert.equal(ps.length, 3);
    assert.ok(ps[0].texto.includes("Prueba · Folio #1"));
  }
  // Sin logotipo: marca tipográfica.
  const doc = new jsPDF();
  dibujarPieAdamia(doc, { fecha: FECHA });
  assert.ok(pagina(doc, 1).texto.includes("ADAMIA"));
  assert.ok(pagina(doc, 1).texto.includes("Página 1 de 1"));
});

test("pie: un detalle muy largo se recorta y no tapa «Página X de Y»", () => {
  const doc = new jsPDF();
  dibujarPieAdamia(doc, { logo: LOGO, documento: "x".repeat(400), fecha: FECHA });
  const { texto } = pagina(doc, 1);
  const linea = texto.split("\n").find((t) => t.startsWith("Generado con ADAMIA"));
  assert.ok(linea.endsWith("..."));
  doc.setFontSize(7);
  assert.ok(mm(doc, 20) + doc.getTextWidth(linea) < doc.internal.pageSize.getWidth() - mm(doc, 20) - doc.getTextWidth("Página 1 de 1"));
});

test("encabezado: logotipo, documento y empresa", () => {
  const doc = new jsPDF();
  const y = dibujarEncabezadoAdamia(doc, { logo: LOGO, documento: "Resguardo de activos", empresa: "Empresa de prueba", subtitulo: "Folio R-1" });
  const { texto, imagenes } = pagina(doc, 1);
  for (const t of ["Resguardo de activos", "Empresa de prueba", "Folio R-1"]) assert.ok(texto.includes(t), t);
  assert.equal(imagenes, 1);
  assert.ok(y > 20 && y < 45, `contenido empieza en ${y}`);
});

// ——— Documentos que antes no tenían el formato ———
test("consentimiento del rostro: encabezado, pie y contenido sin cambios", () => {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  dibujarConsentimientoRostro(doc, { nombre: "Empleado de prueba", empresa: "Empresa de prueba", logo: LOGO, fecha: FECHA });
  const [p1] = pieEnCadaPagina(doc);
  for (const t of ["Consentimiento de uso del rostro", "Empresa de prueba", "Empleado: Empleado de prueba", "Versión del texto"]) assert.ok(p1.texto.includes(t), t);
  assert.ok(p1.imagenes >= 2, "logotipo arriba y en el pie");
});

const entrega = (lineas) => ({
  folio: "RES-0042",
  date: "2026-11-22",
  employeeId: "57",
  employee: { name: "Empleado de prueba", role: "Almacén" },
  actor: "Usuario RH",
  status: "confirmed",
  acknowledgement: "accepted",
  lines: Array.from({ length: lineas }, (_, i) => ({ qty: 1, snapshot: { name: `Artículo ${i + 1}`, variant: "Única", code: `A-${i + 1}`, serial: "" } })),
});

test("resguardo de activos: encabezado, pie en cada página y nombre sin datos personales", () => {
  for (const lineas of [3, 45]) {
    const doc = new jsPDF({ unit: "mm", format: "letter" });
    dibujarResguardo(doc, autoTable, entrega(lineas), { name: "Empresa de prueba" }, { logo: LOGO, fecha: FECHA });
    const ps = pieEnCadaPagina(doc);
    if (lineas > 40) assert.ok(ps.length >= 2, "varias páginas");
    assert.ok(ps[0].texto.includes("Resguardo de activos y uniformes"));
    assert.ok(ps[0].texto.includes("Folio RES-0042"));
  }
  assert.equal(nombreArchivoResguardo(entrega(1)), "Resguardo-activos-Folio-RES-0042-Emp-57-2026-11-22.pdf");
});

test("matriz de asistencia: encabezado con empresa y periodo, pie en cada página", () => {
  const dias = Array.from({ length: 15 }, (_, i) => dayjs("2026-11-01").add(i, "day"));
  const celdas = { presente: { code: "P", rgb: [0, 0, 0], fill: null }, sin: { code: "-", rgb: [0, 0, 0], fill: null } };
  const empleados = Array.from({ length: 70 }, (_, i) => ({ nombre: `Empleado ${i + 1}`, diasMap: { "2026-11-02": "presente" }, presentes: 1, faltas: 0, total: 1, pctAusencia: 0 }));
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  dibujarMatrizAsistencia(doc, autoTable, { dias, empleados, celdas, letras: ["D", "L", "M", "X", "J", "V", "S"], periodo: "Del 01/11/2026 al 15/11/2026", empresaNombre: "Empresa de prueba", logo: LOGO });
  const ps = paginas(doc);
  assert.ok(ps.length >= 2, "varias páginas");
  ps.forEach((p, i) => {
    assert.ok(p.texto.includes(`Página ${i + 1} de ${ps.length}`));
    assert.ok(p.texto.includes("Generado con ADAMIA"));
    assert.ok(p.imagenes >= 1);
  });
  assert.ok(ps[0].texto.includes("Empresa de prueba") && ps[0].texto.includes("Del 01/11/2026 al 15/11/2026"));
});
