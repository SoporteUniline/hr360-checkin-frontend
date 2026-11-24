"use client";

// Ficha → Checador y acceso: «Firma y PIN» de la persona para RH.
// RH nunca ve ni escribe el PIN: ve si tiene firma guardada y PIN, si está bloqueado, y puede DESBLOQUEAR (quita el
// candado de intentos) o RESTABLECER (borra el PIN; la persona crea uno nuevo en su app). Cada acción queda registrada.
// Reglas de qué mostrar: src/lib/firma/pinRh.mjs (scripts/test-pin-rh.mjs).
import { useRef, useState } from "react";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { KeyRound, LockOpen, RotateCcw } from "lucide-react";
import axios from "@/lib/axios";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ACCION_TEXTO, estadoPinRh } from "@/lib/firma/pinRh.mjs";

const get = (url) => axios.get(url).then((r) => r.data);
const TONO = { verde: "bg-green-50 text-green-800", ambar: "bg-amber-50 text-amber-800", rojo: "bg-red-50 text-red-700", gris: "bg-slate-100 text-slate-600" };
const cuando = (v) => new Date(`${String(v).replace(" ", "T")}Z`).toLocaleString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

const CONFIRMAR = {
  desbloquear: {
    titulo: "Desbloquear PIN",
    texto: "Se quita el bloqueo por intentos fallidos. El PIN no cambia y tú no lo ves. Quedará registrado que lo desbloqueaste.",
    boton: "Desbloquear",
    ruta: "desbloquear",
  },
  restablecer_pin: {
    titulo: "Restablecer PIN",
    texto: "Se borra su PIN actual. La persona tendrá que crear uno nuevo en su app (Mi espacio → Mi firma y PIN) antes de volver a firmar con PIN; mientras tanto puede firmar dibujando. Su firma guardada se conserva. Quedará registrado que lo restableciste.",
    boton: "Restablecer PIN",
    ruta: "restablecer-pin",
  },
};

export default function FirmaPinRh({ idEmpleado }) {
  const { enqueueSnackbar } = useSnackbar();
  const ruta = idEmpleado ? `/checador/mi-espacio/firma/empleado/${idEmpleado}` : null;
  const { data, mutate, error } = useSWR(ruta, get, { revalidateOnFocus: false, shouldRetryOnError: false });
  const [accion, setAccion] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  // La ventana conserva su texto mientras se cierra (si no, se ve vacía durante la animación).
  const ultima = useRef("desbloquear");
  if (accion) ultima.current = accion;
  const conf = CONFIRMAR[accion ?? ultima.current];
  if (!ruta || error || !data) return null;
  const s = estadoPinRh(data);

  const ejecutar = async () => {
    setOcupado(true);
    try {
      const r = await axios.post(`${ruta}/${conf.ruta}`);
      await mutate(r.data, { revalidate: false });
      enqueueSnackbar(r.data?.mensaje ?? "Listo.", { variant: "success" });
      setAccion(null);
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.error ?? "No se pudo completar. Intenta de nuevo.", { variant: "error" });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <section aria-labelledby="firma-pin-rh" className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm" data-firma-pin-rh>
      <h3 id="firma-pin-rh" className="flex items-center gap-2 font-semibold text-slate-900"><KeyRound className="size-4 text-brand" /> Firma y PIN</h3>
      <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2">
        <dt className="text-slate-500">Firma</dt>
        <dd><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TONO[s.firma.tono]}`}>{s.firma.texto}</span></dd>
        <dt className="text-slate-500">PIN</dt>
        <dd className="min-w-0">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TONO[s.pin.tono]}`} data-pin-estado={s.pin.texto}>{s.pin.texto}</span>
          <p className="mt-1 text-xs text-slate-600">{s.pin.detalle}</p>
        </dd>
      </dl>
      <p className="mt-3 text-xs text-slate-500">Por seguridad nadie de RH puede ver ni escribir el PIN: es la firma de la persona.</p>
      {s.puedeDesbloquear || s.puedeRestablecer ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {s.puedeDesbloquear ? (
            <button type="button" onClick={() => setAccion("desbloquear")} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-[13px] font-semibold text-slate-800 hover:bg-slate-50">
              <LockOpen className="size-4" aria-hidden="true" /> Desbloquear PIN
            </button>
          ) : null}
          {s.puedeRestablecer ? (
            <button type="button" onClick={() => setAccion("restablecer_pin")} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-[13px] font-semibold text-red-700 hover:bg-red-50">
              <RotateCcw className="size-4" aria-hidden="true" /> Restablecer PIN
            </button>
          ) : null}
        </div>
      ) : null}
      {data.historial?.length ? (
        <ul className="mt-3 space-y-0.5 border-t border-slate-100 pt-2 text-xs text-slate-500" aria-label="Acciones de RH sobre el PIN">
          {data.historial.map((h, i) => <li key={i} className="break-words">{h.nombre_usuario || "RH"} {ACCION_TEXTO[h.accion] ?? h.accion} · {cuando(h.creado_en)}</li>)}
        </ul>
      ) : null}

      <Dialog open={Boolean(accion)} onOpenChange={(v) => { if (!v && !ocupado) setAccion(null); }}>
        <DialogContent className="grid-cols-[minmax(0,1fr)] sm:max-w-md">
          <DialogTitle className="text-lg font-bold">{conf.titulo}</DialogTitle>
          <DialogDescription className="text-sm text-slate-600">{conf.texto}</DialogDescription>
          <div className="flex justify-end gap-2">
            <button type="button" disabled={ocupado} onClick={() => setAccion(null)} className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold">Cancelar</button>
            <button type="button" disabled={ocupado} onClick={ejecutar}
              className={`min-h-11 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-60 ${conf === CONFIRMAR.restablecer_pin ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}>
              {ocupado ? "Guardando…" : conf.boton}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
