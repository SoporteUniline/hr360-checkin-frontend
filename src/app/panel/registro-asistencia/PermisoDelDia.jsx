"use client";

// «Permiso del día» del reloj con checadas: el mismo par «Qué pasó» (Asistencia o un parcial: Entrada tarde, Salida
// temprano, Salir en medio turno) + «Motivo» que la fila. Sin motivo no hay permiso (cuenta como retardo / salida antes).
// Con motivo el día es con goce y las horas no trabajadas se tratan como diga el motivo (🔒 si no se cambia al aplicar).
// Calcula en vivo los minutos no trabajados con las checadas y el horario y dice en una línea lo que pasará en nómina.
// Lógica en lib/asistencia/quePasoMotivo.mjs y tiposGoce.mjs (el servidor recalcula al guardar).
import { cn } from "@/lib/utils";
import { HORAS, minutosNoTrabajados, normalizarTipo, textoNoTrabajadas, textoNomina } from "@/lib/asistencia/tiposGoce.mjs";
import { aplicado, opcionesMotivo, opcionesTipo, parVacio, tiposCaptura } from "@/lib/asistencia/quePasoMotivo.mjs";
import QuePasoMotivo, { claseCampo } from "@/components/asistencia/QuePasoMotivo";

// permiso: par { tipo, motivo, texto, horas } o null (Asistencia, sin permiso).
// origen: el permiso vino de una solicitud aprobada en Permisos (id de la solicitud o true); se avisa al editarlo aquí.
export default function PermisoDelDia({ permiso, onCambio, tipos, motivos, regs, horario, origen = null, error = "" }) {
  const lista = tiposCaptura(tipos, { conChecadas: true, actual: permiso?.tipo });
  const tipo = permiso ? lista.find((t) => String(t.id) === String(permiso.tipo)) ?? null : null;
  const { r, motivo, horas } = aplicado(permiso, tipo, motivos);
  const n = normalizarTipo(tipo);
  const minutos = n ? minutosNoTrabajados(n.alcance, regs, horario) : 0;
  const conPermiso = Boolean(tipo && motivo);

  return (
    <section data-permiso-dia className="flex flex-col gap-2">
      <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-slate-500">Permiso del día <span className="font-normal normal-case tracking-normal">(opcional)</span></h3>
      <div className={cn("flex flex-col gap-3 rounded-xl border px-4 py-3", conPermiso ? "border-violet-200 bg-violet-50/40" : "border-slate-200")}>
        <QuePasoMotivo etiquetas tipoOpciones={opcionesTipo(lista, { conAsistencia: false })} tipoVacio="Asistencia"
          tipo={permiso?.tipo ?? ""} onTipo={(v) => onCambio(v ? { ...parVacio(v), motivo: permiso?.motivo ?? "", texto: permiso?.texto ?? "" } : null)}
          motivoVisible={Boolean(tipo)} motivoOpciones={opcionesMotivo(motivos)} motivoVacio="Sin permiso"
          motivo={permiso?.motivo ?? ""} onMotivo={(m) => onCambio({ ...permiso, motivo: m, texto: "", horas: null })}
          esOtro={Boolean(motivo?.otro)} texto={permiso?.texto ?? ""} onTexto={(t) => onCambio({ ...permiso, texto: t })} />
        {conPermiso ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-[12px] font-medium text-slate-500">Horas no trabajadas</span>
              <select aria-label="Horas no trabajadas" value={horas ?? "reponen"} disabled={!r.horasCambian}
                onChange={(e) => onCambio({ ...permiso, horas: e.target.value })} className={claseCampo().replace("appearance-none", "")}>
                {HORAS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
              {r.horasCambian ? null : <span className="text-[12px] text-slate-400">🔒 Lo fija el motivo</span>}
            </label>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[12px] font-medium text-slate-500">Goce del día</span>
              <span data-goce-fijo className="inline-flex h-9 items-center text-[13.5px] text-slate-700 max-sm:h-11">🔒 Con goce</span>
            </div>
          </div>
        ) : null}
        {conPermiso ? (
          <div data-permiso-calculo className="flex flex-col gap-0.5 text-[13.5px]">
            <b className="font-semibold text-violet-800">{textoNoTrabajadas(minutos, horas)}</b>
            <span className="text-slate-600">{textoNomina({ parcial: true, goce: "con", horas, minutos })}</span>
          </div>
        ) : tipo ? (
          <p className="text-[12.5px] text-slate-500">Sin motivo no hay permiso: cuenta como retardo o salida antes, como siempre.</p>
        ) : (
          <p className="text-[12.5px] text-slate-500">Si llegó tarde, salió temprano o salió en medio turno con permiso, elige qué pasó y el motivo: el día queda con goce y las horas se tratan como diga el motivo.</p>
        )}
        {origen ? (
          <p data-permiso-origen className="text-[12.5px] text-slate-500">
            Viene de la solicitud{origen === true ? "" : ` #${origen}`} aprobada en Permisos; si lo cambias aquí, se corrige solo este día.
          </p>
        ) : null}
        {error ? <p role="alert" className="text-[13px] font-medium text-rose-700">{error}</p> : null}
      </div>
    </section>
  );
}
