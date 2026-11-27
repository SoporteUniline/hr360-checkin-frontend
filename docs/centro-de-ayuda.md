# Centro de ayuda (27/11/2026)

Manual de uso de todo ADAMIA, público en `/ayuda` (SEO) y dentro del sistema («Ayuda» en el menú del panel y en Mi
espacio, botón «?» en cada pantalla). Aprobado por el dueño el 27/11/2026. Adamia AI contesta dudas de uso con estas
guías (backend: `docs/adamia-ai.md`, «Cómo usar ADAMIA»).

## Cómo está armado

| Pieza | Dónde |
| --- | --- |
| Contenido (una carpeta por tema) | `src/content/ayuda/<carpeta>/<guia>.md` · `index.md` = portada del tema (obligatoria, `pantallas: []`; su `orden` ordena la carpeta en la portada) |
| Rutas de capacitación | `src/content/ayuda/_rutas/<slug>.md` |
| Capturas | `public/ayuda/capturas/<carpeta>/<nombre>.webp` (scripts en `scripts/capturas-ayuda/`) |
| Lectura en el build | `src/lib/ayuda/contenido.mjs` (frontmatter, Markdown, tamaño de cada captura) |
| Formato | `src/lib/ayuda/frontmatter.mjs`, `src/lib/ayuda/markdown.mjs` |
| Pintar una guía (sin HTML) | `src/components/ayuda/Markdown.jsx` |
| Páginas públicas (SSG) | `src/app/(public)/ayuda/…`: portada, `[modulo]`, `[modulo]/[guia]`, `rutas/[slug]`, `manual/[audiencia]` |
| Índice | `/ayuda/indice.json` (buscador, «Ayuda», botón «?», Adamia AI) |
| Una guía para el panel lateral | `/ayuda/<carpeta>/<guia>/contenido.json` |
| Dentro del sistema | `/panel/ayuda`, `/empleado/panel/ayuda` (`CentroAyudaApp.jsx`), botón «?» (`BotonAyuda.jsx` + `PanelAyuda.jsx`) |
| Reglas del «?» y del filtro | `src/lib/ayuda/pantallas.mjs` |
| Búsqueda | `src/lib/ayuda/buscar.mjs` (sin acentos, por inicio de palabra, raíz simple) |
| Avance y «¿Te sirvió?» | `src/lib/ayuda/progreso.mjs` (localStorage con try/catch; solo en ese navegador) |
| SEO | `src/lib/ayuda/seo.mjs`: title, description, canonical, OpenGraph; JSON-LD TechArticle, BreadcrumbList, HowTo (cada «## Cómo…» con lista numerada) y FAQPage («### ¿…?» dentro de «## Preguntas frecuentes»); `sitemap.js` |
| Impresión / PDF | `src/components/ayuda/ayuda-impresion.css` (logo, «Página X de Y», imágenes sin cortar) |
| Pruebas | `scripts/test-ayuda.mjs` (formato y vigencia) y `scripts/verify-ayuda.mjs` (navegador, 1440 y 390) |

`/capacitacion` redirige (308) a `/ayuda`. El sitio público enlaza «Centro de ayuda» en el pie.

### Qué guía abre el botón «?»
1. Las guías cuyas `pantallas` coinciden EXACTO con la ruta (los segmentos `[id]` de Next encajan con cualquier valor).
   Un segmento fijo gana a uno `[id]`: en `/panel/comunicados/nuevo` sale primero la guía de `nuevo` que la de `[id]`.
2. Si no hay, la del prefijo más largo: `/panel/nomina` cubre `/panel/nomina/5`. `/panel`, `/empleado` y
   `/empleado/panel` nunca cuentan como prefijo. Un patrón con comodín (`/panel/evaluaciones/[[...secciones]]`) cuenta
   como prefijo de sus segmentos fijos: sirve de guía «general» del módulo y pierde ante la ruta exacta
   (`/panel/evaluaciones/campanas`) y ante un prefijo más largo.
3. Empate (misma ruta): gana el `orden` más bajo. Las demás salen como «También en esta pantalla».
4. Sin ninguna: el panel abre el buscador con las guías de la sesión.

### Qué guías ve cada sesión dentro del sistema
- Audiencia: panel = `rh` + `dueno` (un usuario con acceso solo `rh`); Mi espacio = `empleado` (+ `jefe` si tiene
  equipo); administrador de ADAMIA = todas. «Todas» quita el filtro de audiencia.
- Módulos: si `modulo` es un módulo opcional de `src/lib/modulos/catalogo.mjs` y está apagado, la guía no sale. Cualquier
  otro valor (`primeros-pasos`, `clima`, `adamia-ai`, `mi-espacio`, `usuarios`, `seguridad`…) cuenta como base.
  Además, si la guía tiene `pantallas`, al menos una debe estar permitida (módulos y permisos del usuario con acceso).
- El sitio público muestra todo.

## Cómo escribir una guía

1. **Lee el código de la pantalla** (`src/app/...`, `src/components/...` y, si hace falta, el backend). Nada inventado:
   usa los textos EXACTOS de botones y campos.
2. Crea `src/content/ayuda/<carpeta>/<guia>.md` (minúsculas, números y guiones; nunca «_» en carpetas). Un archivo que
   empieza con «_» no se publica (borradores). Carpetas reservadas: `rutas`, `manual`, `buscar`, `capturas`. Cada carpeta
   lleva su `index.md` (portada: `titulo`, `resumen`, `pantallas: []`, `orden`). Antes de crear una guía, busca si ya hay
   una del mismo tema en otra carpeta: una sola guía canónica y, desde las demás, un enlace.
3. Frontmatter (YAML simple: `clave: valor` y listas `[a, b]` en UNA línea; comentario al final con « # …»):

   ```
   ---
   titulo: Cómo pedir vacaciones
   resumen: Pide días de vacaciones desde tu celular y sigue su aprobación.
   modulo: vacaciones
   audiencia: [empleado, jefe]          # rh | jefe | empleado | dueno
   pantallas: [/empleado/panel/solicitudes, /panel/vacaciones]   # [] = sin botón «?»
   palabras: [vacaciones, días, descanso, solicitud]
   orden: 10
   actualizado: 2026-11-27
   fuentes: [src/app/panel/vacaciones/page.jsx, src/app/(public)/x/page.jsx]
   ---
   ```
   Obligatorias: `titulo`, `resumen`, `modulo`, `audiencia`, `actualizado`, `fuentes`. `index.md` solo pide `titulo` y `resumen`.
   Una ruta (`_rutas/<slug>.md`) pide `titulo`, `resumen`, `audiencia` y `guias: [carpeta/guia, …]`.
4. Secciones, en este orden: `## Para qué sirve` · `## Quién la usa` · `## Antes de empezar` · una `## Cómo …` por tarea
   (lista numerada; se vuelve HowTo en Google; al menos una por guía y nunca «## Paso a paso: …») · `## Preguntas
   frecuentes` (cada una `### ¿…?`) · `## Qué pasa si…` · `## Relacionado` (enlaza las guías de otros bloques que se
   tocan: asistencias ↔ nómina, contratar ↔ inducción, ficha ↔ reloj…). Un asistente de varios pasos va como
   `## Cómo …` con la lista de pasos y cada paso en `### Paso N · …`. `resumen` de 200 caracteres como máximo.
5. **Markdown permitido (nada más; sin HTML):** `##`, `###`; párrafos; `**negritas**`, `*cursivas*`, `` `código corto` ``
   (se ve como botón); enlaces `[texto](/ayuda/carpeta/guia#ancla)`, a pantallas (`/panel/...`) o externos `https://`;
   listas `-` y `1.` con UN nivel de anidación (sangría de 2 a 5 espacios); imagen sola en su línea
   `![Descripción](/ayuda/capturas/carpeta/archivo.webp "Pie de foto")`; avisos con `> **Consejo:**`, `> **Importante:**`
   u `> **Ojo:**` (dentro solo párrafos y listas); tablas `| a | b |` con `| --- | --- |`.
   En el teléfono una tabla ancha se desliza dentro de su caja (celdas de 8rem mínimo, sin partir palabras); aun así,
   prefiere listas a tablas de 3 columnas con textos largos.
   Lo que no está en la lista se pinta como texto y `test-ayuda` lo marca como error, con el número de línea.
   El ancla de un encabezado es su texto sin acentos ni signos: «Cómo archivar un comunicado» → `#como-archivar-un-comunicado`.
6. **Capturas:** reales, del sistema con API simulada y SOLO datos de demostración («Uniline», «Laura Ríos», «Ana
   Torres», «Roberto Méndez» como dueño…). Nunca nombres de personas reales del equipo o de clientes. Copia el estilo de `scripts/capturas-ayuda/comunicados.mjs`: `levantarNext()`, `contexto()` con tu
   `manejar` y `guardar(page, carpeta, nombre, { objetivo })` (WebP calidad ~80, máx. ~200 KB; 1440×900 panel, 390×844
   celular). Corre el build antes: `NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build`, luego
   `PLAYWRIGHT_MODULE_PATH=… node scripts/capturas-ayuda/<bloque>.mjs` (`guardar(…, { recorte })` recorta un área de la
   ventana, p. ej. arriba de un mapa de Google que no carga en la prueba) y vuelve a compilar (el build guarda el ancho y alto
   de cada captura). Nunca `playwright install` en local.
7. **Nada interno en lo público:** ni variables de entorno, ni direcciones `/api/`, servidores internos, llaves o datos
   reales. `test-ayuda` lo revisa. Única excepción (estrecha y comentada en `API_PUBLICA`): la guía de Integraciones
   puede escribir la dirección base pública de la API para clientes, `https://adamia.com.mx/api/integracion/v1`, nada más.
   Describe el comportamiento actual tal cual (p. ej., el reloj necesita internet); no opines sobre fallas.
8. Corre `node --test scripts/test-ayuda.mjs`. Debe pasar sin errores; las advertencias dicen qué revisar.

## Pruebas
- `node --test scripts/test-ayuda.mjs`: unidad (formato, Markdown, «?», búsqueda, avance, imágenes, JSON-LD) y el
  contenido real: frontmatter válido, imágenes, enlaces y anclas que existen, `pantallas` en `src/app`, `fuentes` en el
  repositorio, nada interno, plantilla de secciones y **cobertura**: cada página de `/panel` y `/empleado` debe tener una
  guía (lista `EXCLUIDAS` comentada). `COBERTURA_ESTRICTA = true` (desde el 27/11/2026): una pantalla sin guía, una guía
  fuera de la plantilla (incluida una «## Cómo …» con pasos numerados), un aviso del frontmatter, una carpeta sin
  `index.md` o una ruta de capacitación con una guía que no existe rompen el CI. Vigencia: avisa (sin fallar) si un
  archivo de `fuentes` cambió (git) después de `actualizado`.
- `node scripts/verify-ayuda.mjs` (después del build): ver el encabezado del script. En el CI van después de la
  verificación de Comunicados (`.github/workflows/ci-dev.yml`).

## Pendiente
- «¿Te sirvió?» y el avance de las rutas se guardan solo en el navegador (sin servidor todavía).
