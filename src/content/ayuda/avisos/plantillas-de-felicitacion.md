---
titulo: Plantillas de felicitación y WhatsApp
resumen: Personaliza el correo de cumpleaños y de aniversario laboral, elige si se manda solo por correo o por WhatsApp y conoce los mensajes de WhatsApp aprobados por Meta.
modulo: avisos
audiencia: [rh, dueno]
pantallas: [/panel/plantillas-felicitacion]
palabras: [plantillas de felicitación, felicitar, cumpleaños, aniversario, correo de felicitación, whatsapp, plantilla de whatsapp, aprobada por meta, número de notificaciones, variables, diseño, enviarme una prueba]
orden: 20
actualizado: 2026-11-27
fuentes: [src/components/avisos/PlantillasFelicitacion.jsx, src/app/panel/plantillas-felicitacion/page.jsx, src/lib/permisos/permisos.mjs]
---

## Para qué sirve

Aquí decides qué reciben tus empleados en su **cumpleaños** y en su **aniversario laboral**: el correo (con tu diseño y tus palabras) y, si lo enciendes, un mensaje de WhatsApp. También decides si quieres que ADAMIA te avise en la campana del panel para felicitar tú en persona.

## Quién la usa

Recursos Humanos y el dueño de la cuenta. Un usuario con acceso necesita permiso en **Ajustes de la empresa**. Los empleados no ven esta pantalla.

## Antes de empezar

- Entra por **Ajustes → Plantillas de felicitación**.
- Para que el correo salga solo, la regla **Felicitar cumpleaños** o **Felicitar aniversario** debe estar encendida en [Reglas de aviso](/ayuda/avisos/reglas-de-aviso).
- La persona necesita **correo de notificaciones** en su ficha para recibir el correo, y teléfono para WhatsApp.

## Cómo personalizar el correo

1. A la izquierda elige **Cumpleaños** o **Aniversario laboral**. (El fin de contrato no se felicita: solo avisa a RH en la campana.)
2. En **Diseño** elige **Festivo** (color y confeti), **Elegante** (oscuro y dorado) o **Sencillo** (solo texto).
3. Escribe el **Asunto del correo** (hasta 150 caracteres) y el **Mensaje** (hasta 2,000). Deja una línea en blanco para separar párrafos.
4. Para poner datos de la persona, toca una variable en «Toca para insertar»: **{nombre}**, **{edad}**, **{años}**, **{área}**, **{empresa}** o **{jefe}**. Se inserta donde estaba el cursor.
5. Mira a la derecha la **vista previa** del correo; puedes verla en **Claro** o **Modo oscuro**.
6. Presiona **Enviarme una prueba** para recibirla en tu correo con el asunto «[Prueba] …».
7. Presiona **Guardar**. Verás «Cambios guardados. Las próximas felicitaciones ya los usan.».

![Editor del correo de cumpleaños con su vista previa](/ayuda/capturas/avisos/plantillas-correo.webp "Diseño, asunto, mensaje con variables y vista previa")

Mientras no guardes, el tipo dice «sin guardar» en la lista de la izquierda. Si nunca personalizas, se usa el correo de ADAMIA («Hoy se usa el correo de ADAMIA. Cuando guardes, se usará el tuyo.»). Para regresar al de ADAMIA presiona **Volver a la de ADAMIA**.

> **Ojo:** No se puede poner HTML: lo que escribas sale tal cual. Y solo existen las variables de la lista; si escribes otra verás «No existe {…}. Usa solo las de arriba.».

## Cómo elegir cómo se felicita

Debajo del mensaje hay tres opciones:

| Opción | Qué hace |
| --- | --- |
| Enviar automático por correo | El día del cumpleaños o aniversario, alrededor de las 9:05 a. m., manda el correo a la persona |
| Avisarme en la campana | 7 días antes aparece en la campana del panel para que felicites por WhatsApp tú mismo |
| Enviar automático por WhatsApp | El día del cumpleaños o aniversario manda el mensaje aprobado por WhatsApp desde el número de WhatsApp de ADAMIA |

Si marcas **Enviar automático por correo** pero la regla está apagada, verás «Hoy no sale: la regla «Felicitar cumpleaños» está apagada.» con el enlace **Ir a Reglas de aviso**.

## Los mensajes de WhatsApp

![Mensajes de WhatsApp aprobados](/ayuda/capturas/avisos/plantillas-whatsapp.webp "Los textos de WhatsApp no se pueden cambiar")

En la vista previa, pestaña **WhatsApp**, ves los mensajes que se mandan. Dice «Texto aprobado por WhatsApp; no se puede cambiar.»: los redacta ADAMIA y los aprueba WhatsApp (Meta). Al enviarse, los datos de la persona se llenan solos.

> **Importante:** WhatsApp exige que los mensajes automáticos de empresas estén aprobados por Meta. Por eso no los puedes editar. Si WhatsApp todavía no aprueba un mensaje, ese día no se manda y puedes felicitar a mano desde la campana.

**El número de notificaciones.** Los mensajes salen del número de WhatsApp de ADAMIA. Si la opción **Enviar automático por WhatsApp** aparece gris con «Falta configurar el número de notificaciones: por ahora no se puede encender.», el envío por WhatsApp todavía no está disponible en tu cuenta; mientras, usa el correo o felicita desde la campana.

## Preguntas frecuentes

### ¿Puedo tener una plantilla distinta para cumpleaños y aniversario?

Sí. Cada una se edita y se guarda por separado.

### ¿Puedo cambiar la hora de envío?

No. Los envíos automáticos salen alrededor de las 9:05 a. m. en la zona horaria de la empresa.

### ¿A dónde llega la prueba?

Al correo del usuario con el que entraste. El mensaje de éxito te dice a qué correo se mandó.

## Qué pasa si…

- **…otra persona guardó la plantilla al mismo tiempo.** Verás un aviso con el botón **Recargar**; recarga y vuelve a hacer tus cambios.
- **…no se pudo mandar la prueba.** Verás «No se pudo mandar la prueba.». Revisa tu correo y vuelve a intentarlo.
- **…un empleado entra a esta dirección.** Ve «Solo RH y el dueño editan las plantillas de felicitación.».

## Relacionado

- [Reglas de aviso](/ayuda/avisos/reglas-de-aviso)
- [Roles y permisos por módulo](/ayuda/usuarios/roles-y-permisos)
