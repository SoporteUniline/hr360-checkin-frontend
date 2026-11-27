---
titulo: Empleados — tu plantilla en una sola pantalla
resumen: Consulta, busca, filtra y descarga a tu personal; desde aquí das de alta, editas, das de baja y entras a la ficha de cada persona.
modulo: empleados
audiencia: [rh, dueno]
pantallas: [/panel/empleados]
palabras: [empleados, plantilla, personal, lista, buscar, filtrar, columnas, descargar, excel, vistas guardadas, activos, inactivos]
orden: 0
actualizado: 2026-11-27
fuentes: [src/app/panel/empleados/page.jsx, src/app/panel/empleados/EmpleadosTable.jsx, src/app/panel/empleados/MobileEmpleadosView.jsx, src/components/tabla/ColumnasSelector.jsx, src/components/tabla/VistasGuardadas.jsx]
---

## Para qué sirve

**Empleados** es la lista de toda tu gente. Desde aquí ves cuántas personas tienes, buscas a alguien en segundos, abres su ficha y haces los movimientos de personal: alta, cambios, baja y reactivación.

Lo encuentras en el menú **Gestión de personal → Empleados**.

![Pantalla Empleados con tarjetas de resumen, filtros y la lista de empleados](/ayuda/capturas/empleados/lista-empleados.webp "La lista de empleados en computadora")

## Quién la usa

- **Recursos Humanos** y **el dueño** de la empresa.
- Los usuarios con acceso al panel que tengan permiso sobre empleados (se configura en **Ajustes → Usuarios con acceso**).

## Antes de empezar

- Si tu cuenta maneja **varias empresas**, elige una empresa específica en el filtro **Unidad de negocio** antes de crear, importar o sincronizar. Con **Todas las empresas** esos botones quedan desactivados.
- Ten listos tus catálogos (puestos, departamentos y unidades de negocio). Si te falta alguno, también lo puedes crear al momento desde la ficha. Revisa [Catálogos base](/ayuda/catalogos).

## Qué ves en la pantalla

### Tarjetas de resumen

Arriba hay cuatro números: **Total empleados**, **Activos**, **Nuevos este mes** y **Departamentos**.

### Botones principales

| Botón | Qué hace |
| --- | --- |
| `Importar empleados` | Da de alta a muchas personas con una plantilla de Excel. Ve [Cómo importar empleados desde Excel](/ayuda/empleados/importar-empleados). |
| `Sincronizar con reloj` | Manda a los relojes checadores a las personas activas con código. Ve [Cómo sincronizar empleados con el reloj](/ayuda/empleados/sincronizar-con-reloj). |
| `Descargar` | Baja un Excel con la lista que estás viendo (nombre, código, puesto, unidad, departamento, correo, teléfono, ingreso y estado). |
| `Nuevo empleado` | Abre la ficha en blanco para registrar a alguien. Ve [Cómo dar de alta a un empleado](/ayuda/empleados/dar-de-alta). |

### La lista

- Las pestañas **Activos**, **Inactivos** y **Todos** te muestran cuántas personas hay en cada grupo.
- Cada fila tiene nombre y código, puesto, unidad de negocio, departamento, contacto, fecha de ingreso, estado y la columna **Sincronización** (cómo va con los relojes).
- En **Acciones** tienes tres botones: el lápiz (**Editar**), la llave (**Cambiar contraseña**) y el bote (**Dar de baja**). En una persona inactiva el último botón cambia a **Reactivar**.
- Hacer clic en cualquier parte de la fila también abre la ficha, ya lista para editar.

## Cómo buscar y filtrar

1. Escribe en **Buscar** el nombre de la persona. La lista se actualiza sola mientras escribes.
2. Usa los encabezados de la tabla (**Nombre**, **Puesto**, **Unidad de negocio**, **Depto.** y **Estado**) para elegir uno o varios valores.
3. Si tu empresa tiene [campos personalizados](/ayuda/catalogos/campos-personalizados) con filtro, también aparecen como filtros.
4. Para volver a ver todo, toca `Limpiar`.

> **Consejo:** Si siempre revisas el mismo grupo (por ejemplo, solo una unidad de negocio), guarda la búsqueda con **Vistas guardadas**. Se guarda en tu navegador, junto con las columnas que elegiste.

## Cómo elegir las columnas

1. Toca **Columnas**.
2. Marca o desmarca las que quieres ver. Puedes reordenarlas.
3. Tu elección se recuerda en este navegador.

Los campos personalizados empiezan ocultos: actívalos aquí si quieres verlos en la tabla.

## En el celular

En el teléfono la lista se ve como tarjetas, con un buscador por nombre o puesto, el botón **Nuevo** y un panel de filtros.

![Lista de empleados en el celular](/ayuda/capturas/empleados/lista-empleados-celular.webp "En el celular cada persona es una tarjeta")

## Preguntas frecuentes

### ¿Por qué no puedo crear ni importar empleados?

Porque tienes seleccionada **Todas las empresas**. Elige una empresa específica en **Unidad de negocio** y los botones se activan.

### ¿Qué significa «Sin NIP» en la columna Sincronización?

Que la persona no tiene **Código de empleado**. Sin código no se puede mandar al reloj checador. Asígnaselo en su ficha, pestaña **Checador y acceso**.

### ¿El Excel que descargo incluye a los inactivos?

Descarga lo que estás viendo con tus filtros. Si quieres a todos, elige la pestaña **Todos** y limpia los filtros antes de descargar.

### ¿Puedo abrir la ficha de alguien desde otra pantalla?

Sí. En muchas pantallas (Monitor, Asistencias, Nómina, Permisos, Vacaciones, entre otras) el nombre de la persona es un enlace: al tocarlo se abre su ficha en una ventana flotante. Ve [La ficha del empleado](/ayuda/empleados/ficha-del-empleado).

## Qué pasa si…

- **…cambio de empresa en el filtro:** los filtros por campos personalizados se limpian, porque cada empresa tiene los suyos.
- **…la lista sale vacía:** revisa la pestaña (Activos / Inactivos / Todos) y toca `Limpiar`. El mensaje «No hay empleados o búsqueda sin resultados.» también aparece cuando un filtro no encuentra nada.
- **…alcancé el límite de mi plan:** al registrar aparece un aviso con la opción de mejorar el plan. Ve la sección de suscripción con el dueño de la cuenta.

## Relacionado

- [Cómo dar de alta a un empleado](/ayuda/empleados/dar-de-alta)
- [La ficha del empleado y sus 5 pestañas](/ayuda/empleados/ficha-del-empleado)
- [Cómo dar de baja o reactivar a un empleado](/ayuda/empleados/baja-y-reactivacion)
- [Panel de empleado: expediente 360°](/ayuda/empleados/panel-empleado)
