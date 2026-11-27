---
titulo: Cómo crear y calcular una nómina
resumen: Crea la nómina de un periodo y deja que ADAMIA la calcule con la asistencia, los bonos, los descuentos y los préstamos de cada persona.
modulo: nomina
audiencia: [rh, dueno]
pantallas: [/panel/nomina]
palabras: [nueva nómina, crear nómina, calcular nómina, periodo, semanal, quincenal, catorcenal, mensual, periodicidad, borrador]
orden: 10
actualizado: 2026-11-27
fuentes: [src/app/panel/nomina/page.jsx, src/components/nomina/ModuloNomina.jsx, src/components/nomina/comun.jsx, src/lib/nomina/nomina.mjs]
---

## Para qué sirve

Aquí empieza cada pago: eliges el periodo (por ejemplo, la semana del lunes 16 al domingo 22) y ADAMIA arma un recibo por persona con todo lo que le toca. La nómina queda en **Borrador** para que la revises antes de enviarla a autorizar.

## Quién la usa

Recursos Humanos y el dueño de la cuenta. Un usuario con acceso necesita permiso **Ver y editar** en Nómina para crearla; con permiso **Ver** solo puede consultarla.

## Antes de empezar

- El módulo Nómina debe estar encendido (**Ajustes → Módulos**).
- Revisa que cada persona tenga en su ficha, pestaña **Datos de nómina**, su periodo de pago, su sueldo y su medio de pago.
- Revisa la asistencia del periodo: las horas extra solo se pagan si están **autorizadas** en Asistencias.

## Cómo entrar a Nómina

1. En el menú lateral abre **Nómina** y elige **Nóminas**.
2. Arriba verás tres pestañas: **Nóminas**, **Bonos y descuentos** y **Préstamos**. Son las tres vistas del módulo; puedes pasar de una a otra sin salir.
3. Si manejas varias empresas, aparece el selector **Empresa** junto al botón principal. Todo lo que ves y creas es de la empresa elegida.

![Pantalla de Nóminas con totales y lista de periodos](/ayuda/capturas/nomina/nominas-lista.webp "Nóminas: totales arriba y un renglón por periodo")

Arriba tienes cuatro totales:

| Total | Qué significa |
| --- | --- |
| Por autorizar | Nóminas que RH ya envió y esperan al dueño (se pinta en ámbar si hay alguna) |
| En borrador | Nóminas que todavía se pueden editar |
| Autorizadas | Nóminas cerradas y pagadas |
| Última autorizada | Neto total de la nómina autorizada más reciente |

En la tabla cada renglón es un periodo con su **Pago** (periodicidad), **Estado**, número de **Personas**, **Neto**, cuánto va por **Transferencias** y cuánto en **Efectivo**. Haz clic en cualquier parte del renglón para abrir su detalle.

## Cómo crear una nómina nueva

1. Presiona **Nueva nómina**.
2. En **Periodicidad** elige el tipo de pago: Semanal, Catorcenal, Quincenal, Mensual, Diario o Por hora. Debajo verás el recordatorio «Entran las personas con este periodo de pago en su ficha».
3. ADAMIA te sugiere las fechas **Del** y **Al** según la periodicidad (ver la tabla de abajo). Cámbialas si tu periodo es distinto.
4. Presiona **Crear y calcular**. El botón cambia a «Calculando…» y al terminar se abre el detalle de la nómina en **Borrador**.

![Ventana Nueva nómina con periodicidad y fechas](/ayuda/capturas/nomina/nueva-nomina.webp "Elige la periodicidad; las fechas se llenan solas y las puedes cambiar")

| Periodicidad | Fechas que sugiere ADAMIA |
| --- | --- |
| Semanal | De lunes a domingo de la semana actual |
| Catorcenal | 14 días a partir del lunes de la semana actual |
| Quincenal | Del 1 al 15, o del 16 al último día del mes (según el día de hoy) |
| Mensual | Del primer al último día del mes actual |
| Por hora | De lunes a domingo de la semana actual |
| Diario | Solo el día de hoy |

> **Consejo:** Puedes tener al mismo tiempo una nómina semanal y una quincenal de las mismas fechas: cada una toma a las personas con ese periodo de pago.

## Quién entra en la nómina

ADAMIA incluye automáticamente a las personas de la empresa que:

- tienen en su ficha **el mismo periodo de pago** que elegiste;
- están **activas**, o se dieron de baja **dentro** de las fechas de la nómina (se les pagan solo sus días activos);
- **no están ya** en otra nómina vigente que se cruce con esas fechas.

Quien entra o sale a mitad del periodo aparece con un aviso como «Ingresó el 2026-11-18: se pagan solo sus días activos.».

## Qué sigue después de crearla

1. Revisa cada recibo y corrige lo necesario: [Cómo revisar y ajustar los recibos](/ayuda/nomina/revisar-y-ajustar-recibos).
2. Si cambiaste algo en Asistencias, presiona **Recalcular** en el detalle.
3. Envíala a autorizar: [Cómo autorizar la nómina y enviar los recibos](/ayuda/nomina/autorizar-y-enviar-recibos).

## Preguntas frecuentes

### ¿La nómina se timbra ante el SAT?

No. Los recibos de ADAMIA no son CFDI. Si timbras con otro sistema, usa el botón **Excel de pagos** del detalle como base.

### ¿Cuánto puede durar un periodo?

Hasta 31 días. Si eliges fechas más largas verás el mensaje «Un periodo no puede pasar de 31 días.».

### ¿Puedo crear dos nóminas iguales?

Puedes crear otra nómina con las mismas fechas, pero una persona no entra en dos nóminas vigentes que se crucen. Si cancelas una nómina, sus personas quedan libres para una nueva de esas fechas.

### ¿Qué pasa si después alguien corrige una checada?

Mientras la nómina esté en borrador, presiona **Recalcular** y se vuelve a calcular con la asistencia actual. Lo que ajustaste a mano se conserva.

### ¿Por qué el botón Nueva nómina está gris?

Todavía se está cargando la empresa de tu sesión. Espera unos segundos o recarga la página.

## Qué pasa si…

- **…nadie entra en la nómina.** El detalle muestra «Nadie entra en esta nómina. Revisa que tus empleados tengan «Semanal» como periodo de pago y que no estén ya en otra nómina de esas fechas.». Corrige las fichas y crea la nómina otra vez (o cancela la vacía).
- **…una persona no tiene horario.** Se le pagan todos sus días activos y su recibo muestra el aviso «No tiene horario: se pagaron todos sus días activos. Revísalo.».
- **…una persona no tiene sueldo o cobra por comisión.** Su recibo sale con aviso «No tiene sueldo registrado: captúralo.» o «Cobra por comisión: captura su pago.»; captura el importe a mano en su recibo.
- **…la fecha Al es anterior a Del.** El servidor responde «Revisa las fechas del periodo.».
- **…no tienes permiso.** Verás «No tienes permiso sobre esa empresa.» o el aviso de que solo puedes ver el módulo. Pídele al dueño permiso de edición en Nómina.

## Relacionado

- [Cómo calcula ADAMIA la nómina](/ayuda/nomina/como-se-calcula-la-nomina)
- [Cómo crear bonos y descuentos](/ayuda/nomina/bonos-y-descuentos)
- [Nómina: visión general](/ayuda/nomina)
- [Cómo revisar y exportar las asistencias de un periodo](/ayuda/asistencias/revisar-asistencias)
- [Cómo revisar y resolver incidencias antes de la prenómina](/ayuda/incidencias/centro-de-incidencias)
- [Cómo autorizar o no las horas extra del día](/ayuda/asistencias/autorizar-horas-extra)
