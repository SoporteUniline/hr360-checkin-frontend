---
titulo: Cómo crear campos personalizados
resumen: Agrega a la ficha del empleado los datos que tu empresa necesita (talla de uniforme, número de locker, alergias…), elige dónde aparecen y úsalos como filtro.
modulo: campos-personalizados
audiencia: [rh, dueno]
pantallas: [/panel/campos-personalizados]
palabras: [campos personalizados, campo nuevo, ficha del empleado, selección, texto, número, opciones, pestaña, filtro, desactivar campo, eliminar campo]
orden: 10
actualizado: 2026-11-27
fuentes: [src/app/panel/campos-personalizados/page.jsx, src/lib/camposPersonalizados.mjs, src/components/EliminarCampoDialog.jsx]
---

## Para qué sirve

Cada empresa necesita datos distintos de su gente. Con los **campos personalizados** agregas a la ficha del empleado lo que no viene de fábrica: la talla de uniforme, el número de locker, las alergias, la licencia de manejo… Tú decides el tipo de dato, en qué pestaña de la ficha aparece y si se puede usar para filtrar la lista de empleados.

## Quién la usa

Recursos Humanos y el dueño de la cuenta. Un usuario con acceso necesita permiso en **Ajustes de la empresa** (con **Ver y editar** para crear o cambiar campos).

## Antes de empezar

Entra por **Ajustes → Campos personalizados**. Los campos son de la empresa de tu sesión (su nombre aparece arriba de la lista).

![Lista de campos personalizados](/ayuda/capturas/campos-personalizados/campos-lista.webp "Cada campo con su tipo, opciones, ubicación y estado")

La tabla muestra cada **Campo** con su **Tipo**, sus **Opciones** (en Selección), su **Ubicación** (pestaña de la ficha, si sirve como **Filtro** y su posición) y su **Estado** (Activo o Inactivo). Usa «Buscar campos…» para encontrar uno.

## Cómo crear un campo

1. Presiona **Nuevo campo**.
2. Escribe el **Nombre del campo** (hasta 80 caracteres).
3. Elige el **Tipo de dato**:
   - **Selección**: una opción de una lista definida (por ejemplo Chica, Mediana, Grande);
   - **Texto**: información escrita libremente;
   - **Número**: valores enteros o decimales.
4. Si es Selección, escribe las **Opciones disponibles** (sin repetir y sin dejar filas vacías).
5. En **Pestaña del formulario** elige dónde aparece en la ficha: Datos personales, Contactos de emergencia, Datos laborales, Jornada laboral, Datos de nómina, Cuentas bancarias, Escanear rostro o Documentos.
6. En **Posición dentro de la pestaña** elige **Al inicio**, **Al final** o «Después de…» un bloque de esa pestaña. Si hay otros campos en esa posición, puedes ordenar el tuyo entre ellos.
7. Deja encendido **Permitir filtrar por este campo** si quieres usarlo en los filtros de la tabla de empleados.
8. Deja encendido **Campo activo** y presiona **Crear campo**. Verás «Campo creado correctamente».

![Ventana para crear un campo personalizado](/ayuda/capturas/campos-personalizados/campo-nuevo.webp "Nombre, tipo, opciones, pestaña y posición")

> **Consejo:** Para que el campo también se vea como columna en la lista de empleados, actívalo en **Empleados → Columnas**.

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

### ¿Puedo filtrar empleados por un campo de texto?

Sí, si encendiste **Permitir filtrar por este campo**. El filtro muestra los valores que ya tienen capturados tus empleados.

## Qué pasa si…

- **…dejas opciones vacías.** Verás «Completa las opciones o elimina las filas vacías.».
- **…repites una opción.** Verás «Las opciones no pueden repetirse.».
- **…no se pudo identificar tu empresa.** Verás «No se pudo identificar la empresa de tu sesión.»; vuelve a entrar.
- **…no se pudo guardar.** Verás «No se pudo guardar el campo. Intenta nuevamente.».

## Relacionado

- [Roles y permisos por módulo](/ayuda/usuarios/roles-y-permisos)
