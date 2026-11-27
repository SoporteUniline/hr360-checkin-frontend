---
titulo: El agente de WhatsApp que entrevista candidatos
resumen: Qué hace el asistente virtual de reclutamiento por WhatsApp, cómo pide el aviso de privacidad, qué nunca pregunta y cómo configurar su nombre, horario, respuestas y palabras para pasar a una persona.
modulo: reclutamiento
audiencia: [rh, dueno]
pantallas: [/panel/whatsapp]
palabras: [agente de whatsapp, asistente virtual, configurar agente, horario, fuera de horario, respuestas frecuentes, pasar a una persona, aviso de privacidad, entrevista por whatsapp, calificación, lumo]
orden: 60
actualizado: 2026-11-27
fuentes: [src/components/whatsapp/ConfigurarAgente.jsx, src/components/whatsapp/BandejaWhatsapp.jsx, src/components/whatsapp/PanelCandidato.jsx, src/lib/whatsapp/entrevista.mjs, src/lib/whatsapp/paquete.mjs, src/lib/whatsapp/reglas.mjs]
---

## Para qué sirve

El agente es un asistente virtual que contesta por WhatsApp a quienes escriben por una vacante. Platica como un reclutador: pide el aviso de privacidad, el nombre completo, hace las preguntas de filtro de la vacante, resuelve dudas con los datos que tú le diste, califica al candidato y, si lo configuras, le agenda la entrevista. Tú puedes tomar el control de cualquier chat en cualquier momento.

## Quién la usa

RH y el dueño configuran y supervisan. Los candidatos platican con el agente.

## Antes de empezar

- ADAMIA debe activar WhatsApp para tu empresa. Si no lo está, en **Conversaciones (WhatsApp)** verás «WhatsApp aún no está activo para tu empresa».
- Cada vacante necesita su **entrevista** (las preguntas de filtro). Ver [Entrevista y requisitos](/ayuda/reclutamiento/entrevista-y-requisitos).
- Entra a **Reclutamiento y selección › Conversaciones (WhatsApp)**.

## Qué hace el agente, en orden

1. **Saluda y pide el aviso de privacidad** con tres botones: **Acepto**, **Leer aviso** y **No acepto**. Antes de que acepte, ningún mensaje del candidato se manda a la inteligencia artificial.
2. Si no acepta, se despide y se borran su nombre y sus respuestas de esa conversación (los mensajes quedan como registro). Si después escribe «Acepto», sigue.
3. **Pide su nombre completo** y lo valida. Nunca usa el nombre de su perfil de WhatsApp.
4. **Hace las preguntas de filtro** de la vacante, con botones cuando hay pocas opciones.
5. **Contesta dudas** solo con los datos de la vacante, tus respuestas frecuentes y la [base de conocimiento](/ayuda/reclutamiento/base-de-conocimiento). Si no sabe algo, lo apunta para que lo respondas y sigue con la entrevista.
6. **Califica** al candidato: **Califica**, **Con alerta**, **No califica** o **Incompleto**. La calificación la decide el sistema con las reglas de cada pregunta, no la IA.
7. **Agenda la entrevista** si la vacante tiene agenda activa. Ver [Agenda de entrevistas](/ayuda/reclutamiento/agenda-de-entrevistas).
8. Si no califica, cierra con amabilidad y puede sugerirle otra vacante abierta de tu empresa.

> **Importante:** El agente nunca pide CURP, RFC, datos bancarios, pagos ni fotos de identificaciones, no promete la contratación y cita el sueldo tal como está en la vacante.

## Cómo configurar el agente

1. En la bandeja, presiona el botón **Agente encendido** (o **Agente apagado**), o abre **⋮ › Configurar agente**.
2. En la pestaña **Agente**:
   - **Agente encendido**: contesta a los candidatos y les hace las preguntas de la vacante. Apagado, los chats nuevos esperan a que alguien del equipo conteste.
   - **Nombre del asistente**: así se presenta y firma sus mensajes. Ejemplo: «Sofía de Uniline».
   - **Horario**: **Siempre disponible** o elige días y horas. Fuera de ese horario contesta con el **Mensaje fuera de horario**.
   - **Respuestas frecuentes**: lo que el agente puede contestar (horarios, prestaciones, dirección…).
   - **Palabras para pasar a una persona**: si el candidato escribe alguna (por ejemplo «humano», «asesor»), el chat se marca como **Requiere atención**. Enter o coma para agregar.
3. Presiona **Guardar**. La pestaña **Agenda y recordatorios** se guarda por separado.

![Diálogo Configurar agente con encendido, nombre, horario y respuestas frecuentes](/ayuda/capturas/reclutamiento/configurar-agente.webp "Configurar agente")

## Cuándo un chat pide atención

Un chat se marca **Requiere atención** cuando el candidato pide hablar con una persona, cuando el agente no pudo contestar algo, cuando hay una respuesta contradictoria o si la IA falla. Aparece en la franja de arriba de la lista de chats. Lee [Conversaciones de WhatsApp](/ayuda/reclutamiento/conversaciones-de-whatsapp).

> **Ojo:** Marcar «Requiere atención» no calla al agente: sigue contestando. Si quieres que deje de hablar con ese candidato, presiona **Tomar control**.

## Límites del agente

- Máximo 60 respuestas por conversación en una hora. Después le avisa al candidato que una persona lo atenderá y el chat pide atención.
- Si alguien escribe al número sin una vacante, le muestra hasta 6 vacantes abiertas con su ID y el enlace a la bolsa de trabajo.
- Con el agente apagado, o si la vacante no está abierta, no manda nada.
- Tu plan incluye un número de entrevistas del agente al mes. Si se pasa, el agente sigue contestando y un aviso en ámbar te dice que las extra se cobran aparte.

## Preguntas frecuentes

### ¿El candidato sabe que habla con un asistente virtual?

Sí. El primer mensaje se presenta como asistente con el nombre que elegiste.

### ¿Desde qué número sale?

Desde el número compartido de ADAMIA o desde el número propio de tu empresa, según lo que ADAMIA configuró. En el número compartido los mensajes llevan «ADAMIA» al inicio.

### ¿El agente usa créditos de Adamia AI?

No: el agente se cobra por paquetes de entrevistas. Lo que sí usa créditos son las sugerencias de preguntas con IA en el panel.

## Qué pasa si…

### …un candidato rechaza el aviso de privacidad

El agente no continúa y se borran sus datos de esa conversación. Si cambia de opinión, puede escribir «Acepto».

### …el agente no supo contestar una duda

Le dice al candidato que se la pasa a un reclutador y la apunta en **Base de conocimiento**. Respóndela una vez y la próxima vez contesta solo.

### …veo un aviso de fallas del agente

Abre **⋮ › Salud del agente** para ver qué pasó en las últimas 24 horas.

## Relacionado

- [Entrevista y requisitos de la vacante](/ayuda/reclutamiento/entrevista-y-requisitos)
- [Conversaciones de WhatsApp](/ayuda/reclutamiento/conversaciones-de-whatsapp)
- [Base de conocimiento](/ayuda/reclutamiento/base-de-conocimiento)
