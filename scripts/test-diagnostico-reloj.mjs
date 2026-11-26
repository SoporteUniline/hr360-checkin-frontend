import assert from "node:assert/strict";
import { readFile, writeFile, rm } from "node:fs/promises";
import test from "node:test";
import { SignJWT } from "jose";
import {
  CLAVE_HISTORIAL, MAX_SESIONES, createRecorder, resumirFases, reporteTexto,
} from "../src/lib/diagnostico-reloj/core.mjs";

function memoria() {
  const datos = new Map();
  return { getItem: (k) => datos.get(k) ?? null, setItem: (k, v) => datos.set(k, String(v)), datos };
}

function reloj(inicio = 1000) {
  let t = inicio;
  return { now: () => t, avanzar: (ms) => { t += ms; } };
}

test("calcula cada fase y señala el cuello de botella", () => {
  const { fases, cuelloDeBotella } = resumirFases([
    { n: "camara_solicitada", t: 0 },
    { n: "camara_lista", t: 800 },
    { n: "deteccion_lista", t: 2500 },
    { n: "primer_analisis_fin", t: 4200 },
    { n: "primer_rostro", t: 5000 },
    { n: "envio_inicio", t: 5100 },
    { n: "envio_fin", t: 5400 },
    { n: "gps_inicio", t: 5410 },
    { n: "gps_fin", t: 13410 },
    { n: "checada_exitosa", t: 13800 },
  ]);
  const ms = Object.fromEntries(fases.map((f) => [f.fase, f.ms]));
  assert.equal(ms["Abrir cámara (incluye permiso)"], 800);
  assert.equal(ms["Esperar modelos con cámara lista"], 1700);
  assert.equal(ms["Primer análisis de cuadro"], 1700);
  assert.equal(ms["Primer envío al servidor"], 300);
  assert.equal(ms["Obtener GPS"], 8000);
  assert.equal(ms["Rostro detectado → checada registrada"], 8800);
  // El tramo agregado "rostro → checada" contiene al GPS: el cuello es la fase real.
  assert.equal(cuelloDeBotella, "Obtener GPS");
});

test("una fase sin fin queda incompleta y no se inventa duración", () => {
  const { fases } = resumirFases([{ n: "gps_inicio", t: 10 }]);
  assert.deepEqual(fases, [{ fase: "Obtener GPS", desde: 10, ms: null, incompleta: true }]);
});

test("las marcas previas a abrir el reloj quedan con tiempo negativo", () => {
  const c = reloj(0);
  const rec = createRecorder({ now: c.now, storage: memoria() });
  rec.marca("faceapi_modelos_inicio");
  c.avanzar(3000);
  rec.marca("faceapi_modelos_fin");
  c.avanzar(2000);
  rec.iniciar("reloj", { modo: "empleado" });
  c.avanzar(500);
  const r = rec.terminar("salió");
  const modelos = r.fases.find((f) => f.fase === "Cargar modelos faciales");
  assert.equal(modelos.desde, -5000);
  assert.equal(modelos.ms, 3000);
  assert.equal(r.total_ms, 500);
  assert.equal(r.contexto.ms_desde_carga_app, 5000);
});

test("guarda en el dispositivo, máximo 30 mediciones, más reciente primero", () => {
  const c = reloj();
  const storage = memoria();
  const rec = createRecorder({ now: c.now, storage });
  for (let i = 0; i < MAX_SESIONES + 5; i++) {
    rec.iniciar("reloj", { i });
    c.avanzar(10);
    rec.terminar("checada registrada");
  }
  const lista = JSON.parse(storage.getItem(CLAVE_HISTORIAL));
  assert.equal(lista.length, MAX_SESIONES);
  assert.equal(lista[0].contexto.i, MAX_SESIONES + 4);
  assert.equal(rec.pendientesDeEnvio().length, MAX_SESIONES);
  assert.equal(rec.marcarEnviado(lista[0].id), true);
  assert.equal(rec.pendientesDeEnvio().length, MAX_SESIONES - 1);
});

test("termina una sola vez y cuenta análisis de cuadros", () => {
  const c = reloj();
  let enviados = 0;
  const rec = createRecorder({ now: c.now, storage: memoria(), onFinish: () => { enviados++; } });
  rec.cuenta("analisis", 50); // sin sesión: se ignora
  rec.iniciar("reloj");
  rec.cuenta("analisis", 900);
  rec.cuenta("analisis", 300);
  const r = rec.terminar("checada registrada");
  assert.equal(rec.terminar("otra vez"), null);
  assert.equal(enviados, 1);
  assert.deepEqual(r.contadores.analisis, { veces: 2, promedio_ms: 600, max_ms: 900, primeros_ms: [900, 300] });
});

test("sin almacenamiento disponible no truena", () => {
  const roto = { getItem() { throw new Error("bloqueado"); }, setItem() { throw new Error("bloqueado"); } };
  const rec = createRecorder({ now: () => 1, storage: roto });
  rec.iniciar("reloj");
  assert.ok(rec.terminar("x"));
  assert.deepEqual(rec.historial(), []);
});

test("el reporte en texto es legible y no incluye datos de rostro ni coordenadas", () => {
  const c = reloj(0);
  const rec = createRecorder({ now: c.now, storage: memoria() });
  rec.iniciar("reloj", { app_nativa: true, red: { tipo: "4g", mbps: 3, rtt_ms: 120 } });
  rec.marca("gps_inicio");
  c.avanzar(7000);
  rec.marca("gps_fin", { ok: true, precision_m: 12 });
  const texto = reporteTexto(rec.terminar("checada registrada"));
  assert.match(texto, /Obtener GPS: en 0\.0 s → 7\.0 s/);
  assert.match(texto, /Cuello de botella: Obtener GPS/);
  assert.doesNotMatch(texto, /descriptor|latitud|longitud/i);
});

test("la ruta del servidor exige sesión válida y registra una línea [diag-reloj]", async () => {
  const fuente = await readFile(new URL("../src/app/api/diagnostico/reloj/route.js", import.meta.url), "utf8");
  const temporal = new URL("./.tmp-diag-route.mjs", import.meta.url);
  await writeFile(temporal, fuente.replace('"@/lib/demo-base-path.mjs"', '"../src/lib/demo-base-path.mjs"'));
  process.env.JWT_SECRET = "secreto-de-prueba";
  const lineas = [];
  const original = console.log;
  console.log = (l) => lineas.push(l);
  try {
    const { POST } = await import(temporal.href);
    const cuerpo = JSON.stringify({ id: "x", fases: [], marcas: [] });
    const peticion = (token, body = cuerpo) => {
      const r = new Request("http://localhost/api/diagnostico/reloj", { method: "POST", body, headers: token ? { authorization: `Bearer ${token}` } : {} });
      return r;
    };
    assert.equal((await POST(peticion(null))).status, 401);
    assert.equal((await POST(peticion("no-es-jwt"))).status, 401);
    const token = await new SignJWT({ id_usuario: 7, tipo_usuario: "Empleado", id_empresa: 3 })
      .setProtectedHeader({ alg: "HS256" }).sign(new TextEncoder().encode("secreto-de-prueba"));
    assert.equal((await POST(peticion(token, "{no json"))).status, 400);
    assert.equal((await POST(peticion(token, JSON.stringify({ hola: 1 })))).status, 400);
    assert.equal((await POST(peticion(token, "x".repeat(70000)))).status, 413);
    assert.equal((await POST(peticion(token))).status, 204);
    assert.equal(lineas.length, 1);
    assert.match(lineas[0], /^\[diag-reloj\] /);
    const registro = JSON.parse(lineas[0].slice("[diag-reloj] ".length));
    assert.equal(registro.id_usuario, 7);
    assert.equal(registro.id_empresa, 3);
    assert.equal(registro.reporte.id, "x");
  } finally {
    console.log = original;
    await rm(temporal, { force: true });
  }
});
