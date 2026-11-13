# Arquitectura Postgres, modelado, APIs, concurrencia y SaaS

## Cobertura
Competencias del superprompt: 1 PostgreSQL avanzado; 2 modelado; 7 APIs/RPC; 9 transacciones y concurrencia; 12 multitenancy; 16 escalabilidad.

## Investigar antes de diseñar
Ubicar tablas, claves y cardinalidades, tipos, estados, constraints, índices, funciones, servicios que escriben/leen, políticas y procesos de negocio. No inventar nombres ni asumir que todo dato va a una nueva tabla.
Documentar entidad → campo → fuente → regla de cálculo → consumo → efecto al modificar → prueba. Respetar historiales y versiones.

## PostgreSQL
JOIN, CTE, window functions, JSONB cuando procede, constraints, FK, funciones/PLpgSQL, triggers, vistas, MVCC, aislamiento, locks/deadlocks, WAL, VACUUM/ANALYZE, particionamiento **solo con evidencia de necesidad**. Evitar procedimientos privilegiados innecesarios.
Normalizar por integridad; desnormalizar únicamente con justificación, consistencia y medición. Congelar snapshot de precio/impuesto en documentos comerciales cuando así lo exijan las reglas aprobadas.
Nunca implementar control de simultaneidad únicamente mediante deshabilitar el botón del frontend.

## Operaciones concurrentes
Para doble clic, reintentos, pago repetido, último artículo y dos cajas:
- Identificar unidad de negocio idempotente, clave/ID de operación y restricciones de unicidad.
- Establecer frontera transaccional, actualizaciones condicionales, locks o versión optimista según el caso.
- Resolver fallo a mitad: rollback o estado recuperable, conciliación y auditoría.
- Antes de repetir escritura de resultado incierto, comprobar si se completó.
- Probar dos clientes simultáneos, errores y reintentos con datos aislados.
No es correcto universalmente que «todo va en una RPC»: decidir entre SQL atómico, servicio, API o Edge Function según contexto de privilegios, efectos externos y consistencia.

## SaaS multiempresa
Modelo explícito para empresas/tenant, sucursales, usuarios con una o varias membresías, roles y propietarios. Aislamiento debe existir en BD/operación autorizada, NO depender del filtro del frontend. Escopar caché, canales, colas, archivos, claves idempotentes y reportes por tenant real. Probar que tenant B no puede leer ni alterar tenant A.
Revisar índices según consultas reales `empresa_id`, estado, fechas, FK y cardinalidad; no aplicar un índice universal sin medir.

## Supabase Data API / PostgREST / supabase-js
Usar filtros, selects mínimos, relaciones/paginación tipada, errores y permisos. Diferenciar GRANT de RLS; que una tabla exista no implica que sea visible en el Data API. Revisar configuración de esquemas expuestos y versión real.
La autorización vive en servidor/BD; no fiarse de claims editables por usuario ni de filtros de interfaz.

## Escalabilidad
Estimar carga diaria/por empresa, retención, escrituras, concurrencia y conexiones. Considerar pooling, Supavisor, límites, réplicas y escalado vertical solo si la medición lo requiere. Relacionar capacidad, costo y complejidad.

## Evidencia de aceptación
ER diagram con relaciones y estados aprobados, plan de permisos, casos concurrentes, SQL/servicios revisados, pruebas de integridad y tenant, índices justificados por EXPLAIN, comparativa de latencia o carga cuando se optimice.

Fuentes: https://supabase.com/docs/guides/database ; https://supabase.com/docs/guides/api ; https://www.postgresql.org/docs/
