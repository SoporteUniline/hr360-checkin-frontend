---
name: contexto-eficiente
description: Recuperación selectiva y economía de contexto para repositorios grandes, conversaciones largas, delegación a subagentes y búsquedas que consumen muchos tokens. Actívala cuando necesites explorar documentación o compactar.
---

# Contexto eficiente — Uniline

## Enrutamiento selectivo de módulos
Cuando exista documentación modular y la petición afecte una vista, campo, flujo o función, comienza por `memoria-asociativa` y su enrutador `.claude/scripts/contexto.cjs`. Retorna rutas y aristas verificadas sin cargar todos los archivos. Consulta primero el documento principal y expande vecinos por riesgo; alto riesgo exige búsqueda adicional incluso si el índice no registra vínculos. La ausencia de relaciones registradas no es prueba de independencia.


**Meta:** menor contexto suficiente para un resultado correcto; nunca menor costo a expensas de integridad o seguridad.

1. **Orientar:** propósito de la tarea, módulo, fuentes, /docs/00-estado.md e índices. No leer toda /docs.
2. **Localizar:** buscar nombres, símbolos y referencias; consultar después fragmentos concretos. Ampliar búsquedas si no hay evidencia suficiente; «no encontrado» NO demuestra inexistencia.
3. **Profundizar:** leer completos solo los archivos necesarios para cambios seguros y verificar los cruces relevantes.
4. **Skills por demanda:** elegir por metadata; no inyectar todas las skills de diseño, BD o marketing al mismo tiempo.
5. **Herramientas:** limitar logs, resultados y campos; preservar fuentes, versiones, errores y cobertura.
6. **Subagentes:** delegar objetivo, criterios, permisos y referencias; exigir hallazgos, pruebas, pendientes; no copiar transcripciones completas.
7. **Checkpoint:** antes de compactar o al cerrar hito, usar `continuidad-proyecto`: guardar decisiones, evidencias y próximo paso fuera del chat. Una compactación puede perder matices.
8. **Eficiencia medible:** registrar tokens reales si el proveedor los expone; longitud de prompts no es equivalente a costo total. Medir calidad, latencia y correcciones.

**Nunca** omitas reglas críticas, permisos ni datos que alteren el resultado para ahorrar tokens. En tareas triviales carga poco; en situaciones de alto riesgo investiga en profundidad.

Referencias:
- https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
