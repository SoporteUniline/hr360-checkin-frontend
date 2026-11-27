---
titulo: Cumplimiento de checklists — el porcentaje de cada persona
resumen: Consulta qué tan bien y qué tan a tiempo cumple cada persona sus checklists en un periodo, quién gana el bono y qué preguntas fallan más; exporta a Excel.
modulo: tareas
audiencia: [rh, dueno]
pantallas: [/panel/checklists/cumplimiento]
palabras: [cumplimiento, porcentaje, bono, calificación, reporte, excel, a tiempo, tarde, sin enviar, preguntas que más fallan]
orden: 50
actualizado: 2026-11-27
fuentes: [src/components/tareas/Cumplimiento.jsx, src/lib/tareas/reglas.mjs]
---

## Para qué sirve

**Cumplimiento** resume los checklists de un periodo por persona: cuántos le tocaban, cuántos envió, cuántos a tiempo, cuántos tarde, cuántos sin enviar y su **promedio**. Sirve, por ejemplo, para decidir **bonos**.

Lo encuentras en **Checklists → Cumplimiento**.

![Cumplimiento por persona y preguntas que más fallan](/ayuda/capturas/tareas/cumplimiento.webp "Porcentaje de cada persona en el periodo")

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

- El módulo **Tareas y checklists** debe estar activo y tu gente debe tener checklists asignados. Ve [Cómo crear un checklist](/ayuda/tareas/crear-checklist).
- Los envíos **por revisar** no cuentan hasta que se aprueban: revísalos primero en [Revisar](/ayuda/tareas/revisar-checklists).

## Cómo revisar el cumplimiento

1. Elige el periodo (por ejemplo **Esta quincena**).
2. Filtra por checklist (o **Todos los checklists**) y por sucursal (o **Todas las sucursales**).
3. Escribe el **Porcentaje mínimo para el bono**. La columna **Bono** dice **Gana** o **No**.
4. Revisa la tabla: Persona, Cumplimiento, Enviados, A tiempo, Tarde, Sin enviar, Por revisar y Bono.
5. Toca `Exportar a Excel` para descargarla.

## Preguntas que más fallan

Abajo verás el promedio de cada pregunta en los checklists revisados del periodo: **dónde está el problema**. Muestra la pregunta, el checklist, el promedio, cuántas veces se contestó y qué porcentaje salió mal. Toca `Exportar preguntas` para descargarla.

## Cómo se calcula

- Un checklist **sin enviar** cuenta **0 %**.
- Los **por revisar** todavía **no cuentan** en el promedio.
- Si el checklist es «Solo los días que checó entrada», los días que la persona no checó **no le cuentan**.

## Preguntas frecuentes

### ¿El bono se paga solo en nómina?

No. Cumplimiento te dice quién llega al mínimo; el pago lo decides y registras tú.

## Qué pasa si…

- **…no hay checklists en el periodo:** verás «Aún no hay checklists en este periodo.»
- **…no se puede cargar:** verás «No se pudo cargar el cumplimiento.» Intenta de nuevo.

## Relacionado

- [Cómo crear un checklist](/ayuda/tareas/crear-checklist)
- [Cómo revisar checklists](/ayuda/tareas/revisar-checklists)
