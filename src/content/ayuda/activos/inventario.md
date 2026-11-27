---
titulo: Cómo registrar artículos en el inventario
resumen: Da de alta equipos y prendas con su código, categoría, existencias y mínimos; registra entradas, traslados, bajas y envíos a revisión.
modulo: activos
audiencia: [rh, dueno]
pantallas: [/panel/activos]
palabras: [inventario, registrar activo, registrar uniforme, existencias, código, número de serie, talla, entrada, traslado, baja, ajuste, archivar, exportar]
orden: 10
actualizado: 2026-11-27
fuentes: [src/components/activos/Inventory.jsx, src/components/activos/FiltroTipo.jsx]
---

## Para qué sirve

El **Inventario** es la lista de todo lo que tiene tu empresa: **Activos** (equipos y herramientas, cada uno con su responsable e historial) y **Uniformes** (prendas por talla, color, ubicación y cantidad).

![Inventario de activos](/ayuda/capturas/activos/inventario.webp "Cada equipo identificado, con su responsable e historial")

## Quién la usa

Recursos Humanos, el dueño y los usuarios del panel con acceso al módulo.

## Antes de empezar

Necesitas al menos una **ubicación** (almacén) y tus **categorías**. Si no tienes ubicación, el formulario te pide registrar una. Ve [Ajustes](/ayuda/activos/ajustes).

## Paso a paso: registrar un artículo

1. Entra a **Activos y uniformes → Inventario** y elige **Activos** o **Uniformes** arriba.
2. Toca `Registrar activo` o `Registrar uniforme`.
3. Llena **Datos del artículo**:
   - **Nombre** y **Código único** (obligatorios).
   - **Categoría** (con el enlace **Administrar categorías** si te falta una).
   - **Ubicación de referencia** (para mover existencias después usa **Trasladar**).
   - En activos: **Número de serie** y **Marca, modelo y características**.
   - En uniformes: **Talla / variante** y **Color**.
   - **Existencia inicial** y **Existencia mínima** (si baja de ahí, aparece en «Por reponer»).
   - **Reposición sugerida (meses)**: cada cuánto conviene renovarlo (0 = sin periodicidad).
   - **Costo unitario de referencia (MXN)**.
   - **Requiere devolución**: márcalo si la persona debe regresarlo al terminar.
4. Toca `Guardar artículo`.

![Formulario para registrar un artículo](/ayuda/capturas/activos/registrar-articulo.webp "Datos del artículo")

## Paso a paso: movimientos de un artículo

1. En el inventario toca `Ver` en el artículo.
2. En la **Ficha del artículo** tienes:
   - `Entrada`: suma existencias (compras o devoluciones del proveedor).
   - `Enviar a revisión`: lo saca de disponibilidad mientras se revisa o repara.
   - `Baja / ajuste`: resta existencias (pérdida, daño, conteo).
   - `Trasladar`: mueve existencias de una ubicación a otra.
   - `Entregar`: te lleva a hacer una entrega de ese artículo.
3. Llena la ventana del movimiento (ubicación de origen y destino, cantidad, motivo) y toca `Confirmar movimiento`.

Abajo verás **Asignaciones actuales** (quién lo tiene), **Existencias por ubicación** e **Historial del artículo**.

![Ficha de un artículo con sus movimientos](/ayuda/capturas/activos/ficha-del-articulo.webp "Ficha del artículo")

## Paso a paso: buscar y exportar

- Busca por **nombre, código, serie o talla**.
- Filtra por estado (**Registros activos**, **Incluir archivados**, **Existencias bajas**) y por categoría.
- `Exportar` descarga la lista.

## Preguntas frecuentes

### ¿Cómo dejo de usar un artículo sin borrar su historial?

Ábrelo y usa **Archivar artículo**. Puedes reactivarlo después.

### ¿Por qué no puedo entregar un artículo?

Porque no tiene existencias disponibles en ninguna ubicación o está en revisión. Revisa **Existencias por ubicación**.

## Qué pasa si…

- **…otra persona cambió el artículo mientras lo editabas:** verás «Este artículo cambió desde que abriste el formulario» y el botón `Cargar versión actual` para revisar los cambios antes de guardar.

## Relacionado

- [Cómo entregar y recibir activos y uniformes](/ayuda/activos/entregar-y-recibir)
- [Ajustes: categorías, ubicaciones y paquetes](/ayuda/activos/ajustes)
