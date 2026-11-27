---
titulo: Cómo crear y lanzar una campaña de evaluación
resumen: En cuatro pasos define la campaña, las perspectivas (180°, 270°, 360°), quién evalúa a quién, la confidencialidad, las fechas y qué verá cada persona.
modulo: evaluaciones
audiencia: [rh, dueno]
pantallas: [/panel/evaluaciones/campanas/nueva, /panel/evaluaciones/campanas]
palabras: [campaña de evaluación, nueva evaluación, perspectivas, 180, 270, 360, autoevaluación, pares, asignaciones, recordatorios, iniciar campaña]
orden: 20
actualizado: 2026-11-27
fuentes: [src/components/evaluaciones/CampaignViews.jsx, src/components/evaluaciones/ApiViews.jsx, src/lib/evaluaciones/model.mjs]
---

## Para qué sirve

Una **campaña** es una ronda de evaluación: quiénes se evalúan, con qué plantilla, quién evalúa a quién y en qué fechas. Al iniciarla, ADAMIA les avisa a los evaluadores y les manda recordatorios.

## Quién la usa

Solo RH (y el dueño) puede programar campañas.

## Antes de empezar

- Necesitas al menos una plantilla. Si no tienes, verás «Primero crea una plantilla» con el botón **Crear plantilla**. Ver [Plantillas](/ayuda/evaluaciones/plantillas).
- Revisa que tus empleados tengan **jefe inmediato** en su ficha: con eso ADAMIA propone las asignaciones.
- Entra a **Evaluación de desempeño › Campañas** y presiona **Nueva evaluación**. Se abre un asistente de cuatro pasos. Puedes guardar un borrador en cualquier momento con **Guardar borrador**.

## Cómo crear una campaña

El asistente tiene cuatro pasos:

1. **Campaña y formato**: nombre, instrucciones, plantilla y periodo evaluado.
2. **Participantes y modelo**: perspectivas, pesos y personas evaluadas.
3. **Quién evalúa a quién**: la matriz de asignaciones.
4. **Revisar y programar**: confidencialidad, fechas, publicación y **Iniciar campaña**.

Cada paso, en detalle:

### Paso 1 · Campaña y formato

1. Escribe el **Nombre de la campaña** (por ejemplo, «Desempeño · Cuarto trimestre 2026»).
2. Escribe las **Instrucciones para los evaluadores**.
3. Elige la **Plantilla principal**.
4. Elige el **Inicio del periodo evaluado** y el **Fin del periodo evaluado**: el tiempo que se está evaluando.

![Asistente Nueva evaluación en el paso Campaña y formato](/ayuda/capturas/evaluaciones/nueva-campana.webp "Paso 1 · Campaña y formato")

### Paso 2 · Participantes y modelo

1. En **¿Qué perspectivas quieres incluir?** elige un modelo. Cada uno trae pesos iniciales:

| Modelo | Quién evalúa y con qué peso |
|---|---|
| Descendente | Jefe 100 % |
| Ascendente | Colaboradores 100 % |
| Horizontal | Pares 100 % |
| Autoevaluación | La misma persona 100 % |
| 180° | Jefe 80 % + autoevaluación 20 % |
| 270° | Jefe 50 % + pares 30 % + autoevaluación 20 % |
| 360° | Jefe 40 % + colaboradores 25 % + pares 25 % + autoevaluación 10 % |
| Personalizada | Tú eliges las perspectivas, incluida RH |

2. Ajusta el **peso (%)** de cada perspectiva y, si quieres, una **Plantilla para esta perspectiva** distinta.
3. En **Selecciona a las personas evaluadas** busca por colaborador o puesto, filtra por área o puesto y marca a cada persona. **Seleccionar filtrados** marca a todos los que ves y **Limpiar selección** quita todo. La tabla muestra el jefe directo de cada quien.

> **Consejo:** Los modelos son formatos iniciales. Revisa siempre las relaciones y sus pesos.

### Paso 3 · Quién evalúa a quién

1. Presiona **Proponer asignaciones**. ADAMIA arma la matriz con el organigrama real (jefe, pares, colaboradores y autoevaluación).
2. Revisa la **Matriz de asignaciones**: evaluado, evaluador y relación. Filtra por **Persona evaluada** si son muchas.
3. Quita una asignación con su botón, o agrega una en **Agregar evaluador**: elige al colaborador evaluado, la perspectiva y al evaluador (o un usuario de RH), y presiona **Agregar asignación**.

Si cambias participantes o perspectivas, vuelve a presionar **Proponer asignaciones**.

### Paso 4 · Revisar y programar

1. **Confidencialidad de la campaña**: marca **Agrupar resultados de pares** y **Agrupar resultados ascendentes** para ocultar autores y resultados individuales de esas perspectivas, y elige el **Mínimo de respuestas por grupo confidencial**.
2. **Fechas y recordatorios**: elige **Disponible desde**, **Fecha límite para responder** y la **Zona horaria**. En **Recordatorios automáticos** marca 7 días antes, 3 días antes, 1 día antes o el día del cierre. En **Repetir campaña** elige No repetir, Cada trimestre, Cada mes o Cada año.
3. **Publicación y acceso**: decide si se **Requiere aprobación de RH** antes de publicar, qué puede ver el colaborador (su calificación, categorías, comentarios y plan), si el **Jefe puede consultar resultados publicados** y si se **Solicita confirmación de recibido**.
4. Revisa el **Resumen de la campaña**.
5. Presiona **Iniciar campaña** y confirma. Se fijan las plantillas, los pesos y las asignaciones. Si la fecha de inicio es futura, la campaña queda **Programada**.

## Preguntas frecuentes

### ¿Puedo editar una campaña después de iniciarla?

No en lo esencial: al iniciarla se fijan plantillas, pesos y asignaciones. Lo que sí puedes hacer es ampliar el plazo, recordar pendientes o cerrarla. Ver [Seguir y cerrar una campaña](/ayuda/evaluaciones/seguimiento-campana).

### ¿Qué hace «Agrupar resultados de pares»?

Oculta quién de los pares dijo qué. Si un grupo tiene menos respuestas que el mínimo, esa perspectiva no aporta promedio ni comentarios al resultado, para que no se pueda saber quién fue.

### ¿Cómo se repite una campaña cada año?

En **Repetir campaña** elige **Cada año**. Los recordatorios y las campañas recurrentes los programa el servidor.

## Qué pasa si…

### …al iniciar sale un error de validación

ADAMIA revisa la campaña antes de iniciarla y te muestra qué falta (por ejemplo, pesos que no suman 100 % o personas sin evaluador). Corrige y vuelve a presionar **Iniciar campaña**.

### …una persona no tiene jefe directo

En la tabla aparece «Sin jefe directo» y no se le propone evaluador de esa perspectiva. Asígnale uno en **Agregar evaluador** o corrige su ficha.

### …abro una campaña que ya no es borrador

Verás «La campaña no es un borrador editable» con el enlace **Ver campañas**.

## Relacionado

- [Plantillas de evaluación](/ayuda/evaluaciones/plantillas)
- [Seguir y cerrar una campaña](/ayuda/evaluaciones/seguimiento-campana)
- [Configuración de evaluaciones](/ayuda/evaluaciones/configuracion)
