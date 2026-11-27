---
titulo: El reloj y la conexión a internet
resumen: El reloj checador necesita internet para registrar cada checada. Aquí ves qué pasa si se cae la conexión y qué hacer.
modulo: reloj-checador
audiencia: [rh, dueno, empleado]
pantallas: []
palabras: [sin conexión, sin internet, offline, en línea, necesitas conexión, rostro no disponible, pendiente de subir, requiere revisión, capturas en este dispositivo]
orden: 50
actualizado: 2026-11-27
fuentes: [src/lib/reloj/registrarEnLinea.mjs, src/components/RelojChecador.jsx, src/components/Clock/IndicadorConexion.jsx, src/components/Clock/LocalClockRows.jsx, src/components/Clock/ResultadoChecada.jsx, public/reloj-offline.html]
---

## Para qué sirve

Esta guía explica cómo se comporta el reloj checador cuando el aparato **pierde internet**, para que sepas qué hacer y qué decirle a tu equipo.

## Quién la usa

Recursos Humanos, el dueño y los empleados.

## Lo más importante

> **Importante:** el reloj checador **necesita internet** para registrar una checada. Sin conexión no se guarda ninguna entrada ni salida nueva.

## Cómo saber si el reloj está conectado

- En el reloj de la empresa, junto al logo verás **En línea** (punto verde) o **Sin conexión**.
- En el celular, arriba aparece el aviso **Necesitas conexión para checar**.
- En modo Rostro, sin conexión la cámara se reemplaza por «Rostro no disponible sin conexión · Restablece la conexión para registrar una checada.».
- Si alguien intenta checar sin internet verá «Necesitas conexión a internet para checar.».

## Qué hacer si se cae el internet

1. Revisa el Wi-Fi o los datos del aparato y espera a que vuelva **En línea**.
2. Mientras tanto, pide a las personas que anoten su hora de entrada o salida.
3. Cuando regrese la conexión, RH corrige esas checadas en el reloj del día con el motivo **Sin dispositivo o reloj sin conexión**. Ver [Cómo corregir la checada de un día](/ayuda/asistencias/corregir-checada-del-dia).
4. Si fue a mucha gente, usa **Cargar horario normal…** en las acciones masivas con el motivo «Falla del reloj» o «reloj sin conexión». Ver [Cómo corregir varios días a la vez](/ayuda/asistencias/acciones-masivas).

## Preguntas frecuentes

### ¿Qué son las «Capturas en este dispositivo» que veo en Entradas y salidas?

Son checadas que un aparato guardó sin internet en una versión anterior del reloj y que todavía no se confirmaron en el servidor. Se muestran con la etiqueta **Requiere revisión** y su hora original, solo en el aparato donde se guardaron. No se suman a los contadores ni a las exportaciones. Si corresponden a checadas reales, corrígelas en el reloj del día.

### ¿Qué significa «Pendiente de subir» en una confirmación?

Es una checada que el aparato no pudo confirmar con el servidor. Revisa en Entradas y salidas o en Asistencias si llegó; si no, corrígela con su motivo.

### ¿Un checador físico (ZKTeco o Hikvision) también necesita internet?

Sí: el equipo manda sus checadas a ADAMIA por internet. Ver [Checadores físicos (ZKTeco y Hikvision)](/ayuda/reloj-checador/checadores-fisicos).

## Qué pasa si…

- **…el aparato pierde internet a mitad de una checada:** si no se confirma verás un aviso; vuelve a checar cuando regrese la conexión.
- **…se cayó el internet todo un día y nadie checó:** el día puede quedar como falta automática al día siguiente. Al corregirlo con sus horas, la falta y su acta en borrador se cancelan.

## Relacionado

- [Cómo instalar el reloj checador de la empresa](/ayuda/reloj-checador/abrir-el-reloj-de-la-empresa)
- [Cómo corregir la checada de un día](/ayuda/asistencias/corregir-checada-del-dia)
- [Cómo consultar y corregir entradas y salidas](/ayuda/asistencias/entradas-y-salidas)
