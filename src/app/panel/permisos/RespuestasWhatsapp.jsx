"use client";

// «Respuestas de WhatsApp sin aplicar (N)» (29/12/2026). Solicitudes que siguen Pendiente pero alguien que las autoriza
// contestó por WhatsApp algo que parece aprobar o rechazar. Solo lectura del servidor
// (GET /checador/solicitudes-permiso/whatsapp/sin-aplicar, docs/aprobacion-whatsapp.md del backend): nada se aplica solo.
// «Aplicar aprobación» / «Aplicar rechazo» piden confirmación y usan la MISMA acción de la tabla (permisosApi.actualizarEstado).
// Sin número de notificaciones o sin respuestas encontradas, no se muestra nada.
import React, { useState } from "react";
import useSWR from "swr";
import { MessageCircle, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { useSnackbar } from "notistack";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fetcherWithToken } from "@/lib/fetcher";
import { permisosApi } from "@/lib/permisosApi";
import { confianza, confirmacion, consulta, momento, mostrar, rangoFechas, sugerencia, titulo } from "@/lib/aprobacion-whatsapp/presentacion.mjs";

const VISIBLES = 3;
const TONO = {
  alta: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  media: "bg-amber-50 text-amber-800 ring-amber-200",
  baja: "bg-slate-100 text-slate-700 ring-slate-200",
};

export default function RespuestasWhatsapp({ idEmpresa, idUsuario, onAplicado }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data, mutate } = useSWR(consulta(idEmpresa), fetcherWithToken, { revalidateOnFocus: false, shouldRetryOnError: false });
  const [abierta, setAbierta] = useState(false);
  const [pendiente, setPendiente] = useState(null); // { item, estado }
  const [aplicando, setAplicando] = useState(false);

  if (!mostrar(data)) return null;
  const lista = data.solicitudes;
  const visibles = abierta ? lista : lista.slice(0, VISIBLES);
  const conf = pendiente ? confirmacion(pendiente.item, pendiente.estado) : null;

  const aplicar = async () => {
    if (!pendiente) return;
    setAplicando(true);
    try {
      await permisosApi.actualizarEstado(pendiente.item.id, pendiente.estado, idUsuario ?? null);
      enqueueSnackbar(pendiente.estado === "Aprobado" ? "Permiso aprobado" : "Permiso rechazado", { variant: "success" });
      setPendiente(null);
      await mutate();
      onAplicado?.();
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.error || "No se pudo actualizar el permiso", { variant: "error" });
    } finally {
      setAplicando(false);
    }
  };

  return (
    <section aria-labelledby="respuestas-whatsapp-titulo" data-respuestas-whatsapp className="rounded-xl border border-amber-200 bg-white shadow-sm">
      <header className="flex items-start gap-3 border-b border-amber-100 bg-amber-50/60 px-4 py-3 rounded-t-xl">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700" aria-hidden="true">
          <MessageCircle className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 id="respuestas-whatsapp-titulo" className="text-[15px] font-semibold text-slate-900">{titulo(lista.length)}</h2>
          <p className="text-[13px] text-slate-600">
            Siguen pendientes en ADAMIA, pero quien autoriza contestó por WhatsApp. Revisa la respuesta y aplícala; nada se cambia solo.
          </p>
        </div>
      </header>

      <ul className="divide-y divide-slate-100">
        {visibles.map((item) => {
          const ultima = item.evidencia?.[0];
          const c = confianza(item.confianza);
          return (
            <li key={item.id} data-solicitud={item.id} className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:gap-6">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium text-slate-900">{item.empleado}</span>
                  <span className="text-[13px] text-slate-500">
                    {item.es_vacaciones ? "Vacaciones" : item.tipo || "Permiso"} · {rangoFechas(item.fecha_inicio, item.fecha_fin)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-medium text-slate-700">{sugerencia(item.sugerencia)}</span>
                  <span title={c.detalle} className={`inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium ring-1 ring-inset ${TONO[c.tono]}`}>
                    {c.etiqueta}
                  </span>
                  {item.contradictoria ? (
                    <span className="text-[12px] font-medium text-rose-700">Hay respuestas distintas</span>
                  ) : null}
                </div>
                {ultima ? (
                  <p className="break-words text-[13px] text-slate-600">
                    <span className="text-slate-500">{momento(ultima.fecha)} · {ultima.de}:</span>{" "}
                    <q className="text-slate-800">{ultima.texto}</q>
                  </p>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                <Button type="button" size="sm" className="h-10 gap-1.5 sm:h-9" onClick={() => setPendiente({ item, estado: "Aprobado" })}>
                  <Check className="h-4 w-4" aria-hidden="true" /> Aplicar aprobación
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-10 gap-1.5 sm:h-9" onClick={() => setPendiente({ item, estado: "Rechazado" })}>
                  <X className="h-4 w-4" aria-hidden="true" /> Aplicar rechazo
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {lista.length > VISIBLES ? (
        <div className="border-t border-slate-100 px-4 py-2">
          <Button type="button" variant="ghost" size="sm" className="gap-1 text-slate-700" aria-expanded={abierta} onClick={() => setAbierta((v) => !v)}>
            {abierta ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
            {abierta ? "Ver menos" : `Ver las ${lista.length}`}
          </Button>
        </div>
      ) : null}

      <AlertDialog open={Boolean(pendiente)} onOpenChange={(v) => { if (!v && !aplicando) setPendiente(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{conf?.titulo}</AlertDialogTitle>
            <AlertDialogDescription>{conf?.texto}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={aplicando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={aplicando} onClick={(e) => { e.preventDefault(); aplicar(); }}>
              {aplicando ? "Aplicando…" : conf?.boton}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
