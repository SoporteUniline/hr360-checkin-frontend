---
name: memoria-asociativa
description: Recuperación selectiva de contexto por módulo y relaciones verificadas. Usa esta skill al modificar una vista, un campo, una función o una regla en un proyecto grande; enruta al documento del módulo y sus dependencias sin cargar todo el repositorio, y verifica qué memoria debe actualizarse.
---

# Memoria asociativa verificable · Uniline

**Idea:** una pista («ventas», «cancelar cobro», «inventario») recupera un índice, no el proyecto completo. La memoria vive en archivos versionados, NO en los pesos del modelo; el agente no aprende permanentemente solo por conversar. Inspiración: índices de recuperación/consolidación de memoria humana, como ANALOGÍA, no como copia biológica.

## Ruta de uso
1. **Enfocar:** identifica módulo y riesgo desde la petición. Antes de abrir documentos grandes, ejecuta el enrutador pequeño:
   `node .claude/scripts/contexto.cjs route ventas --risk normal`
   Si el script no está instalado, inspecciona SOLO el índice `docs/contexto/relaciones.json` y `docs/modulos/<modulo>.md`; no inventes rutas.
2. **Pistas/índice:** el enrutador devuelve rutas y grados de asociación, NO volcados completos. Abre el resumen del módulo principal; investiga el código real necesario.
3. **Propagación controlada:** abre vecinos directos únicamente cuando su dependencia pueda afectar la solicitud. Para riesgos de permisos, dinero, stock, multiempresa o cambios de modelo usa `--risk high`: sugiere relaciones de 2 saltos, **sin afirmar que el grafo es completo**.
4. **Relevancia comprobada:** cada arista debe incluir `evidence` rastreable (archivo/ruta, D-XXX, función, FK o prueba). Si no está documentada o hay contradicción, busca por símbolos/SQL antes de omitir módulos. El script NO es una garantía de inexistencia de relaciones.
5. **Frescura:** verifica `sourcePath` y `sourceSha256` si están presentes; si cambiaron, relación `STALE`: vuelve a contrastar antes de confiar. No inventes un hash ni lo actualices para esconder una diferencia.
6. **Memoria plástica:** cuando un cambio real modifica una entidad, campo, flujo o dependencia, actualiza el documento correspondiente y sus conexiones de modo transaccional con el cambio; conserva decisiones D-XXX y pruebas. Nuevas relaciones solo con evidencia. Marca como «requiere revalidación» las conexiones afectadas; no borres historia silenciosamente.
7. **Cierre:** ejecuta `node .claude/scripts/contexto.cjs check --base <base-ref>` si existe Git. Un resultado con advertencias exige análisis y documentación o justificación; NO certifica cobertura completa ni convierte CSS trivial en cambio de reglas. La CI puede aplicarlo como auditoría progresiva.

## Niveles de profundidad
- **Puntual / estilo trivial:** 1 vista, componente y tokens relevantes. No cargar 10 documentos ni actualizar ER por cambiar un margen.
- **Cambio funcional normal:** módulo principal, dependencias directas verificadas, fuente de código y pruebas relevantes.
- **Crítico:** 1–2 saltos, decisiones financieras/seguridad, flujos inversos, tests adversariales, RLS y código real. Nunca economizar tokens a costa de un fallo grave.

## Economía por diseño
- El índice es un mapa de RUTAS, no copia de contenidos completos.
- El enrutador no debe abrir documentos de todos los módulos en cada solicitud; consulta un JSON pequeño y archivos concretos relevantes.
- Usa `contexto-eficiente` para fragmentos dirigidos, `continuidad-proyecto` para checkpoints, `integridad-operaciones` si hay efectos de negocio.
- Delegaciones: entregar módulo, aristas, fuentes y criterios; recuperar hallazgos compactos en lugar de transcripciones.
- La compactación guarda decisiones, pruebas y punteros a documentos; descarta resultados voluminosos reconsultables.
- **No prometer porcentaje de ahorro sin medir tokens reales** (input, output, cache, latencia, reintentos y calidad final). Carácteres aproximados NO son tokens facturados.

## Fiabilidad
Grafo incompleto, módulo desconocido, arista sin evidencia, fuente obsoleta o alto riesgo → señalar hueco y ampliar búsqueda semántica/código. No tratar salida vacía como «no afecta a nada». El script es ayuda determinista; Claude debe validar las relaciones y sus consecuencias. No modificar producción ni inventar «aprendizaje autónomo».
