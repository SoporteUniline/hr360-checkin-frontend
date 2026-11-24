// Regresión: en dev/prod el proxy manda /api/* al
// backend de Express, salvo unas rutas que sí llegan a Next. Las rutas de Next que usa el navegador deben llamarse por
// /internal/* (con su rewrite en next.config.mjs), nunca por /api/*.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

// Rutas de src/app/api que el proxy sí entrega a Next (comprobado contra dev.adamia.com.mx el 23/11/2026).
const LLEGAN_A_NEXT = new Set(["bot", "empresas", "image-proxy"]);
const raiz = new URL("../", import.meta.url).pathname;

async function archivos(dir) {
  const salida = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) salida.push(...(await archivos(p)));
    else if (/\.(jsx?|mjs)$/.test(e.name)) salida.push(p);
  }
  return salida;
}

test("el navegador no llama rutas de Next por /api/* que el proxy manda al backend", async () => {
  const rutasNext = (await readdir(path.join(raiz, "src/app/api"), { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  const internas = rutasNext.filter((r) => !LLEGAN_A_NEXT.has(r));
  const malos = [];
  for (const f of await archivos(path.join(raiz, "src"))) {
    if (f.includes(`${path.sep}app${path.sep}api${path.sep}`)) continue;
    const texto = await readFile(f, "utf8");
    for (const r of internas) {
      if (new RegExp(`["'\`]/api/${r}(/|["'\`?$])`).test(texto)) malos.push(`${path.relative(raiz, f)} → /api/${r}`);
    }
  }
  assert.deepEqual(malos, [], "usa /internal/<ruta> y agrega su rewrite en next.config.mjs");
});

test("cada ruta interna usada tiene su rewrite /internal → /api", async () => {
  const config = await readFile(path.join(raiz, "next.config.mjs"), "utf8");
  for (const r of ["solicitudes-equipo", "control-activos", "offline-clock", "diagnostico"]) {
    assert.match(config, new RegExp(`source: "/internal/${r}[^"]*",\\s*destination: "/api/${r}`), r);
  }
});
