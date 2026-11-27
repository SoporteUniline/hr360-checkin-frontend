---
titulo: Cómo lanzar una encuesta de clima
resumen: Elige quién contesta, las fechas, los recordatorios y los canales (app, correo, WhatsApp o al checar salida) y programa la encuesta.
modulo: clima
audiencia: [rh, dueno]
pantallas: [/panel/clima/encuestas/lanzar]
palabras: [lanzar encuesta, programar, destinatarios, recordatorio, whatsapp, correo, liga personal, canales, cómo te fue hoy]
orden: 20
actualizado: 2026-11-27
fuentes: [src/components/clima/Lanzar.jsx, src/lib/clima/canales.mjs, src/lib/clima/modelo.mjs]
---

## Para qué sirve

En esta pantalla decides **a quién** le llega la encuesta, **cuándo** abre y cierra, **qué recordatorios** salen y **por dónde** le llega a cada persona. Al presionar **Programar encuesta** las preguntas quedan fijas y empieza a llegarle a tu gente.

## Quién la usa

RH y el dueño, desde el panel.

## Antes de empezar

- Llegas aquí desde el editor con **Siguiente: lanzar →**, desde **Aplicar NOM-035**, o con **Continuar** en una encuesta en borrador de **Tus encuestas**.
- Revisa que tus empleados tengan **área**, **puesto** y **jefe inmediato** en su ficha: con eso se filtran los destinatarios y se agrupan los resultados.
- Para WhatsApp, la ficha debe tener un teléfono celular válido.

![Pantalla para lanzar una encuesta con los pasos quién contesta, cuándo y por dónde](/ayuda/capturas/clima/lanzar.webp "Lanzar «Clima general»: tres pasos y la barra de abajo con el total de personas")

## Paso 1 · ¿Quién contesta?

Elige una de tres opciones:

- **Toda la empresa**: todas las personas activas.
- **Por área o puesto**: toca las **Áreas** y los **Puestos** que quieras y, si quieres, una **Antigüedad** (cualquier antigüedad, menos de 3 meses, menos de 6 meses, de 6 a 12 meses, de 1 a 3 años o más de 3 años).
- **Personas específicas**: busca por nombre y marca a cada persona.

Abajo verás un resumen de tu selección y cuántas personas la recibirán. El número se recalcula cada vez que cambias algo.

> **Ojo:** Si eliges grupos pequeños, aparece un aviso en ámbar: «Equipos pequeños (…): las respuestas no llevan nombre, pero RH podría deducir quién contestó». En la NOM-035 el aviso dice que las áreas con menos de 5 personas se verán solo juntas.

## Paso 2 · ¿Cuándo?

1. **Abre**: el día en que empieza (por omisión, hoy).
2. **Cierra**: el último día para contestar (por omisión, 10 días después). No puede ser antes del día que abre.
3. **Recordatorios**: elige hasta 3 de estos botones: **El día del cierre**, **1 día antes**, **2 días antes**, **3 días antes**, **5 días antes** o **7 días antes**. Vienen marcados 3 días antes y 1 día antes.

Debajo te dice qué días saldrán («Saldrán: 17/11, 19/11…»). Los recordatorios **solo les llegan a quienes no han contestado**, por los mismos canales que elegiste.

> **Consejo:** Un recordatorio que cae el mismo día que abre (o antes) no se manda. La pantalla te lo avisa: «cae el día que abre o antes, no se manda».

Si tu empresa todavía no tiene la actualización de canales, en lugar de los botones verás un solo campo **Recordatorio** con opciones como «A los 3 días, a quien no ha contestado».

## Paso 3 · ¿Por dónde les llega?

![Canales de la encuesta: app del empleado, correo, WhatsApp y al checar salida](/ayuda/capturas/clima/lanzar-canales.webp "Los cuatro canales; WhatsApp manda una liga personal")

| Canal | Qué hace |
|---|---|
| App del empleado | La encuesta aparece en «Encuestas» de su espacio y en su Inicio. Viene encendido. |
| Correo | Manda la invitación y los recordatorios **sin liga personal**: la persona entra a ADAMIA con su cuenta para contestar. Viene encendido. |
| WhatsApp | Manda la invitación y los recordatorios con su **liga personal**, que se abre sin contraseña. Se contesta solo en la liga; nada se guarda en el chat. |
| Al checar salida (app del empleado) | Después de checar su salida, la persona ve en su Inicio la pregunta de un toque «¿Cómo te fue hoy?», anónima y opcional. Solo para encuestas de clima. El reloj compartido no cambia. |

Sobre WhatsApp:

- Si WhatsApp todavía no está configurado, la pantalla dice «WhatsApp aún no está configurado: mientras tanto se manda por correo».
- Si una persona no tiene teléfono o el mensaje no se puede entregar, se le manda por correo.
- Los mensajes de WhatsApp salen de 9:00 a 21:00 (hora de tu empresa).

## Paso 4 · Programar

Abajo verás una barra con el total de personas, el número de preguntas y si es anónima. Presiona **Programar encuesta**.

- Sale el aviso «Encuesta programada para N personas» y regresas a **Encuestas y plantillas**.
- Si la fecha de apertura es hoy, la encuesta queda **Abierta**; si es una fecha futura, queda **Programada** y se abre sola ese día.

## Preguntas frecuentes

### ¿Puedo cambiar las preguntas después de programarla?

No. Al programarla, las preguntas se congelan para que todos contesten lo mismo. Si necesitas cambiarlas, edita la plantilla y lanza una encuesta nueva.

### ¿Cuál es la liga personal?

Es una dirección única para cada persona, que le llega por WhatsApp. Le permite contestar sin escribir su contraseña. La liga sirve para saber que ya contestó, pero nunca se guarda junto con sus respuestas. Lee más en [Qué es anónimo y qué no](/ayuda/clima/anonimato).

### ¿Puedo mandar la encuesta solo por WhatsApp?

Sí: deja encendido solo WhatsApp. Las personas sin teléfono la recibirán por correo.

### ¿La pregunta «¿Cómo te fue hoy?» detiene la checada?

No. Aparece en el Inicio de la app del empleado después de checar, es de un toque y se puede saltar. Si algo falla, simplemente no aparece.

## Qué pasa si…

### …el botón «Programar encuesta» está gris

Tu selección tiene 0 personas. Cambia los filtros o elige a alguien.

### …abro una encuesta que ya se lanzó

Verás «Esta encuesta ya se lanzó» con un enlace para ir a **Encuestas y plantillas**, donde puedes seguir su avance.

### …el canal WhatsApp dice «No disponible»

Tu empresa no tiene lista la actualización de canales. Usa la app y el correo, o avisa a soporte.

### …la programo y sale un aviso en amarillo

La encuesta sí se programó, pero el sistema te dejó una nota (por ejemplo, sobre los canales). Léela antes de cerrarla.

## Relacionado

- [Seguir, recordar y cerrar una encuesta](/ayuda/clima/seguir-y-cerrar-encuesta)
- [Cómo contestar una encuesta](/ayuda/clima/contestar-encuesta)
- [Qué es anónimo y qué no](/ayuda/clima/anonimato)
