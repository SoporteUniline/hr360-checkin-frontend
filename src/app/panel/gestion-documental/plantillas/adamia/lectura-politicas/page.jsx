"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import { useSWRConfig } from "swr";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { plantillasApi } from "@/lib/gestionDocumentalApi";
import {
  ACUSE_POLITICAS, crearHtmlAcusePoliticas, empresasDocumentales,
  guardarCopiaPoliticas, prepararPlantillaPoliticas, validarAcusePoliticas,
} from "@/lib/plantillasAdamia";

const nuevaPolitica = (id) => ({ id, nombre: "", version: "", referencia: "" });

export default function LecturaPoliticasPage() {
  const { dataUser } = useAuth();
  const empresas = empresasDocumentales(dataUser);
  const [empresaElegida, setEmpresaElegida] = useState("");
  const empresa = empresaElegida || (empresas.length === 1 ? empresas[0].id : "");
  const [datos, setDatos] = useState({ lugar: "", medio: "", contacto: "", politicas: [nuevaPolitica(1)] });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const nextId = useRef(2);
  const guardandoRef = useRef(false);
  const errorRef = useRef(null);
  const { enqueueSnackbar } = useSnackbar();
  const { mutate } = useSWRConfig();
  const router = useRouter();

  const actualizar = (campo, valor) => setDatos((prev) => ({ ...prev, [campo]: valor }));
  const actualizarPolitica = (id, campo, valor) => setDatos((prev) => ({
    ...prev, politicas: prev.politicas.map((p) => p.id === id ? { ...p, [campo]: valor } : p),
  }));

  const guardar = async (event) => {
    event.preventDefault();
    if (guardandoRef.current) return;
    const mensaje = !empresas.some((e) => e.id === empresa)
      ? "Selecciona la empresa donde guardarás la plantilla."
      : validarAcusePoliticas(datos);
    if (mensaje) {
      setError(mensaje);
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    guardandoRef.current = true;
    setGuardando(true);
    setError("");
    try {
      const payload = await prepararPlantillaPoliticas(empresa, datos);
      const guardada = await guardarCopiaPoliticas(plantillasApi, empresa, payload);
      await mutate((key) => typeof key === "string" && key.startsWith("/checador/gestion-documental/plantillas"));
      enqueueSnackbar("Plantilla lista en tu empresa. Selecciona al empleado para generar el acuse.", { variant: "success" });
      router.push(`/panel/gestion-documental/generar?empresa=${encodeURIComponent(empresa)}&plantilla=${encodeURIComponent(guardada.id_plantilla)}&codigo=${encodeURIComponent(guardada.codigo)}`);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "No se pudo guardar la plantilla. Intenta nuevamente.");
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setGuardando(false);
      guardandoRef.current = false;
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-8">
      <div>
        <Button asChild variant="ghost" className="mb-3 -ml-3 text-slate-600"><Link href="/panel/gestion-documental/plantillas"><ArrowLeft className="mr-2 h-4 w-4" />Plantillas</Link></Button>
        <div className="mb-2 flex items-center gap-2 text-xs"><span className="rounded bg-blue-50 px-2 py-1 font-medium text-blue-700">Plantilla ADAMIA</span><span className="text-slate-500">Versión {ACUSE_POLITICAS.version}</span></div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{ACUSE_POLITICAS.nombre}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Identifica los documentos que entregarás. El nombre del empleado y la empresa se completan al generar cada acuse.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form onSubmit={guardar} className="min-w-0 space-y-5">
          {error ? <div ref={errorRef} role="alert" tabIndex={-1} className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
          <fieldset disabled={guardando} className="space-y-5 disabled:opacity-70">
            <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-slate-900">Datos de la entrega</h2>
              <div className="space-y-1.5"><Label htmlFor="empresa-politicas">Empresa</Label>
                <select id="empresa-politicas" value={empresa} onChange={(e) => setEmpresaElegida(e.target.value)} required className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">
                  <option value="">Selecciona una empresa</option>{empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
                {!empresas.length ? <p className="text-xs text-amber-700">Tu sesión debe tener una empresa asignada para guardar una copia.</p> : null}
              </div>
              <div className="space-y-1.5"><Label htmlFor="lugar-politicas">Lugar o centro de trabajo</Label><Input id="lugar-politicas" required maxLength={500} placeholder="Ej. Sucursal Centro, Autlán de Navarro, Jalisco" value={datos.lugar} onChange={(e) => actualizar("lugar", e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="medio-politicas">Medio de entrega</Label><Input id="medio-politicas" required maxLength={500} placeholder="Ej. Copia digital enviada por correo al empleado" value={datos.medio} onChange={(e) => actualizar("medio", e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="contacto-politicas">Contacto para dudas u observaciones</Label><Input id="contacto-politicas" required maxLength={500} placeholder="Ej. Recursos Humanos · rh@tuempresa.mx" value={datos.contacto} onChange={(e) => actualizar("contacto", e.target.value)} /></div>
            </section>

            <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
              <div><h2 className="text-sm font-semibold text-slate-900">Políticas que se entregan</h2><p className="mt-1 text-xs leading-5 text-slate-500">Incluye solo documentos disponibles para el trabajador. Usa su versión o fecha de emisión para distinguirlos.</p></div>
              {datos.politicas.map((p, index) => (
                <div key={p.id} className="space-y-3 border-b border-slate-100 pb-4 last:border-0">
                  <div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-500">Documento {index + 1}</span><Button type="button" variant="ghost" size="icon" disabled={datos.politicas.length === 1} aria-label={`Quitar documento ${index + 1}`} className="h-8 w-8 text-red-600" onClick={() => actualizar("politicas", datos.politicas.filter((item) => item.id !== p.id))}><Trash2 className="h-4 w-4" /></Button></div>
                  <div className="space-y-1.5"><Label htmlFor={`politica-${p.id}`}>Nombre de la política</Label><Input id={`politica-${p.id}`} required maxLength={500} value={p.nombre} placeholder="Ej. Política de asistencia y puntualidad" onChange={(e) => actualizarPolitica(p.id, "nombre", e.target.value)} /></div>
                  <div className="space-y-1.5"><Label htmlFor={`version-${p.id}`}>Versión o fecha de emisión</Label><Input id={`version-${p.id}`} required maxLength={500} value={p.version} placeholder="Ej. Versión 2 · 01/10/2026" onChange={(e) => actualizarPolitica(p.id, "version", e.target.value)} /></div>
                  <div className="space-y-1.5"><Label htmlFor={`referencia-${p.id}`}>Archivo, anexo o ubicación de consulta</Label><Input id={`referencia-${p.id}`} required maxLength={500} value={p.referencia} placeholder="Ej. Manual entregado, páginas 5–9" onChange={(e) => actualizarPolitica(p.id, "referencia", e.target.value)} /></div>
                </div>
              ))}
              <Button type="button" variant="outline" disabled={datos.politicas.length >= 20} onClick={() => actualizar("politicas", [...datos.politicas, nuevaPolitica(nextId.current++)])}><Plus className="mr-2 h-4 w-4" />Agregar política</Button>
            </section>
            <p className="text-xs leading-5 text-slate-500">Entrega las políticas y permite su lectura antes de solicitar la firma. Este formato no sustituye el Reglamento Interior de Trabajo ni su depósito y difusión. <a className="text-blue-700 underline" href={ACUSE_POLITICAS.fuente} target="_blank" rel="noopener noreferrer">Consultar LFT</a>.</p>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 sm:w-auto" disabled={!empresa || guardando}>{guardando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{guardando ? "Preparando plantilla..." : "Guardar copia y usar"}</Button>
          </fieldset>
        </form>

        <section aria-label="Vista previa del acuse" className="min-w-0 self-start overflow-hidden rounded-xl border border-slate-200 bg-white xl:sticky xl:top-5">
          <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-900">Vista previa</h2><p className="mt-1 text-xs text-slate-500">Los campos entre llaves se llenan al seleccionar al empleado.</p></div>
          <div className="max-h-[900px] overflow-auto p-5 sm:p-8 [&_td]:border-b [&_td]:border-slate-200 [&_td]:p-2 [&_td]:align-top [&_th]:border-b [&_th]:border-slate-300 [&_th]:p-2 [&_th]:text-left [&_p]:mb-3 [&_table]:break-words" dangerouslySetInnerHTML={{ __html: crearHtmlAcusePoliticas(datos) }} />
        </section>
      </div>
    </div>
  );
}
