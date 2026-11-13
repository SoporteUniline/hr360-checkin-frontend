# Registro de incidentes y regresiones — contrato

Archivo: `calidad/aprendizajes.json`. Vacío `{"schemaVersion":1,"incidents":[]}` en una plantilla nueva, porque NO hay incidentes de una app aún inexistente.

## Entrada de incidente comprobado
```json
{
  "schemaVersion": 1,
  "incidents": [{
    "id": "INC-001",
    "classification": "DEFECTO_COMPROBADO",
    "severity": "high",
    "status": "verified",
    "module": "ventas",
    "rootCause": "Lectura y descuento de saldo sin bloqueo por cuenta",
    "evidenceLevel": "REPRODUCIDO",
    "regressionCaseIds": ["saldo-concurrente"],
    "reproductionFile": "docs/incidentes/pruebas/INC-001-red.md",
    "reviewer": "QA independiente, revisión e informe firmado"
  }]
}
```
Además deben existir `docs/incidentes/INC-001.md` y prueba versionada del fallo anterior, y el caso en `calidad/escenarios.json` con adaptador y expectativa del negocio. El informe actual `artifacts/calidad/entrega.json` debe registrar `saldo-concurrente: passed` y evidencia. Los ejemplos son ficticios; NO incorporarlos como hechos reales.

Si el incidente sigue abierto: `status:"open"`, `evidenceLevel:"INFERIDO"` o `OBSERVADO`, y documentación de causa. Una nota de recomendación, decisión empresarial o mejora estética no pertenece a la lista de bugs. Para descartar un falso positivo: `status:"false_positive"`, `refutationFile` versionado con evidencia y `reviewer`.

## Qué demuestra la puerta de entrega
- Incidentes duplicados, incompletos o sin documentación → falla.
- Incidente importante abierto (high/critical) → falla.
- Incidente marcado verificado sin test conectado, ejecución exitosa y evidencia → falla.
- Prueba previa inexistente o no versionada → falla.
- Registro e informe de revisión diferente → falla.
- Registro vacío → pasa **solo la estructura del aprendizaje**; el control `calidad/verificar-entrega.cjs` continúa fallando en plantillas sin adaptadores reales. Vacío NO significa cero problemas reales.

## Advertencias
La revisión de código y el modelado de amenazas no pueden reemplazarse por un listado autodeclarado. El validador no puede asegurar que quien firma como revisor sea independiente ni que la prueba RED/GREEN sea genuina: requiere auditoría. Para bloquear merge, GitHub branch protection debe exigir el check de `application-delivery`, y despliegue depende de él. Sin eso solo fallará la CI.
