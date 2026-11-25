"use client";

// Ficha del candidato (25/11/2026), como «Info. del contacto» de WhatsApp Web: columna de 380 px a la derecha del chat,
// cerrada por defecto; se abre al tocar el nombre o con «Acciones → Ver ficha del candidato». Bajo 1280 px se sobrepone
// al chat y en teléfono (<1024 px) ocupa toda la pantalla. Reúne en tarjetas lo que antes estaba repartido entre el
// panel del candidato, la hoja de proceso y la franja de la cita: encabezado (avatar, nombre, teléfono, calificación y
// etapa de la entrevista), vacante, proceso de selección (ProcesoChat), entrevista/cita (CitaChat) y la evaluación de la IA
// (PanelCandidato). Se mantiene montada aunque esté cerrada para que los diálogos de la cita (agendar desde el encabezado
// o el menú) funcionen sin abrirla.
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { formatearTelefono, nombreContacto } from "@/lib/whatsapp/telefono.mjs";
import { etiquetaCalificacion, etiquetaEtapa } from "@/lib/whatsapp/entrevista.mjs";
import { Avatar } from "./ListaConversaciones";
import { TONOS } from "./controles";
import { TARJETA_FICHA } from "./PanelCandidato";

export default function FichaCandidato({ abierta, onCerrar, conversacion, entrevista, seccion = "", proceso, cita, evaluacion }) {
  const cerrar = useRef(null);
  const cuerpo = useRef(null);
  // Al abrir: foco en «Cerrar ficha» y, si se pidió una sección (cita o proceso), se desplaza hasta ella.
  useEffect(() => {
    if (!abierta) return;
    const destino = seccion ? cuerpo.current?.querySelector(`[data-seccion-ficha="${seccion}"]`) : null;
    if (destino) destino.scrollIntoView({ block: "start" });
    else if (cuerpo.current) cuerpo.current.scrollTop = 0;
    const foco = destino?.querySelector("button:not([disabled]), a[href], select") ?? cerrar.current;
    foco?.focus({ preventScroll: true });
  }, [abierta, seccion]);
  if (!conversacion) return null;
  const contacto = conversacion.contacto;
  const nombre = nombreContacto(contacto);
  const calif = etiquetaCalificacion(entrevista?.calificacion);
  const estado = [calif?.texto, entrevista ? etiquetaEtapa(entrevista.etapa).toLowerCase() : ""].filter(Boolean).join(" · ");
  return (
    <aside aria-label="Ficha del candidato" data-ficha-candidato={abierta ? "abierta" : "cerrada"} hidden={!abierta}
      onKeyDown={(e) => { if (e.key === "Escape" && !e.defaultPrevented) { e.stopPropagation(); onCerrar(); } }}
      className="flex min-h-0 flex-col bg-[#F0F2F5] max-lg:fixed max-lg:inset-0 max-lg:z-50 lg:absolute lg:inset-y-0 lg:right-0 lg:z-30 lg:w-[380px] lg:border-l lg:border-[#E2E8F0] lg:shadow-[-8px_0_24px_rgba(11,20,26,0.12)] xl:static xl:z-auto xl:shrink-0 xl:shadow-none">
      <header className="flex min-h-[60px] shrink-0 items-center gap-2 bg-white px-1.5 pt-[env(safe-area-inset-top)] lg:px-3 lg:pt-0">
        <button ref={cerrar} type="button" onClick={onCerrar} aria-label="Cerrar ficha"
          className="grid size-11 shrink-0 place-items-center rounded-full text-[#54656F] outline-none hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-emerald-600 lg:size-10">
          <X className="size-5" aria-hidden="true" />
        </button>
        <h2 className="text-[16px] font-semibold text-[#111B21]">Ficha del candidato</h2>
      </header>
      <div ref={cuerpo} className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="bg-white px-5 py-5 text-center" data-seccion-ficha="encabezado">
          <Avatar contacto={contacto} className="mx-auto size-24 text-[32px]" />
          <p className="mt-3 text-[20px] font-bold text-[#111B21] [overflow-wrap:anywhere]">{nombre}</p>
          {contacto?.telefono ? <p className="mt-0.5 text-[14px] text-[#54656F]">{formatearTelefono(contacto.telefono)}</p> : null}
          {estado ? (
            <p className={`mt-2.5 inline-flex rounded-full px-2.5 py-1 text-[13px] font-semibold ring-1 ring-inset ${TONOS[calif?.tono] ?? TONOS.gris}`} data-estado-ficha="">{estado}</p>
          ) : null}
        </div>
        <div className={`grid gap-1 ${TARJETA_FICHA}`} data-seccion-ficha="vacante">
          <p className="text-[13px] text-[#54656F]">Vacante</p>
          <p className="text-[15px] font-semibold text-[#111B21] [overflow-wrap:anywhere]">{conversacion.vacante?.titulo || "Sin vacante"}</p>
        </div>
        <div data-seccion-ficha="proceso">{proceso}</div>
        {cita ? <div data-seccion-ficha="cita">{cita}</div> : null}
        <div data-seccion-ficha="evaluacion">{evaluacion}</div>
      </div>
    </aside>
  );
}
