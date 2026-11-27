---
titulo: Conversaciones de WhatsApp con candidatos
resumen: Usa la bandeja de chats para ver lo que platica el agente, atender los chats que requieren atención, tomar el control, enviar archivos y notas de voz y llevar el proceso desde la ficha del candidato.
modulo: reclutamiento
audiencia: [rh, dueno]
pantallas: [/panel/whatsapp]
palabras: [bandeja de whatsapp, chats, conversaciones, requiere atención, tomar control, devolver a la ia, ficha del candidato, aprobar para agendar, nota de voz, archivo, ventana de 24 horas, plantilla de seguimiento]
orden: 80
actualizado: 2026-11-27
fuentes: [src/components/whatsapp/BandejaWhatsapp.jsx, src/components/whatsapp/ListaConversaciones.jsx, src/components/whatsapp/FranjaAtencion.jsx, src/components/whatsapp/HiloConversacion.jsx, src/components/whatsapp/ComposerChat.jsx, src/components/whatsapp/PanelCandidato.jsx, src/components/whatsapp/ProcesoChat.jsx, src/components/whatsapp/CitaChat.jsx, src/lib/whatsapp/entrevista.mjs, src/lib/whatsapp/reglas.mjs]
---

## Para qué sirve

La bandeja de **Conversaciones (WhatsApp)** funciona como WhatsApp Web: a la izquierda tus chats, en medio la conversación y a la derecha la ficha del candidato. Ves lo que el agente platica, entras cuando hace falta y llevas el proceso de selección sin salir del chat.

## Quién la usa

RH y el dueño. Dentro de la empresa, todos ven todas las conversaciones.

## Antes de empezar

- Entra a **Reclutamiento y selección › Conversaciones (WhatsApp)**.
- Si tu empresa no tiene WhatsApp activo verás «WhatsApp aún no está activo para tu empresa». Mientras tanto puedes usar **Enlaces de vacantes** para compartir las páginas de tus vacantes.

![Bandeja de WhatsApp con la lista de chats y una conversación abierta](/ayuda/capturas/reclutamiento/bandeja.webp "Conversaciones de WhatsApp")

## La lista de chats

- Busca por nombre, teléfono o vacante.
- Filtra con las pastillas: **Todos**, **Atención**, **Califica**, **Con alerta**, **No califica**, **Incompleto** y por **Etapa** del proceso.
- Cada chat muestra la vacante, quién atiende (IA o una persona), el último mensaje (o el motivo de atención) y los mensajes sin leer.
- Abajo ves el número, si el agente está activo o en pausa, y cuántas conversaciones, entrevistas y plantillas llevas en el mes.

### La franja «requiere atención»

Arriba de la lista aparece una franja cuando uno o más candidatos piden hablar con una persona o su entrevista pide atención. Presiona **Ver**: con uno abre su chat; con varios filtra los que necesitan atención. Desaparece al marcar como atendido o al tomar el control.

## Cómo tomar el control de un chat

1. Abre la conversación. Arriba dice **La IA atiende**, **Tú tienes el control** o «Atiende» y el nombre de quien la tomó.
2. Presiona **Tomar control**. Verás «Tomaste el control. La IA deja de responder en este chat.».
3. Escribe en **Escribe un mensaje** y envía.
4. Cuando termines, abre **Acciones** y elige **Devolver a la IA**. Verás «La IA vuelve a atender este chat.».

## Cómo enviar archivos y notas de voz

- Presiona **Adjuntar archivo** o arrastra un archivo sobre el chat. Puedes agregar un comentario.
- Presiona **Grabar nota de voz**, habla y presiona **Detener y enviar** (o **Cancelar grabación**).

### La regla de las 24 horas

WhatsApp solo permite escribir libremente durante 24 horas desde el último mensaje del candidato. Después de eso, el chat dice «Chat cerrado (más de 24 h)» y solo puedes mandar la plantilla aprobada con **Enviar seguimiento**.

## El menú «Acciones» de la conversación

- **Ver ficha del candidato**.
- **Agendar entrevista** o **Ver entrevista agendada**.
- **Ofrecer horarios**: le manda horarios libres de la vacante para que elija. Necesita vacante, la ventana de 24 h abierta y que no tenga ya una cita.
- **Mover etapa del proceso**.
- **Copiar enlace de WhatsApp de la vacante**.
- **Marcar como atendido**: quita la marca de «Requiere atención».
- **Devolver a la IA**.

## La ficha del candidato

Ábrela tocando su nombre o con **Ver ficha**. Tiene tarjetas:

- **El agente**: si requiere atención, si **Espera tu aprobación para agendar** (con el botón **Aprobar para agendar**), el nombre que dio, la sucursal que eligió, la pregunta en curso, sus **Respuestas** (✓ sin problema, ⚠ alerta, ✕ descarta), el **Resumen de la IA** y los **Puntajes (1 a 5)**.
- **Requisitos de la vacante**: cumple, no cumple o falta dato. Solo informan.
- **Preguntas que el agente no supo contestar**: respóndelas en **⋮ › Base de conocimiento**.
- **Proceso de selección**: etapa, sugerencia del agente, notas, **Contratar** y **Descartar**. En escritorio hay atajos: Alt+Mayús+E siguiente etapa, N nota, A aceptar sugerencia, C contratar y D descartar.
- **Entrevista**: la cita con sus acciones (**Confirmar**, **Mover**, **Asistió**, **No asistió**, **Cancelar**) o **Agendar** si no tiene.

![Ficha del candidato con requisitos y respuestas del agente](/ayuda/capturas/reclutamiento/ficha-candidato.webp "Ficha del candidato")

## En el celular

La bandeja se adapta: primero la lista, luego el chat a pantalla completa (con «‹» para regresar) y luego la ficha a pantalla completa. El proceso de selección se abre como hoja desde abajo.

## Preguntas frecuentes

### ¿Cada cuánto se actualiza la bandeja?

Sola: la lista cada pocos segundos y el chat abierto también, mientras la pestaña esté a la vista.

### ¿El candidato ve quién le escribe?

Ve los mensajes desde el mismo número de WhatsApp. Los mensajes del agente van firmados con el nombre del asistente.

### ¿Puedo escribir sin tomar el control?

No. El cuadro dice «Tomar control para escribir» para que la IA y tú no se encimen.

## Qué pasa si…

### …no se pudo enviar un mensaje

Verás «No se pudo enviar el mensaje. Intenta de nuevo.». Si el chat se cerró por las 24 horas, usa **Enviar seguimiento**.

### …«Ofrecer horarios» está gris

Dice el motivo: «Sin vacante», «Chat cerrado (más de 24 h)» o «Ya tiene una cita». También puede ser que la agenda de la vacante esté apagada.

### …otra persona del equipo tomó el chat

Arriba verás «Atiende» y su nombre. Coordínate con esa persona antes de escribir.

## Relacionado

- [El agente de WhatsApp](/ayuda/reclutamiento/agente-de-whatsapp)
- [Agenda de entrevistas](/ayuda/reclutamiento/agenda-de-entrevistas)
- [Candidatos y selección](/ayuda/reclutamiento/candidatos-y-seleccion)
