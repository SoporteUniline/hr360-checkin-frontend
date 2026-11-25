// Lumo fase A (25/11/2026): «Sugerir con IA», base de conocimiento y requisitos de la vacante (reglas de pantalla).
// Uso: node --test scripts/test-whatsapp-lumo.mjs
import assert from "node:assert/strict";
import test from "node:test";
import {
  espacioPreguntas, filtrarEntradas, mensajeErrorIa, sugerenciaAPregunta, textoAlcance, textoDescartadas, textoPendientes, textoSeveridadSugerencia,
  validarEntradaForm,
} from "../src/lib/whatsapp/conocimiento.mjs";
import { validarPreguntas } from "../src/lib/whatsapp/entrevista.mjs";
import {
  edadPideFundamento, preguntasParaTipo, requisitoNuevo, requisitosDesdeApi, resumenRequisitos, tiposDisponibles, validarRequisitosForm,
} from "../src/lib/whatsapp/requisitos.mjs";

test("sugerencia de la IA → pregunta del editor que se guarda igual que una escrita a mano", () => {
  const s = { texto: "¿Tienes licencia tipo B?", tipo: "si_no", opciones: null, descartan: ["No"], alertan: null, motivo: "Es chofer." };
  const p = sugerenciaAPregunta(s);
  assert.equal(p.id, null, "es nueva");
  assert.match(p.clave, /^ia-/);
  assert.notEqual(sugerenciaAPregunta(s).clave, p.clave, "claves únicas");
  const n = sugerenciaAPregunta({ texto: "¿Años de experiencia?", tipo: "numero", descartan: { min: 1 }, alertan: null });
  const o = sugerenciaAPregunta({ texto: "¿Turno?", tipo: "opciones", opciones: ["Matutino", "Nocturno"], descartan: null, alertan: ["Nocturno"] });
  const r = validarPreguntas([p, n, o]);
  assert.equal(r.valido, true, r.general);
  const vacio = (v) => (v == null || (Array.isArray(v) && !v.length) ? null : v);
  assert.deepEqual(r.cuerpo.preguntas.map((x) => [x.tipo, vacio(x.descartan), vacio(x.alertan)]), [["si_no", ["No"], null], ["numero", { min: 1 }, null], ["opciones", null, ["Nocturno"]]]);
});

test("cupo de 8, aviso de discriminatorias quitadas y texto de severidad", () => {
  assert.deepEqual([espacioPreguntas(0), espacioPreguntas(6), espacioPreguntas(8), espacioPreguntas(9)], [8, 2, 0, 0]);
  assert.equal(textoDescartadas({ total: 3, discriminatorias: 0 }), "");
  assert.match(textoDescartadas({ total: 3, discriminatorias: 1 }), /^Se quitó 1 sugerencia/);
  assert.match(textoDescartadas({ total: 3, discriminatorias: 2 }), /^Se quitaron 2 sugerencias/);
  assert.equal(textoSeveridadSugerencia({ tipo: "si_no", descartan: ["No"] }), "Descarta: No");
  assert.equal(textoSeveridadSugerencia({ tipo: "numero", descartan: { min: 1 }, alertan: { min: 2, max: 10 } }), "Descarta: menos de 1 · Alerta: fuera de 2 a 10");
  assert.equal(textoSeveridadSugerencia({ tipo: "texto" }), "No descarta ni alerta");
});

test("errores de la puerta de Adamia AI en palabras de RH", () => {
  const e = (codigo, error) => ({ response: { status: 400, data: { codigo, error } } });
  assert.match(mensajeErrorIa(e("IA_APAGADA")), /no está activa/);
  assert.match(mensajeErrorIa(e("IA_SIN_CREDITOS")), /Sin créditos/);
  assert.equal(mensajeErrorIa(e("IA_LIMITE_HORA", "Llegaste al límite de 30 preguntas por hora.")), "Llegaste al límite de 30 preguntas por hora.");
  assert.match(mensajeErrorIa(e("IA_FORMATO")), /no dio sugerencias/);
  assert.match(mensajeErrorIa({ code: "ERR_NETWORK" }), /Sin conexión/);
  assert.equal(mensajeErrorIa(e(undefined, "Vacante no encontrada.")), "Vacante no encontrada.");
});

test("entrada de conocimiento: validación, alcance, pendientes y filtro", () => {
  const ok = validarEntradaForm({ pregunta: "  ¿Dan   uniforme? ", respuesta: " Sí ", estado: "aprobada", id_vacante: "701" });
  assert.deepEqual(ok.cuerpo, { pregunta: "¿Dan uniforme?", respuesta: "Sí", estado: "aprobada", id_vacante: 701 });
  assert.equal(validarEntradaForm({ pregunta: "¿Hay comedor?", respuesta: "Sí", id_vacante: "" }).cuerpo.id_vacante, null);
  assert.equal(validarEntradaForm({ pregunta: "¿Hay comedor?", respuesta: "Sí", estado: "x" }).cuerpo.estado, "borrador");
  const mal = validarEntradaForm({ pregunta: "a", respuesta: "" });
  assert.equal(mal.valido, false);
  assert.ok(mal.errores.pregunta && mal.errores.respuesta);
  assert.match(validarEntradaForm({ pregunta: "¿Hay comedor?", respuesta: "x".repeat(2001) }).errores.respuesta, /2,000/);
  assert.equal(textoAlcance({ id_vacante: null }), "Toda la empresa");
  assert.equal(textoAlcance({ id_vacante: 7, vacante: "Chofer" }), "Solo «Chofer»");
  assert.deepEqual([textoPendientes(0), textoPendientes(1), textoPendientes(4)], ["Sin preguntas pendientes", "1 pregunta sin respuesta", "4 preguntas sin respuesta"]);
  const lista = [{ pregunta: "¿Dan uniforme?", respuesta: "Sí", estado: "aprobada" }, { pregunta: "¿Hay comedor?", respuesta: "Está en el área de almacén", estado: "borrador" }];
  assert.equal(filtrarEntradas(lista, { q: "ALMACEN" }).length, 1);
  assert.equal(filtrarEntradas(lista, { estado: "aprobada" })[0].pregunta, "¿Dan uniforme?");
  assert.equal(filtrarEntradas(lista, {}).length, 2);
});

test("requisitos: ida y vuelta con el API, edad legal con fundamento y uno por tipo", () => {
  const api = [
    { tipo: "edad", regla: { min: 21, max: null, fundamento: "Licencia federal SCT: 21 años", id_pregunta: 5 }, activo: true },
    { tipo: "turno", regla: { acepta: ["matutino"], id_pregunta: null }, activo: false },
    { tipo: "zona", regla: { lugares: ["Monterrey", "Apodaca"], id_pregunta: null }, activo: true },
  ];
  const form = requisitosDesdeApi(api);
  assert.deepEqual([form[0].min, form[0].id_pregunta, form[1].activo, form[2].lugares], ["21", "5", false, "Monterrey, Apodaca"]);
  const r = validarRequisitosForm(form);
  assert.equal(r.valido, true, JSON.stringify(r.errores));
  assert.deepEqual(r.cuerpo.requisitos, [
    { tipo: "edad", activo: true, regla: { min: 21, max: null, fundamento: "Licencia federal SCT: 21 años", id_pregunta: 5 } },
    { tipo: "turno", activo: false, regla: { acepta: ["matutino"], id_pregunta: null } },
    { tipo: "zona", activo: true, regla: { lugares: ["Monterrey", "Apodaca"], id_pregunta: null } },
  ]);

  assert.equal(edadPideFundamento({ min: "18" }), false);
  assert.equal(edadPideFundamento({ min: "21" }), true);
  assert.equal(edadPideFundamento({ min: "18", max: "40" }), true);
  const sinF = validarRequisitosForm([{ ...requisitoNuevo("edad"), max: "40" }]);
  assert.match(sinF.errores[0].fundamento, /fundamento legal/);
  assert.equal(validarRequisitosForm([{ ...requisitoNuevo("edad"), min: "14" }]).errores[0].edad.includes("15"), true);
  assert.equal(validarRequisitosForm([requisitoNuevo("edad")]).valido, true, "18 sin fundamento");
  assert.deepEqual(validarRequisitosForm([requisitoNuevo("edad")]).cuerpo.requisitos[0].regla, { min: 18, max: null, fundamento: null, id_pregunta: null });
  for (const [tipo, campo] of [["experiencia", "min_anios"], ["escolaridad", "minima"], ["turno", "acepta"], ["zona", "lugares"]]) {
    assert.ok(validarRequisitosForm([requisitoNuevo(tipo)]).errores[0][campo], tipo);
  }
  assert.deepEqual(tiposDisponibles(form).map((t) => t.tipo), ["experiencia", "escolaridad"]);
  const preguntas = [{ id: 1, tipo: "numero" }, { id: 2, tipo: "opciones" }];
  assert.deepEqual(preguntasParaTipo(preguntas, "experiencia").map((p) => p.id), [1]);
  assert.deepEqual(preguntasParaTipo(preguntas, "turno").map((p) => p.id), [1, 2]);
});

test("requisitos en la ficha: resumen como alerta (nunca rechazo)", () => {
  assert.equal(resumenRequisitos(null), null);
  assert.equal(resumenRequisitos({ resultados: [], resumen: {} }), null);
  const tres = (cumple, no, falta) => ({ resultados: Array.from({ length: cumple + no + falta }, () => ({})), resumen: { cumple, no_cumple: no, falta_dato: falta } });
  assert.deepEqual(resumenRequisitos(tres(1, 2, 0)), { tono: "rojo", titulo: "No cumple 2 de 3 requisitos", ayuda: "Es una alerta para ti: el candidato no se rechaza solo." });
  assert.equal(resumenRequisitos(tres(2, 0, 1)).titulo, "Cumple 2 de 3; falta saber 1");
  assert.equal(resumenRequisitos(tres(3, 0, 0)).titulo, "Cumple los 3 requisitos");
  assert.equal(resumenRequisitos(tres(1, 0, 0)).titulo, "Cumple el requisito");
});
