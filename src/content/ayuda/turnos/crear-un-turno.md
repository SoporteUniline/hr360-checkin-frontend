---
titulo: Cómo crear o editar un turno (horario)
resumen: Un turno es el horario semanal de tu gente: qué días trabaja, a qué hora entra, come y sale. Con él se calculan retardos, faltas, horas trabajadas y horas extra.
modulo: turnos
audiencia: [rh, dueno]
pantallas: [/panel/turnos]
palabras: [turno, horario, horario semanal, entrada, salida, comida, días de trabajo, matutino, vespertino, nocturno, límite legal, editar turno, eliminar turno]
orden: 10
actualizado: 2026-11-27
fuentes: [src/app/panel/turnos/page.jsx, src/app/panel/turnos/TurnoDialog.jsx, src/components/asistencia/AvisoLimiteLegal.jsx, src/lib/asistencia/limiteLegal.mjs]
---

## Para qué sirve

El **turno** dice cuándo debe trabajar cada persona: qué días, a qué hora entra, su hora de comida y a qué hora sale. Con el turno el sistema calcula:

- Si alguien llegó tarde, salió antes o faltó.
- Cuántas horas debía trabajar y cuántas trabajó.
- Cuántas horas extra hizo.

Sin turno, el sistema no tiene contra qué comparar y muestra «Sin horario».

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

Entra a **Gestión de personal → Turnos**. Si tienes varias empresas, primero elige la empresa.

![Lista de turnos con su nombre, descripción, días configurados y estado](/ayuda/capturas/turnos/turnos-lista.webp "Cada turno muestra cuántos días tiene configurados y si está activo")

## Cómo crear un turno

1. Toca **Nuevo turno**.
2. Escribe el **Nombre** (por ejemplo «Matutino») y, si quieres, una **Descripción** («Turno de oficina»).
3. En **Aplicar horario a varios días**:
   - Elige los días con los atajos **Lun–Vie**, **Lun–Sáb**, **Todos** o **Limpiar**, o tocando cada día.
   - Escribe **Entrada**, **Salida comida**, **Regreso comida** y **Salida**.
   - Toca **Aplicar horario**.
4. En **Horario por día** ajusta las excepciones (por ejemplo, el sábado sale a la 1:00 p.m. y no come). Desmarca los días que no trabaja.
5. Toca **Crear turno**.

![Ventana Nuevo turno con el horario rápido para varios días y el horario por día](/ayuda/capturas/turnos/turno-nuevo.webp "Captura el horario una vez, aplícalo a varios días y ajusta las excepciones")

> **Consejo:** si el turno no tiene comida, deja vacíos **Salida comida** y **Regreso comida**. Para turnos de noche, pon la salida aunque sea menor que la entrada (por ejemplo, 22:00 a 06:00): el sistema entiende que sale al día siguiente.

## Cómo editar un turno

1. En la fila del turno toca el lápiz (**Editar turno**).
2. Cambia lo necesario.
3. Toca **Guardar cambios**.

El cambio aplica **desde hoy** a todas las personas que tienen ese turno. Los días anteriores se siguen midiendo con el horario que tenían.

## Cómo eliminar un turno

1. Toca el bote de basura (**Eliminar turno**).
2. Confirma con **Eliminar turno**.

Si el turno tiene empleados asignados no se puede eliminar: «No se puede eliminar este turno porque tiene empleados asignados. Quita o cambia el turno de esos empleados antes de eliminarlo.».

## El aviso del límite legal

Si el horario suma más horas a la semana que el límite legal de ese año, verás un aviso como «Este horario suma 48 h a la semana y el límite legal de 2027 es 46 h. Las horas de más se cuentan como extra.». Es solo un aviso: puedes guardar, pero esas horas se contarán como extra.

## Preguntas frecuentes

### ¿Cómo asigno el turno a mis empleados?

Con el botón **Asignar empleados** de la fila. Ver [Cómo asignar empleados a un turno](/ayuda/turnos/asignar-empleados-a-un-turno).

### ¿El horario incluye la comida?

Sí. Las horas programadas de un día son de la entrada a la salida, **menos** la comida. La comida no se paga.

### ¿Puedo programar un cambio de turno para la próxima semana?

No. Los cambios aplican desde hoy. Haz el cambio el día que empiece el nuevo horario.

## Qué pasa si…

- **…no activas ningún día:** verás «Activa al menos un día para el turno.».
- **…un día activo no tiene entrada o salida:** verás «Captura al menos la hora de entrada y salida.».
- **…el nombre ya existe:** «Ya existe un turno con ese nombre en esta empresa. Usa otro nombre.».
- **…tocas Aplicar horario sin días elegidos:** «Selecciona al menos un día para aplicar el horario.».

## Relacionado

- [Cómo asignar empleados a un turno](/ayuda/turnos/asignar-empleados-a-un-turno)
- [Cómo programar un turno extra](/ayuda/turnos-extra/programar-un-turno-extra)
- [Configuración del checador: tolerancias y jornada mínima](/ayuda/reloj-checador/configuracion-del-checador)
- [Cómo revisar las horas de la semana contra el límite de la ley](/ayuda/asistencias/horas-de-ley)
