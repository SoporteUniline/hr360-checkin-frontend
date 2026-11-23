"use client";

// Evaluación del candidato (R2): lo que el agente obtuvo en la entrevista. En escritorio ancho (≥1280 px) es una
// columna a la derecha del chat; en pantallas menores se abre como hoja con «Ver evaluación».
// R3: «Aprobar para agendar» (según el motivo o el modo de la empresa), la cita vigente con sus acciones y
// «Agendar entrevista» a mano con el selector de horarios libres de la vacante.
import { useState } from "react";
import { AlertTriangle, CalendarCheck2, CalendarPlus, CheckCircle2, HelpCircle, UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tiempoRelativo } from "@/lib/whatsapp/tiempo.mjs";
import {
  PUNTAJES, etiquetaEtapa, etiquetaSeveridad, normalizarPuntaje, textoConsentimiento, consentimientoAceptado, textoPreguntaActual,
} from "@/lib/whatsapp/entrevista.mjs";
import { citaActiva, necesitaAprobacionAgenda } from "@/lib/whatsapp/agenda.mjs";
import { ChipCalificacion } from "./controles";
import { DialogoHorario, TarjetaCita } from "./citas";
import { crearCita } from "./api";

const COLOR_SEVERIDAD = { verde: "bg-emerald-100 text-emerald-800", ambar: "bg-amber-100 text-amber-900", rojo: "bg-red-100 text-red-700" };

function Puntaje({ texto, valor }) {
  const v = normalizarPuntaje(valor);
  return (
    <li className="grid grid-cols-[7rem_minmax(0,1fr)_2.25rem] items-center gap-2 text-[13px]" data-puntaje={texto}>
      <span className="truncate text-gray-700">{texto}</span>
      <span role="img" aria-label={v ? `${texto}: ${v} de 5` : `${texto}: sin dato`} className="grid grid-cols-5 gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`h-2 rounded-sm ${v && i <= v ? (v >= 4 ? "bg-emerald-500" : v === 3 ? "bg-amber-400" : "bg-red-400") : "bg-gray-200"}`} />
        ))}
      </span>
      <span aria-hidden="true" className="text-right font-semibold tabular-nums text-gray-800">{v ? `${v}/5` : "—"}</span>
    </li>
  );
}

function Seccion({ titulo, children }) {
  return (
    <section className="grid gap-2">
      <h3 className="text-[12px] font-bold uppercase tracking-wide text-gray-500">{titulo}</h3>
      {children}
    </section>
  );
}

// Cita vigente (o la última) y «Agendar entrevista» a mano. Sin vacante no se puede agendar.
function SeccionCita({ conversacion, cita, hoy, onCitaCambio }) {
  const [agendando, setAgendando] = useState(false);
  const idVacante = conversacion?.vacante?.id_vacante;
  const activa = citaActiva(cita);
  return (
    <Seccion titulo="Cita de entrevista">
      {cita ? <TarjetaCita cita={cita} hoy={hoy} onCambio={onCitaCambio} conCandidato={false} /> : (
        <p className="text-[13px] text-gray-500" data-sin-cita>Todavía no tiene cita.</p>
      )}
      {!activa && conversacion ? (
        idVacante ? (
          <Button type="button" variant="outline" onClick={() => setAgendando(true)} startIcon={<CalendarPlus className="size-4 text-blue-600" />} className="min-h-11 md:min-h-9">
            Agendar entrevista
          </Button>
        ) : <p className="text-[12.5px] text-gray-500">Esta conversación no tiene vacante; no se puede agendar.</p>
      ) : null}
      {idVacante ? (
        <DialogoHorario abierto={agendando} onCambiar={setAgendando} titulo="Agendar entrevista" textoBoton="Agendar" idVacante={idVacante} hoy={hoy}
          descripcion={`Vacante «${conversacion.vacante.titulo || ""}». El agente le manda al candidato la confirmación por WhatsApp.`}
          onConfirmar={async (inicio) => {
            const r = await crearCita({ id_conversacion: conversacion.id, id_vacante: idVacante, inicio });
            await onCitaCambio?.(r?.cita ?? null);
          }} />
      ) : null}
    </Seccion>
  );
}

export default function PanelCandidato({
  entrevista, preguntasSinRespuesta = [], cargando, onAtendido, marcando, nombreAsistente, ahora,
  conversacion = null, cita = null, modoAgenda = null, onAprobar = null, aprobando = false, onCitaCambio = null, hoy = "",
}) {
  const quien = nombreAsistente?.trim() || "El agente";
  const seccionCita = onCitaCambio && conversacion ? <SeccionCita conversacion={conversacion} cita={cita} hoy={hoy} onCitaCambio={onCitaCambio} /> : null;
  if (!entrevista) {
    return (
      <div className="grid gap-4 p-4 text-sm text-gray-600" data-panel-candidato="vacio">
        {cargando ? <p>Cargando evaluación…</p> : <p>{quien} aún no entrevista a este candidato.</p>}
        {!cargando ? seccionCita : null}
        {preguntasSinRespuesta.length ? <SinRespuesta lista={preguntasSinRespuesta} ahora={ahora} /> : null}
      </div>
    );
  }
  const aprobar = onAprobar && necesitaAprobacionAgenda(entrevista, modoAgenda, cita);
  const respuestas = entrevista.respuestas ?? [];
  return (
    <div className="grid content-start gap-5 p-4" data-panel-candidato="lleno">
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {entrevista.calificacion ? <ChipCalificacion calificacion={entrevista.calificacion} className="px-2.5 py-1 text-[12.5px]" /> : (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[12.5px] font-semibold text-gray-600">Sin calificar</span>
          )}
          <span className="text-[12.5px] text-gray-600">{etiquetaEtapa(entrevista.etapa)}</span>
        </div>
        {entrevista.nombre ? <p className="text-[15px] font-bold text-gray-900 [overflow-wrap:anywhere]">{entrevista.nombre}</p> : null}
        <p className="flex items-center gap-1.5 text-[12.5px] text-gray-600">
          <UserRoundCheck className={`size-4 ${consentimientoAceptado(entrevista.consentimiento) ? "text-emerald-600" : "text-gray-400"}`} aria-hidden="true" />
          {textoConsentimiento(entrevista.consentimiento)}
        </p>
      </div>
      {entrevista.etapa === "preguntas" && textoPreguntaActual(entrevista.pregunta_actual) ? (
        <p className="rounded-lg bg-violet-50 p-2.5 text-[13px] text-violet-900 [overflow-wrap:anywhere]" data-pregunta-actual>
          <span className="font-semibold">Pregunta en curso:</span> {textoPreguntaActual(entrevista.pregunta_actual)}
        </p>
      ) : null}
      {entrevista.requiere_atencion ? (
        <div role="status" className="grid gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-800">
          <p className="flex items-start gap-1.5 font-semibold"><AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> Requiere atención</p>
          {entrevista.motivo_atencion ? <p className="[overflow-wrap:anywhere]">{entrevista.motivo_atencion}</p> : null}
          {onAtendido ? (
            <Button type="button" onClick={onAtendido} loading={marcando} startIcon={<CheckCircle2 className="size-4" />} className="min-h-11 bg-red-700 hover:bg-red-800 md:min-h-9">
              Marcar como atendido
            </Button>
          ) : null}
        </div>
      ) : null}
      {aprobar ? (
        <div role="status" data-aprobar-agenda className="grid gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-[13px] text-blue-950">
          <p className="flex items-start gap-1.5 font-semibold"><CalendarCheck2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> Espera tu aprobación para agendar</p>
          <p>{entrevista.calificacion === "con_alerta" && modoAgenda === "califica"
            ? "Tiene alguna alerta y tu empresa solo agenda directo a quien califica. Si lo apruebas, el agente le ofrece horarios."
            : "Si lo apruebas, el agente le ofrece horarios libres de la vacante por WhatsApp."}</p>
          <Button type="button" onClick={onAprobar} loading={aprobando} startIcon={<CalendarCheck2 className="size-4" />} className="min-h-11 bg-blue-700 hover:bg-blue-800 md:min-h-9">
            Aprobar para agendar
          </Button>
        </div>
      ) : null}
      {seccionCita}
      {entrevista.resumen ? (
        <Seccion titulo="Resumen">
          <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-gray-800 [overflow-wrap:anywhere]">{entrevista.resumen}</p>
        </Seccion>
      ) : null}
      {entrevista.puntajes ? (
        <Seccion titulo="Puntajes (1 a 5)">
          <ul className="grid gap-1.5" aria-label="Puntajes">
            {PUNTAJES.map((p) => <Puntaje key={p.clave} texto={p.texto} valor={entrevista.puntajes[p.clave]} />)}
          </ul>
        </Seccion>
      ) : null}
      <Seccion titulo="Respuestas">
        {respuestas.length ? (
          <ul className="grid gap-2" aria-label="Respuestas del candidato">
            {respuestas.map((r, i) => {
              const s = etiquetaSeveridad(r.severidad);
              return (
                <li key={i} className="flex gap-2 text-[13px]" data-severidad={r.severidad}>
                  <span aria-hidden="true" className={`grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-bold ${COLOR_SEVERIDAD[s.tono]}`}>{s.simbolo}</span>
                  <span className="min-w-0">
                    <span className="block text-gray-600 [overflow-wrap:anywhere]">{r.texto_pregunta}</span>
                    <span className="block font-semibold text-gray-900 [overflow-wrap:anywhere]">{r.respuesta || "—"}</span>
                    <span className="sr-only">{s.texto}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[13px] text-gray-500">Todavía no hay respuestas.</p>
        )}
      </Seccion>
      {preguntasSinRespuesta.length ? <SinRespuesta lista={preguntasSinRespuesta} ahora={ahora} /> : null}
    </div>
  );
}

function SinRespuesta({ lista, ahora }) {
  return (
    <Seccion titulo="Preguntas que el agente no supo contestar">
      <ul className="grid gap-1.5" aria-label="Preguntas sin respuesta">
        {lista.map((p, i) => (
          <li key={i} className="flex gap-2 rounded-lg bg-amber-50 p-2 text-[13px] text-amber-950">
            <HelpCircle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
            <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{p.pregunta}</span>
            {p.creado_en ? <span className="shrink-0 text-[11.5px] text-amber-800">{tiempoRelativo(p.creado_en, ahora)}</span> : null}
          </li>
        ))}
      </ul>
      <p className="text-[12px] text-gray-500">Agrega la respuesta en «Agente → Respuestas frecuentes» para que la próxima vez conteste solo.</p>
    </Seccion>
  );
}
