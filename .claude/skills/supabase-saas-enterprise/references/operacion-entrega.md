# Operaciones Supabase: CLI, migraciones, respaldo, cron, queues y recuperación

## Cobertura
Competencias: 10 Edge Functions (operación); 14 CLI/CI/CD; 15 backups/recovery; 17 cron/colas, además de capacidad operacional (16).

## Herramientas y versiones
Verifica `supabase --version` y ayuda real del comando antes de invocarlo. Preferir docs/changelog oficial según fecha de ejecución. No supongas la existencia ni firma de comandos nuevos. Comprueba configuración, permisos y restricciones del proyecto actual.

## Entornos y ramas
Distingue rama Git de entornos Supabase: cambiar branch Git NO crea aislamiento de datos automáticamente. Usar local/staging o database branching configurado y autorizado. Confirmar proyecto enlazado antes de cualquier acción remota. No tocar producción por una tarea de conocimiento/skill.

## Migraciones
- Una operación de esquema aprobada se representa en migración versionada y reproducible siguiendo las prácticas del proyecto y la skill oficial actual.
- Evitar editar migraciones ya aplicadas; validar diff, rollback y dependencias.
- Expand/contract cuando hay datos y consumidores antiguos.
- Regenerar tipos cuando corresponda; conservar compatibilidad y RLS.
- Auditoría previa, pruebas en entorno aislado y revisión SQL antes de despliegue.
- No asumir que un ROLLBACK SQL recupera efectos ya aplicados desde otras APIs o integraciones externas.
- Acciones destructivas requieren aprobación explícita y plan de recuperación.

## Backups y recuperación
Comprobar plan efectivo de copias, retención, disponibilidad de PITR, permisos, tamaño, RPO/RTO y sobre todo restauraciones ensayadas. Un backup creado no prueba que se pueda restaurar. Diseñar ejercicios de recuperación y comunicación de incidentes cuando la criticidad lo justifique.

## Cron/Queues
Supabase Cron/pg_cron, Queues/pgmq, webhooks, reintentos y dead-letter patterns solo si el proyecto los usa o requiere. Determinar garantías de entrega reales y diseñar idempotencia para cada tarea de negocio. Un proceso que puede ejecutarse dos veces debe detectarlo o tolerarlo. Supervisar fallos y tareas estancadas.

## Edge e integraciones
Observar límites y versiones del runtime, secretos y política de permisos. Dejar trazas útiles sin secretos. Diseñar tratamiento de errores, timeouts y reintentos seguros.

## Observabilidad y escalado
Auditar CPU, conexiones/pool, I/O, memory, duración, saturación, locks, tamaño y costos. Supavisor/replicas/upgrade sólo ante evidencia y beneficio neto.

## Verificación
- Migración validada en entorno aislado con datos representativos y pruebas de policies.
- Informe de compatibilidad de versiones y breaking changes pertinentes.
- Restauración de prueba documentada (si se solicitó respaldos).
- Doble ejecución de jobs y webhook no duplica efecto.
- Comparación de métricas de capacidad antes/después.

Docs: https://supabase.com/docs/guides/local-development ; https://supabase.com/docs/guides/platform ; https://supabase.com/docs/guides/queues ; https://supabase.com/docs/guides/cron ; https://supabase.com/changelog
