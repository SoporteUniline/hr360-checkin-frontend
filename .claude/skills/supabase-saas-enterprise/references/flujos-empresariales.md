# Flujos de sistemas empresariales: POS, ventas, caja, inventario y offline

## Ámbitos
POS, restaurantes, ventas, cotizaciones, pedidos, productos y presentaciones, caja/cortes, pagos, créditos/cobranza, facturación, inventario/lotes, compras, entregas, rutas, RRHH y hotelería con múltiples sucursales y perfiles.

## Cada operación debe tener
Usuario/rol, desencadenante, estado inicial, reglas confirmadas, documentos/filas afectados, estado final, relaciones, mensajes y reconciliación en caso de error. Identificar qué datos se congelan históricamente. Verificar permisos, multiempresa y mecanismos de reversión.

## POS y caja
- No imponer una política única a cancelaciones: comprobar descuentos de inventario, mercancía entregada, parcialidad, cobros reales, cuentas por cobrar y saldos a favor, comisiones e implicaciones fiscales.
- Dos cajeros cobrando la misma cuenta o dos POS vendiendo la última unidad: transacciones, restricciones y control de duplicación.
- Turno/caja y corte deben mantener inmutabilidad/auditoría de movimientos según reglas aprobadas.
- Decidir qué requiere servidor, qué se hace en la UI y qué queda offline; caja y contabilidad no se arreglan solo con un toast.

## Catálogos y performance
No cargar todo «por si acaso» en el alta de venta. Revisar preselección de cliente, catálogos específicos bajo demanda, búsqueda paginada, información de precio vigente, reglas offline aprobadas y consistencia por tenant. Optimizar tras medir y sin eliminar recuperación ante pérdida de Realtime.

## Operaciones offline
- Nunca asumir «todo offline». Documentar por módulo la capacidad y restricciones reales del producto.
- Datos locales mínimos necesarios, privacidad, cifrado y dispositivo; cola de acciones con IDs idempotentes, orden de sincronización y estados pending/confirmed/rejected.
- Diseñar conflictos por precio/cupo/inventario y reconexión; no prometer garantías inexistentes.
- Simular caída y reconexión, doble reintento, nueva sesión, operaciones parciales y reconciliación del backend.

## Procesos particulares
- RH: asistencia, autorizaciones, datos personales y conservación; privilegios por centro/empresa.
- Hoteles: medianoche, corte nocturno, husos horarios, reservas y habitaciones.
- Restaurantes: pedidos de distintos canales, KDS, impresión, turnos, parciales y múltiples terminales.
- Rutas: inventario cargado, entrega, devolución, liquidación, crédito, offline y sincronización.
Estas son pistas para investigar, no hechos aprobados de un proyecto.

## Qué debe demostrar
Caso normal, cancelación, parcial, concurrencia, excepción, usuario sin permiso y reconexión (si aplica). Efectos contables, reportes y auditoría después del cambio.
