// «El día se corrige en el reloj» (Asistencias). Lógica pura del modal del reloj y del estado del día:
// - convierte las checadas de GET /checador/asistencias/:id/reloj a renglones editables y de vuelta al cuerpo exacto
//   del PUT (mismo contrato que el backend);
// - calcula en vivo trabajadas, comida, extra y estado (referencia: resumen() del mockup aprobado Main.dc.html);
// - valida cada renglón como errorDe() del mockup (el servidor valida lo mismo y responde errores por renglón);
// - estado del día sin checadas (catálogo tipos_permiso con cuenta_como_asistencia = 0) y acciones masivas.
// Probado en scripts/test-reloj-dia.mjs.
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export const DB_TZ = "America/Mexico_City";
const FORMATO_BD = "YYYY-MM-DD HH:mm:ss";
export const TOLERANCIA_MIN = 10;
export const CONCEPTOS = [["jornada", "Jornada"], ["comida", "Comida"], ["extra", "Hora extra"]];
// «Separar como hora extra» solo se ofrece desde 30 min después de la salida programada (como el mockup).
const MIN_SEPARAR = 30;

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const aMin = (h) => {
  const m = HHMM.exec(String(h ?? ""));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
export const aHHMM = (min) => {
  const v = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
};
const corta = (h) => (h ? String(h).slice(0, 5) : null);

// Duración «6 h 20 min» / «45 min» / «—».
export function durTexto(min) {
  if (min == null || !Number.isFinite(min) || min <= 0) return "—";
  const h = Math.floor(min / 60), r = Math.round(min % 60);
  if (!h) return `${r} min`;
  return r ? `${h} h ${String(r).padStart(2, "0")} min` : `${h} h`;
}
// «9:18 a.m.» desde «HH:mm».
export function hora12Txt(h) {
  const m = aMin(h);
  if (m == null) return "—";
  const hh = Math.floor(m / 60), mm = m % 60;
  return `${hh % 12 === 0 ? 12 : hh % 12}:${String(mm).padStart(2, "0")} ${hh < 12 ? "a.m." : "p.m."}`;
}
export const fechaTxt = (f) => String(f ?? "").slice(0, 10).split("-").reverse().join("/");

// ——— Horario del día ———
// Turno nocturno: la salida programada es igual o menor que la entrada → la salida cae al día siguiente.
export function horarioMin(horario) {
  const pe = aMin(corta(horario?.entrada));
  let ps = aMin(corta(horario?.salida));
  if (pe == null || ps == null) return null;
  const nocturno = ps <= pe;
  if (nocturno) ps += 1440;
  let sc = aMin(corta(horario?.salida_comida));
  let rc = aMin(corta(horario?.regreso_comida));
  if (sc != null && nocturno && sc < pe) sc += 1440;
  if (rc != null && nocturno && rc < pe) rc += 1440;
  if (sc != null && rc != null && rc <= sc) rc = null;
  return { pe, ps, sc: rc == null ? null : sc, rc, nocturno };
}
export function minutosProgramados(horario) {
  const h = horarioMin(horario);
  if (!h) return null;
  return h.ps - h.pe - (h.sc != null ? h.rc - h.sc : 0);
}

// ——— Renglones: API ⇄ edición ———
// Minuto relativo a la medianoche de `fecha` en la zona de la empresa (puede pasar de 1440: día siguiente).
function aMinDelDia(valor, fecha, zona) {
  if (!valor) return null;
  const d = dayjs.tz(valor, DB_TZ).tz(zona || DB_TZ);
  const dias = Math.round((dayjs.utc(d.format("YYYY-MM-DD")).valueOf() - dayjs.utc(fecha).valueOf()) / 86400000);
  return dias * 1440 + d.hour() * 60 + d.minute();
}
function aBD(fecha, min, zona) {
  const dia = dayjs.utc(fecha).add(Math.floor(min / 1440), "day").format("YYYY-MM-DD");
  return dayjs.tz(`${dia} ${aHHMM(min)}`, zona || DB_TZ).tz(DB_TZ).format(FORMATO_BD);
}

let secuencia = 0;
const nuevaClave = () => `n${++secuencia}`;

// Renglón editable: ini/fin en minutos del día; oIni/oFin lo que marcó el reloj (null si es manual).
export function desdeApi(registros, { fecha, zona } = {}) {
  return (Array.isArray(registros) ? registros : []).map((r) => {
    const ini = aMinDelDia(r.entrada, fecha, zona);
    const fin = aMinDelDia(r.salida, fecha, zona);
    const manual = r.origen === "manual";
    return {
      k: `r${r.id}`, id: r.id, ini, fin,
      oIni: manual ? null : aMinDelDia(r.entrada_reloj ?? r.entrada, fecha, zona),
      oFin: manual ? null : aMinDelDia(r.salida_reloj, fecha, zona),
      // Lo guardado puede venir ya corregido: «editado» compara contra lo que se cargó.
      cIni: ini, cFin: fin,
      concepto: ["jornada", "comida", "extra"].includes(r.concepto) ? r.concepto : "jornada",
      motivo: r.motivo ?? "", origen: manual ? "manual" : "reloj", anulado: Boolean(r.anulado), anuladoAntes: Boolean(r.anulado),
      motivoAntes: r.motivo ?? "",
      id_autoriza: r.id_autoriza ?? null, autoriza_no: Boolean(r.autoriza_no),
    };
  });
}

export function nuevoRenglon(ini, fin, concepto = "jornada", motivo = "") {
  return { k: nuevaClave(), ini, fin, oIni: null, oFin: null, cIni: null, cFin: null, concepto, motivo, origen: "manual",
    anulado: false, anuladoAntes: false, motivoAntes: "", id_autoriza: null, autoriza_no: false, nuevo: true };
}

// Hora escrita en un campo → minuto del día. La salida antes de la entrada solo pasa al día siguiente en turno nocturno.
export function minDeCampo(valor, { referencia = null, nocturno = false } = {}) {
  const m = aMin(valor);
  if (m == null) return null;
  if (referencia != null && referencia >= 1440) return m + 1440;
  if (referencia != null && nocturno && m <= referencia % 1440) return m + 1440;
  return m;
}

// Cuerpo exacto del PUT /:id/reloj, en el mismo orden en que se ven los renglones (los errores vuelven por índice).
export function cuerpoPut(renglones, { fecha, zona } = {}) {
  return {
    registros: renglones.map((r) => ({
      ...(r.id != null ? { id: r.id } : {}),
      entrada: r.ini == null ? null : aBD(fecha, r.ini, zona),
      salida: r.fin == null ? null : aBD(fecha, r.fin, zona),
      concepto: r.concepto,
      motivo: r.motivo ? r.motivo : null,
      anulado: Boolean(r.anulado),
      id_autoriza: r.autoriza_no ? null : r.id_autoriza ?? null,
      autoriza_no: Boolean(r.autoriza_no),
    })),
  };
}

// Errores 400 del servidor ({ errores: [{ indice, error }] }) → { [clave del renglón]: texto }.
export function erroresPorRenglon(respuesta, renglones) {
  const out = {};
  for (const e of Array.isArray(respuesta?.errores) ? respuesta.errores : []) {
    const r = renglones[Number(e.indice)];
    if (r) out[r.k] = out[r.k] ? `${out[r.k]} ${e.error}` : String(e.error ?? "");
  }
  return out;
}

export const vivos = (regs) => regs.filter((r) => !r.anulado);
export const ordenar = (regs) => regs.slice().sort((a, b) => (a.ini ?? 1e9) - (b.ini ?? 1e9) || String(a.k).localeCompare(String(b.k)));

// ¿Cambió algo que pide motivo? «Separar como extra» no cambia horas: no pide motivo.
export function editado(r) {
  if (r.deSeparar) return false;
  if (r.origen === "manual" && r.nuevo) return true;
  if (r.anulado && !r.anuladoAntes) return true;
  if (r.separado && r.ini === r.cIni) return false;
  return r.ini !== r.cIni || r.fin !== r.cFin;
}

// Valor del select «¿Quién autoriza?»: "" | "no" | "<id>".
export const autorizaValor = (r) => (r.autoriza_no ? "no" : r.id_autoriza != null ? String(r.id_autoriza) : "");
export const conAutoriza = (valor) => (valor === "no" ? { autoriza_no: true, id_autoriza: null }
  : valor ? { autoriza_no: false, id_autoriza: Number(valor) } : { autoriza_no: false, id_autoriza: null });
const sinAutoriza = (r) => r.id_autoriza == null && !r.autoriza_no;

export function errorDe(r, todos) {
  if (r.anulado) return !r.anuladoAntes && !r.motivo ? "Para anular una checada del reloj elige el motivo." : "";
  if (r.ini == null) return "Falta la entrada.";
  if (r.fin == null && (editado(r) || r.origen === "manual")) return "Falta la salida.";
  if (r.fin != null && r.fin <= r.ini) return "La salida debe ser después de la entrada.";
  const encima = todos.some((o) => o.k !== r.k && !o.anulado && o.ini != null && o.fin != null && r.fin != null
    && r.ini < o.fin && o.ini < r.fin);
  if (encima) return "Se encima con otro registro.";
  if (editado(r) && !r.motivo) return r.origen === "manual" ? "Registro agregado: elige el motivo." : "Cambiaste la hora: elige el motivo.";
  if (r.concepto === "extra" && sinAutoriza(r)) return "Hora extra: falta quién autoriza.";
  return "";
}
export function errores(regs) {
  const out = {};
  for (const r of regs) { const e = errorDe(r, regs); if (e) out[r.k] = e; }
  return out;
}

// Motivo de permiso del catálogo (tipos_permiso con es_permiso = 1) llega como «tp:<id>».
const esPermiso = (motivo) => /^tp:/.test(String(motivo ?? ""));

// Cálculo del día (mockup resumen()). estadoDia: { texto, clave } del día sin checadas (falta, descanso, vacaciones…).
export function resumen(regs, horario, { tolerancia = TOLERANCIA_MIN, estadoDia = null } = {}) {
  const v = vivos(regs);
  const h = horarioMin(horario);
  const largo = (r) => (r.ini != null && r.fin != null && r.fin > r.ini ? r.fin - r.ini : 0);
  const trabajo = v.filter((r) => r.concepto !== "comida");
  const jornada = v.filter((r) => r.concepto === "jornada");
  const extraReg = v.filter((r) => r.concepto === "extra");
  const entradas = trabajo.map((r) => r.ini).filter((x) => x != null).sort((a, b) => a - b);
  const entrada = entradas.length ? entradas[0] : null;
  const abierto = trabajo.some((r) => r.ini != null && r.fin == null);
  const fines = trabajo.map((r) => r.fin).filter((x) => x != null);
  const salida = abierto || !fines.length ? null : Math.max(...fines);
  const finJ = jornada.map((r) => r.fin).filter((x) => x != null);
  const ultimaJornada = finJ.length ? Math.max(...finJ) : null;
  const sinSeparar = h && !abierto && ultimaJornada != null && ultimaJornada - h.ps >= MIN_SEPARAR ? ultimaJornada - h.ps : 0;
  const comida = v.filter((r) => r.concepto === "comida").reduce((s, r) => s + largo(r), 0);
  const extraMin = extraReg.reduce((s, r) => s + largo(r), 0);
  const trabajadas = jornada.reduce((s, r) => s + largo(r), 0) - sinSeparar;
  const extraPorAutorizar = extraReg.filter(sinAutoriza).reduce((s, r) => s + largo(r), 0) + sinSeparar;
  const extraNoAut = extraReg.filter((r) => r.autoriza_no).reduce((s, r) => s + largo(r), 0);
  const primera = trabajo.slice().sort((a, b) => (a.ini ?? 0) - (b.ini ?? 0))[0];
  const ultima = jornada.slice().sort((a, b) => (b.fin ?? 0) - (a.fin ?? 0))[0];
  let estado;
  if (!v.length) {
    estado = { texto: estadoDia?.texto || "Sin checadas", clave: estadoDia?.clave || "sin_checadas" };
  } else if (abierto) {
    estado = { texto: "Sin salida", clave: "sin_salida" };
  } else if (!h) {
    estado = { texto: "Asistió", clave: "asistio" };
  } else {
    const retardo = entrada - h.pe;
    const antes = ultimaJornada != null ? h.ps - ultimaJornada : 0;
    const permTarde = primera && esPermiso(primera.motivo);
    const permAntes = ultima && esPermiso(ultima.motivo);
    if (retardo > tolerancia && !permTarde) estado = { texto: `Retardo +${retardo} min`, clave: "retardo" };
    else if (antes > tolerancia && !permAntes) estado = { texto: `Salió antes −${durTexto(antes)}`, clave: "salio_antes" };
    else if (retardo > tolerancia) estado = { texto: "Entró tarde con permiso", clave: "permiso" };
    else if (antes > tolerancia) estado = { texto: "Salió antes con permiso", clave: "permiso" };
    else estado = { texto: "Asistió", clave: "asistio" };
  }
  return { entrada, salida, abierto, comida, extraMin, extraPorAutorizar, extraNoAut, sinSeparar, trabajadas,
    estado, hayRegs: v.length > 0, programadas: minutosProgramados(horario) };
}

// ——— Acciones del modal ———
// «Cargar su horario normal»: jornada (y comida si el horario la tiene) como renglones agregados con motivo.
export function horarioNormal(horario, motivo = "") {
  const h = horarioMin(horario);
  if (!h) return [];
  if (h.sc != null && h.sc > h.pe && h.rc < h.ps) {
    return [nuevoRenglon(h.pe, h.sc, "jornada", motivo), nuevoRenglon(h.sc, h.rc, "comida", motivo), nuevoRenglon(h.rc, h.ps, "jornada", motivo)];
  }
  return [nuevoRenglon(h.pe, h.ps, "jornada", motivo)];
}

// «+ Agregar registro»: empieza donde terminó el último; si ya pasó la salida programada, como hora extra.
export function agregarRegistro(regs, horario) {
  const h = horarioMin(horario);
  const cerrados = vivos(regs).filter((r) => r.fin != null);
  if (!cerrados.length) return [...regs, nuevoRenglon(h?.pe ?? 540, h?.ps ?? null, "jornada")];
  const desde = Math.max(...cerrados.map((r) => r.fin));
  return [...regs, nuevoRenglon(desde, null, h && desde >= h.ps ? "extra" : "jornada")];
}

// «+ Comida»: la del horario; si no tiene, una hora a media jornada.
export function agregarComida(regs, horario) {
  const h = horarioMin(horario);
  if (h?.sc != null) return [...regs, nuevoRenglon(h.sc, h.rc, "comida")];
  const mitad = h ? h.pe + Math.round((h.ps - h.pe) / 2 / 30) * 30 : 780;
  return [...regs, nuevoRenglon(mitad, mitad + 60, "comida")];
}
export const puedeComida = (regs) => vivos(regs).length > 0 && !vivos(regs).some((r) => r.concepto === "comida");

// «Separar X después de la salida como hora extra»: parte la última jornada en la salida programada.
export function separarExtra(regs, horario) {
  const h = horarioMin(horario);
  if (!h) return regs;
  const j = vivos(regs).filter((r) => r.concepto === "jornada" && r.fin != null).sort((a, b) => b.fin - a.fin)[0];
  if (!j || j.fin - h.ps < MIN_SEPARAR) return regs;
  const extra = { ...nuevoRenglon(h.ps, j.fin, "extra", ""), deSeparar: true };
  return regs.map((r) => (r.k === j.k ? { ...r, fin: h.ps, separado: true } : r)).concat([extra]);
}

// Anular (del reloj) / restaurar / quitar (agregado).
export function quitarORestaurar(regs, k) {
  const r = regs.find((x) => x.k === k);
  if (!r) return regs;
  if (r.origen === "manual" && r.nuevo) return regs.filter((x) => x.k !== k);
  return regs.map((x) => (x.k === k ? { ...x, anulado: !x.anulado } : x));
}
export const etiquetaQuitar = (r) => (r.origen === "manual" && r.nuevo ? "Quitar" : r.anulado ? "Restaurar" : "Anular checada");

// Texto bajo la hora: «reloj», «reloj: 9:18 a.m.» o «agregado».
export function origenTexto(r, lado = "ini") {
  if (r.origen === "manual") return lado === "ini" ? "agregado" : "";
  const o = lado === "ini" ? r.oIni : r.oFin;
  const v = lado === "ini" ? r.ini : r.fin;
  if (lado === "fin" && o == null) return v == null ? "" : "reloj: sin salida";
  if (o === v) return lado === "ini" ? "reloj" : "";
  return `reloj: ${hora12Txt(aHHMM(o))}`;
}

// ——— Estado del día sin checadas ———
const num = (v) => Number(v ?? 0);
export function tiposEstadoDia(tiposPermiso) {
  const lista = Array.isArray(tiposPermiso) ? tiposPermiso : tiposPermiso?.tiposPermiso ?? [];
  return lista.filter((t) => num(t.cuenta_como_asistencia) === 0 && !num(t.borrado) && !num(t.eliminado));
}
// Qué pide el tipo: «folio» (incapacidad), «motivo» (falta justificada y los demás) o nada (falta injustificada, descanso).
export function requisitoEstado(tipo) {
  const n = String(tipo?.nombre ?? "").toLowerCase();
  if (/incapacidad/.test(n)) return "folio";
  if (/injustificad|descanso/.test(n)) return null;
  return "motivo";
}
export const checadasVivas = (fila) => (fila?.checadas_vivas != null ? Number(fila.checadas_vivas) : fila?.entrada || fila?.salida ? 1 : 0);
const sinSalida = (fila) => fila?.estado_calculado?.clave === "sin_salida" || (Boolean(fila?.entrada) && !fila?.salida);

// Barra masiva: a quién aplica cada acción y por qué se omite el resto.
export function planMasivo(filas, accion) {
  const aplican = [], omitidos = [];
  for (const f of filas) {
    const vivasN = checadasVivas(f);
    if (accion === "estado") {
      if (vivasN === 0) aplican.push(f); else omitidos.push({ fila: f, razon: "tiene checadas: se corrige en su reloj" });
    } else if (vivasN === 0 || sinSalida(f)) aplican.push(f);
    else omitidos.push({ fila: f, razon: "ya tiene entrada y salida" });
  }
  return { aplican, omitidos };
}

// ——— Lo que se ve en la fila (lo calcula el servidor; respaldo con los campos de siempre) ———
const PILLS = {
  asistio: "bg-emerald-50 text-emerald-700", retardo: "bg-amber-50 text-amber-800", salio_antes: "bg-rose-50 text-rose-700",
  sin_salida: "bg-amber-50 text-amber-800", permiso: "bg-violet-50 text-violet-700", falta: "bg-rose-50 text-rose-700",
  justificada: "bg-violet-50 text-violet-700", descanso: "bg-slate-100 text-slate-600", sin_checadas: "bg-slate-100 text-slate-600",
};
export function claseEstado(clave) {
  const c = String(clave ?? "");
  if (PILLS[c]) return PILLS[c];
  if (/falta|ausen/.test(c)) return PILLS.falta;
  if (/vacacion|incapacidad|justific|permiso/.test(c)) return PILLS.justificada;
  return PILLS.sin_checadas;
}
export function estadoFila(fila) {
  if (fila?.estado_calculado?.texto) return { texto: fila.estado_calculado.texto, clave: fila.estado_calculado.clave };
  const e = fila?.estadoAsistencia;
  const clave = { Presente: "asistio", Tardanza: "retardo", Ausente: "falta", Vacaciones: "justificada", Permiso: "permiso" }[e] ?? "sin_checadas";
  return { texto: e || fila?.tipo_registro_nombre || "—", clave };
}
export function diaFila(fila) {
  if (fila?.dia?.tipo) return fila.dia;
  if (Number(fila?.es_festivo)) return { tipo: "festivo_oficial", nombre: "Festivo", pago: "" };
  if (Number(fila?.es_domingo)) return { tipo: "domingo", nombre: "Domingo", pago: "" };
  return { tipo: "normal", nombre: "Día normal", pago: "" };
}
// Columna «Horas extra»: por autorizar (botón que abre el reloj), autorizadas o nada.
export function extraFila(fila) {
  const pend = Number(fila?.minutos_extra_por_autorizar ?? 0);
  const total = Number(fila?.minutos_extra ?? 0);
  if (pend > 0) return { tipo: "pendiente", texto: `${durTexto(pend)} por autorizar` };
  if (total > 0) return { tipo: "autorizada", texto: `${durTexto(total)}` };
  return { tipo: "nada", texto: "—" };
}
