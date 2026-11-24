# Activos y uniformes: un solo módulo (20/11/2026)

Propuesta «menos vistas» aprobada por el dueño. Antes: dos módulos con 24 entradas en el menú
(12 de activos y 12 de uniformes, casi las mismas con otro nombre). Ahora: **una entrada** y pestañas.

| Pestaña / pantalla | Ruta | Antes |
|---|---|---|
| Inicio | `/panel/activos` | Resumen de activos / de uniformes |
| Inventario (Activos \| Uniformes) | `/panel/activos/inventario?tipo=activos\|uniformes` | Inventario de activos, Prendas y existencias |
| Artículo, nuevo, editar | `/panel/activos/inventario/:id[/editar]`, `/inventario/nuevo?tipo=` | `/activos/:id`, `/prendas/:id` |
| Personas y detalle | `/panel/activos/personas[/:id]` | Activos / Uniformes por empleado |
| Entregar / Recibir devolución | `/panel/activos/entregar`, `/recibir` | Nueva entrega, Devoluciones |
| Ajustes: categorías (por tipo), ubicaciones (compartidas), paquetes | `/panel/activos/ajustes/{categorias,ubicaciones,paquetes}` | 6 entradas |
| Desde Inicio: revisión, solicitudes, historial, entregas, resguardos | `/revision`, `/solicitudes`, `/historial`, `/entregas`, `/resguardos[/:id]` | Mantenimiento, Incidencias, Movimientos… |

- Los componentes (`src/components/activos/*`) no cambiaron de reglas: siguen pidiendo sus rutas de
  siempre y `resourceHref` (`src/lib/activos/module.mjs`) las traduce a las nuevas.
- El tipo viaja en `?tipo=` solo donde importa (inventario y categorías). Cambiar de pestaña o de tipo no
  vuelve a descargar el inventario (el proveedor ya no se reinicia por tipo).
- Las rutas viejas `/panel/control-activos/**` y `/panel/control-uniformes/**` redirigen a su equivalente
  (`next.config.mjs`), conservando `?empresa=`.
- Portal del empleado («Mis recursos») y Expediente 360: sin cambios.
- Pruebas: `scripts/test-activos-modules.mjs` (enlaces) y `scripts/verify-activos.mjs` (navegador).

Decisión del dueño (20/11/2026): **quién puede revertir y dar de baja se queda como está**: cualquier
usuario del panel con acceso al módulo (el dueño y sus cuentas de «Usuarios con acceso») puede cancelar
entregas, dar de baja, ajustar existencias y archivar. No se agrega rol ni permiso nuevo.

Pendiente: lecturas por pantalla y paginadas para quitar el tope de 10,000 registros.
