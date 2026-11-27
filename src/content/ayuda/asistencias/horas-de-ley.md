---
titulo: Cómo revisar las horas de la semana contra el límite de la ley
resumen: La pestaña Horas de ley suma las horas de cada persona por semana (lunes a domingo) y te avisa quién se está excediendo o va a pasar del límite legal.
modulo: asistencias
audiencia: [rh, dueno]
pantallas: [/panel/registro-asistencia]
palabras: [horas de ley, límite legal, LFT, 48 horas, 40 horas, semana, excede, horas extra dobles, triples, jornada legal, reforma]
orden: 80
actualizado: 2026-11-27
fuentes: [src/app/panel/registro-asistencia/VistaHoras.jsx, src/lib/asistencia/semanaHoras.mjs, src/app/panel/registro-asistencia/page.jsx]
---

## Para qué sirve

La Ley Federal del Trabajo pone un **límite de horas ordinarias por semana** y un tope de **horas extra al doble**. La pestaña **Horas de ley** te muestra, por persona, cuántas horas lleva la semana, cuánto le falta o se pasa del límite y cuántas horas extra tiene autorizadas o por autorizar.

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

- Entra a **Control de tiempo → Asistencias** y toca la pestaña **Horas de ley**.
- La semana legal va de **lunes a domingo**. Las semanas que puedes elegir salen del **rango de fechas** que tengas en la pestaña Registros. Si quieres revisar otra semana, cambia el rango en Registros y regresa.

## Cómo leer la pantalla

![Pestaña Horas de ley con la semana, los filtros por estado y una fila por persona](/ayuda/capturas/asistencias/horas-de-ley.webp "Una fila por persona: horas por día, total de la semana, contra el límite, extra y alertas")

Arriba dice la semana y la regla que aplica, por ejemplo «Semana 23 nov – 29 nov · en curso · límite LFT: 48 h ordinarias · 9 h extra al doble · solo cuentan las extra autorizadas».

Si tu rango tiene varias semanas, elige una con los botones de semana.

**Filtros por estado** (tócalos para ver solo esas personas): **Se están excediendo**, **Van a pasar del límite**, **Con extras por autorizar** y **Dentro del límite**.

**Columnas:**

| Columna | Qué muestra |
|---|---|
| Empleado | Nombre y área. Tócalo para ver su semana en Asistencias |
| Lun … Dom | Horas trabajadas cada día. Toca un día para abrirlo y corregirlo |
| Semana | Total de la semana contra el límite, con una barra |
| Contra el límite | Cuánto le falta o cuánto se pasa («+5 h arriba») |
| Extra aut. | Horas extra autorizadas y cuántas van al doble |
| Por aut. | Horas extra por autorizar |
| Estado | Excede, En límite, Va a pasar, Sin regla… |
| Alertas | Avisos de la ley, por ejemplo «Más de 4 h extra en un día» |

Ordena tocando los títulos de las columnas. Busca a alguien con **Buscar empleado...**.

## Cómo corregir un día desde aquí

1. Toca el día en la fila de la persona (o su alerta).
2. Se abre Asistencias en ese día y esa persona.
3. Corrige en su reloj del día. Ver [Cómo corregir la checada de un día](/ayuda/asistencias/corregir-checada-del-dia).

## Preguntas frecuentes

### ¿Qué límite usa?

El que corresponde al año de la semana, según la reforma a la Ley Federal del Trabajo publicada el 1 de mayo de 2026, que reduce poco a poco la jornada semanal. La pantalla muestra el límite que está aplicando.

### ¿Por qué «solo cuentan las extra autorizadas»?

Porque una hora de más solo es hora extra pagada cuando alguien la autoriza. Las demás se muestran como «por autorizar». Ver [Cómo autorizar o no las horas extra del día](/ayuda/asistencias/autorizar-horas-extra).

### ¿Qué significa «Va a pasar»?

Que con su horario de los días que faltan de la semana terminará arriba del límite.

### ¿Qué es «Sin regla»?

Que para esas fechas no hay una regla legal cargada; no se puede comparar contra el límite.

## Qué pasa si…

- **…su horario completo pasa del límite legal:** aparece una alerta. Revisa su turno; al guardar un turno que pasa del límite, el sistema también te avisa. Ver [Cómo crear un turno](/ayuda/turnos/crear-un-turno).
- **…tiene más de 9 h extra autorizadas en la semana:** lo que pasa del tope va al **triple**.
- **…no se pueden calcular las horas:** verás «No se pudieron calcular las horas.»; intenta de nuevo.

## Relacionado

- [Cómo generar el reporte de horas](/ayuda/reporte-horas/generar-reporte-de-horas)
- [Cómo autorizar o no las horas extra del día](/ayuda/asistencias/autorizar-horas-extra)
- [Cómo revisar y exportar las asistencias de un periodo](/ayuda/asistencias/revisar-asistencias)
