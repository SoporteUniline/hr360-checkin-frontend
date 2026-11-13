# Patrones de diseño móvil empresarial — Guía de consulta selectiva

## A. Listas frente a tarjetas
**Lista compacta 2–3 líneas:** identificación completa + dato crítico + estado/acción; ideal ventas, inventario y clientes.
**Tabla priorizada:** mantener columnas comparables (importe, stock, tiempo), encabezados asociados y desplazamiento visible si es deliberado.
**Detalle expandible:** información secundaria dentro de la misma vista o panel contextual, no esconder acciones esenciales.
**Tarjeta:** solo cuando una entidad agrupa atributos relacionados y mejora el escaneo. Evita una tarjeta grande por cada dato.
Para todos: texto flexible, altura dinámica, `min-width:0`, numerales alineados y targets táctiles adecuados.

## B. Módulos
| Módulo | Información prioritaria | Acción operativa |
|---|---|---|
| POS/ventas | Cliente, producto completo/presentación, importe, carrito, pago, estado | Buscar, agregar, cobrar, guardar |
| Inventario | Nombre completo, presentación, existencias, unidad, ubicación, lote si aplica | Movimiento, ajuste aprobado |
| Entregas | Cliente, dirección, estado, horario, responsable, incidencias | Siguiente entrega, reportar |
| Cobranza | Saldo/vencimiento, cliente, histórico | Registrar pago/conciliar |
| Restaurante | Pedido, mesa/canal, preparación, estado, prioridad | Preparar/entregar/cobrar |
| RH | Pendientes, empleado, permiso/turno, fecha | Aprobar/rechazar |
| Hotel | Reserva, habitación, check-in/out, cobro, cambio turno | Registrar / asignar |

No imponer funcionalidades que el proyecto no tenga; investigar el flujo real.

## C. Layout y controles
- Acción primaria visible y contextual; secundaria en menú cuando no se pierde descubribilidad.
- Menú inferior solo para destinos principales y limitado por espacio. Tabs desplazables requieren señal visual de contenido adicional.
- Bottom sheet para decisiones de corto alcance; formulario complejo en pantalla dedicada.
- Reservar espacio al teclado virtual: inputs, validación y confirmaciones no deben quedar ocultos; restaurar foco y scroll.
- Safe area y sticky bars no deben tapar el último registro. La botonera puede conservar posición sin superponerse al contenido.
- Filtros: «Hoy / Semana / Mes» cuando se adecuan al proceso; no imponer por estética. Preservar selecciones cuando ayuden al usuario.

## D. Testing
- Anchos: 320/360/375/390/414/430/768 y desktop; orientación, zoom y texto aumentado.
- Verificar: nombre completo, presentación, importes y estados visibles; teclado; control con una mano; errores y guardado real.
- Light/dark, foco, lectores de pantalla, contraste y objetivos táctiles.
- Sin cambios en permisos/operaciones ni consultas nuevas por estética.
- Lista total de rutas vs rutas probadas: una vista auditada no certifica todo el proyecto.

## Referencias oficiales (consultar las vigentes)
Apple https://developer.apple.com/design/human-interface-guidelines/ ; Material https://m3.material.io/ ; WCAG https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum ; web.dev https://web.dev/
