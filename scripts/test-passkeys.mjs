// Pruebas de src/lib/passkeys/modelo.mjs (25/11/2026): textos por plataforma, mensajes de falla (siempre con salida a
// la contraseña), sesión cerrada desde el servidor, la hoja «¿Activar Face ID?» (Activar / Ahora no / No volver a
// preguntar) y fechas de la pantalla de seguridad.
import test from "node:test";
import assert from "node:assert/strict";
import {
  plataformaDe, textoBotonEntrar, tituloOferta, mensajeFalla, esSesionCerrada, avisoLogin, RUTA_LOGIN_SESION_CERRADA,
  debeOfrecer, marcarActivada, marcarQuitada, posponer, CLAVE_OFRECER, CLAVE_NO_PREGUNTAR, cuentaLocal, fechaCorta,
  rutaSeguridad, payloadDeToken,
} from "../src/lib/passkeys/modelo.mjs";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 AdamiaAppNative";
const ANDROID = "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36 AdamiaAppNative";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

test("texto por plataforma: Face ID en iPhone/iPad, huella en Android, passkey en escritorio", () => {
  assert.equal(textoBotonEntrar(plataformaDe(IPHONE)), "Entrar con Face ID");
  assert.equal(textoBotonEntrar(plataformaDe(MAC, 5)), "Entrar con Face ID", "iPad que se presenta como Mac");
  assert.equal(textoBotonEntrar(plataformaDe(ANDROID)), "Entrar con huella");
  assert.equal(textoBotonEntrar(plataformaDe(MAC, 0)), "Entrar con tu passkey");
  assert.equal(textoBotonEntrar(plataformaDe(WINDOWS)), "Entrar con tu passkey");
  assert.equal(tituloOferta("ios"), "¿Activar Face ID para entrar más rápido?");
  assert.equal(tituloOferta("android"), "¿Activar tu huella para entrar más rápido?");
});

test("mensajes de falla: claros y siempre con salida a la contraseña", () => {
  const dom = (name) => Object.assign(new Error("x"), { name });
  assert.match(mensajeFalla(dom("NotAllowedError")), /canceló.*contraseña/);
  assert.match(mensajeFalla(Object.assign(new Error("x"), { name: "InvalidStateError", code: "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED" }), { plataforma: "ios", accion: "activar" }), /ya tiene Face ID activado/);
  assert.match(mensajeFalla(new Error("WebAuthn is not supported in this browser"), { plataforma: "android" }), /no permite usar huella.*contraseña/);
  assert.match(mensajeFalla(dom("SecurityError")), /no permite usar passkey/);
  const servidor = { response: { status: 503, data: { error: "El acceso con Face ID o huella aún no está disponible. Entra con tu contraseña.", code: "PASSKEYS_NO_DISPONIBLE" } } };
  assert.equal(mensajeFalla(servidor), servidor.response.data.error);
  assert.match(mensajeFalla({ response: { status: 429, data: {} } }), /Demasiados intentos/);
  assert.match(mensajeFalla(new TypeError("Failed to fetch")), /Sin conexión/);
  assert.match(mensajeFalla(new Error("raro")), /No pudimos entrar con passkey\. Entra con tu contraseña/);
});

test("sesión cerrada desde el servidor: solo 401 con su código", () => {
  assert.equal(esSesionCerrada(401, { code: "SESION_REVOCADA" }), true);
  assert.equal(esSesionCerrada(401, { code: "SESION_EXPIRADA" }), true);
  assert.equal(esSesionCerrada(401, { error: "Token inválido o expirado" }), false, "otros 401 siguen como antes");
  assert.equal(esSesionCerrada(403, { code: "SESION_REVOCADA" }), false);
  assert.equal(esSesionCerrada(503, { code: "SESION_NO_VERIFICADA" }), false, "una caída del servidor no saca a nadie");
  assert.equal(RUTA_LOGIN_SESION_CERRADA, "/login?aviso=sesion-cerrada");
  assert.equal(avisoLogin("sesion-cerrada"), "Tu sesión se cerró. Vuelve a iniciar sesión.");
  assert.equal(avisoLogin("<script>"), null);
});

function almacen(inicial = {}) {
  const datos = new Map(Object.entries(inicial));
  return { getItem: (k) => (datos.has(k) ? datos.get(k) : null), setItem: (k, v) => datos.set(k, String(v)), removeItem: (k) => datos.delete(k), datos };
}

test("hoja «¿Activar Face ID?»: solo tras entrar con contraseña y respeta Ahora no / No volver a preguntar / ya activada", () => {
  const ana = { correo: "Ana@x.mx", esEmpleado: true };
  const sesion = almacen({ [CLAVE_OFRECER]: "1" });
  assert.equal(cuentaLocal(ana), "e:ana@x.mx");
  assert.equal(debeOfrecer({ local: almacen(), sesion, usuario: ana, soporta: true }), true);
  assert.equal(debeOfrecer({ local: almacen(), sesion: almacen(), usuario: ana, soporta: true }), false, "no entró con contraseña ahora");
  assert.equal(debeOfrecer({ local: almacen(), sesion, usuario: ana, soporta: false }), false, "sin WebAuthn no se ofrece");
  assert.equal(debeOfrecer({ local: almacen({ [CLAVE_NO_PREGUNTAR]: "1" }), sesion, usuario: ana, soporta: true }), false);
  const local = almacen();
  marcarActivada(local, ana);
  assert.equal(debeOfrecer({ local, sesion, usuario: ana, soporta: true }), false, "ya activada en este dispositivo");
  assert.equal(debeOfrecer({ local, sesion, usuario: { correo: "beto@x.mx" }, soporta: true }), true, "otra cuenta en el mismo teléfono sí");
  marcarQuitada(local, ana);
  assert.equal(debeOfrecer({ local, sesion, usuario: ana, soporta: true }), true);
  const t0 = Date.parse("2026-11-26T12:00:00Z");
  posponer(local, ana, t0);
  assert.equal(debeOfrecer({ local, sesion, usuario: ana, soporta: true, ahora: t0 + 86400000 }), false, "«Ahora no» espera una semana");
  assert.equal(debeOfrecer({ local, sesion, usuario: ana, soporta: true, ahora: t0 + 8 * 86400000 }), true);
  assert.equal(debeOfrecer({ local: almacen({ adamia_passkey_activada: "{roto" }), sesion, usuario: ana, soporta: true }), true, "datos dañados no truenan");
});

test("fechas de la pantalla de seguridad y ruta por tipo de cuenta", () => {
  const ahora = new Date("2026-11-26T18:00:00Z"); // 12:00 en CDMX
  assert.equal(fechaCorta(null, ahora), "Nunca");
  assert.equal(fechaCorta("2026-11-26 11:55:00", ahora), "Hace 5 min");
  assert.match(fechaCorta("2026-11-26 08:00:00", ahora), /^Hoy, 08:00/);
  assert.match(fechaCorta("2026-10-02 08:00:00", ahora), /2 oct 2026/);
  assert.equal(fechaCorta("no es fecha", ahora), "—");
  assert.equal(rutaSeguridad({ tipo_usuario: "Empleado" }), "/empleado/panel/seguridad");
  assert.equal(rutaSeguridad({ tipo_usuario: "Recruiter", esAcceso: true }), "/panel/seguridad");
  assert.equal(rutaSeguridad({ tipo_usuario: "Admin" }), "/dashboard/seguridad");
});

test("payload del token (UTF-8) para recordar la cuenta en este dispositivo", () => {
  const cuerpo = Buffer.from(JSON.stringify({ correo: "peña@x.mx", esEmpleado: true })).toString("base64url");
  assert.deepEqual(payloadDeToken(`h.${cuerpo}.f`), { correo: "peña@x.mx", esEmpleado: true });
  assert.equal(payloadDeToken("basura"), null);
});

test(".well-known: archivos válidos solo con las variables; si faltan, 404", async () => {
  const { appleAppSiteAssociation, assetLinks, huellasAndroid, respuestaJson } = await import("../src/lib/passkeys/wellKnown.mjs");
  assert.deepEqual(appleAppSiteAssociation("abcde12345"), { webcredentials: { apps: ["ABCDE12345.mx.com.adamia.app"] } });
  assert.equal(appleAppSiteAssociation(""), null);
  assert.equal(appleAppSiteAssociation("TEAMID"), null, "un Team ID tiene 10 caracteres");
  const h = "14:6d:e9:83:c5:73:06:50:d8:ee:b9:95:2f:34:fc:64:16:a0:83:42:e6:1d:be:a8:8a:04:96:b2:3f:cf:44:e5";
  assert.deepEqual(huellasAndroid(`${h}, malo, ${h.toUpperCase()}`), [h.toUpperCase()]);
  assert.deepEqual(assetLinks(h), [{
    relation: ["delegate_permission/common.handle_all_urls", "delegate_permission/common.get_login_creds"],
    target: { namespace: "android_app", package_name: "mx.com.adamia.app", sha256_cert_fingerprints: [h.toUpperCase()] },
  }]);
  assert.equal(assetLinks(undefined), null);
  const vacia = respuestaJson(null);
  assert.equal(vacia.status, 404);
  const llena = respuestaJson({ a: 1 });
  assert.deepEqual([llena.status, llena.headers.get("content-type"), await llena.json()], [200, "application/json", { a: 1 }]);
});
