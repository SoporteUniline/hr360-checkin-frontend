---
titulo: Cómo seguir, recordar y cerrar una campaña de evaluación
resumen: Revisa el avance de cada persona, el tablero de la campaña, quién falta, manda recordatorios, amplía el plazo, pregunta a Adamia AI y cierra la campaña.
modulo: evaluaciones
audiencia: [rh, dueno]
pantallas: [/panel/evaluaciones/campanas]
palabras: [avance de campaña, tablero, quién falta, recordar pendientes, ampliar plazo, cerrar campaña, duplicar campaña, mapa de calor, brecha, pdf de campaña, exportar csv]
orden: 30
actualizado: 2026-11-27
fuentes: [src/components/evaluaciones/ApiViews.jsx, src/components/evaluaciones/InsightViews.jsx, src/components/evaluaciones/Indicadores.jsx, src/lib/evaluaciones/avance.mjs, src/lib/evaluaciones/tablero.mjs]
---

## Para qué sirve

Desde el detalle de una campaña ves en qué paso va, cuántas evaluaciones faltan y de quién, y los resultados agregados conforme llegan. Aquí también mandas recordatorios, amplías el plazo y la cierras.

## Quién la usa

RH y el dueño. Dirección puede consultar sin modificar.

## Antes de empezar

Entra a **Evaluación de desempeño › Campañas**. Arriba verás **Resumen de todas las campañas** con indicadores (campañas activas, evaluaciones completadas y pendientes, publicados, promedio y semáforo) y **Exportar CSV**. Abajo, la lista de campañas con su estado (Borrador, Programada, Activa, Vencida o Cerrada), recibidas y pendientes. Presiona **Ver campaña**.

## Cómo leer el avance de la campaña

Arriba ves los cinco pasos: **Preparar**, **Responder**, **Revisar**, **Publicar** y **Planes**, cada uno con su avance (por ejemplo, «40 de 48 (83 %)»). El paso actual se resalta.

En **Personas** hay una fila por persona evaluada con:

- **Respuestas**: cuántas evaluaciones de esa persona ya se enviaron y quién falta (su jefe, su equipo, pares, autoevaluación o RH).
- **Resultado**: la calificación cuando ya se puede calcular.
- Cuántos planes tiene. Con **Abrir** ves su resultado completo.

Al final, **Cada evaluación** despliega todas las asignaciones con evaluador, perspectiva y estado.

## Cómo leer el tablero de la campaña

El **Tablero de la campaña** se calcula con las mismas reglas que cada resultado: lo confidencial no se muestra.

- **Avance de respuestas**, **Con resultado**, **Promedio (1 a 5)** y **Brecha auto − jefe**.
- **Avance y quién falta**: avance por perspectiva. Con **Ver quién falta** ves evaluador, a quién evalúa y la perspectiva (nunca el contenido de una respuesta).
- **Distribución por área**: promedio y semáforo (menos de 3 · de 3 a 3.99 · 4 o más).
- **Por competencia**: de menor a mayor.
- **Mapa de calor: competencia × área**.
- **Brecha autoevaluación vs jefe**: quién se califica más alto o más bajo que su jefe.

![Tablero de la campaña con indicadores, mapa de calor y brecha](/ayuda/capturas/evaluaciones/tablero-campana.webp "Tablero de la campaña")

### Pregúntale a tus resultados

En el tablero escribe una pregunta en **Tu pregunta** (por ejemplo, «¿Qué competencia debemos reforzar primero y en qué área?») y presiona **Preguntar**. Adamia AI responde solo con datos agregados de la campaña, sin nombres; las áreas chicas van juntas. Usa créditos.

### Descargar

Presiona **PDF de campaña** para bajar el informe con el diseño de ADAMIA.

## Cómo mandar recordatorios

En una campaña **Activa** presiona **Recordar pendientes** y confirma. El servidor programa los avisos a los evaluadores que no han enviado. Si tu empresa encendió los avisos por WhatsApp, también les llega por ahí (ver [Configuración](/ayuda/evaluaciones/configuracion)).

## Cómo ampliar el plazo

Presiona **Ampliar plazo**, elige la **Nueva fecha límite**, escribe el **Motivo** y confirma.

## Cómo cerrar la campaña

Presiona **Cerrar campaña**, escribe el motivo y confirma. Ya nadie podrá enviar evaluaciones.

> **Ojo:** Si cierras una campaña incompleta, la calificación final de quien no tenga todas sus respuestas queda vacía, salvo que en Configuración se haya encendido «Al cerrar incompleta, calcular con lo respondido».

## Cómo duplicar una campaña

Presiona **Duplicar** y confirma. Se crea un borrador sin respuestas para que revises participantes y fechas.

## Preguntas frecuentes

### ¿Qué es la «brecha auto − jefe»?

La diferencia entre cómo se calificó la persona y cómo la calificó su jefe. Positiva significa que se califica más alto. Se marca con una diferencia de 0.5 o más.

### ¿RH puede ver qué contestó cada evaluador?

RH puede abrir cada asignación con **Consultar**. Las perspectivas que se agruparon como confidenciales no muestran autores ni resultados individuales.

## Qué pasa si…

### …un evaluador dice que no le llegó la evaluación

Pídele que entre a ADAMIA, a **Por responder**. Los avisos son por correo (y por WhatsApp si está encendido); revisa su correo y teléfono en la ficha.

### …la campaña dice «Vencida»

Pasó la fecha límite y no se ha cerrado. Amplía el plazo o ciérrala.

## Relacionado

- [Crear una campaña](/ayuda/evaluaciones/crear-campana)
- [Resultados, publicación y acuse](/ayuda/evaluaciones/resultados-y-acuse)
- [Calibración 9-box y bono](/ayuda/evaluaciones/calibracion-9-box-y-bono)
