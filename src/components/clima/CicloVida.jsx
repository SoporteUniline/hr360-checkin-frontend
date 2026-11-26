"use client";

// Encuestas de ciclo de vida (26/11/2026): ingreso a 30 y 90 días y salida al registrar la baja. Se encienden aquí y se
// mandan solas (job diario y al dar de baja), con liga personal y anónimas. API: GET /ciclo-vida · PUT /ciclo-vida/:ciclo.
import useSWR from "swr";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { CICLOS } from "@/lib/clima/inspeccion.mjs";
import { Cargando, Tarjeta, codigoDe, errorDe, get, ruta } from "./ui";

export default function CicloVida({ idEmpresa }) {
  const { enqueueSnackbar } = useSnackbar();
  const c = useSWR(ruta("/ciclo-vida", idEmpresa), get, { shouldRetryOnError: false });
  if (c.error) return codigoDe(c.error) === "SIN_MIGRACION" ? null : <Tarjeta titulo="Encuestas de ciclo de vida"><p className="text-[13.5px] text-slate-600">{errorDe(c.error)}</p></Tarjeta>;
  if (!c.data) return <Tarjeta titulo="Encuestas de ciclo de vida"><Cargando /></Tarjeta>;
  const cambiar = async (ciclo, activo) => {
    c.mutate({ ...c.data, ciclos: c.data.ciclos.map((x) => (x.ciclo === ciclo ? { ...x, activo } : x)) }, false);
    try {
      await axios.put(ruta(`/ciclo-vida/${ciclo}`, idEmpresa), { activo });
      enqueueSnackbar(activo ? "Encendida: se mandará sola." : "Apagada.", { variant: "success" });
    } catch (e) {
      enqueueSnackbar(errorDe(e), { variant: "error" });
    }
    c.mutate();
  };
  return (
    <Tarjeta titulo="Encuestas de ciclo de vida">
      <p className="text-[13px] text-slate-600">
        Se mandan solas por correo con una liga personal. Son anónimas: las respuestas se juntan por trimestre y se ven al cerrar (con {c.data.diasParaContestar} días para
        contestar).
      </p>
      <ul className="mt-3 grid gap-3 md:grid-cols-3">
        {c.data.ciclos.map((x) => {
          const info = CICLOS[x.ciclo];
          const abierta = x.encuestas.find((e) => e.estado === "activa");
          return (
            <li key={x.ciclo} className="flex min-w-0 flex-col rounded-xl border border-slate-200 p-3">
              <label className="flex min-h-11 items-center justify-between gap-3">
                <span className="text-[14.5px] font-bold text-slate-900">{info.titulo}</span>
                <input
                  type="checkbox"
                  role="switch"
                  aria-checked={x.activo}
                  className="size-6 accent-blue-600"
                  checked={x.activo}
                  onChange={(e) => cambiar(x.ciclo, e.target.checked)}
                />
              </label>
              <p className="text-[13px] text-slate-600">{info.cuando}</p>
              <p className="mt-1 text-[13px] text-slate-500">
                {x.plantilla.preguntas} preguntas · {x.plantilla.minutos} min · {x.enviadas} enviada{x.enviadas === 1 ? "" : "s"}
              </p>
              {abierta ? (
                <p className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-slate-600">
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[13px] font-bold text-green-800">Abierta</span> {abierta.nombre}: {abierta.contestadas} de {abierta.invitados}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Tarjeta>
  );
}
