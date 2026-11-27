---
titulo: Cómo revisar y resolver incidencias antes de la prenómina
resumen: El Centro de incidencias junta por persona las faltas, retardos, checadas incompletas, horas extra por autorizar y conflictos del periodo para que las resuelvas antes de pagar.
modulo: incidencias
audiencia: [rh, dueno]
pantallas: [/panel/incidencias]
palabras: [incidencias, centro de incidencias, prenómina, faltas, retardos, sin salida, sin entrada, horas extra, conflicto, vacaciones, quincena, revisar, motivo de la corrección]
orden: 10
actualizado: 2026-11-27
fuentes: [src/app/panel/incidencias/page.jsx, src/lib/asistencia/horasExtra.mjs, src/components/asistencia/CampoMotivo.jsx, src/lib/asistencia/motivoCorreccion.mjs]
---

## Para qué sirve

Antes de pagar una quincena conviene revisar que todo esté en orden. El **Centro de incidencias** te muestra, por persona, todo lo que necesita atención en el periodo:

| Incidencia | Qué significa |
|---|---|
| Falta | Sin asistencia válida para el día |
| Retardo | Entrada posterior al horario programado |
| Sin salida | Hay entrada pero falta la salida |
| Sin entrada | Hay salida pero falta la entrada |
| H. extra | Tiempo trabajado de más, por autorizar |
| Conflicto | Tiene vacaciones y también una checada registrada |

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

- Entra a **Control de tiempo → Centro de incidencias**.
- Si vas a corregir una entrada o una salida, ten a la mano el **motivo de la corrección**: es obligatorio.

## Cómo elegir el periodo

1. Arriba a la derecha toca el botón del periodo.
2. Elige **1ª quincena**, **2ª quincena**, **Este mes** o **Últimos 7 días**, o escribe **Desde** y **Hasta**.

## Cómo leer la pantalla

![Centro de incidencias con los contadores, los filtros y una fila por empleado](/ayuda/capturas/incidencias/centro-de-incidencias.webp "Una fila por persona con sus faltas, retardos, horas extra y estado")

- **Contadores:** Empleados, Incidencias totales, Por revisar y Listos para prenómina.
- **Filtros:** Todos, Revisar, Faltas, Retardos, H. extra, Vacaciones, Permisos, Festivos y Listos. También **Unidad de negocio** (si tienes varias), **Buscar empleado...** y **Limpiar**.
- **Tabla:** cada persona con Días, Faltas, Retardos, H. extra, Vacaciones, Permisos, Festivos, Incidencias y su **Estado** (Pendiente, Revisar o Listo).

## Cómo resolver las incidencias de una persona

1. Toca la fila de la persona. Se despliega «Incidencias de …» con cada día: fecha, tipo de incidencia, horario, entrada, salida y nota.
2. Según el caso:
   - **Sin salida / Sin entrada / Retardo:** corrige la **Entrada** o la **Salida**. Debajo del renglón aparece **Motivo de la corrección (obligatorio)**: escríbelo o toca una sugerencia (**Olvidó checar**, **Falla del reloj**, **Error de captura**…). Si quieres, escribe una **Nota**. Toca **Guardar**. El cambio se guarda en Asistencias, queda marcado como corrección y el historial guarda tu nombre, la hora, lo de antes y lo de después, y el motivo.
   - **H. extra:** toca **Autorizar** o **No autorizar**.
   - **Falta o Conflicto:** toca **Revisar** o **Abrir en Asistencias** para decidirlo en el reloj del día.

![Incidencias de una persona desplegadas con los botones Autorizar, No autorizar y Revisar](/ayuda/capturas/incidencias/incidencias-detalle.webp "Cada incidencia se resuelve en su renglón o se abre en Asistencias")

![Renglón con la entrada corregida y el campo Motivo de la corrección con sus sugerencias](/ayuda/capturas/incidencias/incidencias-motivo.webp "Al cambiar la entrada o la salida aparece el motivo; sin él no se guarda")

> **Consejo:** para marcar una falta como justificada, vacaciones o incapacidad, abre el día en Asistencias. Ver [Cómo marcar qué pasó un día sin checadas](/ayuda/asistencias/que-paso-y-motivo).

## Cómo autorizar horas extra de varias personas

1. Marca las casillas de las personas (o la del encabezado para todas).
2. Aparece la barra con «N empleados seleccionados».
3. Toca **Autorizar H. extra**. Si ninguna tiene horas por autorizar verás «Los empleados seleccionados no tienen horas extra pendientes.».

En esa misma barra puedes **Exportar** la selección o **Cancelar selección**.

## Cómo exportar

Toca **Exportar vista a Excel** (abajo de la tabla) para descargar lo que estás viendo con sus filtros.

## Cómo saber si el periodo está listo

Cuando ya no hay incidencias pendientes, el botón **Preparar prenómina** se activa. Al tocarlo te confirma «Periodo listo para preparar prenómina.». Mientras haya pendientes, el botón dice cuántas faltan al pasar el mouse.

## Preguntas frecuentes

### ¿Qué significa «Listo»?

Que esa persona no tiene incidencias pendientes en el periodo.

### ¿Qué pasa si toco «No autorizar» en una hora extra?

Se paga su jornada programada, no el tiempo de más. La checada del reloj se conserva.

### ¿Por qué me pide un motivo?

Toda corrección de checadas pide motivo: así cualquiera puede ver después por qué se cambió la hora. Debe tener entre 5 y 500 letras. Si solo cambias la **Nota**, no lo pide.

### ¿Las vacaciones son una incidencia?

Solo si además tiene una checada ese día (Conflicto). Si no, aparecen como informativas en el filtro Vacaciones.

## Qué pasa si…

- **…el día está en una nómina autorizada:** no se puede corregir.
- **…tocas Guardar sin motivo:** no se guarda y junto al campo verás «Escribe el motivo de la corrección.». Si es muy corto: «El motivo debe tener al menos 5 letras.».
- **…falla el guardado:** verás «No se pudo actualizar el registro.».
- **…no se pueden cargar las incidencias:** verás «No se pudieron cargar las incidencias.».

## Relacionado

- [Cómo corregir la checada de un día](/ayuda/asistencias/corregir-checada-del-dia)
- [Cómo autorizar o no las horas extra del día](/ayuda/asistencias/autorizar-horas-extra)
- [Cómo marcar qué pasó un día sin checadas](/ayuda/asistencias/que-paso-y-motivo)
- [Cómo generar el reporte de horas](/ayuda/reporte-horas/generar-reporte-de-horas)
- [Cómo crear y calcular una nómina](/ayuda/nomina/crear-y-calcular-nomina)
