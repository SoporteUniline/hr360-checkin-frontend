---
titulo: Qué es anónimo y qué no en Clima y NOM-035
resumen: Exactamente qué guarda ADAMIA cuando alguien contesta, qué ve RH, qué ve el jefe y en qué casos alguien podría deducir una respuesta.
modulo: clima
audiencia: [rh, dueno, jefe, empleado]
pantallas: [/panel/clima, /empleado/panel/encuestas]
palabras: [anónimo, anonimato, privacidad, confidencial, quién contestó, deducir, guía i, equipo pequeño, datos personales]
orden: 5
actualizado: 2026-11-27
fuentes: [src/components/clima/Editor.jsx, src/components/clima/Contestar.jsx, src/components/clima/Encuestas.jsx, src/components/clima/EquipoClima.jsx, src/components/clima/Tablero.jsx, src/components/clima/IaResultados.jsx, src/components/clima/BuzonPublico.jsx, src/lib/clima/modelo.mjs, src/lib/clima/canales.mjs]
---

## Para qué sirve

Esta guía explica, sin exagerar y sin esconder nada, qué protege ADAMIA cuando alguien contesta una encuesta. Úsala para capacitar a RH y a los jefes, y para resolver las dudas de tu gente.

## Quién la usa

Todos: RH, dueño, jefes y empleados.

## Antes de empezar

Esta guía aplica a las encuestas de **Clima y NOM-035**, a la liga personal de WhatsApp, a «¿Cómo te fue hoy?» y al buzón confidencial. La evaluación de desempeño tiene reglas propias: ahí cada evaluador está ligado a su evaluación.

## Lo que ADAMIA guarda cuando alguien contesta una encuesta de clima

| Se guarda | No se guarda |
|---|---|
| Las respuestas, **sin** el nombre de la persona. | El nombre, el número de empleado o la liga junto a las respuestas. |
| El grupo al que pertenece (su área o su jefe), para poder mostrar resultados por grupo. | La fecha y la hora en que contestó. |
| Una lista aparte de invitados que dice si cada persona **ya contestó** (para recordatorios). | El orden en que llegaron las respuestas. |

En otras palabras: ADAMIA sabe **quién** contestó, pero no puede saber **qué** contestó cada quien.

![Pregunta de una encuesta con la etiqueta Anónima y el aviso de avance guardado en el teléfono](/ayuda/capturas/clima/contestar-celular.webp "Al contestar, la etiqueta dice si la pregunta es anónima o confidencial")

## Lo que ve cada quien

| Quién | Qué ve |
|---|---|
| RH y dueño | Mientras está abierta: quién ya contestó y quién falta, **nunca** qué contestó. Al cerrarla: resultados agregados de la empresa, por área o jefe, por pregunta, comentarios y analítica. |
| Jefe | Al cerrarse, los resultados agregados de las personas que le reportan directamente y sus comentarios. Nunca la lista de quién contestó. |
| Empleado | Sus encuestas pendientes. Nunca respuestas de otras personas. |

## Las protecciones que sí existen

- **Los resultados solo aparecen al cerrar.** Si se vieran en vivo junto a la lista de «ya contestó», se podría deducir la respuesta de la última persona.
- **El avance se guarda en el teléfono, no en el servidor.** Así no quedan respuestas a medias ligadas a una persona.
- **La liga personal de WhatsApp** sirve para que la persona entre sin contraseña y para marcarla como «contestó». La liga no se guarda con sus respuestas.
- **Los comentarios abiertos** se muestran sin área y en orden alfabético, no en el orden en que llegaron.
- **«¿Cómo te fue hoy?»** guarda solo la carita elegida, sin persona, fecha ni hora.
- **Adamia AI** recibe los comentarios sin nombres, correos, teléfonos ni @menciones, y sin el área. Para sugerir un plan recibe solo números agregados.
- **Riesgo de rotación** se calcula por grupos de 2 personas o más, nunca por persona.

## Lo que hay que decir con claridad: equipos pequeños

En las encuestas de clima los resultados se muestran **desde 1 respuesta**. Eso permite que una empresa o un área chica vea sus resultados, pero tiene un costo:

> **Ojo:** En equipos pequeños, RH o el jefe **podrían deducir** quién contestó qué. Por ejemplo, si un área tiene 2 personas, sus resultados son prácticamente los de esas 2 personas.

Por eso ADAMIA lo avisa en varios lugares:

- Al contestar: «Tus respuestas no llevan tu nombre. En equipos pequeños, RH podría deducir quién contestó».
- Al lanzar, si eliges grupos pequeños: «las respuestas no llevan nombre, pero RH podría deducir quién contestó».
- En la vista del jefe, con menos de 5 respuestas: «Tu equipo es pequeño: no intentes deducir quién contestó qué. Úsalo para conversar en grupo, no para buscar a alguien».
- En el tablero, con menos de 10 respuestas: «lee esto como una señal, no como una medición firme».

Recomendación para RH y jefes: usa los resultados para conversar con el grupo y mejorar, nunca para buscar a una persona.

## NOM-035: reglas distintas

| Parte | Cómo se trata |
|---|---|
| Guía I (acontecimientos traumáticos) | Va **con nombre** y es **confidencial**: solo la ven RH y el dueño, para canalizar a la persona a valoración. Nunca aparece en reportes generales ni en el informe. |
| Guía II o III (riesgo psicosocial) | **Anónima.** Los resultados se muestran solo en grupos de **5 o más** respuestas. Si ocultar un grupo chico permitiera despejarlo restando del total, se oculta también otro grupo. |

Un área con menos de 5 personas invitadas no se muestra sola: sus respuestas se juntan con las demás.

## Buzón confidencial

En el buzón de quejas no se guarda la dirección IP ni el usuario de quien escribe. La persona solo deja nombre y contacto si quiere. Del lado de RH, abrir una queja y cada cambio quedan en una bitácora con el nombre de quien lo hizo. Más detalle en [Buzón confidencial](/ayuda/clima/buzon-confidencial).

## Preguntas frecuentes

### ¿RH puede ver mis respuestas si busca mi nombre?

No. No hay ninguna pantalla ni reporte que junte tu nombre con tus respuestas de clima, porque la base de datos no guarda esa relación. La excepción es la Guía I de la NOM-035, que es confidencial y va con nombre para poder apoyarte.

### Si contesto por WhatsApp, ¿mis respuestas quedan en el chat?

No. El mensaje solo trae tu liga. Contestas en la página de ADAMIA y nada de la encuesta pasa por el chat.

### ¿Por qué RH sabe que no he contestado?

Porque ADAMIA lleva una lista de invitados con «contestó» o «pendiente» para mandar recordatorios solo a quien falta. Esa lista no tiene respuestas.

## Qué pasa si…

### …alguien escribe nombres en un comentario abierto

El comentario se muestra tal cual a RH (sin área y en orden alfabético). Antes de mandarlo a Adamia AI, ADAMIA quita nombres, correos y teléfonos. Por eso la pantalla pide «Evita poner nombres».

### …una encuesta se contestó antes del cambio a «desde 1 respuesta»

Las respuestas guardadas antes del cambio en un grupo de menos de 5 invitados quedaron sin grupo y salen en «Otras áreas». No se pueden reasignar porque el sistema no sabe de quién son.

## Relacionado

- [Cómo contestar una encuesta](/ayuda/clima/contestar-encuesta)
- [Leer los resultados de clima](/ayuda/clima/resultados)
- [Aplicar la NOM-035](/ayuda/clima/nom-035)
