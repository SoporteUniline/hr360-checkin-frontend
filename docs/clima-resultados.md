# Clima · dashboard de resultados

Pantalla `/panel/clima` (pestaña **Resultados** de `ModuloClima.jsx`). Diseño aprobado por el dueño el 25/11/2026
(maqueta `Main.dc.html`). El servidor (`modules/clima`, ver `docs/clima-nom035.md` del backend) calcula todo; el
navegador solo lo dibuja. Gráficos en SVG/CSS, sin librerías de gráficas.

## Piezas

| Archivo | Qué hace |
|---|---|
| `src/components/clima/Tablero.jsx` | La pantalla: encabezado (medición, PDF, nueva encuesta), aviso de confianza, KPIs, dimensiones, lectura, pregunta por pregunta, participación y mapa por área, comentarios, evolución, encuestas abiertas y `extra` (Adamia AI) |
| `src/components/clima/PlanAccion.jsx` | Plan de acción: lista, agregar/editar en un diálogo, cambiar estado, eliminar (con confirmación) y el plan de la medición anterior con su seguimiento |
| `src/lib/clima/modelo.mjs` | Lógica pura: segmentos de barras, barra divergente, «vs. anterior», anillo, textos de confianza y participación, mapa por área, comentarios, línea de evolución, estados y validación del plan (`scripts/test-clima-resultados.mjs`) |
| `src/components/clima/IaResultados.jsx` | Adamia AI (`extra`): «Temas de los comentarios» y «Plan de acción sugerido» (`#adamia-plan`) |

## Qué muestra y de dónde sale (`GET /checador/clima/tablero`)

- **Aviso de confianza**: `clima.confianza` (`senal` con menos de 10 respuestas, `confiable` con 10 o más). Mismo texto que el PDF.
- **KPIs**: % favorable (`clima.favorabilidad`) con barra apilada y calificación promedio 0–10 (`clima.general`); eNPS con
  barra detractores / pasivos / promotores y personas (`enps.conteo`); anillo de participación contra la meta de 70 %;
  tarjeta NOM-035 (liga a `/panel/clima/nom035`).
- **Dimensiones**: barra apilada, % favorable, barra divergente contra el % favorable de la empresa (20 puntos llenan
  media columna; la etiqueta siempre cabe) y «vs. anterior» (`anterior.comparacion.dimensiones`, ▲ ▼ o «—» en la primera
  medición). En celular es una lista (sin tabla).
- **Lo más fuerte / Lo que pide atención**: `clima.lectura.texto` (reglas del servidor, sin IA; si todo está alto y
  parejo lo dice).
- **Pregunta por pregunta**: `clima.preguntas`, de la más favorable a la menos; se ven 8 y «Ver las N preguntas».
- **Participación por área o jefe**: `clima.participacionGrupos` (solo conteos, nunca quién falta). Si nadie tiene área:
  «Tus empleados no tienen área asignada…». Con 2 grupos o más, mapa de % favorable por grupo y dimensión (scroll dentro
  de su caja en celular).
- **Plan de acción**: `plan.acciones` (y `plan.anterior`). Responsable con el buscador `SelectorEmpleado` (fichas activas;
  el servidor valida que sean de la misma empresa). La empresa va en la URL (`?empresa=`) y el servidor la valida contra
  la sesión; el cuerpo nunca la lleva. «Se revisa sola en la próxima encuesta»: el seguimiento (`seguimiento.subio`) lo
  calcula el servidor al leer. «Sugerir acciones con Adamia AI» lleva al plan sugerido de la IA (si está el `extra`).
- **Lo que dicen**: comentarios por pregunta (2 por pregunta y «Ver los N comentarios»), sin área y en orden alfabético.
- **Evolución**: línea SVG con 2 mediciones o más de la misma plantilla (`evolucion`); con una sola, texto y sugerencia
  de repetir en 6 meses.

## Accesibilidad y celular

Gráficos con `role="img"` y `aria-label`; tablas con `caption` y encabezados; objetivos táctiles de 44 px (el `Boton` de
`ui.jsx` pasó de 40 a 44 px en todo Clima); contraste de 4.5:1 (el texto gris es `slate-600`). En celular todo se apila y
nada provoca scroll horizontal de la página.

## Verificación

- `node --test scripts/test-clima-resultados.mjs` (en la línea «Asistencias — cálculo» del CI).
- `scripts/verify-clima-dashboard.mjs` (Playwright con API simulada en `scripts/lib/clima-simulado.mjs` +
  `clima-resultados-simulado.mjs`): 1440 y 390 px, sin scroll horizontal, tablas en su caja, 44 px, contraste,
  plan de acción completo y descarga del PDF. `CAPTURAS=<carpeta>` guarda capturas.
- `scripts/verify-clima.mjs` sigue cubriendo el flujo completo de Clima y NOM-035 con el tablero nuevo.
