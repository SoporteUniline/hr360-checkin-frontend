---
name: aprendizaje-verificable
description: Ciclo causal de mejora continua de Uniline Agents: convertir fallos reproducidos en incidentes versionados, pruebas de regresión reales, aprendizaje de relaciones y una puerta de entrega que no aprueba correcciones sin evidencia; calidad demostrada 9.5/10.
---

# Aprendizaje verificable: detectar, corregir, probar, recordar

**El modelo no modifica sus pesos al conversar.** Aprende el sistema mediante reglas, relaciones e incidentes versionados que se recuperan selectivamente. Un simple MD no impide recidiva: **el test ejecutable y la revisión de resultados** son la defensa.

## Activación
Siempre que un defecto importante sea descubierto, reaparezca, se corrija o se pretenda declarar terminado:
1. **Clasifica causalmente** con `clasificacion-hallazgos`: defecto probado, inferido, riesgo, decisión pendiente, recomendación o falso positivo. No registrar una opinión como bug.
2. **Reproduce primero** en un entorno aislado con rol/empresa/estado, entrada, resultado y revisión. Si no es reproducible, conserva `INFERIDO/NO_VERIFICADO` y no certifiques reparación.
3. **Registra el incidente** `INC-XXX` en `docs/incidentes/INC-XXX.md`, su reproducción redacted y una entrada en `calidad/aprendizajes.json` (estructura en la referencia). Relaciona el módulo con dependencias mediante `memoria-asociativa`; solo vínculos verificables.
4. **Define la prueba ANTES del parche**: añade caso adversarial en `calidad/escenarios.json` con `id`, input, expected y adapter real contra la app/base aislada. Prueba RED del comportamiento anterior; luego corrige la causa, no el síntoma. Reusar escenarios existentes solo si cubren el mismo fallo.
5. **Prueba GREEN y regresiones relacionadas** con `node calidad/verificar-entrega.cjs`, ejecutado sobre checkout limpio y versionado con adaptadores verdaderos. El gate ahora cruza incidentes resueltos con resultados y evidencia. Mocks NO cuentan como prueba del producto.
6. **Auditor independiente**: verifica código, prueba, permisos, efectos colaterales y que el caso fallaría si reintroducimos el defecto. Registrar responsable de revisión. Solo entonces usar `status: verified` (no «cerrado» por compilar).
7. **Consolida memoria**: actualiza documentación de módulos/decisiones, invalidaciones y referencias del grafo. No escribir más memoria de la necesaria ni guardar datos sensibles. Si un mismo patrón reaparece, vincula incidentes e incrementa cobertura; no lo tapes con más texto.
8. **Reevalúa calidad** con rúbrica `docs/calidad-95.md`, incidentes abiertos y cobertura. La cifra 9.5 requiere evidencia por dimensión; el gate estructural no otorga esa nota.

## Estados y bloqueo
- `open`: si severidad `critical` o `high`, **bloquea la entrega**, incluso con pruebas restantes verdes. Se conservan incidentes de severidad media/baja para revisión y prioridad razonada.
- `verified`: exige prueba adversarial ejecutada en revisión actual, evidencia no vacía, prueba de fallo antes del arreglo, documentos versionados y revisor. Que exista el archivo no certifica honestidad de evidencia.
- `false_positive`: exige documento de refutación y revisor; no esconder defecto confirmado como falso positivo.
- No utilizar `verified` si la ejecución del caso es simulada. Sin entorno apropiado, `NO EVALUADO` y no prometer liberación.

**Importante:** el script valida SOLO incidentes registrados. No descubre automáticamente todos los nuevos defectos ni demuestra 100% cobertura. Agregar revisiones de PR, ataques negativos, pentesting pertinente, pruebas de concurrencia, release aislado y mediciones reales.

## Reglas para evitar abuso
- QA define expectativas independientemente del código corregido.
- No modificar la prueba para que pase, desactivar escenarios ni usar excepciones sin aprobación versionada.
- Los atributos `rootCause`, `evidenceLevel`, `regressionCaseIds`, `reproductionFile`, `reviewer` y los enlaces a fuentes se justifican, no se inventan.
- Defectos/recomendaciones/decisiones son clases distintas. No atribuir todo el fallo al desarrollador automáticamente.
- El objetivo es **9.5 sin sacrificar seguridad ni calidad por velocidad**. Si falta observación, no hay aprobación.

Referencia: `references/registro.md`.
