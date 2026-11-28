// Candado automático del SISTEMA DE DISEÑO (28/11/2026, mockup aprobado; docs/sistema-diseno.md). Revisa src/ (sin la
// página pública: components/landing, app/home, app/(public), app/(landing)) y FALLA si aparece algo nuevo de esto:
//   degradado          bg-gradient-*, linear-gradient(, radial-gradient(  → sin degradados, nunca.
//   peso-800           font-extrabold, font-black, font-weight 800/900     → títulos en 700.
//   boton-no-azul      un <Button> con fondo de otro color en className (bg-green-600, bg-[#2563EB]…) o la variante
//                      «reactivate»                                       → usa variant="default" (azul) u otra variante.
//   primario-propio    --primary: en un .module.css                        → el color sale de globals.css.
//   fondo-decorativo   bg-<color>-50/100/200 (rosa, verde, morado…) en los archivos YA MIGRADOS (lista MIGRADOS y
//                      todo src/components/formulario)                     → el color solo dice estado.
//
// ¿Y lo que ya existía? Está en scripts/candado-diseno.excepciones.json: cuántas veces aparece cada regla en cada
// archivo HOY. El candado es un TRINQUETE: si un archivo tiene MÁS de lo anotado (o aparece un archivo nuevo), falla;
// si tiene menos, avisa para bajar el número. Así es estricto con lo nuevo sin romper CI hoy.
//
// Uso:
//   node scripts/candado-diseno.mjs               revisa (sale con 1 si hay algo nuevo)
//   node scripts/candado-diseno.mjs --actualizar  baja los números de la lista a lo que hay hoy (NUNCA los sube)
// Pruebas de las reglas: node --test scripts/test-candado-diseno.mjs
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(REPO, "src");
const ARCHIVO_EXCEPCIONES = path.join(REPO, "scripts/candado-diseno.excepciones.json");

/** Carpetas de la página pública (tienen su propio estilo aprobado): no se revisan. */
export const PUBLICAS = ["src/components/landing/", "src/app/home/", "src/app/(public)/", "src/app/(landing)/"];

/** Archivos ya migrados al sistema de diseño: aquí además se prohíben los fondos de color decorativos. */
export const MIGRADOS = [
  "src/app/panel/contratos/formulario/FormularioContrato.jsx",
  "src/app/panel/contratos/formulario/campos.jsx",
  "src/app/panel/empleados/FormularioEmpleado.jsx",
  "src/app/panel/empleados/EncabezadoFicha.jsx",
  "src/app/panel/empleados/tabs/TabJornada.jsx",
  "src/app/panel/empleados/tabs/TabContactosEmergencia.jsx",
  "src/app/panel/catalogos/puestos/PositionFormDialog.jsx",
  "src/components/nomina/RegistrarPrestamo.jsx",
  "src/components/NewActaModal.jsx",
  "src/app/panel/permisos/PermisoDialog.jsx",
];
const esMigrado = (ruta) => MIGRADOS.includes(ruta) || ruta.startsWith("src/components/formulario/");

const COLORES_DECORATIVOS = "pink|rose|green|emerald|teal|purple|violet|fuchsia|indigo|cyan|sky|lime|amber|orange|yellow|blue";
// Fondos que no son «otro color» en un botón (blanco, transparente, los grises del sistema o el azul de marca).
const FONDOS_PERMITIDOS_BOTON = /^bg-(brand|white|transparent|franja|fondo-pagina|borde|peligro-suave)\b/;

const contar = (texto, re) => (texto.match(re) ?? []).length;

/** Las etiquetas de apertura <Button …> completas (respeta llaves y comillas: `onClick={() => x}` no la corta). */
export function etiquetasBoton(texto) {
  const etiquetas = [];
  let i = texto.indexOf("<Button");
  while (i !== -1) {
    const siguiente = texto[i + 7];
    if (/[\s>/]/.test(siguiente ?? "")) {
      let llaves = 0;
      let comilla = null;
      let j = i + 7;
      for (; j < texto.length; j++) {
        const c = texto[j];
        if (comilla) { if (c === comilla && texto[j - 1] !== "\\") comilla = null; continue; }
        if (c === '"' || c === "'" || c === "`") comilla = c;
        else if (c === "{") llaves++;
        else if (c === "}") llaves--;
        else if (c === ">" && llaves === 0) break;
      }
      etiquetas.push(texto.slice(i, j + 1));
    }
    i = texto.indexOf("<Button", i + 7);
  }
  return etiquetas;
}

/** ¿Este <Button …> pinta un fondo de otro color o usa la variante quitada? */
export function botonNoAzul(etiqueta) {
  if (/variant=["']reactivate["']/.test(etiqueta)) return true;
  const clases = (etiqueta.match(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/) ?? []).slice(1).find(Boolean) ?? "";
  return clases.split(/\s+/).some((c) => c.startsWith("bg-") && !FONDOS_PERMITIDOS_BOTON.test(c));
}

/** Cuenta cada regla en el texto de un archivo. ruta: relativa al repo, con «/». */
export function contarReglas(texto, ruta) {
  const r = {
    degradado: contar(texto, /bg-gradient-|linear-gradient\(|radial-gradient\(/g),
    "peso-800": contar(texto, /\bfont-(extrabold|black)\b|font-weight:\s*(800|900)\b|fontWeight:\s*["']?(800|900)\b|font-\[(800|900)\]/g),
    "boton-no-azul": /\.(jsx?|mjs)$/.test(ruta) ? etiquetasBoton(texto).filter(botonNoAzul).length : 0,
    "primario-propio": ruta.endsWith(".module.css") ? contar(texto, /--primary\s*:/g) : 0,
    "fondo-decorativo": esMigrado(ruta) ? contar(texto, new RegExp(`\\bbg-(${COLORES_DECORATIVOS})-(50|100|200)\\b`, "g")) : 0,
  };
  return Object.fromEntries(Object.entries(r).filter(([, n]) => n > 0));
}

/** Compara lo contado con las excepciones. → { nuevos: [texto], bajaron: [texto] } */
export function compararConExcepciones(conteos, excepciones) {
  const nuevos = [];
  const bajaron = [];
  for (const [ruta, reglas] of Object.entries(conteos)) {
    for (const [regla, n] of Object.entries(reglas)) {
      const permitido = excepciones[regla]?.[ruta] ?? 0;
      if (n > permitido) nuevos.push(`${regla}: ${ruta} tiene ${n} (permitido ${permitido})`);
    }
  }
  for (const [regla, archivos] of Object.entries(excepciones)) {
    if (regla.startsWith("_")) continue;
    for (const [ruta, permitido] of Object.entries(archivos)) {
      const n = conteos[ruta]?.[regla] ?? 0;
      if (n < permitido) bajaron.push(`${regla}: ${ruta} ahora tiene ${n} (la lista dice ${permitido})`);
    }
  }
  return { nuevos, bajaron };
}

function archivos(dir) {
  const salida = [];
  for (const nombre of readdirSync(dir)) {
    const completo = path.join(dir, nombre);
    if (statSync(completo).isDirectory()) salida.push(...archivos(completo));
    else if (/\.(jsx?|mjs|css)$/.test(nombre)) salida.push(completo);
  }
  return salida;
}

/** Cuenta todo src/ (sin lo público). → { ruta: { regla: n } } */
export function contarSrc() {
  const conteos = {};
  for (const completo of archivos(SRC)) {
    const ruta = path.relative(REPO, completo).split(path.sep).join("/");
    if (PUBLICAS.some((p) => ruta.startsWith(p))) continue;
    const r = contarReglas(readFileSync(completo, "utf8"), ruta);
    if (Object.keys(r).length) conteos[ruta] = r;
  }
  return conteos;
}

const leerExcepciones = () => JSON.parse(readFileSync(ARCHIVO_EXCEPCIONES, "utf8"));

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const conteos = contarSrc();
  const excepciones = leerExcepciones();
  const { nuevos, bajaron } = compararConExcepciones(conteos, excepciones);
  if (process.argv.includes("--actualizar")) {
    if (nuevos.length) {
      console.error("✖ No se actualiza: hay casos NUEVOS. Corrígelos (la lista solo puede bajar):\n  " + nuevos.join("\n  "));
      process.exit(1);
    }
    for (const [regla, lista] of Object.entries(excepciones)) {
      if (regla.startsWith("_")) continue;
      for (const ruta of Object.keys(lista)) {
        const n = conteos[ruta]?.[regla] ?? 0;
        if (n) lista[ruta] = n; else delete lista[ruta];
      }
    }
    writeFileSync(ARCHIVO_EXCEPCIONES, JSON.stringify(excepciones, null, 2) + "\n");
    console.log(`✔ Lista de excepciones al día (${bajaron.length} renglones bajaron).`);
    process.exit(0);
  }
  if (bajaron.length) console.log("ℹ Ya hay menos casos que en la lista; bájala con «node scripts/candado-diseno.mjs --actualizar»:\n  " + bajaron.join("\n  "));
  if (nuevos.length) {
    console.error("✖ Candado del sistema de diseño (docs/sistema-diseno.md): casos nuevos.\n  " + nuevos.join("\n  "));
    process.exit(1);
  }
  const total = Object.entries(excepciones).filter(([k]) => !k.startsWith("_")).reduce((a, [, l]) => a + Object.values(l).reduce((x, y) => x + y, 0), 0);
  console.log(`✔ Candado del sistema de diseño: nada nuevo (${total} casos viejos en la lista de excepciones, por migrar).`);
}
