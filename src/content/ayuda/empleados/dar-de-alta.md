---
titulo: Cómo dar de alta a un empleado
resumen: Registra a una persona nueva con sus datos personales, puesto, horario, checador y pago, y evita los errores más comunes.
modulo: empleados
audiencia: [rh, dueno]
pantallas: [/panel/empleados]
palabras: [alta, nuevo empleado, registrar, contratar, ingreso, ficha, obligatorio, curp, rfc, nss, sueldo, horario]
orden: 10
actualizado: 2026-11-27
fuentes: [src/app/panel/empleados/page.jsx, src/app/panel/empleados/FormularioEmpleado.jsx, src/schemas/schemaEmpleado.jsx, src/app/panel/empleados/tabs/TabPersonales.jsx, src/app/panel/empleados/tabs/TabLaborales.jsx, src/app/panel/empleados/tabs/TabJornada.jsx, src/app/panel/empleados/tabs/TabNomina.jsx, src/app/panel/empleados/tabs/TabCuentasBancarias.jsx, src/app/panel/empleados/tabs/TabContactosEmergencia.jsx]
---

## Para qué sirve

Dar de alta crea la **ficha** de la persona. Con ella puede checar en el reloj, entrar a su app (Mi espacio), aparecer en nómina, pedir vacaciones y recibir documentos para firmar.

> **Consejo:** Si la persona aún no empieza y quieres que ella misma llene sus datos, suba sus documentos y firme desde su celular, usa [Inducción digital](/ayuda/induccion). Al final, con un clic queda dada de alta aquí.

## Quién la usa

Recursos Humanos y el dueño de la empresa.

## Antes de empezar

- Ten a la mano: nombre completo, correo, puesto, unidad de negocio, horario y datos de pago. CURP, RFC, NSS y cuenta bancaria son opcionales, pero conviene capturarlos desde el inicio.
- Si manejas varias empresas, elige primero una empresa específica en el filtro **Unidad de negocio** de la lista. Con **Todas las empresas** el sistema no te deja crear.
- El **correo** debe ser único: no puede repetirse con otro empleado de la empresa ni con un usuario del panel.

## Cómo registrar a la persona

1. Entra a **Gestión de personal → Empleados**.
2. Toca `Nuevo empleado`. Se abre la ficha en blanco con el cursor en **Nombre(s)**.
3. Llena las pestañas en orden. Abajo te explicamos cada una.
4. Toca `Registrar` (arriba a la derecha; en el celular, el botón azul de abajo dice `Registrar empleado`).
5. Si todo está bien verás «Empleado registrado» y regresarás a la lista.

![Ficha de un empleado nuevo en la pestaña Personal](/ayuda/capturas/empleados/alta-personal.webp "La ficha en blanco: empieza por la pestaña Personal")

### Pestaña Personal

- **Obligatorios:** Nombre(s), Apellido Paterno, Apellido Materno y Correo.
- **Opcionales:** Fecha de nacimiento, Teléfono, Correo Notificaciones, CURP (18 caracteres), RFC (13), NSS (11, solo números), Sexo, Estado civil y Dirección.
- **Estado civil** se elige de la lista; si no existe la opción, escríbela y créala ahí mismo.
- **Correo Notificaciones** es a donde le llegan los avisos por correo (por ejemplo, las felicitaciones de cumpleaños). Si lo dejas vacío, esos correos no se le pueden mandar.
- **Contactos de emergencia:** toca `Agregar contacto`, escribe nombre, parentesco y al menos un teléfono o celular, y `Guardar contacto`. Puedes marcar uno como **contacto principal**. En un alta, los contactos se guardan cuando registras a la persona.

### Pestaña Trabajo

- **Obligatorios:** Empresa, **Unidad de negocio** y **Puesto**.
- **Puesto**, **Departamento** y **Unidad de negocio** se eligen de la lista o se crean al momento escribiendo el nombre nuevo.
- **Jefe inmediato**, **Responsable de autorizar vacaciones** y **Responsable de autorizar permisos**: definen quién ve y aprueba sus solicitudes en «Solicitudes de mi equipo».
- **CC vacaciones** y **CC permisos**: correos que reciben copia de sus solicitudes (opcional).
- **Jornada laboral:** elige **Turno existente** (un horario ya configurado) u **Horario personalizado** (días y horas para esta persona). Con el horario personalizado puedes usar **Asignar horario a varios días** y `Aplicar horario a días seleccionados` para no repetir.

> **Importante:** Debe haber al menos un día con hora de **Entrada** y **Salida**. Si pones **Salida comida**, también tienes que poner **Regreso comida** (y al revés).

### Pestaña Checador y acceso

- **Método de chequeo:** Código, Facial, Ambos o **Código y cara** (escribe su código en el reloj y la cámara confirma que es él).
- **Cierre de turno:** Automático o Manual.
- **Código de empleado:** es el número con el que checa en el reloj y el que lleva su credencial. No se puede repetir.
- **Checar GPS** y **Asistencia Automática**, y las **Áreas donde el empleado puede checar**.
- **Contraseña de la app:** puedes dejarla en blanco; después la generas con `Cambiar contraseña` (ve [Cómo cambiar la contraseña de un empleado](/ayuda/empleados/contrasena-del-empleado)).

### Pestaña Pago

- **Obligatorios:** Periodo de pago (Diario, Semanal, Catorcenal, Quincenal, Mensual o Por hora), Forma de pago (Fijo, Comisiones o Fijo + Comisiones) y Forma de cálculo ($, % o Ambos).
- Con **$** o **Ambos** te pide el sueldo; con **%** o **Ambos**, el porcentaje.
- **Medio de pago:** Transferencia, Efectivo o Mixto. En Mixto escribe el **Monto por transferencia**; el resto del neto se paga en efectivo.
- **Cuentas bancarias:** tipo (Cuenta o CLABE), banco y número. Si eliges **Otro**, escribe el nombre del banco. El número lleva entre 10 y 18 dígitos.

## Si falta un dato al registrar

Si tocas `Registrar` y falta un dato, aparece un aviso amarillo con el problema y la ficha **te lleva sola a la pestaña donde está el error**, con el cursor en el campo.

![Aviso de campo obligatorio al registrar](/ayuda/capturas/empleados/alta-error-obligatorio.webp "El sistema te lleva al campo que falta")

## Preguntas frecuentes

### ¿Por qué dice «Ya existe un empleado con ese correo»?

El sistema revisa que **correo, CURP, RFC, NSS y Código de empleado** no estén repetidos en tu empresa. Busca a la persona en la pestaña **Todos**: quizá ya está registrada (a veces como inactiva y solo hay que reactivarla).

### ¿Por qué no aparece la pestaña Documentos?

En un alta, **Documentos** solo aparece si tu empresa tiene campos personalizados en esa pestaña. Después de registrar a la persona, la pestaña aparece siempre y ahí subes su expediente.

### ¿Puedo registrar sin cuenta bancaria ni CURP?

Sí. Son opcionales. Puedes completarlos después editando la ficha.

### ¿Cuándo empieza a checar en el reloj?

Si tiene **Código de empleado** y tu empresa tiene relojes activos, se manda a los relojes. Revisa la columna **Sincronización** de la lista; si hace falta, usa [Sincronizar con reloj](/ayuda/empleados/sincronizar-con-reloj).

## Qué pasa si…

- **…el turno está seleccionado pero no elegí cuál:** aparece «Debes seleccionar un turno» y te regresa a **Trabajo**.
- **…los campos personalizados aún se están cargando:** verás «Espera a que se carguen los campos personalizados antes de guardar.» Espera un momento y vuelve a tocar `Registrar`.
- **…se registró la persona pero falló un contacto de emergencia:** el empleado sí queda creado y verás cuántos contactos faltaron. Agrégalos después desde su ficha; no lo vuelvas a dar de alta.
- **…llegué al límite de empleados de mi plan:** aparece un aviso con el enlace «Mejorar plan →».
- **…salgo de la ficha sin registrar:** si ya escribiste algo, el sistema te pregunta antes de salir para que no pierdas la captura.

## Relacionado

- [La ficha del empleado y sus 5 pestañas](/ayuda/empleados/ficha-del-empleado)
- [Cómo importar empleados desde Excel](/ayuda/empleados/importar-empleados)
- [Catálogos base: departamentos, puestos y unidades de negocio](/ayuda/catalogos)
- [Inducción digital](/ayuda/induccion)
- [Cómo asignar empleados a un turno](/ayuda/turnos/asignar-empleados-a-un-turno)
- [Cómo elegir la forma de checar de cada empleado](/ayuda/reloj-checador/como-checa-cada-empleado)
- [Cómo invitar a un nuevo ingreso](/ayuda/induccion/invitar-nuevo-ingreso)
