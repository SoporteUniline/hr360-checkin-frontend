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

## Paso a paso: mandar un equipo a revisión

1. En **Inicio**, toca **En revisión o mantenimiento** (o, en la ficha del artículo, `Enviar a revisión`).
2. Toca `Registrar mantenimiento`.
3. Elige el **Artículo disponible** y la **Cantidad**, escribe el **Motivo**, el **Proveedor o responsable** y el **Regreso previsto**.
4. Guarda. Mientras esté en revisión, ese equipo no está disponible para entregarse.

![Revisión y mantenimiento](/ayuda/capturas/activos/revision-y-mantenimiento.webp "Equipos fuera de disponibilidad")

## Paso a paso: concluir la revisión

1. En la lista, toca `Concluir`.
2. Elige el **Resultado**: **Reparado → disponible** o **No reparable → baja definitiva**.
3. Escribe el **Costo (MXN)** si hubo y el **Trabajo realizado / motivo**.
4. Toca `Guardar resultado`. La disponibilidad se actualiza sola.

## Paso a paso: atender solicitudes del personal

Las personas piden atención desde su app (o RH la registra por ellas con `Registrar solicitud`). Cada solicitud tiene **Tipo** (Falla de equipo, Cambio de talla, Reposición u Otro), descripción y estado **Pendiente** o **Atendida**.

1. En **Inicio**, toca **Solicitudes del personal**.
2. Toca `Atender` en la solicitud.
3. Escribe la **Respuesta / resolución** y guarda. Queda como **Atendida**.

> **Importante:** Responder una solicitud **no cambia existencias**. Registra la entrega o la devolución correspondiente cuando ocurra.

## Paso a paso: consultar el historial

1. En **Inicio**, toca **Historial**.
2. Busca por artículo, persona o referencia y filtra por **Tipo de movimiento**.
3. `Exportar CSV` descarga los movimientos.

## Preguntas frecuentes

### ¿Un equipo en revisión cuenta como disponible?

No. Pasa a **En revisión** y regresa a disponible solo cuando concluyes la revisión como reparado.

### ¿La persona ve la respuesta a su solicitud?

Sí, en su app, en **Mis activos y uniformes**.

## Relacionado

- [Activos y uniformes: qué hay y quién lo tiene](/ayuda/activos)
- [Cómo registrar artículos en el inventario](/ayuda/activos/inventario)
- [Mis activos y uniformes (para empleados)](/ayuda/activos/mis-activos-y-uniformes)
