// Clima · canales, recordatorios, vista del jefe y «¿Cómo te fue hoy?» (lógica pura, 26/11/2026, agente clima1).
// Las reglas viven en el servidor (backend docs/clima-nom035.md, «Canales, avisos y vista del jefe»); aquí solo se arma
// lo que ve la pantalla. Probado en scripts/test-clima-canales.mjs.

export const MAX_RECORDATORIOS = 3;
// Opciones de «días antes del cierre» que ofrece la pantalla (el servidor acepta 0 a 30).
export const DIAS_RECORDATORIO = Object.freeze([0, 1, 2, 3, 5, 7]);
export const RECORDATORIOS_SUGERIDOS = Object.freeze([3, 1]);

// Texto corto para los botones (la leyenda ya dice «antes del cierre»).
export const textoCortoDias = (d) => (d === 0 ? "El día del cierre" : d === 1 ? "1 día antes" : `${d} días antes`);
export const textoDiasAntes = (d) => (d === 0 ? "El día que cierra" : d === 1 ? "1 día antes del cierre" : `${d} días antes del cierre`);

// Alterna un día en la lista (máximo 3, sin repetir, de más lejos a más cerca del cierre).
export function alternarRecordatorio(lista, dia) {
  const actual = [...new Set((lista ?? []).map(Number).filter(Number.isInteger))];
  const siguiente = actual.includes(dia) ? actual.filter((d) => d !== dia) : actual.length >= MAX_RECORDATORIOS ? actual : [...actual, dia];
  return siguiente.sort((a, b) => b - a);
}

const masDias = (f, d) => {
  const x = new Date(`${f}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + d);
  return x.toISOString().slice(0, 10);
};

// Fechas en que saldrán (mismo criterio del servidor: después de abrir y hasta el cierre).
export function fechasRecordatorios(abre, cierra, lista) {
  if (!abre || !cierra) return [];
  return [...new Set(lista ?? [])]
    .map((d) => ({ dias: d, fecha: masDias(cierra, -d) }))
    .filter((x) => x.fecha > abre && x.fecha <= cierra)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// Recordatorios que no saldrán porque caen el día que abre o antes.
export const recordatoriosFuera = (abre, cierra, lista) =>
  (lista ?? []).filter((d) => !fechasRecordatorios(abre, cierra, [d]).length);

// Texto del canal WhatsApp en la pantalla de lanzar.
export function estadoWhatsapp(canales) {
  if (!canales) return { disponible: false, texto: "Cargando…" };
  if (!canales.migracion) return { disponible: false, texto: "Falta preparar la base de datos (migración de canales)." };
  if (!canales.whatsapp?.configurado)
    return { disponible: true, respaldo: true, texto: "WhatsApp aún no está configurado: mientras tanto se manda por correo." };
  return { disponible: true, respaldo: false, texto: "Liga personal sin contraseña. Si no llega (sin teléfono o plantilla sin aprobar), se manda por correo." };
}

// ───────── «¿Cómo te fue hoy?» ─────────
export const CARAS = Object.freeze({ 1: "😣", 2: "🙁", 3: "😐", 4: "🙂", 5: "😄" });

// ¿Ya cerró su jornada hoy? Filas de /reloj/registros-del-dia-empleado: hay registros y TODOS tienen salida (salida,
// hora_salida o salida_corregida). Al checar, la app del empleado regresa a su Inicio: ahí aparece la pregunta, aparte
// de la checada (nunca la frena).
export function salidaRegistrada(filas) {
  const valida = (v) => Boolean(v) && v !== "-" && v !== "—";
  const lista = Array.isArray(filas) ? filas : [];
  return lista.length > 0 && lista.every((f) => valida(f?.salida_corregida) || valida(f?.hora_salida) || valida(f?.salida));
}

// Llave de «ya la cerré hoy en este teléfono» (además de la marca del servidor), para no mostrarla otra vez al recargar.
export const llavePulso = (idCampania, fecha) => `clima-pulso:${idCampania}:${fecha}`;

// ───────── vista del jefe ─────────
export const SEGMENTO_EQUIPO = "equipo";

export function rutaEquipo(base, idCampania) {
  return `${base}/${SEGMENTO_EQUIPO}/${Number(idCampania)}`;
}

// Segmentos de la ruta [[...id]] → { vista: "lista" | "encuesta" | "equipo", id }.
export function vistaDeRuta(segmentos = []) {
  const [a, b] = segmentos;
  if (a === SEGMENTO_EQUIPO) {
    const id = Number(b);
    return Number.isInteger(id) && id > 0 ? { vista: "equipo", id } : { vista: "lista", id: null };
  }
  const id = Number(a);
  return Number.isInteger(id) && id > 0 ? { vista: "encuesta", id } : { vista: "lista", id: null };
}

// Aviso de privacidad para el jefe: con equipos chicos puede deducir respuestas (mínimo vigente de clima).
export function avisoEquipoChico(respuestas) {
  return Number(respuestas) > 0 && Number(respuestas) < 5
    ? "Tu equipo es pequeño: no intentes deducir quién contestó qué. Úsalo para conversar en grupo, no para buscar a alguien."
    : null;
}

// Diferencia del equipo contra la empresa por dimensión (puntos de % favorable).
export function contraEmpresa(equipo, empresa) {
  const ref = new Map((empresa?.dimensiones ?? []).map((d) => [d.clave, d.favorabilidad?.favorable ?? null]));
  return (equipo?.dimensiones ?? []).map((d) => {
    const fav = d.favorabilidad?.favorable ?? null;
    const emp = ref.get(d.clave) ?? null;
    return { clave: d.clave, nombre: d.nombre, favorabilidad: d.favorabilidad, favorable: fav, empresa: emp, dif: fav === null || emp === null ? null : fav - emp };
  });
}

export const textoDif = (dif) => (dif === null || dif === undefined ? "—" : dif > 0 ? `+${dif} vs. empresa` : dif < 0 ? `−${Math.abs(dif)} vs. empresa` : "igual que la empresa");
