---
name: integridad-operaciones
description: Reglas obligatorias de campos, dependencias y efectos al diseñar, desarrollar, auditar o probar ventas, compras, recepciones, traspasos, ajustes, cobros, pagos, devoluciones y cualquier creación, edición, eliminación o cancelación que afecte inventario, dinero o deuda.
---

# Integridad de operaciones comerciales

## Principio obligatorio
Resolver todos los efectos de una operación, independientemente del nombre del botón o vía de entrada (UI, API, importación, automatización, sincronización). «No me dijiste que eliminar devolvía inventario» nunca es una justificación válida. Quitar una línea con efectos aplicados exige recalcular, revertir o compensar esos efectos, una sola vez. Baja lógica tampoco revierte por sí sola.
Aplicar estas reglas como base Uniline aprobada. Preguntar solo decisiones materiales del negocio no resueltas (momento de afectación, excepciones, estados); no preguntar si deben cuadrar saldos. En sistemas existentes distinguir requisito de comportamiento comprobado y documentar discrepancias antes de modificar.

## Clasificar y mapear antes de implementar
- Informativo: describe sin efectos operativos (p. ej., observación cuando no dispara automatizaciones).
- Entrada de negocio: producto, cliente, cantidad, precio, descuento, impuesto, almacén, método y monto de pago. Revisar sus dependencias; cliente y método de pago NO son necesariamente informativos.
- Calculado: subtotal, total, aplicado, saldo, existencia, reservado, disponible. Derivar de una fuente autoritativa; no permitir edición libre.
Para cada campo registrar fuente, fórmula, precisión/redondeo, dependientes directos e indirectos, evento de actualización y evidencia. Congelar valores históricos: editar el catálogo de precios, unidades o maneja_inventario no reescribe documentos ni revierte usando la configuración actual; usar los efectos y valores originales.
Para cada acción registrar estado inicial/final, precondiciones, permisos, efecto anterior/nuevo, diferencia, módulos afectados, reversión y prueba. Cubrir crear, agregar/quitar línea, editar, confirmar, entregar/recibir parcialmente, cancelar, eliminar, devolver y reintentar; marcar no aplicable con motivo.

## Reglas base
| Operación | Inventario | Importe, deuda y dinero |
|---|---|---|
| Venta | Salida para productos con maneja_inventario en el evento definido. Separar reserva, físico y disponible. | Total = líneas con descuentos, impuestos y cargos según reglas documentadas. Importe exigible no cubierto genera cuenta por cobrar. |
| Orden de compra | No aumenta físico por crear la orden. | Compromiso no equivale automáticamente a deuda exigible. |
| Recepción de compra | Sumar solo cantidad realmente recibida/aceptada, en su almacén; impedir doble entrada por compra y recepción. | Reconocer cuenta por pagar en el evento acordado, sin duplicarla. |
| Traspaso | Restar origen, sumar destino; si son dos eventos, origen → tránsito → destino. Conservar cantidad total incluyendo tránsito. | No generar venta, cobro o deuda por defecto. |
| Ajuste | Sumar o restar en almacén/producto indicado, con motivo e historial. | No crear pagos ni ventas automáticamente. |
| Cobro a cliente | Sin movimiento de unidades. | Entrada a caja/banco; disminuir deuda SOLO por importe aplicado a documentos identificados. |
| Pago a proveedor | Sin movimiento de unidades. | Salida de caja/banco; disminuir deuda SOLO por importe aplicado. |
| Devolución de cliente | Reingresar solo mercancía recibida, con condición y destino (vendible, cuarentena, etc.). | Crédito, saldo a favor o reembolso registrado, sin duplicarlos. |
| Devolución a proveedor | Salida de mercancía efectivamente devuelta. | Ajustar deuda o saldo a favor según aplicación. |
| Cancelación/eliminación con efectos | Revertir únicamente efecto pendiente de revertir; comprobar entrega y retornos reales. | Resolver deuda y pagos existentes con compensaciones trazables. Nunca borrar el dinero recibido. |

Productos sin maneja_inventario, incluidos servicios: no mover existencia del producto, sí importes y saldos. Consumos de componentes/recetas requieren reglas propias explícitas.
No permitir stock negativo salvo configuración y permiso explícitos. Revalidar disponibilidad en el servidor al confirmar, dentro de la misma operación protegida contra concurrencia; consultar desde el front no basta. Considerar reservas, almacén, unidades/presentaciones, lotes y series/IMEI cuando existan; una serie no puede salir dos veces.

## Ediciones y compensaciones
- Cantidad de 2 a 5: ajustar las 3 adicionales cuando el estado admita edición; de 5 a 2 liberar/revertir 3 según efecto aplicado. Si ya se entregó, usar devolución, no inventar regreso físico.
- Cambio de producto, almacén, lote o unidad: resolver efecto en la identidad anterior y aplicar en la nueva con sus conversiones, no solo restar cantidades de productos distintos.
- Cambio de precio/descuento/impuesto: recalcular dependientes monetarios, no unidades por sí mismo. Validar límites y reglas aprobadas de redondeo.
- Cambio de método de pago sin cambio de monto: reclasificar caja/banco/cuenta y sus dependencias; no cobrar otra vez ni alterar el total de venta. En periodos cerrados, usar corrección autorizada/compensación.
- Cambio de monto del pago: ajustar movimiento monetario, aplicaciones y saldos; no modificar subtotal/total de venta por el hecho de pagar. No aplicar a otras ventas arbitrariamente.
- Separar importe del documento, deuda pendiente, dinero recibido/pagado, importe aplicado, anticipos y saldo a favor. Si disminuye una venta ya pagada, conservar excedente como saldo a favor o reembolso explícito; no esconderlo con un saldo truncado a cero.
- Eliminar borrador sin efectos: permitir según permisos. Si hay reserva, liberarla. Documento confirmado/con dependencias: bloquear borrado físico y usar corrección o compensación con historial. Cancelar después de devolver/quitar una línea solo compensa el remanente.
- No cancelar recepción/traspaso ignorando mercancía consumida, vendida o trasladada después. Revisar dependencias y resolverlas mediante el flujo autorizado.

Definir qué representa cada saldo: físico observado, existencia registrada, reservado y disponible. Una salida al confirmar no prueba entrega física; evitar descontar además la misma reserva. Al cancelar, conservar total histórico y mostrar estado cancelado e importe exigible neto; no sobrescribir el documento original a cero.

## Implementación consistente
Centralizar reglas de dominio para todas las rutas. Persistir documento, movimientos, aplicaciones e historial en una transacción cuando compartan base; si falla una parte, rollback. Proteger reintentos con identificador idempotente y concurrencia con control de versión/bloqueo/actualización condicional según arquitectura. No hacer read-modify-write desprotegido.
Conservar movimientos con origen, línea, empresa, almacén/cuenta, cantidad/importe, actor, fecha, motivo y referencia a la reversión; no sobrescribir el historial. Existencia y deuda deben reconciliarse contra movimientos y aplicaciones.
Revisar también kardex, costos, comisiones, reportes, caches, automatizaciones y otras dependencias existentes. Publicar efectos externos después del commit mediante entrega durable, deduplicación y reintentos; no afirmar atomicidad entre sistemas independientes. Refrescar consultas afectadas sin polling masivo. Offline requiere política explícita de conflicto/disponibilidad, nunca prometer stock global garantizado sin coordinación.

## Evidencia de aceptación
Probar en entorno de pruebas todas las rutas equivalentes, no solo el botón cancelar. Como mínimo según alcance:
1. Agregar, subir/bajar cantidad, cambiar producto/almacén/precio, quitar línea y cancelar después; verificar unidades e importes finales y ausencia de doble reversión.
2. Servicio sin stock y producto con stock; insuficiencia, permiso de negativos y dos ventas simultáneas de la última unidad.
3. Cobro parcial/total, cambio de método/monto, cancelación de cobro, excedente y aplicación a varias ventas con desglose.
4. Recepción y traspaso parciales, devolución parcial y cancelación con movimientos posteriores.
5. Doble clic, reintento tras timeout, edición concurrente, fallo intermedio y aislamiento entre empresas.
6. Reconciliar documento, kardex, caja/banco, deuda y reportes; verificar automatizaciones sin duplicados.
Ejemplo controlado (venta editable, mercancía no entregada, salida aplicada): stock 10, vender 3×100 → stock 7/deuda 300; quitar 1 → stock 8/deuda 200; cobrar 150 → deuda 50; quitar 1 → stock 9/total 100/deuda 0/saldo a favor 50. El cobro sigue siendo 150 hasta un reembolso registrado.
No dar por terminado con revisión textual: adjuntar entradas, resultados esperados/observados, evidencia y escenarios no ejecutados. Las pruebas del paquete de agentes no demuestran integridad de una aplicación real.
