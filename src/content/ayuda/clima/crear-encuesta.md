---
titulo: Cómo crear una encuesta de clima
resumen: Empieza con una plantilla profesional, en blanco o con Adamia AI, y edita secciones y preguntas antes de lanzarla.
modulo: clima
audiencia: [rh, dueno]
pantallas: [/panel/clima/encuestas, /panel/clima/encuestas/editor]
palabras: [crear encuesta, plantilla, editor, preguntas, escala, enps, sí o no, vista previa, adamia ai, pulso mensual]
orden: 10
actualizado: 2026-11-27
fuentes: [src/components/clima/Encuestas.jsx, src/components/clima/Editor.jsx, src/components/clima/IaEncuesta.jsx, src/lib/clima/modelo.mjs]
---

## Para qué sirve

Aquí preparas las preguntas de una encuesta de clima. Puedes partir de una plantilla profesional (gratis y editable), de una encuesta en blanco o pedirle a Adamia AI que la arme a partir de lo que quieres medir. Lo que edites se guarda solo como **borrador**: nadie la recibe hasta que la lances.

## Quién la usa

RH y el dueño, desde el panel.

## Antes de empezar

- Entra a **Clima y NOM-035 › Encuestas y plantillas**.
- Para usar «Créala con Adamia AI» y la revisión de preguntas, Adamia AI debe estar activa en tu empresa. Si no lo está, verás el aviso «Adamia AI no está activa en tu empresa. El dueño la enciende desde el botón «Adamia AI»».

## Cómo empezar con una plantilla profesional

1. En la sección **Plantillas profesionales** revisa las tarjetas. Cada una dice su categoría, cuántas preguntas tiene, cuántos minutos toma y cuántas preguntas abiertas trae.
2. Presiona **Usar plantilla** en la que te sirva. ADAMIA hace una copia para tu empresa y abre el editor.
3. Cambia lo que quieras: la plantilla original nunca cambia, solo tu copia.

![Pantalla Encuestas y plantillas con la caja Créala con Adamia AI y las tarjetas de plantillas](/ayuda/capturas/clima/plantillas.webp "Encuestas y plantillas: Adamia AI arriba y las plantillas profesionales")

Las plantillas que trae ADAMIA son:

| Plantilla | Categoría | Para qué |
|---|---|---|
| Clima general | Clima | eNPS y 8 dimensiones: liderazgo, comunicación, reconocimiento, carga, crecimiento, ambiente, herramientas y pertenencia. |
| Compromiso y ganas de quedarse | Retención | Detecta el riesgo de que la gente se vaya y por qué. |
| Evaluación del jefe directo | Liderazgo | El equipo califica a su jefe: trato, claridad, apoyo y justicia. |
| Pulso mensual | Pulso | 5 preguntas que se repiten cada mes para ver la tendencia. |
| NOM-035 · riesgo psicosocial | Obligatoria | El cuestionario oficial. Tiene su propio camino: ver [Aplicar la NOM-035](/ayuda/clima/nom-035). |

> **Consejo:** La tarjeta de NOM-035 te dice qué guía te toca según tus trabajadores activos: Guía I (hasta 15), Guía II (16 a 50) o Guía III (más de 50).

## Cómo empezar en blanco

1. En la tarjeta **Empezar en blanco** presiona **Encuesta en blanco**.
2. Se crea una encuesta llamada «Encuesta nueva» y se abre el editor para que agregues tus secciones y preguntas.

## Cómo crearla con Adamia AI

1. En la caja **Créala con Adamia AI**, escribe en **Qué quieres medir** lo que te preocupa. Por ejemplo: «Tenemos mucha rotación en las sucursales y quiero saber por qué se van los cajeros nuevos».
2. Si no sabes por dónde empezar, toca una idea: **¿Por qué se va la gente?**, **¿Cómo están mis jefes?**, **Después de un cambio de horarios** o **Primeros 90 días del nuevo ingreso**.
3. Presiona **Armar encuesta**. El botón se activa cuando escribiste al menos 10 letras.
4. Adamia AI arma las secciones y preguntas, las guarda como una plantilla tuya y abre el editor con el aviso «Adamia AI armó N preguntas en N secciones».
5. Revisa todo: puedes cambiar, quitar o agregar lo que quieras.

Debajo de la caja ves cuánto llevas usado de Adamia AI o tu saldo de créditos.

## Cómo editar las preguntas

![Editor de la encuesta con secciones, preguntas y el panel de privacidad](/ayuda/capturas/clima/editor.webp "Editor: secciones a la izquierda, resumen y privacidad a la derecha")

1. Escribe el **Nombre de la encuesta** (hasta 160 letras). Es el nombre que verá tu gente.
2. En cada sección cambia el título (hasta 120 letras).
3. En cada pregunta:
   - Escribe el texto (hasta 300 letras).
   - Elige el tipo de respuesta.
   - Si la encuesta tiene dimensiones, elige a qué **dimensión** pertenece o «Sin dimensión».
   - Usa las flechas para subirla o bajarla y el bote de basura para quitarla.
4. Presiona **+ Pregunta** para agregar una pregunta a esa sección, o **+ Sección** para crear otra sección.

Los tipos de pregunta son:

| Tipo | Cómo contesta tu gente | ¿Cuenta para el % favorable? |
|---|---|---|
| Escala 1–5 | De «Totalmente en desacuerdo» a «Totalmente de acuerdo». | Sí: 4 y 5 son favorables, 3 neutral, 1 y 2 desfavorables. |
| Sí / No | Sí o No. | Sí: «Sí» es favorable. |
| eNPS 0–10 | Del 0 (nada probable) al 10 (muy probable) que recomiende trabajar aquí. | No: se calcula aparte como eNPS. |
| Opción | Elige una de entre 2 y 10 opciones que tú escribes. | No. |
| Abierta | Escribe un comentario (opcional, hasta 1,000 letras). | No: sale en comentarios. |

En las preguntas de **Opción** usa **+ Opción** para agregar (máximo 10). No puedes dejar menos de 2.

### Cómo se guarda

Junto al enlace «‹ Plantillas» ves el estado: **Cambios sin guardar**, **Guardando…**, **Borrador guardado** o **No se guardó**. El editor guarda solo, un segundo después de que dejas de escribir.

## Cómo revisar tus preguntas con Adamia AI

1. En el panel de la derecha, **Revisión de Adamia AI**, presiona **Revisar preguntas**.
2. Adamia AI marca las preguntas que **influyen en la respuesta**, **preguntan dos cosas** o **podrían identificar a alguien**, y te dice cuánto dura la encuesta.
3. En cada pregunta marcada verás su explicación y una propuesta. Presiona **Usar propuesta** para cambiar el texto, o **Dejar como está**.
4. Si quieres más ideas, presiona **Pedir 3 preguntas más a Adamia AI**. Se agregan al final de la última sección que no sea solo de preguntas abiertas.

![Editor con la revisión de Adamia AI marcando una pregunta y su propuesta](/ayuda/capturas/clima/editor-revision-ia.webp "Revisión de Adamia AI con propuesta de redacción")

## Cómo ver la vista previa

Presiona **Vista previa**. Se abre la encuesta tal como la ve tu gente en el celular: una pregunta por pantalla. No se guarda nada de lo que contestes ahí.

## Cómo pasar a lanzarla

Presiona **Siguiente: lanzar →**. ADAMIA guarda tus últimos cambios, crea la encuesta en borrador y te lleva a elegir quién la contesta. Sigue en [Cómo lanzar una encuesta](/ayuda/clima/lanzar-encuesta).

## Preguntas frecuentes

### ¿Dónde quedan las plantillas que ya edité?

En la sección **Tus plantillas** de **Encuestas y plantillas**. Las que vienen de una plantilla profesional dicen de cuál («de «Clima general»»); las tuyas dicen **propia**. Con **Editar y lanzar** vuelves al editor.

### ¿Puedo usar la misma plantilla varias veces?

Sí. Cada vez que presionas **Siguiente: lanzar →** se crea una encuesta nueva con las preguntas de ese momento. Al repetir la misma plantilla, el tablero compara una medición contra la anterior.

### ¿Cuántas preguntas puede tener?

Hasta 60 preguntas en hasta 12 secciones. Una encuesta más corta se contesta más y mejor.

### ¿Qué hace la «dimensión» de una pregunta?

Agrupa preguntas del mismo tema (por ejemplo, Liderazgo) para que el tablero te muestre el % favorable de ese tema y lo compare contra la empresa y contra la medición anterior.

## Qué pasa si…

### …presiono «Siguiente: lanzar →» sin preguntas

Sale el aviso «Agrega al menos una pregunta.» y no avanza.

### …alguien más edita la misma plantilla al mismo tiempo

Al guardar sale el mensaje «Alguien más guardó esta encuesta. Recarga para ver los cambios.» y el estado cambia a **No se guardó**. Recarga la página y vuelve a hacer tus cambios.

### …el botón «Armar encuesta» está gris

Adamia AI no está activa en tu empresa o escribiste menos de 10 letras.

### …me quedo sin créditos de Adamia AI

Aparece el aviso «Te quedaste sin créditos de Adamia AI» con el botón **Recargar créditos**. Lo que ya hiciste no se pierde.

## Relacionado

- [Cómo lanzar una encuesta](/ayuda/clima/lanzar-encuesta)
- [Qué es anónimo y qué no](/ayuda/clima/anonimato)
- [Qué es Adamia AI](/ayuda/adamia-ai/que-es-adamia-ai)
