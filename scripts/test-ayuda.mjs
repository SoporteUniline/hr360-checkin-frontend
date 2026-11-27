// Centro de ayuda (27/11/2026): reglas del formato y prueba de VIGENCIA del contenido (src/content/ayuda).
// 1) Unidad: frontmatter, Markdown del subconjunto, qué guía abre el botón «?», búsqueda, avance local y tamaño de imágenes.
// 2) Contenido real: frontmatter válido, imágenes y enlaces internos que existen, «pantallas» que existen en src/app,
//    «fuentes» que existen, nada de datos internos en lo público, y que cada pantalla del panel y de Mi espacio tenga
//    al menos una guía (COBERTURA_ESTRICTA). Avisa (sin fallar) si un archivo de «fuentes» cambió después de «actualizado».
// Uso: node --test scripts/test-ayuda.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { separarFrontmatter, validarDatos } from "../src/lib/ayuda/frontmatter.mjs";
import { parsearMarkdown, preguntasFrecuentes, recorrer, tablaDeContenido, tareas, textoPlano } from "../src/lib/ayuda/markdown.mjs";
import { audienciasDeSesion, coincide, guiaDisponible, guiasDePantalla, prefijo, rutaDeArchivo, rutaRepresentativa } from "../src/lib/ayuda/pantallas.mjs";
import { buscar, prepararGuia } from "../src/lib/ayuda/buscar.mjs";
import { avanceRuta, guardarUtil, leidas, marcarLeida, utilDe } from "../src/lib/ayuda/progreso.mjs";
import { indicePublico, leerAyuda, medidasImagen } from "../src/lib/ayuda/contenido.mjs";
import { jsonSeguro, datosGuia } from "../src/lib/ayuda/seo.mjs";

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Cobertura: mientras las guías de los demás módulos se integran, las pantallas sin guía son ADVERTENCIA.
// Cuando todas estén escritas, cambiar a true: entonces una pantalla nueva sin guía rompe el CI.
export const COBERTURA_ESTRICTA = false;
// Pantallas que NO necesitan guía (no son pantallas de trabajo). Cada una con su motivo.
const EXCLUIDAS = new Map([
  ["/panel", "solo redirige a la primera pantalla (Muro o Monitor)"],
  ["/empleado", "solo redirige a Mi espacio › Inicio"],
  ["/panel/comunicados", "redirige al Muro (/panel/muro)"],
  ["/panel/horas-extra", "ruta vieja: redirige a Asistencias con un aviso"],
  ["/panel/catalogos", "índice viejo de catálogos sin entrada en el menú (cada catálogo tiene su pantalla)"],
  ["/panel/reportes-personalizados/debug", "herramienta interna de desarrollo («NO incluir en sidebar ni en producción»)"],
  ["/panel/cotizaciones", "herramienta del administrador de ADAMIA, sin uso del cliente"],
  ["/panel/mensajes-sistema", "herramienta del administrador de ADAMIA, sin uso del cliente"],
  ["/panel/reclutamiento/entrevistas", "maqueta vieja; el menú lleva a la agenda real (/panel/whatsapp?vista=entrevistas)"],
  // Las páginas públicas con liga (/encuesta/[token], /buzon/[clave], /vacante/[slug], /postular/[token]) no entran en la
  // cobertura (solo se revisan /panel y /empleado): se explican dentro de las guías y no llevan botón «?».
]);
// Texto que nunca debe salir en el contenido público (configuración interna, direcciones privadas, llaves).
const PROHIBIDO = [
  [/NEXT_PUBLIC_|process\.env|[A-Z]{3,}_(?:KEY|SECRET|TOKEN|URL|PASSWORD)\b/, "nombre de variable de entorno"],
  [/\/api\/|\/checador\/|\/internal\//, "dirección interna del servidor"],
  [/\bhttps?:\/\/(?!adamia\.com\.mx|www\.adamia\.com\.mx)[^\s)]*(?:prueba\.invalid|localhost|127\.0\.0\.1|amazonaws\.com|lightsail)/i, "servidor interno"],
  [/\b(?:localhost|127\.0\.0\.1)\b/i, "servidor local"],
  [/\bhttp:\/\//, "enlace sin https"],
  [/\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{6,}|AIza[0-9A-Za-z_-]{20,}|-----BEGIN/, "llave o credencial"],
];
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

const RAIZ = path.resolve(new URL("..", import.meta.url).pathname);
const avisos = [];
const avisar = (m) => avisos.push(m);
process.on("exit", () => { if (avisos.length) console.warn(`\n⚠ test-ayuda: ${avisos.length} advertencias\n${avisos.map((a) => `  - ${a}`).join("\n")}`); });

// ───────── unidad ─────────
test("frontmatter: claves, listas en una línea, comentarios, comillas y validación", () => {
  const texto = "---\ntitulo: Cómo pedir vacaciones\nresumen: \"Pide días: desde tu celular\"\nmodulo: vacaciones            # clave del módulo\naudiencia: [empleado, Jefe]   # rh | jefe\npantallas: [/empleado/panel/solicitudes, /panel/vacaciones]\npalabras: [vacaciones, días]\norden: 10\nactualizado: 2026-11-27\nfuentes: [src/a.jsx]\n---\n## Hola\n";
  const { datos, cuerpo, lineaCuerpo, errores } = separarFrontmatter(texto);
  assert.deepEqual(errores, []);
  assert.equal(datos.modulo, "vacaciones");
  assert.equal(datos.resumen, "Pide días: desde tu celular");
  assert.deepEqual(datos.audiencia, ["empleado", "Jefe"]);
  assert.equal(cuerpo, "## Hola\n");
  assert.equal(lineaCuerpo, 11);
  const v = validarDatos(datos, "guia");
  assert.deepEqual(v.errores, []);
  assert.deepEqual(v.meta.audiencia, ["empleado", "jefe"]);
  assert.equal(v.meta.orden, 10);
  assert.equal(separarFrontmatter("## sin frontmatter").errores.length, 1);
  const otro = separarFrontmatter("---\nfuentes: [src/app/(public)/ayuda/page.jsx, src/app/panel/comunicados/[id]/page.jsx]\npantallas: []\n---\n");
  assert.deepEqual(otro.datos.fuentes, ["src/app/(public)/ayuda/page.jsx", "src/app/panel/comunicados/[id]/page.jsx"], "rutas con paréntesis y corchetes");
  assert.deepEqual(otro.datos.pantallas, [], "pantallas vacías es válido");
  assert.deepEqual(validarDatos({ titulo: "Nómina", resumen: "r", pantallas: [] }, "portada").errores, [], "index.md con pantallas vacías");
  assert.match(separarFrontmatter("---\npalabras: [a, b\n---\n").errores[0], /misma línea/);
  const mal = validarDatos({ titulo: "x", resumen: "y", modulo: "Mal Modulo", audiencia: ["todos"], actualizado: "2026-13-40", fuentes: [], extra: "1" }, "guia");
  assert.ok(mal.errores.some((e) => /Audiencia desconocida/.test(e)));
  assert.ok(mal.errores.some((e) => /actualizado/.test(e)));
  assert.ok(mal.errores.some((e) => /modulo/.test(e)));
  assert.ok(mal.errores.some((e) => /fuentes/.test(e)));
  assert.ok(mal.advertencias.some((e) => /extra/.test(e)));
  assert.deepEqual(validarDatos({ titulo: "R", resumen: "r", audiencia: ["rh"], guias: ["mod/guia"] }, "ruta").errores, []);
  assert.ok(validarDatos({ titulo: "R", resumen: "r", audiencia: ["rh"], guias: ["sin-carpeta"] }, "ruta").errores.length);
});

test("markdown: el subconjunto completo se convierte en bloques", () => {
  const md = [
    "## Cómo publicar un comunicado", "", "Texto con **negritas**, *cursivas*, `Publicar` y [un enlace](/ayuda/comunicados/muro-empleado).",
    "Sigue el párrafo.", "", "1. Paso uno", "2. Paso **dos**", "   - detalle", "3. Paso tres", "",
    "![Captura del muro](/ayuda/capturas/x.webp \"Pie de foto\")", "", "> **Consejo:** Hazlo así.", "> - con lista", "",
    "| Regla | Cuándo |", "| --- | --- |", "| Cumpleaños | El día |", "", "## Preguntas frecuentes", "", "### ¿Se puede?", "", "Sí, claro.", "",
    "### ¿Y esto?", "", "- también", "", "## Preguntas frecuentes", "", "Repetida.",
  ].join("\n");
  const { bloques, problemas } = parsearMarkdown(md);
  assert.deepEqual(problemas, []);
  assert.deepEqual(bloques.map((b) => b.t), ["h2", "p", "lista", "imagen", "aviso", "tabla", "h2", "h3", "p", "h3", "lista", "h2", "p"]);
  assert.equal(bloques[0].id, "como-publicar-un-comunicado");
  assert.equal(bloques[11].id, "preguntas-frecuentes-2", "anclas sin repetir");
  assert.deepEqual(bloques[1].hijos.map((n) => n.t), ["texto", "negrita", "texto", "cursiva", "texto", "codigo", "texto", "enlace", "texto"]);
  assert.match(textoPlano([bloques[1]]), /un enlace\. Sigue el párrafo\./);
  assert.equal(bloques[2].ordenada, true);
  assert.equal(bloques[2].items.length, 3);
  assert.equal(bloques[2].items[1].sub.items.length, 1);
  assert.deepEqual([bloques[3].alt, bloques[3].src, bloques[3].titulo], ["Captura del muro", "/ayuda/capturas/x.webp", "Pie de foto"]);
  assert.equal(bloques[4].tipo, "consejo");
  assert.deepEqual(bloques[4].bloques.map((b) => b.t), ["p", "lista"]);
  assert.equal(bloques[5].encabezado.length, 2);
  assert.equal(bloques[5].filas.length, 1);
  assert.deepEqual(tablaDeContenido(bloques).map((x) => [x.texto, x.sub.length]), [["Cómo publicar un comunicado", 0], ["Preguntas frecuentes", 2], ["Preguntas frecuentes", 0]]);
  assert.deepEqual(preguntasFrecuentes(bloques).map((f) => [f.pregunta, f.respuesta]), [["¿Se puede?", "Sí, claro."], ["¿Y esto?", "también"]]);
  assert.deepEqual(tareas(bloques)[0].pasos, ["Paso uno", "Paso dos", "Paso tres"]);
  assert.equal(tareas(bloques)[0].imagen, "/ayuda/capturas/x.webp");
  const vistos = { imagen: [], enlace: [] };
  recorrer(bloques, { imagen: (s) => vistos.imagen.push(s), enlace: (h) => vistos.enlace.push(h) });
  assert.deepEqual(vistos, { imagen: ["/ayuda/capturas/x.webp"], enlace: ["/ayuda/comunicados/muro-empleado"] });
});

test("markdown: lo que no está en el subconjunto se reporta y se muestra como texto (nunca HTML)", () => {
  const casos = [
    ["# Título", /No uses «#»/], ["#### Cuatro", /Solo se permiten/], ["Hola <b>negrita</b>", /HTML no permitido/],
    ["```\ncodigo\n```", /Bloque de código/], ["---", /Línea horizontal/], ["> sin tipo", /Cita sin tipo/],
    ["[x](javascript:alert(1))", /Enlace no permitido/], ["[x](http://sitio.com)", /Enlace no permitido/],
    ["Texto ![img](/a.png) junto", /Imagen dentro de un párrafo/], ["![](/a.png)", /sin descripción/],
    ["- a\n      - muy adentro", /un nivel/], ["| a | b |\n| --- | --- |\n| 1 |", /distinto número/],
  ];
  for (const [md, re] of casos) {
    const r = parsearMarkdown(md);
    assert.ok(r.problemas.some((p) => re.test(p.mensaje)), `${JSON.stringify(md)} → ${JSON.stringify(r.problemas)}`);
  }
  const html = parsearMarkdown("Hola <script>alert(1)</script>");
  assert.equal(html.bloques[0].hijos[0].t, "texto", "el HTML queda como texto plano");
  assert.equal(parsearMarkdown("a\n\n## T").problemas.length, 0);
  assert.equal(parsearMarkdown("x", { desplazamiento: 10 }).problemas.length, 0);
  assert.equal(parsearMarkdown("# T", { desplazamiento: 10 }).problemas[0].linea, 11, "número de línea real del archivo");
});

test("botón «?»: qué guía abre cada pantalla (exacta > prefijo más largo > orden)", () => {
  assert.ok(coincide("/panel/comunicados/[id]", "/panel/comunicados/12"));
  assert.ok(coincide("/panel/comunicados/[id]", "/panel/comunicados/[id]"));
  assert.ok(!coincide("/panel/comunicados/[id]", "/panel/comunicados/12/editar"));
  assert.ok(coincide("/panel/clima/[[...secciones]]", "/panel/clima"));
  assert.ok(coincide("/panel/clima/[[...secciones]]", "/panel/clima/nom035"));
  assert.ok(coincide("/panel/activos/[...s]", "/panel/activos/inventario/3"));
  assert.ok(!coincide("/panel/activos/[...s]", "/panel/activos"));
  assert.ok(!coincide("/panel/muro", "/empleado/panel/muro"));
  assert.equal(prefijo("/panel/vacaciones", "/panel/vacaciones/planeacion"), 2);
  assert.equal(prefijo("/panel", "/panel/vacaciones"), 0, "una raíz nunca cubre todo");
  assert.equal(prefijo("/empleado/panel", "/empleado/panel/muro"), 0);
  const guias = [
    { slug: "a/rh", pantallas: ["/panel/muro"], audiencia: ["rh"], orden: 20 },
    { slug: "a/portada", pantallas: ["/panel/muro"], audiencia: ["rh"], orden: 60 },
    { slug: "a/seguimiento", pantallas: ["/panel/comunicados/[id]"], audiencia: ["rh"], orden: 30 },
    { slug: "a/vac", pantallas: ["/panel/vacaciones"], audiencia: ["rh"], orden: 10 },
    { slug: "a/emp", pantallas: ["/empleado/panel/muro", "/empleado/panel/muro/[id]"], audiencia: ["empleado"], orden: 10 },
    { slug: "a/jefe", pantallas: ["/empleado/panel/muro"], audiencia: ["jefe"], orden: 5 },
  ];
  assert.deepEqual(guiasDePantalla(guias, "/panel/muro").map((g) => g.slug), ["a/rh", "a/portada"]);
  assert.deepEqual(guiasDePantalla(guias, "/panel/comunicados/7?empresa=3").map((g) => g.slug), ["a/seguimiento"]);
  assert.deepEqual(guiasDePantalla(guias, "/panel/vacaciones/planeacion").map((g) => g.slug), ["a/vac"]);
  assert.deepEqual(guiasDePantalla(guias, "/panel/nomina").map((g) => g.slug), []);
  assert.deepEqual(guiasDePantalla(guias, "/empleado/panel/muro/3").map((g) => g.slug), ["a/emp", "a/jefe"], "la exacta antes que la del prefijo");
  assert.deepEqual(guiasDePantalla(guias, "/empleado/panel/muro").map((g) => g.slug), ["a/jefe", "a/emp"], "misma ruta: gana el orden más bajo");
  const nomina = [{ slug: "n/nomina", pantallas: ["/panel/nomina"], orden: 10 }, { slug: "n/bonos", pantallas: ["/panel/nomina/bonos"], orden: 20 }];
  assert.deepEqual(guiasDePantalla(nomina, "/panel/nomina/5").map((g) => g.slug), ["n/nomina"], "prefijo: /panel/nomina/5 abre la guía de /panel/nomina");
  assert.deepEqual(guiasDePantalla(nomina, "/panel/nomina/bonos/3").map((g) => g.slug), ["n/bonos", "n/nomina"], "gana el prefijo más largo");
  assert.equal(rutaDeArchivo("(public)/ayuda/[modulo]/page.jsx"), "/ayuda/[modulo]");
  assert.equal(rutaDeArchivo("panel/muro/Muro.jsx"), null);
  assert.equal(rutaRepresentativa("/panel/clima/[[...secciones]]"), "/panel/clima");
});

test("filtro dentro del sistema: audiencia por rol y módulos encendidos", () => {
  assert.deepEqual(audienciasDeSesion({ tipo_usuario: "Recruiter" }), ["rh", "dueno"]);
  assert.deepEqual(audienciasDeSesion({ tipo_usuario: "User", esAcceso: true }), ["rh"]);
  assert.deepEqual(audienciasDeSesion({ tipo_usuario: "Empleado" }), ["empleado"]);
  assert.deepEqual(audienciasDeSesion({ tipo_usuario: "Empleado" }, { esJefe: true }), ["empleado", "jefe"]);
  assert.equal(audienciasDeSesion({ tipo_usuario: "Admin" }).length, 4);
  assert.deepEqual(audienciasDeSesion(null), []);
  const activos = new Set(["asistencias", "empleados", "nomina"]);
  assert.equal(guiaDisponible({ modulo: "comunicados", pantallas: ["/panel/muro"] }, { activos }), false, "módulo apagado");
  assert.equal(guiaDisponible({ modulo: "comunicados", pantallas: [] }, { activos: null }), true, "sin datos de módulos no se filtra");
  assert.equal(guiaDisponible({ modulo: "nomina", pantallas: ["/panel/nomina"] }, { activos }), true);
  assert.equal(guiaDisponible({ modulo: "primeros-pasos", pantallas: [] }, { activos }), true, "módulo que no es del catálogo: siempre");
  for (const m of ["clima", "adamia-ai", "mi-espacio", "usuarios", "modulos", "seguridad", "suscripcion", "creditos-ia", "integraciones", "avisos", "campos-personalizados"]) {
    assert.equal(guiaDisponible({ modulo: m, pantallas: [] }, { activos }), true, `${m} cuenta como base`);
  }
  assert.equal(guiaDisponible({ modulo: "tiempo", pantallas: ["/panel/tareas"] }, { activos }), false, "por sus pantallas");
  assert.equal(guiaDisponible({ modulo: "reclutamiento", pantallas: [] }, { activos: null, opciones: { reclutamiento: false } }), false, "interruptor global");
  const permisos = { modulos: { comunicados: "sin_acceso", asistencias: "ver" } };
  assert.equal(guiaDisponible({ modulo: "comunicados", pantallas: ["/panel/muro"] }, { activos: null, permisos }), false, "acceso sin permiso");
  assert.equal(guiaDisponible({ modulo: "x", pantallas: ["/panel/monitor"] }, { activos: null, permisos }), true);
});

test("búsqueda: sin acentos ni mayúsculas, por prefijo, todas las palabras y con la sección", () => {
  const indice = [
    { slug: "c/confirmar", titulo: "Confirmación de lectura", resumen: "Quién ya leyó", palabras: ["enterado"], secciones: [{ id: "recordar", texto: "Cómo recordar a los que faltan" }], texto: "Recordar cada 24 horas", orden: 30 },
    { slug: "c/muro", titulo: "Cómo usar el muro", resumen: "Lee los avisos", palabras: ["me gusta"], secciones: [{ id: "x", texto: "Cómo confirmar de leído" }], texto: "Toca Confirmar de leído", orden: 10 },
    { slug: "v/vac", titulo: "Cómo pedir vacaciones", resumen: "Días", palabras: ["descanso"], secciones: [], texto: "", orden: 10 },
  ].map(prepararGuia);
  assert.deepEqual(buscar(indice, "CONFIRMACIÓN").map((r) => r.g.slug), ["c/confirmar"]);
  assert.equal(buscar(indice, "vacac")[0].g.slug, "v/vac", "por inicio de palabra");
  assert.deepEqual(buscar(indice, "recordar faltan").map((r) => r.g.slug), ["c/confirmar"]);
  assert.equal(buscar(indice, "recordar faltan")[0].seccion.id, "recordar");
  assert.deepEqual(buscar(indice, "vacaciones muro"), [], "todas las palabras");
  assert.deepEqual(buscar(indice, "  "), []);
  assert.deepEqual(buscar(indice, "de la el"), [], "solo palabras vacías")
});

test("avance local: guías leídas, rutas y «¿Te sirvió?», tolerante a fallas del almacenamiento", () => {
  const datos = new Map();
  const s = { getItem: (k) => datos.get(k) ?? null, setItem: (k, v) => datos.set(k, String(v)) };
  assert.deepEqual(leidas(s), {});
  marcarLeida("a/uno", true, { s, hoy: new Date("2026-11-27T12:00:00Z") });
  marcarLeida("a/dos", true, { s });
  marcarLeida("a/dos", false, { s });
  assert.deepEqual(leidas(s), { "a/uno": "2026-11-27" });
  assert.deepEqual(avanceRuta(["a/uno", "a/dos", "a/tres"], leidas(s)), { hechas: 1, total: 3, porcentaje: 33, siguiente: "a/dos" });
  assert.deepEqual(avanceRuta([], {}), { hechas: 0, total: 0, porcentaje: 0, siguiente: null });
  guardarUtil("a/uno", "si", s);
  assert.equal(utilDe("a/uno", s), "si");
  guardarUtil("a/uno", "otro", s);
  assert.equal(utilDe("a/uno", s), null);
  const roto = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => { throw new Error("lleno"); } };
  assert.deepEqual(leidas(roto), {});
  assert.doesNotThrow(() => marcarLeida("x/y", true, { s: roto }));
  datos.set("adamia.ayuda.leidas.v1", "{no es json");
  assert.deepEqual(leidas(s), {});
});

test("imágenes: ancho y alto de PNG, JPEG y WebP desde la cabecera", () => {
  const png = Buffer.alloc(24); png.writeUInt32BE(0x89504e47, 0); png.writeUInt32BE(1440, 16); png.writeUInt32BE(900, 20);
  assert.deepEqual(medidasImagen(png), { ancho: 1440, alto: 900 });
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x03, 0x4c, 0x01, 0x86, 0x03, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(medidasImagen(jpg), { alto: 844, ancho: 390 });
  const webp = Buffer.alloc(30); webp.write("RIFF", 0); webp.write("WEBP", 8); webp.write("VP8X", 12); webp.writeUIntLE(389, 24, 3); webp.writeUIntLE(843, 27, 3);
  assert.deepEqual(medidasImagen(webp), { ancho: 390, alto: 844 });
  assert.equal(medidasImagen(Buffer.from("hola")), null);
});

test("JSON-LD seguro: no puede cerrar la etiqueta <script>", () => {
  assert.doesNotMatch(jsonSeguro({ x: "</script><script>alert(1)</script>" }), /<\/?script/i);
  assert.deepEqual(JSON.parse(jsonSeguro({ x: "<a & b>" })), { x: "<a & b>" });
});

// ───────── contenido real ─────────
const ayuda = leerAyuda({ raiz: RAIZ });

function rutasDeApp() {
  const salida = [];
  const visitar = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) visitar(p);
      else {
        const r = rutaDeArchivo(path.relative(path.join(RAIZ, "src/app"), p));
        if (r) salida.push(r);
      }
    }
  };
  visitar(path.join(RAIZ, "src/app"));
  return salida;
}
const RUTAS_APP = rutasDeApp();
const existeEnApp = (ruta) => RUTAS_APP.some((patron) => coincide(patron, ruta));

test("contenido: hay guías, módulos y rutas de capacitación", () => {
  assert.ok(ayuda.guias.length >= 10, `guías: ${ayuda.guias.length}`);
  assert.ok(ayuda.modulos.some((m) => m.slug === "comunicados") && ayuda.modulos.some((m) => m.slug === "primeros-pasos"));
  assert.ok(ayuda.rutas.length >= 3);
});

test("contenido: cada archivo tiene frontmatter válido y solo el subconjunto de Markdown", () => {
  const errores = ayuda.problemas.filter((p) => p.nivel === "error").map((p) => `${p.archivo}${p.linea ? `:${p.linea}` : ""} — ${p.mensaje}`);
  ayuda.problemas.filter((p) => p.nivel === "aviso").forEach((p) => avisar(`${p.archivo}: ${p.mensaje}`));
  assert.deepEqual(errores, []);
  const slugs = ayuda.guias.map((g) => g.slug);
  assert.equal(new Set(slugs).size, slugs.length, "sin guías repetidas");
});

test("contenido: cada guía sigue la plantilla (para qué sirve, quién, antes, paso a paso, FAQ, qué pasa si, relacionado)", () => {
  const faltan = [];
  const SECCIONES = [/^para que sirve$/, /^quien la usa$/, /^antes de empezar$/, /^como /, /^preguntas frecuentes$/, /^que pasa si/, /^relacionado$/];
  const norm = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  for (const g of ayuda.guias) {
    const h2 = g.toc.map((s) => norm(s.texto));
    for (const re of SECCIONES) if (!h2.some((t) => re.test(t))) faltan.push(`${g.archivo}: falta «## ${re.source.replace(/[\^$]/g, "").replace(/^como $/, "Cómo …")}»`);
  }
  // Las guías de los demás bloques llegan en paralelo: la plantilla es advertencia, salvo en las de este bloque.
  const propias = faltan.filter((f) => /\/(comunicados|primeros-pasos)\//.test(f));
  faltan.filter((f) => !propias.includes(f)).forEach(avisar);
  assert.deepEqual(propias, []);
});

test("contenido: imágenes y enlaces internos existen (y las anclas también)", () => {
  const malos = [];
  const porUrl = new Map(ayuda.guias.map((g) => [g.url, g]));
  const anclasDe = (g) => new Set(g.toc.flatMap((s) => [s.id, ...s.sub.map((x) => x.id)]));
  const urlsAyuda = new Set(["/ayuda", ...ayuda.modulos.map((m) => m.url), ...ayuda.rutas.map((r) => r.url), ...ayuda.guias.map((g) => g.url)]);
  const revisarEnlace = (origen, href) => {
    if (/^https:\/\//.test(href)) return;
    const [ruta, ancla] = href.split("#");
    if (!ruta) { if (origen.toc && !anclasDe(origen).has(ancla)) malos.push(`${origen.archivo}: ancla #${ancla} no existe`); return; }
    if (ruta.startsWith("/ayuda")) {
      if (!urlsAyuda.has(ruta.replace(/\/$/, ""))) malos.push(`${origen.archivo}: enlace a ${ruta} (no existe esa guía)`);
      else if (ancla && porUrl.has(ruta) && !anclasDe(porUrl.get(ruta)).has(ancla)) malos.push(`${origen.archivo}: ${href} (no existe el ancla)`);
      return;
    }
    if (!existeEnApp(ruta)) malos.push(`${origen.archivo}: enlace a ${ruta} (no existe en src/app)`);
  };
  for (const x of [...ayuda.guias, ...ayuda.rutas, ...ayuda.modulos.filter((m) => m.portada).map((m) => ({ ...m.portada, archivo: `${m.slug}/index.md` }))]) {
    recorrer(x.bloques ?? [], {
      imagen: (src) => {
        if (!src.startsWith("/ayuda/capturas/")) malos.push(`${x.archivo}: la imagen ${src} debe ir en /ayuda/capturas/<modulo>/`);
        else if (!existsSync(path.join(RAIZ, "public", src))) malos.push(`${x.archivo}: no existe public${src}`);
        else if (statSync(path.join(RAIZ, "public", src)).size > 250 * 1024) avisar(`${x.archivo}: ${src} pesa más de 250 KB`);
      },
      enlace: (href) => revisarEnlace(x, href),
    });
  }
  for (const r of ayuda.rutas) for (const s of r.guias) if (!ayuda.guias.some((g) => g.slug === s)) {
    // Una ruta puede nombrar guías de otro bloque que todavía no llegan: advertencia mientras la cobertura no sea estricta.
    (COBERTURA_ESTRICTA ? malos : avisos).push(`${r.archivo}: la guía ${s} no existe`);
  }
  assert.deepEqual(malos, []);
});

test("contenido: «pantallas» existen en src/app y «fuentes» existen en el repositorio", () => {
  const malos = [];
  for (const g of ayuda.guias) {
    for (const p of g.pantallas) if (!existeEnApp(p)) malos.push(`${g.archivo}: pantalla ${p} no existe en src/app`);
    for (const f of g.fuentes) if (!existsSync(path.join(RAIZ, f))) malos.push(`${g.archivo}: fuente ${f} no existe`);
  }
  assert.deepEqual(malos, []);
});

test("contenido público: sin variables de entorno, direcciones internas ni llaves", () => {
  const malos = [];
  for (const x of [...ayuda.guias, ...ayuda.rutas]) {
    const texto = [x.titulo, x.resumen, (x.palabras ?? []).join(" "), textoPlano(x.bloques)].join("\n");
    const enlaces = [];
    recorrer(x.bloques, { enlace: (h) => enlaces.push(h), imagen: (s) => enlaces.push(s) });
    for (const [re, motivo] of PROHIBIDO) if (re.test(texto) || enlaces.some((h) => re.test(h))) malos.push(`${x.archivo}: ${motivo}`);
  }
  const indice = JSON.stringify(indicePublico(ayuda));
  assert.doesNotMatch(indice, /"fuentes"|src\/components|src\/app/, "el índice público no lleva las fuentes");
  assert.deepEqual(malos, []);
});

test("cobertura: cada pantalla del panel y de Mi espacio tiene al menos una guía", () => {
  const pantallas = RUTAS_APP.filter((r) => r === "/panel" || r.startsWith("/panel/") || r === "/empleado" || r.startsWith("/empleado/")).sort();
  const sinGuia = pantallas.filter((p) => !EXCLUIDAS.has(p) && !guiasDePantalla(ayuda.guias, rutaRepresentativa(p)).length);
  for (const e of EXCLUIDAS.keys()) assert.ok(pantallas.includes(e), `la exclusión ${e} ya no existe en src/app: quítala`);
  const mensaje = `${sinGuia.length} de ${pantallas.length - EXCLUIDAS.size} pantallas sin guía: ${sinGuia.join(", ")}`;
  if (COBERTURA_ESTRICTA) assert.deepEqual(sinGuia, [], mensaje);
  else if (sinGuia.length) avisar(`cobertura (aún no estricta): ${mensaje}`);
  // Lo de este bloque sí es estricto desde hoy: Comunicados, Mi espacio (inicio) y la propia Ayuda.
  const propias = ["/panel/muro", "/panel/comunicados/[id]", "/panel/comunicados/[id]/editar", "/panel/comunicados/administrar", "/panel/comunicados/automaticos", "/panel/comunicados/moderacion", "/panel/comunicados/nuevo", "/empleado/panel/muro", "/empleado/panel/muro/[id]", "/empleado/panel/muro/publicar", "/empleado/panel/inicio", "/empleado/panel/mi-espacio", "/panel/ayuda", "/empleado/panel/ayuda", "/panel/dashboard"];
  assert.deepEqual(propias.filter((p) => sinGuia.includes(p)), []);
});

test("vigencia: avisa si una fuente cambió después de «actualizado» (git)", () => {
  let git = true;
  try { execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: RAIZ, stdio: "ignore" }); } catch { git = false; }
  if (!git) { avisar("vigencia: sin git, no se revisaron las fechas de las fuentes"); return; }
  for (const g of ayuda.guias) {
    for (const f of g.fuentes) {
      let fecha = "";
      try { fecha = execFileSync("git", ["log", "-1", "--format=%cs", "--", f], { cwd: RAIZ, encoding: "utf8" }).trim(); } catch { fecha = ""; }
      if (fecha && g.actualizado && fecha > g.actualizado) avisar(`vigencia: ${g.archivo} (actualizado ${g.actualizado}) — ${f} cambió el ${fecha}: revisa la guía`);
    }
  }
});

test("SEO: cada guía produce JSON-LD válido (artículo, migas y, si aplica, HowTo y FAQPage)", () => {
  for (const g of ayuda.guias) {
    const datos = datosGuia(g, { sitio: "https://adamia.com.mx", modulo: ayuda.modulos.find((m) => m.slug === g.carpeta) });
    const tipos = datos.map((d) => d["@type"]);
    assert.ok(tipos.includes("TechArticle") && tipos.includes("BreadcrumbList"), g.slug);
    if (g.faq.length) assert.ok(tipos.includes("FAQPage"), `${g.slug}: FAQPage`);
    for (const d of datos) assert.doesNotThrow(() => JSON.parse(jsonSeguro(d)));
  }
});
