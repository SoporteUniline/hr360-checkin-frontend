# Evidencia mínima para aplicar Mobile UX Architect

Usar la rúbrica y plantilla de `../../evaluacion-ux-movil/`.
Por vista registrar ruta, rol, estado, commit, datos de prueba, viewport, tema y fecha.

1. Identificar tarea y siguiente acción antes de modificar estilos.
2. Renderizar cada superficie afectada: expansión, detalle abierto y edición no son equivalentes.
3. Comparar capturas equivalentes en 320, 360, 375, 390, 414, 430, 768 y escritorio.
4. Comprobar claro/oscuro, nombres largos, montos grandes, fechas, vacíos y errores.
5. Medir overflow desde el motor de layout; distinguir scroll intencional.
6. Probar tabs, expansión, menús, acciones, teclado, foco, zoom y safe areas.
7. Registrar build, tipos, regresión y pruebas de permisos; no sustituirlos por captura.
8. Evaluar cada dimensión de 0–5 con su peso; sin evidencia queda pendiente.
9. Declarar bloqueos, cobertura y límites antes de aprobar. No prometer 100 por defecto.

Referencias oficiales (consultadas 2026-10-20):
- WCAG 2.2: https://www.w3.org/TR/WCAG22/ (normativa web).
- Tamaño mínimo de objetivo: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum/
- Apple HIG: https://developer.apple.com/design/human-interface-guidelines/accessibility
- Android: https://support.google.com/accessibility/android/answer/7101858
- Responsive: https://web.dev/learn/design/

Las recomendaciones de 44 pt iOS, 48 dp Android y el criterio web de 24 CSS px
(con excepciones) tienen unidades y condiciones distintas. No intercambiarlas.
