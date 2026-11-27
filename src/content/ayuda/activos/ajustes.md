---
titulo: Ajustes de Activos y uniformes — categorías, ubicaciones y paquetes
resumen: Organiza tu inventario con categorías, registra tus almacenes y arma paquetes por puesto para entregar dotaciones completas en un clic.
modulo: activos
audiencia: [rh, dueno]
pantallas: [/panel/activos]
palabras: [ajustes, categorías, ubicaciones, almacén, bodega, paquetes, dotación, paquete por puesto, kit]
orden: 40
actualizado: 2026-11-27
fuentes: [src/components/activos/Ajustes.jsx, src/components/activos/Categories.jsx, src/components/activos/Locations.jsx, src/components/activos/Operations.jsx]
---

## Para qué sirve

**Ajustes** se usa poco, pero conviene configurarlo al inicio:

- **Categorías:** agrupan tus artículos (Cómputo, Radios, Playeras…). Hay categorías separadas para activos y para uniformes.
- **Ubicaciones:** tus almacenes y puntos de entrega, ligados a tus sucursales. Se comparten entre activos y uniformes.
- **Paquetes y dotaciones:** la dotación típica de cada puesto, para entregarla completa.

Entra con el botón **Ajustes** (arriba a la derecha de Activos y uniformes).

![Ajustes: categorías de activos](/ayuda/capturas/activos/ajustes-categorias.webp "Categorías de activos")

## Quién la usa

Recursos Humanos, el dueño y los usuarios con acceso al módulo.

## Antes de empezar

- El módulo **Activos y uniformes** debe estar activo.
- Las ubicaciones se ligan a tus sucursales: da de alta tus [unidades de negocio](/ayuda/catalogos/unidades-de-negocio).
- Los paquetes se arman por puesto y con artículos del inventario: ten tus [puestos](/ayuda/catalogos/puestos) y tus [artículos](/ayuda/activos/inventario).

## Cómo crear una categoría

1. En **Categorías**, elige arriba **Activos** o **Uniformes**.
2. Toca `Agregar categoría`.
3. Escribe el **Nombre** y, si quieres, una **Descripción**. Deja marcado **Disponible para nuevos artículos**.
4. Toca `Guardar categoría`.

Para dejar de usar una categoría sin afectar los artículos que ya la tienen, edítala y desmarca **Disponible para nuevos artículos**.

## Cómo agregar una ubicación

1. En **Ubicaciones**, toca `Agregar ubicación`.
2. Escribe el **Nombre** (por ejemplo «Almacén Matriz»), elige la **Sucursal** (o **Sin sucursal específica**) y una **Descripción** opcional.
3. Toca `Guardar ubicación`.

> **Consejo:** Registra tu primer almacén antes de cargar inventario: todo artículo necesita una ubicación.

## Cómo armar un paquete por puesto

1. En **Paquetes y dotaciones**, toca `Crear paquete`.
2. Escribe el **Nombre** y elige el **Puesto** (o **Todos los puestos**).
3. En **Agregar artículo**, elige cada artículo, su **cantidad** y toca `Agregar`. Usa `Quitar` para sacar uno.
4. Toca `Guardar paquete`.

![Paquetes y dotaciones](/ayuda/capturas/activos/ajustes-paquetes.webp "Dotaciones reutilizables por puesto")

Al hacer una entrega, eliges el paquete y tocas `Cargar paquete`: se agregan los artículos disponibles que a la persona le faltan. Siempre revisa tallas y cantidades antes de confirmar.

## Preguntas frecuentes

### ¿Qué son los «Paquetes mixtos anteriores»?

Son paquetes de antes que mezclaban equipos y uniformes. Se conservan, pero para entregas nuevas crea una dotación separada por tipo.

### ¿Por qué no veo el catálogo de categorías?

Si aparece «El catálogo de categorías está pendiente de activación», tu sistema necesita una actualización; los artículos existentes conservan su categoría.

## Qué pasa si…

- **…desmarcas «Disponible para nuevos artículos»:** la categoría queda **Archivada**. Ya no se ofrece para artículos nuevos y los que ya la tienen la conservan.
- **…dejas el nombre vacío:** no se guarda; el **Nombre** es obligatorio en categorías y ubicaciones.
- **…todavía no tienes paquetes:** la lista dice «No hay registros para mostrar.». Crea el primero con `Crear paquete`.

## Relacionado

- [Activos y uniformes: qué hay y quién lo tiene](/ayuda/activos)
- [Cómo registrar artículos en el inventario](/ayuda/activos/inventario)
- [Cómo entregar y recibir](/ayuda/activos/entregar-y-recibir)
