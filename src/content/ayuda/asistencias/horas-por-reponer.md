---
titulo: Cómo controlar las horas por reponer
resumen: Quien tiene permisos por horas que «se reponen» acumula horas que debe. Aquí ves cuánto debe cada persona y registras su reposición, la rebajas en nómina o la condonas.
modulo: asistencias
audiencia: [rh, dueno]
pantallas: [/panel/registro-asistencia]
palabras: [horas por reponer, cuenta de horas, debe horas, reposición, tiempo por tiempo, rebajar en nómina, condonar, deshacer, permiso por horas]
orden: 90
actualizado: 2026-11-27
fuentes: [src/app/panel/registro-asistencia/horas-reponer/VistaHorasReponer.jsx, src/app/panel/registro-asistencia/horas-reponer/DialogosReponer.jsx, src/app/panel/registro-asistencia/horas-reponer/DetalleCuentaReponer.jsx, src/lib/asistencia/horasPorReponer.mjs, src/lib/asistencia/permisoHoras.mjs]
---

## Para qué sirve

Cuando alguien tiene un **permiso por horas** (llegar tarde, salir antes o salir y regresar) y se decidió que **se repone**, esas horas van a su **cuenta de horas**: las debe. La pestaña **Horas por reponer** te dice quién debe, cuánto, desde cuándo y qué hacer:

- **Registrar reposición**: se quedó a trabajar otro día para pagarlas.
- **Rebajar en nómina**: se le descuentan.
- **Condonar**: se le perdonan.

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

- Entra a **Control de tiempo → Asistencias** y toca la pestaña **Horas por reponer**. El número azul en la pestaña dice cuántas personas deben.
- Las horas llegan aquí desde [Permisos por horas](/ayuda/permisos/permisos-por-horas) que se reponen y desde [permisos del día](/ayuda/asistencias/permiso-del-dia) con «Se reponen».

## Cómo leer la pantalla

![Pestaña Horas por reponer con el resumen y una fila por persona que debe](/ayuda/capturas/asistencias/horas-por-reponer.webp "Arriba el resumen; abajo cada persona con lo que debe y sus acciones")

**Resumen:**

- **Total que te deben**: suma de horas y entre cuántas personas.
- **Más de 30 días**: cuántas personas deben desde hace más de 30 días (en rojo si hay alguien).
- **Repuesto este mes** y **Rebajado / condonado** este mes.

**Filtros:** **Buscar persona…** (nombre o área), **Todas las áreas**, **Solo más de 30 días** y **Exportar Excel** (exporta lo filtrado).

**Tabla:** Persona y área, **Debe**, **Desde** (con «hace N días», en rojo desde 30), **Por qué** (cuántos permisos y sus motivos), **Lo último** (su última reposición) y **Acciones**.

## Cómo ver los movimientos de una persona

Toca la fila. Se despliegan:

- **Movimientos de su cuenta**, del más viejo al más nuevo: cargos por permisos, reposiciones y cierres. Cada permiso tiene **Cancelar** y cada cierre **Deshacer**.
- El **Saldo**.
- **Qué hacer con lo que debe**: los tres caminos explicados abajo.

## Cómo registrar una reposición

Ejemplo: Mariana debe 3 h y el jueves se quedó de 6:00 p.m. a 8:00 p.m. para reponer.

1. En su fila toca **Registrar reposición**.
2. En **Día** elige la fecha en que repuso. Abajo verás su jornada de ese día y hasta qué hora checó.
3. En **De** y **A** pon el horario que se quedó.
4. Escribe el **Motivo** y elige **¿Quién autoriza?**.
5. Toca **Registrar 2 h** (el botón dice el tiempo).

Se guarda como horas extra «Reposición de tiempo por tiempo»: **no se paga** y baja de su cuenta.

![Ventana Registrar reposición con el día, las horas, el motivo y quién autoriza](/ayuda/capturas/asistencias/horas-por-reponer-registrar.webp "La reposición se registra con día, horas, motivo y quién autoriza")

## Cómo rebajar en nómina

1. En su fila toca **⋯** y elige **Rebajar en nómina**.
2. Indica las **Horas** y **Minutos** (por omisión, todo lo que debe).
3. Si quieres, escribe una **Nota (opcional)**.
4. Toca **Rebajar en nómina**.

Se descuenta en la nómina del periodo de hoy (si ya está autorizada, en la siguiente) como «Horas no repuestas», con la misma tarifa por hora que las horas sin goce, y deja de contar en su cuenta. En los movimientos verás en qué nómina va: «Se descontará en la próxima nómina», «Va en la nómina del … (borrador)» o «Descontado en la nómina del …».

## Cómo condonar

1. En su fila toca **⋯** y elige **Condonar**.
2. Indica cuánto tiempo se le perdona.
3. En **Motivo** escribe por qué se le perdona.
4. Toca **Condonar**.

Deja de contar en su cuenta. Queda en el historial con quién y cuándo.

## Cómo deshacer un cierre o cancelar un permiso

- **Deshacer**: en los movimientos, junto al rebaje o la condonación. La cuenta vuelve a como estaba.
- **Cancelar** un permiso: en los movimientos, junto al permiso. Te pide confirmar («Sí, cancelar permiso») y deja de contar en su cuenta.

## Preguntas frecuentes

### ¿Desde cuándo se reponen las horas?

No hay plazo: la cuenta se lleva hasta que RH cierra lo que falte. Por eso existe el aviso de «Más de 30 días».

### ¿Se puede reponer el mismo día?

Sí. Si ese mismo día trabajó de más, lo repuesto se descuenta solo del cargo de ese día.

### ¿Lo que se repone se paga como hora extra?

No. La reposición no es hora extra: no se paga y no cuenta en el tope de horas extra.

### ¿Dónde ve el empleado lo que debe?

En el **Inicio** de su app, en la tarjeta **Tiempo por reponer**; con **Ver de dónde sale** ve sus movimientos. Si no debe nada dice «No debes tiempo».

## Qué pasa si…

- **…ese día está en una nómina autorizada:** no se puede registrar la reposición ni cancelar el permiso.
- **…el rebaje ya está en una nómina por autorizar o autorizada:** ya no se ofrece **Deshacer**.
- **…intentas cerrar más de lo que debe:** verás «No puede pasar de …».
- **…eliges un día que aún no pasa:** verás «No puede ser un día que aún no pasa.».
- **…nadie debe horas:** verás «Nadie debe horas. Cuando un permiso por horas se repone, aparece aquí.».

## Relacionado

- [Permisos por horas: llegar tarde, salir antes o salir y regresar](/ayuda/permisos/permisos-por-horas)
- [Cómo registrar que alguien llegó tarde o salió antes con permiso](/ayuda/asistencias/permiso-del-dia)
- [Cómo autorizar o no las horas extra del día](/ayuda/asistencias/autorizar-horas-extra)
- [Cómo calcula ADAMIA la nómina](/ayuda/nomina/como-se-calcula-la-nomina)
