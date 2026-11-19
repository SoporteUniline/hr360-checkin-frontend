# Seguridad Supabase: Auth, RLS, Storage, Edge y QA

## Cobertura
Competencias: 4 Auth; 5 RLS; 11 Storage; 18 seguridad y calidad.

## Auth y autorización
Reconocer JWT, access/refresh tokens, sesiones, Claims, MFA/OAuth, SSR/cookies, caducidad, revocación y usuarios anónimos. Una persona autenticada no está necesariamente autorizada a leer datos de una empresa.
No autorizar con raw_user_meta_data / user_metadata editable por el usuario; app_metadata y claims pueden quedar desactualizados hasta renovar JWT. Revisar revocación de sesiones sensibles. Verificar guía actual según supabase-js, SSR y stack reales.

## RLS y exposición
- Examinar esquema expuesto, GRANT/REVOKE por rol y RLS por tabla. **GRANT no equivale a política RLS** y activar RLS por sí solo no autoriza operaciones.
- Pruebas por SELECT, INSERT, UPDATE, DELETE: USING, WITH CHECK y políticas SELECT necesarias para UPDATE. Probar admitidos y denegados.
- Evitar políticas «to authenticated using(true)» para datos privados: ser usuario autenticado no garantiza permiso de tenant.
- Views: revisar security_invoker según versión de Postgres, propietario y esquemas expuestos.
- SECURITY DEFINER: no utilizarlo como parche de permisos; revisar propietarios, search_path, GRANT EXECUTE, autorización interna y efecto sobre RLS; preferir invoker si el comportamiento lo permite. Los patrones ya heredados deben auditarse antes de cambiarlos.
- Privilegios de service_role/secret keys siempre sólo servidor; cliente con publishable key, no asumas que esta clave concede autorización por sí sola.
- Auditoría multiempresa: dos usuarios de tenants diferentes, roles distintos, membresías múltiples, estados de baja y sesiones viejas; revisar BOLA/IDOR.

## Storage
Buckets, rutas autorizadas por tenant, políticas de storage.objects, MIME, tamaño, uploads/upsert, signed URLs, expiración, eliminación y retención. Verificar restricciones de escritura y lectura con usuarios reales de prueba. Evitar enlaces públicos a datos privados.
Upsert puede necesitar SELECT+INSERT+UPDATE de objetos según política de operación; consultar docs.

## Edge Functions y webhooks
Verificar firma/secretos del origen, JWT cuando aplique, permisos, schema y validación de payload, idempotencia y retries, logs sin PII, límites de ejecución, timeouts y observabilidad. No usar funciones para transacciones multipaso que requieren atomicidad de una sola base si Postgres las puede garantizar, salvo dependencia externa o justificación.

## QA seguro
Pruebas negativas y positivas en staging/DB local (nunca escribir en datos de producción por comodidad). Revisar actualizaciones de RLS y canales Realtime; no cambiar políticas productivas sin permiso. Registro de hallazgos con ruta o consulta, severidad y reproducción.

Docs: https://supabase.com/docs/guides/database/postgres/row-level-security ; https://supabase.com/docs/guides/auth ; https://supabase.com/docs/guides/storage ; https://supabase.com/docs/guides/functions ; https://supabase.com/docs/guides/security/product-security
