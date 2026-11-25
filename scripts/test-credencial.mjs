// Encabezado compacto de la ficha y credencial CR80 del empleado: textos, fecha «desde», colores (WCAG AA) y medidas.
// Uso: node --test scripts/test-credencial.mjs
import test from "node:test";
import assert from "node:assert/strict";
import qrcode from "qrcode-generator";
import {
  TARJETA, BASE_ALTO, pixelesTarjeta, DPI_DESCARGA, fechaDesde, numeroEmpleado, lineaSubtitulo, lineasNombre,
  iniciales, formatoCodigo, leyendaVuelta, contraste, textoLegibleSobre, COLORES_CREDENCIAL as C, datosCredencial,
} from "../src/lib/empleado/credencial.mjs";
import { modulosQr } from "../src/lib/qrImagen.mjs";

test("línea bajo el nombre: «Puesto · Área · No. · desde mes año» y omite lo que falte", () => {
  assert.equal(
    lineaSubtitulo({ puesto: "CEO", area: "Administración", numero: "0042", fechaIngreso: "2021-03-15" }),
    "CEO · Administración · No. 0042 · desde mar 2021",
  );
  assert.equal(lineaSubtitulo({ puesto: "Cajera", fechaIngreso: "2025-01-10T06:00:00.000Z" }), "Cajera · desde ene 2025");
  assert.equal(lineaSubtitulo({ puesto: "  ", area: null, numero: "", fechaIngreso: "" }), "");
  assert.equal(lineaSubtitulo(), "");
});

test("fecha «desde»: mes corto en español, sin correr el día por zona horaria", () => {
  assert.equal(fechaDesde("2021-03-01"), "mar 2021");
  assert.equal(fechaDesde("2021-03-01", { mayuscula: true }), "Mar 2021");
  // 1 de enero a medianoche UTC: en México sería 31 de diciembre si se convirtiera de zona.
  assert.equal(fechaDesde("2024-01-01T00:00:00.000Z"), "ene 2024");
  assert.equal(fechaDesde("2024-12-31 00:00:00"), "dic 2024");
  for (const v of [null, undefined, "", "sin fecha", "2024-13-01"]) assert.equal(fechaDesde(v), "");
});

test("número de empleado: el propio si existe; si no, el «Código de empleado» (nip); nunca el PIN", () => {
  assert.equal(numeroEmpleado({ numero_empleado: "0042", nip: "211355498" }), "0042");
  assert.equal(numeroEmpleado({ nip: " 1234 " }), "1234");
  assert.equal(numeroEmpleado({ pin: "9999", tiene_pin: true }), "");
  assert.equal(numeroEmpleado(null), "");
});

test("nombre en dos renglones, iniciales y código en grupos de 3", () => {
  assert.deepEqual(lineasNombre({ nombre: "Diego Alonso", apellido_paterno: "Leon", apellido_materno: "De Dios" }), ["Diego Alonso", "Leon De Dios"]);
  assert.deepEqual(lineasNombre({ nombre: "Ana", apellido_paterno: "Torres", apellido_materno: "" }), ["Ana", "Torres"]);
  assert.deepEqual(lineasNombre({}), []);
  assert.equal(iniciales({ nombre: "diego", apellido_paterno: "leon" }), "DL");
  assert.equal(iniciales({}), "?");
  assert.equal(formatoCodigo("211355498"), "211 355 498");
  assert.equal(formatoCodigo("1234"), "1 234");
  assert.equal(formatoCodigo("123"), "123");
  assert.equal(formatoCodigo("EMP-7"), "EMP-7");
});

test("leyenda de la vuelta con la empresa", () => {
  assert.equal(leyendaVuelta("Uniline"), "Credencial personal e intransferible. Si la encuentras, comunícate a Uniline.");
  assert.match(leyendaVuelta(""), /comunícate a la empresa\.$/);
});

test("contraste WCAG: valores conocidos y texto de la franja que cumple AA", () => {
  assert.equal(Math.round(contraste("#FFFFFF", "#000000") * 10) / 10, 21);
  assert.equal(contraste("#777777", "#777777"), 1);
  // Blanco sobre el azul ADAMIA claro (#3B82F6) no llega a 4.5:1 → la franja usa el azul marino de ADAMIA.
  assert.ok(contraste("#FFFFFF", C.franja) < 4.5);
  assert.equal(C.textoFranja, "#080D36");
  assert.ok(contraste(C.textoFranja, C.franja) >= 4.5, `franja ${contraste(C.textoFranja, C.franja).toFixed(2)}:1`);
  // Sobre un azul oscuro sí se elige blanco.
  assert.equal(textoLegibleSobre("#1D5CF5"), "#FFFFFF");
  // Resto de textos de la credencial: todos AA.
  const pares = [
    [C.texto, C.fondoFrente], [C.textoSecundario, C.fondoFrente], [C.etiqueta, C.fondoFrente], [C.textoPildora, C.pildora],
    [C.tituloVuelta, C.fondoVuelta], [C.textoVuelta, C.fondoVuelta], [C.leyendaVuelta, C.fondoVuelta], [C.codigoVuelta, C.fondoVuelta],
  ];
  for (const [t, f] of pares) assert.ok(contraste(t, f) >= 4.5, `${t} sobre ${f}: ${contraste(t, f).toFixed(2)}:1`);
});

test("tamaño de la tarjeta: CR80 vertical (≈54 × 86 mm) y PNG/PDF a ≥300 dpi", () => {
  assert.deepEqual([TARJETA.anchoMm, TARJETA.altoMm], [53.98, 85.6]);
  assert.ok(Math.abs(BASE_ALTO / TARJETA.baseAncho - 85.6 / 53.98) < 1e-9, "la base respeta la proporción");
  const p = pixelesTarjeta(DPI_DESCARGA);
  assert.ok(DPI_DESCARGA >= 300);
  assert.deepEqual([p.ancho, p.alto], [1275, 2022]);
  assert.ok(Math.abs(p.ancho / p.alto - 53.98 / 85.6) < 0.001);
  assert.deepEqual([pixelesTarjeta(300).ancho, pixelesTarjeta(300).alto], [638, 1011]);
});

test("credencial: usa el código del checador (nip) para el QR y no lleva PIN", () => {
  const d = datosCredencial({
    empleado: { nombre: "Ana", apellido_paterno: "Torres", puesto: "Cajera", departamento: "Piso", nip: "1234", fecha_ingreso: "2025-01-10", pin: "4321", tiene_pin: true },
    empresa: "Empresa prueba",
  });
  assert.deepEqual(
    [d.empresa, d.nombre, d.puesto, d.area, d.numero, d.desde, d.codigo, d.codigoTexto],
    ["Empresa prueba", ["Ana", "Torres"], "Cajera", "Piso", "1234", "Ene 2025", "1234", "1 234"],
  );
  assert.ok(!JSON.stringify(d).includes("4321"), "el PIN nunca entra a la credencial");
  // Los módulos del QR son los mismos que la librería genera para ese código (mismo QR que la ficha y el reloj).
  const { tamano, oscuro } = modulosQr("1234");
  const qr = qrcode(0, "M"); qr.addData("1234"); qr.make();
  assert.equal(tamano, qr.getModuleCount());
  for (let f = 0; f < tamano; f++) for (let c = 0; c < tamano; c++) assert.equal(oscuro(f, c), qr.isDark(f, c));
});
