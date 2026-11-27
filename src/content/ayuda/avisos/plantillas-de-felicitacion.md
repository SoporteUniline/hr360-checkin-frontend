---
titulo: Plantillas de felicitación — el correo de cumpleaños y aniversario
resumen: Personaliza el correo que reciben tus empleados en su cumpleaños y su aniversario laboral, prende el envío automático y revisa los mensajes de WhatsApp.
modulo: avisos
audiencia: [rh, dueno]
pantallas: [/panel/plantillas-felicitacion]
palabras: [plantillas de felicitación, cumpleaños, aniversario, correo automático, whatsapp automático, diseño, variables, asunto, enviarme una prueba]
orden: 10
actualizado: 2026-11-27
fuentes: [src/components/avisos/PlantillasFelicitacion.jsx, src/lib/avisos/avisos.mjs, src/app/panel/plantillas-felicitacion/page.jsx]
---

## Para qué sirve

Aquí decides **qué reciben tus empleados** en su **cumpleaños** y en su **aniversario laboral**:

- El **correo**: diseño, asunto y mensaje, con datos que se llenan solos.
- Si se manda **solo por correo** el día, si te **avisa en la campana** y si se manda **solo por WhatsApp**.

Lo encuentras en **Ajustes → Plantillas de felicitación**.

![Plantillas de felicitación con el editor del correo y su vista previa](/ayuda/capturas/avisos/plantillas-de-felicitacion.webp "Lo que reciben tus empleados en su cumpleaños y aniversario")

## Quién la usa

Solo **Recursos Humanos y el dueño** editan las plantillas.

## Antes de empezar

- El correo llega al **Correo Notificaciones** de la ficha de cada persona.
- Mientras no guardes tu versión, se usa **el correo de ADAMIA**.

## Paso a paso: personalizar el correo

1. A la izquierda elige **Cumpleaños** o **Aniversario laboral**.
2. Elige el **Diseño**: **Festivo** (color y confeti), **Elegante** (oscuro y dorado) o **Sencillo** (solo texto).
3. Escribe el **Asunto del correo**.
4. Escribe el **Mensaje**. Deja una línea en blanco para separar párrafos. No se puede poner HTML: lo que escribas sale tal cual.
5. Para insertar datos de la persona, toca las variables de **Toca para insertar**: `{nombre}`, `{edad}`, `{años}`, `{área}`, `{empresa}` y `{jefe}`.
6. Revisa la **Vista previa** a la derecha (también en **Modo oscuro**).
7. Toca `Enviarme una prueba` para recibirla en tu correo («[Prueba] …»).
8. Toca `Guardar`.

Para regresar al correo original, toca **Volver a la de ADAMIA**.

## Paso a paso: envío y avisos

Debajo del mensaje tienes tres casillas por cada tipo:

- **Enviar automático por correo** el día, a las **9:05 a. m.** (hora de tu empresa). También depende de que la regla de aviso correspondiente esté activa; si no, verás el enlace **Ir a Reglas de aviso**.
- **Avisarme en la campana** 7 días antes, para felicitar por WhatsApp.
- **Enviar automático por WhatsApp** el día a las 9:05 a. m., con el mensaje aprobado por WhatsApp. Sale del número de WhatsApp de ADAMIA. **Viene apagado.**

![Casillas de envío automático y avisos](/ayuda/capturas/avisos/plantillas-envio-y-avisos.webp "Envío automático por correo, aviso en la campana y WhatsApp automático")

## Los mensajes de WhatsApp

En la pestaña **WhatsApp** de la vista previa ves los mensajes. **Los redacta ADAMIA y los aprueba WhatsApp**: no se pueden cambiar. Al felicitar, los datos se llenan solos.

## Preguntas frecuentes

### ¿Se manda el correo dos veces si ya felicité a mano?

No. Si ya se le mandó el correo ese año (a mano desde la campana o automático), no se repite.

### ¿Y si WhatsApp todavía no aprueba el mensaje?

El envío automático por WhatsApp no sale ese año y lo puedes felicitar a mano desde la campana. El correo no depende de esto.

### ¿Se felicita a personas dadas de baja?

No. Solo a empleados activos.

### ¿Y el fin de contrato?

El fin de contrato **no se felicita**: solo avisa a RH en la campana.

## Qué pasa si…

- **…escribo una variable que no existe:** no se guarda y te muestra cuáles sí puedes usar.
- **…un dato está vacío en la ficha:** queda neutro (por ejemplo «tu área» o «tu jefe»).
- **…falta configurar el número de notificaciones de WhatsApp:** la casilla de WhatsApp automático aparece desactivada con el motivo.
- **…otra persona guardó mientras yo editaba:** ADAMIA te avisa para que recargues y no se pisen los cambios.
- **…salgo con cambios sin guardar:** verás la marca «sin guardar» en la plantilla.

## Relacionado

- [Avisos: cumpleaños, aniversarios y fin de contrato](/ayuda/avisos/campana-de-avisos)
- [La ficha del empleado](/ayuda/empleados/ficha-del-empleado)
