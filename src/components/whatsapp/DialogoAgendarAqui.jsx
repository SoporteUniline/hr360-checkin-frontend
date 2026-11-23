"use client";

// «Agendar aquí» desde un horario libre del calendario de Entrevistas: se elige la conversación del candidato (de la misma
// vacante; búsqueda por nombre o teléfono) y se crea la cita con POST /citas. Desde el chat no hace falta: ya se sabe quién es.
import { useEffect, useId, useState } from "react";
import useSWR from "swr";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fechaHoraCorta, textoLugares } from "@/lib/whatsapp/agenda.mjs";
import { mensajeErrorApi } from "@/lib/whatsapp/reglas.mjs";
import { formatearTelefono, nombreContacto } from "@/lib/whatsapp/telefono.mjs";
import { crearCita, obtener, rutaConversaciones } from "./api";
import { CLASE_ENTRADA, DIALOGO_PANTALLA_COMPLETA } from "./controles";

export default function DialogoAgendarAqui({ horario, onCerrar, idEmpresa, vacante, onListo }) {
  const abierto = !!horario;
  const id = useId();
  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState("");
  const [elegida, setElegida] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState("");
  useEffect(() => { if (!abierto) { setBusqueda(""); setQ(""); setElegida(""); setAviso(""); } }, [abierto]);
  useEffect(() => { const t = setTimeout(() => setQ(busqueda.trim()), 300); return () => clearTimeout(t); }, [busqueda]);
  const { data, error, isLoading } = useSWR(abierto ? rutaConversaciones(idEmpresa, { q, limite: 50 }) : null, obtener, { revalidateOnFocus: false });
  const idVacante = vacante?.id_vacante;
  const candidatos = (data?.conversaciones ?? []).filter((c) => String(c.vacante?.id_vacante ?? "") === String(idVacante ?? ""));
  const agendar = async () => {
    if (!elegida) { setAviso("Elige al candidato."); return; }
    setGuardando(true);
    setAviso("");
    try {
      const r = await crearCita({ id_conversacion: Number(elegida), id_vacante: idVacante, inicio: horario.inicio });
      await onListo?.(r);
    } catch (e) {
      setAviso(mensajeErrorApi(e, "No se pudo agendar la entrevista."));
    } finally {
      setGuardando(false);
    }
  };
  return (
    <Dialog open={abierto} onOpenChange={(v) => { if (!v && !guardando) onCerrar(); }}>
      <DialogContent className={`${DIALOGO_PANTALLA_COMPLETA} sm:max-w-lg`}>
        <DialogHeader className="border-b border-gray-200 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] pr-14 text-left">
          <DialogTitle>Agendar entrevista aquí</DialogTitle>
          <DialogDescription>
            {horario ? `${fechaHoraCorta(horario.inicio)} · ${vacante?.titulo || "vacante"} · ${textoLugares(horario.libres, horario.capacidad)}. ` : ""}
            El agente le manda al candidato la confirmación por WhatsApp.
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto px-5 py-4">
          <label htmlFor={`${id}-buscar`} className="text-sm font-semibold text-gray-800">Candidato</label>
          <input id={`${id}-buscar`} type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Busca por nombre o teléfono"
            className={`${CLASE_ENTRADA} h-11 md:h-9`} />
          {error ? <p role="alert" className="text-[13px] text-red-700">{mensajeErrorApi(error, "No se pudieron cargar las conversaciones.")}</p>
            : isLoading && !data ? <p className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="size-4 animate-spin" /> Buscando…</p>
              : !candidatos.length ? (
                <p className="rounded-lg border border-dashed border-gray-300 p-3 text-center text-[13px] text-gray-600" data-sin-candidatos>
                  No hay conversaciones de esta vacante{q ? " con esa búsqueda" : ""}. Comparte el enlace de la vacante para recibir candidatos.
                </p>
              ) : (
                <div role="radiogroup" aria-label="Candidatos de la vacante" className="grid gap-1.5" data-candidatos>
                  {candidatos.map((c) => (
                    <label key={c.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-300">
                      <input type="radio" name={`${id}-candidato`} value={c.id} checked={String(elegida) === String(c.id)} onChange={() => { setElegida(String(c.id)); setAviso(""); }}
                        className="size-4 accent-blue-600" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold text-gray-900">{nombreContacto(c.contacto)}</span>
                        <span className="block truncate text-[12px] text-gray-500">{c.contacto?.telefono ? formatearTelefono(c.contacto.telefono) : ""}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
        </div>
        <div className="grid gap-2 border-t border-gray-200 bg-white px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          {aviso ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-[13px] text-red-800">{aviso}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCerrar} disabled={guardando} className="min-h-11 flex-1 sm:flex-none md:min-h-9">Cancelar</Button>
            <Button type="button" onClick={agendar} loading={guardando} disabled={!candidatos.length} className="min-h-11 flex-1 sm:flex-none md:min-h-9">Agendar aquí</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
