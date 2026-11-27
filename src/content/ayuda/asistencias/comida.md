---
titulo: Cómo se registra y se corrige la hora de comida
resumen: Cómo se marca la comida en el reloj, cómo la ves en el Monitor y en Asistencias, y cómo agregarla o quitarla cuando alguien no la marcó o la marcó por error.
modulo: asistencias
audiencia: [rh, dueno]
pantallas: [/panel/registro-asistencia]
palabras: [comida, salir a comer, voy a comer, no marcó salida a comer, se pasó de comida, descanso, agregar comida, no fue comida, tramos]
orden: 50
actualizado: 2026-11-27
fuentes: [src/app/panel/registro-asistencia/RelojDiaDialog.jsx, src/lib/asistencia/relojDia.mjs, src/app/panel/registro-asistencia/ResumenAsistencia.jsx, src/app/panel/registro-asistencia/AsistenciaRow.jsx, src/components/Clock/VoyAComer.jsx, src/components/RelojChecador.jsx, src/lib/asistencia/tablero.mjs]
---

## Para qué sirve

La comida **no se paga**. Para que el sistema la descuente de las horas trabajadas tiene que saber cuándo salió y cuándo regresó cada persona. Esta guía explica cómo se registra, dónde la ves y cómo corregirla.

## Quién la usa

Recursos Humanos y el dueño. Los empleados marcan su comida en el reloj; ver [Cómo checar tu salida a comer](/ayuda/reloj-checador/salir-a-comer).

## Antes de empezar

- La comida de cada persona viene de su **turno** (**Salida comida** y **Regreso comida**). Ver [Cómo crear un turno](/ayuda/turnos/crear-un-turno).
- La comida se descuenta solo si la persona **marcó** su salida y su regreso (o si RH la agrega).

## Cómo se registra la comida en el reloj

- La **primera salida del día** siempre pregunta **«¿Sales a comer?»** con dos opciones: **Salir a comer** (la jornada sigue abierta) o **Registrar salida**.
- Si la persona ya salió una vez (por ejemplo a un trámite) y después va a comer, antes de checar toca **Voy a comer** en el reloj.
- El **regreso** de comida es una entrada normal.

Con eso el día queda en dos tramos y el tiempo entre ellos cuenta como comida.

## Dónde ves la comida

- **Monitor**: el contador **En comida** y frases como «En comida 67 de 60 min». Si alguien se pasa, el contador se pone en rojo («1 ya se pasó»).
- **Asistencias**: la columna **Comida** con el tiempo del día.
- **Reloj del día**: una franja ámbar entre los dos tramos: «Comida 11:21 a.m. → 11:46 a.m. · 25 min · marcada con «Salir a comer» en el reloj».
- **Reporte de horas**: la columna **Comida** con el tiempo y cuánto se excedió.

![Reloj del día con la franja de comida marcada con «Salir a comer»](/ayuda/capturas/asistencias/reloj-del-dia-comida.webp "La comida marcada en el reloj aparece como una franja ámbar entre los dos tramos")

## Cómo encontrar a quien no marcó su comida

En **Asistencias**, cuando hay personas cuyo horario tiene comida pero solo checaron entrada y salida, aparece el botón **⚠ No marcaron salida a comer**. Tócalo para ver solo a esas personas.

> **Importante:** si alguien no marcó su comida, **no se le descuenta nada**: sus horas trabajadas son todo el tiempo entre su entrada y su salida. Si de verdad comió, agrégala como se explica abajo.

## Cómo agregar la comida que no marcó

1. Abre el reloj del día de la persona.
2. Toca **+ Comida**. Se agrega un renglón con el concepto **Comida** y la hora de comida de su horario.
3. Ajusta las horas si comió a otra hora.
4. Elige el **Motivo** (por ejemplo **Olvidó checar**).
5. Toca **Guardar**.

El botón **+ Comida** solo aparece si el día tiene checadas y todavía no tiene comida. También puedes cambiar el **Concepto** de un renglón existente a **Comida**.

## Cómo quitar una comida que no fue comida

Si alguien tocó «Salir a comer» por error (por ejemplo, salió a un trámite):

1. Abre su reloj del día.
2. En la franja ámbar de la comida toca **No fue comida**.
3. Toca **Guardar**.

Ese tiempo deja de contar como comida; queda como un hueco no trabajado.

## Preguntas frecuentes

### ¿La comida se paga?

No. Las horas programadas de un día son su horario menos su comida, y las horas trabajadas no incluyen la comida.

### Si la persona comió menos tiempo, ¿cuenta como hora extra?

Sí puede contar: las horas extra del día se calculan con todo lo trabajado contra su jornada. Comer menos suma tiempo trabajado. Ver [Cómo autorizar o no las horas extra del día](/ayuda/asistencias/autorizar-horas-extra).

### ¿Qué pasa si alguien toca «Voy a comer» y ya había comido?

El reloj registra una salida normal y avisa «Ya registraste tu comida hoy.».

### ¿Por qué el reloj no le preguntó «¿Sales a comer?» en su segunda salida?

La primera salida del día siempre pregunta. En las siguientes pregunta solo si su ficha o su turno tienen comida y todavía no ha comido. Para no depender de eso, usa **Voy a comer** antes de checar.

## Qué pasa si…

- **…su turno no tiene comida:** el reloj del día dice «Sin comida» en el encabezado y no hay excedente de comida que medir.
- **…se pasó de su tiempo de comida:** el Monitor lo marca en «Requiere atención» y la Línea del día pinta en rojo lo que se pasó.
- **…ya tiene una comida ese día:** no se ofrece **+ Comida** otra vez.

## Relacionado

- [Cómo checar tu salida a comer](/ayuda/reloj-checador/salir-a-comer)
- [Cómo corregir la checada de un día](/ayuda/asistencias/corregir-checada-del-dia)
- [Cómo crear un turno](/ayuda/turnos/crear-un-turno)
- [Cómo ver quién está trabajando ahora con el Monitor](/ayuda/monitor/usar-el-monitor)
