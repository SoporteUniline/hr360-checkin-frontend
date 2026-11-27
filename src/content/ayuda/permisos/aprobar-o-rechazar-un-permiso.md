---
titulo: Cómo aprobar o rechazar un permiso o unas vacaciones
resumen: Aprueba o rechaza en un clic las solicitudes pendientes; al aprobar, los días quedan marcados en Asistencias con su tipo, motivo y goce.
modulo: permisos
audiencia: [rh, dueno]
pantallas: [/panel/permisos]
palabras: [aprobar permiso, rechazar permiso, autorizar, solicitud pendiente, vacaciones, estado, aprobado, rechazado, goce]
orden: 20
actualizado: 2026-11-27
fuentes: [src/app/panel/permisos/page.jsx, src/app/panel/permisos/PermisosTable.jsx, src/app/panel/permisos/PermisoDialog.jsx]
---

## Para qué sirve

Cuando un empleado pide un permiso o vacaciones, o RH registra uno, queda **Pendiente**. Al **aprobarlo**, el sistema marca esos días en Asistencias (con su tipo, motivo y goce) y, si son vacaciones, los descuenta del saldo. Al **rechazarlo**, no pasa nada en Asistencias.

## Quién la usa

Recursos Humanos y el dueño. Los jefes aprueban a su equipo en [Solicitudes de mi equipo](/ayuda/solicitudes-equipo/aprobar-solicitudes-de-mi-equipo).

## Antes de empezar

Entra a **Ausencias y permisos → Permisos**. Toca el contador **Pendientes** o filtra la columna Estado para ver solo lo que falta decidir.

## Cómo aprobar o rechazar rápido

En la fila de un permiso **Pendiente** verás dos botones:

1. **✓ (Aprobar)**: verás «Permiso aprobado».
2. **✕ (Rechazar)**: verás «Permiso rechazado».

![Tabla de permisos con los botones Aprobar y Rechazar en los pendientes](/ayuda/capturas/permisos/permisos-tabla.webp "Los pendientes tienen los botones ✓ y ✕ en la columna Acciones")

## Cómo aprobar eligiendo el goce

Si el motivo permite cambiar el goce y quieres decidirlo al aprobar:

1. Toca el lápiz (**Editar**).
2. Revisa el **Goce del día**.
3. En **Estado** elige **Aprobado**.
4. Toca **Guardar**.

## Qué pasa al aprobar

- **Permiso por días:** cada día del rango (también los futuros) queda en Asistencias con el tipo, el motivo y el goce. No se duplican días.
- **Vacaciones:** además se descuentan del saldo de la persona.
- **Permiso por horas:** no marca el día completo; el reloj del día lo usa para no contar el retardo o la salida antes, y sus horas se reponen, se descuentan o se pagan. Ver [Permisos por horas](/ayuda/permisos/permisos-por-horas).

## Preguntas frecuentes

### ¿Puedo cambiar un permiso aprobado a rechazado?

No. Un permiso aprobado solo se puede **Cancelar**. Ver [Cómo cancelar un permiso aprobado](/ayuda/permisos/cancelar-un-permiso).

### ¿Puedo regresar un rechazado a pendiente?

Sí: edítalo y en **Estado** elige **Pendiente**, y guarda.

### ¿Quién puede aprobar?

Recursos Humanos y el dueño desde aquí, y el jefe que autoriza permisos o vacaciones de esa persona desde [Solicitudes de mi equipo](/ayuda/solicitudes-equipo/aprobar-solicitudes-de-mi-equipo).

## Qué pasa si…

- **…algún día del permiso está en una nómina autorizada:** no se puede aprobar, rechazar ni cambiar; el dueño debe cancelar esa nómina primero.
- **…otra persona ya lo decidió:** la tabla se actualiza; si intentas cambiarlo verás el error del servidor.
- **…no se puede guardar:** verás «No se pudo actualizar el permiso».

## Relacionado

- [Cómo registrar un permiso](/ayuda/permisos/registrar-un-permiso)
- [Cómo cancelar un permiso aprobado](/ayuda/permisos/cancelar-un-permiso)
- [Cómo aprobar las solicitudes de mi equipo](/ayuda/solicitudes-equipo/aprobar-solicitudes-de-mi-equipo)
- [Panel de vacaciones](/ayuda/vacaciones/panel-de-vacaciones)
