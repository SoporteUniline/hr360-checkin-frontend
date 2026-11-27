---
titulo: Cómo cancelar un permiso o unas vacaciones ya aprobadas
resumen: Al cancelar un permiso aprobado, los días futuros vuelven a la normalidad y para los días que ya pasaron eliges qué tipo de registro les queda.
modulo: permisos
audiencia: [rh, dueno]
pantallas: [/panel/permisos]
palabras: [cancelar permiso, cancelar vacaciones, días pasados, regresó antes, permiso aprobado, sin checar, tipo de registro]
orden: 40
actualizado: 2026-11-27
fuentes: [src/app/panel/permisos/PermisoDialog.jsx, src/app/panel/permisos/PermisoCancelacionDiasPasadosDialog.jsx, src/app/panel/permisos/PermisoDeleteDialog.jsx]
---

## Para qué sirve

A veces un permiso o unas vacaciones aprobadas ya no se usan completos: la persona regresó antes o se cambió la fecha. **Cancelar** deja constancia y regresa los días a la normalidad.

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

Entra a **Ausencias y permisos → Permisos** y busca el permiso.

## Cómo cancelar un permiso aprobado

1. Toca el lápiz (**Editar**) en la fila.
2. En **Estado** elige **Cancelado** (en un aprobado es la única opción).
3. Si el permiso tiene **días que ya pasaron**, se abre «Cancelar permiso: definir días pasados» (ver abajo).
4. Toca **Guardar**.

Los días de **hoy en adelante** vuelven solos a «Sin checar» (respetando descansos y festivos): si la persona checa, cuentan como asistencia normal.

## Qué hacer con los días que ya pasaron

Para que Asistencias quede consistente, debes decir qué tipo de registro queda en cada día que ya transcurrió:

1. Elige una opción:
   - **Aplicar a todos los días pasados**: un mismo tipo para todos.
   - **Selección día por día**: un tipo para cada fecha.
2. Elige el tipo de registro en **Selecciona un tipo...**.
3. Toca **Confirmar selección** (o **Volver** para no cancelar).
4. De regreso en el permiso, toca **Guardar**.

Verás «Días pasados configurados. Ahora guarda para cancelar.» antes de guardar.

## Cancelar o eliminar

- **Cancelar** deja el permiso en la lista con estado **Cancelado**: queda la constancia.
- **Eliminar** (bote de basura) lo borra. Úsalo solo para errores de captura.

## Preguntas frecuentes

### ¿Se le regresan los días de vacaciones?

Sí: al cancelar, los días que dejan de ser vacaciones ya no cuentan como tomados.

### ¿Un permiso por horas también pide días pasados?

No. Un permiso por horas no marca días en Asistencias; se cancela directo y deja de contar en su cuenta de horas.

### ¿El empleado puede cancelar su solicitud?

Desde su app puede editar una solicitud pendiente. Para cancelar una aprobada, debe pedirlo a Recursos Humanos.

## Qué pasa si…

- **…cierras la ventana de días pasados sin confirmar:** el permiso no se cancela.
- **…no eliges el tipo para algún día:** verás «Falta información» y «Selecciona un tipo de registro para todos los días pasados.».
- **…algún día está en una nómina autorizada:** no se puede cancelar; el dueño debe cancelar esa nómina primero.

## Relacionado

- [Cómo aprobar o rechazar un permiso](/ayuda/permisos/aprobar-o-rechazar-un-permiso)
- [Cómo registrar un permiso](/ayuda/permisos/registrar-un-permiso)
- [Cómo marcar qué pasó un día sin checadas](/ayuda/asistencias/que-paso-y-motivo)
