---
titulo: Cómo crear y editar plantillas de evaluación
resumen: Usa una plantilla base o diseña la tuya con categorías, preguntas, pesos, escala y semáforo de resultados.
modulo: evaluaciones
audiencia: [rh, dueno]
pantallas: [/panel/evaluaciones/plantillas]
palabras: [plantilla de evaluación, competencias, categorías, pesos, escala, semáforo, plantillas base, duplicar, archivar]
orden: 10
actualizado: 2026-11-27
fuentes: [src/components/evaluaciones/ApiViews.jsx, src/components/evaluaciones/TemplateViews.jsx, src/components/evaluaciones/InsightViews.jsx, src/lib/evaluaciones/model.mjs]
---

## Para qué sirve

La plantilla es el formato de la evaluación: qué se evalúa (categorías o competencias), con qué preguntas, cuánto pesa cada parte y cómo se lee la calificación. La diseñas una vez y la reutilizas en cada campaña.

## Quién la usa

RH y el dueño (quien tenga permiso de administrar plantillas).

## Antes de empezar

Entra a **Evaluación de desempeño › Plantillas**.

## Cómo usar una plantilla base

ADAMIA trae cuatro plantillas base listas para usar: **Personal operativo**, **Personal administrativo**, **Ventas y atención a clientes** y **Jefes y supervisores**. Cada una tiene competencias con conductas observables, escala de 5 niveles y pesos que suman 100 %.

1. En **Plantillas base listas para usar**, revisa sus competencias. Con **Ver N preguntas** ves las conductas de cada una.
2. Presiona **Usar esta plantilla**. Se crea una copia de tu empresa («Plantilla copiada: ya puedes editarla») y se abre el editor.

![Plantillas base listas para usar con sus competencias](/ayuda/capturas/evaluaciones/plantillas-base.webp "Las cuatro plantillas base")

## Cómo crear una plantilla desde cero

1. Presiona **Nueva plantilla**.
2. En la pestaña **Contenido**, llena **Información de la plantilla**: **Nombre** (por ejemplo, «Evaluación trimestral de desempeño»), **Descripción**, y si quieres un **Área objetivo** y un **Puesto objetivo** (o «Todas» y «Todos»).
3. En cada categoría escribe su **Nombre de categoría** y su **Peso en el resultado (%)**.
4. Agrega preguntas con **Agregar pregunta**. En cada una:
   - Escribe el **Enunciado**.
   - Elige el **Tipo de respuesta**.
   - Marca **Respuesta obligatoria** si debe contestarse.
   - Marca **Aporta a la calificación** si cuenta para el resultado.
5. Agrega más categorías con **Agregar categoría**.
6. Presiona **Guardar plantilla**. Arriba verás «Cambios sin guardar» o la versión guardada.

Los tipos de respuesta son:

| Tipo | Cómo se contesta | Cómo califica |
|---|---|---|
| Escala 1 a 5 | Muy bajo, Bajo, Moderado, Alto, Muy alto. | Directo de 1 a 5. |
| Sí / No | Sí o No. | Tú defines cuántos puntos vale cada respuesta. |
| Texto abierto | Texto libre. | No califica. |
| Opción múltiple | Una de varias opciones que escribes con **Agregar opción**. | Cada opción tiene su puntuación de 1 a 5. |
| Calificación numérica | Un número entre el **Mínimo** y el **Máximo** que defines. | Se lleva a la escala de 1 a 5. |

## Cómo ajustar pesos, escala y semáforo

En la pestaña **Pesos y escala**:

1. **Peso por categoría**: los pesos deben sumar exactamente 100 %. La tarjeta dice «Listo para guardar» o «Debe sumar exactamente 100%».
2. **Peso de las preguntas**: en cada categoría elige **Todas valen lo mismo** o **Personalizar pesos** para darle más peso a alguna pregunta.
3. **Escala de calificación**: los valores 1 a 5 se mantienen para poder comparar, pero puedes cambiar el nombre y la descripción de cada nivel.
4. **Semáforo de resultados**: define los rangos (de 1.00 a 5.00, a dos decimales, sin huecos ni superposiciones) y el nombre de cada nivel. Por omisión, menos de 3 es «Requiere seguimiento».

## Cómo ver la vista previa

En la pestaña **Vista previa** ves la evaluación tal como la verá quien evalúa. Las preguntas obligatorias tienen asterisco.

## Cómo duplicar, archivar o restaurar

En la lista de plantillas:

- **Editar** abre el editor.
- **Duplicar** crea una copia para hacer una variante.
- **Archivar** la quita de la lista de disponibles. Las campañas que ya la usan conservan su versión.
- Con el filtro **Archivadas** la encuentras y la regresas con **Restaurar**.

## Preguntas frecuentes

### Si cambio una plantilla, ¿cambian las campañas que ya la usan?

No. Cada campaña congela la versión de la plantilla al lanzarse.

### ¿Puedo usar una plantilla distinta para la autoevaluación?

Sí. Al crear la campaña puedes elegir una plantilla para cada perspectiva.

### ¿Para qué sirve el área o puesto objetivo?

Para identificar para quién está pensada la plantilla. Quién se evalúa con ella lo decides en cada campaña.

## Qué pasa si…

### …no me deja guardar

Revisa que los pesos de las categorías sumen exactamente 100 % y que el semáforo no tenga huecos ni rangos encimados.

### …no veo «Nueva plantilla» ni «Usar esta plantilla»

Tu perfil solo puede consultar. Pide a RH o al dueño que te dé acceso de Recursos Humanos en [Configuración](/ayuda/evaluaciones/configuracion).

## Relacionado

- [Crear una campaña](/ayuda/evaluaciones/crear-campana)
- [Configuración de evaluaciones](/ayuda/evaluaciones/configuracion)
- [Evaluación de desempeño: visión general](/ayuda/evaluaciones)
