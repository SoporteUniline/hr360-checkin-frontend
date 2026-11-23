// Pruebas de las reglas puras del agente entrevistador de WhatsApp (R2). Uso: node --test scripts/test-whatsapp-agente.mjs
import assert from "node:assert/strict";
import test from "node:test";
import {
  etiquetaCalificacion, etiquetaEtapa, etiquetaSeveridad, normalizarPuntaje, textoConsentimiento, FILTROS, paramsFiltro,
  preguntaNueva, cambiarTipo, preguntaDesdeApi, moverPregunta, validarPreguntas, describirFueraDeRango, vistaPreviaPregunta,
  textoConteoPreguntas, contarPreguntas, MAX_PREGUNTAS, DIAS, horarioBase, copiarLunesATodos, validarHorario, agregarPalabras,
  agenteDesdeApi, validarAgente, separarPalabras, textoPalabras, textoPreguntaActual,
} from "../src/lib/whatsapp/entrevista.mjs";
import { etiquetaActor } from "../src/lib/whatsapp/reglas.mjs";

test("calificación, etapa, severidad y consentimiento", () => {
  assert.deepEqual(etiquetaCalificacion("califica"), { texto: "Califica", tono: "verde" });
  assert.deepEqual(etiquetaCalificacion("con_alerta"), { texto: "Con alerta", tono: "ambar" });
  assert.deepEqual(etiquetaCalificacion("no_califica"), { texto: "No califica", tono: "rojo" });
  assert.deepEqual(etiquetaCalificacion("incompleto"), { texto: "Incompleto", tono: "gris" });
  assert.equal(etiquetaCalificacion(null), null);
  assert.equal(etiquetaCalificacion("otra"), null);
  assert.equal(etiquetaEtapa("preguntas"), "Respondiendo preguntas");
  assert.equal(etiquetaEtapa("humano"), "Pasó a una persona");
  assert.equal(etiquetaEtapa(undefined), "Sin iniciar");
  assert.equal(etiquetaSeveridad("descarta").simbolo, "✕");
  assert.equal(etiquetaSeveridad("alerta").simbolo, "⚠");
  assert.equal(etiquetaSeveridad("ok").simbolo, "✓");
  assert.equal(etiquetaSeveridad("rara").simbolo, "✓", "desconocida se muestra como sin problema");
  assert.equal(textoConsentimiento(true), "Aceptó el aviso de privacidad");
  assert.equal(textoConsentimiento(false), "No aceptó el aviso de privacidad");
  assert.equal(textoConsentimiento(null), "Aún no responde al aviso de privacidad");
});

test("puntajes de 1 a 5", () => {
  assert.equal(normalizarPuntaje(4), 4);
  assert.equal(normalizarPuntaje("3.6"), 4);
  assert.equal(normalizarPuntaje(9), 5);
  assert.equal(normalizarPuntaje(0), 1);
  assert.equal(normalizarPuntaje(null), null);
  assert.equal(normalizarPuntaje("x"), null);
});

test("filtros de la bandeja → parámetros de consulta", () => {
  assert.deepEqual(FILTROS.map((f) => f.texto), ["Todos", "Requiere atención", "Califica", "Con alerta", "No califica", "Incompleto"]);
  assert.deepEqual(paramsFiltro("todos"), {});
  assert.deepEqual(paramsFiltro("atencion"), { atencion: 1 });
  assert.deepEqual(paramsFiltro("no_califica"), { calificacion: "no_califica" });
  assert.deepEqual(paramsFiltro("desconocido"), {});
});

test("etiqueta del agente con su nombre", () => {
  assert.equal(etiquetaActor({ actor: "ia" }), "Asistente IA");
  assert.equal(etiquetaActor({ actor: "ia" }, "  Sofía  "), "Sofía");
  assert.equal(etiquetaActor({ actor: "reclutador", usuario: { nombre: "Laura" } }, "Sofía"), "Laura");
});

test("pregunta del API ↔ formulario ↔ cuerpo del PUT", () => {
  const api = [
    { id: 11, orden: 1, texto: "¿Tienes licencia tipo C?", tipo: "si_no", opciones: ["Sí", "No"], descartan: ["No"], alertan: [], activa: true },
    { id: 12, orden: 2, texto: "¿Qué turno prefieres?", tipo: "opciones", opciones: ["Matutino", "Nocturno", "Mixto"], descartan: [], alertan: ["nocturno"], activa: true },
    { id: 13, orden: 3, texto: "¿Cuántos años tienes?", tipo: "numero", opciones: null, descartan: { min: 18 }, alertan: { min: 18, max: 55 }, activa: true },
    { id: 14, orden: 4, texto: "Cuéntanos de tu último empleo", tipo: "texto", opciones: null, descartan: null, alertan: null, activa: false },
  ];
  const form = api.map(preguntaDesdeApi);
  assert.deepEqual(form[0].opciones.map((o) => [o.texto, o.efecto]), [["Sí", "ok"], ["No", "descarta"]]);
  assert.deepEqual(form[1].opciones.map((o) => o.efecto), ["ok", "alerta", "ok"], "compara sin mayúsculas");
  assert.deepEqual(form[2].descarta, { min: "18", max: "" });
  assert.deepEqual(form[2].alerta, { min: "18", max: "55" });
  const r = validarPreguntas(form);
  assert.equal(r.valido, true, JSON.stringify(r.errores));
  assert.deepEqual(r.cuerpo.preguntas, [
    { id: 11, orden: 1, texto: "¿Tienes licencia tipo C?", tipo: "si_no", opciones: ["Sí", "No"], descartan: ["No"], alertan: [], activa: true },
    { id: 12, orden: 2, texto: "¿Qué turno prefieres?", tipo: "opciones", opciones: ["Matutino", "Nocturno", "Mixto"], descartan: [], alertan: ["Nocturno"], activa: true },
    { id: 13, orden: 3, texto: "¿Cuántos años tienes?", tipo: "numero", opciones: null, descartan: { min: 18 }, alertan: { min: 18, max: 55 }, activa: true },
    { id: 14, orden: 4, texto: "Cuéntanos de tu último empleo", tipo: "texto", opciones: null, descartan: null, alertan: null, activa: false },
  ]);
  // Reordenar cambia el orden del cuerpo.
  const movida = moverPregunta(moverPregunta(form, 2, -1), 1, -1);
  assert.deepEqual(validarPreguntas(movida).cuerpo.preguntas.map((p) => [p.id, p.orden]), [[13, 1], [11, 2], [12, 3], [14, 4]]);
  assert.equal(moverPregunta(form, 0, -1), form, "no sube la primera");
  assert.equal(moverPregunta(form, 3, 1), form, "no baja la última");
  // Pregunta nueva sin id no manda id.
  const nueva = { ...preguntaNueva("texto"), texto: "  ¿Por qué   te interesa? " };
  assert.deepEqual(validarPreguntas([nueva]).cuerpo.preguntas[0], { orden: 1, texto: "¿Por qué te interesa?", tipo: "texto", opciones: null, descartan: null, alertan: null, activa: true });
});

test("validación del formulario de preguntas", () => {
  const vacia = preguntaNueva("si_no");
  let r = validarPreguntas([vacia]);
  assert.equal(r.valido, false);
  assert.equal(r.errores[0].texto, "Escribe la pregunta.");
  assert.equal(r.general, "Revisa las preguntas marcadas.");
  // Opciones vacías, una sola, repetidas.
  const op = { ...preguntaNueva("opciones"), texto: "¿Turno?" };
  assert.equal(validarPreguntas([op]).errores[0].opciones, "No dejes opciones vacías.");
  op.opciones = [{ clave: "a", texto: "Matutino", efecto: "ok" }];
  assert.equal(validarPreguntas([op]).errores[0].opciones, "Agrega al menos 2 opciones.");
  op.opciones = [{ clave: "a", texto: "Matutino", efecto: "ok" }, { clave: "b", texto: " matutino ", efecto: "ok" }];
  assert.equal(validarPreguntas([op]).errores[0].opciones, "Hay opciones repetidas.");
  // Todas descartan: nadie pasaría.
  const sn = { ...preguntaNueva("si_no"), texto: "¿Puedes rolar turnos?" };
  sn.opciones = sn.opciones.map((o) => ({ ...o, efecto: "descarta" }));
  assert.equal(validarPreguntas([sn]).errores[0].descartan, "Al menos una respuesta debe dejar pasar al candidato.");
  // Rangos numéricos.
  const num = { ...preguntaNueva("numero"), texto: "¿Edad?", descarta: { min: "30", max: "20" }, alerta: { min: "abc", max: "" } };
  r = validarPreguntas([num]);
  assert.match(r.errores[0].descartan, /mínimo no puede ser mayor/);
  assert.match(r.errores[0].alertan, /números válidos/);
  num.descarta = { min: "", max: "" };
  num.alerta = { min: "", max: "" };
  r = validarPreguntas([num]);
  assert.equal(r.valido, true);
  assert.equal(r.cuerpo.preguntas[0].descartan, null, "rango vacío → null");
  // Repetidas y máximo de 8.
  r = validarPreguntas([{ ...preguntaNueva("texto"), texto: "¿Edad?" }, { ...preguntaNueva("texto"), texto: "¿edad?" }]);
  assert.equal(r.errores[1].texto, "Esta pregunta está repetida.");
  const nueve = Array.from({ length: MAX_PREGUNTAS + 1 }, (_, i) => ({ ...preguntaNueva("texto"), texto: `Pregunta ${i}` }));
  assert.equal(validarPreguntas(nueve).general, "Máximo 8 preguntas por vacante.");
  assert.equal(validarPreguntas(nueve).valido, false);
  // Texto demasiado largo.
  assert.match(validarPreguntas([{ ...preguntaNueva("texto"), texto: "x".repeat(301) }]).errores[0].texto, /300/);
});

test("cambiar tipo conserva el texto y reinicia lo demás", () => {
  const p = { ...preguntaNueva("si_no"), id: 9, texto: "¿Edad?" };
  const n = cambiarTipo(p, "numero");
  assert.equal(n.texto, "¿Edad?");
  assert.equal(n.id, 9);
  assert.equal(n.clave, p.clave);
  assert.deepEqual(n.opciones, []);
  assert.equal(cambiarTipo(p, "inventado"), p);
  assert.deepEqual(cambiarTipo(p, "opciones").opciones.map((o) => o.texto), ["", ""]);
});

test("vista previa y rangos (rango aceptado: fuera descarta o alerta)", () => {
  assert.equal(describirFueraDeRango({ min: "18", max: "" }), "menos de 18");
  assert.equal(describirFueraDeRango({ min: "", max: "60" }), "más de 60");
  assert.equal(describirFueraDeRango({ min: "1", max: "3" }), "fuera de 1 a 3");
  assert.equal(describirFueraDeRango({ min: "", max: "" }), "");
  assert.equal(describirFueraDeRango({ min: "18", max: "17" }), "", "rango inválido no se describe");
  const sn = preguntaDesdeApi({ texto: "¿Tienes licencia tipo C?", tipo: "si_no", descartan: ["No"], alertan: [] });
  assert.equal(vistaPreviaPregunta(sn), "Ej.: ¿Tienes licencia tipo C? → No descarta");
  const num = preguntaDesdeApi({ texto: "¿Edad?", tipo: "numero", descartan: { min: 18 }, alertan: { min: 18, max: 55 } });
  assert.equal(vistaPreviaPregunta(num), "Ej.: ¿Edad? → menos de 18 descarta · fuera de 18 a 55 alerta");
  assert.equal(vistaPreviaPregunta(preguntaNueva("opciones")), "Ej.: (escribe la pregunta) → cualquier respuesta pasa");
  assert.equal(vistaPreviaPregunta({ ...preguntaNueva("texto"), texto: "¿Por qué?" }), "Ej.: ¿Por qué? → solo se guarda la respuesta");
});

test("conteo de preguntas por vacante", () => {
  assert.equal(textoConteoPreguntas(0), "Sin entrevista");
  assert.equal(textoConteoPreguntas(1), "1 pregunta");
  assert.equal(textoConteoPreguntas(3), "3 preguntas");
  assert.equal(contarPreguntas({ preguntas: [{ activa: true }, { activa: false }, {}] }), 2);
  assert.equal(contarPreguntas(null), 0);
});

test("horario del agente (claves lun..dom)", () => {
  const h = horarioBase();
  assert.deepEqual(Object.keys(h), ["lun", "mar", "mie", "jue", "vie", "sab", "dom"]);
  assert.deepEqual(DIAS.map((d) => d.clave), Object.keys(h));
  assert.deepEqual(h.lun, { desde: "09:00", hasta: "18:00" });
  assert.equal(h.dom, null);
  const copia = copiarLunesATodos({ ...h, lun: { desde: "08:00", hasta: "14:00" } });
  assert.ok(DIAS.every(({ clave }) => copia[clave].desde === "08:00" && copia[clave].hasta === "14:00"));
  assert.ok(DIAS.every(({ clave }) => copiarLunesATodos({ lun: null })[clave] === null), "lunes cerrado → todos cerrados");
  assert.deepEqual(validarHorario({ lun: { desde: "18:00", hasta: "09:00" } }).errores, { lun: "Lunes: la hora de fin debe ser después de la de inicio." });
  assert.deepEqual(validarHorario({ mar: { desde: "", hasta: "10:00" } }).errores, { mar: "Martes: escribe la hora de inicio y de fin." });
  assert.deepEqual(validarHorario({ lun: { desde: "09:00:00", hasta: "18:00:00" } }).horario.lun, { desde: "09:00", hasta: "18:00" }, "acepta HH:MM:SS");
});

test("palabras para pasar a una persona: texto separado por comas", () => {
  assert.deepEqual(agregarPalabras(["humano"], "asesor, Humano,\npersona real").palabras, ["humano", "asesor", "persona real"]);
  assert.match(agregarPalabras([], "x".repeat(61)).error, /60 caracteres/);
  assert.deepEqual(separarPalabras(" humano ,asesor,, Humano "), ["humano", "asesor"]);
  assert.deepEqual(separarPalabras(null), []);
  assert.equal(textoPalabras(["humano", "hablar con alguien"]), "humano, hablar con alguien");
  // Tope de 500 caracteres del texto completo.
  const muchas = Array.from({ length: 60 }, (_, i) => `palabra${i}`);
  const r = agregarPalabras([], muchas.join(","));
  assert.match(r.error, /500 caracteres/);
  assert.ok(textoPalabras(r.palabras).length <= 500);
});

test("configuración del agente: API → formulario → PUT", () => {
  const api = {
    id_empresa: 10, activo: true, nombre_asistente: "Sofía", horario_json: { lun: { desde: "09:00", hasta: "18:00" }, mar: null },
    mensaje_fuera_horario: "Te respondo mañana.", respuestas_frecuentes: "Pagamos quincenal.", palabras_humano: "humano, asesor",
    aviso_privacidad_url: "https://dev.adamia.com.mx/aviso",
  };
  const form = agenteDesdeApi(api);
  assert.equal(form.usaHorario, true);
  assert.equal(form.horario.dom, null);
  assert.deepEqual(form.palabras_humano, ["humano", "asesor"]);
  const r = validarAgente(form);
  assert.equal(r.valido, true, JSON.stringify(r.errores));
  assert.deepEqual(r.cuerpo, {
    activo: true, nombre_asistente: "Sofía",
    horario_json: { lun: { desde: "09:00", hasta: "18:00" }, mar: null, mie: null, jue: null, vie: null, sab: null, dom: null },
    mensaje_fuera_horario: "Te respondo mañana.", respuestas_frecuentes: "Pagamos quincenal.", palabras_humano: "humano, asesor",
  });
  // horario_json null = siempre disponible: no exige mensaje fuera de horario.
  const libre = validarAgente(agenteDesdeApi({ activo: false, nombre_asistente: "Ana", horario_json: null, palabras_humano: "" }));
  assert.equal(libre.valido, true);
  assert.equal(libre.cuerpo.horario_json, null);
  assert.equal(libre.cuerpo.palabras_humano, "");
  assert.equal(agenteDesdeApi(null).usaHorario, false);
  // Límites del API: nombre 1–60, fuera de horario ≤500, frecuentes ≤8000.
  assert.equal(validarAgente({ ...form, nombre_asistente: "x".repeat(60) }).valido, true);
  assert.match(validarAgente({ ...form, nombre_asistente: "x".repeat(61) }).errores.nombre_asistente, /60/);
  assert.match(validarAgente({ ...form, respuestas_frecuentes: "x".repeat(8001) }).errores.respuestas_frecuentes, /8000/);
  assert.equal(validarAgente({ ...form, respuestas_frecuentes: "x".repeat(8000) }).valido, true);
  assert.match(validarAgente({ ...form, mensaje_fuera_horario: "x".repeat(501) }).errores.mensaje_fuera_horario, /500/);
  const malo = validarAgente({ ...form, nombre_asistente: " ", mensaje_fuera_horario: "", horario: { ...form.horario, mar: { desde: "10:00", hasta: "09:00" } } });
  assert.equal(malo.valido, false);
  assert.match(malo.errores.nombre_asistente, /Escribe cómo se presenta/);
  assert.match(malo.errores.mensaje_fuera_horario, /fuera de horario/);
  assert.match(malo.errores.horario.mar, /hora de fin/);
  const sinDias = validarAgente({ ...form, horario: Object.fromEntries(DIAS.map((d) => [d.clave, null])) });
  assert.match(sinDias.errores.horario.general, /Siempre disponible/);
});

test("pregunta en curso", () => {
  assert.equal(textoPreguntaActual(" ¿Edad? "), "¿Edad?");
  assert.equal(textoPreguntaActual({ texto: "¿Turno?" }), "¿Turno?");
  assert.equal(textoPreguntaActual(null), "");
});

test("teléfonos de Norteamérica (número compartido de ADAMIA) sin cambiar los de México", async () => {
  const { formatearTelefono } = await import("../src/lib/whatsapp/telefono.mjs");
  assert.equal(formatearTelefono("13234716585"), "+1 323 471 6585");
  assert.equal(formatearTelefono("+1 (323) 471-6585"), "+1 323 471 6585");
  assert.equal(formatearTelefono("525598765432"), "+52 55 9876 5432");
  assert.equal(formatearTelefono("5215512345678"), "+52 55 1234 5678");
  assert.equal(formatearTelefono("5214421234567"), "+52 442 123 4567");
  assert.equal(formatearTelefono("5512345678"), "+52 55 1234 5678");
  assert.equal(formatearTelefono("447700900123"), "+447700900123", "otros países sin formato");
});

test("pregunta actual: el servidor manda el número de la pregunta", async () => {
  const { textoPreguntaActual } = await import("../src/lib/whatsapp/entrevista.mjs");
  assert.equal(textoPreguntaActual(2), "Pregunta 2");
  assert.equal(textoPreguntaActual("3"), "Pregunta 3");
  assert.equal(textoPreguntaActual({ texto: "¿Tienes licencia?" }), "¿Tienes licencia?");
  assert.equal(textoPreguntaActual(null), "");
});
