---
titulo: Cómo checar en el reloj de la empresa con rostro, código o QR
resumen: Paso a paso para registrar tu entrada y tu salida en el reloj de la entrada, qué significa la confirmación y qué hacer si no te reconoce.
modulo: reloj-checador
audiencia: [empleado, rh]
pantallas: []
palabras: [checar, reloj checador, entrada, salida, rostro, reconocimiento facial, código, NIP, QR, gafete, código y cara, registrar otra vez, turno abierto, salida temporal, cerrar turno]
orden: 20
actualizado: 2026-11-27
fuentes: [src/components/Clock/MetodosKiosco.jsx, src/components/Clock/TecladoCodigoCara.jsx, src/components/Clock/ResultadoChecada.jsx, src/components/RelojChecador.jsx, src/lib/reloj/confirmacion.mjs, src/lib/reloj/motivoPendiente.mjs]
---

## Para qué sirve

Con el reloj de la empresa registras tu **entrada** al llegar y tu **salida** al irte. El reloj sabe solo si te toca entrada o salida. Puedes checar de tres formas:

- **Rostro**: mirando a la cámara.
- **Código**: escribiendo tu código de empleado en el teclado.
- **QR**: acercando a la cámara el QR de tu gafete.

## Quién la usa

Todos los empleados que checan en el reloj de la entrada. RH lo instala y lo revisa.

## Antes de empezar

- Pide a Recursos Humanos tu **código** de empleado y, si checarás con rostro, registra tu rostro: [Cómo registrar tu rostro para checar](/ayuda/reloj-checador/registrar-mi-rostro).
- Tu empresa decide con qué método puedes checar. Ver [Cómo elegir la forma de checar de cada empleado](/ayuda/reloj-checador/como-checa-cada-empleado).

## Cómo checar con tu rostro

1. En el panel de la derecha deja elegido **Rostro**.
2. Acércate y mira a la cámara: pon tu cara dentro del óvalo, a un brazo de distancia.
3. Espera la confirmación verde con tu nombre.

![Reloj de la empresa en modo Rostro con el óvalo para la cara](/ayuda/capturas/reloj-checador/kiosco-rostro.webp "Pon tu cara dentro del óvalo, a un brazo de distancia")

Si no te reconoce, toca **¿No te reconoce? Usa tu código**.

## Cómo checar con tu código

1. Toca **Código**.
2. Escribe tu código con el teclado (o con el teclado del aparato). **Limpiar** borra todo y la flecha borra el último dígito.
3. Toca **Checar** (o Enter).

![Reloj de la empresa en modo Código con el teclado numérico](/ayuda/capturas/reloj-checador/kiosco-codigo.webp "Escribe tu código y toca Checar")

## Cómo checar con tu QR

1. Toca **QR**.
2. Toca **Escanear mi QR** y acerca a la cámara el QR de tu gafete.

![Reloj de la empresa en modo QR con el botón Escanear mi QR](/ayuda/capturas/reloj-checador/kiosco-qr.webp "Toca Escanear mi QR y acerca tu gafete a la cámara")

## Cómo checar con «Código y cara»

Si tu empresa te puso el método **Código y cara**, el reloj te pide las dos cosas: «Para checar, escribe tu código y después mira a la cámara.». Escribe tu código, toca **Continuar** y mira a la cámara. Así nadie puede checar por ti.

## Qué significa la confirmación

![Confirmación verde «¡Listo, Ana!» con la hora y las etiquetas A tiempo y Tu salida](/ayuda/capturas/reloj-checador/kiosco-resultado.webp "La confirmación dice qué se registró, la hora y si llegaste a tiempo")

Al checar verás «¡Listo, tu nombre!», el tipo (por ejemplo «Entrada registrada») y la hora. Debajo pueden aparecer etiquetas:

| Etiqueta | Qué significa |
|---|---|
| A tiempo | Llegaste dentro de tu horario y tolerancia |
| Entró con permiso | Llegaste tarde pero con un permiso aprobado |
| Retardo · N min | Llegaste N minutos después de tu hora más la tolerancia |
| Salió antes · N min | Saliste N minutos antes de tu hora |
| Tu salida: 6:00 p.m. | Al entrar, a qué hora es tu salida |
| Regresa a las 2:00 p.m. | Al salir a comer, a qué hora debes regresar |

## Las preguntas que te puede hacer el reloj

- **¿Sales a comer?** En tu primera salida del día: elige **Salir a comer** (tu jornada sigue abierta) o **Registrar salida**. Ver [Cómo checar tu salida a comer](/ayuda/reloj-checador/salir-a-comer).
- **¿Registrar otra vez?** Si ya checaste hace menos de 5 minutos, por ejemplo «Acabas de registrar tu salida a las 4:49 p.m. ¿Registrar otra vez?». Toca **Sí, registrar** solo si de verdad sales o regresas; si fue un doble toque, toca **No, está bien**.
- **Turno abierto** («Detectamos que ya tienes un turno en proceso. ¿Cuál es el siguiente paso?»): si tu empresa te configuró el cierre de turno **Manual**, eliges **Salida temporal** (vas a regresar), **Cerrar turno** (terminas tu jornada) o **Salir a comer**.

## Preguntas frecuentes

### ¿Cómo sabe el reloj si es entrada o salida?

Por tu último registro: si no tienes una entrada abierta, registra entrada; si la tienes, registra salida.

### Me equivoqué y checé dos veces, ¿qué hago?

Si fue dentro de 5 minutos, el reloj te pregunta y puedes decir **No, está bien**. Si ya quedó registrada, avisa a Recursos Humanos: la anulan como «Checada duplicada».

### No me reconoce con el rostro, ¿qué hago?

Usa tu código. Revisa que haya buena luz, sin lentes oscuros ni gorra. Si pasa seguido, actualiza tu rostro en **Mi espacio → Mi rostro**.

### ¿Puedo checar desde mi celular?

Si tu empresa lo permite, sí. Ver [Cómo checar desde tu celular](/ayuda/reloj-checador/checar-desde-el-celular).

## Qué pasa si…

- **…escribes un código que no existe:** el reloj no registra y muestra el motivo en un aviso.
- **…no hay internet:** el reloj no puede registrar. Ver [El reloj y la conexión a internet](/ayuda/reloj-checador/reloj-sin-conexion).
- **…el reloj no pudo guardar la checada:** verás «No se registró · avisa a RH».
- **…olvidaste checar:** pide a Recursos Humanos que la agreguen con el motivo «Olvidó checar».

## Relacionado

- [Cómo checar tu salida a comer](/ayuda/reloj-checador/salir-a-comer)
- [Cómo registrar tu rostro para checar](/ayuda/reloj-checador/registrar-mi-rostro)
- [Cómo ver mis asistencias](/ayuda/asistencias/mis-asistencias)
- [Cómo instalar el reloj checador de la empresa](/ayuda/reloj-checador/abrir-el-reloj-de-la-empresa)
