"use client";

// Lumo fase B1 (25/11/2026): qué sucursales aplican a una vacante (todas por omisión). El agente de WhatsApp le propone al
// candidato las 3 más cercanas de esta lista. Una sucursal sin ubicar no se puede proponer: se avisa y se enlaza al
// catálogo para ubicarla. En teléfono ocupa toda la pantalla.
import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Loader2, MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mensajeErrorApi } from "@/lib/whatsapp/reglas.mjs";
import { idsParaGuardar, resumenSucursalesVacante } from "@/lib/whatsapp/sucursales.mjs";
import { guardarSucursalesVacante, obtener, rutaSucursalesVacante } from "./api";
import { DIALOGO_PANTALLA_COMPLETA, Interruptor } from "./controles";

export default function SucursalesVacante({ abierto, onCambiar, idVacante, titulo }) {
  const { data, error, mutate } = useSWR(abierto ? rutaSucursalesVacante(idVacante) : null, obtener, { revalidateOnFocus: false });
  const [todas, setTodas] = useState(true);
  const [marcadas, setMarcadas] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState({ tono: "", texto: "" });

  useEffect(() => {
    if (!data) return;
    setTodas(data.todas);
    setMarcadas(data.todas ? data.sucursales.map((s) => s.id_unidad) : data.ids);
    setAviso({ tono: "", texto: "" });
  }, [data]);

  const sucursales = data?.sucursales ?? [];
  const resumen = data ? resumenSucursalesVacante({ todas, ids: marcadas, sucursales }) : null;
  const ninguna = !todas && marcadas.length === 0;

  const guardar = async () => {
    if (ninguna) { setAviso({ tono: "rojo", texto: "Elige al menos una sucursal o deja «Todas las sucursales»." }); return; }
    setGuardando(true);
    try {
      const r = await guardarSucursalesVacante(idVacante, idsParaGuardar({ todas, marcadas, total: sucursales.length }));
      await mutate(r, { revalidate: false });
      setAviso({ tono: "verde", texto: "Guardado. El agente propondrá solo estas sucursales." });
    } catch (e) {
      setAviso({ tono: "rojo", texto: mensajeErrorApi(e, "No se pudo guardar.") });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={onCambiar}>
      <DialogContent className={`${DIALOGO_PANTALLA_COMPLETA} sm:max-w-lg`} data-sucursales-vacante>
        <DialogHeader className="border-b border-gray-200 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] pr-14 text-left">
          <DialogTitle>Sucursales de la vacante</DialogTitle>
          <DialogDescription>
            {titulo ? <>«{titulo}». </> : null}El agente le propone al candidato las 3 más cercanas de esta lista según su colonia o su ubicación.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <div role="alert" className="m-5 grid gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <span>{mensajeErrorApi(error, "No se pudieron cargar las sucursales.")}</span>
            <Button type="button" variant="outline" onClick={() => mutate()} className="min-h-11 md:min-h-9" startIcon={<RefreshCw className="size-4" />}>Reintentar</Button>
          </div>
        ) : !data ? (
          <p className="flex items-center gap-2 p-5 text-sm text-gray-500"><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Cargando sucursales…</p>
        ) : (
          <>
            <div className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto bg-gray-50 px-4 py-4 sm:px-5">
              {!data.mapbox_configurado ? (
                <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[13px] text-amber-900" data-sin-mapbox>
                  Falta configurar Mapbox: mientras tanto el agente no propone sucursales por cercanía.
                </p>
              ) : null}
              {!sucursales.length ? (
                <p className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center text-[14px] text-gray-700">
                  Tu empresa no tiene sucursales. Créalas en <Link href="/panel/catalogos/unidades-de-negocio" className="font-semibold text-emerald-800 underline">Catálogos → Unidades de negocio</Link>.
                </p>
              ) : (
                <>
                  <div className="rounded-xl border border-gray-200 bg-white px-3 py-1">
                    <Interruptor activo={todas} onCambiar={(v) => { setTodas(v); if (v) setMarcadas(sucursales.map((s) => s.id_unidad)); }}>
                      Todas las sucursales
                    </Interruptor>
                  </div>
                  <fieldset disabled={todas} className="grid gap-1.5 disabled:opacity-60">
                    <legend className="mb-1 text-[13px] font-semibold text-gray-700">O elige cuáles</legend>
                    {sucursales.map((s) => (
                      <label key={s.id_unidad} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 has-[:checked]:border-emerald-300">
                        <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-emerald-600" checked={todas || marcadas.includes(s.id_unidad)}
                          onChange={(e) => setMarcadas((m) => (e.target.checked ? [...m, s.id_unidad] : m.filter((x) => x !== s.id_unidad)))} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-semibold text-gray-900 [overflow-wrap:anywhere]">{s.nombre}</span>
                          {s.direccion ? <span className="block text-[13px] text-gray-600 [overflow-wrap:anywhere]">{s.direccion}</span> : null}
                        </span>
                        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[13px] font-medium ring-1 ring-inset ${s.ubicada ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-amber-50 text-amber-900 ring-amber-200"}`}>
                          <MapPin className="size-3.5" aria-hidden="true" />{s.ubicada ? "Ubicada" : "Sin ubicar"}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  {resumen?.aviso ? (
                    <p className="text-[13px] text-amber-900">{resumen.aviso} Ubícalas en <Link href="/panel/catalogos/unidades-de-negocio" className="font-semibold underline">Unidades de negocio</Link>.</p>
                  ) : null}
                </>
              )}
            </div>
            <div className="grid gap-2 border-t border-gray-200 bg-white px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
              {aviso.texto ? (
                <p role={aviso.tono === "rojo" ? "alert" : "status"} className={`text-[13px] font-medium ${aviso.tono === "rojo" ? "text-red-700" : "text-emerald-800"}`}>{aviso.texto}</p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onCambiar(false)} className="min-h-11 flex-1 sm:flex-none md:min-h-9">Cerrar</Button>
                <Button type="button" onClick={guardar} loading={guardando} disabled={!sucursales.length} className="min-h-11 flex-1 sm:flex-none md:min-h-9">Guardar</Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
