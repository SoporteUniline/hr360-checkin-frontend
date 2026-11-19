---

## Extensión móvil sin duplicar Design System
Cuando el trabajo se centre en teléfonos, formularios táctiles, tablas compactas o POS móvil, consulta `mobile-ux-architect` (especialización) y `evaluacion-ux-movil` para auditoría con evidencia. Conserva la identidad aprobada y evita adaptar escritorio mediante solo reducir tamaños.

name: ux-ui-jerarquia-saas
description: Estándar maestro de jerarquía visual, UX/UI y calidad SaaS. Cargar al diseñar, construir, modificar o auditar cualquier pantalla, tabla, formulario, dashboard o interfaz administrativa. Orquesta sistema-diseno, accesibilidad y frontend-design sin reemplazar las reglas de marca ya aprobadas.
---

# UX/UI y jerarquía operativa — Uniline

## Misión
Trabaja con criterio de Product Designer, UX/UI senior, Design Systems, frontend, accesibilidad WCAG 2.2 y SaaS empresarial. La interfaz no debe ser solo atractiva: debe permitir saber **dónde estoy, qué importa, qué requiere atención, qué puedo hacer y qué ocurrió**.

## Antes de diseñar
1. Conoce objetivo del producto, usuarios, roles, dispositivos y tarea real.
2. Inspecciona la vista actual, flujo anterior/posterior, datos, errores y estados.
3. Carga **/docs/sistema-diseno.md**, tokens y componentes existentes; la marca aprobada tiene prioridad. Si no hay guía, propón una sin inventar logotipos ni paletas definitivas.
4. Recupera sólo lo necesario de `sistema-diseno`, `frontend-design`, `accessibility`, `ui-ux-pro-max` y `web-design-guidelines`; NO todas las skills a la vez.
5. Identifica acción principal, información crítica, tareas secundarias, advertencias y dependencias. No diseñes una pantalla aislada.

## Seis jerarquías obligatorias
**Tipográfica:** diferencia títulos, secciones, cuerpo, datos tabulares, etiquetas y KPI. Valores orientativos: H1 22–26 px / semibold; H2 16–18; cuerpo 14–16; tablas 13–14; etiquetas 12–13; KPI 24–32; se adaptan a contexto, zoom, diseño existente y accesibilidad. No pongas todo en negrita.
**Color:** tokens semánticos primary/success/warning/danger/info/neutral, cada significado consistente. Marca ≠ advertencia. Color nunca es el único medio para comunicar estado.
**Superficies:** fondo neutral muy suave, contenido limpio, bloques funcionales, alertas y totales visibles. Evita tarjetas anidadas, sombras decorativas, bordes excesivos y degradados innecesarios.
**Chips:** solo estados, categorías y prioridades que se beneficien; texto legible, semántica estable, contraste y alternativa textual. No conviertas cada dato en chip.
**Espacial:** agrupa por relación con escala coherente, por ejemplo 4/8/12/16/24/32 px. Proximidad antes que separadores.
**Operativa (prioridad máxima):** destaca lo que permite trabajar: venta (cliente, importe, pago, estado), inventario (existencias y movimientos), logística (entregas/incidencias), cobranza (vencimientos/saldos), RH (autorizaciones), restaurantes (pedidos y tiempos). La jerarquía de la pantalla sigue la tarea, no el gusto del diseñador.

## Sistema único de componentes
Reutiliza encabezados, navegación, botones, filtros, tablas, paginación, formularios, selectores, estados, chips, alertas, KPI, modales, drawers, menús, cargas, confirmaciones, feedback y estados vacíos. Registra variantes normal/hover/focus/disabled/loading/error/success donde correspondan. No dupliques CSS ni implementaciones. Si falta una pieza en el Design System, propón extenderlo, no crees una familia paralela.

## Patrones obligatorios
**Tablas administrativas:** encabezados discernibles; columnas consistentes; números e importes a la derecha; fechas/monedas con formato local; nombres importantes con peso moderado; IDs secundarios; chips cuando corresponde; acciones identificables; orden/filtros activos; vacío/carga/error; densidad compacta si mejora tarea. No uses colores/negritas en cada celda.
**Formularios:** etiquetas persistentes, agrupación lógica, obligatorios identificables, validación contextual al lado del campo, ayudas oportunas, botones claros, feedback real después de persistir, protección de cambios sin guardar. Nunca depender solo de placeholders.
**Modo claro/oscuro:** tokens, no inversión ciega. Probar fondos, bordes, texto, chips, focus, hover, inputs, tablas, gráficos, overlays, errores y disabled en ambos.
**Responsive:** escritorio, tablet y móvil según el trabajo real; reorganiza patrones sin esconder acciones esenciales ni modificar su significado. Acciones táctiles suficientemente grandes y navegación usable con una mano cuando corresponda.
**Accesibilidad:** WCAG 2.2 AA como referencia; texto normal >=4.5:1, texto grande >=3:1, indicadores visuales no textuales relevantes >=3:1; objetivo de tamaño >=24 x 24 CSS px o excepciones de 2.5.8. Teclado, foco visible, etiquetas accesibles, orden, anuncios y reduced motion. Las verificaciones manuales siguen siendo necesarias.

## Antes de ejecutar y al concluir
Usa AutoPrompter: analiza objetivo y alcance, objeta solo problemas materiales, confirma cambio de identidad o UX que cambie flujos. No toques BD, permisos, reglas de negocio, APIs ni rendimiento para justificar estética. No agregues nuevas consultas ni dependencias sin evidencia.
**Listo cuando:** se identifica acción prioritaria, datos y estados, patrones coherentes, contraste, claro/oscuro, escritorio/móvil, interacción real, sin regresiones ni cambios de negocio. Ejecuta pruebas automatizadas disponibles y comunica claramente lo no probado.
Para checklist profundo usa [referencia de revisión](references/auditoria.md).

## Criterio de marca
Inspirarse en Apple/Stripe/Linear/Notion/Intercom sin copiarlos. La guía de cada cliente manda. Menos es más: claridad, consistencia, feedback y rendimiento antes que decoración. Documenta excepciones justificadas.
