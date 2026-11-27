---
titulo: Agenda de entrevistas y recordatorios por WhatsApp
resumen: Configura dónde y cuándo entrevistas, a quién le ofrece horarios el agente y sus recordatorios, y administra las citas en el calendario de Entrevistas.
modulo: reclutamiento
audiencia: [rh, dueno]
pantallas: [/panel/whatsapp, /panel/reclutamiento/entrevistas]
palabras: [agenda de entrevistas, citas, horarios, recordatorios, confirmar asistencia, reagendar, presencial, videollamada, bloqueos, cupo, aprobar para agendar, plantillas de whatsapp]
orden: 100
actualizado: 2026-11-27
fuentes: [src/components/whatsapp/AgendaVacante.jsx, src/components/whatsapp/AgendaEmpresa.jsx, src/components/whatsapp/Entrevistas.jsx, src/components/whatsapp/CitaChat.jsx, src/components/whatsapp/PanelCandidato.jsx, src/lib/whatsapp/agenda.mjs, src/components/reclutamiento/navigation.js]
---

## Para qué sirve

Con la agenda, el agente de WhatsApp le ofrece al candidato horarios libres de entrevista, se la agenda, se la recuerda y deja que la confirme, la cambie o la cancele. Tú ves todas las citas en un calendario y puedes moverlas.

## Quién la usa

RH y el dueño.

## Antes de empezar

Hay dos niveles de configuración:

- **De la empresa**: en **Conversaciones (WhatsApp) › Configurar agente › Agenda y recordatorios**. Aplica a todas las vacantes.
- **De cada vacante**: en **⋮ › Enlaces de vacantes › Agenda**. Dónde, cuándo y cuántos; y si quieres, reglas propias.

## Cómo configurar la agenda de la empresa

1. **¿A quién le ofrece horarios el agente?** Elige una:
   - **Solo a quien califica**: los que tienen alguna alerta esperan a que tú los apruebes.
   - **A quien califica o tiene alerta**: revisas las alertas antes de la entrevista.
   - **Tú apruebas cada cita**: nadie recibe horarios hasta que presionas **Aprobar para agendar** en su conversación.
2. **Cuándo se puede agendar**: **Anticipación mínima (horas)** (por ejemplo, 2 = no agenda citas que empiecen en menos de 2 h), **Días hacia adelante** y **Horarios a ofrecer** (cuántas opciones le da, por ejemplo 3).
3. **Recordatorios por WhatsApp**: cuánto antes de la cita le escribe (en horas o minutos antes), hasta 5.
4. Marca si quieres **Pedir que confirme su asistencia**, **Dejar que cambie o cancele su cita por WhatsApp** y **Ofrecer otras vacantes si no califica**.
5. **Plantillas de WhatsApp**: pasadas 24 h desde el último mensaje del candidato, WhatsApp solo permite escribirle con una plantilla aprobada. Escribe aquí el nombre de tu **Plantilla de recordatorio** y tu **Plantilla de seguimiento** y su idioma.
6. **Mensajes del agente**: personaliza lo que dice con marcadores (nombre del candidato, empresa, vacante, fecha, hora, dirección, enlace de video, qué llevar, entrevistador). Usa **Insertar marcador**, revisa la **Vista previa** y, si te equivocas, **Restaurar texto original**. Vacío = el agente usa el texto original.
7. Presiona **Guardar agenda**.

## Cómo configurar la agenda de una vacante

1. En **Enlaces de vacantes** presiona **Agenda** en la vacante.
2. Enciende **Agenda activa**. Apagada, el agente entrevista pero no ofrece horarios; tú agendas a mano desde la conversación.
3. **Dónde y con quién**: **Modalidad** **Presencial** (dirección y referencia) o **Videollamada** (enlace de Meet, Zoom o Teams, que el agente manda al confirmar), **Entrevistador** y **Qué llevar** (por ejemplo, INE, CV impreso y pluma).
4. **Duración y cupo**: duración de cada entrevista en minutos y **Personas por horario** (1 = entrevista individual).
5. **Horario semanal**: varios horarios por día (por ejemplo, 9:00 a 13:00 y 15:00 a 18:00). **Copiar a todos** copia un día a los demás.
6. **Bloqueos**: fechas y horas en que no se agenda (festivos, juntas, vacaciones) con su motivo.
7. **Reglas de esta vacante**: si no cambias nada, se usan las de la empresa («Usar el de la empresa»).
8. Presiona **Guardar agenda**. Abajo, **Vista previa: horarios de los próximos 7 días** muestra cada horario con su cupo y cuántos están ocupados.

![Agenda de una vacante con horario semanal, cupo y vista previa](/ayuda/capturas/reclutamiento/agenda-vacante.webp "Agenda de entrevistas de la vacante")

## Cómo ver y mover las citas

1. Entra a **Reclutamiento y selección › Entrevistas** (o **Entrevistas** en la bandeja).
2. Elige **Semana** o día, y muévete con **Hoy** y las flechas. Filtra por **Vacante** y **Estado**.
3. Al elegir una vacante ves sus **Horarios disponibles**; presiona **Agendar aquí** para agendar con un clic.
4. Arrastra una entrevista a un horario disponible para moverla (o ábrela y usa **Mover**).

Los estados de una cita son **Agendada**, **Confirmada**, **Reagendada**, **Cancelada**, **Asistió** y **No asistió**. En la ficha del candidato, la tarjeta **Entrevista** tiene **Confirmar**, **Mover**, **Asistió**, **No asistió** y **Cancelar**.

## Preguntas frecuentes

### ¿El agente puede agendar dos personas a la misma hora?

Solo si **Personas por horario** es mayor que 1. El sistema revisa el cupo antes de reservar.

### ¿Qué pasa si el candidato quiere cambiar su cita?

Si lo permitiste, el agente se la reprograma en otro horario libre y la anterior queda **Reagendada**. También puede cancelarla.

### ¿Los recordatorios llegan aunque el chat esté cerrado?

Sí, si configuraste la plantilla de recordatorio aprobada por WhatsApp.

## Qué pasa si…

### …el agente no ofrece horarios

Revisa que la agenda de la vacante esté **activa**, que haya horarios libres en los próximos días y el modo de **¿A quién le ofrece horarios?**. Si el candidato tiene alertas, quizá espera tu **Aprobar para agendar**.

### …no puedo mover una entrevista

El horario se llenó o ya pasó. La cita regresa a su lugar.

## Relacionado

- [El agente de WhatsApp](/ayuda/reclutamiento/agente-de-whatsapp)
- [Conversaciones de WhatsApp](/ayuda/reclutamiento/conversaciones-de-whatsapp)
- [Candidatos y selección](/ayuda/reclutamiento/candidatos-y-seleccion)
