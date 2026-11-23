# INC-002 · «Aprobé las solicitudes de mi equipo y no se actualizan» + saldo de vacaciones no disponible (23/11/2026)

- **Síntomas (reportados por el dueño):**
  1. Al aprobar permisos en «Solicitudes de mi equipo» no se actualizaban.
  2. «No se pudo consultar todo el saldo o los periodos. El servicio de vacaciones debe permitir su lectura al responsable asignado.»
- **Causa 1:** antes de aprobar, `resolveRequest` (src/lib/solicitudes-equipo/server.js) exigía que la solicitud apareciera en `/solicitudes-permiso/por-autorizar`. Ese endpoint solo responde a sesiones de **empleado**; para el dueño o RH vinculado a su registro de empleado venía vacío y se rechazaba con «La solicitud ya no está pendiente a tu cargo» (409).
- **Causa 2:** el saldo se pedía con el reporte de vacaciones de toda la empresa (`/vacaciones/reporte`), que solo responde a cuentas de RH con la empresa en la sesión.
- **Reproducción (RED):** `scripts/verify-solicitudes-equipo.cjs` con sesión de dueño (`ownerSession`) → 409 «La solicitud ya no está pendiente a tu cargo» sin la corrección. Backend: `tests/vacacionesSaldoApi.test.cjs` falla sin el endpoint nuevo.
- **Corrección:** la verificación con «por-autorizar» solo aplica a sesiones de empleado (el backend valida el permiso al cambiar el estado y `findRequest` confirma que sigue pendiente). El saldo se pide por persona con `GET /checador/vacaciones/saldo/:id` (backend SoporteUniline/hr360-checkin-backend#46), con el mismo cálculo del reporte.
- **GREEN:** ambas pruebas pasan con la corrección.
- **Aprendizaje:** las pantallas de «responsable» deben probarse con los dos tipos de sesión (empleado-jefe y dueño/RH vinculado).
- **Relacionado en la misma sesión:** «Cambiar contraseña» se quedaba en «Guardando…» cuando el servidor no estaba disponible (503 durante un despliegue). Ahora tiene tiempo límite de 20 s y un mensaje claro; cubierto en `scripts/verify-contrasena-empleado.mjs`.
