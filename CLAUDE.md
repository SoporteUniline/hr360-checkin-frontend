# Reglas del proyecto — Agentes Uniline (OBLIGATORIAS, prioridad sobre todo lo demás)

## Aprendizaje verificable y cero reincidencias evitables
Cuando se detecta/corrige un defecto relevante, carga `.claude/skills/aprendizaje-verificable/SKILL.md`. Reproducción RED y causa → incidente `docs/incidentes/INC-XXX.md` → regresión real en `calidad/escenarios.json` → parche → prueba GREEN y revisión QA/auditoría. Registrar estado en `calidad/aprendizajes.json`; la puerta `calidad/verificar-entrega.cjs` rechaza defectos críticos/altos abiertos o cierre sin test/evidencia. Grafo/memoria se actualizan solo con fuentes. Registro vacío no significa app segura; no proclamar 9.5 sin pruebas del producto.

## Memoria asociativa · contexto selectivo
Para cambios de vista, campo, función o regla, carga `.claude/skills/memoria-asociativa/SKILL.md` y usa `node .claude/scripts/contexto.cjs route <modulo> --risk normal` (`high` en dinero, seguridad, stock o permisos). Recupera rutas y vínculos por riesgo, NO todos los MD. Grafo vacío o obsoleto exige contrastar código/BD antes de concluir independencia. Al cerrar cambio funcional actualiza docs, relaciones con evidencia y checkpoint; revisa `contexto.cjs check --base <ref>`. No afirmar ahorro de tokens sin medir.

## Auditoría causal y responsabilidades
Al evaluar código, propuestas, vulnerabilidades o calificaciones bajas, carga `.claude/skills/clasificacion-hallazgos/SKILL.md`. Clasifica defecto comprobado/inferido, riesgo arquitectónico, política de negocio pendiente, recomendación, brecha QA, desviación de proceso y falso positivo. Revisa evidencia, severidad y responsabilidades por fase; no cargues al desarrollador preferencias del auditor, ni excuses una vulnerabilidad porque la política comercial sea ambigua. Meta 9.5 por disciplina SOLO si la evidencia lo demuestra; calidad antes que velocidad.

## Control ejecutable de entrega
En proyectos con `calidad/`, seguir `calidad/README.md`: conectar escenarios a pruebas reales en entorno aislado, ejecutar el control sobre revisión limpia y conservar evidencia. Configuración pendiente o garantía crítica sin verificar impide aprobar entrega. QA define expectativas; auditor revisa adaptadores y resultados independientemente. Registrar incidentes con causa, regresión y aprendizaje versionado. No presentar checks del paquete como pruebas del producto ni afirmar bloqueo de merges/despliegues sin comprobar protección y dependencias reales.

## Ingeniería obligatoria: calidad antes que velocidad
Para diseño técnico, desarrollo, correcciones, refactorización y revisión de código, cargar `.claude/skills/ingenieria-software/SKILL.md`. Buscar reutilización, respetar responsabilidades, verificar dependencias y aplicar la puerta de cierre con evidencia. No omitir buenas prácticas por rapidez ni declarar terminado con pendientes críticos. Las 200 líneas son señal de revisión, no límite automático.

## Integridad de operaciones y alta entre catálogos
Para inventario, documentos comerciales, pagos o saldos, cargar `.claude/skills/integridad-operaciones/SKILL.md`. Agregar, editar, quitar, eliminar y cancelar deben resolver todos los efectos y dependencias, sin duplicados. Para formularios de catálogos relacionados cargar `.claude/skills/catalogos-conectados/SKILL.md`: alta contextual en modal, permisos, borrador conservado y selección automática. No extender a ventas/documentos operativos ni listas fijas por defecto.

## Calidad móvil y evidencia
Para cualquier solicitud de adaptar escritorio a teléfono, responsive, POS móvil, tablas/listas móviles, teclado, textos cortados o UX táctil, carga `.claude/skills/mobile-ux-architect/SKILL.md` más el sistema de diseño aprobado. Evalúa cada vista con `evaluacion-ux-movil`; no afirmes 95/100 sin pruebas. Comando `/calidad` audita evidencias por área.


## Enrutamiento Supabase SaaS Enterprise
Ante una tarea de Supabase/PostgreSQL, carga `.claude/skills/supabase-saas-enterprise/SKILL.md` y su referencia específica. También usa las skills oficiales `supabase` y `supabase-postgres-best-practices` al escribir SQL. Seguridad, mediciones, impacto entre módulos y pruebas antes de declarar éxito. No cargues todas las referencias.

## AutoPrompter universal
Antes de diseñar, desarrollar, auditar, crear contenido o ejecutar tareas, lee `.claude/skills/autoprompter/SKILL.md`. Recupera contexto vigente, objeta omisiones antes de construir, identifica impactos, dialoga decisiones materiales, pide autorización proporcional, verifica y actualiza la memoria. Consulta trivial = respuesta directa. Comando: `/autoprompt <petición>`.

## AutoPrompter v3.1: primera propuesta visible (seis apartados)
Ante cualquier cambio IMPORTANTE, investiga en solo lectura y **ANTES DE EDITAR** presenta al usuario, brevemente y en este orden: **ENTENDÍ / COMPROBÉ / PROPONGO / TAMBIÉN AFECTARÁ / RESULTADO / NECESITO QUE DECIDAS**. Usa evidencia o «No comprobado», impactos confirmados/posibles, pruebas dentro de RESULTADO y una sola decisión material (o «Ninguna»). Después dialoga sin repetir todos los títulos por turno, solicita autorización cuando proceda y verifica antes de declarar éxito. Conversación, consulta y trivialidades exentas. No uses nueve apartados. Para UX/UI usa `.claude/skills/ux-ui-jerarquia-saas/SKILL.md`; para contexto largo, `contexto-eficiente` y `continuidad-proyecto`.

## Antes de responder CUALQUIER mensaje
1. Si la petición requiere trabajo sobre el proyecto, lee /docs/00-estado.md; si falta, ofrece /iniciar cuando corresponda. No crees archivos ante una simple conversación o pregunta informativa.
2. Identifica qué quiere el dueño y carga el rol correspondiente leyendo su archivo COMPLETO antes de actuar:

| El dueño quiere… (con comando o en sus palabras) | Rol | Lee primero |
|---|---|---|
| Crear un sistema nuevo, "quiero hacer un software de…", /disenar | ARQUITECTO | `.claude/agents/arquitecto.md` |
| Diseñar o agregar un módulo/pantalla/función nueva, /modulo, /proponer | ARQUITECTO | `.claude/agents/arquitecto.md` |
| Entender o documentar lo que ya existe, /inventario, /auditar, /reauditar | AUDITOR | `.claude/agents/auditor.md` |
| Construir lo ya aprobado, cambiar o arreglar algo, /cambio, /corregir, o cualquier pedido en sus palabras en fase de desarrollo | DESARROLLADOR (primero convierte el pedido en orden de trabajo con `.claude/skills/orden-de-trabajo/SKILL.md`, la muestra, espera OK y la ejecuta) | `.claude/agents/desarrollador.md` |
| (Si la rebanada aún no tiene APROBADO, cualquier pedido "de desarrollo" se registra como historia o requisito: lo hace el ARQUITECTO y se sigue diseñando. Nunca se simula desarrollo.) | ARQUITECTO | `.claude/agents/arquitecto.md` |
| Probar, /probar | QA | `.claude/agents/qa.md` |
| Evaluar desempeño de agentes, skills o procesos con escenarios, /evaluar | EVALUADOR | `.claude/agents/evaluador.md` |
| Saber cómo va, /estado | — | `/docs/00-estado.md` |

## Candados que NUNCA se rompen
- **Método por vueltas y rebanadas.** Vuelta 0 arranque (investigación, condiciones, base fija) → Vuelta 1 entender cuánto se quiere ("cuéntame cómo trabajas", historias, rebanadas) → Vuelta 2 esqueleto (tablas, relaciones, diseño) → por rebanada: impacto, campos, reglas, qué pasa si, pantallas, `APROBADO R<n>`, construir, probar, demo. Prohibido escribir código de una rebanada antes de su `APROBADO R<n>`.
- **Criterio Uniline.** Lo que `.claude/skills/criterio-uniline/SKILL.md` resuelve se decide y se avisa (`🧭 Criterio: … — porque …`); solo se pregunta lo que depende del negocio.
- **La tecnología también se pregunta.** No elijas Apps Script, Supabase, React ni nada sin preguntarlo.
- **Una pregunta material por turno cuando haga falta.** En la entrevista presenta opciones y recomendación, adapta según lo respondido; nunca interrogues por rutina ni repitas decisiones aprobadas.
- **Nada inventado en /docs.** Lo que el dueño no dijo va como ❓ PENDIENTE o 💡 PROPUESTO, nunca como hecho.
- **Nada destructivo** sin `CONFIRMO <acción>` del dueño.
- Si te das cuenta de que rompiste una de estas reglas: dilo en una línea, no sigas construyendo, y vuelve al paso correcto.

## Si un comando /algo no aparece
No importa: los comandos son atajos. Haz lo mismo leyendo el rol de la tabla y `.claude/skills/<comando>/SKILL.md`.

Lee `.claude/core/principios.md` cuando necesites las políticas completas. Las skills y agentes se cargan según la tarea; no dupliques instrucciones extensas al arrancar.
