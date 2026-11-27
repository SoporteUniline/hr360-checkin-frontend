---
titulo: Seguir, recordar y cerrar una encuesta
resumen: Revisa quién ya contestó sin ver sus respuestas, manda un recordatorio, cierra la encuesta y enciende las encuestas automáticas de ciclo de vida.
modulo: clima
audiencia: [rh, dueno]
pantallas: [/panel/clima/encuestas]
palabras: [participación, recordar, cerrar encuesta, quién falta, ciclo de vida, encuesta de salida, ingreso 30 días, ingreso 90 días]
orden: 30
actualizado: 2026-11-27
fuentes: [src/components/clima/Encuestas.jsx, src/components/clima/CicloVida.jsx, src/lib/clima/inspeccion.mjs, src/lib/clima/modelo.mjs]
---

## Para qué sirve

Mientras una encuesta está abierta puedes ver cuántas personas ya contestaron y quiénes faltan (nunca qué contestaron), mandarles un recordatorio y cerrarla cuando quieras. Al cerrarla aparecen los resultados.

## Quién la usa

RH y el dueño, desde el panel.

## Antes de empezar

Entra a **Clima y NOM-035 › Encuestas y plantillas** y baja a la sección **Tus encuestas**. Cada renglón muestra el nombre, el tipo (Clima, Pulso mensual o NOM-035), las fechas, cuántos contestaron de cuántos invitados (con su porcentaje) y su estado.

![Lista Tus encuestas con una encuesta abierta y sus botones Participación, Recordar y Cerrar](/ayuda/capturas/clima/tus-encuestas.webp "Tus encuestas: avance, estado y acciones")

Los estados son:

| Estado | Qué significa |
|---|---|
| Borrador | Todavía no se lanza. Con **Continuar** terminas de configurarla. |
| Programada | Ya está lista y se abre sola en la fecha de apertura. |
| Abierta | Tu gente ya la puede contestar. |
| Cerrada | Ya no recibe respuestas y sus resultados están disponibles. |

## Cómo ver quién ya contestó

1. En la encuesta, presiona **Participación**.
2. Se abre la lista de personas con **Contestó** o **Pendiente** junto a cada nombre.

> **Importante:** Esta lista dice **quién** contestó, nunca **qué** contestó. Las respuestas no tienen nombre.

## Cómo mandar un recordatorio ahora

1. En una encuesta **Abierta**, presiona **Recordar**.
2. ADAMIA manda un correo de recordatorio solo a las personas que no han contestado y te avisa a cuántas («Recordatorio encolado para N persona(s)»).

Los recordatorios automáticos que elegiste al lanzarla salen solos; este botón es para un recordatorio extra.

## Cómo cerrar una encuesta

1. Presiona **Cerrar** (botón rojo).
2. La encuesta se cierra en ese momento y sale el aviso «Encuesta cerrada. Ya puedes ver los resultados.».
3. En el renglón aparece **Ver resultados →**, que te lleva al tablero de clima o a los resultados de la NOM-035.

> **Ojo:** Cerrar no pide confirmación y no se puede deshacer: nadie más podrá contestar.

Si no la cierras a mano, se cierra sola al terminar el día de cierre.

## Cómo encender las encuestas de ciclo de vida

Debajo de **Tus encuestas** está **Encuestas de ciclo de vida**. Son encuestas que ADAMIA manda solas por correo, con liga personal y anónimas:

| Encuesta | Cuándo se manda |
|---|---|
| Ingreso · 30 días | 30 días después de la fecha de alta. |
| Ingreso · 90 días | 90 días después de la fecha de alta. |
| Encuesta de salida | Al registrar la baja. No detiene ni cambia la baja. |

1. Activa el interruptor de la que quieras. Sale «Encendida: se mandará sola.».
2. En cada tarjeta ves cuántas preguntas tiene, cuántos minutos toma y cuántas se han enviado. Si hay una abierta, ves cuántos contestaron.

Las respuestas se juntan por trimestre y se ven al cerrar, con el plazo para contestar que indica la tarjeta.

![Tarjetas de encuestas de ciclo de vida con sus interruptores](/ayuda/capturas/clima/ciclo-vida.webp "Ingreso a 30 y 90 días y encuesta de salida")

## Preguntas frecuentes

### ¿Por qué no veo resultados de una encuesta abierta?

Porque si vieras los números en vivo junto a la lista de quién ya contestó, podrías deducir la respuesta de la última persona. Los resultados aparecen al cerrar.

### ¿El botón «Recordar» manda WhatsApp?

No: el botón manda correo. Los recordatorios automáticos sí salen por los canales que elegiste al lanzar (incluido WhatsApp).

### ¿Puedo reabrir una encuesta cerrada?

No. Lanza una nueva con la misma plantilla; el tablero la comparará contra la anterior.

## Qué pasa si…

### …presiono «Recordar» y sale un error

Solo se puede recordar una encuesta **Abierta**. Si todavía está **Programada**, espera a que abra.

### …una persona no tiene correo

No le llega el recordatorio por correo. Revisa su ficha o pídele que conteste desde la app.

### …la tarjeta de ciclo de vida no aparece

Tu empresa todavía no tiene esa actualización. Avisa a soporte de ADAMIA.

## Relacionado

- [Cómo lanzar una encuesta](/ayuda/clima/lanzar-encuesta)
- [Leer los resultados de clima](/ayuda/clima/resultados)
- [Qué es anónimo y qué no](/ayuda/clima/anonimato)
