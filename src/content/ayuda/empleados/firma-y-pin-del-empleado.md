---
titulo: Firma y PIN del empleado — qué puede hacer RH
resumen: Revisa si la persona ya guardó su firma y su PIN, desbloquea un PIN bloqueado por intentos fallidos o restablécelo si lo olvidó.
modulo: empleados
audiencia: [rh, dueno]
pantallas: [/panel/empleados]
palabras: [pin, firma, firma guardada, bloqueado, desbloquear, restablecer, intentos fallidos, firmar documentos]
orden: 55
actualizado: 2026-11-27
fuentes: [src/app/panel/empleados/tabs/FirmaPinRh.jsx, src/lib/firma/pinRh.mjs, src/app/panel/empleados/tabs/TabReconocimiento.jsx]
---

## Para qué sirve

Cada empleado puede guardar **su firma** y crear un **PIN secreto de 6 dígitos** en su app. Con eso firma documentos en un paso (sin dibujar cada vez). Por seguridad, **nadie de RH puede ver ni escribir el PIN**: es la firma de la persona.

Lo que sí puede hacer RH es **ver el estado** y, si hace falta, **desbloquear** o **restablecer** el PIN.

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

La persona debe estar registrada. La firma y el PIN los crea ella desde **Mi espacio → Mi firma y PIN**; mándale la guía [Mi firma y PIN](/ayuda/empleados/mi-firma-y-pin).

## Paso a paso: revisar el estado

1. Abre la ficha de la persona.
2. Ve a la pestaña **Checador y acceso** y baja hasta **Firma y PIN**.
3. Revisa:
   - **Firma:** Guardada o Sin firma guardada.
   - **PIN:** Sin PIN, Activo (con o sin intentos fallidos recientes) o **Bloqueado** (con la hora hasta la que sigue bloqueado).

![Secciones Consentimiento del rostro, Firma y PIN y Reconocimiento facial en la ficha](/ayuda/capturas/empleados/ficha-rostro-firma-pin.webp "Firma y PIN, al centro")

## Paso a paso: desbloquear el PIN

Úsalo cuando la persona se equivocó varias veces y su PIN quedó bloqueado, pero **sí lo recuerda**.

1. En **Firma y PIN**, toca `Desbloquear PIN`.
2. Confirma con `Desbloquear`.

Se quita el bloqueo por intentos fallidos. **El PIN no cambia** y tú no lo ves. Queda registrado que lo desbloqueaste.

## Paso a paso: restablecer el PIN

Úsalo cuando la persona **olvidó** su PIN.

1. En **Firma y PIN**, toca `Restablecer PIN`.
2. Confirma con `Restablecer PIN`.

Se **borra** su PIN actual. La persona tendrá que crear uno nuevo en su app (**Mi espacio → Mi firma y PIN**) antes de volver a firmar con PIN; mientras tanto puede **firmar dibujando**. Su firma guardada se conserva. Queda registrado que lo restableciste.

Debajo de los botones verás el historial: quién desbloqueó o restableció el PIN y cuándo.

## Preguntas frecuentes

### ¿Cuándo se bloquea un PIN?

Después de **5 intentos fallidos** se bloquea **15 minutos**. Pasado ese tiempo se desbloquea solo.

### ¿La persona puede cambiar su PIN sin RH?

Sí. Si recuerda su PIN, lo cambia desde su app. Si lo olvidó, también puede cambiarlo escribiendo **la contraseña de su cuenta** en lugar del PIN actual.

### ¿Puedo firmar por la persona?

No. RH no puede ver, escribir ni usar el PIN de nadie.

## Qué pasa si…

- **…no aparecen los botones:** solo salen cuando aplica. **Desbloquear PIN** aparece si tiene PIN y está bloqueado o con intentos fallidos; **Restablecer PIN** aparece si tiene PIN.
- **…la persona aún no crea su PIN:** el estado dice «Sin PIN» y no hay nada que hacer desde RH; puede firmar dibujando.
- **…restablezco por error:** la persona solo tiene que crear un PIN nuevo desde su app. Su firma guardada no se pierde.

## Relacionado

- [Mi firma y PIN (para empleados)](/ayuda/empleados/mi-firma-y-pin)
- [Cómo firmar un documento desde el celular](/ayuda/documentos/firmar-desde-el-celular)
- [Cómo registrar el rostro de un empleado](/ayuda/empleados/rostro-del-empleado)
