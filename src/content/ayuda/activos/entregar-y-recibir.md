---
titulo: Cómo entregar y recibir activos y uniformes
resumen: Entrega equipos y prendas a una persona con su resguardo, recibe devoluciones (buenas, dañadas o perdidas), cambia tallas y revierte una entrega hecha por error.
modulo: activos
audiencia: [rh, dueno]
pantallas: [/panel/activos]
palabras: [entregar, entrega, resguardo, acuse, devolución, recibir, préstamo, asignación, paquete por puesto, cambio de talla, tallas, revertir entrega]
orden: 20
actualizado: 2026-11-27
fuentes: [src/components/activos/Deliveries.jsx, src/components/activos/Employees.jsx, src/components/activos/Receipt.jsx]
---

## Para qué sirve

Cada vez que le das algo a una persona (una laptop, un radio, dos playeras, un gafete) registras una **entrega**. ADAMIA descuenta las existencias y genera un **resguardo** que la persona confirma desde su app. Cuando lo regresa, registras la **devolución**.

## Quién la usa

Recursos Humanos, el dueño y los usuarios del panel con acceso al módulo.

## Antes de empezar

- El artículo debe estar en el **Inventario** con existencias disponibles.
- Para entregar uniformes más rápido, registra las **tallas** de la persona y arma **paquetes por puesto** (ve [Ajustes](/ayuda/activos/ajustes)).

## Cómo encontrar a la persona

1. Entra a **Activos y uniformes → Personas**.
2. Busca por nombre o puesto y toca `Abrir`.
3. Verás lo que tiene a su cargo (**Activos asignados** y **Uniformes entregados**), sus tallas y su **Historial de entregas y devoluciones**.

![Lista de personas en Activos y uniformes](/ayuda/capturas/activos/personas.webp "Qué tiene cada empleado")

![Detalle de una persona en Activos y uniformes](/ayuda/capturas/activos/persona-detalle.webp "Lo que tiene a su cargo y sus botones de entrega y devolución")

> **Consejo:** En **Tallas del empleado** registra su **Talla de uniforme**, **Talla de pantalón** y **Sistema de calzado** y toca `Guardar tallas`.

## Cómo hacer una entrega

1. En la persona toca `Entregar` (o en Inicio toca **Entregar**).
2. **1. Empleado y modalidad:** confirma al **Empleado** y elige la **Modalidad**:
   - **Asignación:** se queda con la persona mientras trabaje (se devuelve al terminar la asignación).
   - **Préstamo:** debes poner la **Fecha prevista de devolución**.
3. **2. Artículos a entregar:**
   - Elige un **Paquete por puesto** y toca `Cargar paquete`; se agregan solo los artículos disponibles que le faltan.
   - O agrega uno por uno en **Agregar artículo disponible** con `Agregar`.
   - Ajusta la **cantidad** y la **ubicación** de cada línea (o deja **Seleccionar automáticamente**).
4. **3. Condición de entrega:** escribe **Observaciones y accesorios** (por ejemplo «Sin golpes. Incluye cargador.»).
5. Revisa el **Resumen** y toca `Confirmar entrega`. Se descuenta la existencia y se genera el resguardo.

![Formulario de nueva entrega](/ayuda/capturas/activos/nueva-entrega.webp "Equipos y prendas para el empleado, en una sola entrega")

## El resguardo

El resguardo es el documento de entrega: folio, fecha, artículos, condición y quién entregó. Puedes `Descargar PDF`.

![Resguardo de activos y uniformes](/ayuda/capturas/activos/resguardo.webp "Registro de entrega y acuse de recepción")

La persona lo ve en su app y toca `Confirmar recepción` o `Reportar diferencia` si algo no coincide. Mientras no responda, la entrega aparece como **Pendiente de acuse**; si reporta un problema, como **Con diferencia**.

## Cómo recibir una devolución

1. En la persona toca `Recibir devolución` (o en Inicio **Recibir devolución**).
2. Elige al empleado si hace falta.
3. Marca lo que regresa y su cantidad. Puedes recibir **todo o una parte**: el resto sigue a su cargo.
4. Elige la **condición** de cada artículo:
   - **Buen estado → disponible**
   - **Requiere revisión** (no estará disponible para otra entrega hasta revisarlo)
   - **Pérdida → baja**
5. Escribe la nota (obligatoria para daños o pérdida) y toca `Confirmar recepción`.

![Pantalla de devoluciones y recepción](/ayuda/capturas/activos/recibir-devolucion.webp "Recibe todo o una parte")

> **Importante:** ADAMIA **no hace descuentos automáticos** a la persona por daños o pérdidas.

## Cómo hacer un cambio de talla

1. En la persona, en **Uniformes entregados**, toca `Cambiar talla` en la prenda.
2. Elige la **Nueva prenda / variante disponible** y la **Condición de la prenda recibida**.
3. Toca `Confirmar cambio`. La recepción de la prenda anterior y la entrega de la nueva se registran juntas.

## Cómo revertir una entrega hecha por error

1. Abre el resguardo.
2. Toca **Revertir entrega por error** y confirma.

Se devuelven las existencias al inventario y se conserva el historial. Solo está disponible mientras la persona **no ha confirmado** la entrega y no hay devoluciones registradas.

## Preguntas frecuentes

### ¿Dónde veo todas las entregas?

En **Inicio**, toca **Acuses por confirmar** o ve la lista de entregas: busca por folio, empleado o puesto y toca `Ver resguardo`.

### ¿Cómo sé quién tiene que devolver algo y ya se pasó?

En **Inicio** verás **Devoluciones vencidas**: préstamos cuya fecha prevista ya pasó.

## Qué pasa si…

- **…cargo un paquete y no se agrega nada:** verás «El empleado ya tiene la dotación o no hay existencias disponibles.»
- **…no hay existencias de un artículo:** no aparece en **Agregar artículo disponible**.
- **…la persona no tiene artículos por devolver:** verás «No tiene artículos retornables pendientes.»

## Relacionado

- [Cómo registrar artículos en el inventario](/ayuda/activos/inventario)
- [Mis activos y uniformes (para empleados)](/ayuda/activos/mis-activos-y-uniformes)
- [Checklist del primer día](/ayuda/induccion/checklist-primer-dia)
