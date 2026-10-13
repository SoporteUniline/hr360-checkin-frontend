# Evaluación de desempeño · Integración con API

Las rutas de RH (`/panel/evaluaciones`) y del empleado (`/empleado/panel/evaluaciones`) consumen la API real mediante el cliente Axios y el JWT existentes. No leen ni migran el estado ficticio de `localStorage`.

## Contrato vigente

[Guía de conexión entregada por backend](./CRISTIAN_CANO_FRONTEND_CONEXION.md).

Base: `NEXT_PUBLIC_RUTA_BACKEND` + `/api/checador/evaluaciones-desempeno`. Si la variable ya termina en `/api`, el cliente evita duplicarlo. La empresa se envía en todas las solicitudes. Para cuentas con varias empresas se ofrece un selector que reinicia el estado del módulo al cambiar.

El servidor determina el perfil, scopes, límites y configuración. Las rutas también comprueban los scopes; no existe selector de identidad ficticia.

## Conectado

- Plantillas: listado paginado, categorías y preguntas, versiones, duplicación y archivo/restauración. Áreas y puestos reales. La campaña guarda identificadores de versión, nunca el ID de plantilla como sustituto.
- Campañas: listado/detalle, alta/edición de borradores, propuesta de asignaciones del servidor, ajuste manual de evaluador empleado o usuario RH, guardado, validación, lanzamiento, duplicación, ampliación y cierre con motivo, recordatorios.
- Respuestas: detalle congelado, borrador y envío; conserva `false` y `0`; no permite editar sin capacidad concedida por la API.
- Resultados: listas, detalle, aprobación/publicación, historial y acuse con el texto fijo del servidor. No se recalculan resultados ni se reconstruyen campos omitidos por privacidad.
- Tablero: indicadores devueltos por `/dashboard`.
- Planes: alta/edición, avances independientes y hasta diez enlaces de evidencia nuevos por avance.
- Configuración: diez preferencias con versión, niveles y asignación a personas, permisos explícitos de RH/Dirección.
- CSV: creación de exportación y descarga autenticada con token temporal. Sin PDF, carga de archivos, auditoría simulada ni OTP.

Las operaciones de edición mandan `version`. Lanzamiento, envío, publicación y recordatorios mandan `Idempotency-Key`. El cliente bloquea operaciones simultáneas y muestra los mensajes de error del servidor; ante `VERSION` ofrece recargar sin sobrescribir silenciosamente.

`demoStore.mjs`, el cálculo de resultados del modelo y las pruebas originales se conservan como fixtures históricos; no son fuentes de datos del módulo conectado. `VERIFICACION.md` documenta la entrega anterior de demostración, no evidencia una prueba de esta integración.

## Verificación de esta entrega

- `node scripts/test-evaluaciones-api.mjs`: ruta base, empresa, versiones, claves únicas, paginación completa de selectores, errores, descarga CSV e identificadores.
- `node scripts/test-evaluaciones.mjs`: diez pruebas existentes del modelo/validación.
- `npm run build`: compilación de producción.
- `CHROMIUM_EXECUTABLE_PATH=/ruta/a/chromium node scripts/verify-evaluaciones-api.cjs`: prueba de navegador con fixtures del contrato. Usa Playwright instalado en el entorno o `PLAYWRIGHT_MODULE_PATH`; no necesita incorporarlo a dependencias de producción.

La prueba de navegador usa un JWT de prueba y solicitudes interceptadas: comprueba lista sin demo, versiones de plantilla, propuesta/guardado de asignaciones, borrador booleano `false`, envío, aprobación/publicación scopes de colaborador, creación/avance de planes con evidencia, preferencias versionadas y acuse del empleado, sin errores de ejecución. No constituye una prueba del servidor, MySQL, trabajadores de correo ni datos reales.

## Pendiente de verificar en el entorno real

No se dispuso de acceso al repositorio del backend ni de sesión/dirección de API de desarrollo en esta ejecución. Se debe comprobar el flujo completo contra el despliegue, especialmente los campos del detalle de plantilla (`versionId` o `templateVersionId`), los indicadores de `/dashboard` y los nombres/resúmenes de listados, que no tienen un ejemplo completo en la guía.

La guía requiere aplicar `hr360-checkin-backend/migrations/20261013_produccion_evaluaciones_desempeno_completo.sql` antes de usar producción. No se ejecutó ninguna migración ni se activaron los trabajadores de correo. La rama de esta entrega es `ChatGPT`; no se modifica `main`.
