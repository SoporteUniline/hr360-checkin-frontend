"use client";

// Tarjeta de horas extra en el detalle del celular: mismo estado y acciones que la tabla
// de escritorio (CeldaHorasExtra), con botones táctiles grandes. Si el empleado debe horas de
// permisos por horas, «Repone» descuenta ese tiempo de su cuenta y no se paga como extra.

import { useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import {
  ETIQUETAS_ESTADO, FORMA_PAGO_DEFAULT, FORMA_REPOSICION, FORMAS_PAGO, UMBRAL_MINUTOS,
} from "@/lib/asistencia/horasExtra.mjs";
import { formatearMinutos } from "@/lib/asistencia/jornada.mjs";
import { useDebeHoras } from "./CuentaHorasContext";

const COLOR = {
  pendiente: "text-orange-700",
  autorizada: "text-emerald-700",
  no_autorizada: "text-slate-600",
  reposicion: "text-sky-700",
  sin: "text-gray-400",
};

export default function HorasExtraMovil({ registro, info, autorizador, guardando, onAutorizar, onNoAutorizar, onQuitar }) {
  const [forma, setForma] = useState(registro.forma_pago_extras || FORMA_PAGO_DEFAULT);
  const [nota, setNota] = useState("");
  const debe = useDebeHoras(registro.id_empleado);
  const { estado, minutos } = info;
  if (estado === "sin" && !Number(registro.hrs_extra)) return null;

  const boton = "flex-1 min-h-[48px] rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50";

  return (
    <section className="mx-4 mb-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm" aria-label="Horas extra">
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Horas extra</p>
        <p className={`text-sm font-bold ${COLOR[estado]}`}>{ETIQUETAS_ESTADO[estado]}</p>
      </div>
      <p className={`mt-1 text-2xl font-extrabold tabular-nums ${COLOR[estado]}`}>
        {minutos > 0 ? formatearMinutos(minutos) : "—"}
      </p>
      <p className="text-xs text-gray-500">
        {estado === "no_autorizada"
          ? "No se pagan: queda la constancia y las checadas no se mueven (se paga su jornada)."
          : `Lo trabajado de más sobre su jornada del día (cuenta desde ${UMBRAL_MINUTOS} min).`}
      </p>

      {debe > 0 && estado !== "reposicion" && (
        <p className="mt-2 rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-800">
          Debe <b>{formatearMinutos(debe)}</b> de permisos por horas. «Repone» lo descuenta de su cuenta y no se paga como extra.
        </p>
      )}

      {(estado === "autorizada" || estado === "reposicion") && (
        <div className="mt-3 space-y-0.5 text-sm text-gray-700">
          <p>Autorizó: <b>{autorizador || "Sin autorizador"}</b></p>
          {registro.forma_pago_extras && <p>Forma de pago: <b>{registro.forma_pago_extras}</b></p>}
          {registro.notas_hrs_extra && <p className="text-gray-500">“{registro.notas_hrs_extra}”</p>}
        </div>
      )}

      {estado === "pendiente" && (
        <div className="mt-3 space-y-2">
          <select
            aria-label="Forma de pago"
            value={forma}
            onChange={(e) => setForma(e.target.value)}
            className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"
          >
            {FORMAS_PAGO.map((f) => <option key={f}>{f}</option>)}
          </select>
          <input
            aria-label="Nota de horas extra"
            placeholder="Nota (opcional)"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm"
          />
          {debe > 0 && (
            <button type="button" disabled={guardando} onClick={() => onAutorizar({ forma: FORMA_REPOSICION, notas: nota || undefined })}
              className={`${boton} w-full bg-sky-600 text-white active:bg-sky-700`}>
              <RotateCcw className="h-4 w-4" /> Repone (debe {formatearMinutos(debe)})
            </button>
          )}
          <div className="flex gap-2">
            <button type="button" disabled={guardando} onClick={() => onAutorizar({ forma, notas: nota || undefined })}
              className={`${boton} bg-emerald-700 text-white active:bg-emerald-800`}>
              <Check className="h-4 w-4" /> Autorizar
            </button>
            <button type="button" disabled={guardando} onClick={onNoAutorizar}
              className={`${boton} border border-rose-200 bg-white text-rose-700 active:bg-rose-50`}>
              <X className="h-4 w-4" /> No autorizar
            </button>
          </div>
        </div>
      )}

      {(estado === "autorizada" || estado === "reposicion" || estado === "no_autorizada") && (
        <button type="button" disabled={guardando} onClick={onQuitar}
          className={`${boton} mt-3 w-full border border-gray-200 bg-white text-gray-700 active:bg-gray-50`}>
          {estado === "autorizada" ? "Quitar autorización" : estado === "reposicion" ? "Quitar reposición" : "Deshacer (regresar la salida del reloj)"}
        </button>
      )}
    </section>
  );
}
