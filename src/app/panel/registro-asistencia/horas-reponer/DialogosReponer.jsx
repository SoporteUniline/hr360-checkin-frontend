"use client";

// Ventanas de «Horas por reponer»: Registrar reposición (se quedó tal día, tantas horas), Rebajar / Condonar y confirmar
// «Cancelar» un permiso. Reglas y cuerpos en lib/asistencia/horasPorReponer.mjs; el backend vuelve a validar.
import { useState } from "react";
import useSWR from "swr";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetcherWithToken } from "@/lib/fetcher";
import { formatearMinutos } from "@/lib/asistencia/jornada.mjs";
import { hora12 } from "@/lib/hora12.mjs";
import { fechaLarga, minutosReposicion, validarCierre, validarReposicion } from "@/lib/asistencia/horasPorReponer.mjs";

const campo = "h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-blue-600 focus:outline-none sm:text-sm";
const etiqueta = "flex min-w-0 flex-col gap-1 text-[13px] font-semibold text-slate-600";
const botonSec = "min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50";
const botonPri = "min-h-11 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50";
const sumarHora = (hhmm, min) => {
  const m = /^(\d{2}):(\d{2})$/.exec(String(hhmm ?? ""));
  if (!m) return "";
  const t = Math.min(23 * 60 + 59, Number(m[1]) * 60 + Number(m[2]) + min);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

function Marco({ abierto, onCerrar, titulo, descripcion, children, pie, datos }) {
  return (
    <Dialog open={abierto} onOpenChange={(v) => { if (!v) onCerrar(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl p-5 sm:max-w-md" {...datos}>
        <DialogHeader className="pr-6 text-left">
          <DialogTitle className="text-lg">{titulo}</DialogTitle>
          {descripcion && <DialogDescription className="text-[13.5px] text-slate-600">{descripcion}</DialogDescription>}
        </DialogHeader>
        {children}
        <DialogFooter className="gap-2">{pie}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Su jornada ese día y lo que checó después de su salida (GET horas-extra del día) para proponer De / A.
function useJornadaDelDia(idEmpleado, fecha) {
  const url = idEmpleado && /^\d{4}-\d{2}-\d{2}$/.test(fecha ?? "") ? `/checador/horas-extra/empleado/${idEmpleado}?desde=${fecha}&hasta=${fecha}` : null;
  const { data } = useSWR(url, fetcherWithToken, { revalidateOnFocus: false, shouldRetryOnError: false });
  return { jornada: data?.jornadas?.[fecha] ?? null, propuesta: data?.propuestas?.find((p) => p.fecha === fecha) ?? null };
}

export function DialogoReposicion({ fila, hoy, autorizadores, idAutorizaInicial, guardando, onGuardar, onCerrar }) {
  const [fecha, setFecha] = useState(hoy);
  const [horas, setHoras] = useState(null); // null = aún no las toca: se proponen con su jornada
  const [motivo, setMotivo] = useState("Reposición de horas que debe");
  const [autoriza, setAutoriza] = useState(autorizadores.some((a) => a.id === Number(idAutorizaInicial)) ? String(idAutorizaInicial) : "");
  const { jornada, propuesta } = useJornadaDelDia(fila?.id_empleado, fecha);
  const sugeridas = propuesta
    ? { desde: String(propuesta.desde).slice(11, 16), hasta: String(propuesta.hasta).slice(11, 16) }
    : jornada?.salida ? { desde: jornada.salida, hasta: sumarHora(jornada.salida, Math.min(60, fila?.debe ?? 60)) } : { desde: "", hasta: "" };
  const { desde, hasta } = horas ?? sugeridas;
  const datos = { fecha, desde, hasta, motivo, autoriza };
  const error = validarReposicion({ ...datos, minimo: fila?.desde, hoy });
  const minutos = minutosReposicion(desde, hasta);
  const cambiar = (k, v) => setHoras({ desde, hasta, [k]: v });
  return (
    <Marco abierto onCerrar={onCerrar} titulo="Registrar reposición" datos={{ "data-dialogo-reposicion": "" }}
      descripcion={`${fila?.nombre} debe ${formatearMinutos(fila?.debe ?? 0)}. Anota el día y las horas que se quedó para reponer.`}
      pie={<>
        <button type="button" className={botonSec} onClick={onCerrar}>Cancelar</button>
        <button type="button" className={botonPri} disabled={Boolean(error) || guardando} onClick={() => onGuardar(datos)}>
          {guardando ? "Guardando…" : `Registrar ${minutos ? formatearMinutos(minutos) : ""}`.trim()}
        </button>
      </>}>
      <div className="grid gap-3">
        <label className={etiqueta}>Día
          <input type="date" aria-label="Día de la reposición" className={campo} value={fecha} min={fila?.desde ?? undefined} max={hoy}
            onChange={(e) => { setFecha(e.target.value); setHoras(null); }} />
        </label>
        <p className="-mt-1 text-[12.5px] text-slate-500" data-jornada-dia>
          {jornada ? `Su jornada ese día: ${hora12(jornada.entrada)} a ${hora12(jornada.salida)}` : "Sin horario ese día"}
          {propuesta ? ` · checó hasta ${hora12(String(propuesta.hasta).slice(11, 16))}` : ""}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className={etiqueta}>De
            <input type="time" aria-label="Desde qué hora" className={campo} value={desde} onChange={(e) => cambiar("desde", e.target.value)} />
          </label>
          <label className={etiqueta}>A
            <input type="time" aria-label="Hasta qué hora" className={campo} value={hasta} onChange={(e) => cambiar("hasta", e.target.value)} />
          </label>
        </div>
        <label className={etiqueta}>Motivo
          <input aria-label="Motivo de la reposición" className={campo} value={motivo} maxLength={255} onChange={(e) => setMotivo(e.target.value)} />
        </label>
        <label className={etiqueta}>¿Quién autoriza?
          <select aria-label="Quién autoriza la reposición" className={campo} value={autoriza} onChange={(e) => setAutoriza(e.target.value)}>
            <option value="">Elige quién autoriza…</option>
            {autorizadores.map((a) => <option key={a.id} value={String(a.id)}>{a.nombre}</option>)}
          </select>
        </label>
        {error && (desde || hasta) ? <p className="text-[13px] font-semibold text-rose-700" role="alert">{error}</p> : null}
        <p className="text-[12.5px] leading-snug text-slate-500">
          Se guarda como horas extra «Reposición de tiempo por tiempo»: no se paga y baja de su cuenta. Si ese día está en una nómina
          autorizada, no se puede.
        </p>
      </div>
    </Marco>
  );
}

const TITULOS = { rebaja: "Rebajar en nómina", condonacion: "Condonar" };
const AYUDAS = {
  rebaja: "Se descuenta en la nómina del periodo de hoy (si ya está autorizada, en la siguiente) y deja de contar en su cuenta.",
  condonacion: "Se le perdona: deja de contar en su cuenta. Escribe por qué.",
};
export function DialogoCierre({ fila, tipo, guardando, onGuardar, onCerrar }) {
  const debe = Number(fila?.debe) || 0;
  const [horas, setHoras] = useState(String(Math.floor(debe / 60)));
  const [minutos, setMinutos] = useState(String(debe % 60));
  const [nota, setNota] = useState("");
  const total = (Number(horas) || 0) * 60 + (Number(minutos) || 0);
  const error = validarCierre({ tipo, minutos: total, debe, nota });
  return (
    <Marco abierto onCerrar={onCerrar} titulo={`${TITULOS[tipo]} · ${fila?.nombre}`} datos={{ "data-dialogo-cierre": tipo }}
      descripcion={`Debe ${formatearMinutos(debe)}. ${AYUDAS[tipo]}`}
      pie={<>
        <button type="button" className={botonSec} onClick={onCerrar}>Cancelar</button>
        <button type="button" className={botonPri} disabled={Boolean(error) || guardando}
          onClick={() => onGuardar({ tipo, minutos: total, nota })}>{guardando ? "Guardando…" : TITULOS[tipo]}</button>
      </>}>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <label className={etiqueta}>Horas
            <input type="number" min="0" inputMode="numeric" aria-label="Horas a cerrar" className={campo} value={horas} onChange={(e) => setHoras(e.target.value)} />
          </label>
          <label className={etiqueta}>Minutos
            <input type="number" min="0" max="59" inputMode="numeric" aria-label="Minutos a cerrar" className={campo} value={minutos}
              onChange={(e) => setMinutos(e.target.value)} />
          </label>
        </div>
        <label className={etiqueta}>{tipo === "condonacion" ? "Motivo" : "Nota (opcional)"}
          <input aria-label="Nota del cierre" className={campo} value={nota} maxLength={500} onChange={(e) => setNota(e.target.value)}
            placeholder={tipo === "condonacion" ? "Por qué se le perdona" : "Ej. siguiente periodo"} />
        </label>
        {error && total > 0 ? <p className="text-[13px] font-semibold text-rose-700" role="alert">{error}</p> : null}
        <p className="text-[12.5px] text-slate-500">Queda en el historial con quién y cuándo; se puede deshacer.</p>
      </div>
    </Marco>
  );
}

export function ConfirmarCancelarPermiso({ movimiento, nombre, guardando, onConfirmar, onCerrar }) {
  return (
    <Marco abierto onCerrar={onCerrar} titulo="Cancelar permiso" datos={{ "data-dialogo-cancelar": "" }}
      descripcion={`${movimiento?.texto} del ${fechaLarga(movimiento?.fecha)} de ${nombre}. Deja de contar en su cuenta (+${formatearMinutos(movimiento?.minutos ?? 0)}).`}
      pie={<>
        <button type="button" className={botonSec} onClick={onCerrar}>No, dejarlo</button>
        <button type="button" className="min-h-11 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
          disabled={guardando} onClick={onConfirmar}>{guardando ? "Cancelando…" : "Sí, cancelar permiso"}</button>
      </>}>
      <p className="text-[13px] text-slate-600">Si ese día está en una nómina autorizada no se puede cancelar.</p>
    </Marco>
  );
}
