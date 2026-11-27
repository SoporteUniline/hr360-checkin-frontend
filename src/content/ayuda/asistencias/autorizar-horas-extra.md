---
titulo: Cómo autorizar o no las horas extra del día
resumen: Las horas extra se calculan con la jornada del día; solo cuentan las que alguien autoriza. Aprende a separarlas, elegir quién autoriza o marcarlas como no autorizadas.
modulo: asistencias
audiencia: [rh, dueno]
pantallas: [/panel/registro-asistencia, /panel/horas-extra]
palabras: [horas extra, tiempo extra, autorizar, no autorizar, por autorizar, separar hora extra, quién autoriza, dobles, triples, jornada diaria, control de horas extra]
orden: 60
actualizado: 2026-11-27
fuentes: [src/app/panel/registro-asistencia/RelojDiaDialog.jsx, src/lib/asistencia/relojDia.mjs, src/lib/asistencia/extraDelDia.mjs, src/app/panel/registro-asistencia/AsistenciaRow.jsx, src/app/panel/registro-asistencia/ResumenAsistencia.jsx, src/app/panel/horas-extra/page.jsx, src/app/panel/incidencias/page.jsx]
---

## Para qué sirve

Cuando alguien trabaja **más que su jornada del día**, el sistema detecta ese tiempo como **horas extra por autorizar**. Solo se pagan como horas extra las que **alguien autoriza**. Esta guía explica cómo se calculan y cómo decidir.

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

- Cada persona necesita un **horario** para saber cuál es su jornada. Ver [Cómo crear un turno](/ayuda/turnos/crear-un-turno).
- Ten claro quién puede autorizar horas extra en tu empresa: aparecerán en la lista **¿Quién autoriza?**.

## Cómo se calculan las horas extra del día

La regla es la de la jornada diaria: **si su jornada es de 8 horas y trabajó 10, son 2 horas extra**.

- **Trabajado** = todo el tiempo trabajado del día, sin la comida.
- **Programado** = su horario menos la comida de su horario.
- **Horas extra detectadas** = trabajado − programado, **a partir de 30 minutos**. Menos de 30 minutos no se marca.
- Llegar temprano, salir tarde o comer menos **suma**. Llegar tarde y salir tarde **se compensa**.
- Si trabajó en un día **sin horario** (su descanso), todo lo que trabajó queda por autorizar.

**Por autorizar** = lo detectado menos lo ya autorizado, lo que se dejó como reposición y lo marcado como no autorizado.

> **Importante:** las horas extra van **fuera de la jornada**: antes de su entrada o después de su salida (art. 66 de la LFT). Si el tiempo de más quedó dentro de la jornada (por ejemplo, comió menos), se decide con la autorización del día.

## Cómo encontrar las horas extra por autorizar

- En **Asistencias**, el resumen de arriba dice «Horas extra N · N por autorizar». Tócalo para ver solo esas personas.
- En la columna **Horas extra** de la tabla aparece un botón morado, por ejemplo «3 h 11 min por autorizar». Las ya decididas dicen «2 h autorizadas».
- En el [Centro de incidencias](/ayuda/incidencias/centro-de-incidencias) aparecen como incidencia «H. extra».

## Cómo autorizar la hora extra después de la salida

Ejemplo: Mario entra a las 8:00 a.m. y sale a las 5:00 p.m., pero se quedó hasta las 8:02 p.m. por un inventario.

1. Toca el botón morado «… por autorizar» de su fila (o el botón del reloj).
2. En su reloj del día verás en **Extra** «3 h 11 min por autorizar» y el botón **Separar 3 h 02 min después de las 5:00 p.m. como hora extra**. Tócalo.
3. Se parte su último tramo: la jornada termina a las 5:00 p.m. y se agrega un renglón **Hora extra** de 5:00 p.m. a 8:02 p.m.
4. En **¿Quién autoriza?** elige a la persona que autorizó. Si no se autoriza, elige **No se autoriza**.
5. Toca **Guardar**.

![Reloj del día con el botón para separar la hora extra después de la salida](/ayuda/capturas/asistencias/reloj-del-dia-hora-extra.webp "El reloj ofrece separar el tiempo de después de la salida como hora extra")

![Reloj del día con el renglón de Hora extra y la lista ¿Quién autoriza?](/ayuda/capturas/asistencias/reloj-del-dia-separar-extra.webp "Al separar, el renglón de Hora extra pide quién la autoriza")

Si la persona **llegó antes** de su entrada, verás también **Separar … antes de las … como hora extra**, que funciona igual del otro lado.

> **Consejo:** separar no pide motivo de corrección (no cambias lo que marcó el reloj, solo lo clasificas), pero sí pide quién autoriza.

## Cómo capturar una hora extra a mano

Si el reloj no registró el tiempo extra:

1. En el reloj del día toca **Agregar registro**.
2. Pon la **Entrada** y **Salida** de ese tiempo **fuera** de su jornada.
3. En **Concepto** elige **Hora extra**.
4. Elige el **Motivo** (es un registro agregado) y **¿Quién autoriza?**.
5. Toca **Guardar**.

## Cómo decidir desde el Centro de incidencias

En el [Centro de incidencias](/ayuda/incidencias/centro-de-incidencias), en la incidencia «H. extra» de una persona, usa **Autorizar** o **No autorizar**. Para varias personas a la vez, márcalas y toca **Autorizar H. extra**.

## Dobles y triples

No eliges si se pagan dobles o triples: lo decide la ley **por semana** («Dobles o triples: lo decide la ley por semana.»). Las primeras horas extra autorizadas de la semana van al doble hasta el tope legal y el resto al triple. Puedes revisarlo en [Horas de ley](/ayuda/asistencias/horas-de-ley) y en el [Reporte de horas](/ayuda/reporte-horas/generar-reporte-de-horas).

## Preguntas frecuentes

### ¿Qué pasa con las checadas si no autorizo?

No se mueven. Queda la constancia «No autorizadas» y la nómina paga su jornada programada, no el tiempo de más.

### ¿Por qué alguien trabajó 20 minutos de más y no aparece como hora extra?

Porque el tiempo de más se cuenta a partir de 30 minutos.

### ¿Dónde quedó «Control de horas extra»?

Ahora todo se decide en Asistencias, en el reloj de cada día. Si entras por el enlace viejo, te trae a Asistencias con un aviso que dice que «Control de horas extra» ahora vive ahí.

### La persona debe horas de un permiso, ¿cómo se las cuento como reposición en lugar de pagarlas?

Regístralo en **Horas por reponer** con **Registrar reposición**. Así no se paga como hora extra y baja de lo que debe. Ver [Cómo controlar las horas por reponer](/ayuda/asistencias/horas-por-reponer).

### ¿Y si programé un turno extra?

Las horas de un [turno extra](/ayuda/turnos-extra/programar-un-turno-extra) quedan autorizadas como extra desde que se programan.

## Qué pasa si…

- **…eliges «Hora extra» en un renglón que está dentro de la jornada:** la opción aparece deshabilitada con la explicación «Dentro de la jornada (…) usa «Jornada»».
- **…solo una parte del renglón queda fuera:** verás el error con la sugerencia: lo de después de la salida, con «Jornada» + «Separar…»; lo de antes de la entrada, con otro renglón de hora extra.
- **…no eliges quién autoriza:** verás «Hora extra: falta quién autoriza.» y no podrás guardar.
- **…el día está en una nómina autorizada:** no se puede cambiar.

## Relacionado

- [Cómo corregir la checada de un día](/ayuda/asistencias/corregir-checada-del-dia)
- [Cómo revisar las horas de la semana contra la ley](/ayuda/asistencias/horas-de-ley)
- [Centro de incidencias](/ayuda/incidencias/centro-de-incidencias)
- [Cómo programar un turno extra](/ayuda/turnos-extra/programar-un-turno-extra)
- [Cómo generar el reporte de horas](/ayuda/reporte-horas/generar-reporte-de-horas)
- [Cómo calcula ADAMIA la nómina](/ayuda/nomina/como-se-calcula-la-nomina)
