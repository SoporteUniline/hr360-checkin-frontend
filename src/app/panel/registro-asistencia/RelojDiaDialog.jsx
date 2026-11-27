"use client";

// El reloj del día: la única forma de corregir horas en Asistencias (reemplaza a PanelEditarAsistencia en esta pantalla).
// GET/PUT /checador/asistencias/:id/reloj. (25/11/2026) Compacto, como la maqueta aprobada: encabezado en una línea
// (quién, fecha, área, jornada y comida; a la derecha el tipo de día con candado, cuyo pago lo pone el calendario),
// franja de resumen (trabajadas, comida, extra, estado) con «Qué pasó» (permiso del día) a la derecha, y las checadas
// en tabla, una fila por renglón: # · Entrada · Salida · Concepto · Duración · Motivo · ✕ (anular/restaurar lo del
// reloj, quitar lo agregado); la autorización de la extra y los errores van bajo su fila. Validación en vivo
// (lib/asistencia/relojDia.mjs) y errores del servidor por renglón.
// En pantallas angostas (< 640 px) es una hoja a pantalla completa y cada checada es una tarjeta con controles de 44 px.
import { Fragment, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { Lock, Plus, RotateCcw, Scissors, UtensilsCrossed, X } from "lucide-react";
import axios from "@/lib/axios";
import { cn } from "@/lib/utils";
import { fetcherWithToken } from "@/lib/fetcher";
import { useEmpresaTimezone } from "@/context/AuthContext";
import { useGuardiaSalida } from "@/components/cambios/CambiosPendientes";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  CONCEPTOS, TOLERANCIA_MIN, aHHMM, aMin, agregarComida, pausaComidaTras, quitarComida, agregarRegistro, autorizaValor, claseEstado, conAutoriza,
  cuerpoPut, desdeApi, diaFila, durTexto, editado, errores as validar, erroresPorRenglon, estadoFila, etiquetaQuitar,
  fechaTxt, hora12Txt, horarioMin, horarioNormal, minDeCampo, ordenar, origenTexto, puedeComida, quitarORestaurar,
  resumen, resumenServidor, separarExtra, separarExtraAntes, vivos, esMotivoOtro, textoMotivoOtro, motivoOtro, MAX_TEXTO_OTRO, extraTodoEnJornada,
} from "@/lib/asistencia/relojDia.mjs";
import { minutosNoTrabajados, normalizarTipo } from "@/lib/asistencia/tiposGoce.mjs";
import { cuerpoPermisoDia, faltaPar, nombreTipo, parDesdePermiso, parVacio } from "@/lib/asistencia/quePasoMotivo.mjs";
import { CAMPOS_HORA, ajustarPorPermiso, errorHoraPermiso, horasPermiso, horasValidas } from "@/lib/asistencia/horaPermiso.mjs";
import SelectConIconos from "@/components/ui/SelectConIconos";
import { ICONO_AUTORIZA, ICONO_CONCEPTO, iconoCorreccion } from "@/components/asistencia/iconosAsistencia";
import PermisoDelDia from "./PermisoDelDia";
import CeldaEstadoDia from "./CeldaEstadoDia";
import useTiposPermisoData from "@/hooks/useTiposPermisoData";
import { avisosRespuesta } from "@/lib/actasEstatus.mjs";

const CAMPO = "h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 text-[13.5px] text-slate-900 "
  + "focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:bg-slate-50 disabled:text-slate-400 max-sm:h-11 max-sm:text-base";
const BOTON = "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3.5 text-[13.5px] "
  + "font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 max-sm:h-11";
const DATO = "text-[11.5px] font-bold uppercase tracking-[0.04em] text-slate-500 max-sm:text-[10.5px]";
const ROJO = "border-rose-300 bg-rose-50";
// Columnas de la tabla de checadas (escritorio): # · Entrada · Salida · Concepto · Duración · Motivo · ✕.
const COLUMNAS = "sm:grid-cols-[20px_124px_124px_148px_80px_minmax(0,1fr)_36px]";
// Sangría de lo que va bajo la fila (autorización, error): el ancho de «#» más el espacio entre columnas.
const SANGRIA = "sm:pl-[30px]";
const AYUDA_CALENDARIO = "Lo pone la ley o el catálogo de días de la empresa. No se edita aquí para que el registro sea auditable.";
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// «Lun 24/11/2026» desde «YYYY-MM-DD».
function fechaCorta(f) {
  const d = new Date(`${String(f ?? "").slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? fechaTxt(f) : `${DIAS[d.getDay()]} ${fechaTxt(f)}`;
}
// «9:00 a.m.–4:00 p.m.»; si las dos horas son de la mañana o de la tarde, el «a.m./p.m.» va una vez: «11:00–11:30 a.m.».
function rango(desde, hasta) {
  const a = hora12Txt(aHHMM(desde)), b = hora12Txt(aHHMM(hasta));
  const [ha, ma] = a.split(" "), [hb, mb] = b.split(" ");
  return ma === mb ? `${ha}–${hb} ${mb}` : `${a}–${b}`;
}

// Hora de la checada con lo que hay debajo: «reloj: 9:18 a.m.» (editada, en ámbar) o «agregado». La que quedó como la
// marcó el reloj no lleva nota (la fila sería más alta sin decir nada nuevo).
function Hora({ nota: texto, className = "", children }) {
  const nota = texto === "reloj" ? "" : texto;
  const editada = /^reloj: \d/.test(nota ?? "");
  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      {children}
      {nota ? <span className={cn("mt-0.5 truncate text-[11.5px] leading-tight", editada ? "font-medium text-amber-700" : "text-slate-500")}>{nota}</span> : null}
    </div>
  );
}

// Nombre de respaldo si el servidor aún no manda esas claves en motivos.correccion (la lista sale del servidor).
const RESPALDO = { permiso: "Por el permiso del día", otro: "Otro (escribe el motivo)" };
function opcionesCorreccion(motivos, actual) {
  const correccion = motivos.correccion ?? [];
  const claves = correccion.map((m) => m.clave);
  // Los «tp:<id>» ya guardados (permiso como motivo de renglón, antes de «Permiso del día») se muestran con su nombre.
  const extra = actual && !claves.includes(actual)
    ? [{ valor: actual, texto: (motivos.permisos ?? []).find((m) => m.clave === actual)?.nombre ?? RESPALDO[actual] ?? actual, ...iconoCorreccion(actual) }] : [];
  return [...extra, ...correccion.map((m) => ({ valor: m.clave, texto: m.nombre, grupo: "Corrección", ...iconoCorreccion(m.clave) }))];
}

// Una checada = una fila de la tabla (en celular, una tarjeta: hora → hora y ✕ arriba, concepto · duración, motivo abajo).
// La autorización de la extra y el error del renglón van justo debajo de la fila.
function Renglon({ r, n, error, motivos, autorizadores, nocturno, horario, h, onCambio, onQuitar }) {
  const ed = editado(r);
  const pideMotivo = ed || (r.anulado && !r.anuladoAntes);
  const otro = esMotivoOtro(r.motivo);
  const valorMotivo = otro ? "otro" : r.motivo;
  const extra = r.concepto === "extra" && !r.anulado;
  const fondo = r.anulado ? "bg-slate-50 text-slate-400" : r.concepto === "comida" ? "bg-amber-50 max-sm:border-amber-300"
    : extra ? "bg-violet-50/60 max-sm:border-violet-200" : "bg-white";
  const tachado = r.anulado ? "line-through" : "";
  const duracion = r.ini != null && r.fin != null && r.fin > r.ini ? durTexto(r.fin - r.ini) : r.fin == null && r.ini != null ? "Sin salida" : "";
  const quitar = etiquetaQuitar(r);
  // La hora extra va fuera de la jornada (LFT art. 66): si todo el renglón cae dentro, «Hora extra» no se puede elegir.
  const extraBloqueada = extraTodoEnJornada(r, horario);
  const opcionesConcepto = CONCEPTOS.map(([v, t]) => ({ valor: v, texto: t, ...ICONO_CONCEPTO[v],
    ...(v === "extra" && extraBloqueada ? { deshabilitada: true,
      ayuda: `Dentro de la jornada (${hora12Txt(aHHMM(h.pe))}–${hora12Txt(aHHMM(h.ps))}) usa «Jornada»` } : {}) }));
  return (
    <div data-renglon={n} data-clave={r.k} className={cn("border-t border-slate-200 px-2 py-2 max-sm:rounded-xl max-sm:border max-sm:p-2.5", fondo)}>
      <div className={cn("grid items-start gap-x-2.5 gap-y-2 max-sm:grid-cols-[minmax(0,1fr)_12px_minmax(0,1fr)_44px] max-sm:gap-x-1.5", COLUMNAS)}>
        <span className="pt-2 text-[13px] tabular-nums text-slate-400 max-sm:hidden">{n}</span>
        <Hora nota={origenTexto(r, "ini")} className="max-sm:col-start-1 max-sm:row-start-1">
          <input type="time" aria-label="Entrada" disabled={r.anulado} className={cn(CAMPO, tachado, !r.anulado && r.ini == null ? ROJO : "")}
            value={r.ini == null ? "" : aHHMM(r.ini)}
            onChange={(e) => onCambio({ ini: e.target.value ? aMin(e.target.value) + (r.ini != null && r.ini >= 1440 ? 1440 : 0) : null })} />
        </Hora>
        <span aria-hidden className="pt-3 text-center text-slate-400 sm:hidden max-sm:col-start-2 max-sm:row-start-1">→</span>
        <Hora nota={origenTexto(r, "fin")} className="max-sm:col-start-3 max-sm:row-start-1">
          <input type="time" aria-label="Salida" disabled={r.anulado} className={cn(CAMPO, tachado)}
            value={r.fin == null ? "" : aHHMM(r.fin)}
            onChange={(e) => onCambio({ fin: e.target.value ? minDeCampo(e.target.value, { referencia: r.ini, nocturno }) : null })} />
        </Hora>
        {/* Concepto y duración: dos columnas en escritorio; en celular, una línea «concepto · duración». */}
        <div className="contents max-sm:col-span-4 max-sm:row-start-2 max-sm:flex max-sm:items-center max-sm:gap-2.5">
        <div className="min-w-0 max-sm:flex-1">
          <SelectConIconos aria="Concepto" disabled={r.anulado} valor={r.concepto} onCambio={(v) => onCambio({ concepto: v })}
            opciones={opcionesConcepto} />
        </div>
        {r.anulado ? (
          // Anulada: «Restaurar» en el lugar de la duración (la ✕ ya no aplica).
          <button type="button" onClick={onQuitar} aria-label={quitar} title="La checada queda anulada al guardar; restaúrala para volver a contarla"
            className={cn(BOTON, "justify-center px-2 text-[13px] sm:col-start-5 sm:row-start-1 max-sm:shrink-0 max-sm:px-3")}>
            <RotateCcw className="h-3.5 w-3.5 sm:hidden" aria-hidden />{quitar}
          </button>
        ) : (
          <span className={cn("pt-2 text-[13px] tabular-nums whitespace-nowrap max-sm:w-[84px] max-sm:shrink-0 max-sm:pt-0 max-sm:text-[14px]",
            r.concepto === "comida" ? "font-medium text-amber-900" : "text-slate-600")}>{duracion}</span>
        )}
        </div>
        <div className="flex min-w-0 flex-col gap-1.5 max-sm:col-span-4 max-sm:row-start-3">
          <SelectConIconos aria="Motivo" valor={valorMotivo} error={pideMotivo && !r.motivo}
            onCambio={(v) => onCambio({ motivo: v === "otro" ? (otro ? r.motivo : motivoOtro("")) : v, motivoElegido: true })}
            vacio={pideMotivo ? "Elige el motivo…" : "Sin motivo"} opciones={opcionesCorreccion(motivos, valorMotivo)} />
          {otro ? (
            <input aria-label="Escribe el motivo de la corrección" placeholder="Escribe el motivo (al menos 5 letras)" maxLength={MAX_TEXTO_OTRO}
              value={textoMotivoOtro(r.motivo)} onChange={(e) => onCambio({ motivo: motivoOtro(e.target.value), motivoElegido: true })}
              className={CAMPO} />
          ) : null}
        </div>
        {r.anulado ? null : (
          <button type="button" onClick={onQuitar} aria-label={quitar} title={quitar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 max-sm:col-start-4 max-sm:row-start-1 max-sm:h-11 max-sm:w-11">
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
      {extra ? (
        <div className={cn("mt-2 flex flex-wrap items-center gap-x-3 gap-y-1", SANGRIA)}>
          <span className="text-[12.5px] font-semibold text-violet-800" aria-hidden>¿Quién autoriza?</span>
          <div className="w-[260px] min-w-0 max-sm:w-full">
            <SelectConIconos aria="Quién autoriza" valor={autorizaValor(r)} onCambio={(v) => onCambio(conAutoriza(v))}
              error={!autorizaValor(r)} vacio="Elige quién autoriza…"
              opciones={[...autorizadores.map((a) => ({ valor: String(a.id), texto: a.nombre, ...ICONO_AUTORIZA.persona })),
                { valor: "no", texto: "No se autoriza", ...ICONO_AUTORIZA.no }]} />
          </div>
          <span className="text-[12px] text-slate-500">Dobles o triples: lo decide la ley por semana.</span>
        </div>
      ) : null}
      {error ? <p role="alert" className={cn("mt-1.5 text-[13px] font-medium text-rose-700", SANGRIA)}>{error}</p> : null}
    </div>
  );
}

// Un dato de la franja de resumen: «TRABAJADAS 6 h 30 min de 6 h 30 min programado».
function Dato({ etiqueta, children, nota }) {
  return (
    <div className="min-w-0 max-sm:text-center">
      <p className={DATO}>{etiqueta}</p>
      <p className="text-[16px] font-extrabold leading-tight tabular-nums text-slate-900 max-sm:text-[14px]">{children}</p>
      {nota}
    </div>
  );
}

export default function RelojDiaDialog({ registro, onCerrar, onGuardado }) {
  const { enqueueSnackbar } = useSnackbar();
  const id = registro?.id;
  const zonaEmpresa = useEmpresaTimezone(registro?.id_empresa);
  const zona = registro?.zona_horaria || zonaEmpresa;
  const { data, error, isLoading } = useSWR(id ? `/checador/asistencias/${id}/reloj` : null, fetcherWithToken, { revalidateOnFocus: false });
  const fecha = String(data?.asistencia?.fecha ?? registro?.fecha ?? "").slice(0, 10);
  const [regs, setRegs] = useState(null);
  const [servidor, setServidor] = useState({ general: "", renglones: {} });
  const [guardando, setGuardando] = useState(false);
  // «Permiso del día»: undefined = aún no se carga; null = sin permiso.
  const [permiso, setPermiso] = useState(undefined);
  // Checadas antes de ajustarlas a la hora del permiso (cambiar la hora recalcula desde aquí; editar a mano lo suelta).
  const [baseAjuste, setBaseAjuste] = useState(null);
  const { data: tiposPermiso } = useTiposPermisoData();
  const tiposParciales = useMemo(() => (Array.isArray(data?.tipos_parciales) ? data.tipos_parciales : []), [data]);
  const motivosPermiso = data?.motivos_permiso;
  const permisoGuardado = useMemo(() => parDesdePermiso(data?.permiso_dia, motivosPermiso), [data, motivosPermiso]);
  useEffect(() => {
    if (data?.registros && regs == null) setRegs(desdeApi(data.registros, { fecha, zona }));
    // Desde la fila (Entrada tarde, Salida temprano, Salir en medio turno): ese tipo queda puesto en «Permiso del día».
    if (data && permiso === undefined) setPermiso(permisoGuardado ?? (registro?._tipoParcial ? parVacio(registro._tipoParcial) : null));
  }, [data, regs, fecha, zona, permiso, permisoGuardado, registro?._tipoParcial]);

  const horario = data?.horario ?? null;
  const h = useMemo(() => horarioMin(horario), [horario]);
  const lista = useMemo(() => regs ?? [], [regs]);
  const orden = useMemo(() => ordenar(lista), [lista]);
  const errs = useMemo(() => validar(lista, horario), [lista, horario]);
  const estadoSin = estadoFila(registro);
  const tipoDe = (p) => (p ? tiposParciales.find((t) => String(t.id) === String(p.tipo)) ?? null : null);
  const tipoPermiso = tipoDe(permiso);
  // Sin motivo no hay permiso (retardo / salida antes como siempre): permiso_dia null.
  const cuerpoPermiso = cuerpoPermisoDia(permiso, tipoPermiso, motivosPermiso);
  const calc = resumen(lista, horario, { tolerancia: Number(horario?.tolerancia_min ?? TOLERANCIA_MIN), estadoDia: estadoSin,
    permiso: cuerpoPermiso ? { alcance: normalizarTipo(tipoPermiso).alcance } : null, extraDia: data?.extra_dia ?? null });
  // permiso_dia viaja solo si hay permiso o si había uno guardado (null = quitarlo): así el cuerpo de siempre no cambia.
  const llevaPermiso = Boolean(cuerpoPermiso) || Boolean(permisoGuardado);
  const cambioPermiso = permiso !== undefined
    && JSON.stringify(cuerpoPermiso) !== JSON.stringify(cuerpoPermisoDia(permisoGuardado, tipoDe(permisoGuardado), motivosPermiso));
  // Tipo parcial: su hora es obligatoria y debe dejar minutos no trabajados dentro de la jornada (lib/asistencia/horaPermiso.mjs).
  const alcancePermiso = tipoPermiso ? normalizarTipo(tipoPermiso).alcance : null;
  const conHora = Boolean(alcancePermiso && CAMPOS_HORA[alcancePermiso]);
  const horasDelPermiso = conHora ? horasPermiso(permiso, alcancePermiso, lista, horario) : null;
  const errorHora = conHora ? errorHoraPermiso({ nombre: nombreTipo(tipoPermiso), alcance: alcancePermiso, horas: horasDelPermiso, horario,
    minutos: minutosNoTrabajados(alcancePermiso, lista, horario) }) : "";
  // El servidor responde 400 a un permiso parcial sin checadas: se avisa antes.
  const errorDelPermiso = errorHora || (cuerpoPermiso || permiso?.motivo ? faltaPar(permiso, tipoPermiso, motivosPermiso) : "")
    || (cuerpoPermiso && regs != null && vivos(lista).length === 0
      ? "Si no vino, elige «Inasistencia» o un día de ley en «Qué pasó», o carga sus horas." : "");
  // Cambios = el cuerpo del PUT ya no es el que se cargó.
  const firma = (rs) => JSON.stringify(cuerpoPut(ordenar(rs), { fecha, zona }));
  const inicial = useMemo(() => (data?.registros ? firma(desdeApi(data.registros, { fecha, zona })) : ""),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, fecha, zona]);
  const hayCambios = regs != null && (firma(lista) !== inicial || cambioPermiso);
  const hayErrores = Object.keys(errs).length > 0 || Boolean(errorDelPermiso);
  // Sin cambios se muestra lo que calculó el servidor; al editar, el cálculo en vivo (misma regla).
  const delServidor = !hayCambios ? resumenServidor(data?.resumen) : null;
  const vista = delServidor ?? { trabajadas: calc.trabajadas, comida: calc.comida, abierto: calc.abierto, hayRegs: calc.hayRegs,
    extraAutorizada: calc.extraAutorizada, extraPorAutorizar: calc.extraPorAutorizar,
    estado: calc.estado };
  // Si la migración de la base de datos aún no corre, el reloj se ve pero no se puede corregir.
  const soloLectura = data?.migracion === false;

  const cambiar = (fn) => { setBaseAjuste(null); setRegs((prev) => fn(prev ?? [])); setServidor((s) => (s.general || Object.keys(s.renglones).length ? { general: "", renglones: {} } : s)); };
  const guardar = async () => {
    if (hayErrores || guardando) return false;
    setGuardando(true);
    try {
      const res = await axios.put(`/checador/asistencias/${id}/reloj`,
        { ...cuerpoPut(orden, { fecha, zona }), ...(llevaPermiso ? { permiso_dia: cuerpoPermiso } : {}) });
      enqueueSnackbar("Reloj guardado. Horas, comida, extra y estado se recalcularon; lo original queda en el historial.", { variant: "success" });
      for (const a of avisosRespuesta(res.data)) enqueueSnackbar(a, { variant: "info" });
      await onGuardado?.(res.data?.asistencia);
      onCerrar?.(true);
      return true;
    } catch (e) {
      const cuerpo = e?.response?.data;
      setServidor({ general: cuerpo?.error || cuerpo?.message || "No se pudo guardar el reloj. Intenta de nuevo.", renglones: erroresPorRenglon(cuerpo, orden) });
      return false;
    } finally {
      setGuardando(false);
    }
  };
  // «Permiso del día»: al cambiar de tipo, las checadas vuelven a como estaban antes del ajuste por la hora.
  const cambiarPermiso = (p) => {
    if (baseAjuste && String(p?.tipo ?? "") !== String(permiso?.tipo ?? "")) { setRegs(baseAjuste); setBaseAjuste(null); }
    setPermiso(p);
    setServidor({ general: "", renglones: {} });
  };
  // Hora del tipo parcial: ajusta las checadas (sin checadas, carga el horario normal ya ajustado).
  const cambiarHora = (campo, valor) => {
    const nuevo = { ...permiso, [campo]: valor };
    setPermiso(nuevo);
    setServidor({ general: "", renglones: {} });
    const base = baseAjuste ?? lista;
    const horas = horasPermiso(nuevo, alcancePermiso, base, horario);
    if (!horasValidas(alcancePermiso, horas, horario)) return;
    setBaseAjuste(base);
    setRegs(ajustarPorPermiso(base, alcancePermiso, horas, horario));
  };
  const confirmarSalida = useGuardiaSalida({ hayCambios, guardar });
  const cerrar = () => (hayCambios ? confirmarSalida(() => onCerrar?.(false)) : onCerrar?.(false));

  const nombre = data?.asistencia?.nombre || [registro?.nombre, registro?.apellido_paterno].filter(Boolean).join(" ");
  const depto = data?.asistencia?.departamento ?? registro?.departamento;
  const dia = data?.dia ?? diaFila(registro);
  const especial = dia?.tipo && dia.tipo !== "normal";
  const sinVivos = regs != null && vivos(lista).length === 0;
  const motivoOlvido = (data?.motivos?.correccion ?? []).find((m) => m.clave === "olvido")?.clave ?? "";
  // Las horas que se cargan a mano llevan el motivo de corrección; el permiso va aparte en «Permiso del día».
  const motivoCarga = motivoOlvido;
  const comidaProgMin = h?.sc != null && h?.rc != null && h.rc > h.sc ? h.rc - h.sc : 0;
  const lineaHorario = h
    ? [`Jornada ${rango(h.pe, h.ps)}`, h.sc != null && h.rc != null ? `Comida ${rango(h.sc, h.rc)}` : "Sin comida"]
    : ["Sin horario"];
  // En celular: «Lun 23/11 · Ventas · 9:00 a.m.–4:00 p.m. · comida 11:00–11:30 a.m.».
  const lineaMovil = h ? [rango(h.pe, h.ps), h.sc != null && h.rc != null ? `comida ${rango(h.sc, h.rc)}` : "sin comida"] : ["sin horario"];
  const mensajeError = servidor.general || (Object.keys(errs).length ? "Corrige lo marcado en rojo para guardar."
    : errorDelPermiso && hayCambios ? errorDelPermiso : "");
  const nota = "Lo que marcó el reloj nunca se borra: queda tachado o como «reloj: hora» y en el historial con tu nombre y el motivo.";
  const trabajadasTxt = vista.hayRegs && !vista.abierto ? durTexto(vista.trabajadas)
    : vista.abierto && vista.trabajadas > 0 ? durTexto(vista.trabajadas) : "—";

  return (
    <Dialog open onOpenChange={(v) => !v && cerrar()}>
      <DialogContent data-no-row-click data-reloj-dia
        className="flex max-h-[92vh] w-[1080px] max-w-[96vw] flex-col gap-0 overflow-hidden bg-white p-0 sm:max-w-[min(1080px,96vw)] max-sm:left-0 max-sm:top-0 max-sm:h-[100dvh] max-sm:max-h-none max-sm:w-screen max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0 [&>button:last-child]:hidden">
        {/* Encabezado: quién, cuándo y su horario en una línea; a la derecha el tipo de día (con candado) y la ✕. */}
        <div className="flex shrink-0 items-start gap-x-3 gap-y-1.5 border-b border-slate-200 py-3 pl-5 pr-3 max-sm:flex-wrap max-sm:pl-4 max-sm:pr-2 max-sm:pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-[18px] font-extrabold leading-tight text-slate-900 max-sm:text-[17px]">{nombre}</DialogTitle>
            <DialogDescription className="mt-0.5 text-[13px] text-slate-600 max-sm:text-[12.5px]">
              <span className="max-sm:hidden">
                {fechaCorta(fecha)}{depto ? ` · ${depto}` : ""}
                {" · "}<span className="font-semibold text-slate-900">{lineaHorario[0]}</span>
                {lineaHorario[1] ? ` · ${lineaHorario[1]}` : ""}
              </span>
              <span className="sm:hidden">{[fechaCorta(fecha).slice(0, -5), depto, ...lineaMovil].filter(Boolean).join(" · ")}</span>
            </DialogDescription>
          </div>
          <div className={cn("mt-1 flex min-w-0 shrink justify-end max-sm:order-last max-sm:mt-0 max-sm:basis-full max-sm:justify-start", especial ? "" : "max-sm:hidden")}>
            <span data-calendario title={AYUDA_CALENDARIO}
              className={cn("inline-flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium",
                especial ? "bg-sky-100 text-sky-900" : "bg-slate-100 text-slate-600")}>
              <Lock className="h-3 w-3 shrink-0" aria-label="Solo lectura" />
              <span className="min-w-0">{dia?.nombre || "Día normal"}{especial && dia?.pago ? <span className="font-normal"> · {dia.pago}</span> : null}</span>
            </span>
          </div>
          <button type="button" onClick={cerrar} aria-label="Cerrar el reloj"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 max-sm:h-11 max-sm:w-11">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {error ? (
            <p role="alert" className="m-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-800">No se pudo abrir el reloj de este día.</p>
          ) : isLoading || regs == null ? (
            <p role="status" className="py-10 text-center text-[14px] text-slate-500">Cargando las checadas del reloj…</p>
          ) : (
            <fieldset disabled={soloLectura} className="m-0 flex min-w-0 flex-col border-0 p-0">
              {/* Franja de resumen (lo calcula el reloj) + «Qué pasó» (permiso del día). */}
              <div className="flex flex-wrap items-end gap-x-6 gap-y-3 border-b border-slate-200 bg-slate-50 px-5 py-3 max-sm:px-4 max-sm:py-2.5">
                <div data-calculo className="flex flex-wrap items-start gap-x-6 gap-y-2 max-sm:grid max-sm:w-full max-sm:grid-cols-4 max-sm:gap-x-1.5">
                  <Dato etiqueta="Trabajadas"
                    nota={<>
                      {vista.abierto && vista.trabajadas > 0 ? <p className="text-[12px] text-slate-500 max-sm:text-[11px]">sigue en jornada</p> : null}
                      {calc.programadas ? <p className="text-[12px] text-slate-500 max-sm:hidden">de {durTexto(calc.programadas)} programado</p> : null}
                    </>}>
                    {trabajadasTxt}
                  </Dato>
                  <Dato etiqueta="Comida" nota={comidaProgMin ? <p className="text-[12px] text-slate-500 max-sm:hidden">de {durTexto(comidaProgMin)}</p> : null}>
                    {durTexto(vista.comida)}
                  </Dato>
                  <Dato etiqueta="Extra"
                    nota={vista.extraPorAutorizar > 0 ? <p className="text-[12px] font-medium leading-tight text-violet-700 max-sm:text-[11px]">{durTexto(vista.extraPorAutorizar)} por autorizar</p> : null}>
                    <span className="text-violet-700">{vista.extraAutorizada > 0 ? durTexto(vista.extraAutorizada) : "—"}</span>
                    {vista.extraAutorizada > 0 ? <span className="text-[12px] font-medium text-violet-700 max-sm:block max-sm:text-[11px]"> autorizadas</span> : null}
                  </Dato>
                  <div className="min-w-0 max-sm:text-center">
                    <p className={DATO}>Estado</p>
                    <span data-estado-calculado className={`mt-0.5 inline-block rounded-full px-2.5 py-0.5 text-[13px] font-bold max-sm:px-1.5 max-sm:text-[11.5px] ${claseEstado(vista.estado.clave)}`}>{vista.estado.texto}</span>
                  </div>
                </div>
                <div className="ml-auto flex min-w-0 max-w-full justify-end max-sm:ml-0 max-sm:w-full">
                  {sinVivos && !permiso ? (
                    // Sin checadas: el mismo par «Qué pasó» + «Motivo» que la fila. Inasistencia y días de ley se guardan como
                    // estado del día (OK) y cierran el reloj; Asistencia y los parciales se quedan aquí para poner sus horas
                    // (el parcial pasa a «Permiso del día» con su motivo).
                    <div data-reloj-que-paso title="Si no vino, elige «Inasistencia» (con motivo si lo justificó) o el día de ley. Si sí vino, elige «Asistencia» o lo que pasó y pon sus horas abajo."
                      className="flex w-[440px] min-w-0 max-w-full flex-col gap-1 max-sm:w-full">
                      <span className={DATO} aria-hidden>Qué pasó</span>
                      <CeldaEstadoDia registro={registro} tiposPermiso={tiposPermiso} comoCampo
                        onAbrirReloj={(r) => { if (r?._tipoParcial) setPermiso(parVacio(r._tipoParcial)); }}
                        onGuardado={async (a) => { await onGuardado?.(a); onCerrar?.(true); }} />
                    </div>
                  ) : tiposParciales.length || permiso ? (
                    <PermisoDelDia permiso={permiso ?? null} onCambio={cambiarPermiso}
                      tipos={tiposParciales} motivos={motivosPermiso} regs={lista} horario={horario} error={permiso ? errorDelPermiso : ""}
                      horas={horasDelPermiso} onHora={cambiarHora} errorHora={Boolean(errorHora)}
                      origen={data?.permiso_dia?.origen === "permiso" ? data.permiso_dia.id_solicitud ?? true : null} />
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-2.5 px-5 py-3 max-sm:px-4">
                {soloLectura ? (
                  <p role="status" data-reloj-solo-lectura className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
                    Por ahora el reloj solo se puede ver: falta aplicar la actualización de la base de datos para poder corregirlo.
                  </p>
                ) : null}
                {sinVivos ? (
                  <div data-reloj-vacio className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                    <b className="text-[14px] text-amber-900">No tiene checadas. ¿De qué hora a qué hora trabajó?</b>
                    <div className="flex flex-wrap gap-2 max-sm:w-full">
                      <button type="button" disabled={!h} onClick={() => cambiar((p) => [...p, ...horarioNormal(horario, motivoCarga)])}
                        className={cn(BOTON, "border-blue-600 bg-blue-600 text-white hover:bg-blue-700 max-sm:flex-1 max-sm:justify-center")}>Cargar su horario normal</button>
                      <button type="button" onClick={() => cambiar((p) => agregarRegistro(p, horario))} className={cn(BOTON, "max-sm:flex-1 max-sm:justify-center")}>Escribir las horas</button>
                    </div>
                  </div>
                ) : null}
                {orden.length ? (
                  <div data-checadas className="flex flex-col border-b border-slate-200 max-sm:gap-2 max-sm:border-0">
                    <div aria-hidden className={cn("grid gap-x-2.5 px-2 pb-1.5 text-[11.5px] font-bold uppercase tracking-[0.04em] text-slate-500 max-sm:hidden", COLUMNAS)}>
                      <span>#</span><span>Entrada</span><span>Salida</span><span>Concepto</span><span>Duración</span><span>Motivo</span><span />
                    </div>
                    {orden.map((r, i) => {
                      const pausa = pausaComidaTras(orden, i);
                      return (
                        <Fragment key={r.k}>
                          <Renglon r={r} n={i + 1} error={errs[r.k] || servidor.renglones[r.k]} motivos={data?.motivos ?? {}}
                            autorizadores={data?.autorizadores ?? []} nocturno={Boolean(h?.nocturno)} horario={horario} h={h}
                            onCambio={(c) => cambiar((p) => p.map((x) => (x.k === r.k ? { ...x, ...c } : x)))}
                            onQuitar={() => cambiar((p) => quitarORestaurar(p, r.k))} />
                          {pausa ? (
                            // Comida marcada con «Salir a comer»: fila delgada entre los dos tramos.
                            <div data-comida-reloj className={cn("flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-amber-200 bg-amber-50 px-2 py-1 text-[13px] text-amber-950 max-sm:rounded-xl max-sm:border max-sm:px-3 max-sm:py-2", SANGRIA)}>
                              <UtensilsCrossed className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
                              <span className="font-semibold">Comida</span>
                              <span className="tabular-nums">
                                {hora12Txt(aHHMM(pausa.desde))} → {pausa.hasta != null ? hora12Txt(aHHMM(pausa.hasta)) : "aún no regresa"}
                                {pausa.minutos != null ? ` · ${durTexto(pausa.minutos) === "—" ? "0 min" : durTexto(pausa.minutos)}` : ""}
                              </span>
                              <span className="text-[12px] text-amber-800/80">marcada con «Salir a comer» en el reloj</span>
                              {!soloLectura ? (
                                <button type="button" onClick={() => cambiar((p) => quitarComida(p, r.k))}
                                  className="ml-auto h-6 rounded-md px-2 text-[12.5px] font-semibold text-amber-900 underline underline-offset-2 hover:bg-amber-100 max-sm:h-11">
                                  No fue comida
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => cambiar((p) => agregarRegistro(p, horario))} className={cn(BOTON, "max-sm:flex-1 max-sm:justify-center")}><Plus className="h-4 w-4" aria-hidden />Agregar registro</button>
                  {puedeComida(lista) ? <button type="button" onClick={() => cambiar((p) => agregarComida(p, horario))} className={cn(BOTON, "max-sm:flex-1 max-sm:justify-center")}><Plus className="h-4 w-4" aria-hidden />Comida</button> : null}
                  {calc.sinSepararAntes > 0 ? (
                    <button type="button" onClick={() => cambiar((p) => separarExtraAntes(p, horario))}
                      className={cn(BOTON, "border-violet-300 text-violet-700 hover:bg-violet-50 max-sm:h-auto max-sm:min-h-11 max-sm:w-full max-sm:justify-center max-sm:whitespace-normal")}>
                      <Scissors className="h-4 w-4 shrink-0" aria-hidden />Separar {durTexto(calc.sinSepararAntes)} antes de las {hora12Txt(aHHMM(h.pe))} como hora extra
                    </button>
                  ) : null}
                  {calc.sinSeparar > 0 ? (
                    <button type="button" onClick={() => cambiar((p) => separarExtra(p, horario))}
                      className={cn(BOTON, "border-violet-300 text-violet-700 hover:bg-violet-50 max-sm:h-auto max-sm:min-h-11 max-sm:w-full max-sm:justify-center max-sm:whitespace-normal")}>
                      <Scissors className="h-4 w-4 shrink-0" aria-hidden />Separar {durTexto(calc.sinSeparar)} después de las {hora12Txt(aHHMM(h.ps))} como hora extra
                    </button>
                  ) : null}
                </div>
                <p className="text-[12px] text-slate-500 sm:hidden">{nota}</p>
              </div>
            </fieldset>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2.5 border-t border-slate-200 px-5 py-3 max-sm:flex-wrap max-sm:px-4 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="min-w-0 flex-1 max-sm:basis-full">
            {mensajeError ? <p role="alert" className="text-[13px] font-medium text-rose-700">{mensajeError}</p> : null}
            <p className={cn("text-[12px] leading-snug text-slate-500 max-sm:hidden", mensajeError ? "hidden" : "")}>{nota}</p>
          </div>
          <button type="button" onClick={cerrar} disabled={guardando} className={cn(BOTON, "px-4 max-sm:h-12 max-sm:flex-1 max-sm:justify-center")}>Cancelar</button>
          <button type="button" onClick={guardar} disabled={guardando || hayErrores || !hayCambios || regs == null || soloLectura}
            className={cn(BOTON, "border-blue-600 bg-blue-600 px-[18px] text-white hover:bg-blue-700 max-sm:h-12 max-sm:flex-1 max-sm:justify-center")}>
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
