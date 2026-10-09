# Control de Activos y Uniformes — integración real en Next.js

El módulo utiliza las 15 tablas `cau_*` del archivo recibido de Cano
`docs/015_control_activos_uniformes_adamia_dev.sql`. No ejecuta migraciones ni
inserta datos ficticios al iniciar. Los IDs de empresa, empleado y usuario son
INT; los IDs internos de inventario se transportan como cadenas para preservar
BIGINT. No requiere cambiar el backend existente para guardar inventario.

## Rutas

| Ruta                                           | Método | Uso                                             |
| ---------------------------------------------- | ------ | ----------------------------------------------- |
| `/api/control-activos?empresa=ID`              | GET    | Estado del módulo autorizado para RH            |
| `/api/control-activos?empresa=ID`              | POST   | Ejecutar un comando de RH                       |
| `/api/control-activos/mis-recursos?empresa=ID` | GET    | Recursos y solicitudes del empleado autenticado |
| `/api/control-activos/mis-recursos?empresa=ID` | POST   | Acuse, solicitud o tallas del propio empleado   |

POST recibe `{command:{type,payload},revision}` y cabecera `Idempotency-Key`.
Devuelve `{result:{id,operationId,actor}}` únicamente después de COMMIT. El cliente
hace GET después de guardar; un fallo de refresco se informa como tal, sin fingir
que falló la escritura. GET devuelve `{state}` y `revision` como cadena.

Comandos soportados:
`location.save`, `product.save`, `product.archive`, `stock.move`,
`delivery.create`, `delivery.return`, `uniform.exchange`, `delivery.cancel`,
`delivery.ack`, `maintenance.open`, `maintenance.close`, `employee.sizes`,
`kit.save`, `request.create`, `request.resolve`.

Los payloads exactos y límites están en `src/lib/activos/server/validation.mjs`.
`location.save` usa el tipo de operación `articulo_guardar` ya disponible en el
ENUM recibido; la huella conserva el nombre de comando para distinguirlo. No se
alteró el esquema para agregar un valor nuevo.

## Configuración de servidor

Se reutilizan `DB_HOST`, `DB_PORT` (3306 por defecto), `DB_USER`, `DB_PASSWORD`,
`DB_NAME` y `NEXT_PUBLIC_RUTA_BACKEND`. En dev, `DB_NAME` debe apuntar a la base
que recibió las tablas (`adamia_dev`). No exponer variables DB con prefijo
NEXT*PUBLIC. El usuario MySQL debe tener SELECT/INSERT/UPDATE sobre `cau*\*`,
DELETE exclusivamente sobre `cau_paquete_detalle`para editar dotaciones, y
SELECT sobre`empresas`y`usuarios_empresas`. No necesita permisos DDL.

## Identidad, catálogos y permisos

La cookie se verifica en `/users/verify/token` en cada petición. Para RH se
reutiliza la relación vigente de propietario o `usuarios_empresas` activos.
No se aceptan actor, permisos ni snapshots suministrados por el navegador.
El perfil Admin sigue con las rutas de dashboard existentes; no se agrega acceso
implícito al inventario de otras empresas.

Catálogos consultados con el token verificado y la empresa autorizada:

- `/checador/empleados/panel-empleado/lista?empresa=ID&includeInactivos=1`
- `/checador/puestos?id_empresa=ID` (todas las páginas)
- `/checador/sucursales?id_empresa=ID` (todas las páginas)
- `/empresas/ID` (nombre, RFC y logo)

El autoservicio obtiene el vínculo de empleado de la sesión verificada para esa
empresa, o de `/checador/empleados/por-correo` usando el correo de esa sesión.
No carga ni expone el directorio de otros empleados. RH no puede confirmar un
acuse en nombre de una persona.

Pantalla del empleado: `/empleado/panel/mis-recursos`.
Expediente 360 consulta las mismas entregas; no crea empleados duplicados ni usa
los identificadores ficticios `real-*` / `demo-*`.

## Integridad

- Las escrituras serializan por empresa con `SELECT ... FOR UPDATE` sobre su fila
  y se confirman en una transacción breve. Empresas distintas operan en paralelo.
- Todos los SELECT/UPDATE/DELETE de recursos están acotados por `id_empresa`.
- La revisión global evita sobreescribir una edición concurrente. Un conflicto
  devuelve 409 y la pantalla actualiza antes de permitir otro intento.
- Reintentar una clave ya confirmada devuelve el resultado previo. Se comprueba
  actor y huella del payload; usar la misma clave con otro contenido devuelve 409.
- Entrega, devolución, cambio de talla, revisión, baja y reversión conservan
  movimientos. Una operación que falla hace rollback de todos sus efectos.
- Los activos físicos se registran uno por uno. Uniformes admiten cantidades,
  existencias por ubicación y traslados parciales.
- Devoluciones y pérdidas se acumulan desde sus partidas; no hay contadores
  duplicados editables. No se permite exceder lo pendiente.
- Los resguardos conservan snapshots de empresa, empleado y artículo. El PDF usa
  esos snapshots y refleja acuses/reversiones. El logo conserva la URL de entrega:
  la conservación binaria de logos históricos depende del almacenamiento existente.
- No se realizan descuentos automáticos por pérdidas ni se presenta el acuse
  simple como una firma electrónica certificada.
- No hay fallback a localStorage ni datos demo cuando falla una API.

## Verificación y límites

`scripts/test-activos-api.mjs` usa una base temporal aleatoria `cau_test_*` en
MySQL local/CI, crea las tablas EXACTAS recibidas y prueba entrega, edición de
snapshots, reintentos, concurrencia, devoluciones, pérdidas, mantenimiento,
cambios de talla, traslados, reversión, acuses, paquetes, tallas, solicitudes y
separación entre empresas/empleados. No usa variables DB\_\* ni apunta a ADAMIA.
Se integra al job Validate de dev, antes de compilar y desplegar.

La API devuelve el estado completo que requiere la interfaz actual. Cada tabla
tiene un límite explícito de 10 000 filas por empresa; no devuelve inventario
parcial al superarlo. Antes de ese volumen se debe migrar a consultas paginadas
por pantalla. La cola de escritura por empresa prioriza integridad para uso de RH;
para mayor concurrencia puede refinarse a bloqueos por artículo.

Validar en dev con cuentas reales: contratos de los catálogos existentes,
configuración DB, visibilidad por empresa, PDF/logo, acuse del empleado y flujo
completo de una entrega. La comprobación de CI no sustituye esa validación.
