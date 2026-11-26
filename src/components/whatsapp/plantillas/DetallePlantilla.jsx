"use client";

// Detalle de una plantilla de Zernio: estado de Meta (con motivo si la rechazaron), vista previa y acciones. Lee el
// detalle (GET /:nombre) porque la lista de Zernio no siempre trae el motivo de rechazo.
import { useState } from "react";
import useSWR from "swr";
import { Copy, Loader2, Pencil, Trash2, TriangleAlert } from "lucide-react";
import axios from "@/lib/axios";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { chipEstado, errorDe, textoCategoria } from "@/lib/whatsapp/plantillasMeta.mjs";
import BurbujaWhatsapp from "./BurbujaWhatsapp";
import { botonPeligro, botonSec, campo, chip, dialogo, etiqueta } from "./estilos";

const get = (url) => axios.get(url).then((r) => r.data);

export default function DetallePlantilla({ plantilla, cuenta, alCerrar, alEditar, alNuevaVersion, alBorrar }) {
  const abierto = Boolean(plantilla);
  const ruta = plantilla ? `/checador/whatsapp-plantillas/${encodeURIComponent(plantilla.nombre)}?cuenta=${cuenta}&idioma=${encodeURIComponent(plantilla.idioma)}` : null;
  const { data } = useSWR(ruta, get, { shouldRetryOnError: false, revalidateOnFocus: false });
  const [confirmar, setConfirmar] = useState("");
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState("");
  const p = data?.plantilla ?? plantilla;
  if (!p) return null;
  const est = chipEstado(p.estado);

  const borrar = async () => {
    setBorrando(true);
    setError("");
    try {
      await alBorrar(p, confirmar);
      setConfirmar("");
    } catch (e) {
      setError(errorDe(e));
    } finally {
      setBorrando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => { if (!o) { setConfirmar(""); setError(""); alCerrar(); } }}>
      <DialogContent className={`${dialogo} sm:max-w-3xl`}>
        <DialogHeader>
          <DialogTitle className="break-all pr-10">{p.nombre}</DialogTitle>
          <DialogDescription className="text-[13px]">{textoCategoria(p.categoria)} · {p.idioma} · {p.variables} variable(s)</DialogDescription>
        </DialogHeader>
        <div data-detalle-plantilla className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid min-w-0 content-start gap-3">
            <div className="flex flex-wrap gap-2">
              <span className={`${chip} ${est.tono}`}>{est.texto}</span>
              {p.calidad ? <span className={`${chip} border-slate-300 bg-white text-slate-700`}>Calidad: {p.calidad}</span> : null}
              {data?.catalogo ? <span className={`${chip} border-blue-200 bg-blue-50 text-blue-800`}>Del sistema · {data.catalogo.modulo}</span> : null}
            </div>
            {p.estado === "rechazada" ? (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-800">
                <p className="font-semibold">Meta la rechazó{p.motivo_rechazo ? `: ${p.motivo_rechazo}` : "."}</p>
                <p>Corrige el contenido y edítala (vuelve a revisión) o crea una versión nueva.</p>
              </div>
            ) : null}
            {p.estado === "pendiente" ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-800">Meta la está revisando (hasta 24 h). Mientras tanto no se puede mandar ni editar.</p> : null}
            {data?.catalogo && data.catalogo.categoria !== p.categoria ? (
              <p className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-800"><TriangleAlert className="mt-0.5 size-4 shrink-0" />Meta la tiene como {p.categoria}; el sistema la propone {data.catalogo.categoria}. Cambia el costo por mensaje, no el envío.</p>
            ) : null}
            {p.ejemplos?.length ? (
              <div className="min-w-0">
                <p className={etiqueta}>Ejemplos enviados a Meta</p>
                <ol className="mt-1 grid gap-0.5 text-sm text-slate-700">{p.ejemplos.map((v, i) => <li key={i} className="break-words"><span className="font-semibold tabular-nums">{`{{${i + 1}}}`}</span> {v || "—"}</li>)}</ol>
              </div>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              {p.editable ? <button type="button" className={botonSec} onClick={() => alEditar(p)}><Pencil className="size-4" /> Editar</button> : null}
              <button type="button" className={botonSec} onClick={() => alNuevaVersion(p)}><Copy className="size-4" /> Crear versión nueva</button>
            </div>
            {!p.editable ? (
              <p className="text-[13px] text-slate-600">
                {p.soportada === false ? "Tiene partes que el panel no edita (imagen, carrusel u oferta)." : `Meta no deja editarla en estado «${est.texto}».`} Para cambiarla crea una versión nueva (otro nombre, p. ej. …_v2) y actualiza el nombre en el código.
              </p>
            ) : null}
            <details className="rounded-xl border border-red-200 p-3">
              <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-red-700">Borrar esta plantilla</summary>
              <div className="mt-2 grid gap-2">
                <p className="text-[13px] text-slate-700">
                  Se borra la variante {p.idioma}. Meta no deja reutilizar el nombre durante 30 días{data?.catalogo ? " y el sistema la usa: los avisos dejarán de salir" : ""}. Escribe el nombre para confirmar.
                </p>
                <input className={campo} aria-label="Escribe el nombre para confirmar" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} placeholder={p.nombre} autoComplete="off" spellCheck={false} />
                <button type="button" className={botonPeligro} disabled={confirmar !== p.nombre || borrando} onClick={borrar}>
                  {borrando ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Borrar definitivamente
                </button>
                {error ? <p role="alert" className="text-[13px] text-red-700">{error}</p> : null}
              </div>
            </details>
          </div>
          <BurbujaWhatsapp plantilla={p} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
