---
titulo: Cómo dar acceso al panel a otra persona
resumen: Crea usuarios con acceso para tu equipo de RH, elige su rol, sus permisos por módulo y las empresas que puede ver. También cómo editarlos, desactivarlos o eliminarlos.
modulo: usuarios
audiencia: [dueno]
pantallas: [/panel/usuarios-con-acceso]
palabras: [usuarios con acceso, nuevo acceso, dar acceso, usuario, contraseña, rol, permisos, desactivar usuario, eliminar acceso, empresas]
orden: 10
actualizado: 2026-11-27
fuentes: [src/app/panel/usuarios-con-acceso/page.jsx, src/components/permisos/EditorPermisos.jsx, src/lib/permisos/permisos.mjs]
---

## Para qué sirve

Si otras personas te ayudan con Recursos Humanos, no compartas tu contraseña: dales su propio **acceso**. Cada acceso tiene su correo, su contraseña, un rol y permisos por módulo, y puede limitarse a algunas de tus empresas.

## Quién la usa

**Solo el dueño de la cuenta.** Los usuarios con acceso no ven esta sección; si entran por la dirección verán «Solo para el dueño de la cuenta».

## Antes de empezar

- Ten a la mano el nombre y el correo de la persona. El correo es con el que va a entrar y donde recibirá notificaciones.
- Piensa qué necesita hacer: ver la [guía de roles y permisos](/ayuda/usuarios/roles-y-permisos) te ayuda a decidir.

## Cómo crear un acceso

1. En el menú lateral, dentro de **Ajustes**, abre **Usuarios con acceso**.
2. Presiona **Nuevo acceso**.
3. Escribe **Nombre**, **Correo** y **Contraseña** (mínimo 6 caracteres).
4. En **Rol** elige una plantilla: **Administrador**, **Recursos Humanos**, **Reclutador**, **Solo lectura** o **Personalizado**. La plantilla llena los permisos.
5. Si quieres, ajusta módulo por módulo en **Permisos por módulo** (queda como «Personalizado»).
6. En **Empresas** elige **Todas las empresas** («También las que agregues después.») o **Solo algunas** y marca cuáles.
7. Revisa el resumen de abajo, por ejemplo «Ve 15 módulos, edita 11, todas las empresas», y presiona **Guardar**.

![Ventana Nuevo acceso con datos y rol](/ayuda/capturas/usuarios/nuevo-acceso.webp "Datos de la persona y la plantilla de rol")

![Permisos por módulo con tres niveles](/ayuda/capturas/usuarios/permisos-por-modulo.webp "Cada módulo con Sin acceso, Ver o Ver y editar")

![Elegir a qué empresas entra el acceso](/ayuda/capturas/usuarios/empresas-del-acceso.webp "Todas las empresas o solo algunas")

Verás «Acceso creado correctamente». Comparte con la persona su correo y su contraseña por un medio seguro; podrá activar Face ID o huella después de entrar.

> **Consejo:** Con los botones **Todo: Sin acceso**, **Todo: Ver** y **Todo: Ver y editar** cambias todos los módulos de un jalón y luego ajustas los que quieras.

## Cómo leer la lista

![Lista de usuarios con acceso](/ayuda/capturas/usuarios/usuarios-lista.webp "Nombre, correo, estado y el resumen de rol y permisos")

La tabla muestra **Nombre**, **Correo**, **Estado** (Activo o Inactivo) y **Rol y permisos** (la plantilla y un resumen como «Ve 2 módulos, edita 1, todas las empresas»). Usa el buscador **Nombre o correo** y **Limpiar búsqueda**.

## Cómo cambiar los permisos o la contraseña de alguien

1. Presiona el lápiz (**Editar**) en su renglón.
2. Cambia lo necesario. En **Nueva contraseña (opcional)** escribe una solo si quieres cambiarla.
3. Presiona **Guardar**. Verás «Acceso actualizado correctamente».

Los nuevos permisos se aplican en menos de un minuto sin que la persona tenga que volver a entrar. Si tiene el panel abierto, su menú se actualiza al recargar la página.

## Cómo desactivar a alguien sin borrarlo

1. Edita su acceso.
2. En **Estado** elige **Inactivo** y presiona **Guardar**.

## Cómo eliminar un acceso

1. Presiona el bote (**Eliminar**) en su renglón.
2. Confirma con **Sí, eliminar**. Esta acción no se puede deshacer.

## Preguntas frecuentes

### ¿Puedo editar o eliminar mi propio acceso?

No. Los botones aparecen desactivados con el aviso «No puedes editar tu propio acceso».

### ¿Un acceso puede autorizar la nómina o ver la suscripción?

No. Autorizar la nómina, Usuarios con acceso, Módulos, Mi suscripción e Integraciones son solo del dueño, sin importar el rol.

### ¿Qué pasa con los accesos que ya existían antes de los roles?

Funcionan como **Administrador** con todas las empresas hasta que los edites.

## Qué pasa si…

- **…el correo no tiene formato válido.** Verás «El correo no tiene un formato válido».
- **…la contraseña es corta.** Verás «La contraseña debe tener al menos 6 caracteres».
- **…eliges Solo algunas y no marcas ninguna empresa.** Verás «Elige al menos una empresa o marca «Todas las empresas»».
- **…el acceso se creó pero los permisos no se guardaron.** Verás «El acceso se creó, pero sus permisos no se guardaron: … Revísalos y vuelve a guardar.». Edítalo y guarda otra vez.

## Relacionado

- [Roles y permisos por módulo](/ayuda/usuarios/roles-y-permisos)
- [Seguridad, Face ID y sesiones abiertas](/ayuda/seguridad/face-id-y-sesiones)
