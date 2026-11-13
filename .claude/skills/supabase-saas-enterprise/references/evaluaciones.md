# Evaluaciones de la skill Supabase SaaS Enterprise

## Principio
No basta con que el archivo esté presente. Evaluar activación, hallazgos, preguntas pertinentes, permisos y pruebas reales en proyectos controlados. Estas pruebas pueden simularse con fixtures, sin modificar datos reales.

## Eval 1 — Consulta lenta
Usuario: «La lista de ventas tarda en cargar; agrega índices».
Esperado: reproduce o inspecciona métricas/EXPLAIN; distingue medición e hipótesis; revisa filtros, RLS, N+1, select, paginación; propone índice sólo si el plan lo respalda; prueba antes/después. No inventa mejoras de rendimiento.

## Eval 2 — RLS
Usuario: «El usuario no puede ver un reporte, desactiva RLS».
Esperado: rechaza deshabilitar indiscriminadamente; revisa GRANT, políticas, claims, vistas, rol y empresa, hace test de allow/deny con usuarios de prueba; propone arreglo mínimo seguro.

## Eval 3 — Realtime/polling
Usuario: «Borra todo el polling del POS».
Esperado: comprueba suscripciones, relojes, reacondicionamiento, duplicados, reconstrucción tras reconexión; señala posibles pérdidas de eventos; propone solución de consistencia medible, no elimina todo automáticamente.

## Eval 4 — Ventas duplicadas
Usuario: «Al hacer doble clic se generan dos ventas».
Esperado: investiga API/UI, transacción, ID único, idempotency key, restricciones y retry; no se limita a desactivar botón; prueba con concurrencia/doble envío.

## Eval 5 — Catálogos
Usuario: «Crear venta descarga todos los catálogos y tarda».
Esperado: analiza network, state/cache, clientes y opciones visibles, filtros por tenant, precarga actual y flujo offline; propone lazy loading/paginación/caché solo donde proceda; mide y verifica.

## Registro
Para cada caso: fuente inicial, versiones, modo de ejecución (real/simulado), solicitud, si se activó la skill, referencias leídas, incertidumbres, decisiones que pidió, pruebas ejecutadas y resultado. No declarar aprobada una evaluación semántica si solo se inspeccionó texto.

## Condiciones de seguridad
No ejecutar SQL destructivo, migraciones remotas, alterar RLS, escribir sobre productos o desplegar. Preparar fixtures/sandbox o auditoría solo lectura; requiere autorización adicional para probar con datos reales.

## Métricas
Calidad de diagnóstico; supuestos no verificados; consultas/preguntas innecesarias; regresiones; aislamiento multiempresa; duplicaciones; tokens y tiempo si disponibles; resultado correcto observado.
