# Portal móvil del colaborador

La entrada `/empleado` abre `/empleado/panel/inicio`. El portal usa navegación inferior y tarjetas adaptadas a celular. La identidad se toma de la sesión; no hay selector de empleados. La caché del portal se separa por sesión.

- Inicio: registros de hoy, saldo de vacaciones, solicitudes recientes y acceso al checador existente.
- Asistencias: entradas y salidas, correcciones, filtro mensual y carga progresiva de los registros recibidos.
- Solicitudes: listado paginado, alta, consulta y edición de pendientes; vacaciones entre los tipos que descuentan saldo. Formulario ajustado a la altura disponible, campos de 16 px y bloqueo de doble envío.
- Mi espacio: datos de cuenta, recursos, evaluaciones, equipo y cierre de sesión.

## Contratos reutilizados

- `GET /checador/reloj/registros-del-dia-empleado?id_empleado=...`: `registrosHoy`, `zona_horaria`.
- `GET /checador/empleados/panel-empleado/{id}/detalle`: `entradas_salidas.registros`. Se solicita exclusivamente el ID resuelto de la sesión. **Pendiente confirmar que el backend autoriza este endpoint para el empleado sobre sí mismo**; si no, hace falta un endpoint de autoservicio con alcance por token. No se modifica ni elude autorización.
- Saldo, tipos de permiso y solicitudes: contratos que ya consumía el portal.

No se calculan horas pagadas ni retardos en el navegador. El historial muestra los estados del servidor. No se infieren faltas por ausencia de datos. Los errores de API se distinguen de listas vacías. El mes filtra solamente los registros que el endpoint devuelve; no se presume un historial ilimitado.

El checador conserva los mecanismos existentes de rostro, QR, código y ubicación. El acceso desde el inicio no registra una asistencia automáticamente. No se agregaron APIs inventadas para horarios o solicitudes por horas.

## Verificación

`npm run build`

`PLAYWRIGHT_MODULE_PATH=/ruta/a/playwright CHROMIUM_EXECUTABLE_PATH=/ruta/a/chromium node scripts/verify-employee-mobile.cjs`

El script inicia el servidor local, usa JWT y respuestas controladas, y prueba anchos de 360 y 390 px. No escribe en cuentas reales. Comprobar además en Android/iPhone reales: cámara, GPS, teclado, permisos del sistema y autorización del historial con perfil de empleado.

## Propuesta 02 aprobada · 2026-10-24

El usuario aprobó el mockup de tres vistas y autorizó implementar/subir a ChatGPT.
- Inicio y solicitudes comparten `RequestDates`: fecha con día de semana, duración natural o hábil según datos disponibles. Regreso únicamente en vacaciones aprobadas con jornada reconocida y festivos disponibles. Sin esos datos no se infieren días hábiles ni regreso. Usa las utilidades civiles existentes; no cambia saldos ni reglas del backend.
- Asistencias: lista compacta con expansión, selección de semana/mes/año, fecha ancla, navegación anterior/siguiente y estados. `asistencias.historial` aporta clasificación; `entradas_salidas.registros` aporta checadas. Cerrado/Abierto nunca se convierten en Presente. Estados desconocidos/conflictivos se muestran Sin clasificar. No se fabrican ausencias por fechas vacías. Resúmenes cuentan fechas distintas por estado dentro del conjunto disponible, no garantizan cobertura histórica del backend.
- Solicitudes: pestañas con conteos globales, incluida Canceladas cuando existe. El contrato conocido no documenta filtros por estado: se recuperan páginas de 100 secuencialmente, se deduplican IDs y se rechaza una respuesta incompleta; luego se filtra y pagina la vista. Sin polling de todo el historial. Límite de 200 páginas con error explícito, no resultados parciales. Futura mejora para gran volumen: filtrado y agregados autenticados en servidor.
- Reutilización: sesión y aislamiento existentes, formato de fechas y cálculo de siguiente jornada existentes, StatusBadge, DataState, formulario de solicitudes y sus operaciones.
- Alcance: tres rutas del colaborador. No se modifican backend, BD, autenticación ni checador. Continúa pendiente validar permisos y cobertura del backend real, dispositivos físicos, teclado nativo y lector de pantalla. Sin calificación numérica de UX ni afirmación de conformidad WCAG.
- Pruebas: `scripts/test-employee-presentation.mjs` cubre cruce de año, febrero bisiesto, festivos, jornada ausente, clasificaciones y páginas posteriores. `scripts/verify-employee-mobile.cjs` cubre rutas, filtros, estados, creación/detalle y errores con respuestas controladas a 320/390/768/1280 px.
