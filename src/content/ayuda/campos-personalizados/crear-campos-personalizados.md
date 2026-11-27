---
titulo: Cómo crear campos personalizados
resumen: Agrega a la ficha del empleado los datos que tu empresa necesita (talla de uniforme, número de locker, alergias…), elige dónde aparecen y úsalos como filtro.
modulo: campos-personalizados
audiencia: [rh, dueno]
pantallas: [/panel/campos-personalizados]
palabras: [campos personalizados, campo extra, dato adicional, cuadrilla, talla, columna, campo nuevo, ficha del empleado, selección, texto, número, opciones, pestaña, filtro, desactivar campo, eliminar campo]
orden: 10
actualizado: 2026-11-27
fuentes: [src/app/panel/campos-personalizados/page.jsx, src/lib/camposPersonalizados.mjs, src/components/EliminarCampoDialog.jsx, src/components/OpcionesCampoEditor.jsx, src/components/OrdenCamposEditor.jsx, src/components/CamposEmpleado.jsx]
---

## Para qué sirve

Cada empresa necesita datos distintos de su gente: la **cuadrilla** de una constructora, la **talla de playera** de una tienda, los **años de experiencia** de un taller. Con los **campos personalizados** agregas a la ficha del empleado lo que no viene de fábrica, sin pedir cambios al sistema. Tú decides el tipo de dato, en qué pestaña de la ficha aparece y si se puede usar para filtrar la lista de empleados.

## Quién la usa

Recursos Humanos y el dueño de la cuenta. Un usuario con acceso necesita permiso en **Ajustes de la empresa** (con **Ver y editar** para crear o cambiar campos).

## Antes de empezar

Entra por **Ajustes → Campos personalizados**. Los campos son de la empresa de tu sesión (su nombre aparece arriba de la lista).

![Lista de campos personalizados](/ayuda/capturas/campos-personalizados/campos-lista.webp "Cada campo con su tipo, opciones, ubicación y estado")

La tabla muestra cada **Campo** con su **Tipo**, sus **Opciones** (en Selección), su **Ubicación** (pestaña de la ficha, si sirve como **Filtro** y su posición) y su **Estado** (Activo o Inactivo). Usa «Buscar campos…» para encontrar uno.

| Tipo | Para qué | Ejemplo |
| --- | --- | --- |
| Selección | Una opción de una lista definida. | Cuadrilla: Turno A, Turno B, Turno C |
| Texto | Información escrita libremente (hasta 100 caracteres). | Talla de playera |
| Número | Valores enteros o decimales, incluso cero o negativos. | Años de experiencia |

Piensa bien el **tipo**: después de crear el campo **no se puede cambiar** (así se protegen los datos ya capturados).

## Cómo crear un campo

1. Presiona **Nuevo campo**.
2. Escribe el **Nombre del campo** (hasta 80 caracteres).
3. Elige el **Tipo de dato**:
   - **Selección**: una opción de una lista definida (por ejemplo Chica, Mediana, Grande);
   - **Texto**: información escrita libremente;
   - **Número**: valores enteros o decimales.
4. Si es Selección, escribe las **Opciones disponibles** (sin repetir y sin dejar filas vacías). Usa **Agregar opción** para más filas y arrastra el ícono de la izquierda para ordenarlas (también con espacio y las flechas del teclado).
5. En **Pestaña del formulario** elige dónde aparece en la ficha: Datos personales, Contactos de emergencia, Datos laborales, Jornada laboral, Datos de nómina, Cuentas bancarias, Escanear rostro o Documentos.
6. En **Posición dentro de la pestaña** elige **Al inicio**, **Al final** o «Después de…» un bloque de esa pestaña. Si hay otros campos en esa posición, puedes ordenar el tuyo entre ellos.
7. Deja encendido **Permitir filtrar por este campo** si quieres usarlo en los filtros de la tabla de empleados.
8. Deja encendido **Campo activo** y presiona **Crear campo**. Verás «Campo creado correctamente».

![Ventana para crear un campo personalizado](/ayuda/capturas/campos-personalizados/campo-nuevo.webp "Nombre, tipo, opciones, pestaña y posición")

## Cómo verlo como columna en Empleados

Los campos personalizados empiezan **ocultos** en la tabla de empleados. Para verlos:

1. Entra a **Gestión de personal → Empleados** (o presiona **Ver empleados** arriba de la lista de campos).
2. Toca **Columnas** y marca el campo.

## Cómo editar un campo

1. Presiona **Editar** en el renglón del campo.
2. Cambia lo necesario y presiona **Guardar cambios**. Verás «Campo actualizado correctamente».

El **tipo de dato no se puede cambiar** después de crear el campo, para proteger los valores ya guardados. Si quitas una opción de una lista, las personas que ya la tenían la conservan.

## Cómo desactivar o eliminar un campo

1. Presiona **Eliminar** en el renglón del campo.
2. ADAMIA comprueba si algún empleado (incluso inactivo) tiene información en ese campo:
   - Si **nadie** tiene información, puedes **Eliminar campo**.
   - Si alguien sí tiene, verás «Este campo tiene información» con cuántos empleados, y la opción **Desactivar campo**: se oculta pero conserva sus datos.

También puedes apagar **Campo activo** al editarlo: se oculta de la ficha y conserva sus datos.

## Preguntas frecuentes

### ¿Dónde aparecen los campos?

En el formulario de la ficha del empleado del panel, en la pestaña y la posición que elegiste. Solo aparecen los campos activos.

### ¿Es obligatorio llenar un campo personalizado?

No. Todos los valores son opcionales en la ficha.

### ¿Se ven en el celular?

Sí, en la ficha del empleado y como filtros en el panel de filtros. Las tarjetas de la lista en el celular no muestran sus valores.

### ¿Los campos de una empresa aparecen en otra?

No. Cada empresa tiene sus propios campos y valores.

### ¿Puedo filtrar empleados por un campo de texto?

Sí, si encendiste **Permitir filtrar por este campo**. El filtro muestra los valores que ya tienen capturados tus empleados.

## Qué pasa si…

- **…dejas opciones vacías.** Verás «Completa las opciones o elimina las filas vacías.».
- **…repites una opción.** Verás «Las opciones no pueden repetirse.».
- **…no se pudo identificar tu empresa.** Verás «No se pudo identificar la empresa de tu sesión.»; vuelve a entrar.
- **…no se pudo guardar.** Verás «No se pudo guardar el campo. Intenta nuevamente.».

## Relacionado

- [La ficha del empleado](/ayuda/empleados/ficha-del-empleado)
- [Empleados: tu plantilla en una sola pantalla](/ayuda/empleados)
- [Catálogos base](/ayuda/catalogos)
- [Roles y permisos por módulo](/ayuda/usuarios/roles-y-permisos)
