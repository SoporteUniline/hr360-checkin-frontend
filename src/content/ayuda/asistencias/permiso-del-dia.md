---
titulo: Cómo registrar que alguien llegó tarde o salió antes con permiso
resumen: En el reloj del día eliges Entrada tarde, Salida temprano o Salir en medio turno con su motivo; el día queda con goce y las horas no trabajadas se reponen, se descuentan o se pagan según el motivo.
modulo: asistencias
audiencia: [rh, dueno]
pantallas: [/panel/registro-asistencia]
palabras: [permiso del día, entrada tarde, salida temprano, salir en medio turno, retardo justificado, salió antes, permiso parcial, horas no trabajadas, reponer, descontar, pagar]
orden: 40
actualizado: 2026-11-27
fuentes: [src/app/panel/registro-asistencia/PermisoDelDia.jsx, src/app/panel/registro-asistencia/RelojDiaDialog.jsx, src/lib/asistencia/horaPermiso.mjs, src/lib/asistencia/tiposGoce.mjs, src/lib/asistencia/quePasoMotivo.mjs]
---

## Para qué sirve

A veces alguien llega tarde, sale antes o se ausenta unas horas **con permiso**. Si no lo registras, el sistema lo cuenta como retardo o salida antes. Con el **permiso del día**:

- El día queda **con goce** (no es retardo ni salida anticipada).
- Las **horas no trabajadas** se tratan como diga el motivo: **se reponen** (van a su cuenta de horas), **se descuentan** en nómina o **se pagan**.

Esto es para registrar algo que **ya pasó** en un día con checadas. Si el permiso se pide antes, usa [Permisos por horas](/ayuda/permisos/permisos-por-horas).

## Quién la usa

Recursos Humanos y el dueño, con permiso de edición de asistencias.

## Antes de empezar

- La persona debe tener **checadas** ese día. Si no vino, no es un permiso parcial: usa Inasistencia o el día de ley ([ver cómo](/ayuda/asistencias/que-paso-y-motivo)).
- Revisa que los motivos tengan bien configurado su goce y sus horas en [Tipos de registro y motivos](/ayuda/asistencias/tipos-de-registro).

## Cómo registrar el permiso

Ejemplo: Tomás salió a las 2:00 p.m. para ir al médico y su salida era a las 4:00 p.m.

1. Abre su reloj del día (en Asistencias, el botón azul del reloj o su renglón).
2. Arriba a la derecha, en **Qué pasó**, elige el tipo:
   - **Entrada tarde**: llegó después de su hora.
   - **Salida temprano**: se fue antes de su hora.
   - **Salir en medio turno**: salió y regresó durante la jornada.
3. Escribe la hora que pide (es obligatoria):
   - Entrada tarde: **¿A qué hora entró?**
   - Salida temprano: **¿A qué hora salió?**
   - Salir en medio turno: **Salió a las** y **Regresó a las**.
4. Elige el **Motivo** (por ejemplo **Visita al médico**).
5. Revisa **Horas no trabajadas**: Se reponen (tiempo por tiempo), Se descuentan o Se pagan. Si tiene 🔒, lo fija el motivo.
6. Revisa la línea morada que explica el efecto, por ejemplo «2 h no trabajadas · se reponen · Día con goce · 2 h a su cuenta de horas».
7. Toca **Guardar**.

![Reloj del día con Salida temprano, motivo Visita al médico y las horas no trabajadas](/ayuda/capturas/asistencias/reloj-del-dia-permiso-del-dia.webp "El reloj ajusta la checada a la hora del permiso y explica cómo se paga el día")

> **Consejo:** al poner la hora del permiso, el reloj ajusta las checadas a esa hora (la original queda como «reloj: 4:00 p.m.») y el motivo del renglón queda en **Por el permiso del día**. Si cambias de tipo, las checadas regresan a como estaban.

## Qué significa cada opción de horas no trabajadas

| Opción | Qué pasa en nómina |
|---|---|
| Se reponen (tiempo por tiempo) | El día se paga completo y las horas van a su **cuenta de horas por reponer** |
| Se descuentan | El día se paga, menos las horas que faltó («Horas no trabajadas») |
| Se pagan | El día se paga completo y no debe nada |

Las horas por reponer se controlan en [Cómo controlar las horas por reponer](/ayuda/asistencias/horas-por-reponer).

## Cómo quitar un permiso del día

1. Abre el reloj del día.
2. En **Qué pasó**, regresa a **Asistencia**.
3. Toca **Guardar**.

El día vuelve a medirse con su horario: si llegó tarde o salió antes, se marcará como retardo o salida antes.

## Preguntas frecuentes

### ¿Qué pasa si elijo el tipo pero no el motivo?

No hay permiso: «Sin motivo no hay permiso: cuenta como retardo o salida antes, como siempre.».

### ¿Se cuenta todo el tiempo del permiso o solo lo que faltó?

Lo que realmente faltó según sus checadas, sin pasar del permiso. Si llegó más tarde de lo que permitía el permiso, lo de más cuenta como retardo normal.

### El día ya tenía un permiso de una solicitud aprobada, ¿lo puedo cambiar?

Sí. Verás «Viene de la solicitud #… aprobada en Permisos; si lo cambias aquí, se corrige solo este día.».

### ¿Por qué el goce del día dice «🔒 Con goce»?

Porque con un permiso parcial con motivo el día siempre es con goce. Lo que cambia es el trato de las horas no trabajadas.

## Qué pasa si…

- **…la persona no tiene checadas:** verás «Si no vino, elige «Inasistencia» o un día de ley en «Qué pasó», o carga sus horas.».
- **…la hora del permiso no deja minutos sin trabajar dentro de su jornada:** el campo se marca en rojo y no puedes guardar hasta corregirla.
- **…el día está en una nómina autorizada:** no se puede guardar.

## Relacionado

- [Cómo corregir la checada de un día](/ayuda/asistencias/corregir-checada-del-dia)
- [Permisos por horas: llegar tarde, salir antes o salir y regresar](/ayuda/permisos/permisos-por-horas)
- [Cómo controlar las horas por reponer](/ayuda/asistencias/horas-por-reponer)
- [Tipos de registro y motivos](/ayuda/asistencias/tipos-de-registro)
