---
titulo: Cómo seguir un turno extra en vivo, editarlo o cancelarlo
resumen: Ve quién llegó al turno extra, cuántas horas extra van al doble o al triple, agrega personas o cancela el turno.
modulo: turnos_extra
audiencia: [rh, dueno]
pantallas: [/panel/turnos-extra]
palabras: [turno extra, en vivo, en curso, quién llegó, no se ha presentado, doble, triple, cancelar turno extra, editar turno extra, agregar personas]
orden: 20
actualizado: 2026-11-27
fuentes: [src/app/panel/turnos-extra/page.jsx, src/lib/asistencia/turnosExtra.mjs]
---

## Para qué sirve

Una vez programado, el turno extra se sigue **en vivo**: ves quién ya checó, quién llegó tarde, quién no se ha presentado y cuántas horas extra se llevan, separadas en dobles y triples.

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

Entra a **Control de tiempo → Turnos extra**. Para programar uno, ve a [Cómo programar un turno extra](/ayuda/turnos-extra/programar-un-turno-extra).

## Cómo encontrar un turno extra

1. Arriba elige la semana con las flechas, o toca **Esta semana**.
2. A la izquierda verás los turnos de esa semana con su día, horario, número de personas y su estado: **Programado**, **En curso**, **Terminado** o **Cancelado**.
3. Toca un turno para ver su detalle a la derecha.

![Turnos extra con la lista de la semana y el detalle del turno en curso](/ayuda/capturas/turnos-extra/turnos-extra.webp "El turno en curso muestra a cada persona con su entrada, su tiempo extra y su estado")

## Cómo leer el detalle

- Datos del turno: día, horario, duración, tolerancia, motivo y quién lo programó.
- **Personas**: cuántas son, cuántas checaron y cuántas no han llegado.
- **Horas extra hasta ahora**: se actualiza con cada checada.
- **Al doble** y **Al triple**: cómo se reparten según el tope semanal de la ley.
- Tabla por persona: **Su turno normal** (y a qué hora salió de él), **Entrada**, **Salida**, **Tiempo extra**, **Doble / triple**, **Estado** y **Alertas de ley**.

| Estado | Qué significa |
|---|---|
| Programado | Todavía no empieza su ventana para checar |
| Por llegar | Ya puede checar y aún no lo hace |
| No se ha presentado | Ya pasó la hora y no checó |
| Trabajando | Checó y sigue en el turno |
| Llegó N min tarde | Checó después de la tolerancia |
| Terminó | Checó su salida |

Mientras el turno está en curso, la pantalla se actualiza sola cada minuto.

## Cómo agregar personas o cambiar el horario

1. En el detalle toca **Editar / agregar personas**.
2. Cambia los datos o marca a más personas.
3. Toca **Guardar cambios**.

## Cómo cancelar un turno extra

1. Toca **Cancelar turno**.
2. Confirma con **Sí, cancelar turno** (o **No, volver**).

El turno queda como **Cancelado** (no se borra) y se registra quién lo canceló. Las checadas que ya hicieron se quedan en Asistencias.

## Preguntas frecuentes

### ¿Cómo checan el turno extra?

En el reloj, como siempre, a partir de la tolerancia antes de la entrada. La pantalla explica en «Cómo se ve en el reloj» cómo se están registrando esas checadas en tu sistema.

### ¿Qué pasa si alguien olvida checar la salida del turno extra?

El turno extra se cierra a su hora de fin.

### Un turno terminado, ¿se puede editar?

No: ya no muestra los botones de editar ni cancelar.

## Qué pasa si…

- **…no hay turnos esa semana:** cambia de semana o programa uno nuevo.
- **…no se puede cargar el turno:** verás «No se pudo cargar el turno.»; vuelve a intentar.

## Relacionado

- [Cómo programar un turno extra](/ayuda/turnos-extra/programar-un-turno-extra)
- [Cómo ver quién está trabajando ahora con el Monitor](/ayuda/monitor/usar-el-monitor)
- [Cómo generar el reporte de horas](/ayuda/reporte-horas/generar-reporte-de-horas)
