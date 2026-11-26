// Integraciones (API v1 por empresa, 26/12/2026): reglas del panel y contenido de /desarrolladores
// (src/lib/integraciones/integraciones.mjs). Mismos permisos que el backend (modules/integracion/services/llaves.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CLAVES_PERMISO, VIGENCIAS, ERRORES, CAMPOS_EMPLEADO, validarNuevaLlave, estadoLlave, fechaCorta, textoUltimoUso, tonoHttp,
  prefijoVisible, urlBaseApi, ejemplos, nombrePermiso, RESPUESTA_EMPLEADOS, RESPUESTA_ASISTENCIAS, RESPUESTA_ERROR,
} from "../src/lib/integraciones/integraciones.mjs";
import { areaDeRuta, nivelEnRuta, DUENO } from "../src/lib/permisos/permisos.mjs";

test("permisos: los mismos tres del servidor", () => {
  assert.deepEqual(CLAVES_PERMISO, ["empleados:leer", "empleados:escribir", "asistencias:leer"]);
  assert.equal(nombrePermiso("asistencias:leer"), "Consultar asistencias");
  assert.equal(nombrePermiso("otro"), "otro");
});

test("crear llave: nombre de 3 a 80, al menos un permiso válido y vigencia del catálogo", () => {
  const ok = validarNuevaLlave({ nombre: "  Nómina   externa ", permisos: ["asistencias:leer", "inventado", "empleados:leer"], vigencia: 90 });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.datos, { nombre: "Nómina externa", permisos: ["empleados:leer", "asistencias:leer"], expira_en_dias: 90 });
  assert.equal(validarNuevaLlave({ nombre: "ERP", permisos: ["empleados:leer"], vigencia: null }).datos.expira_en_dias, null);
  const mal = validarNuevaLlave({ nombre: "x", permisos: ["inventado"], vigencia: 0 });
  assert.deepEqual(Object.keys(mal.errores).sort(), ["nombre", "permisos", "vigencia"]);
  assert.ok(VIGENCIAS.some((v) => v.dias === null) && VIGENCIAS.every((v) => v.dias === null || v.dias <= 1095));
});

test("lista: estado, prefijo, último uso y fechas legibles", () => {
  assert.deepEqual(estadoLlave("activa"), { texto: "Activa", tono: "verde" });
  assert.equal(estadoLlave("expirada").texto, "Vencida");
  assert.equal(estadoLlave("revocada").tono, "gris");
  assert.equal(prefijoVisible("adk_live_Ab12Cd34"), "adk_live_Ab12Cd34…");
  assert.equal(fechaCorta("2026-12-26 10:15:00"), "26 dic 2026, 10:15");
  assert.equal(fechaCorta(null), null);
  assert.equal(textoUltimoUso({ ultimo_uso_en: null }), "Sin uso todavía");
  assert.equal(textoUltimoUso({ ultimo_uso_en: "2026-01-02 08:00:00", ultimo_uso_ip: "1.2.3.4" }), "2 ene 2026, 08:00 · 1.2.3.4");
  assert.deepEqual([200, 201, 404, 429, 500, 503].map(tonoHttp), ["verde", "verde", "ambar", "ambar", "rojo", "rojo"]);
});

test("/panel/integraciones es solo del dueño (un usuario con acceso ve «Solo para el dueño»)", () => {
  assert.equal(areaDeRuta("/panel/integraciones"), DUENO);
  assert.equal(nivelEnRuta("/panel/integraciones", { modulos: { empleados: "editar", asistencias: "editar" } }), "dueno");
  assert.equal(nivelEnRuta("/panel/integraciones", null), "editar", "el dueño entra");
});

test("documentación: base de la v1, ejemplos con la llave en la cabecera (nunca en la URL)", () => {
  assert.equal(urlBaseApi("https://adamia.com.mx/api/"), "https://adamia.com.mx/api/integracion/v1");
  assert.equal(urlBaseApi(undefined), "https://adamia.com.mx/api/integracion/v1");
  const ej = ejemplos("https://dev.adamia.com.mx/api");
  for (const [nombre, texto] of Object.entries(ej)) {
    assert.match(texto, /-H "Authorization: Bearer \$ADAMIA_LLAVE"/, nombre);
    assert.doesNotMatch(texto, /apiKey=|api_key=/i, nombre);
    assert.match(texto, /https:\/\/dev\.adamia\.com\.mx\/api\/integracion\/v1\//, nombre);
  }
  assert.match(ej.crear, /Idempotency-Key/);
  for (const json of [RESPUESTA_EMPLEADOS, RESPUESTA_ASISTENCIAS, RESPUESTA_ERROR]) JSON.parse(json);
  assert.match(JSON.parse(RESPUESTA_ASISTENCIAS).data[0].entrada, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
});

test("documentación: errores y campos completos, sin campos prohibidos", () => {
  const codigos = ERRORES.map((e) => e.codigo);
  for (const c of ["NO_AUTENTICADO", "LLAVE_INVALIDA", "LLAVE_REVOCADA", "LLAVE_EXPIRADA", "LLAVE_EN_URL", "PERMISO_INSUFICIENTE", "EMPLEADO_NO_ENCONTRADO", "VALIDACION", "LIMITE_EXCEDIDO", "IDEMPOTENCIA_CONFLICTO"]) {
    assert.ok(codigos.includes(c), c);
  }
  const campos = CAMPOS_EMPLEADO.map((c) => c.campo);
  for (const k of ["password", "pin", "descriptor_facial", "sueldo", "id_empresa"]) assert.ok(!campos.includes(k), k);
  assert.deepEqual(CAMPOS_EMPLEADO.filter((c) => c.obligatorio).map((c) => c.campo), ["nombre", "apellido_paterno", "apellido_materno", "correo", "puesto", "sucursal"]);
});

test("panel: la llave en claro solo vive en el diálogo (no se guarda en el navegador)", () => {
  const fuentes = ["src/components/integraciones/IntegracionesEmpresa.jsx", "src/components/integraciones/DialogoNuevaLlave.jsx", "src/components/integraciones/ListaLlaves.jsx"]
    .map((f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8")).join("\n");
  assert.doesNotMatch(fuentes, /localStorage|sessionStorage|Cookies\.set|console\.log/);
  assert.match(fuentes, /navigator\.clipboard\.writeText/);
  assert.match(fuentes, /AlertDialog/, "revocar pide confirmación");
});
