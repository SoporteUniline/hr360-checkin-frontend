---
name: catalogos-conectados
description: Alta contextual obligatoria entre catálogos configurables al diseñar, construir, auditar o probar formularios de catálogos con referencias a categorías, subcategorías, marcas, unidades u otros catálogos. No extender automáticamente a ventas ni documentos operativos.
---

# Catálogos conectados

## Alcance y regla
En todo formulario de alta/edición de un catálogo, cada campo relacionado con otro catálogo configurable debe permitir crear un registro del catálogo relacionado desde ese mismo contexto, si el usuario tiene permiso. Ejemplo: producto → categoría, subcategoría, marca, unidad. Aplicar a todos los catálogos del proyecto, no solo productos.
No aplicar automáticamente a ventas, compras, cobros, traspasos u otros documentos operativos. No convertir listas fijas, estados internos o catálogos de sistema de solo lectura en configurables. Registrar la excepción y su motivo; no omitir silenciosamente el acceso porque el catálogo esté vacío.

## Contrato del formulario
1. Mostrar acción explícita «Crear categoría», «Crear marca», etc., junto al selector o dentro de él; disponible también con cero resultados. Escribir un nombre no lo crea automáticamente.
2. Abrir modal accesible con el formulario del catálogo destino: mismas validaciones, campos obligatorios y reglas del alta normal. Mantener íntegro el borrador del formulario padre, incluso archivos y errores vigentes; no guardarlo anticipadamente.
3. Tras guardar con éxito, incorporar la opción y seleccionarla por su ID real; refrescar solo opciones afectadas, sin recargar la página ni perder datos. Mostrar confirmación breve y devolver el foco al campo de origen.
4. Cancelar el modal no crea nada ni altera la selección anterior. Un error conserva lo capturado para corregir/reintentar. Prevenir doble envío y duplicados concurrentes con validación autoritativa.
5. Respetar permisos para crear en el catálogo DESTINO, aunque pueda editar el padre. Sin permiso, mantener selección permitida y explicar la restricción sin ofrecer una acción ejecutable. Verificar permisos y empresa también en servidor.
6. Mantener jerarquías: al crear subcategoría, preseleccionar y validar la categoría activa. Al cambiar categoría, limpiar/solicitar corrección de la subcategoría incompatible; nunca guardar una relación inválida. No usar IDs de otra empresa.
7. Si el alta relacionada requiere otro catálogo, permitir el mismo flujo con retorno ordenado y borradores conservados; evitar pilas de modales y ciclos sin salida. Usar pasos dentro del diálogo cuando corresponda.
8. En móvil, usar diálogo adaptado/pantalla completa si hace falta; nombre accesible, foco contenido, teclado usable y retorno de foco. Cerrar el diálogo no debe cerrar el formulario padre accidentalmente.
9. El registro relacionado guardado existe independientemente: cancelar después el producto no elimina la categoría creada. Hacer explícito el guardado del catálogo; no limpiar registros compartidos automáticamente.

Verificar por separado permiso de alta/edición del catálogo padre y del destino. Definir campos obligatorios y actualización de permisos durante la sesión. Al cancelar edición de un padre existente, conservar su versión persistida y descartar solo cambios no guardados; no borrar el padre.

## Diseño e implementación
Inventariar cada relación: catálogo padre, campo, destino, fijo/configurable, permiso, acción contextual, campos requeridos, filtros/jerarquía, selección tras guardar y prueba. Reutilizar un componente/patrón común y el mismo servicio de alta del destino, no implementar versiones sin validaciones por pantalla. No crear catálogos nuevos que el negocio no tenga.

## Pruebas obligatorias según alcance
- Producto en borrador sin categorías: crear categoría desde selector, verla seleccionada y conservar todos los datos del producto.
- Catálogo con opciones: crear otra marca/unidad y seleccionarla; validar nombre duplicado y doble clic.
- Cancelar modal, fallo de servidor y pérdida de permiso: conservar borrador y selección; no generar registro fantasma.
- Crear subcategoría bajo categoría correcta; cambiar categoría y comprobar invalidación de relación previa.
- Usuario sin permiso y empresa distinta: impedir alta/acceso indebido en servidor, no solo ocultar botón.
- Cancelar producto después de crear categoría: categoría persiste; producto no se guarda.
- Probar teclado y móvil; comprobar que ventas/documentos operativos y listas fijas no reciben el alta contextual por una extensión indiscriminada del componente.
Registrar evidencia real y lo no ejecutado. No aprobar solo porque aparece un botón «+».
