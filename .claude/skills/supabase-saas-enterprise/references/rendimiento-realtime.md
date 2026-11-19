# Rendimiento, Realtime, sincronización, caché y observabilidad

## Cobertura
Competencias: 3 rendimiento SQL; 6 Supabase Realtime; 8 caché/sincronización; 13 observabilidad.

## Orden correcto para diagnosticar
1. Reproducir y definir métrica (duración, volumen, bytes, solicitudes, locks, CPU, IO, frecuencia, coste), usuario/tenant y horario.
2. Leer código real: queries, hooks, invalidaciones, intervalos, suscripciones, refetch de focus/reconnect, número de instancias; no extrapolar tráfico solo desde el código.
3. Revisar dashboard Query Performance, pg_stat_statements, logs, métricas y consultas reales cuando estén disponibles.
4. Usar EXPLAIN/ANALYZE/BUFFERS con precaución en entorno seguro: ANALYZE ejecuta la consulta, incluidas escrituras. Justificar índices B-tree/GIN/BRIN, parciales/compuestos con distribución y coste de mantenimiento.
5. Cambiar una hipótesis a la vez, medir antes y después en condiciones comparables. No prometer mejora sin cifras.

## Catálogos y búsqueda
Evitar descargar todos los catálogos al abrir venta por defecto. Según flujo aprobado, cargar selecciones necesarias, buscar bajo demanda, paginar y reutilizar caché vigente. Diseñar debouncing, deduplicación y single-flight cuando ayude. Prefetch solo basado en probabilidad y beneficio.
Evitar N+1, select *, full refetch y peticiones repetidas. Mantener invalidación selectiva por entidad/consulta. La clave de caché debe incluir tenant/usuario/permiso/contexto pertinente; no reutilizar datos de otra empresa.

## Realtime
Revisar Broadcast, Presence, Postgres Changes, canales privados y RLS/autorización de canales. Evaluar latencia, ancho de banda, orden, duplicados, ciclos de suscripción/desuscripción, reconexión y tokens renovados.
En la documentación oficial actual, Broadcast se recomienda a menudo por seguridad y escalabilidad respecto a Postgres Changes; verificar caso concreto, carga y autorización antes de migrar.
Al llegar un evento: **no descargar todo automáticamente**. Elegir patch de entidad, invalidación selectiva, refetch acotado o reconciliación total ante reconexión cuando esté justificado.
Realtime no garantiza por sí solo una réplica durable sin huecos. Usar cursor/version/updated_at u otro mecanismo de reconciliación apropiado a la operación.
Polling de respaldo puede ser correcto. No deshabilitarlo indiscriminadamente, especialmente para caja, pedidos, POS u operación crítica.

## Cliente y caché
TanStack Query si ya se usa o es apropiado; staleTime, garbage collection, invalidación, actualización optimista con rollback, revalidación por foco y red, abort/carrera de respuestas, selección estable. No instalar nuevas dependencias de caché por reflejo.
Optimizar rendimiento perceptible (pantallas) y de servidor, comparando resultados y consistencia.

## Observabilidad
Postgres/API/Auth/Edge logs; correlación de solicitud y trace si hay soporte, errores, deadlocks, pool, conexiones, CPU/IO, tiempos y fallos de red. No registrar PII/secrets innecesarios.
Separa código inferido de uso real medido y de hipótesis.

## Pruebas
- El POS se actualiza en dos terminales; sin doble cobro ni recarga masiva.
- Suspender WebSocket y restablecer: reconciliación y ausencia de pérdidas.
- Procesar eventos repetidos/desordenados.
- Medir count, payload, latencia, CPU y uso de Realtime antes/después.
- Cache/empresa A nunca entrega datos de empresa B.

Fuentes: https://supabase.com/docs/guides/database/query-optimization ; https://supabase.com/docs/guides/realtime/subscribing-to-database-changes ; https://supabase.com/docs/guides/realtime/authorization
