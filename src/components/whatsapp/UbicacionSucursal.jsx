"use client";

// Lumo fase B1 (25/11/2026): ubicación de una sucursal para que el agente de WhatsApp proponga la más cercana al
// candidato. Vive dentro del diálogo «Editar unidad» del catálogo de sucursales. «Ubicar en mapa» manda la dirección al
// SERVIDOR, que geocodifica con Mapbox (el token nunca llega al navegador); RH revisa el punto en el mapa y puede corregir
// latitud y longitud a mano. Si la empresa no tiene Reclutamiento, la sección no se muestra.
import { useEffect, useState } from "react";
import useSWR from "swr";
import { ExternalLink, Loader2, MapPin, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { enlaceMapa, mensajeGeocodificar, textoOrigen, validarCoordenadas } from "@/lib/whatsapp/sucursales.mjs";
import { geocodificarDireccion, guardarUbicacionSucursal, obtener, rutaSucursales } from "./api";

const ENTRADA = "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-[14px] text-gray-900 outline-none focus-visible:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-600/30 md:h-9";

export default function UbicacionSucursal({ idUnidad, idEmpresa, direccion }) {
  const { data, error, mutate } = useSWR(idUnidad && idEmpresa ? rutaSucursales(idEmpresa) : null, obtener, { revalidateOnFocus: false, shouldRetryOnError: false });
  const actual = data?.sucursales?.find((s) => s.id_unidad === Number(idUnidad)) ?? null;
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [origen, setOrigen] = useState("manual");
  const [etiqueta, setEtiqueta] = useState("");
  const [aviso, setAviso] = useState({ tono: "", texto: "" });
  const [ubicando, setUbicando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!actual) return;
    setLat(actual.lat == null ? "" : String(actual.lat));
    setLng(actual.lng == null ? "" : String(actual.lng));
    setOrigen(actual.ubicacion_origen || "manual");
  }, [actual]);

  // Sin el módulo de Reclutamiento (403) o sin la migración (503): no se muestra nada aquí.
  if (error || (data && !actual)) return null;
  if (!data) return <p className="flex items-center gap-2 text-[13px] text-gray-500"><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Cargando ubicación…</p>;

  const mapbox = data.mapbox_configurado;
  const v = validarCoordenadas(lat, lng);
  const sucio = String(actual.lat ?? "") !== lat.trim() || String(actual.lng ?? "") !== lng.trim();

  const ubicar = async () => {
    setAviso({ tono: "", texto: "" });
    if (!String(direccion ?? "").trim()) { setAviso({ tono: "rojo", texto: "Escribe primero el domicilio completo de la unidad." }); return; }
    setUbicando(true);
    try {
      const r = await geocodificarDireccion(idEmpresa, direccion);
      setLat(String(r.lat));
      setLng(String(r.lng));
      setOrigen("mapbox");
      setEtiqueta(r.etiqueta || "");
      setAviso({ tono: "verde", texto: "Revisa el punto en el mapa y guarda la ubicación." });
    } catch (err) {
      setAviso({ tono: "rojo", texto: mensajeGeocodificar(err?.response?.data?.codigo) });
    } finally {
      setUbicando(false);
    }
  };

  const guardar = async () => {
    if (!v.valido) { setAviso({ tono: "rojo", texto: v.error }); return; }
    setGuardando(true);
    try {
      await guardarUbicacionSucursal(idUnidad, { ...v.cuerpo, origen });
      await mutate();
      setAviso({ tono: "verde", texto: v.cuerpo.lat == null ? "Se quitó la ubicación." : "Ubicación guardada. El agente ya puede proponer esta sucursal." });
    } catch (err) {
      setAviso({ tono: "rojo", texto: err?.response?.data?.error || "No se pudo guardar la ubicación." });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section aria-labelledby={`ubicacion-${idUnidad}`} className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 md:col-span-2" data-ubicacion-sucursal>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id={`ubicacion-${idUnidad}`} className="flex items-center gap-1.5 text-[14px] font-semibold text-gray-900"><MapPin className="size-4 text-emerald-700" aria-hidden="true" /> Ubicación en el mapa</h3>
          <p className="text-[13px] text-gray-600">Para que el agente de WhatsApp le proponga al candidato la sucursal más cercana.</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[13px] font-medium text-gray-700 ring-1 ring-inset ring-gray-200">{textoOrigen(actual?.ubicacion_origen)}</span>
      </div>
      {!mapbox ? (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[13px] text-amber-900" data-sin-mapbox>
          Falta configurar Mapbox. Mientras tanto puedes escribir la latitud y la longitud a mano (cópialas de Google Maps).
        </p>
      ) : null}
      <div>
        <Button type="button" variant="outline" onClick={ubicar} loading={ubicando} disabled={!mapbox} startIcon={<MapPin className="size-4" />} className="min-h-11 w-full sm:w-auto md:min-h-9">
          Ubicar en mapa
        </Button>
        <p className="mt-1 text-[13px] text-gray-500">Usa el domicilio completo de arriba.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-[13px] font-medium text-gray-700">
          Latitud
          <input value={lat} onChange={(e) => { setLat(e.target.value); setOrigen("manual"); }} inputMode="decimal" placeholder="25.6866" className={ENTRADA} aria-invalid={!v.valido || undefined} />
        </label>
        <label className="grid gap-1 text-[13px] font-medium text-gray-700">
          Longitud
          <input value={lng} onChange={(e) => { setLng(e.target.value); setOrigen("manual"); }} inputMode="decimal" placeholder="-100.3161" className={ENTRADA} aria-invalid={!v.valido || undefined} />
        </label>
      </div>
      {etiqueta ? <p className="text-[13px] text-gray-600 [overflow-wrap:anywhere]">Mapbox encontró: {etiqueta}</p> : null}
      {aviso.texto ? (
        <p role={aviso.tono === "rojo" ? "alert" : "status"} className={`rounded-lg p-2.5 text-[13px] ${aviso.tono === "rojo" ? "border border-red-200 bg-red-50 text-red-800" : "border border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{aviso.texto}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={guardar} loading={guardando} disabled={!sucio} startIcon={<Save className="size-4" />} className="min-h-11 flex-1 sm:flex-none md:min-h-9">
          Guardar ubicación
        </Button>
        {v.valido && v.cuerpo.lat != null ? (
          <a href={enlaceMapa(v.cuerpo.lat, v.cuerpo.lng)} target="_blank" rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-emerald-800 underline underline-offset-2 md:min-h-9">
            Ver en el mapa <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </section>
  );
}
