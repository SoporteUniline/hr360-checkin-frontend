# INC-009 · «No se pudo guardar la portada.» al subir una foto del celular (27/11/2026)

- **Síntoma:** en producción, al subir la portada del muro (`EditorPortada.jsx` → `PUT /api/checador/comunicados/portada`)
  con una foto del celular, el usuario vio «No se pudo guardar la portada.».
- **Causa, comprobada:**
  1. nginx de producción corta cualquier petición de más de 1 MB con un **413 en HTML** (probado: 900 KB pasa, 1.1 MB →
     413). La petición nunca llega al backend (que acepta hasta 8 MB por foto). Las fotos de celular pesan de 2 a 5 MB.
  2. `errorDe` (`src/lib/comunicados/comunicados.mjs`) solo entiende JSON (`mensaje` / `error`); con un cuerpo HTML cae
     en el mensaje por defecto. Lo mismo pasaba en los `errorDe` de Inducción, Clima, Tareas, Mi cuenta, etc.
  3. Las fotos se subían tal cual (4000×3000, EXIF con GPS): no había conversión previa salvo en Tareas (JPEG 1600 px) y
     Activos (WebP 1000 px), cada una con su propio código.
- **RED:** `errorDe({ response: { status: 413, data: "<html>413</html>" } }, "No se pudo guardar la portada.")` con el
  código anterior → «No se pudo guardar la portada.» (comprobado). En el navegador, la portada mandaba el JPEG original.
- **Corrección (aprobada por el dueño: «que la foto se convierta a web inmediatamente, todo»):**
  - `src/lib/imagenes/aWeb.mjs` (puro) + `lienzo.mjs` (navegador) + `usePrepararFoto.js`: al ELEGIR la foto se endereza
    (EXIF), se reduce por uso y se exporta a WebP 0.82 (JPEG/PNG de respaldo), < 900 KB por pasos. Aplicada en todas
    las subidas de fotos (lista y exclusiones en `docs/fotos-web.md`).
  - `src/lib/errorSubida.mjs`: un 413 sin JSON → «El archivo pesa demasiado para subirlo. Prueba con uno más ligero.»,
    en el interceptor de `lib/axios.js` (todas las pantallas) y explícito en los `errorDe` de Comunicados, Inducción
    (pública), Clima, Tareas, Postular y el formulario de entrevista.
- **GREEN:** `scripts/test-fotos-web.mjs` 17/17; `scripts/verify-fotos-web.mjs` (Chromium, 1440 y 390): JPEG 4000×3000
  de 5,347 KB con EXIF «girar 90°» → WebP 1500×2000 de 571 KB en la petición, sin EXIF; 413 en HTML → mensaje nuevo;
  HEIC que Chromium no abre → aviso. `verify-comunicados` (fotos y portada salen `.webp`) y `verify-induccion` (foto del
  documento sale `.webp`; el fixture era un JPEG falso de 7 bytes) ajustados y en verde; también `verify-mi-cuenta`,
  `verify-popups`, `verify-clima-inspeccion`, `verify-bolsa`, `verify-whatsapp-vacante`, `verify-activos`.
  `verify-tareas-real` (backend y MariaDB reales) pasa la foto de evidencia convertida y se detiene después, en la firma
  dibujada («Firmar dibujando», código no tocado); `verify-whatsapp` se detiene en la línea 905 (diálogo «Entrevista por
  WhatsApp»), antes de los adjuntos: ninguno de los dos se debe a este cambio, pero no quedaron verificados de punta a punta.
- **Defecto propio encontrado en la verificación (antes de entregar):** la prueba de «¿el navegador codifica WebP?»
  usaba un `OffscreenCanvas` sin contexto → `InvalidStateError` → siempre JPEG. Lo detectó `verify-fotos-web.mjs`
  (la vista previa salía `image/jpeg`); corregido en `lienzo.mjs` y en verde.
- **No comprobado:** Safari/iPhone real (respaldo JPEG, HEIC nativo), Android real, el WebView de la app; el 413 cuando
  el API es de OTRO origen (sin cabeceras CORS el navegador lo reporta como «Sin conexión»; en producción frontend y API
  comparten dominio).
- **Pendiente externo:** Luis sube `client_max_body_size` a 25M. Hasta entonces, una publicación con VARIAS fotos
  (cada una < 900 KB) puede pasar de 1 MB en total y recibir el 413 (ahora con el mensaje claro).
- **Aprendizaje:** un error de infraestructura (proxy) no trae el formato del backend: los `errorDe` deben tener un caso
  para respuestas sin JSON, y las fotos se preparan en el cliente con UNA utilidad, no una por pantalla.
