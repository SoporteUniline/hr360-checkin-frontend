---
name: evaluacion-ux-movil
description: Auditor independiente de calidad móvil por pantalla, con rúbrica 0–100, evidencia por criterio y cobertura de rutas. Activa al revisar cambios de mobile-ux-architect, solicitar una calificación de UX móvil o declarar optimizado un módulo móvil.
---

# Evaluador UX móvil — Uniline

**Prohibido otorgar 100/100 por defecto.** El objetivo 95/100 no es evidencia. Puntuar solo lo verificado; si no se pudo renderizar una vista, **NO EVALUADA** (no 100 ni 0 inventado). El evaluador complementa `evaluacion-agente`, `ux-ui-jerarquia-saas` y `mobile-ux-architect`.

## 1. Cobertura real
Construye el inventario de rutas visibles por rol, vistas de detalle, formularios, modales, estados, temas y flujos. Por pantalla registra: URL/ruta, tipo, rol, viewport, escenario, fecha, versión/commit, dispositivo real/emulado, enlace de captura/video, prueba de interacción y limitación.
**Nunca certificar todo el sistema por observar una pantalla.**

## 2. Rúbrica 100 puntos
Cada dimensión se puntúa de 0 hasta su peso. Por criterio documenta observación, evidencia y prueba. No otorgues puntos por promesas o código que nunca se renderizó.

| Criterio | Peso |
|---|---:|
| Información completa, sin truncar datos esenciales | 15 |
| Densidad y aprovechamiento de pantalla | 12 |
| Facilidad táctil, safe areas, una mano y teclado | 15 |
| Jerarquía visual, legibilidad y semántica de estados | 15 |
| Navegación, filtros, formularios y feedback | 15 |
| Modo claro y oscuro, reflow y responsive | 12 |
| Accesibilidad WCAG 2.2 y rendimiento comprobable | 16 |
| **Total** | **100** |

Puntuar como máximo el peso de cada dimensión. Sin datos suficientes sobre un criterio: `NO EVALUADO` para esa dimensión y **no producir puntuación final absoluta**. Con evidencia parcial, reportar puntos validados y cobertura, sin extrapolar.

## 3. Bloqueos de calidad (aunque el promedio sea alto)
- Nombres esenciales truncados sin acceso claro; acciones bloqueadas por teclado.
- Función esencial perdida en móvil o regresión de reglas de negocio.
- Error de pago/persistencia presentado como éxito.
- Acción táctil crítica inaccesible o barrera de accesibilidad importante.
- Exposición de datos/permisos.
- Modo oscuro o tamaño de pantalla crítico inutilizable.
Un bloqueo deja la vista en **NO APROBADA** aunque tenga 95+.

## 4. Verificación
Capturas y flujos reales cuando estén disponibles; pruebas automatizadas (Playwright, axe) más revisión manual de controles, lectores de pantalla y lectura de datos. Comparar antes/después en escenarios iguales. Indicar con precisión qué no se pudo medir (por ejemplo INP/CLS de usuario real).
NUNCA asumir que score automatizado garantiza conformidad WCAG.

## 5. Clasificación
- 95–100: objetivo de excelencia **solo si cobertura completa y cero bloqueos**.
- 85–94: alta calidad con mejoras pendientes.
- 70–84: aceptable, necesita correcciones.
- <70: deficiencias significativas.
- Sin evidencia/cobertura incompleta: **NO EVALUADA**, no calificación inventada.

## 6. Informe
Ruta/rol/viewport/tema, criterio (peso/resultado), evidencia, severidad, cambio propuesto, estado de corrección, retest y limitaciones. Resumen de rutas evaluadas/total y escenarios probados/planeados. No declarar éxito del proyecto completo sin pruebas de los flujos afectados.

Usa `references/plantilla-auditoria.md` como hoja de evidencia y `evaluacion-agente` para comprobar si el agente aplicó correctamente la skill.

## Escala 0–5 y evidencia por dimensión
Si se presenta el evaluador de siete controles, iniciar cada criterio en **sin evaluar**,
no en 5. Registrar 0–5 solo con evidencia suficiente: 0 inutilizable, 1 deficiencia
grave, 2 problemas relevantes, 3 funcional con fricción, 4 buena calidad con detalles
pendientes, 5 cumple los casos definidos sin defectos observados. Cero significa
fallo observado; no significa prueba ausente.
Conservar los pesos de esta skill: puntos = peso × nota / 5. No dividir entre
criterios probados para inflar el total ni convertir siete 5/5 de ejemplo en 100 real.
No dar nota absoluta mientras una dimensión siga sin evaluar. Separar comprobaciones
de navegador, dispositivos reales, lector de pantalla, rendimiento medido y pruebas
de negocio. Accesibilidad/rendimiento no obtiene 5 por pasar lint, build o axe.
En cada retest conservar la captura/version anterior, la versión nueva y el alcance
exacto. El resultado de una pantalla no aprueba otros módulos ni otros estados.
