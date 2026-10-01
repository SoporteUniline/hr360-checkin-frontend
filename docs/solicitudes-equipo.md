# Solicitudes de mi equipo

Rutas: `/empleado/panel/solicitudes-equipo` (Empleado) y
`/panel/solicitudes-equipo` (Recruiter/User). Accesos en el menú y buscador;
las solicitudes personales conservan su formulario y enlazan al nuevo módulo.

## Comportamiento

- Por autorizar, historial y calendario mensual/anual, disponibles con cero pendientes.
- Búsqueda y filtros sobre todas las páginas recuperadas; exportación CSV del historial filtrado.
- Ficha con fechas, días según el cálculo existente, regreso previsto, saldo actual,
  periodos registrados y últimas vacaciones aprobadas cuyo periodo ya terminó.
- En móvil, ficha completa con acciones fijas; en escritorio, panel lateral.
- No se modifica la regla de descuento ni se envían correos desde el frontend.

## Acceso y contratos existentes

Las rutas Next `/api/solicitudes-equipo` y `/api/solicitudes-equipo/:id` actúan
como intermediario con el backend configurado en `NEXT_PUBLIC_RUTA_BACKEND`.
Usan la cookie de sesión y el token del mismo usuario. Nunca una credencial
administrativa, ni tablas o endpoints nuevos supuestos.

La identidad y empresa se verifican con `/users/verify/token` en cada petición.
El servidor calcula el equipo antes de devolver registros al navegador:
`id_autoriza_vacaciones` para vacaciones y `id_autoriza_permisos` para otros
permisos. `id_jefe_inmediato` por sí solo no concede autorización. No se
permite revisar la solicitud propia. Se aplica la asignación **actual**;
no existe un historial de cambios de jefe en estos contratos.

Endpoints que el backend debe permitir leer al responsable autenticado, con su
propia validación de empresa y alcance:

| Endpoint | Campos utilizados |
| --- | --- |
| `GET /checador/empleados?empresa=:id&page=:page&limit=:limit` | `data`, `total`; empleado, nombre, empresa, ambos autorizadores, días de trabajo |
| `GET /checador/empleados/por-correo?empresa=:id&correo=:correo` | `id_empleado`, solo como alternativa si la sesión no trae el vínculo |
| `GET /checador/solicitudes-permiso/empleado/:id?page=:page&limit=:limit` | `results` o `results.data`, `total`; id, empleado, estado, fechas, tipo, descuento, motivo |
| `GET /checador/solicitudes-permiso/por-autorizar?page=:page&limit=:limit` | Pendientes realmente autorizables por la sesión |
| `GET /checador/vacaciones/reporte?empresa=:id` | Array; empleado, días cargados, tomados y disponibles |
| `GET /checador/vacaciones/cargados/:id?empresa=:empresa&id_empresa=:empresa` | `periodos`: id, años, días asignados, fechas y estado |
| `GET /checador/holidays/:empresa?page=1&limit=5000&filter=` | `festivos`: fecha |
| `PATCH /checador/solicitudes-permiso/:id/estado` | `{ estado: "Aprobado" / "Rechazado", actualizado_por }` |

Antes del PATCH se revalida el equipo, el estado y la presencia en
`por-autorizar`. Se exige origen del mismo host. El backend conserva la
responsabilidad de aplicar autorización y transición de estado de forma
atómica, incluyendo saldo y descuento, para resolver aprobaciones simultáneas.
Las respuestas privadas no se almacenan en caché HTTP. No se devuelve el
directorio completo ni saldos de terceros al navegador. Se rechazan errores
de paginación para evitar aparentar que un listado parcial es completo.

## Pendiente de confirmar con Luis en el backend real

1. Verificar estos permisos con un usuario jefe de rol Empleado. Si alguno
   devuelve 403, no se intenta eludirlo: la pantalla explica el problema. No
   habilitar acceso general de empleados a directorios o saldos; implementar
   siempre el alcance de la asignación en el servicio. Para equipos grandes,
   conviene un endpoint paginado de equipo con búsqueda en servidor que evite
   recuperar el directorio y una consulta por colaborador.
2. **Periodo exacto de cargo:** el contrato del frontend existente no acredita
   una relación solicitud–periodo. La nueva ficha reconoce
   `id_periodo_vacaciones` si el servicio lo entrega y coincide con un periodo
   del empleado. Si falta, muestra “No informado en esta solicitud” y permite
   consultar los periodos registrados. Nunca deduce el cargo por fechas,
   periodo activo o antigüedad. Si una solicitud puede consumir varios
   periodos, acordar un desglose por periodo y días antes de ampliar la ficha.
3. **Saldo histórico:** hoy se consulta el saldo actual. Para conservar el
   saldo al solicitar/resolver, el backend necesita guardar esa evidencia y
   el periodo efectivamente debitado dentro de la operación de autorización.
   La proyección del frontend es explícitamente estimada; no reserva otras
   pendientes y no reemplaza el cálculo del servicio.

No se incluye migración SQL: se requiere revisar el esquema real y la regla
de asignación de periodos con Luis antes de proponer columnas o relaciones.
Sin horario o festivos verificables, el regreso se muestra por confirmar.

## Verificación reproducible

`node --test scripts/test-solicitudes-equipo.mjs` cubre fechas, año bisiesto,
cruce de año, regreso por horario/festivos, alcance y CSV seguro.

`node scripts/verify-solicitudes-equipo.cjs` inicia Next y un backend ficticio
local. Requiere Playwright/Chromium en el entorno (sin nuevas dependencias
de producción). Genera capturas y un resultado JSON en `TEAM_TEST_OUTPUT`
o en un directorio temporal. Comprueba lectura de todas las páginas, sesiones,
exclusión de terceros, origen, errores de permisos/saldo, periodo no inferido,
aprobar/rechazar, doble decisión, búsqueda, CSV, calendario, móvil y cero
pendientes. Estas pruebas no certifican permisos ni datos del backend real.
