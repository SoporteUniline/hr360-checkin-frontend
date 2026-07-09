# Plantillas de correo — Adamia

Plantillas HTML de correo con el diseño corporativo Adamia (logo, línea
degradada azul → morado, tarjeta de datos, botón CTA). Construidas con
tablas y estilos inline para compatibilidad con Gmail, Outlook y móviles.

**Estas plantillas se integran en el BACKEND (redlab_back / check-in-back),
no en este frontend.** Se versionan aquí solo como entrega para el equipo.

## solicitud-permiso.html

Destino: `modules/attendance/controllers/solicitudPermisoController.js`,
en el campo `html` del `sendMail` que notifica una nueva solicitud.

Uso: pegar el contenido como template literal de JavaScript. Variables
esperadas (renombrar a las del controller):

- `${nombreEmpleado}`, `${nombreEmpresa}`
- `${tipoPermiso}`, `${diasSolicitados}`, `${fechaInicio}`, `${fechaFin}`
- `${motivo}`, `${folio}`
- `${urlRevision}` — enlace al panel de permisos para aprobar/rechazar
- `${fechaEnvio}`

Asunto sugerido:
`Nueva solicitud de permiso — ${nombreEmpleado} (${diasSolicitados} días)`

Notas técnicas:
- El logo se carga desde Cloudinary (los correos no acceden a assets del deploy).
- El degradado tiene fallback a azul sólido para Outlook.
- Tipografía Arial/Helvetica: los clientes de correo no cargan webfonts
  de forma confiable.
