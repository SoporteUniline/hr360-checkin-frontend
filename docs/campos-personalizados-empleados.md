# Campos personalizados de empleados

En **Ajustes → Campos personalizados**, la empresa se obtiene de la sesión, sin un
selector adicional. **Nuevo campo** y **Editar** abren el mismo modal.

Tipos disponibles:

- **Selección:** opciones individuales con botones para agregar/eliminar y un asa
  para arrastrar y cambiar el orden, también operable con teclado. El orden se
  conserva al guardar y se respeta en los desplegables.
- **Texto:** captura libre de hasta 100 caracteres.
- **Número:** enteros y decimales, incluidos cero y valores negativos.

Cada campo permite activar el formulario y elegir su pestaña: personales, contactos
de emergencia, laborales, jornada, nómina, cuentas, rostro o documentos. Los campos
antiguos usan Datos laborales hasta que se configure otra pestaña.

La visibilidad en escritorio se elige desde **Empleados → Columnas**, con la misma
persistencia local que las columnas estándar. Todos los campos activos están
disponibles allí y los personalizados empiezan ocultos hasta seleccionarlos.
La configuración del campo sólo conserva la opción de habilitar su filtro.
Los filtros reutilizan el desplegable con búsqueda, selección múltiple y chips de
las columnas estándar; se combinan con los demás filtros antes de paginar.
En móvil los filtros se encuentran en su panel; las tarjetas del listado no muestran
los valores de los campos personalizados. Estos siguen disponibles en el formulario
y al consultar el empleado en su pestaña correspondiente.

Los controles del formulario usan los componentes Select e Input del panel. Todos
los valores son opcionales. Desactivar un campo conserva sus datos y retirar una
opción conserva las asignaciones anteriores. El tipo no cambia después de crear
el campo para proteger los datos existentes; para otro tipo se crea un campo nuevo.

Los tipos se guardan dentro del JSON de configuración ya disponible. Las listas
anteriores se interpretan como selección; no hace falta otra migración. Las
ubicaciones pertenecen al módulo Empleados y no añaden campos a otros módulos.

## Preparación de la base de datos

Antes de usar esta versión, aplicar en un entorno de pruebas la migración del backend
`migrations/20261027_campos_personalizados_empleados.sql`, previa autorización.
Crea el catálogo y una columna JSON nullable en empleados, sin asignar valores a
empleados existentes. Requiere una versión de MySQL con soporte de JSON.
El 2026-10-27 se aplicó y verificó únicamente en `adamia_dev`. Las pruebas por API
crearon Cuadrilla A/B/C en la empresa 65 y el empleado sintético inactivo 303, con
asignación final B. Los empleados existentes no se modificaron. El detalle está
en `docs/verificacion-campos-personalizados-dev.md` del backend. No se realizó deploy.
La interfaz requiere que su backend apunte a esa misma base de desarrollo; muestra
un error si el catálogo aún no está disponible. Cualquier otro entorno requiere
autorización y verificación propias antes de ejecutar la migración.

## Verificación

Pruebas sin acceso a base de datos:

- Frontend: `node --test scripts/test-campos-personalizados.mjs`.
- Backend: `node --test scripts/test-campos-personalizados.cjs`.

Después de aplicar la migración en pruebas:

1. Crear Cuadrilla con A/B/C y las tres ubicaciones activas.
2. Crear y editar empleados asignando distintas opciones; recargar y verificar persistencia.
3. Filtrar por Cuadrilla, cambiar de página y comprobar conteos y resultados.
4. Repetir en móvil, incluido limpiar filtros.
5. Cambiar cada ubicación y comprobar su visibilidad de forma independiente.
6. Retirar una opción asignada y desactivar el campo; editar otros datos y verificar conservación.
7. Usar una segunda empresa y comprobar que sus campos y asignaciones están separados.
8. Confirmar que un usuario de otra empresa no puede leer ni modificar la configuración.

## Verificación de la actualización visual y tipos

La compilación de producción pasó. Pasaron 11 pruebas del backend y 3 del frontend,
además de la regresión del esquema de contraseñas. El lint de los archivos cambiados
no reportó errores; permanecen avisos anteriores de imágenes y una directiva de lint.

Se verificó en Edge local con respuestas de API simuladas, sesión de prueba y acceso
a base de datos deshabilitado: alta y edición en modal, selección de tipo, creación
de texto, filtro dentro del encabezado, chips y resultados combinados, controles del
formulario y modal móvil. El campo numérico mostró correctamente cero.

Capturas de esa revisión local en:
`C:\Users\LUISAN~1\AppData\Local\Temp\campos-ui-bfjAEl`.
Esto no sustituye la comprobación con una sesión real de desarrollo después de
reiniciar backend y frontend. No se aplicaron nuevas migraciones ni se escribieron
datos en la base durante esta actualización.

## Verificación de pestañas, orden y columnas

Pasaron 13 pruebas de backend, 6 de frontend y la regresión de contraseñas.
En Edge local con respuestas simuladas se verificó arrastrar opciones y guardar su
orden, seleccionar Datos personales y mostrar el campo sólo allí, activar columnas
y conservarlas al recargar, filtrar por encabezado y que las tarjetas móviles no
muestren los valores personalizados. Capturas de esta revisión en:
`C:\Users\LUISAN~1\AppData\Local\Temp\campos-ui-8kcwkp`.

No fue necesaria otra migración ni se modificaron bases de datos. Para comprobar
la persistencia con una sesión real de desarrollo hay que reiniciar backend y
frontend, guardar un campo y recargar su configuración.

La compilación de producción terminó en una copia temporal aislada de los fuentes
(`campos-build-e8xa4j`). La ejecución en el directorio habitual había fallado por
un archivo generado de Next ausente. En la copia temporal quedaron avisos de
face-api y de permisos al enlazar dependencias del paquete standalone de Windows;
la compilación y generación de las 124 páginas terminaron con código 0. No se
utilizó ese paquete para desplegar.
