"use client";

// Evaluación del candidato (R2): lo que el agente obtuvo en la entrevista. Bandeja estilo WhatsApp Web: son las tarjetas de
// la ficha del candidato («Info. del contacto»), que se abre al tocar el nombre o «Ver ficha» (cerrada por defecto).
// R3: «Aprobar para agendar» (según el motivo o el modo de la empresa). La cita y «Agendar entrevista» viven en la
// tarjeta «Entrevista» de la ficha (CitaChat), con las mismas acciones y líneas de sistema que antes estaban sobre el chat.
// Lumo fase A (25/11/2026): «Requisitos de la vacante» (cumple / no cumple / falta dato, evaluados sin IA) como ALERTA
// —nunca rechazo— y preguntas sin respuesta con su estado y enlace a la base de conocimiento.
import Link from "next/link";
import { AlertTriangle, CalendarCheck2, CheckCircle2, ClipboardCheck, HelpCircle, UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tiempoRelativo } from "@/lib/whatsapp/tiempo.mjs";
import {
  PUNTAJES, etiquetaSeveridad, normalizarPuntaje, textoConsentimiento, consentimientoAceptado, textoPreguntaActual,
} from "@/lib/whatsapp/entrevista.mjs";
import { necesitaAprobacionAgenda } from "@/lib/whatsapp/agenda.mjs";
import { etiquetaEstadoRequisito, resumenRequisitos } from "@/lib/whatsapp/requisitos.mjs";

const COLOR_SEVERIDAD = { verde: "bg-emerald-100 text-emerald-800", ambar: "bg-amber-100 text-amber-900", rojo: "bg-red-100 text-red-700" };
export const TARJETA_FICHA = "bg-white px-5 py-4";

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

// Tarjeta blanca de la ficha con su título gris (como las secciones de «Info. del contacto»).
function Seccion({ titulo, children }) {
  return (
    <section className={`grid gap-2 ${TARJETA_FICHA}`}>
      <h3 className="text-[13px] font-medium text-[#54656F]">{titulo}</h3>
      {children}
    </section>
  );
}

export default function PanelCandidato({
  entrevista, preguntasSinRespuesta = [], cargando, onAtendido, marcando, nombreAsistente, ahora,
  cita = null, modoAgenda = null, onAprobar = null, aprobando = false, requisitos = null, enlaceConocimiento = null,
}) {
  const quien = nombreAsistente?.trim() || "El agente";
  if (!entrevista) {
    return (
      <div className="grid gap-2" data-panel-candidato="vacio">
        <p className={`${TARJETA_FICHA} text-sm text-gray-600`}>{cargando ? "Cargando evaluación…" : `${quien} aún no entrevista a este candidato.`}</p>
        <Requisitos requisitos={requisitos} />
        {preguntasSinRespuesta.length ? <SinRespuesta lista={preguntasSinRespuesta} ahora={ahora} enlace={enlaceConocimiento} /> : null}
      </div>
    );
  }
  const aprobar = onAprobar && necesitaAprobacionAgenda(entrevista, modoAgenda, cita);
  const respuestas = entrevista.respuestas ?? [];
  return (
    <div className="grid content-start gap-2" data-panel-candidato="lleno">
      {entrevista.requiere_atencion || aprobar ? (
        <div className={`grid gap-3 ${TARJETA_FICHA}`}>
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
        </div>
      ) : null}
      <Requisitos requisitos={requisitos} />
      <Seccion titulo={`Entrevista con ${quien === "El agente" ? "el agente" : quien}`}>
        {entrevista.nombre ? <p className="text-[15px] font-semibold text-gray-900 [overflow-wrap:anywhere]"><span className="sr-only">Nombre que dio: </span>{entrevista.nombre}</p> : null}
        <p className="flex items-center gap-1.5 text-[13px] text-gray-700">
          <UserRoundCheck className={`size-4 ${consentimientoAceptado(entrevista.consentimiento) ? "text-emerald-600" : "text-gray-400"}`} aria-hidden="true" />
          {textoConsentimiento(entrevista.consentimiento)}
        </p>
        {entrevista.etapa === "preguntas" && textoPreguntaActual(entrevista.pregunta_actual) ? (
          <p className="rounded-lg bg-violet-50 p-2.5 text-[13px] text-violet-900 [overflow-wrap:anywhere]" data-pregunta-actual>
            <span className="font-semibold">Pregunta en curso:</span> {textoPreguntaActual(entrevista.pregunta_actual)}
          </p>
        ) : null}
      </Seccion>
      <Seccion titulo={respuestas.length ? `Respuestas · ${respuestas.length}` : "Respuestas"}>
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
          <p className="text-[13px] text-gray-600">Todavía no hay respuestas.</p>
        )}
      </Seccion>
      {entrevista.resumen || entrevista.puntajes ? (
        <Seccion titulo="Resumen de la IA">
          {entrevista.resumen ? (
            <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-gray-800 [overflow-wrap:anywhere]">{entrevista.resumen}</p>
          ) : null}
          {entrevista.puntajes ? (
            <>
              <h4 className="mt-1 text-[12.5px] font-semibold text-gray-700">Puntajes (1 a 5)</h4>
              <ul className="grid gap-1.5" aria-label="Puntajes">
                {PUNTAJES.map((p) => <Puntaje key={p.clave} texto={p.texto} valor={entrevista.puntajes[p.clave]} />)}
              </ul>
            </>
          ) : null}
        </Seccion>
      ) : (
        <p className={`${TARJETA_FICHA} text-[13px] text-gray-600`}>El resumen y los puntajes de la IA aparecen al terminar la entrevista.</p>
      )}
      {preguntasSinRespuesta.length ? <SinRespuesta lista={preguntasSinRespuesta} ahora={ahora} enlace={enlaceConocimiento} /> : null}
    </div>
  );
}

const TONO_REQ = { verde: "border-emerald-200 bg-emerald-50 text-emerald-900", rojo: "border-red-200 bg-red-50 text-red-900", gris: "border-gray-200 bg-gray-50 text-gray-800" };
const PUNTO_REQ = { verde: "bg-emerald-100 text-emerald-800", rojo: "bg-red-100 text-red-700", gris: "bg-gray-200 text-gray-700" };

// Requisitos de la vacante evaluados por el servidor (sin IA). Solo informa: RH decide.
function Requisitos({ requisitos }) {
  const resumen = resumenRequisitos(requisitos);
  if (!resumen) return null;
  return (
    <Seccion titulo="Requisitos de la vacante">
      <div role={resumen.tono === "rojo" ? "alert" : "status"} data-requisitos={resumen.tono} className={`grid gap-1 rounded-xl border p-3 text-[13px] ${TONO_REQ[resumen.tono]}`}>
        <p className="flex items-start gap-1.5 font-semibold"><ClipboardCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {resumen.titulo}</p>
        {resumen.ayuda ? <p>{resumen.ayuda}</p> : null}
      </div>
      <ul className="grid gap-2" aria-label="Requisitos">
        {requisitos.resultados.map((r) => {
          const e = etiquetaEstadoRequisito(r.estado);
          return (
            <li key={r.tipo} className="flex gap-2 text-[13px]" data-requisito={r.tipo} data-estado={r.estado}>
              <span aria-hidden="true" className={`grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-bold ${PUNTO_REQ[e.tono]}`}>{e.simbolo}</span>
              <span className="min-w-0">
                <span className="block font-semibold text-gray-900">{r.etiqueta} · <span className="font-medium">{e.texto}</span></span>
                <span className="block text-gray-600 [overflow-wrap:anywhere]">{r.detalle}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </Seccion>
  );
}

function SinRespuesta({ lista, ahora, enlace }) {
  return (
    <Seccion titulo="Preguntas que el agente no supo contestar">
      <ul className="grid gap-1.5" aria-label="Preguntas sin respuesta">
        {lista.map((p, i) => (
          <li key={i} className="flex gap-2 rounded-lg bg-amber-50 p-2 text-[13px] text-amber-950">
            <HelpCircle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
            <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{p.pregunta}</span>
            {p.resuelta ? <span className="shrink-0 rounded-full bg-emerald-100 px-2 text-[13px] font-semibold text-emerald-800">Resuelta</span>
              : p.creado_en ? <span className="shrink-0 text-[13px] text-amber-800">{tiempoRelativo(p.creado_en, ahora)}</span> : null}
          </li>
        ))}
      </ul>
      {enlace && lista.some((p) => !p.resuelta) ? (
        <Link href={enlace} scroll={false} className="inline-flex min-h-11 items-center text-[13px] font-semibold text-emerald-800 underline underline-offset-2 lg:min-h-0">
          Responder en la base de conocimiento
        </Link>
      ) : (
        <p className="text-[13px] text-gray-500">Respóndelas en «⋮ → Base de conocimiento» para que la próxima vez conteste solo.</p>
      )}
    </Seccion>
  );
}
