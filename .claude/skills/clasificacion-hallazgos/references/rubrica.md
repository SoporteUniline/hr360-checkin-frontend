# Rúbrica de auditoría causal y calidad técnica · Uniline

## Estructura mínima por hallazgo
| Campo | Valor |
|---|---|
| ID y módulo | |
| Clase primaria | DEFECTO_COMPROBADO / DEFECTO_INFERIDO / RIESGO_ARQUITECTONICO / DECISION_NEGOCIO_PENDIENTE / RECOMENDACION / BRECHA_DE_VERIFICACION / DESVIACION_PROCESO / FALSO_POSITIVO |
| Etiquetas secundarias | opcional |
| Evidencia | ruta:línea, captura, SQL no destructivo, prueba / traza, fecha y versión |
| Certeza | REPRODUCIDO / OBSERVADO / INFERIDO / NO VERIFICADO |
| Contrato aprobado | D-XXX / criterio de aceptación / contrato técnico de seguridad / pendiente |
| Impacto | dinero, datos, permisos, historial, UX, rendimiento; causalidad específica |
| Severidad | crítica / alta / media / baja / oportunidad; justificar |
| Responsable de decisión | arquitecto / dueño / compartido / pendiente |
| Responsable de implementación | desarrollador / no aplica / pendiente |
| Responsable de verificación | QA / auditor / no aplica / pendiente |
| Responsable de clasificación | auditor |
| Decisión pendiente | una pregunta con alternativas y recomendación, si corresponde |
| Acción propuesta | mínima, no ejecutada hasta autorización |
| Pruebas de aceptación | escenario adversarial + regresiones |
| Estado | abierto / validación / corregido, probado / falso positivo |

## Criterios de calificación
**A. Calificar responsabilidades específicas**, no una sola «culpa del desarrollador»:
- Arquitectura: calidad de decisiones, invariantes, manejo de incertidumbre y autorización.
- Desarrollo: implementación correcta contra política vigente y controles técnicos obligatorios.
- QA: cobertura efectiva, profundidad adversarial, pruebas de integración, honestidad sobre mocks.
- Auditoría: clasificación precisa, evidencia reproducible, calibración y ausencia de falsos positivos.
- Gobierno/release: aprobaciones con alcance, reversibilidad, reconciliación de esquemas, documentación y despliegue.

**B. Evidencia primero:** una puntuación requiere criterios **predefinidos y reproducibles**, denominador claro y trazabilidad. Si no se puede medir, escribir «NO EVALUADO». Una clase `RECOMENDACION` no resta automáticamente puntos al desarrollador. Una clase `DECISION_NEGOCIO_PENDIENTE` impide implementar la alternativa no aprobada, pero no significa por sí misma «fallo de programación».

**C. Fallos bloqueantes:** cualquier defecto crítico reproducido de seguridad/integridad o desvío de autorización mantiene `NO APROBADO` hasta tener prueba de corrección. Aunque una calificación numérica parezca alta, no pasar release. Defecto inferido crítico mantiene bloqueo provisional mientras se investiga.

**D. Meta 9.5:** objetivo ≥9.5/10 por disciplina EVALUADA, sin compensar seguridad 4/10 con estética 10/10. No existe certificación por declarar que se quiere 9.5; solo pruebas suficientemente amplias, positivas, negativas, concurrentes e independientes permiten acreditarlo.

## Ejemplos calibrados
| Situación | Clase principal | Quién responde | ¿Restar puntos automáticamente al desarrollador? |
|---|---|---|---|
| «Es mejor bloquear TC manual para todos» sin decisión del dueño | RECOMENDACION o DECISION_NEGOCIO_PENDIENTE | Arquitecto + dueño | NO |
| Servidor acepta TC arbitrario para falsear cobro y no valida permisos | DEFECTO_COMPROBADO (si reproducido) | Desarrollo + arquitectura; QA por falta de prueba | SÍ, con evidencia y rúbrica |
| Dos usuarios consumen la misma existencia/saldo | DEFECTO_COMPROBADO (si reproducido) | Desarrollo + arquitectura + QA | SÍ |
| Añadir índices sin medición ni requerimiento | RECOMENDACION (a priori) | Arquitecto/DBA | NO |
| Suite UI mockeada presentada como «API real probada» | DESVIACION_PROCESO + BRECHA_DE_VERIFICACION | QA + agente que certificó | SÍ, a QA/proceso, no equivale a bug funcional |
| Una regla aprobada no aparece en la interfaz | DEFECTO_COMPROBADO (si se observa) | Desarrollo, QA | SÍ |
| Recomendación de refactor sin problema de mantenimiento medido | RECOMENDACION | Auditor | NO |
| Riesgo fundamentado aún no reproducido | RIESGO_ARQUITECTONICO o DEFECTO_INFERIDO | Por determinar | NO afirmar fallo ejecutado |

## Ejemplo de respuesta breve al dueño
«Observé X en código y reproduje Y en un entorno de prueba. Esto es un defecto de validación del servidor, independiente de que puedas permitir cambios manuales de TC. La política comercial de quién puede hacerlo todavía es tu decisión. Propongo definir permiso y registrar la excepción, luego cerrar la vía de manipulación y ejecutar pruebas REST/JWT.»

## Anti-patrones del auditor
- Equiparar «yo lo haría distinto» con defecto.
- Quitar una vulnerabilidad de la lista porque faltó una política comercial.
- Cargar al desarrollador todas las fallas de arquitectura, QA y proceso.
- Castigar por no instalar una dependencia preferida.
- Otorgar score alto porque el proyecto tiene muchos checks simulados.
- Mezclar resultado en local con producción.
- Reetiquetar el mismo defecto para descontar puntos repetidamente.
- Exigir 95/100 en función de estética subjetiva, sin criterios medibles.
