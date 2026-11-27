---
titulo: Revisión y mantenimiento, solicitudes del personal e historial
resumen: Manda equipos a revisión y registra el resultado, atiende las solicitudes de fallas, cambios de talla y reposiciones, y consulta todos los movimientos del inventario.
modulo: activos
audiencia: [rh, dueno]
pantallas: [/panel/activos]
palabras: [revisión, mantenimiento, reparación, proveedor, solicitudes, falla de equipo, cambio de talla, reposición, historial, movimientos, csv]
orden: 30
actualizado: 2026-11-27
fuentes: [src/components/activos/Operations.jsx, src/components/activos/Overview.jsx]
---

## Para qué sirve

Desde **Inicio** llegas a tres listas de seguimiento:

- **Revisión y mantenimiento:** equipos fuera de disponibilidad hasta concluir su revisión.
- **Solicitudes e incidencias:** fallas, cambios de talla y reposiciones que pide el personal.
- **Historial:** todas las entradas, entregas, devoluciones, ajustes y sus responsables.

## Quién la usa

Recursos Humanos, el dueño y los usuarios con acceso al módulo.

## Antes de empezar

- El módulo **Activos y uniformes** debe estar activo y el artículo debe estar en el [inventario](/ayuda/activos/inventario).
- Solo puedes mandar a revisión artículos activos con existencias disponibles.

## Cómo mandar un equipo a revisión

1. En **Inicio**, toca **En revisión o mantenimiento** (o, en la ficha del artículo, `Enviar a revisión`).
2. Toca `Registrar mantenimiento`.
3. Elige el **Artículo disponible** y la **Cantidad**, escribe el **Motivo**, el **Proveedor o responsable** y el **Regreso previsto**.
4. Guarda. Mientras esté en revisión, ese equipo no está disponible para entregarse.

![Revisión y mantenimiento](/ayuda/capturas/activos/revision-y-mantenimiento.webp "Equipos fuera de disponibilidad")

## Cómo concluir la revisión

1. En la lista, toca `Concluir`.
2. Elige el **Resultado**: **Reparado → disponible** o **No reparable → baja definitiva**.
3. Escribe el **Costo (MXN)** (0 si no costó nada) y el **Trabajo realizado / motivo**.
4. Toca `Guardar resultado`. La disponibilidad se actualiza sola.

## Cómo atender las solicitudes del personal

Las personas piden atención desde su app (o RH la registra por ellas con `Registrar solicitud`). Cada solicitud tiene **Tipo** (Falla de equipo, Cambio de talla, Reposición u Otro), descripción y estado **Pendiente** o **Atendida**.

1. En **Inicio**, toca **Solicitudes del personal**.
2. Toca `Atender` en la solicitud.
3. Escribe la **Respuesta / resolución** y guarda. Queda como **Atendida**.

> **Importante:** Responder una solicitud **no cambia existencias**. Registra la entrega o la devolución correspondiente cuando ocurra.

## Cómo consultar el historial

1. En **Inicio**, toca **Historial**.
2. Busca por artículo, persona o referencia y filtra por **Tipo de movimiento**.
3. `Exportar CSV` descarga los movimientos.

## Preguntas frecuentes

### ¿Un equipo en revisión cuenta como disponible?

No. Pasa a **En revisión** y regresa a disponible solo cuando concluyes la revisión como reparado.

### ¿La persona ve la respuesta a su solicitud?

Sí, en su app, en **Mis activos y uniformes**.

## Qué pasa si…

- **…el artículo no aparece en «Artículo disponible»:** no tiene existencias disponibles (todo está entregado o ya en revisión) o está inactivo.
- **…escribes una cantidad mayor a la disponible:** el campo no lo acepta; el máximo es lo que hay disponible.
- **…el equipo no se pudo reparar:** concluye la revisión con **No reparable → baja definitiva**. Ya no regresa a disponible y queda en el historial.

## Relacionado

- [Activos y uniformes: qué hay y quién lo tiene](/ayuda/activos)
- [Cómo registrar artículos en el inventario](/ayuda/activos/inventario)
- [Mis activos y uniformes (para empleados)](/ayuda/activos/mis-activos-y-uniformes)
