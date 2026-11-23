// Reclutamiento real (03/12/2026): traducción servidor ↔ pantallas y preguntas del formulario público.
// Uso: node --test scripts/test-reclutamiento-adaptador.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aDatos, aDetalle, aCuerpoVacante, aCuerpoContratacion, dividirNombre, htmlANodos, textoDeNodos,
  erroresDeCampos, mensajeError, urlVacantePublica, urlConversacion, VISTA_A_ETAPA,
} from "../src/lib/reclutamiento/adaptador.mjs";
import { faltantes, respuestasParaEnviar } from "../src/lib/reclutamiento/respuestas.mjs";

const resumen = {
  empresa: { id: 7, nombre: "Empacadora", publica_bolsa: true },
  sucursales: [{ id: 10, nombre: "Centro", direccion: "Gdl" }],
  modalidades: [{ id: 1, nombre: "Presencial", requiere_sucursal: true, propia: false }, { id: 3, nombre: "Remota", requiere_sucursal: false, propia: false }],
  vacantes: [
    { id: 5, titulo: "Repartidor", slug: "repartidor-1", estado: "open", id_sucursal: 10, id_modalidad: 1, puestos: 2, tipo_jornada: "Medio tiempo",
      mostrar_sueldo: true, sueldo_desde: 12000, sueldo_hasta: null, cierra_el: "2026-12-31", descripcion: [{ type: "p", children: [{ text: "Hola" }] }],
      preguntas: [{ id: "name", base: true }], version_formulario: 2, avisos: { email: "t@x.mx", toTeam: true, toCandidate: false }, creada_en: "2026-12-01T10:00:00-06:00" },
    { id: 1, titulo: "Chofer", slug: "chofer", estado: "closed", id_sucursal: null, id_modalidad: null, modalidad_texto: "presencial", puestos: null,
      descripcion: null, descripcion_html: "<p>Manejar &amp; <strong>repartir</strong></p><ul><li>Uno</li></ul>", preguntas: [], creada_en: null },
  ],
  candidatos: [
    { id: 9, id_vacante: 5, nombre: "Ana", correo: "a@x.mx", telefono: "55", recibida_en: "2026-12-02T09:00:00-06:00", etapa: "contratado", tiene_cv: true,
      contratacion: { fecha_ingreso: "2026-12-10", id_sucursal: 10, checklist: ["data"], id_empleado: 40, empleado_existente: false, contratado_en: "2026-12-03T10:00:00-06:00" } },
    { id: 11, id_vacante: 5, nombre: "Beto", correo: "", telefono: "", recibida_en: "2026-12-02T09:00:00-06:00", etapa: "oferta", contratacion: {} },
  ],
  whatsapp: [{ id: "wa-1", id_vacante: 5, id_conversacion: 3, nombre: "Wendy", telefono: "+52", recibida_en: "x", calificacion: "no_califica", etapa_whatsapp: "cerrada", resumen: "R" }],
  citas: [{ id: 4, id_vacante: 5, id_conversacion: 3, candidato: "wa-1", inicio: "2026-12-05T10:00:00-06:00", fin: "2026-12-05T10:45:00-06:00", modalidad: "video" }],
  eventos: [{ id: 2, id_postulacion: 9, texto: "Etapa: Oferta", en: "2026-12-02T10:00:00-06:00" }],
};

test("resumen → pantallas: ids en texto, etapas, lugares restantes, WhatsApp y citas", () => {
  const d = aDatos(resumen);
  assert.equal(d.company, "Empacadora");
  assert.equal(d.publishesBoard, true);
  const [rep, chofer] = d.vacancies;
  assert.deepEqual([rep.id, rep.branchId, rep.modalityId, rep.openings, rep.hired, rep.remaining, rep.salaryFrom, rep.salaryTo], ["5", "10", "1", 2, 1, 1, "12000", ""]);
  assert.equal(rep.notifications.toCandidate, false);
  assert.equal(chofer.modalityId, "1", "vacante de antes: modalidad por su texto");
  assert.equal(chofer.unlimited, true);
  assert.equal(chofer.remaining, null);
  assert.equal(chofer.createdAt, "", "sin fecha: texto vacío (se puede ordenar)");
  assert.equal(textoDeNodos(chofer.description), "Manejar & repartir Uno");
  assert.deepEqual(d.candidates.map((c) => [c.id, c.stage, c.vacancyId]), [["9", "hired", "5"], ["11", "offer", "5"]]);
  assert.equal(d.candidates[0].hiring.employeeId, 40);
  assert.deepEqual(d.candidates[1].hiring, { startDate: "", branchId: "", checklist: [], completedAt: null, employeeId: null, existingEmployee: false });
  const [w] = d.whatsappCandidates;
  assert.deepEqual([w.id, w.origin, w.readOnly, w.stage, w.ratingLabel, w.conversationId], ["wa-1", "whatsapp", true, "rejected", "No califica", 3]);
  assert.deepEqual([d.interviews[0].candidateId, d.interviews[0].duration, d.interviews[0].location], ["wa-1", 45, "Videollamada"]);
  assert.deepEqual(d.events[0], { id: "2", candidateId: "9", text: "Etapa: Oferta", at: "2026-12-02T10:00:00-06:00" });
});

test("HTML de antes → árbol del editor (sin etiquetas extrañas)", () => {
  // El servidor ya sanea el HTML; aquí una etiqueta desconocida solo se ignora (su texto queda en un párrafo).
  assert.deepEqual(htmlANodos("<p>Hola <b>tú</b></p><script>x</script><h2>T</h2>"), [
    { type: "p", children: [{ text: "Hola " }, { type: "strong", children: [{ text: "tú" }] }] },
    { type: "p", children: [{ text: "x" }] },
    { type: "h3", children: [{ text: "T" }] },
  ]);
  assert.deepEqual(htmlANodos("texto suelto<p>p</p>"), [{ type: "p", children: [{ text: "texto suelto" }] }, { type: "p", children: [{ text: "p" }] }]);
  assert.deepEqual(htmlANodos(""), []);
  assert.deepEqual(htmlANodos(null), []);
});

test("pantallas → servidor: vacante y contratación", () => {
  const v = aDatos(resumen).vacancies[0];
  const cuerpo = aCuerpoVacante({ ...v, showSalary: false }, true);
  assert.deepEqual([cuerpo.titulo, cuerpo.id_modalidad, cuerpo.id_sucursal, cuerpo.puestos, cuerpo.sueldo_desde, cuerpo.publicar], ["Repartidor", 1, 10, 2, null, true]);
  assert.deepEqual(aCuerpoVacante({ ...v, modalityId: "", branchId: "", closesOn: "" }).cierra_el, null);
  assert.deepEqual(aCuerpoContratacion({ startDate: "2026-12-10", branchId: "10", firstName: " Ana ", lastName: "García", secondLastName: "", email: "", phone: "", checklist: ["data"] }),
    { fecha_ingreso: "2026-12-10", id_sucursal: 10, nombre: "Ana", apellido_paterno: "García", apellido_materno: "", correo: "", telefono: "", checklist: ["data"] });
  assert.deepEqual(dividirNombre("Ana María García López"), { firstName: "Ana María", lastName: "García", secondLastName: "López" });
  assert.deepEqual(dividirNombre("Luis"), { firstName: "Luis", lastName: "", secondLastName: "" });
  assert.equal(VISTA_A_ETAPA.rejected, "descartado");
});

test("expediente: respuestas base + propias, notas e historial", () => {
  const d = aDetalle({ id: 9, id_vacante: 5, nombre: "Ana", correo: "a@x.mx", telefono: "55", etapa: "revision", tiene_cv: false, version_formulario: 2,
    respuestas: [{ id: "lic", label: "¿Licencia?", type: "select", value: "Sí" }], notas: [{ id: 1, texto: "Bien", autor: "Rita", en: "t" }],
    eventos: [{ id: "recibida", texto: "Postulación recibida", en: "t0" }], empleado: null, contratacion: {} });
  assert.deepEqual(d.answers.map((a) => a.id), ["name", "email", "phone", "lic", "cv"]);
  assert.equal(d.answers.at(-1).value, null);
  assert.equal(d.stage, "review");
  assert.equal(d.formVersion, 2);
  assert.deepEqual(d.notes[0], { id: "1", text: "Bien", at: "t", author: "Rita" });
  assert.equal(d.activity[0].text, "Postulación recibida");
});

test("errores del servidor en español y por campo", () => {
  const e = { response: { status: 400, data: { error: "Selecciona una modalidad.", errores: { id_modalidad: "Selecciona una modalidad.", correo: "x" } } } };
  assert.deepEqual(erroresDeCampos(e), { modalityId: "Selecciona una modalidad.", email: "x" });
  assert.equal(mensajeError(e), "Selecciona una modalidad.");
  assert.match(mensajeError(new Error("Network Error")), /conexión/);
  assert.match(mensajeError({ response: { status: 503, data: { codigo: "SIN_MIGRACION" } } }), /soporte/);
  assert.match(mensajeError({ response: { status: 500, data: "<html>" } }, "Falló"), /Falló/);
  assert.equal(urlVacantePublica("a b"), "/vacante/a%20b");
  assert.equal(urlVacantePublica(""), "");
  assert.equal(urlConversacion(3), "/panel/whatsapp?c=3");
});

test("formulario público: preguntas obligatorias y respuestas a enviar", () => {
  const preguntas = [{ id: "a", required: true }, { id: "b", required: false }, { id: "c", required: true }];
  assert.deepEqual(faltantes(preguntas, { a: "x", c: [] }), ["c"]);
  assert.deepEqual(faltantes(preguntas, { a: "x", c: ["L"] }), []);
  assert.deepEqual(respuestasParaEnviar(preguntas, { a: "x", b: "", c: ["L"], z: "no" }), { a: "x", c: ["L"] });
});

// 04/12/2026: candidato de WhatsApp con el mismo proceso (postulación con origen «whatsapp»).
test("candidato de WhatsApp: postulación con proceso, entrevista, sugerencia y cuerpo de etapa", async () => {
  const { aCandidato, aCuerpoEtapa, aCandidatoWhatsapp } = await import("../src/lib/reclutamiento/adaptador.mjs");
  const c = aCandidato({
    id: 30, id_vacante: 5, nombre: "Mario", telefono: "525522223333", etapa: "nuevo", origen: "whatsapp", contratacion: {},
    whatsapp: { id_conversacion: 2, id_entrevista: 8, calificacion: "califica", resumen: "Licencia federal", puntajes: { actitud: 5 }, sugerencia: { etapa: "revision", motivo: "Califica" } },
  });
  assert.equal(c.origin, "whatsapp");
  assert.equal(c.readOnly, false, "ya no es de solo lectura");
  assert.equal(c.conversationId, 2);
  assert.deepEqual(c.whatsapp.suggestion, { stage: "review", reason: "Califica" });
  assert.equal(c.whatsapp.ratingLabel, "Califica");
  assert.equal(c.source, "WhatsApp");
  const d = aDetalle({ ...{ id: 30, id_vacante: 5, nombre: "Mario", etapa: "oferta", origen: "whatsapp", contratacion: {} },
    whatsapp: { id_conversacion: 2, id_entrevista: 8, ventana_abierta: false, plantilla_seguimiento: "seguimiento_rh", respuestas: [{ texto_pregunta: "¿Licencia?", respuesta: "Sí", severidad: "ok" }] },
    sucursales: [{ id: 10, nombre: "Centro" }], vacante: { id: 5, titulo: "Chofer", puestos: 2, contratados: 1 } });
  assert.ok(!d.answers.some((a) => a.id === "cv"), "por WhatsApp no se pide currículum");
  assert.deepEqual([d.whatsapp.windowOpen, d.whatsapp.template, d.whatsapp.answers[0].answer], [false, "seguimiento_rh", "Sí"]);
  assert.deepEqual(d.branches, [{ id: "10", name: "Centro", address: "" }]);
  assert.deepEqual([d.vacancy.remaining, d.vacancy.unlimited], [1, false]);
  assert.deepEqual(aCuerpoEtapa("rejected", { motivo: "  sin licencia " }), { etapa: "descartado", motivo: "sin licencia" });
  assert.deepEqual(aCuerpoEtapa("review", { sugerencia: true }), { etapa: "revision", sugerencia: true });
  assert.deepEqual(aCuerpoEtapa("interview", { motivo: "x" }), { etapa: "entrevista" }, "el motivo solo al descartar");
  const sinProceso = aCandidatoWhatsapp({ id: "wa-3", id_entrevista: 3, id_vacante: 5, puede_iniciar: true });
  assert.deepEqual([sinProceso.readOnly, sinProceso.canStart, sinProceso.interviewId], [true, true, 3]);
});
