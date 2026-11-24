"use client";

// Checadas del reloj de un empleado en un día, con corrección por tramo.
// Lo usan el panel de la fila (PanelEditarAsistencia) y el diálogo de solo lectura.
// La hora original del reloj se ve tachada y la corregida resaltada; nada se borra.
// La comida se distingue: «checada en el reloj» o «manual» (agregada desde el panel, con quién y Editar / Quitar).

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { Coffee, Pencil, Save, X } from "lucide-react";
import useClockCheckData from "@/hooks/useRelojChecador";
import useEntradaSalida from "@/hooks/useEntradaSalida";
import { useAuth, useEmpresaTimezone } from "@/context/AuthContext";
import { hora12 } from "@/lib/hora12.mjs";
import { pausasDelDia } from "@/lib/asistencia/pausasDelDia.mjs";
import { minutosComidaHorario, formatearMinutos } from "@/lib/asistencia/jornada.mjs";
import { herramientasHoras } from "@/lib/asistencia/horasEdicion.mjs";
import BotonAgregarComida, { QuitarComida } from "./BotonAgregarComida";

dayjs.extend(utc);
dayjs.extend(timezone);

const DB_TIMEZONE = "America/Mexico_City";
const valida = (v) => Boolean(v) && v !== "-";

export default function ChecadasDelDia({ empleado, activo = true, mutateAsistencia, editable = true }) {
  const { dataUser } = useAuth();
  const zona = useEmpresaTimezone(dataUser?.id_empresa);
  const { data, error, isLoading, mutate } = useClockCheckData(
    activo ? dataUser?.id_empresa : null,
    activo ? empleado?.fecha : null,
    activo ? empleado?.id_empleado : null,
    null,
    1,
    10,
    null,
    null,
  );
  const {
    editingMovimientoId,
    isSavingMovimiento,
    editingMovimientoData,
    handleEditMovimientoClick,
    handleSaveMovimientoClick,
    handleCancelMovimientoEdit,
    handleMovimientoFieldChange,
  } = useEntradaSalida(mutate);

  const hora = (v) => (valida(v) ? dayjs.tz(v, DB_TIMEZONE).tz(zona).format("HH:mm") : "");
  // Para mostrar (12 h); `hora` (HH:mm) queda para los campos de captura.
  const horaVer = (v) => (valida(v) ? hora12(dayjs.tz(v, DB_TIMEZONE).tz(zona)) : "");
  const fechaBase = dayjs.tz(empleado?.entrada, DB_TIMEZONE).tz(zona).format("YYYY-MM-DD");
  const aFecha = (h) => (h ? dayjs(`${fechaBase} ${h}`).format("YYYY-MM-DD HH:mm:ss") : null);
  // En orden de hora: el tramo creado al agregar la comida no es el último en la lista del servidor.
  const horaEfectiva = (c) => String(c.entrada_corregida || c.entrada || c.salida_corregida || c.salida || "");
  const registros = Array.isArray(data?.registros)
    ? [...data.registros].sort((a, b) => horaEfectiva(a).localeCompare(horaEfectiva(b)) || Number(a.id) - Number(b.id))
    : [];

  // Pausas entre tramos: la de «Salir a comer» se marca como COMIDA (con minutos y si se pasó).
  const aMin = (v) => (valida(v) ? Math.floor(dayjs.tz(v, DB_TIMEZONE).valueOf() / 60000) : null);
  const pausas = pausasDelDia(registros, {
    comida: empleado?.comida_checada,
    minutosComida: empleado?.comida_checada?.minutos_programados ?? minutosComidaHorario(empleado),
    aMin,
    ahora: Math.floor(Date.now() / 60000),
  });
  const pausaTras = new Map(pausas.map((p) => [p.despuesDe, p]));
  const comidaTras = new Set(pausas.filter((p) => p.esComida).map((p) => p.despuesDe));

  // Hora original tachada + corregida resaltada (o solo la original).
  const Marca = ({ original, corregida, etiqueta }) => (
    <div className="flex flex-col items-start">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{etiqueta}</span>
      {valida(corregida) ? (
        <span className="tabular-nums">
          {valida(original) && (
            <span className="mr-1 text-slate-400 line-through" title="Hora original del reloj (corregida)">{horaVer(original)}</span>
          )}
          <span className="rounded-md bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-700">{horaVer(corregida)}</span>
        </span>
      ) : (
        <span className="font-semibold tabular-nums text-slate-800">{horaVer(original) || "—"}</span>
      )}
    </div>
  );

  if (isLoading) return <p className="py-3 text-sm text-slate-500">Cargando checadas…</p>;
  if (error) return <p className="py-3 text-sm text-red-600">No se pudieron cargar las checadas: {error.message}</p>;
  if (!registros.length) return <p className="py-3 text-sm text-slate-500">No hay checadas del reloj este día.</p>;

  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200" aria-label="Checadas del reloj">
      {registros.flatMap((c, i) => {
        const editando = editingMovimientoId === c.id;
        const pausa = pausaTras.get(i);
        const filaPausa = pausa
          ? <FilaPausa key={`pausa-${c.id ?? i}`} p={pausa} horaVer={horaVer} empleado={empleado} zona={zona} editable={editable} onGuardado={mutateAsistencia} />
          : null;
        return [(
          <li key={c.id ?? i} className="flex items-center gap-3 px-3 py-2.5 text-sm">
            <span className="w-5 text-xs font-semibold text-slate-400">{i + 1}</span>
            {editando ? (
              <>
                <label className="flex flex-col text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Entrada
                  <input type="time" aria-label="Entrada corregida" value={hora(editingMovimientoData.entrada_corregida)}
                    onChange={(e) => handleMovimientoFieldChange("entrada_corregida", aFecha(e.target.value))}
                    className="mt-0.5 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-800" />
                </label>
                <label className="flex flex-col text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Salida
                  <input type="time" aria-label="Salida corregida" value={hora(editingMovimientoData.salida_corregida)}
                    onChange={(e) => handleMovimientoFieldChange("salida_corregida", aFecha(e.target.value))}
                    className="mt-0.5 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-800" />
                </label>
                <div className="ml-auto flex gap-1">
                  <button type="button" title="Guardar corrección" aria-label="Guardar corrección" disabled={isSavingMovimiento}
                    onClick={async () => { await handleSaveMovimientoClick(); await mutateAsistencia?.(); }}
                    className="rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100 disabled:opacity-50">
                    <Save className="h-4 w-4" />
                  </button>
                  <button type="button" title="Cancelar" aria-label="Cancelar corrección" onClick={handleCancelMovimientoEdit}
                    className="rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Marca etiqueta={comidaTras.has(i - 1) ? "Regreso de comida" : "Entrada"} original={c.entrada} corregida={c.entrada_corregida} />
                <span className="text-slate-300">→</span>
                <Marca etiqueta={comidaTras.has(i) ? "Salida a comer" : "Salida"} original={c.salida} corregida={c.salida_corregida} />
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.estado === "Abierto" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {c.estado}
                </span>
                {editable && (
                  <button type="button" title="Corregir checada" aria-label={`Corregir checada ${i + 1}`}
                    onClick={() => handleEditMovimientoClick(c)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600">
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </>
            )}
          </li>
        ), filaPausa];
      })}
    </ul>
  );
}

// «agregó Laura M. · 23/11 5:12 p.m.» (historial de la asistencia, origen comida).
function quienAgrego(agrego) {
  if (!agrego?.nombre_usuario) return null;
  const [nombre, apellido] = String(agrego.nombre_usuario).split(" ");
  const cuando = agrego.creado_en ? dayjs.tz(String(agrego.creado_en).slice(0, 19), DB_TIMEZONE) : null;
  return `agregó ${nombre}${apellido ? ` ${apellido[0]}.` : ""}${cuando?.isValid() ? ` · ${cuando.format("DD/MM")} ${hora12(cuando)}` : ""}`;
}

// Hueco entre dos tramos. Comida: resaltada en amarillo (rojo si se pasó), con su tiempo; otra pausa: gris.
function FilaPausa({ p, horaVer, empleado, zona, editable, onGuardado }) {
  const rango = `${horaVer(p.desde)} → ${p.hasta ? horaVer(p.hasta) : "…"}`;
  if (!p.esComida) {
    return (
      <li className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 pl-11 text-xs text-slate-500" data-pausa="pausa">
        Pausa · {rango}{p.minutos != null ? ` · ${formatearMinutos(p.minutos)}` : ""}
      </li>
    );
  }
  const pasado = p.excedente > 0;
  const comida = empleado?.comida_checada;
  const manual = Boolean(comida?.manual && comida?.id_movimiento);
  const h = manual ? herramientasHoras(empleado, zona) : null;
  return (
    <li className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 px-3 py-2 pl-11 text-xs ${pasado ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}
      data-pausa={pasado ? "comida-excedida" : "comida"}>
      <Coffee className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="font-semibold">{p.enCurso ? "En comida" : "Comida"}</span>
      <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80" data-origen-comida={manual ? "manual" : "reloj"}>
        {manual ? "· manual" : "· checada en el reloj"}
      </span>
      <span className="tabular-nums">{rango}</span>
      {p.minutos != null ? (
        <span className="tabular-nums font-semibold">
          · {p.enCurso ? "lleva " : ""}{formatearMinutos(p.minutos)}{p.programados ? ` de ${formatearMinutos(p.programados)}` : ""}
        </span>
      ) : null}
      {pasado ? <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">se pasó {formatearMinutos(p.excedente)}</span> : null}
      {manual && quienAgrego(comida.agrego) ? <span className="text-[11px] opacity-80">{quienAgrego(comida.agrego)}</span> : null}
      {manual && editable ? (
        <span className="ml-auto flex gap-1.5">
          <BotonAgregarComida variante="editar" registro={empleado} comida={comida} horaLocal={h.horaLocal} aBaseDeDatos={h.aBaseDeDatos}
            fechaBase={h.fechaBase} onGuardado={onGuardado} />
          <QuitarComida registro={empleado} comida={comida} onGuardado={onGuardado} />
        </span>
      ) : null}
    </li>
  );
}
