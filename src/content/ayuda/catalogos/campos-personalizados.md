---
titulo: Campos personalizados — agrega a la ficha los datos que tu empresa necesita
resumen: Crea campos de selección, texto o número, decide en qué pestaña de la ficha aparecen y úsalos como filtro o columna en Empleados.
modulo: catalogos
audiencia: [rh, dueno]
pantallas: [/panel/campos-personalizados]
palabras: [campos personalizados, campo extra, dato adicional, cuadrilla, talla, filtro, columna, selección, texto, número]
orden: 50
actualizado: 2026-11-27
fuentes: [src/app/panel/campos-personalizados/page.jsx, src/components/EliminarCampoDialog.jsx, src/components/OpcionesCampoEditor.jsx, src/components/OrdenCamposEditor.jsx, src/lib/camposPersonalizados.mjs, src/components/CamposEmpleado.jsx]
---

## Para qué sirve

Cada empresa necesita datos distintos: la **cuadrilla** de una constructora, la **talla de playera** de una tienda, los **años de experiencia** de un taller. Con los **campos personalizados** los agregas a la ficha del empleado sin pedir cambios al sistema.

Lo encuentras en **Ajustes → Campos personalizados**.

![Lista de campos personalizados](/ayuda/capturas/catalogos/campos-personalizados.webp "Campos personalizados de la empresa")

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

- Los campos son de **la empresa de tu sesión**.
- Piensa bien el **tipo**: después de crear el campo **no se puede cambiar** (así se protegen los datos ya capturados).

## Tipos de campo

| Tipo | Para qué | Ejemplo |
| --- | --- | --- |
| Selección | Una opción de una lista definida. | Cuadrilla: Turno A, Turno B, Turno C |
| Texto | Información escrita libremente (hasta 100 caracteres). | Talla de playera |
| Número | Valores enteros o decimales, incluso cero o negativos. | Años de experiencia |

## Paso a paso: crear un campo

1. Toca `Nuevo campo`.
2. Escribe el **Nombre del campo**.
3. Elige el **Tipo de dato**.
4. Si es **Selección**, escribe las **Opciones disponibles**. Usa `Agregar opción` para más filas y arrastra el ícono de la izquierda para ordenarlas (también con espacio y las flechas del teclado).
5. Elige la **Pestaña del formulario** donde aparecerá: Datos personales, Contactos de emergencia, Datos laborales, Jornada laboral, Datos de nómina, Cuentas bancarias, Escanear rostro o Documentos.
6. Elige la **Posición dentro de la pestaña** (junto a qué campo existente se integra) y, si hay varios campos en el mismo lugar, su orden.
7. Activa **Permitir filtrar por este campo** si quieres usarlo como filtro en la tabla de empleados.
8. Deja encendido **Campo activo**.
9. Toca `Crear campo`. Verás «Campo creado correctamente».

![Ventana Nuevo campo personalizado](/ayuda/capturas/catalogos/campos-personalizados-nuevo.webp "Nombre, tipo, opciones y ubicación del campo")

## Paso a paso: verlo como columna en Empleados

Los campos personalizados empiezan **ocultos** en la tabla. Para verlos:

1. Entra a **Empleados**.
2. Toca **Columnas** y marca el campo.

## Paso a paso: editar, desactivar o eliminar

- **Editar:** toca `Editar`. Puedes cambiar nombre, opciones, pestaña, posición, filtro y estado (no el tipo). Si quitas una opción, **las personas que ya la tenían la conservan**.
- **Desactivar:** apaga **Campo activo**. El campo se oculta, pero **conserva sus datos**.
- **Eliminar:** toca `Eliminar`. ADAMIA revisa todos los empleados (también los inactivos):
  - Si **nadie** tiene un valor, te deja eliminarlo con `Eliminar campo`. No se puede deshacer.
  - Si **alguien** tiene información, te ofrece `Desactivar campo` en su lugar, para no perder datos.

## Preguntas frecuentes

### ¿Es obligatorio llenar un campo personalizado?

No. Todos los valores son opcionales en la ficha.

### ¿Se ven en el celular?

Sí, en la ficha del empleado y como filtros en el panel de filtros. Las tarjetas de la lista en el celular no muestran sus valores.

### ¿Los campos de una empresa aparecen en otra?

No. Cada empresa tiene sus propios campos y valores.

## Qué pasa si…

- **…dejo una opción vacía:** verás «Completa las opciones o elimina las filas vacías.»
- **…repito una opción:** verás «Las opciones no pueden repetirse.»
- **…la ficha de un empleado está abierta mientras los campos cargan:** el sistema no deja guardar hasta que terminen de cargar, para no perder valores.

## Relacionado

- [La ficha del empleado y sus 5 pestañas](/ayuda/empleados/ficha-del-empleado)
- [Empleados: tu plantilla en una sola pantalla](/ayuda/empleados)
- [Catálogos base](/ayuda/catalogos)
