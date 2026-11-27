---
titulo: Cómo cambiar la contraseña de un empleado
resumen: Crea o cambia la contraseña con la que la persona entra a su app (Mi espacio) y dásela de forma segura.
modulo: empleados
audiencia: [rh, dueno]
pantallas: [/panel/empleados]
palabras: [contraseña, password, acceso, app, mi espacio, olvidó su contraseña, generar contraseña, entrar]
orden: 50
actualizado: 2026-11-27
fuentes: [src/app/panel/empleados/CambiarContrasenaEmpleado.jsx, src/app/panel/empleados/tabs/TabLaborales.jsx, src/app/panel/empleados/EmpleadosTable.jsx]
---

## Para qué sirve

Cada empleado entra a su app (**Mi espacio**) con **el correo de su ficha** y una **contraseña**. Desde aquí RH crea la contraseña la primera vez o la cambia cuando la persona la olvida.

## Quién la usa

Recursos Humanos y el dueño, con permiso sobre ese empleado.

## Antes de empezar

- La persona ya debe estar registrada (no aplica en un alta todavía sin guardar).
- Confirma que su **correo** en la ficha es correcto: es su usuario para entrar.

## Cómo cambiar la contraseña

1. Entra a **Gestión de personal → Empleados**.
2. En la fila de la persona, toca la **llave** de **Acciones** (o, dentro de su ficha, pestaña **Checador y acceso**, el botón `Cambiar contraseña`).
3. Escribe la nueva contraseña y repítela. O toca `Generar una segura` para que ADAMIA cree una de 10 caracteres sin letras que se confunden.
4. Toca `Cambiar contraseña`.
5. Verás **Listo. Ya puede entrar con:** su correo y la contraseña, con el botón `Copiar`.

![Ventana para cambiar la contraseña de un empleado](/ayuda/capturas/empleados/cambiar-contrasena.webp "Escribe o genera la nueva contraseña")

> **Importante:** Dásela **en persona**. La persona puede cambiarla después desde su app.

## Reglas de la contraseña

- Al menos **8 caracteres**.
- Debe tener **letras y números**.
- Las dos casillas deben coincidir; si no, verás «No coinciden.».

## Preguntas frecuentes

### ¿La persona se queda conectada en su celular después del cambio?

No. Al cambiar la contraseña se cierran sus sesiones abiertas y tendrá que entrar de nuevo con la contraseña nueva.

### ¿Puedo ver la contraseña actual de alguien?

No. Nadie puede ver una contraseña guardada; solo se puede poner una nueva.

### ¿Esto cambia su PIN de firma?

No. El PIN para firmar documentos es otra cosa y solo lo crea la persona. Ve [Firma y PIN del empleado](/ayuda/empleados/firma-y-pin-del-empleado).

## Qué pasa si…

- **…aparece «El servidor no respondió (puede estar actualizándose)…»:** la contraseña **no** se cambió. Intenta de nuevo en un minuto.
- **…no tengo permiso sobre ese empleado:** el servidor rechaza el cambio y verás el aviso.
- **…la persona no puede entrar con la nueva contraseña:** revisa que esté usando el correo exacto de su ficha y que su estado sea **Activo** (una persona dada de baja no puede entrar).

## Relacionado

- [La ficha del empleado y sus 5 pestañas](/ayuda/empleados/ficha-del-empleado)
- [Mi firma y PIN (para empleados)](/ayuda/empleados/mi-firma-y-pin)
