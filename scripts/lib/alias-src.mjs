// Ganchos de resolución para pruebas en Node: «@/x» → src/x y rutas relativas sin
// extensión (como las escribe Next) → .js / .mjs. Uso: register(new URL("./lib/alias-src.mjs", import.meta.url)).
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = new URL("../../src/", import.meta.url);

export async function resolve(especificador, contexto, siguiente) {
  let destino = null;
  if (especificador.startsWith("@/")) destino = new URL(especificador.slice(2), SRC);
  else if ((especificador.startsWith("./") || especificador.startsWith("../")) && contexto.parentURL?.startsWith("file:")) {
    destino = new URL(especificador, contexto.parentURL);
  }
  if (destino) {
    const ruta = fileURLToPath(destino);
    for (const ext of ["", ".js", ".mjs"]) {
      if (existsSync(ruta + ext) && (ext || /\.[cm]?js$/.test(ruta))) return siguiente(pathToFileURL(ruta + ext).href, contexto);
    }
  }
  return siguiente(especificador, contexto);
}
