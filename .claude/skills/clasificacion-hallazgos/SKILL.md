---
name: clasificacion-hallazgos
description: Criterio obligatorio para arquitectos, desarrolladores, QA y evaluadores cuando aparezca un hallazgo o calificación baja: distinguir defecto reproducido, riesgo, decisión de negocio pendiente, recomendación y brecha de pruebas; atribuir responsabilidad con evidencia y mantener bloqueos de seguridad hasta verificar.
---

# Clasificación causal de hallazgos · Uniline Agents

## Convertir defectos en memoria útil, no en opiniones
Una vez distinguido DEFECTO_COMPROBADO/RIESGO de DECISION_NEGOCIO_PENDIENTE o RECOMENDACION, usa `aprendizaje-verificable` para capturar incidente, causa, escenario que falla antes, corrección, prueba que pasa después y relación de módulos verificada. Una recomendación no se registra como defecto solo para llenar el indicador de calidad. QA y auditor deben comprobar la regresión y el responsable de cada fase.


## Propósito
Evitar que una preferencia del auditor se convierta en supuesto «bug», sin trivializar vulnerabilidades reales ni desplazar indebidamente la responsabilidad al dueño. La calidad se evalúa por **corrección respecto a reglas aprobadas Y garantías técnicas de seguridad e integridad**, no por cantidad de recomendaciones o velocidad de entrega.

Esta skill es transversal y obligatoria en auditorías, diagnósticos, revisión de PR, diseño de reglas de negocio, calificación por disciplina y análisis de incidentes. Se combina con `evaluacion-agente`, `autoprompter`, `ingenieria-software`, `supabase-saas-enterprise` y `verificacion` **solo cuando correspondan**; no duplica su contenido.

## Paso 1 · Clasificar naturaleza (campo obligatorio, no mezclar)

Cada hallazgo lleva **una clase primaria** y, si procede, etiquetas secundarias:

| Clase | Definición | Consecuencia |
|---|---|---|
| `DEFECTO_COMPROBADO` | Código/resultado contradice una regla aprobada o garantía técnica y se reprodujo con evidencia | Se corrige y se prueba regresión |
| `DEFECTO_INFERIDO` | Código sugiere fallo pero no se ha reproducido; contexto o precondición inciertos | Investigar/reproducir, no afirmar explotación |
| `RIESGO_ARQUITECTONICO` | Posible fallo relevante de diseño, seguridad, escalabilidad o integridad con vía causal fundamentada | Poner control preventivo o probar exposición |
| `DECISION_NEGOCIO_PENDIENTE` | Hay varias políticas comerciales legítimas sin decisión aprobada | Presentar opciones y recomendación al dueño; no elegir unilateralmente |
| `RECOMENDACION` | Mejora opcional de legibilidad, costos, tecnología, UX o procesos; el estado actual puede ser válido | No contabilizar automáticamente como bug, defecto o bloqueo |
| `BRECHA_DE_VERIFICACION` | Falta cobertura, prueba pertinente, prueba remota o evidencia para afirmar una garantía | Es fallo de aseguramiento/QA; mantener estado NO VERIFICADO |
| `DESVIACION_PROCESO` | Se incumplió una autorización, criterio de cierre, trazabilidad, memoria o procedimiento acordado | Corregir proceso y controles verificables |
| `FALSO_POSITIVO` | El supuesto defecto quedó refutado con evidencia | Retirar penalización, documentar razón y cómo se evitó |

**No cambiar la clase de un hallazgo para mejorar artificialmente la nota.** Una decisión pendiente puede coexistir con un defecto de seguridad observado. Registra ambos hallazgos, con pruebas separadas.

## Paso 2 · Cuatro preguntas causales
1. **¿Qué se aprobó?** Buscar D-XXX, criterios de aceptación, reglas del dominio y excepciones. «No encontré» ≠ «no existe».
2. **¿Qué pasó en realidad?** Archivo/líneas, test, usuario/rol, input, salida, entorno/versión. Distinguir `OBSERVADO`, `REPRODUCIDO`, `INFERIDO`, `NO VERIFICADO`.
3. **¿La operación es inherentemente peligrosa aunque no exista regla comercial?** Protección de privilegios, aislamiento, saldos no negativos, validaciones servidor, consistencia monetaria, trazabilidad y autenticación tienen garantías técnicas mínimas. No se excusa una vulnerabilidad por no haber preguntado al dueño la política exacta.
4. **¿Qué decisión de negocio falta?** Preguntar una regla material si existen varias opciones aceptables, sin confundir el debate con la existencia o severidad de un defecto técnico.

## Paso 3 · Responsabilidades independientes, no buscar culpables
- **Arquitecto:** detecta políticas faltantes, modela invariantes, permisos, impacto, excepciones y fronteras de confianza antes del desarrollo.
- **Desarrollador:** implementa reglas aprobadas, protege límites de seguridad, valida entradas del servidor, evita condiciones de carrera y verifica su cambio. Un permiso no definido es decisión pendiente; aceptar un valor arbitrario que permite desviar importes es riesgo/defecto técnico aparte.
- **QA:** diseña y ejecuta pruebas que intenten romper invariantes, roles, errores y concurrencia. Si el código falla y su suite pasó, hay defecto de implementación **y** brecha de cobertura.
- **Auditor/evaluador:** clasifica hechos, riesgos, pendientes y recomendaciones por separado, no infiere culpabilidad ni puntuaciones a partir del estilo o preferencias personales.
- **Dueño del negocio:** resuelve políticas comerciales y prioridades que legítimamente admiten alternativas. No debe diseñar controles técnicos elementales para que el sistema sea seguro.

Un hallazgo puede tener **responsables múltiples**. Separar `causa_raiz`, `responsable_decision`, `responsable_implementacion`, `responsable_verificacion`, `responsable_clasificacion`. Distinguir responsable de la etapa donde se detectó. Sin evidencia suficiente: «responsabilidad por determinar».

## Paso 4 · Severidad y puntuación (independientes)
Clasificar severidad por **impacto × probabilidad/plausibilidad × exposición**, no por desacuerdo del auditor. Permitir severidad alta para riesgo fundado no reproducido, **sin decir que ya ocurrió**. La categoría `RECOMENDACION` o `DECISION_NEGOCIO_PENDIENTE` por sí sola NO reduce la nota técnica.
Una `BRECHA_DE_VERIFICACION` sí afecta confianza/calidad de pruebas; el desarrollo queda NO VERIFICADO donde falte evidencia crítica.
La nota 0–10 por disciplina requiere rúbrica acordada **antes** del examen, escenario, denominador, evidencia y severidad. No asignar «4/10» por un puñado de opiniones ni otorgar 9.5/10 por tests verdes. No promediar dimensiones para ocultar fallos críticos. Ver [rubrica.md](references/rubrica.md).

## Caso tipo de cambio (distinción obligatoria)
- **Negocio:** ¿quién puede modificar el TC, cuál es la fuente, cuándo aplica una excepción y quién la autoriza? Pueden existir varias políticas válidas. Clase `DECISION_NEGOCIO_PENDIENTE`; no penalizar al desarrollador por NO elegir una política arbitraria.
- **Técnico:** si el cajero manda `tipo_cambio=1000` a la API y el servidor lo usa sin validar la autorización/coherencia, pese a poder alterar cobros y cortes, hay un problema de frontera de confianza. Si reproducido: `DEFECTO_COMPROBADO`; si solo inferido: `DEFECTO_INFERIDO`/`RIESGO_ARQUITECTONICO`. **NO desaparece porque la empresa permita modificar TC en algún escenario**.
- **Proceso:** si la política quedó indeterminada y el agente decidió sin preguntar, `DESVIACION_PROCESO` atribuible a diseño/análisis. Si QA no probó manipulación por API, `BRECHA_DE_VERIFICACION`.
- **Remedio:** especificar política con el dueño, añadir validación en el límite de confianza y prueba por rol/reintento; no imponer «nunca editable» ni «editable para todos».

## Informe exigido
Para cada hallazgo: ID, clase primaria, secundaria, evidencia y nivel, regla aprobada (o ausente), escenario causal, severidad, impacto, rol/entorno, responsables por fase (o por determinar), decisión pendiente, corrección mínima propuesta, prueba de aceptación y estado. Mantener recomendaciones fuera del cómputo de defectos. Exigir confirmación para cambios productivos.
Usar [plantilla](references/rubrica.md) para revisar notas y responsabilidades. Ante evidencia insuficiente, no inventar.
