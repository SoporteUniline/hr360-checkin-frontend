---
titulo: Permisos por horas: llegar tarde, salir antes o salir y regresar
resumen: Registra permisos de unas horas en un solo día; el tiempo que la persona no trabaje se repone (va a su cuenta de horas), se descuenta o se paga.
modulo: permisos
audiencia: [rh, dueno, jefe, empleado]
pantallas: [/panel/permisos]
palabras: [permiso por horas, llega tarde, sale antes, sale y regresa, unas horas, reponer, rebajar, descontar, pagar, cuenta de horas, cita médica, tiempo por tiempo]
orden: 30
actualizado: 2026-11-27
fuentes: [src/app/panel/permisos/CamposPermisoHoras.jsx, src/app/panel/permisos/PermisoDialog.jsx, src/lib/asistencia/permisoHoras.mjs, src/lib/asistencia/tiposGoce.mjs, src/components/Permission/PermissionDialog.jsx]
---

## Para qué sirve

Un **permiso por horas** cubre una parte de un día: llegar más tarde, salir antes o salir y regresar (por ejemplo, para una cita médica). Con él:

- No se marca retardo ni salida anticipada dentro del permiso.
- El tiempo que la persona no trabajó **se repone** (va a su cuenta de horas por reponer), **se descuenta** en nómina o **se paga**, según lo que se decida.

## Quién la usa

- **Recursos Humanos y el dueño**: lo registran en Permisos.
- **Empleados**: lo piden desde su app con **Unas horas**. Ver [Cómo pedir un permiso](/ayuda/permisos/pedir-un-permiso).
- **Jefes**: lo aprueban en [Solicitudes de mi equipo](/ayuda/solicitudes-equipo/aprobar-solicitudes-de-mi-equipo).

## Antes de empezar

Entra a **Ausencias y permisos → Permisos**.

## Los tres tipos

| Tipo | Qué pides | Ejemplo |
|---|---|---|
| Llega tarde | **Puede llegar hasta las** | Entra a las 9:00, permiso hasta las 11:00 |
| Sale antes | **Sale desde las** | Sale a las 4:00 en lugar de 6:00 |
| Sale y regresa | **Sale a las** y **Regresa a las** | Sale de 12:00 a 2:00 y regresa |

Si en **Qué pasó** eliges **Entrada tarde**, **Salida temprano** o **Salir en medio turno**, el tipo ya está decidido y solo pones la hora.

## Cómo registrar un permiso por horas

1. Toca **Nuevo permiso** y elige la **Empresa**.
2. En **Qué pasó** elige el tipo (por ejemplo **Entrada tarde**) y su **Motivo**. O deja otro tipo y en **Duración** elige **Por horas**.
3. Elige al empleado o empleados.
4. Elige el **Día** (es de un solo día).
5. Escribe la hora o las horas que pide el tipo.
6. Decide cómo se cubre el tiempo:
   - Con un tipo de parte del día, en **Horas no trabajadas**: Se reponen (tiempo por tiempo), Se descuentan o Se pagan. Si dice «🔒 Lo fija el tipo de registro.», no se puede cambiar.
   - Con **Por horas**, en **¿Cómo se cubre el tiempo?**: **Se repone** («Va a su cuenta de horas; lo repone otro día o el mismo día.») o **Se rebaja** («Queda como permiso con descuento para nómina.»).
7. Toca **Guardar**. Verás «Permiso por horas creado.».

![Ventana Nuevo permiso por horas con el día, la hora y las horas no trabajadas](/ayuda/capturas/permisos/permiso-por-horas.webp "Un permiso por horas es de un solo día y dice cómo se cubre el tiempo")

> **Importante:** se cuenta lo que **realmente faltó** según sus checadas, sin pasar del permiso. Si llegó más tarde de lo que permitía el permiso, lo de más cuenta como retardo normal.

## Qué pasa con el tiempo no trabajado

| Opción | Resultado |
|---|---|
| Se reponen / Se repone | El día se paga completo y el tiempo va a su **cuenta de horas por reponer**. Lo repone otro día (o el mismo día si se queda más) |
| Se descuentan / Se rebaja | Se descuenta en la nómina como horas no trabajadas |
| Se pagan | El día se paga completo y no debe nada |

Las horas por reponer se controlan en [Cómo controlar las horas por reponer](/ayuda/asistencias/horas-por-reponer). El empleado ve lo que debe en su Inicio, en **Tiempo por reponer**.

## Preguntas frecuentes

### ¿Puedo dar un permiso por horas de varios días?

No: cada permiso por horas es de un solo día. Si se repite, registra uno por día.

### ¿El permiso aparece en el Monitor?

Sí. Si está aprobado, el Monitor lo muestra en violeta (por ejemplo «Permiso 10:00 a.m.–12:00 p.m. · cita médica») y no marca falta ni retardo dentro del permiso.

### ¿Se puede registrar después de que pasó?

Sí. También puedes registrarlo directo en el reloj del día: [Cómo registrar que alguien llegó tarde o salió antes con permiso](/ayuda/asistencias/permiso-del-dia).

## Qué pasa si…

- **…no indicas el día o la hora:** verás «Indica el día del permiso.», «Indica desde qué hora.» o «Indica hasta qué hora.».
- **…en «Sale y regresa» la hora de regreso es antes de la de salida:** verás «La hora de regreso debe ser después de la de salida.».
- **…no eliges cómo se cubre:** verás «Elige si el tiempo se repone o se rebaja.».
- **…se cancela el permiso:** deja de contar en su cuenta de horas.

## Relacionado

- [Cómo controlar las horas por reponer](/ayuda/asistencias/horas-por-reponer)
- [Cómo registrar que alguien llegó tarde o salió antes con permiso](/ayuda/asistencias/permiso-del-dia)
- [Cómo registrar un permiso](/ayuda/permisos/registrar-un-permiso)
- [Cómo pedir un permiso](/ayuda/permisos/pedir-un-permiso)
- [Cómo aprobar las solicitudes de mi equipo](/ayuda/solicitudes-equipo/aprobar-solicitudes-de-mi-equipo)
