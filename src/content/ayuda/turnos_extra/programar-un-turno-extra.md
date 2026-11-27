---
titulo: Cómo programar un turno extra
resumen: Arma rápido quién viene a trabajar tiempo extra un día, con los avisos de la Ley Federal del Trabajo para cada persona; las horas quedan autorizadas como extra.
modulo: turnos_extra
audiencia: [rh, dueno]
pantallas: [/panel/turnos-extra]
palabras: [turno extra, tiempo extra, doble turno, horas extra, programar, plantilla, avisos de ley, 12 horas, menor de edad, triples, voluntario]
orden: 10
actualizado: 2026-11-27
fuentes: [src/app/panel/turnos-extra/page.jsx, src/app/panel/turnos-extra/TurnoExtraDialog.jsx, src/lib/asistencia/turnosExtra.mjs]
---

## Para qué sirve

A veces necesitas que parte de tu gente venga a trabajar **tiempo extra** un día: un doble turno, un inventario, un pedido urgente. Con **Turnos extra**:

- Eliges el día, el horario y a las personas.
- El sistema te avisa, persona por persona, lo que marca la ley (por ejemplo, si alguien juntaría más de 12 horas seguidas).
- Las horas del turno quedan **autorizadas como horas extra** al programarlo.
- Al día siguiente cada quien vuelve a su turno normal: el turno extra **no cambia su horario**.

**La empresa decide**: el sistema avisa, pero no bloquea.

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

Entra a **Control de tiempo → Turnos extra**.

## Cómo programar un turno extra

1. Toca **Nuevo turno extra**.
2. Llena los datos:
   - **Nombre** (por ejemplo «Doble turno · Producción»).
   - **Día**, **Entra** y **Sale**. Si sale después de medianoche, termina al día siguiente.
   - **Tolerancia**: cuántos minutos antes pueden checar (0, 10, 15, 30, 45 o 60 min).
   - **Empresa** (si manejas varias) y **Motivo** (opcional).
3. Abajo verás cuánto dura y desde qué hora pueden checar.
4. Elige a las personas. Con **Mostrar** puedes ver: **Salieron hoy de su turno** (útil para un doble turno), un departamento, **Todos** o solo los **Elegidos**. Busca con **Buscar empleado…**, marca a cada persona o usa **Elegir a los mostrados**.
5. Revisa la columna **Avisos de ley** de cada persona.
6. Toca **Programar turno**.

![Ventana Nuevo turno extra con el horario, los filtros y la lista de personas con sus avisos de ley](/ayuda/capturas/turnos_extra/turno-extra-nuevo.webp "Cada persona muestra su turno normal, a qué hora salió, sus horas de la semana y los avisos de ley")

> **Importante:** si alguna persona tiene un **aviso grave** (es menor de edad o juntaría más de 12 horas seguidas), el botón cambia a **Confirmar y programar** y te muestra quiénes son. Si la empresa decide programarlas de todos modos, queda registrado quién lo confirmó.

## Qué significan los avisos de ley

| Aviso | Cuándo aparece |
|---|---|
| Menor de edad (grave) | La persona tiene menos de 18 años en esa fecha |
| Más de 12 h seguidas (grave) | El turno extra y su turno normal pegado (menos de 4 h entre ambos) suman más de 12 h |
| No puede cubrirlo completo | Su horario normal se empalma con el turno |
| Más de 4 h extra al día | El turno dura más de 4 horas |
| Extra en 4 días de la semana | Ya tiene horas extra en 4 días esa semana |
| Triples | Con este turno pasa el tope semanal al doble; dice cuántas irían al triple |
| Descanso corto | Su siguiente turno normal empieza menos de 4 h después |
| Otro turno extra | Ya está en otro turno extra que se empalma |
| Vacaciones o permiso | Ese día tiene vacaciones o permiso |
| Su día de descanso | Ese día descansa (es informativo) |

Recuerda que, según la ley, las horas extra son **voluntarias**, máximo **4 h al día** en **4 días por semana** y una jornada máxima de **12 h**. Las primeras horas extra de la semana se pagan al doble y el resto al triple.

## Preguntas frecuentes

### ¿Tengo que autorizar las horas después?

No. Las horas del turno extra quedan autorizadas como horas extra desde que lo programas.

### ¿El turno extra cambia el horario de la persona?

No. Al día siguiente cada quien vuelve a su turno normal.

### ¿Cómo sé quién ya llegó al turno extra?

En la misma pantalla, el turno muestra en vivo quién checó. Ver [Cómo seguir un turno extra en vivo](/ayuda/turnos_extra/seguir-un-turno-extra).

## Qué pasa si…

- **…la entrada y la salida son iguales:** verás «La entrada y la salida no pueden ser iguales.».
- **…no eliges a nadie:** verás «Elige al menos a una persona».
- **…nadie salió de su turno poco antes de ese horario:** el filtro lo dice; usa «Todos» o un departamento.
- **…no se pueden calcular los avisos:** verás «No se pudo calcular quién puede venir»; revisa el día y el horario.

## Relacionado

- [Cómo seguir un turno extra en vivo](/ayuda/turnos_extra/seguir-un-turno-extra)
- [Cómo autorizar o no las horas extra del día](/ayuda/asistencias/autorizar-horas-extra)
- [Cómo revisar las horas de la semana contra el límite de la ley](/ayuda/asistencias/horas-de-ley)
- [Cómo crear o editar un turno](/ayuda/turnos/crear-un-turno)
