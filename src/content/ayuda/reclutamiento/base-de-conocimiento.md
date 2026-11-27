---
titulo: Base de conocimiento del agente
resumen: Responde una sola vez las preguntas que el agente no supo contestar y administra las respuestas aprobadas que usa para resolver dudas de los candidatos.
modulo: reclutamiento
audiencia: [rh, dueno]
pantallas: [/panel/whatsapp]
palabras: [base de conocimiento, preguntas sin respuesta, respuestas frecuentes, agente, aprobar respuesta, borrador, importar]
orden: 90
actualizado: 2026-11-27
fuentes: [src/components/whatsapp/BaseConocimiento.jsx, src/components/whatsapp/PanelCandidato.jsx, src/components/whatsapp/ConfigurarAgente.jsx, src/lib/whatsapp/conocimiento.mjs]
---

## Para qué sirve

El agente contesta las dudas de los candidatos **solo** con los datos de la vacante, tus respuestas frecuentes y las entradas **aprobadas** de la base de conocimiento. Cuando no sabe algo, lo apunta aquí para que lo respondas una sola vez: la próxima vez contesta solo.

## Quién la usa

RH y el dueño.

## Antes de empezar

Entra a **Conversaciones (WhatsApp)**, abre el menú **⋮** y elige **Base de conocimiento**.

![Base de conocimiento con preguntas sin respuesta y entradas aprobadas](/ayuda/capturas/reclutamiento/base-de-conocimiento.webp "Base de conocimiento")

## Cómo responder una pregunta que el agente no supo contestar

1. Arriba están las **Preguntas sin respuesta**, con la vacante y el candidato que preguntó. Con su nombre abres el chat.
2. Presiona **Responder**.
3. Puedes redactar mejor la **Pregunta** (así la buscará el agente).
4. Escribe la **Respuesta del agente** tal como quieres que la dé.
5. En **¿Para quién aplica?** elige **Solo la vacante** de esa pregunta o **Todas las vacantes de la empresa**.
6. Presiona **Guardar respuesta**. Queda aprobada: «Respuesta guardada: el agente ya la usa».

Si la pregunta no tiene sentido o está repetida, presiona **Descartar**.

## Cómo crear o editar entradas

1. Presiona **Nueva entrada**.
2. Escribe la **Pregunta** (por ejemplo, «¿Dan uniforme?») y la **Respuesta del agente**.
3. En **Aplica a** elige toda la empresa o una vacante.
4. Elige el **Estado**: **Aprobadas** (el agente la usa) o **Borradores** (el agente no la usa).
5. Guarda.

Usa el buscador y el filtro de estado para encontrar entradas. Edita o elimina cada una con sus botones.

## Cómo importar tus respuestas frecuentes

Si ya escribiste **Respuestas frecuentes** en **Configurar agente**, presiona **Importar respuestas frecuentes** (aparece cuando hay preguntas reconocibles) para convertirlas en entradas. Se importan como **borradores** («Se importaron N entradas como borrador. Revísalas y apruébalas.»). El texto original no se borra y el agente lo sigue usando.

## Preguntas frecuentes

### ¿El agente usa los borradores?

No. Solo las entradas aprobadas.

### ¿Una respuesta de una vacante sirve para otra?

Solo si eliges **Todas las vacantes de la empresa**. Las de una vacante se usan solo en esa vacante.

### ¿Hay límite?

El agente lee hasta 60 entradas aprobadas por conversación. Escribe respuestas cortas y claras.

## Qué pasa si…

### …dos personas responden la misma pregunta

La segunda verá que ya estaba resuelta. No se duplica.

### …elimino una entrada

Las preguntas que resolvió siguen resueltas; el agente ya no la usa.

## Relacionado

- [El agente de WhatsApp](/ayuda/reclutamiento/agente-de-whatsapp)
- [Conversaciones de WhatsApp](/ayuda/reclutamiento/conversaciones-de-whatsapp)
- [Entrevista y requisitos](/ayuda/reclutamiento/entrevista-y-requisitos)
