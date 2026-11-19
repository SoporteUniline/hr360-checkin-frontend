---
name: ingenieria-software
description: Estándar obligatorio de ingeniería para diseñar, desarrollar, refactorizar, corregir, auditar y probar software Uniline. Priorizar calidad sobre rapidez, responsabilidades claras, reutilización, integridad, seguridad, rendimiento medido y evidencia de aceptación.
---

# Ingeniería de software: calidad antes que velocidad

## Aprender del fallo mediante verificación
Cuando una corrección implique un bug real, cargar `aprendizaje-verificable`: documentar causa, prueba que antes fallaba, regresión automática y ejecución observada tras el cambio. Integrar prueba con el control de entrega `calidad/` si está instalado. No crear una lista de consejos genéricos como sustituto de pruebas. El cierre de severidades críticas/altas requiere auditoría e independencia real.


## Recuperación por asociación antes de editar
Activa `memoria-asociativa` cuando el cambio implique tablas, vistas, componentes compartidos o efectos operativos. Usa su router como primer filtro de rutas; después busca dependencias reales en código/SQL y documentos según riesgo. No trates el grafo como fuente completa, ni economices tokens ignorando pruebas, efectos secundarios o permisos. Consolidar documentos relevantes al cerrar el cambio.


## Prioridad y alcance
Priorizar corrección, integridad de datos, seguridad, claridad, mantenibilidad y experiencia de uso sobre rapidez de entrega. No omitir análisis, dependencias, pruebas necesarias o documentación para terminar antes. No confundir calidad con burocracia, más archivos o sobreingeniería: elegir la solución más sencilla que cumpla el contrato y el riesgo real.
Aplicar en proyectos nuevos y existentes, junto con las decisiones aprobadas. No introducir reestructuraciones ajenas al pedido. Ante urgencia, reducir alcance de manera explícita antes que debilitar garantías. No declarar completo lo no verificado; registrar bloqueos con su impacto y siguiente paso.

## Antes de escribir
1. Recuperar estado, decisiones, reglas y arquitectura vigentes; verificar el código real. Identificar entradas, salidas, estados, permisos, dependientes y consumidores de lo que cambia.
2. Buscar componentes, funciones, consultas, servicios, validadores, tipos y pruebas existentes. Registrar qué se reutiliza, qué se amplía y por qué se necesita algo nuevo. Usar `rg` o búsqueda equivalente.
3. Definir criterios observables de aceptación y pruebas proporcionales al riesgo. Para errores, reproducir y localizar causa antes de parchear; si no se reproduce, explicar límites y evidencia disponible.
4. Identificar la responsabilidad correcta para el cambio y todos los consumidores afectados; no copiar lógica en una nueva pantalla para evitar entender la existente.

## Reglas de arquitectura y código
- Organizar por módulos del negocio y límites claros. Separar presentación, reglas de dominio, acceso a datos e integraciones según el tamaño del sistema; no imponer capas vacías ni microservicios por apariencia.
- Mantener rutas/páginas y controladores enfocados en navegación, validación de entrada y coordinación. No concentrar en ellos UI, SQL, cálculos e integraciones. Separar rutas según responsabilidades y convenciones del framework; no exigir un archivo por ruta si la plataforma usa otra estructura.
- Cada archivo, función y componente debe tener responsabilidad identificable, nombres claros y dependencias explícitas. Evitar ciclos entre módulos y acceso directo improvisado a estructuras internas de otro módulo.
- Usar 200 líneas como señal de revisión, NO límite automático ni métrica de calidad. Dividir cuando mezcle responsabilidades, sea difícil de probar o navegar; justificar conservar unidades coherentes. No fragmentar migraciones, esquemas, archivos generados o declaraciones solo por longitud.
- Reutilizar la misma responsabilidad, no solo código visualmente parecido. Preferir composición y contratos pequeños; evitar tanto duplicación como componentes universales llenos de banderas y condicionales.
- Centralizar cada regla de negocio y su fuente autoritativa. La UI puede anticipar resultados, pero el servidor valida y calcula lo definitivo. No mantener fórmulas independientes en distintas pantallas.
- Definir contratos de entradas, salidas, errores y efectos. Usar tipos y validación de datos externos en ejecución; evitar conversiones inseguras, silenciamiento de tipos/lint y captura de errores sin tratamiento.
- Mantener cambios acotados, legibles y revisables. No mezclar refactorización masiva con una corrección. Eliminar código muerto dentro del alcance y no añadir dependencias sin necesidad y autorización aplicable.

## Datos, dominio y seguridad
- Cargar `integridad-operaciones` para inventario, documentos, importes, pagos y saldos. Definir estados/transiciones, efectos y compensaciones; toda vía de escritura comparte garantías.
- Proteger relaciones, unicidad, valores válidos y aislamiento en el servidor/base, además de UX. Hacer atómicos los cambios relacionados; contemplar fallos intermedios, reintentos idempotentes y concurrencia real. Un read-modify-write sin protección no garantiza stock ni saldo.
- Dinero y cantidades con precisión y redondeo definidos; unidades y conversiones explícitas; distinguir fechas de negocio de instantes y zonas horarias. Conservar snapshots históricos del documento.
- Verificar identidad, empresa, permiso, recurso y estado en cada operación. Ocultar botón no es control de acceso. Validar parámetros, archivos y entradas de integraciones; nunca exponer secretos en cliente, repositorio o logs.
- Migraciones versionadas: revisar datos existentes, bloqueo/duración, compatibilidad con clientes anteriores y plan de recuperación. Separar transformaciones grandes cuando corresponda. No afirmar reversibilidad sin comprobarla; si restaurar es parte del plan, probarlo fuera de producción.
- Cargar las skills pertinentes: `supabase-saas-enterprise`, `modelado-supabase`, `rls-multiempresa`, `migraciones-seguras`, `owasp-security` según alcance. No sustituirlas con un checklist superficial.

## Rendimiento, UI e integraciones
- Consultar solo columnas/filas necesarias; paginar; evitar consultas por cada fila (N+1), descargas completas repetidas y ráfagas sin control. Elegir índices con consultas y mediciones representativas, no por intuición.
- Definir propietario y ciclo de vida del estado, consultas compartidas y caché. Documentar invalidación tras escrituras, reconexión y cambio de empresa/usuario. Coordinar Realtime, polling y sincronización; no sumar mecanismos duplicados sin justificación.
- Medir antes/después cuando se afirma una mejora. Evaluar latencias y carga con volúmenes representativos; no introducir memoización, caché o complejidad sin problema concreto.
- Reutilizar sistema de diseño y componentes. Cargar `sistema-diseno`, `ux-ui-jerarquia-saas`, skills móviles y `catalogos-conectados` cuando apliquen. Formularios con borradores preservados, validaciones consistentes y navegación predecible.
- Cubrir carga, vacío, error, éxito, permisos y desconexión según contexto. No bloquear toda la pantalla por trabajo secundario. Evitar doble envío y falso éxito; distinguir guardado confirmado de pendiente. Probar teclado, foco, etiquetas, contraste, móvil/escritorio y temas soportados.
- Integraciones con contratos, timeout, reintentos limitados y deduplicación. Entrega durable y reconciliación de efectos externos tras commit; no prometer transacciones globales inexistentes. Mostrar operaciones pendientes sin fingir éxito.
- Logs estructurados e identificadores de correlación útiles, sin secretos ni datos sensibles innecesarios. Diferenciar diagnóstico de auditoría de negocio. Medir errores/tiempos/carga y definir cómo investigar y recuperar fallos del flujo modificado.

## Pruebas y entrega
- Elegir pruebas por riesgo: unitarias para reglas/cálculos, integración para persistencia/permisos, flujo completo para experiencia real y concurrencia/fallos para operaciones críticas. No escribir pruebas triviales que solo repiten implementación.
- Verificar resultados del negocio y dependencias, no solo que aparece un botón o no hay errores de compilación. Cubrir también usuarios sin permiso, otra empresa y rutas equivalentes cuando el cambio las afecte.
- Al corregir un defecto, buscar el mismo patrón en otros consumidores y añadir regresión cuando el riesgo lo justifique. No ampliar indiscriminadamente el alcance; registrar hallazgos ajenos.
- Ejecutar gates existentes pertinentes (tipos, lint, pruebas, build). Automatizar controles repetibles acordes al proyecto; no borrar pruebas, relajar reglas o cambiar expectativas para ocultar un fallo. Distinguir fallos previos de los introducidos.
- Revisar diff final, archivos generados y consumidores de componentes compartidos. Actualizar documentación, decisiones y estado en el mismo cambio, especialmente el motivo de la decisión.
- Planear publicación, compatibilidad y recuperación según riesgo. Tener instrucciones escritas no sustituye comprobar comportamiento en la aplicación ni autoriza despliegues no pedidos.

## Puerta de cierre obligatoria
Dejar en la orden de trabajo o reporte una matriz breve, proporcional al cambio:
| Área aplicable | Evidencia (archivo/prueba/comando y resultado) | Estado |
|---|---|---|
| Responsabilidad y reutilización | búsqueda, elección, consumidores revisados | Verificado / pendiente / no aplica con motivo |
| Contratos, estados y dependencias | reglas y efectos antes/después | ... |
| Integridad y seguridad | persistencia, permisos, concurrencia | ... |
| UI, consultas e integraciones | flujo, estados y mediciones relevantes | ... |
| Pruebas y regresiones | esperado/observado, tipos/build según stack | ... |
| Documentación y recuperación | decisiones y límites vigentes | ... |
No es obligatorio imprimir toda la matriz para un cambio trivial: conservar evidencia suficiente en el lugar apropiado. Nunca marcar no aplica para saltarse un área afectada. Un área crítica pendiente impide declarar «listo» o aprobar la entrega. Reportar avance parcial, causa y siguiente paso; no inventar resultados, métricas o calificaciones.
El auditor comprueba evidencia y consumidores; QA prueba contratos y fallos; el evaluador rechaza aprobaciones sin sustento. Una revisión de instrucciones o un test estático del paquete no acredita desempeño del agente en una aplicación real.
