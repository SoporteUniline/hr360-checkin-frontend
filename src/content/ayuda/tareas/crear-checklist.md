---
titulo: Cómo crear un checklist que se califica solo
resumen: Arma un checklist (apertura, cierre, limpieza…) con preguntas que valen un porcentaje, decide a quién le toca, qué días y antes de qué hora, y quién lo revisa.
modulo: tareas
audiencia: [rh, dueno]
pantallas: [/panel/checklists]
palabras: [checklist, nuevo checklist, preguntas, calificación, porcentaje, apertura, cierre, limpieza, inocuidad, peso, no aplica, foto, firma, diario, semanal]
orden: 30
actualizado: 2026-11-27
fuentes: [src/components/tareas/Checklists.jsx, src/lib/tareas/preguntas.mjs, src/lib/tareas/api.mjs]
---

## Para qué sirve

Un **checklist** es una lista de preguntas que alguien contesta cada vez que le toca (cada día que trabaja, ciertos días de la semana o una sola vez). Cada respuesta vale un porcentaje y el envío **se califica solo**.

Lo encuentras en **Checklists → Checklists**. En cada tarjeta ves cómo va hoy, por ejemplo «Hoy: 0 de 2 enviados», o «Hoy no toca».

![Lista de checklists](/ayuda/capturas/tareas/checklists.webp "Lo que se repite cada día o semana")

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

- El módulo **Tareas y checklists** debe estar activo.
- Ten tus **puestos** y **departamentos** bien capturados: se usan para asignar el checklist.

## Cómo crear el checklist

1. Toca `Nuevo checklist`.
2. En **¿Cómo quieres empezar?** toca `Empezar en blanco` o copia uno que ya tengas.
3. Escribe el **Nombre del checklist** (por ejemplo «Apertura de restaurante»).
4. Elige la **sucursal** (o **Todas**).
5. Elige la frecuencia: **Diario**, **Algunos días de la semana** (marca los días) o **Una sola vez** (elige la fecha).
6. Escribe **¿Antes de qué hora?** se debe enviar.
7. Elige **¿Quién lo revisa?**: **Su jefe inmediato**, **Recursos Humanos / el dueño** o **Nadie, se aprueba solo**.
8. Deja marcado **Solo los días que checó entrada** si solo debe contar cuando la persona trabajó.
9. En **¿A quién le toca?**, elige **Puesto**, **Persona** o **Departamento** y el valor. Usa `Agregar otro` para sumar más.
10. Agrega las preguntas (ver abajo).
11. Toca `Guardar y asignar`. Verás «“…” quedó creado y asignado.»

![Editor de un checklist nuevo](/ayuda/capturas/tareas/nuevo-checklist.webp "Preguntas, asignación y vista previa en el celular")

> **Consejo:** A la derecha tienes la **Vista previa en el celular**: contéstalo de prueba para ver la **Calificación de prueba**. Usa `Borrar respuestas de prueba` para limpiar.

## Las preguntas

En **Agregar pregunta** toca el tipo que necesitas. Los primeros seis tipos **se califican**; los demás **solo registran** información.

| Tipo | Cómo se califica |
| --- | --- |
| Sí / No | La respuesta buena vale 100 %; la otra, 0 %. |
| Una opción | Eliges una; cada opción vale un % (la ideal, 100 %). Puedes usar **opciones listas**. |
| Varias opciones | Puede elegir varias; cada una suma su %, hasta 100 %. |
| Número | Vale 100 % si está dentro del rango (mínimo, máximo y unidad). Vacío = sin límite. |
| Foto | Vale 100 % si sube la foto. |
| Estrellas | De 1 a 5; cada estrella vale 20 % (3 de 5 = 60 %). |
| Texto corto, Texto largo, Fecha, Fecha y hora, Firma | Solo se registran; no cuentan en el %. |

En cada pregunta puedes:

- Ponerle **peso** (las de más peso cuentan más en la calificación).
- Marcarla como **Obligatoria**.
- **Permite «No aplica»**: si ese día no aplica (por ejemplo, la terraza cerrada), no cuenta en la calificación.
- **Pide foto de evidencia**.
- Subirla, bajarla, duplicarla o quitarla.

## Preguntas frecuentes

### ¿Qué pasa si la persona no lo envía?

Ese día **cuenta 0 %**. Si marcaste **Solo los días que checó entrada** y ese día no checó, **no le cuenta**.

### ¿Qué pasa si edito un checklist que ya se está usando?

Los envíos anteriores conservan las preguntas y respuestas como estaban. Los cambios aplican a los nuevos.

### ¿Cómo dejo de usar un checklist?

Ábrelo y toca `Archivar`. Deja de llegarle a la gente; el historial se conserva.

## Qué pasa si…

- **…no elijo a quién le toca:** verás «Elige a quién le toca.»
- **…elijo «Algunos días de la semana» sin días:** verás «Elige qué días de la semana.»
- **…hay errores en las preguntas:** verás «Revisa lo marcado en rojo.»
- **…alguien más lo cambió mientras lo editabas:** verás un aviso para cerrar y volver a abrirlo.

## Relacionado

- [Cómo revisar checklists](/ayuda/tareas/revisar-checklists)
- [Cumplimiento de checklists](/ayuda/tareas/cumplimiento)
- [Mis tareas y checklists (para empleados)](/ayuda/tareas/mis-tareas)
