---
titulo: Cómo leer la Línea del día del Monitor
resumen: La Línea del día dibuja la jornada de cada persona sobre una regla de horas para ver de un vistazo quién trabajó, comió, se pasó o hace hora extra.
modulo: monitor
audiencia: [rh, dueno]
pantallas: [/panel/monitor]
palabras: [línea del día, monitor, gráfica, jornada, comida, hora extra, sin checar salida, regla de horas]
orden: 20
actualizado: 2026-11-27
fuentes: [src/app/panel/monitor/LineaDia.jsx, src/app/panel/monitor/VistaMonitor.jsx, src/app/panel/monitor/comunes.jsx, src/lib/asistencia/vistasMonitor.mjs]
---

## Para qué sirve

La **Línea del día** es otra forma de ver el Monitor. En lugar de una tabla, cada persona tiene una barra sobre una regla de horas: ves su horario, lo que realmente trabajó, su comida y su hora extra, todo junto. Es útil para detectar de un vistazo comidas largas, salidas tempranas o personas que siguen trabajando después de su hora.

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

Abre **Control de tiempo → Monitor**. Si nunca la has usado, primero lee [Cómo ver quién está trabajando ahora con el Monitor](/ayuda/monitor/usar-el-monitor).

## Cómo abrir la Línea del día

1. En el Monitor, arriba a la derecha, toca **Línea del día** (junto a **Tabla**).
2. Listo. El Monitor recordará esta vista la próxima vez que entres desde ese mismo navegador. Para regresar, toca **Tabla**.

![Línea del día con una barra por persona y la línea roja de la hora actual](/ayuda/capturas/monitor/monitor-linea-del-dia.webp "Cada fila es una persona; la línea roja vertical marca la hora actual")

## Cómo leer cada barra

| Color | Qué significa |
|---|---|
| Gris tenue | Su horario programado |
| Azul | Tiempo trabajado y que sigue en su jornada |
| Gris | Tiempo trabajado de alguien que ya salió |
| Ámbar | Su comida |
| Rojo | Lo que se pasó de su tiempo de comida |
| Violeta | Trabajo después de su salida programada (hora extra) |
| Violeta tenue | Hora extra autorizada que todavía no ocurre |
| Rayado en rojo | Ya pasó su hora de salida y no ha checado su salida («Sin checar salida») |

La **línea roja vertical** es la hora actual; arriba, en la regla, aparece la hora exacta.

A la derecha de cada fila verás un **chip** con su estado: Trabajando, Hora extra, Sin checar salida, En comida (o «En comida · se pasó»), Salió, Salió antes, Salió con permiso, Por entrar, No ha llegado, Faltó, o el tipo de día (Vacaciones, Día de Descanso…).

Abajo de la gráfica hay una **leyenda** con todos los colores.

> **Consejo:** pasa el mouse sobre cualquier tramo de la barra para ver sus horas exactas, por ejemplo «Comida 2:00 p.m.–2:30 p.m. · 30 min».

## En qué orden aparecen las personas

Del más urgente al menos urgente: primero quien no ha llegado, después quien está en comida, quien está trabajando, quien está por entrar, quien ya salió y al final quien descansa.

## Cómo usar los filtros

Los contadores de arriba, la búsqueda y el área funcionan igual que en la Tabla: toca un contador para ver solo esas personas y tócalo otra vez para quitar el filtro. La regla de horas **no cambia** al filtrar, para que no brinque mientras revisas.

## Cómo abrir el día de una persona

Toca cualquier parte de su fila, incluso la barra. Se abre su reloj del día para revisar o corregir. Si tocas su nombre, se abre su ficha.

## En el celular

La regla de horas se desliza a lo ancho dentro de su caja, con el nombre fijo a la izquierda. Al abrir, la regla se coloca para que veas la hora actual.

## Preguntas frecuentes

### ¿Por qué la regla empieza y termina a esas horas?

La regla va desde la entrada más temprana del día hasta la salida más tardía (o la hora actual), con media hora de margen, y mide al menos 4 horas. Se calcula con todo el día, no solo con lo filtrado.

### ¿Por qué hay un hueco en la barra de alguien?

Un hueco que no es comida (por ejemplo, salió a un trámite y regresó) no se pinta: es tiempo que no trabajó.

### ¿Por qué lo de alguien después de su salida sale rayado en rojo y no en violeta?

Porque ya pasaron más de 15 minutos de su salida (o de su hora extra autorizada) y no ha checado. El sistema no supone hora extra por un olvido de checar. Corrígelo en su reloj del día si de verdad se quedó trabajando.

## Qué pasa si…

- **…alguien trabaja de noche y su turno empezó ayer:** la regla se alarga desde la noche de ayer y las marcas dicen la hora del día («10 p.m.», «12 a.m.»…).
- **…alguien está de vacaciones o descanso:** no se dibuja su horario; solo verás el chip con el tipo de día.
- **…nadie coincide con el filtro:** verás «Nadie en «…» con estos filtros.».

## Relacionado

- [Cómo ver quién está trabajando ahora con el Monitor](/ayuda/monitor/usar-el-monitor)
- [Cómo corregir la checada de un día](/ayuda/asistencias/corregir-checada-del-dia)
- [Cómo autorizar o no las horas extra del día](/ayuda/asistencias/autorizar-horas-extra)
