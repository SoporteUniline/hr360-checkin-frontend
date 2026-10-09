# Control de Activos y Uniformes — integración para Cano

## Estado de esta entrega

Frontend completo de demostración en `/panel/control-activos`. No crea tablas, rutas API ni movimientos reales. Navegación propia en el sidebar, páginas de activos/uniformes, altas y edición, entregas, devoluciones parciales, cambios de talla, mantenimiento, solicitudes, paquetes por puesto, resguardos/PDF y movimientos. El Panel de empleado (Expediente 360°) incorpora dos apartados: Activos asignados y Uniformes entregados.

La demo usa `localStorage` por usuario autenticado y empresa, versión 1. No es almacenamiento compartido ni control de seguridad de producción. Cuenta con aviso permanente y restablecimiento explícito. Los empleados ficticios tienen ID `demo-*`; una prueba explícita iniciada desde un expediente real usa `real-{id_empleado}` exclusivamente como referencia local. No hay escrituras a las APIs existentes. No migrar automáticamente estos datos a producción.

## Archivos y separación de responsabilidades

- `src/lib/activos/model.mjs`: entidades, datos de ejemplo, consultas y comandos puros. Sirve de referencia de reglas, no de sustituto de validación en servidor.
- `src/lib/activos/demoRepository.js`: adaptador `read()` y `execute(command, expectedRevision, actor)`. Reemplazarlo por cliente HTTP; convertir las operaciones de UI a asíncronas, estados de carga y errores. No volver a demo automáticamente cuando una API falle.
- `src/components/activos/ActivosProvider.jsx`: selección de empresa, sesión, estado y confirmación de operaciones.
- `src/components/activos/*`: pantallas, formularios y expediente reutilizable.
- `src/lib/activos/pdf.js`: PDF de demostración, siempre marcado como ficticio.
- `scripts/test-activos.mjs`: reglas y transacciones de referencia.

## Datos necesarios

Todas las entidades deben llevar `id_empresa`. Las FK también deben impedir relaciones entre empresas.

| Entidad                  | Campos principales                                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Artículo / variante      | id, empresa, tipo asset/uniform, nombre, código único por empresa, categoría, marca/modelo o talla/color, serie única cuando aplique, retornable, mínimo, costo referencia, meses reposición, activo, versión |
| Existencia por ubicación | artículo, ubicación, disponible, revisión, baja; para activos, una unidad física con identificador propio                                                                                                     |
| Entrega                  | id, folio único, empresa, empleado real, modalidad, fecha, devolución prevista, observaciones, usuario que entrega, estado, versión                                                                           |
| Partida de entrega       | artículo/unidad, cantidad, devuelto, perdido, snapshot del nombre/código/serie/talla/retornable al entregar                                                                                                   |
| Acuse                    | entrega, empleado autenticado, recibido/diferencia, observaciones, fecha servidor, evidencia opcional; diferenciar acuse simple de firma electrónica                                                          |
| Movimiento               | empresa, artículo, ubicación origen/destino, cantidad, tipo, referencia, empleado, responsable autenticado, fecha servidor, motivo, idempotency key                                                           |
| Mantenimiento            | artículo, cantidad, motivo, proveedor/responsable, ingreso, fecha prevista, cierre, resultado, costo, resolución                                                                                              |
| Paquete por puesto       | empresa, puesto del catálogo, artículos/variantes y cantidades                                                                                                                                                |
| Preferencias de empleado | empleado real, talla uniforme, calzado; no duplicar nombre/puesto/departamento como catálogo independiente                                                                                                    |
| Solicitud                | empleado, tipo, descripción, estado, respuesta, responsable y fechas; relación opcional con asignación                                                                                                        |

Consumibles se representan como artículos no retornables. El historial de entrega se conserva aunque no se espere devolución. No sumar consumibles al indicador de artículos que deben recuperarse al dar de baja a la persona.

## API propuesta (nombres a acordar)

Base: `/checador/control-activos`. Alternativamente, Route Handlers de Next.js pueden delegar en el backend; no requieren un segundo modelo de datos. La UI no necesita acceso directo a credenciales de base de datos.

| Método y ruta                       | Uso                                                                              |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| GET `/resumen?empresa=`             | Indicadores y pendientes                                                         |
| GET/POST `/articulos`               | Catálogo paginado, filtros tipo/texto/ubicación/estado; alta                     |
| GET/PATCH `/articulos/:id`          | Detalle y edición con versión                                                    |
| POST `/articulos/:id/archivo`       | Archivar/reactivar sin borrar historial                                          |
| POST `/entradas`                    | Registrar compra/entrada de uniformes                                            |
| POST `/ajustes`                     | Baja con motivo y permiso explícito                                              |
| POST `/traslados`                   | Traslado por cantidad entre ubicaciones en una transacción                       |
| GET/POST `/entregas`                | Historial y entrega transaccional con sus partidas                               |
| GET `/entregas/:id`                 | Resguardo, snapshots y estado de devolución                                      |
| POST `/entregas/:id/reversion`      | Revertir entrega pendiente de acuse y sin devoluciones, dejando contramovimiento |
| POST `/entregas/:id/acuse`          | Recibido/diferencia por el propio empleado                                       |
| POST `/devoluciones`                | Recepción parcial de partidas: disponible / revisión / pérdida                   |
| POST `/cambios-uniforme`            | Recepción y nueva entrega atómicas; no aceptar solo la mitad del cambio          |
| GET `/empleados/:id/recursos?tipo=` | Activos, uniformes e historial del Expediente 360°                               |
| PATCH `/empleados/:id/tallas`       | Preferencias de talla                                                            |
| GET/POST/PATCH `/paquetes`          | Dotaciones relacionadas con puestos existentes                                   |
| GET/POST `/mantenimientos`          | Registro y consulta                                                              |
| POST `/mantenimientos/:id/cierre`   | Reparado disponible o baja definitiva                                            |
| GET/POST `/solicitudes`             | Incidencias y peticiones del empleado                                            |
| POST `/solicitudes/:id/respuesta`   | Resolución por RH sin cambiar stock automáticamente                              |
| GET `/movimientos`                  | Auditoría paginada y exportación filtrada                                        |

Lecturas: `{ data, meta: { page, limit, total } }`. Escrituras: `{ data, version }`. Errores: `{ error: { code, message, fields? } }`, HTTP 400/401/403/404/409/422. Una escritura debe devolver el estado confirmado, no un éxito anticipado.

Ejemplo de entrega (IDs reales al integrar):

```json
{
  "empresa": 123,
  "employeeId": 456,
  "mode": "Préstamo",
  "due": "2026-11-15",
  "note": "Equipo en buen estado",
  "lines": [{ "productId": 789, "qty": 1 }]
}
```

Ejemplo de devolución:

```json
{
  "employeeId": 456,
  "note": "Cargador pendiente; equipo recibido sin golpes",
  "lines": [{ "deliveryId": 101, "lineId": 102, "qty": 1, "condition": "good" }]
}
```

`condition`: `good` regresa a disponible; `review` crea revisión y no queda disponible; `lost` cierra responsabilidad por pérdida con registro de baja y motivo, sin descuentos automáticos.

## Reglas de servidor y permisos

1. Reutilizar sesión actual; verificar identidad en servidor. `empresa`, empleado y actor enviados por cliente nunca bastan para autorizar.
2. RH/almacén según permisos puede gestionar sus empresas/ubicaciones. El empleado únicamente consulta sus recursos, registra solicitudes y confirma sus propias entregas. Ocultar botones no es autorización.
3. Cada activo individual tiene máximo una unidad activa. Series y códigos únicos por empresa. Entregar únicamente existencia disponible, nunca en revisión, archivada o asignada.
4. Entrega, devolución, reversión y cambio de talla deben ejecutarse en transacción con bloqueo/actualización condicional de existencias. Cero stock negativo y cero doble asignación bajo concurrencia.
5. `Idempotency-Key` en escrituras; la repetición después de timeout devuelve el mismo resultado, sin duplicar movimientos. Conflictos de versión devuelven 409.
6. Fechas/actor/folios generados o verificados por servidor. Devoluciones nunca superiores a lo pendiente. Cantidades enteras positivas y sin partidas duplicadas.
7. Snapshots de resguardos inmutables. Editar nombre, talla o costo en catálogo no modifica documentos anteriores.
8. Las correcciones conservan trazabilidad; no borrar movimientos ni resguardos. No revertir entregas con acuse o devoluciones; usar operación administrativa auditada si más adelante se requiere.
9. Al cambiar de empresa, invalidar caché y descartar selecciones anteriores. Nunca consultar con empresa `all` una escritura.
10. Reutilizar catálogos reales de empleados, puestos, departamentos, empresas y unidades. Bloquear nuevas entregas a empleados dados de baja y mostrar pendientes durante su salida.
11. Evidencias futuras: almacenamiento privado, límites de formato/tamaño, URLs temporales autorizadas; no guardar binarios en la tabla ni aceptar URLs públicas arbitrarias.

## Alcance de la demo y pasos para conectar

La demo muestra PDFs descargables, acuses simulados, preferencias de talla, búsqueda/exportación y paquetes con variantes explícitas. No manda notificaciones ni captura firmas reales. Los traslados de demo mueven el registro completo disponible y sin asignaciones; la API real debe modelar existencias por ubicación para permitir traslados parciales de uniformes.

1. Crear esquema/migraciones y endpoints con permisos/transacciones.
2. Proporcionar contrato final y ejemplos de respuestas y errores.
3. Sustituir adaptador, añadir carga/paginación de servidor y conectar los catálogos reales.
4. Eliminar simulación de acuse de la interfaz RH; implementar confirmación desde cuenta de empleado.
5. Habilitar logo real de empresa en resguardos/PDF, almacenamiento privado para evidencias y plantillas legales revisadas si se requieren firmas.
6. Validar dev con dos empresas, usuarios de RH y empleados: doble entrega concurrente, devolución parcial repetida, cambio de talla sin stock, acceso ajeno, documentos históricos y baja de empleado.
7. Retirar el aviso demo únicamente después de conectar y verificar todos los flujos. No reutilizar datos ficticios como inventario inicial.
