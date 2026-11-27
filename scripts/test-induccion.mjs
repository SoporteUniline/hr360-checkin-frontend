// Inducción digital (27/12/2026): reglas de presentación (src/lib/induccion/induccion.mjs) sin red ni React.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as I from "../src/lib/induccion/induccion.mjs";
import { modulosDeRuta } from "../src/lib/modulos/catalogo.mjs";

test("fechas y plazos: «lun 1 dic», hoy/mañana, 12 horas y Día N (−N = días antes; Día 1 = ingreso)", () => {
  assert.equal(I.fechaCorta("2026-12-07"), "lun 7 dic");
  assert.equal(I.fechaCorta("2026-12-01", "2026-12-01"), "hoy");
  assert.equal(I.fechaCorta("2026-12-02", "2026-12-01"), "mañana");
  assert.equal(I.fechaLarga("2026-12-01"), "1 de diciembre de 2026");
  assert.deepEqual([I.hora12("09:00"), I.hora12("13:05:00"), I.hora12("")], ["9:00 a. m.", "1:05 p. m.", ""]);
  assert.deepEqual([I.etiquetaDia(-1), I.etiquetaDia(-3), I.etiquetaDia(1), I.etiquetaDia(5)], ["1 día antes", "3 días antes", "Día 1", "Día 5"]);
  assert.ok(!I.OPCIONES_DIA.some((o) => o.valor === 0), "no hay «día 0»");
});

test("chips de avance y barra como en la maqueta (Documentos 5/7, ✓ Datos…)", () => {
  const { chips, porcentaje } = I.chipsAvance({ datos: true, documentos: { listos: 5, total: 7 }, firma: false, rostro: false });
  assert.deepEqual(chips.map((c) => [c.texto, c.tono]), [["✓ Datos", "listo"], ["Documentos 5/7", "parcial"], ["Firma", "pendiente"], ["Rostro", "pendiente"]]);
  assert.equal(porcentaje, 43);
  assert.equal(I.chipsAvance({ datos: true, documentos: { listos: 7, total: 7 }, firma: true, rostro: true }).porcentaje, 100);
  assert.equal(I.iniciales({ nombre: "maría", apellido_paterno: "Torres" }), "MT");
  assert.equal(I.origenTexto({ origen: "reclutamiento", estado: "invitado" }), "Vino de Reclutamiento");
  assert.equal(I.origenTexto({ origen: "manual", estado: "alta", fecha_ingreso: "2026-12-01" }, "2026-12-01"), "Ingresó hoy");
});

test("validación inmediata de datos (el servidor vuelve a validar): CURP, RFC contra CURP, NSS, CLABE con dígito verificador", () => {
  assert.equal(I.errorCampo("curp", "TOAM940318MDFRRR09"), null);
  assert.match(I.errorCampo("curp", "ABC"), /18/);
  assert.match(I.errorCampo("rfc", "BEBA940318AB1", { curp: "TOAM940318MDFRRR09" }), /no coincide/);
  assert.equal(I.errorCampo("rfc", "TOAM940318AB1", { curp: "TOAM940318MDFRRR09" }), null);
  assert.equal(I.errorCampo("nss", "123-4567-8901"), null);
  assert.equal(I.clabeValida("002010077777777771"), true);
  assert.equal(I.clabeValida("002010077777777772"), false);
  assert.equal(I.errorCampo("telefono", "+52 55 1234 5678"), null);
  assert.equal(I.errorCampo("curp", ""), null, "vacío no es error (se guarda avance parcial)");
});

test("liga del celular: continúa donde se quedó y traduce errores terminales", () => {
  assert.equal(I.pasoInicial({ avance: { datos: false } }), "datos");
  assert.equal(I.pasoInicial({ avance: { datos: true }, documentos: [{ obligatorio: true, estado: "rechazado" }] }), "documentos");
  assert.equal(I.pasoInicial({ avance: { datos: true, firma: false }, documentos: [{ obligatorio: true, estado: "recibido" }, { obligatorio: false, estado: "pendiente" }] }), "firma");
  assert.equal(I.pasoInicial({ avance: { datos: true, firma: true, rostro: true }, documentos: [] }), "listo");
  const vencida = I.errorPublico({ response: { status: 410, data: { codigo: "ENLACE_VENCIDO", error: "Pide otra" } } });
  assert.deepEqual([vencida.fin, vencida.titulo], [true, "Esta liga ya venció"]);
  assert.equal(I.errorPublico({}).fin, false, "sin red no es terminal");
  assert.deepEqual(I.errorPublico({ response: { status: 422, data: { error: "Revisa", campos: { curp: "x" } } } }).campos, { curp: "x" });
  assert.deepEqual(I.contarListos([{ estado: "recibido" }, { estado: "con_dato" }, { estado: "pendiente" }, { estado: "rechazado" }]), { listos: 2, total: 4 });
  assert.equal(I.rutaPublica("a/b"), "/checador/induccion/publico/a%2Fb");
});

test("vista previa del WhatsApp con el mismo texto de la plantilla de Meta; responsables y alcance", () => {
  assert.equal(I.textoInvitacion({ nombre: "María", empresa: "Uniline", puesto: "Cajera", fechaIngreso: "2026-12-01", horaIngreso: "09:00" }),
    "Hola María, Uniline registró tu ingreso como Cajera. Tu primer día: martes 1 de diciembre a las 9:00 a. m., y para completar tu alta llena tus datos, sube tus documentos y firma desde tu celular en tu liga personal.");
  const roles = [{ id_rol: 1, nombre: "Recursos Humanos", persona: "Laura Ríos" }];
  assert.equal(I.textoResponsable({ tipo: "rol", id_rol: 1 }, { roles }), "Laura (Recursos Humanos)");
  assert.equal(I.textoResponsable({ tipo: "jefe" }), "Su jefe directo");
  assert.equal(I.textoAlcance({ alcance: "puesto", alcance_valor: "Cajera" }), "Puesto: Cajera");
  const g = I.agruparTareas([{ grupo: "RH", responsable_nombre: "Laura" }, { grupo: "Jefe directo", responsable_nombre: null }, { grupo: "RH" }]);
  assert.deepEqual(g.map((x) => [x.grupo, x.tareas.length, x.responsable]), [["RH", 2, "Laura"], ["Jefe directo", 1, null]]);
});

test("rutas del módulo (se apagan con «induccion»)", () => {
  for (const r of [I.RUTA_TABLERO, `${I.RUTA_TABLERO}/3`, I.RUTA_PLANTILLAS, I.RUTA_BIENVENIDA]) assert.deepEqual(modulosDeRuta(r), ["induccion"], r);
  assert.equal(modulosDeRuta("/ingreso/abc"), null, "la liga pública no depende del menú");
});
