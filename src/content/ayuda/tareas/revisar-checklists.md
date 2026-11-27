---
titulo: Cómo revisar, corregir y aprobar checklists
resumen: Revisa cada checklist enviado, corrige una respuesta si hace falta (queda registrado) y apruébalo con su calificación o regrésalo con un comentario.
modulo: tareas
audiencia: [rh, dueno, jefe]
pantallas: [/panel/checklists/revisar]
palabras: [revisar checklist, aprobar, regresar, corregir respuesta, calificación, por revisar, comentario]
orden: 40
actualizado: 2026-11-27
fuentes: [src/components/tareas/Revisar.jsx, src/lib/tareas/preguntas.mjs, src/components/tareas/ModuloTareas.jsx]
---

## Para qué sirve

Cuando alguien envía un checklist que debe revisarse, aparece en **Checklists → Revisar** (con un número en la pestaña). Aquí ves cada respuesta y decides si lo apruebas o lo regresas.

![Revisar un checklist enviado](/ayuda/capturas/tareas/revisar-checklist.webp "Revisa cada respuesta y aprueba o regresa")

## Quién la usa

Quien el checklist diga en **¿Quién lo revisa?**: el jefe inmediato o Recursos Humanos / el dueño.

## Antes de empezar

- El módulo **Tareas y checklists** debe estar activo.
- Solo llegan aquí los checklists que en **¿Quién lo revisa?** tienen un revisor. Los de «Nadie, se aprueba solo» se aprueban al enviarse. Ve [Cómo crear un checklist](/ayuda/tareas/crear-checklist).
- La pestaña **Revisar** muestra un número con los envíos que esperan tu revisión.

## Cómo revisar un checklist

1. Entra a **Checklists → Revisar**.
2. A la izquierda elige el envío (checklist, persona, fecha y calificación).
3. A la derecha revisa: quién lo envió y si fue **a tiempo** o **tarde**, cada respuesta con su puntaje, las fotos y la nota de la persona.
4. Si una respuesta no corresponde (por ejemplo, la foto no coincide con lo que contestó), toca `Corregir`, elige la respuesta correcta y toca `Listo`. Con `Dejar lo que respondió` deshaces la corrección.
5. Escribe un comentario si quieres (es **obligatorio si lo regresas**).
6. Toca `Aprobar con …%` o `Regresar para corregir`.

## Cómo se ve una corrección

La calificación se recalcula con tus correcciones. Verás la nueva calificación y, tachada, la que tenía con lo que respondió la persona. **La respuesta original queda registrada.**

## Preguntas frecuentes

### ¿Qué ve la persona si lo regreso?

En su app verás que «Tu jefe lo regresó» y lo puede corregir y volver a enviar.

### ¿Los «Por revisar» cuentan en el cumplimiento?

Todavía no. Cuentan cuando se aprueban.

## Qué pasa si…

- **…no hay nada por revisar:** verás «No hay checklists por revisar. Cuando alguien envíe uno, aparece aquí.»
- **…el checklist está configurado como «Nadie, se aprueba solo»:** no aparece aquí; se aprueba al enviarse.
- **…la foto ya no se ve:** las fotos se guardan 3 meses; después solo queda la calificación.

## Relacionado

- [Cómo crear un checklist](/ayuda/tareas/crear-checklist)
- [Cumplimiento de checklists](/ayuda/tareas/cumplimiento)
