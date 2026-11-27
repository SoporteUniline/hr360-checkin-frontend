---
titulo: Candidatos y proceso de selección
resumen: Revisa el expediente de cada candidato de la página o de WhatsApp, deja notas, muévelo por etapas en el tablero de selección y descártalo con motivo.
modulo: reclutamiento
audiencia: [rh, dueno]
pantallas: [/panel/reclutamiento/candidatos, /panel/reclutamiento/seleccion]
palabras: [candidatos, expediente, etapas, selección, tablero, nuevo, en revisión, entrevista, oferta, descartar, notas, sugerencia del agente, descargar candidatos]
orden: 40
actualizado: 2026-11-27
fuentes: [src/components/reclutamiento/CandidatesView.jsx, src/components/reclutamiento/CandidatePanel.jsx, src/components/reclutamiento/SelectionBoard.jsx, src/components/reclutamiento/ProcesoWhatsapp.jsx, src/components/reclutamiento/RecruitmentModule.jsx, src/lib/reclutamiento/model.js, src/lib/reclutamiento/adaptador.mjs]
---

## Para qué sirve

Todas las personas que se postulan por la página de la vacante o que aceptan el aviso de privacidad por WhatsApp llegan a **Candidatos**. Ahí revisas su expediente y en **Selección** las mueves por etapas hasta contratarlas o descartarlas.

## Quién la usa

RH y el dueño. Todo tu equipo ve los mismos candidatos, notas e historial.

## Antes de empezar

Entra a **Reclutamiento y selección › Candidatos** o **› Selección**.

Las etapas son:

| Etapa | Para qué |
|---|---|
| Nuevo | Acaba de llegar. |
| En revisión | Lo estás evaluando. |
| Entrevista | Tiene o tendrá entrevista. |
| Oferta | Le ofreciste el puesto. Desde aquí se contrata. |
| Contratado | Ya tiene ficha de empleado. Solo se llega con **Contratar**. |
| Descartado | Ya no sigue en el proceso. Se puede regresar. |

## Cómo buscar candidatos

En **Candidatos** filtra por periodo (todas las fechas, últimos 7, 30 o 90 días), por etapa, por vacante, ordena (más recientes, más antiguos o nombre A–Z) y busca por nombre, correo o vacante. Con **Descargar** bajas la lista en un archivo CSV.

La columna de origen te dice si llegó por **Página de empleo**, por **WhatsApp** o por ambos.

![Lista de candidatos con filtros y etapas](/ayuda/capturas/reclutamiento/candidatos.webp "Candidatos")

## Cómo revisar el expediente

Abre a un candidato. El expediente tiene tres pestañas:

- **Respuestas**: sus datos de contacto, las respuestas al formulario de la vacante y si mandó currículum. Si llegó por WhatsApp, verás además la **Entrevista del agente por WhatsApp**: calificación, resumen, puntajes (Comunicación, Actitud, Experiencia, Confiabilidad y Disponibilidad) y sus respuestas.
- **Seguimiento**: **Notas del equipo** (internas, el candidato no las ve), sus **Entrevistas** y el **Historial del proceso**.
- **Contratar**: ver [Contratar a un candidato](/ayuda/reclutamiento/contratar).

![Expediente de un candidato con etapa, respuestas y notas](/ayuda/capturas/reclutamiento/expediente.webp "Expediente del candidato")

### Cómo agregar una nota

En **Seguimiento**, escribe en **Agregar una nota** (por ejemplo, «Buen manejo de herramientas administrativas…») y guárdala. Los cambios los ve todo tu equipo. Si intentas salir con una nota sin guardar, te avisa.

## Cómo cambiar la etapa

- En el expediente, usa **Etapa del proceso**.
- En **Selección**, arrastra la tarjeta a otra columna (en celular, elige la etapa en el selector de la tarjeta). Filtra por vacante o busca por nombre.

El cambio se ve al instante. Cambiar de etapa no le manda correos al candidato.

### Sugerencia del agente

En candidatos de WhatsApp puede aparecer «El agente sugiere pasar a «Entrevista»» con su motivo (por ejemplo, porque ya agendó su entrevista). Presiona **Pasar a Entrevista** para aceptarla con un clic.

### Avisarle por WhatsApp

Si el candidato llegó por WhatsApp, al pasarlo a Oferta, descartarlo o contratarlo aparece **Avisarle por WhatsApp** con un mensaje que puedes editar. Solo se manda al presionar **Enviar aviso**. Si pasaron más de 24 horas desde su último mensaje, WhatsApp solo permite mandarle la plantilla de seguimiento (**Enviar plantilla**).

## Cómo descartar

1. Elige la etapa **Descartado** (o usa **Descartar** desde el chat).
2. Escribe un **Motivo (opcional)**: solo lo ve tu equipo y queda en el historial.
3. Presiona **Descartar**.

En candidatos de WhatsApp, además el agente deja de entrevistarlo; si vuelve a escribir, la conversación te pedirá atención. Para regresarlo, elige otra etapa.

## Candidatos de WhatsApp que aún no aceptan el aviso

Se ven en solo lectura: «Aún no acepta el aviso de privacidad; su conversación sigue en la bandeja de WhatsApp». Cuando lo acepta entra al proceso como **Nuevo**. Si aceptó pero no tiene proceso, presiona **Iniciar proceso**. Con **Abrir conversación** vas a su chat.

## Preguntas frecuentes

### ¿Puedo mover a alguien a «Contratado» desde el tablero?

No. Contratado solo se alcanza con **Contratar**, porque crea su ficha de empleado. En el tablero aparece **Preparar contratación…**.

### ¿El candidato ve mis notas?

No. Las notas son internas.

## Qué pasa si…

### …no se pudo cambiar la etapa

Verás «No se pudo cambiar la etapa.» y la tarjeta regresa a su lugar. Intenta de nuevo.

### …el candidato ya está contratado

Su etapa ya no se puede cambiar.

### …no veo a un candidato de WhatsApp en Selección

El tablero muestra las postulaciones con proceso. Si aún no acepta el aviso, sigue en la bandeja de WhatsApp.

## Relacionado

- [Contratar a un candidato](/ayuda/reclutamiento/contratar)
- [Conversaciones de WhatsApp](/ayuda/reclutamiento/conversaciones-de-whatsapp)
- [Agenda de entrevistas](/ayuda/reclutamiento/agenda-de-entrevistas)
