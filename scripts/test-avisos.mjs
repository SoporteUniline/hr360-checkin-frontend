// «Avisos y felicitaciones»: grupos Hoy / Mañana / Esta semana, filtros con su número, textos de cada aviso, enlace
// wa.me con el texto del catálogo, contador del botón, pie del envío automático y edición de plantillas de correo.
import assert from "node:assert/strict";
import test from "node:test";
import * as A from "../src/lib/avisos/avisos.mjs";

const aviso = (o) => ({ tipo: "cumpleanos", grupo: "hoy", dias: 0, fecha: "2026-11-25", nombre: "Ana López", area: "Ventas", edad: 29, ...o });
const lista = [
  aviso({ clave: "c-11" }),
  aviso({ clave: "a-12", tipo: "aniversario", grupo: "manana", dias: 1, fecha: "2026-11-26", anios: 3, area: "Producción", edad: undefined }),
  aviso({ clave: "k-1", tipo: "contrato", grupo: "manana", dias: 1, fecha: "2026-11-26" }),
  aviso({ clave: "c-13", grupo: "semana", dias: 3, fecha: "2026-11-28", edad: 34 }),
  aviso({ clave: "a-14", tipo: "aniversario", grupo: "semana", dias: 5, fecha: "2026-11-30", anios: 1 }),
];

test("grupos en orden Hoy → Mañana → Esta semana, con el día de la semana", () => {
  const g = A.agrupar(lista);
  assert.deepEqual(g.map((x) => [x.titulo, x.items.map((i) => i.clave)]), [
    ["Hoy · miércoles 25", ["c-11"]],
    ["Mañana · jueves 26", ["a-12", "k-1"]],
    ["Esta semana", ["c-13", "a-14"]],
  ]);
  assert.deepEqual(A.agrupar([]), []);
  assert.deepEqual(A.agrupar(lista.filter((a) => a.grupo === "semana")).map((x) => x.grupo), ["semana"], "sin grupos vacíos");
});

test("filtros: Todos siempre; los demás solo si hay; cada uno con su número", () => {
  assert.deepEqual(A.filtrosVisibles(lista).map((f) => `${f.etiqueta} · ${f.n}`), ["Todos · 5", "Cumpleaños · 2", "Aniversarios · 2", "Contratos · 1"]);
  assert.deepEqual(A.filtrosVisibles(lista.filter((a) => a.tipo !== "contrato")).map((f) => f.clave), ["todos", "cumpleanos", "aniversario"]);
  assert.deepEqual(A.filtrar(lista, "contrato").map((a) => a.clave), ["k-1"]);
  assert.equal(A.filtrar(lista, "todos").length, 5);
});

test("texto de cada aviso, como en la maqueta", () => {
  assert.equal(A.descripcion(lista[0]), "Cumple 29 años · Ventas");
  assert.equal(A.descripcion(lista[1]), "3 años en la empresa · Producción");
  assert.equal(A.descripcion(lista[2]), "Vence su contrato · decide si renuevas");
  assert.equal(A.descripcion(lista[3]), "Sáb 28 · cumple 34 años");
  assert.equal(A.descripcion(lista[4]), "Lun 30 · 1 año en la empresa");
  assert.equal(A.descripcion(aviso({ tipo: "contrato", dias: 0 })), "Su contrato vence hoy · decide si renuevas");
  assert.equal(A.subtituloFelicitar(lista[0]), "Cumple 29 años hoy · Ventas");
  assert.equal(A.subtituloFelicitar(lista[1]), "3 años en la empresa mañana · Producción");
  assert.deepEqual([0, 1, 3].map(A.enDias), ["hoy", "mañana", "en 3 días"]);
});

test("enlace wa.me: solo dígitos y el texto fijo completo codificado (acentos, emoji, saltos)", () => {
  const texto = "¡Feliz cumpleaños, Ana! 🎉\nTodo el equipo de Uniline & Co te desea un gran día.";
  const url = A.enlaceWhatsApp("523312344821", texto);
  assert.ok(url.startsWith("https://wa.me/523312344821?text="));
  assert.equal(decodeURIComponent(new URL(url).searchParams.get("text")), texto);
  assert.equal(new URL(url).searchParams.get("text"), texto, "URLSearchParams lo lee igual");
  assert.match(url, /%0A/, "salto de línea codificado");
  assert.match(url, /%26%20Co/, "el & no rompe el enlace");
  assert.equal(A.enlaceWhatsApp("+52 (33) 1234-4821", "x"), "https://wa.me/523312344821?text=x");
  assert.equal(A.enlaceWhatsApp(null, "x"), null);
  assert.equal(A.enlaceWhatsApp("", "x"), null);
});

test("contador y etiqueta accesible del botón", () => {
  assert.deepEqual([0, 5, 9, 10, 42].map(A.textoContador), ["", "5", "9", "9+", "9+"]);
  assert.equal(A.etiquetaCampana(5), "Avisos de los próximos 7 días: 5");
  assert.equal(A.etiquetaCampana(0), "Avisos de los próximos 7 días: ninguno");
});

test("ya felicitado y su texto", () => {
  assert.equal(A.yaFelicitado(aviso({ felicitado: null })), false, "sin migración no hay marca");
  assert.equal(A.yaFelicitado(aviso({ felicitado: { whatsapp: false, correo: false } })), false);
  assert.equal(A.textoFelicitado(aviso({ felicitado: { whatsapp: true, correo: false } })), "Felicitado por WhatsApp");
  assert.equal(A.textoFelicitado(aviso({ felicitado: { whatsapp: false, correo: true, correo_automatico: true } })), "Felicitado por correo (automático)");
  assert.equal(A.textoFelicitado(aviso({ felicitado: { whatsapp: true, correo: true } })), "Felicitado por WhatsApp y correo");
});

test("pie del envío automático según las reglas de aviso y la plantilla", () => {
  assert.equal(A.textoAutomatico({ cumpleanos: { correo: true, hora: "9:05" }, aniversario: { correo: false, hora: "9:05" } }), "Los cumpleaños se felicitan solos por correo a las 9:05 a. m.");
  assert.equal(A.textoAutomatico({ cumpleanos: { correo: true, hora: "9:05" }, aniversario: { correo: true, hora: "9:05" } }), "Los cumpleaños y aniversarios se felicitan solos por correo a las 9:05 a. m.");
  assert.equal(A.textoAutomatico({ cumpleanos: { correo: false }, aniversario: { correo: false } }), "");
  assert.equal(A.textoAutomatico({ cumpleanos: { correo: true, whatsapp: true, hora: "9:05" }, aniversario: { correo: true, whatsapp: true, hora: "9:05" } }),
    "Los cumpleaños y aniversarios se felicitan solos por correo y WhatsApp a las 9:05 a. m.");
  assert.equal(A.textoAutomatico({ cumpleanos: { correo: true, whatsapp: true, hora: "9:05" }, aniversario: { correo: true, whatsapp: false, hora: "9:05" } }),
    "Se felicitan solos los cumpleaños por correo y WhatsApp y los aniversarios por correo a las 9:05 a. m.");
  assert.equal(A.textoAutomatico(undefined), "");
});

test("plantillas: insertar variable en el cursor, cambios pendientes y variables que no existen", () => {
  assert.deepEqual(A.insertarVariable("Hola !", "nombre", 5), { texto: "Hola {nombre}!", cursor: 13 });
  assert.deepEqual(A.insertarVariable("Hola XX!", "nombre", 5, 7), { texto: "Hola {nombre}!", cursor: 13 }, "reemplaza la selección");
  assert.deepEqual(A.insertarVariable("Hola", "área"), { texto: "Hola{área}", cursor: 10 }, "sin cursor, al final");
  const g = { diseno: "festivo", asunto: "A", mensaje: "M", envio_correo_auto: true, aviso_campana: true, revision: 2 };
  assert.equal(A.hayCambios(A.borradorDe(g), g), false);
  assert.equal(A.hayCambios({ ...A.borradorDe(g), aviso_campana: false }, g), true);
  // Sin personalizar y solo con interruptores: se guardan solo los interruptores (sigue el correo de ADAMIA).
  const sistema = { ...g, personalizada: false, revision: 3, envio_whatsapp_auto: false };
  assert.deepEqual(A.cuerpoGuardar({ ...A.borradorDe(sistema), envio_whatsapp_auto: true }, sistema),
    { sistema: true, envio_correo_auto: true, aviso_campana: true, envio_whatsapp_auto: true, revision: 3 });
  assert.deepEqual(A.cuerpoGuardar({ ...A.borradorDe(sistema), asunto: "Otro" }, sistema),
    { diseno: "festivo", asunto: "Otro", mensaje: "M", envio_correo_auto: true, aviso_campana: true, envio_whatsapp_auto: false, revision: 3 });
  assert.equal(A.cuerpoGuardar(A.borradorDe({ ...g, personalizada: true }), { ...g, personalizada: true }).asunto, "A", "personalizada: manda sus textos");
  assert.equal(A.textosCambiados({ ...g, aviso_campana: false }, g), false);
  const vars = ["nombre", "edad", "años", "área", "empresa", "jefe"];
  assert.deepEqual(A.variablesDesconocidas("Hola {nombre} de {area} y {sueldo} {sueldo}", vars), ["sueldo"]);
});

test("vista previa del correo: el modo elegido manda, no el modo oscuro del equipo de quien edita", () => {
  const html = '<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><style>.a{color:#000} @media (prefers-color-scheme: dark) { .fondo{background:#0b1120 !important} }</style>';
  const claro = A.htmlEnModo(html, "light");
  assert.ok(!/prefers-color-scheme/.test(claro));
  assert.match(claro, /@media not all \{ \.fondo/);
  assert.match(claro, /name="color-scheme" content="light"/);
  assert.match(claro, /name="supported-color-schemes" content="light"/);
  const oscuro = A.htmlEnModo(html, "dark");
  assert.match(oscuro, /@media all \{ \.fondo/);
  assert.match(oscuro, /name="color-scheme" content="dark"/);
  assert.equal(A.htmlEnModo(undefined, "light"), undefined);
});
