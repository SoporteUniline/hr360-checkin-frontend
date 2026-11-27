---
titulo: Cómo registrar tu rostro para checar
resumen: Registra o actualiza tu rostro con 5 fotos guiadas desde Mi espacio; RH también puede registrarlo desde la ficha o mandarte un enlace para hacerlo desde tu celular.
modulo: reloj-checador
audiencia: [empleado, jefe, rh]
pantallas: [/empleado/panel/mi-rostro]
palabras: [rostro, cara, cámara, lentes, barba, reconocimiento facial, registrar rostro, actualizar rostro, mi rostro, fotos, consentimiento, enlace, QR, continuar desde el celular, no me reconoce]
orden: 60
actualizado: 2026-11-27
fuentes: [src/app/empleado/panel/mi-rostro/page.jsx, src/app/rostro/[token]/page.jsx, src/components/rostro/CapturaGuiada.jsx, src/lib/rostro/poses.mjs, src/app/panel/empleados/tabs/TabReconocimiento.jsx, src/app/panel/empleados/tabs/RostroCelular.jsx, src/lib/rostro/enlaceCelular.mjs]
---

## Para qué sirve

Para checar con **reconocimiento facial**, el sistema necesita conocer tu rostro. Se registra una sola vez con **5 fotos guiadas** y se puede actualizar cuando quieras (por ejemplo, si cambiaste de look, usas lentes o te dejaste la barba).

## Quién la usa

- **Empleados**: desde **Mi espacio → Mi rostro**.
- **Recursos Humanos**: desde la ficha del empleado, o mandándole un enlace para que lo haga desde su celular.

## Antes de empezar

- Busca un lugar con **buena luz** y sin otras personas atrás.
- Quítate lentes oscuros y gorra.
- Permite el uso de la cámara cuando te lo pida.
- No se guarda la foto: solo se manda una **huella numérica** de tu rostro (números que describen tu cara).

## Cómo registrar tu rostro desde tu app

1. Toca **Mi espacio** (abajo a la derecha) y luego **Mi rostro**.
2. Lee **Tu consentimiento para usar tu rostro**: tu rostro es un dato biométrico sensible que tu empresa usa solo para confirmar que eres tú al checar.
3. Si estás de acuerdo, marca **Acepto, de forma expresa, que se use mi rostro para checar**.
4. Toca **Registrar mi rostro** (o **Actualizar mi rostro** si ya lo tenías).
5. Sigue las 5 indicaciones en pantalla: **Mira al frente**, **Sube un poco la cara**, **Baja un poco la cara**, **Gira un poco a tu izquierda** y **Gira un poco a tu derecha**. Las fotos se toman solas cuando estás en la posición.
6. Al terminar verás «Listo, tu rostro quedó registrado.». Ya puedes checar con él. Toca **Volver a Mi espacio**.

![Pantalla Mi rostro con el consentimiento y la casilla para aceptar](/ayuda/capturas/reloj-checador/mi-rostro-celular.webp "Antes de registrar tu rostro lees y aceptas el consentimiento")

Recursos Humanos verá un aviso de que actualizaste tu rostro.

## Cómo registrarlo con el enlace o el QR que te mandó RH

A veces RH registra tu rostro con tu celular: te muestra un **QR** o te manda un **enlace**. No necesitas iniciar sesión.

1. Escanea el QR o abre el enlace.
2. Marca la casilla del aviso y toca **Continuar a la cámara**.
3. Haz los 5 movimientos.
4. Verás «✅ Rostro correcto: quedó bien registrado». Ya puedes cerrar la página.

El enlace **dura 15 minutos** y **sirve una sola vez**. Si dice «Este enlace venció» o «Este enlace ya se usó», pide a RH que genere otro.

## Cómo lo registra Recursos Humanos

1. Abre la ficha del empleado en **Empleados**.
2. Ve a la pestaña **Checador y acceso**, sección **Reconocimiento facial**.
3. Elige una opción:
   - **Registrar rostro** con la cámara de la computadora: la persona se pone frente a la cámara y sigue las 5 posiciones.
   - **Continuar desde el celular**: se genera un enlace con su **QR**. La persona lo escanea con su celular y registra su rostro con la cámara frontal, sin iniciar sesión. También puedes copiar y compartir el enlace.
4. Mientras tanto la ficha dice «Esperando el registro…». Al terminar verás «Rostro registrado» o «Registrado desde el celular».

> **Ojo:** el enlace vence. Si dice «El enlace venció. Genera otro para continuar.», toca **Generar otro**. Primero guarda al empleado: la opción no aparece en un empleado nuevo sin guardar.

El detalle para RH (probar el rostro, consentimiento firmado y avisos de la ficha) está en [Cómo registrar el rostro de un empleado](/ayuda/empleados/rostro-del-empleado).

## Preguntas frecuentes

### ¿Es obligatorio registrar mi rostro?

No. Puedes no aceptar y checar con otro método que tu empresa te indique (código o QR), o retirar tu consentimiento después con tu empresa.

### ¿Para qué se usa mi rostro?

Solo para confirmar que eres tú al registrar tu entrada y salida. No se usa para otro fin ni se comparte con terceros ajenos al servicio.

### El reloj no me reconoce, ¿qué hago?

Usa tu código mientras tanto y vuelve a registrar tu rostro con buena luz. Si sigue fallando, avisa a Recursos Humanos: pueden probarlo desde tu ficha.

### ¿Quién puede ver mi foto?

Nadie: la foto no se guarda, solo la huella numérica de tu rostro.

### ¿Me piden firmar algo por usar mi rostro?

Tu empresa puede mandarte un **consentimiento** para firmar. No es obligatorio para checar, pero es la constancia de que aceptaste el uso de tu rostro.

## Qué pasa si…

- **…tu rostro se parece mucho al de otra persona registrada:** verás «Vuelve a tomar las fotos» con los intentos que te quedan en ese enlace.
- **…haces demasiados intentos seguidos:** verás «Demasiados intentos · Espera unos minutos e intenta de nuevo.».
- **…no se pudo guardar:** verás «No se pudo guardar tu rostro. Intenta de nuevo.».
- **…no aceptas el aviso:** el botón no se activa y no se abre la cámara. Tu empresa te indicará otra forma de checar.
- **…con el enlace se acaban los intentos:** verás «Se agotaron los intentos»; pide un enlace nuevo a RH.

## Relacionado

- [Cómo checar en el reloj de la empresa](/ayuda/reloj-checador/checar-en-el-reloj)
- [Cómo checar desde tu celular](/ayuda/reloj-checador/checar-desde-el-celular)
- [Cómo elegir la forma de checar de cada empleado](/ayuda/reloj-checador/como-checa-cada-empleado)
- [Mi firma y PIN](/ayuda/empleados/mi-firma-y-pin)
- [Cómo registrar el rostro de un empleado (para RH)](/ayuda/empleados/rostro-del-empleado)
