# Formato mínimo del mapa asociativo

Ruta del proyecto: `docs/contexto/relaciones.json`. Mantener pequeño y versionado. Cada nodo representa un módulo; no poner toda la documentación dentro del índice.

Ejemplo **FICTICIO** (no equivale a reglas de un sistema real):
```json
{
  "version": 1,
  "modules": [
    {
      "id": "ventas",
      "doc": "docs/modulos/ventas.md",
      "aliases": ["pos", "venta"],
      "links": [
        {
          "to": "inventario",
          "reason": "La venta modifica existencias",
          "evidence": "supabase/migrations/ejemplo.sql:funcion_venta",
          "sourcePath": "supabase/migrations/ejemplo.sql",
          "sourceSha256": "valor_sha256_real_si_esta_verificado",
          "critical": true
        }
      ]
    },
    {"id": "inventario", "doc": "docs/modulos/inventario.md", "aliases": [], "links": []}
  ]
}
```

Una relación puede ser dirigida (A afecta B), de modo que el enrutador también devuelve vínculos **entrantes**. El ID debe coincidir con la entidad documental; aliases para conceptos que llaman al mismo módulo. `sourcePath` / `sourceSha256` son opcionales; si existen, validarlos antes de confiar. Sin hash no hay comprobación automática de frescura; con hash cambiado, relación obsoleta hasta revalidación.

**No fabricar relaciones a partir de similitud de nombres.** El agente puede proponer vínculos, pero para registrarlos necesita fuente y regla verificable. Una búsqueda negativa nunca demuestra inexistencia.

Ejemplo de uso desde la raíz del proyecto:
```bash
node .claude/scripts/contexto.cjs route ventas --risk normal
node .claude/scripts/contexto.cjs route ventas --risk high --json
node .claude/scripts/contexto.cjs check --base HEAD~1
```
El router solo devuelve índices de rutas y metadatos. Para casos críticos, ampliar lectura y comprobar código, DB y permisos reales.

Un cambio de campo debe registrar nuevos consumidores y marcar los viejos potencialmente afectados. No volver a calcular hashes de todo el repo por defecto.
