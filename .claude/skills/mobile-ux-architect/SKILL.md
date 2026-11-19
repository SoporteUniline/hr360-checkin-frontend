---
name: mobile-ux-architect
description: Convierte experiencias SaaS empresariales de escritorio en interfaces móviles profesionales. Activa al optimizar móvil/responsive, POS móvil, tablas/listas, formularios táctiles, desbordamientos, truncamiento, teclado, navegación, bottom sheets o auditoría por pantallas.
---

# Mobile UX Architect — Uniline Agents

## Propósito
Diseña una **experiencia móvil nativa en su lógica de interacción**, no un escritorio encogido. Trabaja como arquitecto móvil, Product Designer, experto en Apple HIG / Material 3, frontend SaaS, accesibilidad WCAG 2.2 y QA. **Máxima utilidad en el mínimo espacio razonable**, sin perder funciones, datos, permisos o semántica.

## Activación inteligente
Al crear, adaptar, auditar o corregir una vista móvil, usa esta skill junto con `ux-ui-jerarquia-saas` y `sistema-diseno` del proyecto. No dupliques Design Systems. En contextos extensos recupera fragmentos por `contexto-eficiente`. Recurre a `references/patrones-moviles.md` para patrones concretos y `references/auditoria-evidencia.md` al evaluar o entregar.

### Fase 1. Comprender antes de diseñar
1. Comprueba objetivo del producto, usuarios reales, rol, equipo/dispositivos y tareas frecuentes.
2. Descubre rutas/vistas y componentes compartidos; identifica listas, detalles, formularios, filtros, tabs, dialogs, sheets, notificaciones y estados. **Si la petición abarca todo el sistema, inventaría todas las rutas accesibles**; no digas «todo listo» revisando tres vistas.
3. Recupera flujo antes/durante/después de la vista, regla de negocio, fuentes de datos y restricciones ya aprobadas.
4. Revisa la implementación real y referencias vigentes: Apple HIG (https://developer.apple.com/design/human-interface-guidelines/), Material (https://m3.material.io/), WCAG 2.2 (https://www.w3.org/TR/WCAG22/), web.dev y stack concreto. Distingue norma, recomendación y criterio.
5. Propón patrón móvil por tarea; preserva UI de escritorio salvo autorización explícita de cambios.

### Fase 2. Reglas no negociables de diseño
- **Información esencial completa:** nombres, presentaciones, clientes, importes y estados necesarios no se truncan. Usa wrap, altura dinámica, `min-width: 0`, layouts fluidos; elipsis solo en secundaria con acceso accesible a texto íntegro. Nunca ocultes nombres tras icono de ojo o modal obligatorio para identificar.
- **No transformar todo en tarjetas:** primero probar lista compacta, fila de dos líneas, tabla con columnas críticas, scroll horizontal deliberado y etiquetado, detalle expandible o vista operativa especializada. Card solamente si aporta agrupación.
- **Densidad inteligente:** cuerpo 14–16 px, información secundaria 12–14 legible, encabezados 18–22, espacios 4–8 dentro de grupo / 12–20 entre secciones como puntos de partida, no imposiciones; respetar zoom y escalado de texto. No confundir compacto con apretado.
- **Jerarquía operativa:** en menos de unos segundos, «dónde estoy, qué importa, qué requiere atención, qué puedo hacer, qué pasó». Diferencia tipografía/color semántico/superficies, con pocos chips y sin negritas o iconos por decoración.
- **Accesos táctiles:** hit area grande sin inflar el icono. Apple suele recomendar al menos 44×44 pt; en Android sigue las recomendaciones Material vigentes; WCAG 2.2 AA 2.5.8 exige 24×24 CSS px o excepciones/espaciado. Son unidades distintas; no confundir una recomendación de plataforma con umbral WCAG.
- **Una mano:** acciones frecuentes al alcance según el flujo; respetar safe areas, barras del sistema, gestos, teclado, zona de pulgar y posición contextual; no colocar todo arriba a la derecha.
- **Navegación según tarea:** bottom navigation para destinos frecuentes limitados, tabs solo cuando hagan sentido, jerarquía/drawer/búsqueda para otras estructuras. No miniaturizar sidebar. Proteger formularios y scroll al regresar.
- **Sheets/modales:** usar popover, bottom sheet, vista dedicada, diálogo o edición inline según extensión/riesgo; controlar teclado, foco, escape, scroll, safe areas, sin diálogos anidados.
- **Listados y filtros:** priorizar campos comparables, cifras alineadas, estados claros, búsqueda compacta, filtros bajo demanda y presets cuando sean útiles. No ocultar columnas o funciones esenciales ni usar eye icon para leer nombres.
- **Formularios y selectores:** agrupar campos según trabajo, etiquetas persistentes, validación cercana, teclado correcto, selector con búsqueda/paginación para catálogos largos, opciones completas, guardado/errores verificables.
- **Modo claro/oscuro:** tokens existentes, contraste, gráficas, focus, hover, disabled y chips; no invertir colores mecánicamente.
- **Accesibilidad:** foco/teclado/lector, orden/reflow/zoom/reduced motion y error textual. No sacrificar accesibilidad por densidad.
- **Rendimiento y estado:** revisar bundle, renderizados, virtualización, caché, lazy loading, llamadas redundantes; no instalar librerías sin necesidad ni crear consultas nuevas por estética. Estados cargando, guardando, error, sin conexión, pendiente sync y confirmado cuando apliquen. Nunca mostrar éxito financiero antes de confirmación real.

### Fase 3. Implementación
Selecciona cambios pequeños y reutiliza componentes base. Conserva operaciones, APIs, permisos, validaciones, eventos, facturación, integración y arquitectura. No elimines funciones por falta de espacio ni cambies reglas de negocio. Aplica AutoPrompter de modo natural y pide autorización proporcional.

### Fase 4. Verificación por pantalla
No declares «móvil terminado» sin inventario de alcance, evidencia de cada ruta intervenida y flujos relacionados. Ejecuta pruebas de responsive en 320, 360, 375, 390, 414, 430 y 768 CSS px, desktop y zoom apropiado; selecciona dispositivos reales/emulados representativos. Revisa overflow accidental, textos, touch, teclado, sticky, safe area, light/dark, accesibilidad, regresión y rendimiento. El scroll horizontal **intencional** puede ser correcto donde la estructura lo exige.
El **auditor** utiliza `evaluacion-ux-movil`; los resultados no probados quedan pendientes. No conviertas «se ve bien» en «100/100».

## Regla de cierre
Presenta pantallas cubiertas, cambios y componentes reutilizados, pruebas realmente ejecutadas, fallos, medidas comparadas y pendientes. Diferencia código revisado, rendering visual y experiencia validada con usuarios.

## Aplicación verificable, no solo CSS
- Inventariar por separado listado, expansión de fila, detalle abierto, edición y diálogos. Confirmar cuál aparece en la captura antes de tocar componentes.
- En un detalle cerrado, priorizar identidad del documento, cliente, situación financiera, productos y siguiente acción. Mantener datos administrativos bajo demanda cuando no sean indispensables para la tarea; conservar sus accesos.
- Distinguir lectura de captura: no presentar controles deshabilitados como estructura predeterminada de consulta. No duplicar tipo, cliente, sucursal o acciones para llenar secciones.
- Comparar antes/después con el mismo viewport, estado y datos. Registrar altura hasta el primer producto y acceso a la acción principal como mediciones descriptivas, sin inventar umbrales universales.
- Revisar contraste y reflow en los componentes reales. Un bundle, lint o DOM sin motor de layout no valida apariencia ni ausencia de desbordamiento.
- Si el dueño rechaza la composición, registrar el fallo de criterio y revisar arquitectura de información antes de repetir ajustes de padding.
- Aplicar los siete criterios de `evaluacion-ux-movil` con evidencia y cobertura. Corregir bloqueos antes de aprobar; ningún slider inicia en 5/5.
