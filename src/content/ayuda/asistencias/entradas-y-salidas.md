---
titulo: Cómo consultar y corregir entradas y salidas
resumen: Entradas y salidas muestra cada checada (cada tramo de entrada y salida) tal como llegó del reloj, con su hora corregida si alguien la ajustó, y permite exportarlas a Excel.
modulo: asistencias
audiencia: [rh, dueno]
pantallas: [/panel/registro-de-entradas-y-salidas]
palabras: [entradas y salidas, checadas, movimientos, reloj, registros hoy, jornadas completas, pendientes, entrada corregida, salida corregida, exportar]
orden: 110
actualizado: 2026-11-27
fuentes: [src/app/panel/registro-de-entradas-y-salidas/page.jsx, src/app/panel/registro-de-entradas-y-salidas/EntradasSalidasTable.jsx, src/app/panel/registro-de-entradas-y-salidas/EntradasSalidasRow.jsx, src/app/panel/registro-de-entradas-y-salidas/EntradasDetalleSheet.jsx, src/app/panel/registro-de-entradas-y-salidas/EntradasSalidasDataContainer.jsx, src/hooks/useEntradaSalida.js, src/components/Clock/LocalClockRows.jsx]
---

## Para qué sirve

**Entradas y salidas** es la lista de **cada checada** del reloj: cada tramo con su hora de entrada, su hora de salida y su estado. A diferencia de Asistencias (un renglón por persona y día), aquí ves **cada movimiento**: si alguien salió a comer y regresó, verás dos renglones.

Úsala para revisar qué marcó exactamente el reloj, ver quién sigue con una entrada abierta y exportar las checadas.

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

Entra a **Control de tiempo → Entradas y salidas**.

## Cómo leer la pantalla

![Entradas y salidas con los contadores, los filtros y la lista de checadas](/ayuda/capturas/asistencias/entradas-y-salidas.webp "Cada renglón es un tramo: entrada, salida, horas corregidas y horas del registro")

**Contadores:**

- **Registros hoy** (o **Registros** si eliges otro rango): cuántos tramos hay.
- **Empleados únicos**: cuántas personas checaron.
- **Jornadas completas**: tramos con al menos la jornada mínima que configuraste.
- **Pendientes**: tramos que siguen abiertos (sin salida). Solo se muestra cuando ves hoy.

**Filtros:** **Empleado** (buscar), **Rango de fechas**, **Agrupar por** (Sin agrupar, Unidad de negocio, Departamento o Estado), **Columnas** y **Limpiar**.

**Columnas:** Empleado (con su puesto), Unidad de negocio, Departamento, Fecha de entrada, Hora entrada, Hora salida, Entrada corregida, Salida corregida, Hrs registro (horas del tramo) y Acciones. El estado es **Abierto** (sin salida) o **Cerrado**.

> **Consejo:** la jornada mínima para contar una «jornada completa» se configura en [Configuración del checador](/ayuda/reloj-checador/configuracion-del-checador).

## Cómo ver el detalle de un registro

Toca el renglón. Se abre a la derecha el **Detalle del registro** con el empleado, su puesto, departamento, fecha, horas, estado y si fue **Corregido**. Desde ahí puedes tocar **Corregir horario**.

## Cómo corregir la hora de un tramo

1. Toca el lápiz (**Editar**) en la columna Acciones, o **Corregir horario** en el detalle.
2. Escribe la **Entrada corregida** o la **Salida corregida**.
3. Toca **Guardar** (o **Cancelar**).

Verás «Movimiento de checador actualizado correctamente.». La hora original del reloj se conserva y la corregida aparece en su columna.

> **Importante:** para corregir un **día completo** (agregar checadas, anular duplicadas, comida, hora extra o permisos) con motivo e historial, usa el reloj del día en Asistencias: [Cómo corregir la checada de un día](/ayuda/asistencias/corregir-checada-del-dia).

## Cómo exportar a Excel

1. Elige el rango de fechas y los filtros.
2. Toca **Exportar Excel**.

Se descarga un archivo con nombre, apellidos, puesto, departamento, fechas, horas de entrada y salida, horas corregidas, horas del registro y estado.

## Preguntas frecuentes

### ¿Por qué una persona tiene varios renglones el mismo día?

Porque cada salida y su regreso son tramos distintos (por ejemplo, salió a comer y volvió).

### ¿Qué son las «Capturas en este dispositivo · Requiere revisión»?

Son checadas que se guardaron en ese mismo aparato cuando no había internet y todavía no se confirmaron en el servidor. RH puede revisar la hora original. No se suman a los contadores ni a la exportación. Ver [El reloj y la conexión a internet](/ayuda/reloj-checador/reloj-sin-conexion).

### ¿Dónde veo las checadas de un empleado por días?

En [Asistencias](/ayuda/asistencias/revisar-asistencias), que junta los tramos de cada día.

## Qué pasa si…

- **…el día de esa checada está en una nómina autorizada:** no se puede corregir; el dueño debe cancelar esa nómina primero.
- **…no se pueden cargar los registros:** verás «Error al cargar los registros de entradas y salidas».
- **…el servidor no responde pero hay capturas en el dispositivo:** verás «No se pudo actualizar el servidor. Se muestran las capturas de este dispositivo.».

## Relacionado

- [Cómo corregir la checada de un día](/ayuda/asistencias/corregir-checada-del-dia)
- [Cómo revisar y exportar las asistencias de un periodo](/ayuda/asistencias/revisar-asistencias)
- [Configuración del checador: tolerancias y jornada mínima](/ayuda/reloj-checador/configuracion-del-checador)
