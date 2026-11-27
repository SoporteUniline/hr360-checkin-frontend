// Centro de comunicados (27/11/2026): reglas de presentación (src/lib/comunicados/comunicados.mjs) y el service worker de
// Web Push (public/comunicados-push-sw.js), sin red ni React.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as C from "../src/lib/comunicados/comunicados.mjs";
import { modulosDeRuta } from "../src/lib/modulos/catalogo.mjs";
import { areaDeRuta, plantilla } from "../src/lib/permisos/permisos.mjs";

const TZ = { tz: "America/Mexico_City", ahora: new Date("2026-11-27T18:00:00Z") }; // 12:00 en CDMX, viernes

test("rutas del módulo (se apagan con «comunicados») y área de permisos; RH lo edita", () => {
  for (const r of [C.RUTA_PANEL, C.RUTA_NUEVO, C.RUTA_AUTOMATICOS, C.RUTA_MODERACION, C.rutaSeguimiento(5), C.rutaEditar(5), C.RUTA_MURO, C.rutaPost(9), C.RUTA_PUBLICAR]) {
    assert.deepEqual(modulosDeRuta(r), ["comunicados"], r);
  }
  assert.deepEqual(areaDeRuta(C.rutaSeguimiento(3)), ["comunicados"]);
  assert.equal(plantilla("recursos_humanos").permisos.comunicados, "editar");
  assert.equal(plantilla("reclutador").permisos.comunicados, "sin_acceso");
  assert.equal(C.rutaPost("a/b"), "/empleado/panel/muro/a%2Fb");
});

test("fechas en la zona de la empresa: Hoy 9:00, Ayer 18:20, día de la semana, 24 nov; texto sin zona = hora de la empresa", () => {
  assert.equal(C.fechaRelativa("2026-11-27T15:00:00Z", TZ), "Hoy 9:00");
  assert.equal(C.fechaRelativa("2026-11-27 09:00:00", TZ), "Hoy 9:00");
  assert.equal(C.fechaRelativa("2026-11-26 18:20:00", TZ), "Ayer 18:20");
  assert.equal(C.fechaRelativa("2026-11-23 10:00:00", TZ), "Lunes");
  assert.equal(C.fechaRelativa("2026-11-18 10:00:00", TZ), "18 nov");
  assert.equal(C.fechaRelativa("2025-11-18", TZ), "18 nov 2025");
  assert.equal(C.fechaRelativa(null, TZ), "");
  assert.equal(C.fechaProgramada("2026-12-01 07:00:00", TZ), "el martes 1 a las 7:00");
  assert.equal(C.fechaEvento("2026-12-03T10:00", TZ), "Jueves 3 de diciembre, 10:00");
  assert.equal(C.fechaHora("2026-11-27 09:14:00", TZ), "27/11/2026 9:14");
  assert.equal(C.haceCuanto("2026-11-27T17:20:00Z", TZ), "40 min");
  assert.equal(C.haceCuanto("2026-11-27T16:00:00Z", TZ), "2 h");
  assert.equal(C.haceCuanto("2026-11-26 10:00:00", TZ), "Ayer");
});

test("tabla del panel: canales, lectura, estado y «para» como en la maqueta", () => {
  assert.equal(C.textoCanales({ push: true, correo: true, popup: true }), "App · Correo · Push · Aviso");
  assert.equal(C.textoCanales({ push: true }), "App · Push");
  assert.equal(C.textoCanales(["correo", "popup"]), "App · Correo · Aviso");
  assert.equal(C.textoLectura({ estado: "publicado", nivel: "confirmacion", confirmados: 30, total: 42 }), "30 de 42 confirmaron");
  assert.equal(C.textoLectura({ estado: "publicado", nivel: "normal", tipo: "cumpleanos", vistos: 121, reacciones: 38 }), "121 lo vieron · 38 felicitaciones");
  assert.equal(C.textoLectura({ estado: "publicado", nivel: "normal", tipo: "evento", vistos: 164, reacciones: 9 }), "164 lo vieron");
  assert.equal(C.textoLectura({ estado: "programado", publicar_en: "2026-12-01 07:00:00" }, TZ), "Se publica el martes 1 a las 7:00");
  assert.deepEqual(C.etiquetaEstado({ estado: "publicado", nivel: "confirmacion", confirmados: 54, total: 54 }).texto, "Confirmación completa");
  assert.deepEqual(C.etiquetaEstado({ estado: "publicado", nivel: "confirmacion", confirmados: 30, total: 42 }).texto, "Requiere confirmación");
  assert.deepEqual(C.etiquetaEstado({ estado: "publicado", automatico: true }).texto, "Automático");
  assert.deepEqual(C.etiquetaEstado({ estado: "pendiente_aprobacion" }).texto, "Por aprobar");
  assert.equal(C.textoPara({ audiencia_texto: "Sucursal Centro", total: 42 }), "Sucursal Centro · 42");
  assert.equal(C.textoTipo("politica"), "Política");
  assert.equal(C.textoTipo("aviso_general"), "Aviso general");
  assert.deepEqual(C.tarjetasResumen({ publicados_mes: 12, lectura_promedio: 84.4, confirmaciones_pendientes: 18, programados: 3 }).map((t) => t.valor), ["12", "84 %", "18 personas", "3"]);
  assert.equal(C.urlListado({ filtro: "confirmacion", q: " posada ", pagina: 2, empresa: 7 }), "/checador/comunicados?nivel=confirmacion&q=posada&pagina=2&empresa=7");
  assert.equal(C.urlListado(), "/checador/comunicados");
  assert.deepEqual(C.filtrarLocal([{ id: 1, automatico: true }, { id: 2 }], "automaticos").map((x) => x.id), [1]);
});

test("seguimiento: estados por persona, tarjetas, faltan y entregas por canal", () => {
  assert.deepEqual(C.textoDestinatario({ estado: "visto", visto_en: "2026-11-27 09:14:00" }, TZ).texto, "Abrió 9:14, sin confirmar");
  assert.deepEqual(C.textoDestinatario({ estado: "no_visto" }).texto, "No lo ha abierto");
  assert.deepEqual(C.textoDestinatario({ estado: "sin_canal" }).texto, "Sin app ni correo");
  assert.match(C.textoDestinatario({ estado: "sin_canal", avisado_persona_por: "Laura Ríos", avisado_persona_en: "2026-11-27 10:05:00" }, TZ).texto, /Avisado en persona por Laura Ríos · 27\/11\/2026 10:05/);
  assert.match(C.textoDestinatario({ estado: "confirmado", confirmado_en: "2026-11-27 09:30:00" }, TZ).texto, /Confirmó 9:30/);
  const conteos = { confirmados: 30, vistos: 5, no_vistos: 4, sin_canal: 3 };
  assert.deepEqual(C.tarjetasSeguimiento(conteos, "confirmacion").map((t) => t.valor), [30, 5, 4, 3]);
  assert.deepEqual(C.tarjetasSeguimiento(conteos, "normal").map((t) => [t.texto, t.valor]), [["Lo vieron", 35], ["No lo han abierto", 4], ["Sin canal (avisar en persona)", 3]]);
  assert.equal(C.faltan(conteos), 12);
  assert.deepEqual(C.textoEntregas({ app: { entregados: 39 }, push: { entregados: 37, sin_permiso: 2 }, correo: { enviados: 35, rebotados: 1 }, popup: { vistos: 4, total: 4 } }).map((f) => `${f.canal}: ${f.detalle}`),
    ["App: 39 entregados", "Push: 37 entregados · 2 sin permiso", "Correo: 35 enviados · 1 rebotado", "Aviso en panel: 4 de 4 lo vieron"]);
});

test("YouTube: solo el id de 11 caracteres; reproductor sin cookies; nada que no sea YouTube", () => {
  for (const u of ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s", "youtu.be/dQw4w9WgXcQ", "https://m.youtube.com/shorts/dQw4w9WgXcQ", "https://www.youtube.com/embed/dQw4w9WgXcQ", "https://youtube.com/live/dQw4w9WgXcQ?si=x", "dQw4w9WgXcQ"]) {
    assert.equal(C.youtubeId(u), "dQw4w9WgXcQ", u);
  }
  for (const u of ["https://vimeo.com/123", "https://youtube.com/watch?v=corto", "javascript:alert(1)", "https://evil.com/watch?v=dQw4w9WgXcQ", "", null]) assert.equal(C.youtubeId(u), null, String(u));
  assert.equal(C.urlEmbed("dQw4w9WgXcQ"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0");
  assert.equal(C.urlEmbed("\"><script>"), null);
  assert.equal(C.urlMiniatura("dQw4w9WgXcQ"), "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  assert.equal(C.enlaceSeguro("https://uniline.mx/posada"), "https://uniline.mx/posada");
  assert.equal(C.enlaceSeguro("http://uniline.mx"), null);
  assert.equal(C.enlaceSeguro("javascript:alert(1)"), null);
});

test("archivos: hasta 10 fotos JPG/PNG/WebP de 8 MB y un PDF de 15 MB (aviso antes de subir)", () => {
  const foto = (type = "image/jpeg", size = 1000) => ({ type, size, name: "f" });
  assert.deepEqual(C.validarArchivos({ fotos: [foto(), foto("image/png"), foto("image/webp")] }), {});
  assert.match(C.validarArchivos({ fotos: Array.from({ length: 11 }, () => foto()) }).fotos, /Hasta 10/);
  assert.match(C.validarArchivos({ fotos: [foto()], previas: 10 }).fotos, /Hasta 10/);
  assert.match(C.validarArchivos({ fotos: [foto("image/gif")] }).fotos, /JPG, PNG o WebP/);
  assert.match(C.validarArchivos({ fotos: [foto("image/jpeg", 9 * 1024 * 1024)] }).fotos, /8 MB/);
  assert.match(C.validarArchivos({ pdf: { type: "application/pdf", size: 16 * 1024 * 1024, name: "a.pdf" } }).pdf, /15 MB/);
  assert.match(C.validarArchivos({ pdf: { type: "text/plain", size: 10, name: "a.txt" } }).pdf, /PDF/);
  assert.equal(C.validarPortada({ type: "image/webp", size: 100 }), null);
  assert.match(C.validarPortada({ type: "image/svg+xml", size: 100 }), /JPG, PNG o WebP/);
});

test("redactar: validación, audiencia por ids y los campos `datos` del contrato", () => {
  const f = { ...C.formularioVacio(), titulo: " Auditoría ", cuerpo: "Texto", nivel: "confirmacion", audiencia: { ...C.audienciaVacia(), sucursales: [{ id: 3, nombre: "Centro" }], empleados: [{ id: 44, nombre: "Ana" }, { id: 44, nombre: "Ana" }] }, canales: { push: true, correo: true, popup: true } };
  assert.deepEqual(C.validarFormulario(f), {});
  assert.deepEqual(Object.keys(C.validarFormulario(C.formularioVacio())).sort(), ["audiencia", "cuerpo", "titulo"]);
  assert.deepEqual(Object.keys(C.validarFormulario({ ...C.formularioVacio(), titulo: "x" }, { accion: "borrador" })), [], "un borrador solo pide título");
  assert.match(C.validarFormulario({ ...f, youtube_url: "https://vimeo.com/1" }).youtube_url, /YouTube/);
  assert.match(C.validarFormulario({ ...f, publicar: "programar", publicar_en: "2026-01-01T07:00" }, { ahora: TZ.ahora }).publicar_en, /futura/);
  assert.match(C.validarFormulario({ ...f, expira_en: "2026-11-01" }, { ahora: TZ.ahora }).expira_en, /después/);
  const d = C.datosParaEnviar(f, { empresa: 7 });
  assert.deepEqual(Object.keys(d).sort(), ["audiencia", "canales", "cuerpo", "empresa", "expira_en", "fecha_evento", "nivel", "permite_comentarios", "permite_reacciones", "publicar", "publicar_en", "recordatorio_auto", "recordatorios_max", "tipo", "titulo", "youtube_url"].sort());
  assert.deepEqual(d.audiencia, { todos: false, sucursales: [3], areas: [], puestos: [], empleados: [44] });
  assert.deepEqual([d.titulo, d.nivel, d.publicar, d.recordatorio_auto, d.recordatorios_max, d.publicar_en], ["Auditoría", "confirmacion", "ahora", true, 3, null]);
  assert.equal(C.datosParaEnviar({ ...f, nivel: "normal" }).recordatorio_auto, false, "normal no lleva recordatorio");
  assert.equal(C.datosParaEnviar(f, { accion: "borrador" }).publicar, "borrador");
  assert.deepEqual(C.audienciaParaEnviar({ todos: true, sucursales: [1] }), { todos: true, sucursales: [], areas: [], puestos: [], empleados: [] });
  assert.equal(C.textoPrevia({ total: 42, con_app: 39, con_correo: 35 }), "42 empleados activos · 39 con app · 35 con correo");
  assert.equal(C.textoPublicar(f, 42), "Publicar a 42 personas");
  assert.equal(C.textoPublicar({ publicar: "programar" }, 1), "Programar para 1 persona");
  assert.deepEqual(C.chipsAudiencia(f.audiencia).map((c) => c.texto), ["Sucursal: Centro", "Ana", "Ana"]);
  const g = C.formularioDe({ tipo: "evento", titulo: "Posada", estado: "programado", publicar_en: "2026-12-18 19:00:00", nivel: "normal", audiencia: { todos: true }, youtube_id: "dQw4w9WgXcQ", permite_comentarios: 0 });
  assert.deepEqual([g.publicar, g.publicar_en, g.audiencia.todos, g.youtube_url, g.permite_comentarios], ["programar", "2026-12-18T19:00", true, "https://youtu.be/dQw4w9WgXcQ", false]);
});

test("muro: me gusta optimista, fijados arriba (máx. 3), franja de pendientes, mosaico y textos", () => {
  assert.deepEqual(C.alternarMeGusta({ me_gusta: false, reacciones: 53 }), { me_gusta: true, reacciones: 54 });
  assert.deepEqual(C.alternarMeGusta({ me_gusta: true, reacciones: 0 }), { me_gusta: false, reacciones: 0 });
  assert.equal(C.textoReacciones(54, true), "Tú y 53 más");
  assert.equal(C.textoReacciones(98, false), "98 me gusta");
  assert.equal(C.textoReacciones(1, true), "Te gusta");
  assert.equal(C.textoComentarios(12), "12 comentarios");
  const { fijados, resto } = C.ordenarMuro([{ id: 1 }, { id: 2, fijado: true }, { id: 3, fijado: 1 }, { id: 4, fijado: true }, { id: 5, fijado: true }, { id: 2, fijado: true }]);
  assert.deepEqual(fijados.map((x) => x.id), [2, 3, 4]);
  assert.deepEqual(resto.map((x) => x.id), [1, 5], "sin repetidos; el cuarto fijado va en el resto");
  assert.equal(C.textoPendientes(1, { titulo: "Auditoría del jueves 3" }), "1 comunicado por confirmar: Auditoría del jueves 3");
  assert.equal(C.textoPendientes(0), "");
  assert.deepEqual(C.mosaico(7), { visibles: 3, resto: 4, clase: "tres" });
  assert.deepEqual(C.mosaico(1), { visibles: 1, resto: 0, clase: "uno" });
  assert.deepEqual(C.mosaico(4), { visibles: 4, resto: 0, clase: "cuatro" });
  assert.equal(C.porConfirmar({ nivel: "confirmacion", confirmado_en: null }), true);
  assert.equal(C.iniciales("Recursos Humanos"), "RH");
  assert.equal(C.lineaAutor({ publicado_en: "2026-11-26 18:20:00", tipo: "evento", audiencia_texto: "Toda la empresa" }, TZ), "Ayer 18:20 · Evento · Toda la empresa");
});

test("comentarios: un nivel de respuesta, ≤ 1000 caracteres", () => {
  const h = C.hilos([{ id: 1, padre_id: null }, { id: 2, padre_id: 1 }, { id: 3, padre_id: null }, { id: 4, padre_id: 1 }, { id: 5, padre_id: 99 }]);
  assert.deepEqual(h.map((c) => [c.id, c.respuestas.map((r) => r.id)]), [[1, [2, 4]], [3, []], [5, []]]);
  assert.deepEqual(C.hilos([{ id: 1, padre_id: null, respuestas: [{ id: 2, padre_id: 1 }] }, { id: 2, padre_id: 1 }])[0].respuestas.map((r) => r.id), [2], "anidado sin duplicar");
  assert.match(C.validarComentario("  "), /Escribe/);
  assert.match(C.validarComentario("x".repeat(1001)), /1000/);
  assert.equal(C.validarComentario("¡Qué buen partido!"), null);
});

test("reglas del muro, automáticos y respuestas del servidor", () => {
  assert.equal(C.quienPublica({ publican_jefes: 1, publican_empleados: 0 }), "jefes");
  assert.equal(C.quienPublica({ publican_jefes: 1, publican_empleados: 1 }), "todos");
  assert.equal(C.quienPublica({ publican_jefes: 0, publican_empleados: 0 }), "rh");
  assert.deepEqual(C.palabrasDe("Tonto, tonto\n idiota ,,"), ["tonto", "idiota"]);
  assert.deepEqual(C.normalizarConfig({ publican_jefes: 0, umbral_reportes: 0, palabras_bloqueadas: "a,b" }).palabras_bloqueadas, ["a", "b"]);
  assert.equal(C.normalizarConfig({ umbral_reportes: 0 }).umbral_reportes, 3);
  const r = C.reglasAuto([{ regla: "cumpleanos", activo: 1, audiencia: "empresa", canales: { push: true } }]);
  assert.deepEqual(r.map((x) => [x.regla, x.activo, x.audiencia]), [["cumpleanos", true, "empresa"], ["aniversario", true, "sucursal"], ["bienvenida", false, "area"], ["festivo", true, "empresa"]]);
  assert.equal(C.cuandoAuto("cumpleanos", "08:00"), "8:00 del día");
  assert.equal(C.cuandoAuto("festivo"), "2 días antes");
  assert.equal(C.textoManana({ cumpleanos: 2, aniversarios: 1 }), "Mañana: 2 cumpleaños y 1 aniversario");
  assert.equal(C.textoManana({}), "Mañana: nada programado.");
  assert.equal(C.errorDe({ response: { data: { ok: false, codigo: "X", mensaje: "Solo 3 fijadas" } } }), "Solo 3 fijadas");
  assert.equal(C.errorDe({ response: { data: { error: "Viejo" } } }), "Viejo");
  assert.match(C.errorDe({ response: { status: 503, data: { codigo: "SIN_MIGRACION" } } }), /no está instalado/);
  assert.match(C.errorDe({ request: {} }), /Sin conexión/);
  assert.deepEqual(C.popupDe({ ok: true, popup: null }), null);
  assert.deepEqual(C.popupDe({ ok: true, popup: { id: 3 } }), { id: 3 });
  assert.deepEqual(C.principal({ ok: true, comunicado: { id: 4 } }), { id: 4 });
  assert.equal(C.dispositivo("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Version/17.0 Mobile Safari/604.1"), "Safari · iOS");
  assert.equal(C.dispositivo("Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile Safari/537.36", true), "App ADAMIA · Android");
  assert.deepEqual([...C.claveVapid("AQID")], [1, 2, 3]);
});

test("service worker de push: muestra texto plano y solo abre rutas de ADAMIA", async () => {
  const fuente = await readFile(new URL("../public/comunicados-push-sw.js", import.meta.url), "utf8");
  const manejadores = new Map();
  const mostradas = [];
  const abiertas = [];
  const self = {
    location: { origin: "https://adamia.mx" },
    addEventListener: (n, h) => manejadores.set(n, h),
    skipWaiting: async () => {},
    registration: { showNotification: async (t, o) => mostradas.push([t, o]) },
    clients: { claim: async () => {}, matchAll: async () => [], openWindow: async (u) => abiertas.push(u) },
  };
  vm.runInNewContext(fuente, { self, URL });
  const esperar = async (nombre, evento) => { let p; manejadores.get(nombre)({ ...evento, waitUntil: (x) => { p = x; } }); await p; };
  await esperar("push", { data: { json: () => ({ titulo: "<b>Auditoría</b>", cuerpo: "Confirma de leído", url: "/empleado/panel/muro/5", id: 5 }) } });
  assert.equal(mostradas[0][0], "<b>Auditoría</b>", "texto tal cual (las notificaciones no interpretan HTML)");
  assert.equal(mostradas[0][1].body, "Confirma de leído");
  assert.equal(mostradas[0][1].data.url, "https://adamia.mx/empleado/panel/muro/5");
  await esperar("push", { data: { json: () => ({ titulo: "x", url: "https://evil.com/phish" }) } });
  assert.equal(mostradas[1][1].data.url, "https://adamia.mx/empleado/panel/muro", "otro dominio → al muro");
  await esperar("push", { data: { json: () => { throw new Error("no json"); }, text: () => "Hola" } });
  assert.equal(mostradas[2][0], "ADAMIA");
  await esperar("notificationclick", { notification: { close: () => {}, data: { url: "https://adamia.mx/empleado/panel/muro/5" } } });
  assert.deepEqual(abiertas, ["https://adamia.mx/empleado/panel/muro/5"]);
});
