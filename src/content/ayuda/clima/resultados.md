---
titulo: Cómo leer los resultados de clima
resumen: Entiende el tablero de clima (% favorable, eNPS, participación, dimensiones, comentarios y evolución), descarga el informe PDF y usa la analítica.
modulo: clima
audiencia: [rh, dueno]
pantallas: [/panel/clima, /panel/clima/analitica]
palabras: [resultados clima, tablero, favorable, enps, participación, informe pdf, analítica, mapa de calor, riesgo de rotación, evolución, comentarios]
orden: 50
actualizado: 2026-11-27
fuentes: [src/components/clima/Tablero.jsx, src/components/clima/Analitica.jsx, src/components/clima/RiesgoRotacion.jsx, src/components/clima/PulsoDiarioTarjeta.jsx, src/components/clima/IaResultados.jsx, src/lib/clima/modelo.mjs]
---

## Para qué sirve

El tablero de **Resultados** resume cómo respondió tu gente en una encuesta de clima ya cerrada. Te dice qué está fuerte, qué pide atención y cómo va contra la medición anterior. Desde aquí también descargas el informe en PDF.

## Quién la usa

RH y el dueño, desde el panel.

## Antes de empezar

- Entra a **Clima y NOM-035 › Resultados**.
- Necesitas al menos una encuesta de clima **cerrada**. Mientras no la haya verás «Aún no hay resultados de clima» y el botón **Nueva encuesta**.
- Los resultados se muestran desde 1 respuesta. Lee [Qué es anónimo y qué no](/ayuda/clima/anonimato) antes de compartirlos.

![Tablero de resultados de clima con indicadores, dimensiones y plan de acción](/ayuda/capturas/clima/tablero.webp "Tablero de clima: indicadores arriba, dimensiones a la izquierda y plan a la derecha")

## Cómo elegir la medición

Arriba dice el nombre de la encuesta, cuándo cerró y contra cuál se compara. Si tienes varias mediciones cerradas, usa el selector **Medición** para ver otra.

## Cómo leer el aviso de confianza

Lo primero que ves es un aviso:

- Con menos de 10 respuestas: «lee esto como una señal, no como una medición firme». Diferencias de menos de 15 puntos pueden ser una sola persona.
- Con 10 respuestas o más: «la lectura es confiable». Aun así, fíjate en las dimensiones que se separan 10 puntos o más.

## Cómo leer los indicadores

| Indicador | Qué significa |
|---|---|
| Respuestas favorables | % de respuestas favorables en preguntas de escala (4 y 5) y de sí/no (sí). Incluye cuánto subió o bajó contra la anterior. |
| eNPS · ¿recomendarían trabajar aquí? | De −100 a +100: promotores (9 y 10) menos detractores (0 a 6). |
| Participación | Cuántos contestaron de cuántos invitados, contra la meta de 70 %. |
| NOM-035 · riesgo psicosocial | El nivel de tu última NOM-035, o «Pendiente» con el enlace para aplicarla. |

## Cómo leer las dimensiones

La tabla de dimensiones muestra, por cada tema:

- **Cómo respondieron**: una barra con favorable, neutral y desfavorable.
- **Favorable**: el % favorable del tema.
- **vs. la empresa**: si está arriba o abajo del promedio de todos los temas.
- **vs. anterior**: puntos que subió (▲) o bajó (▼) contra la medición anterior. Se llena desde la segunda medición.

Abajo, **Lo más fuerte** y **Lo que pide atención** te dicen en palabras qué temas destacan. Si todo está alto y parejo, lo dice tal cual en lugar de inventar un problema.

## Pregunta por pregunta, por área y comentarios

- **Preguntas**: de la más favorable a la menos. Toca **Ver las N preguntas** para verlas todas.
- **Por área o jefe**: participación por grupo (solo conteos, nunca quién falta) y, con 2 grupos o más, un mapa de % favorable por grupo y dimensión.
- **Comentarios**: lo que escribieron en las preguntas abiertas, sin área y en orden alfabético. Toca **Ver los N comentarios →** para verlos todos.
- **¿Cómo te fue hoy?**: si usaste ese canal, el promedio y la distribución de las caritas.
- **Evolución**: la línea de % favorable de las mediciones de la misma encuesta. En la primera medición te sugiere cuándo repetirla.

## Cómo descargar el informe PDF

Presiona **Descargar informe PDF**. Se descarga un informe con el mismo contenido del tablero (aviso de confianza, indicadores, dimensiones y plan), con el diseño de ADAMIA, listo para compartir con la dirección. El botón está gris si la medición no tiene resultados.

## Temas de los comentarios con Adamia AI

En la columna derecha, la tarjeta **Temas de los comentarios** agrupa los comentarios abiertos en temas, con un comentario representativo anonimizado. Presiona **Agrupar comentarios** (o **Volver a agrupar**). A la IA solo van textos sin nombres ni área.

## Riesgo de rotación por grupo

Debajo del tablero está **Riesgo de rotación por grupo**. Para cada área o jefe con 2 personas o más calcula un índice de 0 a 100 con sus 3 factores principales (clima del grupo, faltas, horas extra, personal con menos de 12 meses, retardos y horas por reponer) y una recomendación. Con **Agregar al plan** la recomendación pasa a tu plan de acción.

> **Consejo:** Es una señal para conversar, no una predicción. Nunca se calcula por persona.

![Tarjeta Riesgo de rotación por grupo con el índice y sus factores](/ayuda/capturas/clima/riesgo-rotacion.webp "Riesgo de rotación por grupo")

## Cómo usar la pestaña Analítica

1. Entra a **Clima y NOM-035 › Analítica**.
2. Elige la **Medición**.
3. Elige el corte: **Área** (o **Jefe directo**), **Antigüedad**, **Puesto** o **Sucursal**. Se muestra un corte a la vez.
4. Revisa el **Mapa de calor**: verde 75 % o más, amarillo 60 a 74 %, rojo menos de 60 %.
5. Revisa **Qué mueve el compromiso**: qué dimensiones se mueven junto con el eNPS. Las marcadas **Palanca** mueven mucho el compromiso y están por debajo de 70 % favorable. Correlación no es causa.
6. Presiona **Exportar CSV** para bajar el corte a una hoja de cálculo.

![Pestaña Analítica con el mapa de calor por área](/ayuda/capturas/clima/analitica.webp "Analítica: un corte a la vez")

## Preguntas frecuentes

### ¿Por qué el eNPS sale negativo?

Porque hay más detractores (0 a 6) que promotores (9 y 10). Un eNPS negativo es común; lo importante es que suba de una medición a otra.

### ¿Qué cuenta como «favorable»?

En escala 1–5, las respuestas 4 y 5. En sí/no, el «sí». Las preguntas de eNPS, opción y abiertas no cuentan para el % favorable.

### ¿Puedo ver los resultados de un área de una sola persona?

Sí, en clima se muestran desde 1 respuesta. Por eso no conviene compartir cortes muy pequeños: se podría deducir quién contestó.

## Qué pasa si…

### …dice «Sin resultados que mostrar»

La encuesta cerró sin respuestas suficientes para calcular. El aviso explica el motivo.

### …la analítica dice «Sin dato» en antigüedad, puesto o sucursal

La encuesta se lanzó antes de que ADAMIA guardara esos datos. Las siguientes ya los traen.

### …«Qué mueve el compromiso» no aparece

Se necesitan al menos 10 respuestas para calcularlo.

### …el mapa por área no aparece

Necesitas 2 grupos o más. Revisa que tus empleados tengan área o jefe en su ficha.

## Relacionado

- [Armar el plan de acción](/ayuda/clima/plan-de-accion)
- [El clima de mi equipo (jefes)](/ayuda/clima/clima-de-mi-equipo)
- [Qué es anónimo y qué no](/ayuda/clima/anonimato)
