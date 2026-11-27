---
titulo: La ficha del empleado — sus 5 pestañas y cómo editarla
resumen: Conoce todo lo que guarda la ficha (Personal, Trabajo, Checador y acceso, Pago y Documentos), cómo editarla sin perder cambios y cómo abrirla desde cualquier pantalla.
modulo: empleados
audiencia: [rh, dueno]
pantallas: [/panel/empleados]
palabras: [ficha, editar, expediente, pestañas, personal, trabajo, checador, pago, documentos, credencial, qr, cambios sin guardar, ficha flotante]
orden: 20
actualizado: 2026-11-27
fuentes: [src/app/panel/empleados/FormularioEmpleado.jsx, src/app/panel/empleados/tabs/TabNomina.jsx, src/app/panel/empleados/EncabezadoFicha.jsx, src/components/empleado/FichaEmpleado.jsx, src/components/BotonCredencial.jsx, src/components/cambios/CambiosPendientes.jsx, src/components/cambios/EstadoCambios.jsx, src/components/BajaEmpleadoInfo.jsx]
---

## Para qué sirve

La **ficha** es el expediente vivo de cada persona: datos personales, puesto, horario, cómo checa, cómo se le paga y sus documentos. Todo lo que cambias aquí lo usan los demás módulos (asistencias, nómina, vacaciones, permisos y firma de documentos).

## Quién la usa

Recursos Humanos y el dueño. Un usuario del panel solo puede guardar si tiene permiso de edición sobre empleados; el servidor lo revisa al guardar.

## Antes de empezar

La persona ya debe estar registrada. Si es nueva, primero ve [Cómo dar de alta a un empleado](/ayuda/empleados/dar-de-alta).

## Cómo abrir la ficha

Tienes tres caminos:

1. En **Empleados**, toca el lápiz (**Editar**) o cualquier parte de la fila.
2. En otras pantallas (Monitor, Asistencias, Incidencias, Reporte de horas, Nómina, Permisos, Vacaciones, entre otras), toca el **nombre** de la persona: la ficha se abre en una **ventana flotante** encima de lo que estabas viendo. Al terminar toca `Cerrar` y sigues donde estabas.
3. Con Ctrl (o ⌘ en Mac) + clic sobre el nombre, la ficha se abre en otra pestaña del navegador.

La ficha siempre abre **lista para editar**: no hay un paso de «solo ver».

## El encabezado de la ficha

Arriba ves la foto (tócala para cambiarla), el nombre, el estado (Activo o Inactivo), una línea con puesto, área, número de empleado y antigüedad, y tres elementos:

- `Credencial y QR`: la credencial de la persona (ver más abajo).
- El indicador **Sin cambios** o **Cambios sin guardar**. Si pasas el mouse sobre él, te dice qué campos cambiaste.
- `Guardar`: solo se activa cuando cambiaste algo.

![Encabezado de la ficha con el indicador de cambios sin guardar](/ayuda/capturas/empleados/ficha-cambios-sin-guardar.webp "El indicador te avisa que hay cambios pendientes")

## Las 5 pestañas

### Personal

Nombre, apellidos, fecha de nacimiento, teléfono, correo, correo de notificaciones, CURP, RFC, NSS, sexo, estado civil, dirección y **Contactos de emergencia**.

![Pestaña Personal de la ficha](/ayuda/capturas/empleados/ficha-personal.webp "Pestaña Personal")

### Trabajo

**Puesto y organización** (empresa, unidad de negocio, puesto, departamento, fecha de ingreso, jefe inmediato y responsables de autorizar vacaciones y permisos) y **Jornada laboral** (turno existente u horario personalizado por día, con el promedio de horas por día, horas de comida y horas totales por semana). También el interruptor **Autorizar horas extra (reporte)**: si está activo, la persona acumula horas extra en el reporte de horas trabajadas.

Si la persona está dada de baja, aquí ves también la **fecha y el motivo de la baja**.

![Pestaña Trabajo de la ficha](/ayuda/capturas/empleados/ficha-trabajo.webp "Pestaña Trabajo: puesto y organización")

![Jornada laboral dentro de la pestaña Trabajo](/ayuda/capturas/empleados/ficha-jornada.webp "Jornada laboral: horario por día")

### Checador y acceso

Método de chequeo, cierre de turno, **Contraseña de la app** (botón `Cambiar contraseña`), código de empleado, Checar GPS, Asistencia Automática y áreas donde puede checar. Más abajo están el **Consentimiento del rostro**, **Firma y PIN** y **Reconocimiento facial**.

![Pestaña Checador y acceso de la ficha](/ayuda/capturas/empleados/ficha-checador.webp "Pestaña Checador y acceso")

Para estos temas tienes guías propias:

- [Cómo cambiar la contraseña de un empleado](/ayuda/empleados/contrasena-del-empleado)
- [Firma y PIN del empleado: qué puede hacer RH](/ayuda/empleados/firma-y-pin-del-empleado)
- [Cómo registrar el rostro de un empleado](/ayuda/empleados/rostro-del-empleado)

### Pago

**Datos de nómina** (periodo, forma de pago, forma de cálculo, sueldo o porcentaje), **Pago en la nómina** (medio de pago y monto por transferencia, y sus bonos y descuentos) y **Cuentas bancarias**.

**El sueldo vive en el contrato.** Si la persona tiene contrato vigente, aquí ves **Sueldo del contrato** de solo lectura, con `Ver contrato`: es el que usan la nómina, los finiquitos y los aguinaldos, y se cambia con un convenio en el contrato. Si no tiene contrato vigente, ves **Sin contrato vigente**: la nómina usa el sueldo de la ficha y puedes tocar `Crear contrato con este sueldo`.

![Pestaña Pago de la ficha](/ayuda/capturas/empleados/ficha-pago.webp "Pestaña Pago")

> **Ojo:** Los **bonos y descuentos** de esta pestaña se guardan con su propio botón `Guardar bonos y descuentos`, no con el `Guardar` de la ficha. Si dejas un valor vacío, se usa el del catálogo de bonos.

### Documentos

El **expediente digital** de la persona: documentos cargados, vigentes, por vencer, vencidos y obligatorios. Ve [Cómo subir documentos al expediente digital](/ayuda/empleados/expediente-digital).

![Pestaña Documentos de la ficha](/ayuda/capturas/empleados/ficha-documentos.webp "Pestaña Documentos: el expediente digital")

## Cómo editar y guardar la ficha

1. Abre la ficha.
2. Cambia lo que necesites en cualquier pestaña. Puedes pasar de una pestaña a otra sin perder lo escrito.
3. Toca `Guardar`. Verás «Cambios guardados» y te quedas en la misma pestaña.

Si falta un dato obligatorio o algo está mal escrito, aparece un aviso y la ficha te lleva a la pestaña y al campo con el problema.

## Cómo salir sin perder cambios

Si intentas salir (flecha de regresar, `Cerrar` de la ventana flotante, otra opción del menú) con cambios pendientes, aparece **Tienes cambios sin guardar** con tres opciones:

- `Guardar y salir`: guarda con las mismas revisiones del botón Guardar y sale solo si se guardó bien.
- `Salir sin guardar`: descarta lo que cambiaste.
- `Seguir editando`: te regresa a la ficha.

## Credencial y QR

1. Toca `Credencial y QR` en el encabezado.
2. Verás el frente y la vuelta de la credencial en tamaño tarjeta (CR80, 54 × 86 mm). El **QR es su código de empleado**, el mismo que lee el reloj checador.
3. Descárgala con `PNG frente`, `PNG vuelta` o `Descargar PDF`.

![Ventana Credencial y QR](/ayuda/capturas/empleados/credencial-y-qr.webp "Credencial tamaño tarjeta con QR")

> **Importante:** Si hay cambios sin guardar, la credencial muestra lo que ves en la ficha. Guarda antes de imprimir para que el código coincida con el checador. Si la persona no tiene código, la credencial no lleva QR: asígnalo en **Checador y acceso**.

## Preguntas frecuentes

### ¿Por qué el botón Guardar está gris?

Porque no has cambiado nada. Se activa en cuanto modificas un campo.

### ¿Abrir la ficha cuenta como cambio?

No. Solo cuenta lo que tú tocas y queda distinto. El horario recalculado (horas por día y de comida) tampoco cuenta como cambio por sí solo.

### Cambié el horario de un turno, ¿se guarda con la ficha?

Sí. Si eliges **Turno existente**, al guardar se asigna ese turno a la persona; si cambias a **Horario personalizado**, al guardar se le quita el turno y se usan los horarios por día.

### ¿Qué pasa con los contactos de emergencia de alguien ya registrado?

Se guardan en el momento con `Guardar contacto`, sin necesidad del botón Guardar de la ficha.

## Qué pasa si…

- **…no tengo permiso para ver a esa persona:** al tocar su nombre aparece «No tienes permiso para ver a esta persona.»
- **…cambio el correo por uno que ya usa otra persona o un usuario del panel:** el servidor no guarda y te avisa que el correo ya existe.
- **…la persona actualizó su rostro desde su app mientras yo tenía abierta la ficha:** al guardar no se pisa su rostro; solo se envía un rostro si tú capturaste uno nuevo.
- **…cambio de empresa en la pestaña Trabajo:** los campos personalizados se limpian, porque cada empresa tiene los suyos.

## Relacionado

- [Empleados: tu plantilla en una sola pantalla](/ayuda/empleados)
- [Cómo dar de baja o reactivar a un empleado](/ayuda/empleados/baja-y-reactivacion)
- [Campos personalizados](/ayuda/campos-personalizados/crear-campos-personalizados)
- [Panel de empleado: expediente 360°](/ayuda/empleados/panel-empleado)
- [Cómo elegir la forma de checar de cada empleado](/ayuda/reloj-checador/como-checa-cada-empleado)
- [Cómo registrar el rostro de un empleado](/ayuda/empleados/rostro-del-empleado)
- [Firma y PIN del empleado — qué puede hacer RH](/ayuda/empleados/firma-y-pin-del-empleado)
- [Áreas de Check — dónde se puede checar con GPS](/ayuda/catalogos/areas-de-check)
