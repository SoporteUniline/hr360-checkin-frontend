---
titulo: Cómo registrar un permiso para uno o varios empleados
resumen: Desde Permisos, RH registra un permiso por días o por horas para una o varias personas a la vez, con su motivo y su goce.
modulo: permisos
audiencia: [rh, dueno]
pantallas: [/panel/permisos]
palabras: [permiso, nuevo permiso, registrar permiso, inasistencia justificada, motivo, goce, varios empleados, días completos, por horas, observaciones, traslape]
orden: 10
actualizado: 2026-11-27
fuentes: [src/app/panel/permisos/page.jsx, src/app/panel/permisos/PermisoDialog.jsx, src/app/panel/permisos/CamposQuePaso.jsx, src/app/panel/permisos/CamposPermisoHoras.jsx, src/app/panel/permisos/PermisosTable.jsx, src/lib/asistencia/quePasoMotivo.mjs]
---

## Para qué sirve

En **Permisos** se registran las ausencias **planeadas**: un día por un trámite, una mañana por una cita médica, unas horas para salir antes. Se pueden registrar para **varias personas a la vez**.

Un permiso pasa por estados: **Pendiente** → **Aprobado** o **Rechazado**, y un aprobado se puede **Cancelar**.

## Quién la usa

Recursos Humanos y el dueño. Los empleados piden sus permisos desde su app ([Cómo pedir un permiso](/ayuda/permisos/pedir-un-permiso)) y sus jefes los aprueban en [Solicitudes de mi equipo](/ayuda/solicitudes-equipo/aprobar-solicitudes-de-mi-equipo).

## Antes de empezar

- Entra a **Ausencias y permisos → Permisos**.
- Revisa que tus tipos y motivos estén configurados: [Tipos de registro y motivos](/ayuda/asistencias/tipos-de-registro).

## Cómo leer la pantalla

![Pantalla de Permisos con los contadores, los filtros y la tabla](/ayuda/capturas/permisos/permisos-tabla.webp "Los permisos con su tipo, fechas, días totales y hábiles, estado y acciones")

- **Contadores:** Total permisos, Pendientes, Aprobados y Rechazados.
- **Filtros:** Unidad de negocio, Rango de fechas (al entrar, **Todo el historial**) y **Limpiar**. Los encabezados de la tabla también filtran (empleado, tipo, estado…).
- **Vistas:** **Tabla** o **Calendario**.
- **Tabla:** folio, unidad, empleado, tipo (los permisos por horas dicen, por ejemplo, «Llega tarde · hasta 11:00 a.m. · se repone»), fechas, **Días totales**, **Días hábiles** (sin domingos ni festivos), estado y acciones.

## Cómo registrar un permiso por días

1. Toca **Nuevo permiso**.
2. Elige la **Empresa**.
3. En **Qué pasó** elige el tipo (por ejemplo **Inasistencia**).
4. Elige el **Motivo** (por ejemplo **Visita al médico**). El **Goce del día** viene del motivo; si dice «Viene del motivo; puedes cambiarlo en este caso.», puedes cambiarlo. Si dice «Lo fija el motivo.» o «Lo fija la ley.», no.
5. En **Empleados (selección múltiple)** busca y marca a una o varias personas.
6. En **Duración** deja **Días completos** y elige **Fecha inicio** y **Fecha fin**.
7. Escribe **Observaciones** si quieres.
8. Toca **Guardar**.

Verás «Permiso(s) creado(s) correctamente.». El permiso queda **Pendiente** hasta que alguien lo apruebe. Ver [Cómo aprobar o rechazar un permiso](/ayuda/permisos/aprobar-o-rechazar-un-permiso).

![Ventana Nuevo permiso con la empresa, Qué pasó, el motivo, el goce y los empleados](/ayuda/capturas/permisos/permiso-nuevo.webp "El goce del día viene del motivo elegido")

## Cómo registrar un permiso por horas

Elige **Por horas** en Duración, o un tipo de parte del día (Entrada tarde, Salida temprano, Salir en medio turno). Todo se explica en [Permisos por horas](/ayuda/permisos/permisos-por-horas).

## Cómo ver o imprimir un permiso

1. Toca el ojo (**Ver**) en la fila.
2. Verás **Detalles del permiso** con su folio, empleado, tipo y motivo, fechas, días totales y hábiles, estado, observaciones, nota interna y quién lo actualizó.
3. Toca **Descargar PDF** o **Imprimir permiso**: sale el formato «Solicitud de permiso» (o «Solicitud de vacaciones») con espacios para la firma del trabajador y del representante de la empresa.

![Detalle de un permiso con su folio y los botones Descargar PDF e Imprimir permiso](/ayuda/capturas/permisos/permiso-detalle.webp "Desde el detalle se descarga o imprime el formato para firmar")

## Cómo ver el calendario

Toca **Calendario**. Verás el mes con una barra por permiso: color por tipo; los aprobados en sólido, los pendientes punteados y los rechazados tachados. Cambia de mes con las flechas.

![Calendario mensual de permisos](/ayuda/capturas/permisos/permisos-calendario.webp "Cada permiso es una barra en los días que abarca")

## Preguntas frecuentes

### ¿Qué tipos aparecen en «Qué pasó»?

Inasistencia, Entrada tarde, Salida temprano, Salir en medio turno y los tipos que tu catálogo marque como **Es un Permiso**.

### ¿Cuál es la diferencia entre días totales y días hábiles?

Los totales cuentan todos los días del rango; los hábiles no cuentan domingos ni los [días festivos](/ayuda/festivos/dias-festivos) de tu empresa.

### ¿Puedo cambiar la empresa de un permiso ya creado?

No. Si te equivocaste, elimínalo y créalo de nuevo.

## Qué pasa si…

- **…la persona ya tiene un permiso en esas fechas:** verás «Existe un traslape con otro permiso activo o pendiente.».
- **…no eliges a nadie:** verás «Selecciona al menos un empleado.».
- **…no eliges el tipo:** verás «Selecciona el tipo de permiso.».
- **…la fecha fin es antes que la de inicio:** verás «La fecha fin no puede ser anterior a la fecha inicio.».
- **…eliminas un permiso:** usa el bote de basura y confirma; verás «Permiso eliminado correctamente». Si estaba aprobado, sus días regresan a como estaban.

## Relacionado

- [Cómo aprobar o rechazar un permiso](/ayuda/permisos/aprobar-o-rechazar-un-permiso)
- [Permisos por horas: llegar tarde, salir antes o salir y regresar](/ayuda/permisos/permisos-por-horas)
- [Cómo cancelar un permiso aprobado](/ayuda/permisos/cancelar-un-permiso)
- [Tipos de registro y motivos](/ayuda/asistencias/tipos-de-registro)
