// Plantillas de WhatsApp (panel del administrador de ADAMIA, 26/11/2026) · lógica de pantalla sin React (se prueba con
// node --test, scripts/test-plantillas-whatsapp.mjs). El servidor es la autoridad (modules/whatsappPlantillas/services/
// reglasMeta.js en el backend); aquí se repiten las reglas de Meta para avisar mientras se escribe y no mandar algo que
// Meta va a rechazar. Formulario: { nombre, categoria, idioma, encabezado: {texto, ejemplo} | null, cuerpo, ejemplos,
// pie, botones: [{ tipo, texto, url?, ejemplo?, telefono? }] }.

export const LIMITES = Object.freeze({ nombre: 512, encabezado: 60, cuerpo: 1024, pie: 60, boton: 25, url: 2000, ejemplo: 200, botones: 10, botonesUrl: 2, botonesTelefono: 1 });
export const NOMBRE_RE = /^[a-z][a-z0-9_]*$/;
export const IDIOMA_RE = /^[a-z]{2,3}(_[A-Z]{2})?$/;
export const IDIOMAS = Object.freeze([{ valor: "es_MX", texto: "Español (México) · es_MX" }, { valor: "es", texto: "Español · es" }, { valor: "en_US", texto: "Inglés (EE. UU.) · en_US" }]);
export const CATEGORIAS = Object.freeze([
  { valor: "UTILITY", texto: "Utilidad", ayuda: "Aviso de un trámite o cuenta (evaluación, encuesta, cita)." },
  { valor: "MARKETING", texto: "Marketing", ayuda: "Todo lo demás: felicitaciones, promociones. Cuesta más por mensaje." },
]);
export const TIPOS_BOTON = Object.freeze([
  { valor: "QUICK_REPLY", texto: "Respuesta rápida" },
  { valor: "URL", texto: "Abrir enlace" },
  { valor: "PHONE_NUMBER", texto: "Llamar" },
]);

// Estado de Meta → chip.
export const ESTADOS = Object.freeze({
  aprobada: { texto: "Aprobada", tono: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  pendiente: { texto: "En revisión", tono: "border-amber-200 bg-amber-50 text-amber-800" },
  rechazada: { texto: "Rechazada", tono: "border-red-200 bg-red-50 text-red-700" },
  en_apelacion: { texto: "En apelación", tono: "border-amber-200 bg-amber-50 text-amber-800" },
  pausada: { texto: "Pausada", tono: "border-orange-200 bg-orange-50 text-orange-800" },
  desactivada: { texto: "Desactivada", tono: "border-slate-300 bg-slate-100 text-slate-700" },
  por_borrarse: { texto: "Por borrarse", tono: "border-slate-300 bg-slate-100 text-slate-700" },
  desconocido: { texto: "Sin estado", tono: "border-slate-300 bg-slate-100 text-slate-700" },
});
export const chipEstado = (estado) => ESTADOS[estado] ?? ESTADOS.desconocido;

// Comparación con el catálogo del sistema → chip.
export const SITUACIONES = Object.freeze({
  falta: { texto: "Falta en Zernio", tono: "border-red-200 bg-red-50 text-red-700" },
  difiere: { texto: "Difiere", tono: "border-amber-200 bg-amber-50 text-amber-800" },
  coincide: { texto: "Coincide", tono: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  sin_cuenta: { texto: "Sin consultar", tono: "border-slate-300 bg-slate-100 text-slate-700" },
});
export const chipSituacion = (s) => SITUACIONES[s] ?? SITUACIONES.sin_cuenta;
export const textoCategoria = (c) => CATEGORIAS.find((x) => x.valor === c)?.texto ?? (c || "—");

const MARCADOR = /\{\{([^{}]*)\}\}/g;
const EMOJI = /\p{Extended_Pictographic}/u;
const t = (v) => (v == null ? "" : String(v));
const limpio = (v) => t(v).trim();

// Números de variable en orden de aparición (con repeticiones) y marcadores que no son {{n}}.
export function marcadoresDe(texto) {
  const numeros = [];
  const invalidos = [];
  for (const m of t(texto).matchAll(MARCADOR)) {
    if (/^[1-9]\d*$/.test(m[1])) numeros.push(Number(m[1]));
    else invalidos.push(m[0]);
  }
  return { numeros, invalidos };
}
export const cuentaVariables = (texto) => new Set(marcadoresDe(texto).numeros).size;
// Siguiente variable para el botón «Agregar variable».
export const siguienteVariable = (texto) => `{{${Math.max(0, ...marcadoresDe(texto).numeros) + 1}}}`;

// Mantiene un ejemplo por variable al escribir el cuerpo (conserva los que ya había).
export const ajustarEjemplos = (cuerpo, ejemplos = []) => Array.from({ length: cuentaVariables(cuerpo) }, (_, i) => ejemplos[i] ?? "");

// Texto con los ejemplos en lugar de {{n}} (vista previa). Sin ejemplo queda {{n}} a la vista.
export const llenar = (texto, ejemplos = []) => t(texto).replace(/\{\{([1-9]\d*)\}\}/g, (m, n) => limpio(ejemplos[Number(n) - 1]) || m);

function erroresVariables(texto, etiqueta) {
  const { numeros, invalidos } = marcadoresDe(texto);
  const e = [];
  if (invalidos.length) e.push(`${etiqueta}: ${invalidos.slice(0, 3).join(", ")} no es una variable válida; usa {{1}}, {{2}}…`);
  if (new Set(numeros).size !== numeros.length) e.push(`${etiqueta}: cada variable va una sola vez.`);
  if (numeros.some((n, i) => n !== i + 1)) e.push(`${etiqueta}: las variables deben ir seguidas y en orden desde {{1}} ({{1}}, {{2}}, {{3}}…), sin saltar números.`);
  return e;
}
function errorEjemplo(v, etiqueta) {
  const x = limpio(v);
  if (!x) return `${etiqueta}: falta el ejemplo.`;
  if (x.length > LIMITES.ejemplo) return `${etiqueta}: el ejemplo pasa de ${LIMITES.ejemplo} caracteres.`;
  if (/[\n\t]| {4,}/.test(x)) return `${etiqueta}: el ejemplo no puede llevar saltos de línea, tabuladores ni 4 espacios seguidos.`;
  return null;
}

// Mismas reglas que el servidor. → [{ campo, mensaje }]
export function validar(f = {}) {
  const errores = [];
  const err = (campo, mensaje) => errores.push({ campo, mensaje });
  const nombre = limpio(f.nombre);
  const cuerpo = t(f.cuerpo).trim();
  const ejemplos = (f.ejemplos ?? []).map(limpio);
  if (!nombre) err("nombre", "Escribe el nombre de la plantilla.");
  else if (!NOMBRE_RE.test(nombre)) err("nombre", "El nombre solo admite minúsculas, números y guion bajo, y empieza con letra (ej. adamia_aviso_nuevo).");
  else if (nombre.length > LIMITES.nombre) err("nombre", `El nombre pasa de ${LIMITES.nombre} caracteres.`);
  if (!CATEGORIAS.some((c) => c.valor === f.categoria)) err("categoria", "Elige la categoría.");
  if (!IDIOMA_RE.test(limpio(f.idioma))) err("idioma", "Idioma inválido: usa un código como es_MX, es o en_US.");
  if (!cuerpo) err("cuerpo", "Escribe el cuerpo del mensaje.");
  else {
    if (cuerpo.length > LIMITES.cuerpo) err("cuerpo", `El cuerpo pasa de ${LIMITES.cuerpo} caracteres (${cuerpo.length}).`);
    for (const m of erroresVariables(cuerpo, "Cuerpo")) err("cuerpo", m);
    if (/^\{\{/.test(cuerpo)) err("cuerpo", "Meta no acepta que el cuerpo empiece con una variable: agrega texto antes.");
    if (/\}\}\s*[.!?]?$/.test(cuerpo)) err("cuerpo", "Meta no acepta que el cuerpo termine con una variable: agrega texto después.");
    if (/\}\}\s*\{\{/.test(cuerpo)) err("cuerpo", "Dos variables no pueden ir juntas: sepáralas con texto.");
  }
  const n = cuentaVariables(cuerpo);
  if (ejemplos.length !== n) err("ejemplos", `El cuerpo tiene ${n} variable(s) y hay ${ejemplos.length} ejemplo(s).`);
  ejemplos.slice(0, n).forEach((v, i) => { const e = errorEjemplo(v, `Ejemplo de {{${i + 1}}}`); if (e) err("ejemplos", e); });

  const enc = limpio(f.encabezado?.texto);
  if (enc) {
    if (enc.length > LIMITES.encabezado) err("encabezado", `El encabezado pasa de ${LIMITES.encabezado} caracteres.`);
    if (/\n/.test(enc)) err("encabezado", "El encabezado va en una sola línea.");
    if (EMOJI.test(enc) || /[*_~`]/.test(enc)) err("encabezado", "El encabezado no admite emojis ni formato (* _ ~ `).");
    const { numeros, invalidos } = marcadoresDe(enc);
    if (invalidos.length || numeros.length > 1 || (numeros.length === 1 && numeros[0] !== 1)) err("encabezado", "El encabezado admite a lo más una variable, {{1}}.");
    if (numeros.length === 1) { const e = errorEjemplo(f.encabezado?.ejemplo, "Ejemplo del encabezado"); if (e) err("encabezado", e); }
  }
  const pie = limpio(f.pie);
  if (pie.length > LIMITES.pie) err("pie", `El pie pasa de ${LIMITES.pie} caracteres.`);
  if (/\{\{/.test(pie)) err("pie", "El pie no admite variables.");

  const botones = f.botones ?? [];
  if (botones.length > LIMITES.botones) err("botones", `Hasta ${LIMITES.botones} botones.`);
  const vistos = new Set();
  botones.forEach((b, i) => {
    const et = `Botón ${i + 1}`;
    const texto = limpio(b.texto);
    if (!texto) err("botones", `${et}: escribe el texto del botón.`);
    else if (texto.length > LIMITES.boton) err("botones", `${et}: el texto pasa de ${LIMITES.boton} caracteres.`);
    if (texto && vistos.has(texto.toLowerCase())) err("botones", `${et}: hay dos botones con el mismo texto.`);
    vistos.add(texto.toLowerCase());
    if (b.tipo === "URL") {
      const url = limpio(b.url);
      let u = null;
      try { u = new URL(url.replace(/\{\{1\}\}$/, "x")); } catch { /* inválida */ }
      if (!u || u.protocol !== "https:") err("botones", `${et}: el enlace debe empezar con https://.`);
      const { numeros, invalidos } = marcadoresDe(url);
      if (invalidos.length || numeros.length > 1 || (numeros.length && !/\{\{1\}\}$/.test(url))) err("botones", `${et}: el enlace admite solo {{1}} y al final.`);
      if (numeros.length) { const e = errorEjemplo(b.ejemplo, `${et}: ejemplo del enlace`); if (e) err("botones", e); }
    }
    if (b.tipo === "PHONE_NUMBER" && !/^\+?\d{8,20}$/.test(limpio(b.telefono).replace(/[\s()-]/g, ""))) err("botones", `${et}: teléfono inválido (con lada del país, ej. +525512345678).`);
  });
  if (botones.filter((b) => b.tipo === "URL").length > LIMITES.botonesUrl) err("botones", `Hasta ${LIMITES.botonesUrl} botones de enlace.`);
  if (botones.filter((b) => b.tipo === "PHONE_NUMBER").length > LIMITES.botonesTelefono) err("botones", "Solo un botón de teléfono.");
  const rapidos = botones.map((b, i) => (b.tipo === "QUICK_REPLY" ? i : -1)).filter((i) => i >= 0);
  if (rapidos.length && rapidos[rapidos.length - 1] - rapidos[0] + 1 !== rapidos.length) err("botones", "Las respuestas rápidas van juntas (todas antes o todas después de los otros botones).");
  return errores;
}

export const erroresDe = (errores, campo) => errores.filter((e) => e.campo === campo).map((e) => e.mensaje);

export const FORMULARIO_VACIO = Object.freeze({ nombre: "", categoria: "UTILITY", idioma: "es_MX", encabezado: null, cuerpo: "", ejemplos: [], pie: "", botones: [] });

// Plantilla (de Zernio o del catálogo) → formulario. `version` = sugerir «…_v2» para una versión nueva.
export function formularioDesde(p, { version = false } = {}) {
  if (!p) return { ...FORMULARIO_VACIO, botones: [] };
  const nombre = version ? siguienteVersion(p.nombre) : t(p.nombre);
  const enc = p.encabezado && !p.encabezado.formato && limpio(p.encabezado.texto) ? { texto: t(p.encabezado.texto), ejemplo: t(p.encabezado.ejemplo) } : null;
  return {
    nombre, categoria: p.categoria || "UTILITY", idioma: p.idioma || "es_MX", encabezado: enc, cuerpo: t(p.cuerpo),
    ejemplos: ajustarEjemplos(p.cuerpo, (p.ejemplos ?? []).map(t)), pie: t(p.pie), botones: (p.botones ?? []).map((b) => ({ ...b })),
  };
}
// adamia_x → adamia_x_v2; adamia_x_v2 → adamia_x_v3.
export function siguienteVersion(nombre) {
  const m = /^(.*)_v(\d+)$/.exec(t(nombre));
  return m ? `${m[1]}_v${Number(m[2]) + 1}` : `${t(nombre)}_v2`;
}

// Cuerpo para la API (sin campos de pantalla).
export function paraApi(f) {
  const enc = limpio(f.encabezado?.texto);
  return {
    nombre: limpio(f.nombre), categoria: f.categoria, idioma: limpio(f.idioma), cuerpo: t(f.cuerpo).trim(), ejemplos: ajustarEjemplos(f.cuerpo, f.ejemplos).map(limpio),
    pie: limpio(f.pie), encabezado: enc ? { texto: enc, ejemplo: cuentaVariables(enc) ? limpio(f.encabezado?.ejemplo) : "" } : null,
    botones: (f.botones ?? []).map((b) => (b.tipo === "URL" ? { tipo: "URL", texto: limpio(b.texto), url: limpio(b.url), ejemplo: limpio(b.ejemplo) }
      : b.tipo === "PHONE_NUMBER" ? { tipo: "PHONE_NUMBER", texto: limpio(b.texto), telefono: limpio(b.telefono) } : { tipo: "QUICK_REPLY", texto: limpio(b.texto) })),
  };
}

// Filtro de la lista: categoría, estado y texto (nombre o cuerpo).
export function filtrar(plantillas = [], { categoria = "", estado = "", texto = "" } = {}) {
  const q = limpio(texto).toLowerCase();
  return plantillas.filter((p) => (!categoria || p.categoria === categoria) && (!estado || p.estado === estado)
    && (!q || p.nombre.toLowerCase().includes(q) || t(p.cuerpo).toLowerCase().includes(q)));
}
// Conteo por estado para los chips del filtro.
export const conteoEstados = (plantillas = []) => plantillas.reduce((a, p) => ({ ...a, [p.estado]: (a[p.estado] ?? 0) + 1 }), {});

// Resultado de «Enviar a aprobación las que faltan» → texto para el aviso.
export function resumenEnvio(r) {
  if (!r) return "";
  const partes = [];
  if (r.creadas?.length) partes.push(`${r.creadas.length} enviada(s) a aprobación de Meta`);
  if (r.ya_existian?.length) partes.push(`${r.ya_existian.length} ya existía(n)`);
  if (r.difieren?.length) partes.push(`${r.difieren.length} difiere(n) (revísalas a mano)`);
  if (r.errores?.length) partes.push(`${r.errores.length} con error`);
  if (r.sin_cuenta?.length) partes.push(`${r.sin_cuenta.length} sin cuenta configurada`);
  return partes.length ? `${partes.join(" · ")}.` : "No había nada que enviar.";
}

// Cuántas del catálogo se pueden mandar con el botón (solo las que faltan).
export const faltantes = (filas = []) => filas.filter((f) => f.situacion === "falta");

// Error de axios → texto.
export const errorDe = (e, d = "No se pudo completar la acción.") => e?.response?.data?.error || e?.message || d;
