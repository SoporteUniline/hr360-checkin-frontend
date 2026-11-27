---
titulo: Cómo asignar empleados a un turno
resumen: Elige qué personas trabajan con cada turno; desde ese momento el sistema mide sus entradas, salidas y horas con ese horario.
modulo: turnos
audiencia: [rh, dueno]
pantallas: [/panel/turnos]
palabras: [asignar turno, asignar empleados, cambiar turno, horario del empleado, quitar turno]
orden: 20
actualizado: 2026-11-27
fuentes: [src/app/panel/turnos/AsignarEmpleadosDialog.jsx, src/app/panel/turnos/page.jsx]
---

## Para qué sirve

Asignar un turno le dice al sistema el horario de cada persona. A partir de ese momento, su entrada, su salida, su comida y sus horas extra se miden con ese turno.

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

- El turno debe existir. Ver [Cómo crear o editar un turno](/ayuda/turnos/crear-un-turno).
- Entra a **Gestión de personal → Turnos**.

## Cómo asignar empleados

1. En la fila del turno toca **Asignar empleados** (el ícono de personas).
2. Busca con **Buscar por nombre o correo...**.
3. Marca a las personas que tendrán ese turno. Las que ya lo tienen aparecen marcadas.
4. Para quitarle el turno a alguien, desmárcalo.
5. Toca **Guardar asignación**.

Verás «Asignación del turno … actualizada correctamente».

![Ventana Asignar empleados con la búsqueda y la lista de personas](/ayuda/capturas/turnos/asignar-empleados.webp "Marca a quienes trabajan con este turno y guarda")

## Preguntas frecuentes

### ¿Desde cuándo aplica el turno?

Desde **hoy**. Los días anteriores se siguen midiendo con el horario que tenía cada persona en ese momento.

### Si le quito el turno a alguien, ¿se queda sin horario?

Quitar la asignación no borra el horario que ya tenía. Para cambiarlo, asígnale el turno correcto.

### ¿Una persona puede tener dos turnos?

No. Cada persona tiene un horario semanal. Si necesitas que trabaje tiempo adicional un día, usa un [turno extra](/ayuda/turnos-extra/programar-un-turno-extra).

## Qué pasa si…

- **…no se pueden cargar los empleados:** verás «No se pudieron cargar los empleados.».
- **…falla el guardado:** verás «No se pudieron guardar las asignaciones.»; vuelve a intentar.

## Relacionado

- [Cómo crear o editar un turno](/ayuda/turnos/crear-un-turno)
- [Cómo programar un turno extra](/ayuda/turnos-extra/programar-un-turno-extra)
- [Cómo ver quién está trabajando ahora con el Monitor](/ayuda/monitor/usar-el-monitor)
- [Cómo revisar y exportar las asistencias de un periodo](/ayuda/asistencias/revisar-asistencias)
