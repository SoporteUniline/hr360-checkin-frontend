"use client";

// Cita fija arriba del hilo (chat todo-en-uno): fecha, hora, lugar o enlace y estado, con Agendar (si no hay) · Mover ·
// Cancelar · Asistió / No asistió · Confirmar y «Ofrecer horarios». Reusa el selector de horarios y el diálogo de
// cancelación de citas.jsx. Cada acción avisa con `onCambio(accion, respuesta)` para pintar la línea de sistema y refrescar.
// En teléfono las acciones se pliegan detrás de «Acciones» para no quitarle alto al chat.
// Bandeja estilo WhatsApp Web: vive como tarjeta «Entrevista» de la ficha del candidato (`enFicha`, acciones siempre a la
// vista). El diálogo de agendar se puede controlar desde fuera (`dialogo`/`onDialogo`) para abrirlo desde el encabezado
// del chat o el menú «Acciones» aunque la ficha esté cerrada.
import { useState } from "react";
import { CalendarCheck2, CalendarClock, CalendarPlus, CalendarX2, Check, ChevronDown, ExternalLink, MapPin, Send, UserCheck, UserX, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { accionesCita, etiquetaEstadoCita, fechaHoraCorta } from "@/lib/whatsapp/agenda.mjs";
import { mensajeErrorApi } from "@/lib/whatsapp/reglas.mjs";
import { ChipEstadoCita, DialogoCancelar, DialogoHorario } from "./citas";
import { cancelarCita, confirmarCita, crearCita, marcarAsistencia, reagendarCita } from "./api";

const esEnlace = (t) => /^https:\/\//i.test(String(t ?? "").trim());
const BOTON = "min-h-11 bg-white md:min-h-8";

function Lugar({ cita }) {
  const lugar = String(cita?.lugar ?? "").trim();
  if (!lugar) return null;
  const video = cita?.modalidad === "video" || esEnlace(lugar);
  return (
    <p className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-gray-700">
      {video ? <Video className="size-4 shrink-0 text-blue-600" aria-hidden="true" /> : <MapPin className="size-4 shrink-0 text-gray-500" aria-hidden="true" />}
      {esEnlace(lugar) ? (
        <a href={lugar} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 items-center gap-1 font-medium text-blue-700 underline underline-offset-2">
          <span className="truncate">{lugar}</span><ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
        </a>
      ) : <span className="min-w-0 truncate" title={lugar}>{lugar}</span>}
    </p>
  );
}

export default function CitaChat({ conversacion, activa, ultima, hoy, onCambio, ofrecer, enFicha = false, dialogo: dialogoExterno, onDialogo }) {
  const [dialogoPropio, setDialogoPropio] = useState(""); // agendar | mover | cancelar
  const controlado = typeof onDialogo === "function";
  const dialogo = controlado ? dialogoExterno || "" : dialogoPropio;
  const setDialogo = controlado ? onDialogo : setDialogoPropio;
  const [ocupado, setOcupado] = useState("");
  const [aviso, setAviso] = useState("");
  const [abierta, setAbierta] = useState(false);
  const idVacante = conversacion?.vacante?.id_vacante;
  if (!conversacion || (!idVacante && !activa && !ultima)) return null;
  const cita = activa;
  const a = accionesCita(cita, hoy);
  const correr = async (accion, fn) => {
    setOcupado(accion);
    setAviso("");
    try {
      const r = await fn();
      await onCambio?.(accion, r, cita);
    } catch (e) {
      setAviso(mensajeErrorApi(e, "No se pudo actualizar la cita."));
    } finally {
      setOcupado("");
    }
  };
  const botonOfrecer = ofrecer?.disponible ? (
    <Button type="button" size="sm" variant="outline" onClick={ofrecer.onOfrecer} loading={ofrecer.cargando} disabled={!!ocupado} className={BOTON}
      startIcon={<Send className="size-4 text-emerald-600" />}>Ofrecer horarios</Button>
  ) : null;
  const descripcion = `${conversacion.contacto?.nombre || "Candidato"} · ${conversacion.vacante?.titulo || "vacante"}`;

  return (
    <section aria-label="Cita de entrevista" data-cita-chat={cita ? cita.estado : "ninguna"} className={enFicha ? "bg-white px-5 py-4" : "border-b border-gray-200 bg-white px-3 py-2 md:px-4"}>
      {enFicha ? <h3 className="mb-2 text-[13px] text-[#54656F]">Entrevista</h3> : null}
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${cita ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"}`} aria-hidden="true">
          {cita ? <CalendarCheck2 className="size-5" /> : <CalendarClock className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          {cita ? (
            <>
              <p className="flex min-w-0 items-center gap-2">
                <span className="truncate text-[13.5px] font-bold text-gray-900 first-letter:uppercase" data-cita-cuando>{fechaHoraCorta(cita.inicio)}</span>
                <ChipEstadoCita estado={cita.estado} />
              </p>
              <Lugar cita={cita} />
            </>
          ) : (
            <>
              <p className="text-[13.5px] font-semibold text-gray-800">Sin entrevista agendada</p>
              <p className="truncate text-[12px] text-gray-500">
                {ultima ? `Última: ${etiquetaEstadoCita(ultima.estado).texto} · ${fechaHoraCorta(ultima.inicio)}` : idVacante ? "Agéndala tú o envíale horarios para que elija." : "Sin vacante: no se puede agendar."}
              </p>
            </>
          )}
        </div>
        {!enFicha ? (
          <button type="button" onClick={() => setAbierta((v) => !v)} aria-expanded={abierta} aria-controls="acciones-cita-chat"
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-gray-300 px-2.5 text-[13px] font-semibold text-gray-700 md:hidden">
            Acciones <ChevronDown className={`size-4 transition-transform ${abierta ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div id="acciones-cita-chat" className={`mt-2 flex flex-wrap gap-1.5 ${abierta || enFicha ? "" : "max-md:hidden"}`} role="group" aria-label="Acciones de la cita">
        {cita ? (
          <>
            {a.confirmar ? (
              <Button type="button" size="sm" variant="outline" onClick={() => correr("confirmar", () => confirmarCita(cita.id))} loading={ocupado === "confirmar"} disabled={!!ocupado}
                className={BOTON} startIcon={<Check className="size-4 text-emerald-600" />}>Confirmar</Button>
            ) : null}
            {a.asistencia ? (
              <>
                <Button type="button" size="sm" variant="outline" onClick={() => correr("asistio", () => marcarAsistencia(cita.id, true))} loading={ocupado === "asistio"} disabled={!!ocupado}
                  className={BOTON} startIcon={<UserCheck className="size-4 text-emerald-600" />}>Asistió</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => correr("no_asistio", () => marcarAsistencia(cita.id, false))} loading={ocupado === "no_asistio"} disabled={!!ocupado}
                  className={BOTON} startIcon={<UserX className="size-4 text-red-600" />}>No asistió</Button>
              </>
            ) : null}
            {a.reagendar ? (
              <Button type="button" size="sm" variant="outline" onClick={() => setDialogo("mover")} disabled={!!ocupado} className={BOTON}
                startIcon={<CalendarClock className="size-4 text-blue-600" />}>Mover</Button>
            ) : null}
            {a.cancelar ? (
              <Button type="button" size="sm" variant="outline" onClick={() => setDialogo("cancelar")} disabled={!!ocupado} className={`${BOTON} text-red-700 hover:text-red-800`}
                startIcon={<CalendarX2 className="size-4" />}>Cancelar</Button>
            ) : null}
          </>
        ) : idVacante ? (
          <>
            <Button type="button" size="sm" variant="outline" onClick={() => setDialogo("agendar")} className={BOTON}
              startIcon={<CalendarPlus className="size-4 text-blue-600" />}>Agendar</Button>
            {botonOfrecer}
          </>
        ) : null}
      </div>
      {aviso ? <p role="alert" className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-[12.5px] text-red-800">{aviso}</p> : null}
      {idVacante ? (
        <DialogoHorario abierto={dialogo === "agendar" || dialogo === "mover"} onCambiar={(v) => { if (!v) setDialogo(""); }} hoy={hoy} idVacante={cita?.vacante?.id_vacante ?? idVacante}
          tituloVacante={conversacion.vacante?.titulo || ""} idEmpresa={conversacion.id_empresa ?? null}
          titulo={dialogo === "mover" ? "Mover entrevista" : "Agendar entrevista"} textoBoton={dialogo === "mover" ? "Mover" : "Agendar"}
          descripcion={dialogo === "mover" && cita ? `${descripcion}. Ahora: ${fechaHoraCorta(cita.inicio)}. El agente le avisa del cambio por WhatsApp.` : `${descripcion}. El agente le manda al candidato la confirmación por WhatsApp.`}
          onConfirmar={async (inicio) => {
            const mover = dialogo === "mover" && cita;
            const r = mover ? await reagendarCita(cita.id, inicio) : await crearCita({ id_conversacion: conversacion.id, id_vacante: idVacante, inicio });
            await onCambio?.(mover ? "mover" : "agendar", r, cita);
          }} />
      ) : null}
      {cita ? (
        <DialogoCancelar abierto={dialogo === "cancelar"} onCambiar={(v) => { if (!v) setDialogo(""); }} cita={{ ...cita, candidato: cita.candidato ?? { nombre: conversacion.contacto?.nombre } }}
          onConfirmar={async (motivo) => { const r = await cancelarCita(cita.id, motivo); await onCambio?.("cancelar", r, cita); }} />
      ) : null}
    </section>
  );
}
