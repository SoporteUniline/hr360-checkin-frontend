---
titulo: Cómo registrar el rostro de un empleado
resumen: Registra el rostro con la cámara de la computadora o desde el celular de la persona con un QR, pruébalo y genera su consentimiento para el uso del rostro.
modulo: empleados
audiencia: [rh, dueno]
pantallas: [/panel/empleados]
palabras: [rostro, cara, reconocimiento facial, foto, qr, celular, consentimiento, biométrico, probar rostro, no me reconoce]
orden: 60
actualizado: 2026-11-27
fuentes: [src/app/panel/empleados/tabs/TabReconocimiento.jsx, src/app/panel/empleados/tabs/RostroCelular.jsx, src/app/panel/empleados/tabs/ProbarRostro.jsx, src/app/panel/empleados/tabs/RostroRhResumen.jsx, src/app/panel/empleados/tabs/ConsentimientoRostro.jsx, src/app/panel/empleados/tabs/AvisoRostroApp.jsx, src/lib/legal/consentimientoRostro.mjs]
---

## Para qué sirve

Si tu empresa checa con **Facial**, **Ambos** o **Código y cara**, el reloj necesita conocer el rostro de cada persona. Aquí lo registras, lo pruebas y dejas constancia de que la persona aceptó el uso de su rostro.

> **Importante:** El sistema guarda solo el **patrón numérico** del rostro, no la foto.

## Quién la usa

Recursos Humanos y el dueño. La persona también puede registrarlo ella misma desde su app: ve [Mi rostro](/ayuda/reloj-checador/registrar-mi-rostro).

## Antes de empezar

- Busca un lugar con **buena luz** y **sin otras personas atrás**.
- Para usar la cámara de la computadora, el navegador te pedirá permiso: acéptalo.
- Para el registro desde el celular, primero **guarda** al empleado.

## Dónde está

Abre la ficha → pestaña **Checador y acceso** → bloque **Reconocimiento facial** (a la derecha). Arriba verás el estado: **Sin rostro**, **Rostro registrado**, **Fotos tomadas: falta guardar** o **Registrado desde el celular**.

![Bloques de rostro, firma y PIN en la ficha del empleado](/ayuda/capturas/empleados/ficha-rostro-firma-pin.webp "Consentimiento, Firma y PIN y Reconocimiento facial")

## Cómo registrarlo con la cámara de la computadora

1. Toca `Registrar rostro` (o `Volver a registrar` si ya tenía).
2. Pide a la persona que siga las indicaciones: mirar al frente, subir y bajar un poco la cara y girarla un poco a cada lado. **Las 5 fotos se toman solas.**
3. Cuando termine verás «5 fotos tomadas. Se guardan al guardar la ficha.»
4. Toca `Guardar` en la ficha. Sin este paso, el rostro **no** se guarda.

## Cómo registrarlo desde el celular de la persona (QR)

Es lo más fácil cuando la cámara de la computadora no ayuda.

1. Toca `Continuar desde el celular`.
2. Aparece un **QR** y el enlace. La persona escanea el QR con su celular (o le compartes el enlace con `Copiar`).
3. En su celular acepta el aviso de uso del rostro, toca `Continuar a la cámara` y sigue los 5 movimientos.
4. En la computadora verás «Esperando el registro…» y, cuando termine, el aviso «Listo, el rostro de … quedó registrado desde el celular.» **No necesitas guardar la ficha**: se guarda directo.

> **Ojo:** El enlace **vence en 15 minutos** y **sirve una sola vez**. Si vence, toca `Generar otro`. Generar uno nuevo anula el anterior.

## Cómo probar el rostro

1. Con el rostro ya guardado, toca `Probar rostro`.
2. La persona mira a la cámara. ADAMIA lo compara con el rostro guardado usando **la misma regla del checador**.
3. Toca `Probar otra vez` si quieres repetir, o `Cerrar`.

Es solo una prueba: **no se guarda nada**. Se compara con el rostro guardado, no con fotos que aún no guardas.

Debajo verás **Fotos registradas** y **Últimos intentos que no lo reconocieron**. Si dice que se registró con una sola foto, vuelve a registrarlo con las 5 posiciones: lo reconocerá mejor.

## Cómo pedir el consentimiento del rostro

El rostro es un **dato sensible**. El consentimiento **no es obligatorio para checar**, pero es la constancia de que la persona lo aceptó.

1. En el bloque **Consentimiento del rostro**, toca `Generar consentimiento para firmar`.
2. Elige cómo hacerle llegar el documento: `Copiar enlace`, `Firmar aquí` (si la persona está contigo) o `Enviar por WhatsApp`.
3. El estado cambia a **Esperando firma** y, cuando firme, a **Firmado** con la fecha. Desde ahí puedes abrir el documento firmado.

## Avisos que verás en la ficha

Si la persona actualizó su rostro **desde su app** o con el enlace del celular, aparece un aviso amarillo «Nuevo: la persona actualizó su rostro…» con la fecha y la versión del aviso que aceptó. Al abrir la ficha, el aviso queda como visto.

## Preguntas frecuentes

### ¿Qué hago si el reloj no reconoce a alguien?

Usa `Probar rostro`. Si falla, vuelve a registrarlo con buena luz (o desde su celular) y guarda. También puede actualizarlo él mismo desde **Mi espacio → Mi rostro**.

### ¿El rostro se manda solo a los relojes?

Los relojes toman el rostro guardado cuando piden sus datos de reconocimiento. No necesitas sincronizar.

### ¿Puedo registrar el rostro de alguien dado de baja?

No con el enlace del celular: solo para personas activas.

## Qué pasa si…

- **…aparece que el rostro se parece mucho al de otra persona:** el sistema no lo guarda y te pide repetir. Revisa que sea la persona correcta y que no haya alguien más en la toma.
- **…aparece «Continuar desde el celular aún no está disponible»:** tu sistema necesita una actualización; mientras tanto, usa la cámara de la computadora.
- **…salgo de la pestaña con la cámara prendida:** la cámara se apaga sola.
- **…tomo las fotos pero no guardo la ficha:** el rostro no se guarda. Antes de salir, el sistema te avisa que hay cambios sin guardar.

## Relacionado

- [Mi rostro (para empleados)](/ayuda/reloj-checador/registrar-mi-rostro)
- [La ficha del empleado y sus 5 pestañas](/ayuda/empleados/ficha-del-empleado)
- [Firma y PIN del empleado: qué puede hacer RH](/ayuda/empleados/firma-y-pin-del-empleado)
- [Cómo elegir la forma de checar de cada empleado](/ayuda/reloj-checador/como-checa-cada-empleado)
