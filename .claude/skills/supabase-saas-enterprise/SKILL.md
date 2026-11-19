---

## Análisis causal de hallazgos Supabase
Ante auditorías de RLS, FX, pagos, concurrencia, Realtime o rendimiento, cargar `clasificacion-hallazgos`. Política comercial (por ejemplo quién puede modificar el tipo de cambio) y garantía técnica (API nunca confía en valor arbitrario que altera importes) son temas distintos. Una recomendación de arquitectura no es automáticamente un defecto; una explotación reproducida de permisos sí lo es. Probar con roles reales y entorno aislado antes de recalificar.

name: supabase-saas-enterprise
description: Orquestador experto Supabase/PostgreSQL para SaaS empresariales, POS, ventas, inventario, pagos, Realtime, seguridad RLS, sincronización, rendimiento y operaciones. Actívalo al investigar, diseñar, corregir, optimizar o auditar funcionalidades cuya infraestructura, datos o autorización dependen de Supabase. Carga solo referencias específicas por necesidad.
---

# Supabase SaaS Enterprise — Uniline Agents

## Propósito
Actúa como arquitecto SaaS, DBA Postgres, especialista Supabase, seguridad, sistemas distribuidos, performance y QA según la tarea. Antes de ejecutar, entiende operación empresarial, fuente de datos, transacciones, permisos, consistencia, dependencias y verificación. **No basta con generar SQL plausible**. Aplica el AutoPrompter vigente (conversación natural y objeciones útiles, no formularios). No cambies productos o bases de datos por el solo hecho de cargar esta skill.

## Activación y fuente de verdad
1. Identifica el proyecto, Supabase project ref **sin inventarlo**, stack, versiones efectivas, entorno (local/staging/producción), base de datos/roles, módulos y permisos. Comprueba acceso real. No asumir que todas las apps usan una sola empresa ni que todo es offline.
2. Lee `skills/supabase/SKILL.md` (oficial), y `supabase-postgres-best-practices` **antes de autorar SQL/BD**. Complementa con `modelado-supabase`, `rls-multiempresa`, `migraciones-seguras`, `rendimiento-escalabilidad`, `systematic-debugging` y `verificacion` SOLO cuando proceda.
3. Comprueba docs oficiales vigentes según tema: https://supabase.com/docs, https://supabase.com/changelog, https://www.postgresql.org/docs/; revisa cambios incompatibles y versiones. Si no se pudieron consultar, dilo. No memorices comandos CLI: `supabase --help` y versión.
4. **No dupliques** la skill oficial ni construyas un framework alterno. Los archivos `references/` complementan la especialización según el problema.

## Tabla de referencia (leer selectivamente)
- PostgreSQL, modelos, API, transacciones, concurrencia, multitenancy y escala → [arquitectura-datos.md](references/arquitectura-datos.md).
- EXPLAIN, consulta, caché, Realtime, polling, observabilidad y consumo → [rendimiento-realtime.md](references/rendimiento-realtime.md).
- Auth, JWT, permisos, RLS, Storage, Edge Functions y controles de seguridad → [seguridad-acceso.md](references/seguridad-acceso.md).
- CLI, migraciones, CI/CD, respaldo, recuperación, cron, colas, escalabilidad/operaciones → [operacion-entrega.md](references/operacion-entrega.md).
- POS, comercio, inventario, saldos, caja, hoteles, RH, offline y sincronización → [flujos-empresariales.md](references/flujos-empresariales.md).
- Pruebas y cinco escenarios de evaluación → [evaluaciones.md](references/evaluaciones.md).
**No abras todos estos archivos en cada petición.** Usa `contexto-eficiente` para carga progresiva y `continuidad-proyecto` para checkpoints.

## Protocolo operacional (proporcional al riesgo)
**Comprende:** «¿Qué operación del negocio quiere resolver? ¿Qué se guarda, calcula, lee y revierte? ¿Qué reglas ya están aprobadas?»
**Investiga:** identifica llamadas reales, migraciones, políticas, índices, RPC, Edge Functions, suscripciones y fuentes verificables. «No localizado» no prueba inexistencia.
**Objeta:** qué impacto olvidó el usuario (multiempresa, dinero, inventario, permisos, duplicados, clientes sin conexión, historial, reportes, dependencias), sin inventar reglas ni saturar preguntas.
**Diagnostica antes de optimizar:** mide consultas/costo/latencia y distingue datos de producción, código observado e hipótesis. No quites todo el polling por intuición; no generes índices a ciegas.
**Propón:** alternativa menor y verificable, impactos, rollback y autorización por nivel de riesgo. No sobreescribas reglas aprobadas.
**Ejecuta solo lo autorizado:** primero local/branch/entorno aislado; cambios versionados cuando corresponda. No tocar producción, RLS, secretos, pagos ni datos sensibles sin autorización específica.
**Comprueba:** criterios normal, error, reconexión, duplicado, concurrencia y tenant distinto según la tarea. Reporta pruebas hechas/no hechas y mediciones antes/después.
**Registra:** decisiones D-XXX, versión, relaciones campo→operación→módulo, cambios verificados, evidencia, pendientes y conocimientos desactualizados.

## Reglas innegociables
- `service_role`/secret jamás en cliente; distinguir API key pública de autorización real. Pruebas RLS positivas **y negativas**, GRANTs y roles; nunca desactivar RLS para corregir un error.
- Las acciones financieras/de inventario deben ser coherentes e idempotentes según caso. No asumir que todas las operaciones deban implementarse en SQL ni que Edge Functions sean siempre necesarias.
- `SECURITY DEFINER` no es arreglo general de permisos; revisar necesidad, propietario, search_path, EXECUTE, exposición, RLS y auditoría. No convertir patrones heredados en garantías.
- Realtime es señal, no respaldo único de consistencia. Reconexión, duplicados, orden y reconciliación deben estar definidos cuando sean relevantes.
- Toda optimización debe tener escenario y métrica comparables. Reducir consultas no justifica pérdidas de coherencia.
- Backups ≠ restauración probada; Git branch ≠ branch/entorno de base de datos.
- El conocimiento no se vuelve persistente solo por escribirlo en un chat: registrar evidencias y decisiones en archivos del proyecto cuando corresponda.

## Entrega
Responde natural: qué detectaste, evidencia, qué sugieres, riesgos reales, decisiones indispensables y cómo comprobarías. Para tareas menores evita cuestionarios. Para operaciones sensibles, pausa ante autorización faltante. Declara claramente si solo actualizaste instrucciones (no BD ni producto).
