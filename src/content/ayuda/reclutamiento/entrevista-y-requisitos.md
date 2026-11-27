---
titulo: Entrevista, requisitos y sucursales de una vacante para el agente
resumen: Define las preguntas de filtro que hace el agente por WhatsApp, qué respuestas descartan o alertan, los requisitos del puesto y qué sucursales puede proponer al candidato.
modulo: reclutamiento
audiencia: [rh, dueno]
pantallas: [/panel/whatsapp, /panel/reclutamiento/vacantes]
palabras: [preguntas de filtro, entrevista por whatsapp, descarta, alerta, requisitos, edad, experiencia, escolaridad, turno, zona, sucursal más cercana, ubicar en mapa, sugerir con ia, generar entrevista con ia]
orden: 70
actualizado: 2026-11-27
fuentes: [src/components/whatsapp/EditorEntrevista.jsx, src/components/whatsapp/SugerenciasIA.jsx, src/components/whatsapp/EditorRequisitos.jsx, src/components/whatsapp/SucursalesVacante.jsx, src/components/whatsapp/UbicacionSucursal.jsx, src/components/whatsapp/EnlacesVacantes.jsx, src/lib/whatsapp/entrevista.mjs, src/lib/whatsapp/requisitos.mjs]
---

## Para qué sirve

Cada vacante tiene su propia **entrevista por WhatsApp**: las preguntas que hace el agente y qué respuestas descartan o alertan. También puedes indicar los **requisitos** del puesto (para que veas si cada candidato los cumple) y las **sucursales** que el agente puede proponer.

## Quién la usa

RH y el dueño.

## Antes de empezar

Entra a **Conversaciones (WhatsApp) › ⋮ › Enlaces de vacantes**. Cada vacante abierta tiene los botones **Entrevista**, **Requisitos**, **Agenda** y **Sucursales**. En el detalle de la vacante (Reclutamiento › Vacantes) también encuentras la entrevista.

## Cómo armar la entrevista

1. Presiona **Entrevista** en la vacante. Se abre **Entrevista por WhatsApp**.
2. Presiona **Agregar pregunta (N/20)**.
3. Escribe la pregunta (por ejemplo, «¿Tienes licencia tipo C?») y elige el tipo: **Sí / No**, **Opciones**, **Número**, **Texto libre**, **Fecha (solo informa)** o **Archivo (solo informa)**.
4. Elige el uso:
   - **Filtra**: califica al candidato.
   - **Solo informa**: el agente lo pregunta y lo guarda para que lo leas; no descarta ni alerta. Puedes marcarla **Obligatoria** u opcional.
5. En las que filtran, define las reglas:
   - **Sí / No** y **Opciones**: marca las **Respuestas que descartan** y las **Respuestas que alertan**.
   - **Número**: escribe el **Rango aceptado** (mínimo y máximo). Fuera de ese rango descarta o alerta. Deja vacío el lado que no tenga límite. Ejemplo: edad de 18 sin máximo descarta a menores de edad.
   - **Texto libre**: solo se guarda para que lo leas.
6. Ordena con las flechas y quita con el botón de cada pregunta.
7. Presiona **Guardar entrevista**.

Límites: hasta 8 preguntas que filtran y 20 en total; hasta 10 opciones por pregunta.

Las preguntas de tipo **Archivo** no se piden por chat: el candidato sube el archivo (PDF o foto) en el formulario del enlace que le manda el agente.

> **Consejo:** Al guardar, ADAMIA recalcula la calificación de los candidatos que ya contestaron esa vacante con las reglas nuevas.

### Con ayuda de Adamia AI

- **¿No sabes qué preguntar?** Presiona **Sugerir con IA**: Adamia AI propone preguntas que filtran para esta vacante.
- **Entrevista estructurada:** presiona **Generar entrevista con IA** para que proponga los datos que el agente debe obtener (no califican).

Elige las que quieras; entran como nuevas y sin guardar («Se agregaron N preguntas sugeridas. Revísalas y guarda.»). **Pedir otras** trae más. Adamia AI solo ve los datos de la vacante y cada sugerencia usa créditos.

![Editor de la entrevista por WhatsApp con preguntas que filtran y que solo informan](/ayuda/capturas/reclutamiento/entrevista-editor.webp "Entrevista por WhatsApp de una vacante")

## Cómo poner requisitos

1. Presiona **Requisitos** en la vacante.
2. Presiona **Agregar requisito** y elige: **Edad**, **Experiencia mínima** (años), **Escolaridad mínima**, **Turno** (matutino, vespertino, nocturno, mixto, fin de semana) o **Zona** (municipios, colonias o estados separados por comas).
3. En **De dónde se toma el dato** deja **Automático** o elige la pregunta de la entrevista de la que sale.
4. Cada requisito puede estar **Activo** o **Pausado**.
5. Presiona **Guardar requisitos**.

En la ficha de cada candidato verás **Requisitos de la vacante** con **Cumple**, **No cumple** o **Falta dato**.

> **Importante:** Los requisitos **nunca rechazan** a nadie: son una alerta para que tú decidas. La Ley Federal del Trabajo (art. 133) prohíbe filtrar por edad; solo una norma que lo exija lo permite. Por eso la edad mayor de 18 o cualquier edad máxima pide el **Fundamento legal (obligatorio)** (por ejemplo, «Licencia federal de la SCT exige 21 años»).

![Editor de requisitos de la vacante](/ayuda/capturas/reclutamiento/requisitos.webp "Requisitos: alerta, nunca rechazo")

## Cómo elegir las sucursales que propone el agente

El agente puede proponer al candidato las 3 sucursales más cercanas a la colonia o ciudad que le diga.

1. Presiona **Sucursales** en la vacante.
2. Deja **Todas las sucursales** o, en **O elige cuáles**, marca las que aplican.
3. Presiona **Guardar**. Verás «Guardado. El agente propondrá solo estas sucursales.».

Cada sucursal dice **Ubicada** o **Sin ubicar**. Una sucursal sin ubicar no se puede proponer.

### Cómo ubicar una sucursal

1. Ve a **Catálogos → Unidades de negocio** y edita la sucursal.
2. Escribe el domicilio completo.
3. En **Ubicación en el mapa** presiona **Ubicar en mapa**. Revisa el punto; si hace falta corrige la **Latitud** y la **Longitud**.
4. Presiona **Guardar ubicación**. Verás «Ubicación guardada. El agente ya puede proponer esta sucursal.».

![Ubicación de una sucursal en el mapa](/ayuda/capturas/reclutamiento/ubicar-sucursal.webp "Ubicar la sucursal para proponer la más cercana")

## Preguntas frecuentes

### ¿Qué pasa con la ubicación del candidato?

Solo se guarda el texto de colonia o ciudad que escribió y la sucursal que eligió. No se guardan sus coordenadas.

### ¿Si una respuesta descarta, el agente le dice que fue rechazado?

No. Agradece con amabilidad, cierra y puede sugerirle otra vacante de tu empresa.

### ¿Puedo cambiar las preguntas con candidatos en proceso?

Sí. Las calificaciones se recalculan con las reglas nuevas.

## Qué pasa si…

### …no me deja agregar más preguntas que filtran

Ya tienes 8. Cambia alguna a **Solo informa** o quítala.

### …la vacante no tiene preguntas

Verás «Esta vacante aún no tiene entrevista». El agente igual platica con el candidato, pero sin tus preguntas de filtro: agrégalas para que la calificación refleje lo que pide el puesto.

### …dice que falta configurar el mapa

Mientras tanto puedes escribir la latitud y la longitud a mano (cópialas de Google Maps).

## Relacionado

- [El agente de WhatsApp](/ayuda/reclutamiento/agente-de-whatsapp)
- [Agenda de entrevistas](/ayuda/reclutamiento/agenda-de-entrevistas)
- [Base de conocimiento](/ayuda/reclutamiento/base-de-conocimiento)
