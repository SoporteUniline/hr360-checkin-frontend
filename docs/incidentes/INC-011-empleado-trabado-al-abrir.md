# INC-011 · «Entro en modo empleado y sigue súper trabada… ya funcionó después de 1 minuto» (28/11/2026)

- **Síntoma (dueño, iPhone, también como app instalada):** al abrir el modo empleado los toques en la barra de abajo no
  responden; después de un rato (≈ 1 minuto) ya funciona normal.
- **Entorno de medición:** Chromium con perfil iPhone 13, CPU ×4, build de producción
  (`NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api`), backend simulado con respuestas de 1–3 s, una que cuelga
  45 s (`resumen-semanal`) y una que falla (`cuenta-horas`, 500). Red sin límite y «Fast 3G» de DevTools (562 ms, 180 KB/s).
  **No medido en el aparato real** (Safari/WKWebView, GPU del teléfono).
- **Reproducción (RED):** `scripts/verify-empleado-rapido.mjs` con el código de `a28f253` (igual en `origin/main`
  `4ca9daf`) falla 6 de 15: el primer toque tarda **5 804 ms** en cambiar de vista, otros 318–421 ms, tareas largas de
  **4 584, 1 973 y 2 437 ms** mientras se navega, y el panel ejecuta el reconocimiento facial completo (script, modelos,
  calentamiento).

## Causa (con evidencia)

`FaceApiPreloader` (montado en `ClientProviders` para toda la app) **prepara el reconocimiento facial completo en cualquier
pantalla `/empleado/**`**, ~1.5 s después de entrar: descarga el script de face-api (600 KB) y ~7 MB de modelos, crea los
tensores y calienta la GPU (TensorFlow.js/WebGL). Esos pasos corren en el hilo principal en bloques de segundos; durante
ellos ningún toque se atiende. Medición exploratoria (script fuera del repo, CPU ×4, una corrida por caso; el RED de arriba lo confirma):

| Caso | 1.er toque → vista | Tareas largas (suma / máx.) |
|---|---|---|
| Red sin límite, código actual | 4 657 ms | 8 071 / 3 654 ms (3 654 + 1 144 + 2 219) |
| Igual, bloqueando solo `/vendor/face-api` y `/models` (control) | 211 ms | 1 004 / 456 ms |
| `origin/main` (producción), red sin límite | 4 755 ms | 8 079 / 3 544 ms |
| Segunda apertura (archivos ya bajados) | 4 386 ms | 7 248 / 3 474 ms |
| Fast 3G, código actual | 5 559 ms | 9 273 / 4 284 ms, **a los 54–64 s** |

Con red celular el modelo de huella (6.4 MB) termina de bajar a los ~55 s y en ese momento llegan los bloqueos de
4.3 + 1.2 + 2.0 s: coincide con «ya funcionó después de 1 minuto». Con los archivos ya en caché el bloqueo llega en los
primeros 2–10 s de cada apertura (la preparación vive en memoria: se repite cada vez que se abre la app).

**Descartado con evidencia:** polling (SWR pausa en segundo plano; 0 intervalos de la app vivos al medir, solo el de 1 s
de `ComidaEnCurso` cuando hay comida en curso); service worker (`offline-clock-sw.js` es de retiro y
`comunicados-push-sw.js` no intercepta `fetch`; `OfflineExperience` no está montado); scripts de terceros (Pixel solo con
consentimiento; Maps `afterInteractive`; con el rostro bloqueado queda una sola tarea larga de 456 ms en 35 s); `NATIVE_PREPAINT_SCRIPT` (una línea
síncrona); un endpoint colgado (45 s) o fallido no bloquea la navegación (Next cambia de vista sin esperar datos);
`esMovil` de INC-010 no se usa en el modo empleado. JS por ruta del empleado 104–245 KB (`/empleado/reloj-checador` 387 KB).

## Corrección

- `src/lib/faceapi-browser.js`: `descargarFaceApi()` baja el script y los pesos (leídos de cada manifiesto) a la caché del
  navegador **sin ejecutar el script ni crear tensores**, uno por uno y con `priority: "low"`; `blob()` para no copiarlos
  a la memoria de JS. Si el reconocimiento ya se está cargando, no hace nada.
- `src/lib/faceapi-preload.js`: `scheduleFaceApiPreload({ soloDescarga })`; en ese modo espera 10 s
  (`ESPERA_DESCARGA_MS`) antes de bajar, para no competir con el arranque del panel.
- `src/components/FaceApiPreloader.jsx`: en `/empleado/**` solo descarga; en `/seleccionar-reloj` (lleva directo al
  reloj) prepara completo como antes. El reloj (`RelojChecador`) y la captura de rostro (`useCapturaRostro`) siguen
  preparándolo al abrirse, con los archivos ya en caché.

## GREEN (misma máquina, build de producción)

- `verify-empleado-rapido.mjs`: 15/15 en 3 corridas. Primer toque 168–181 ms; los demás 91–159 ms; 0 tareas largas
  > 200 ms; el panel no ejecuta face-api; los 8 archivos quedan descargados; el reloj deja el rostro listo.
  (Con la descarga empezando a 1.5 s, sin la espera de 10 s, el primer toque medía 306–362 ms.)
- Medición exploratoria Fast 3G: 1.er toque 4 517 ms (el control sin rostro 4 496 ms: es la red pidiendo la pantalla),
  tareas largas 762 ms en total, máx. 249 ms (antes 9 273 / 4 284). Segunda apertura: 1.er toque 206 ms (antes 4 386),
  tareas largas 112 ms en total (antes 7 248).
- Pruebas de unidad: `test-faceapi-browser.mjs` (2 nuevas: descarga sin preparar, de uno en uno; reintento si falla) y
  `test-faceapi-preload.mjs` (modo descarga y espera de 10 s; el panel del empleado descarga, `/seleccionar-reloj`
  prepara), en la línea «Asistencias — cálculo» de `ci-dev.yml`.

## Costo conocido (decisión de producto)

El trabajo pesado no desaparece: se mueve del panel al reloj. Con CPU ×4 en el emulador, el rostro queda listo
**≈ 9.9 s** después de tocar «Checar entrada o salida» (antes: 0.3 s si el empleado llevaba 25 s en el panel; 5.3 s si
tocaba a los 2 s, con el panel trabado mientras tanto). Mientras, el reloj muestra «Preparando reconocimiento facial…»,
igual que cuando se abre directo. En el aparato real no está medido. Para quitar el costo de los dos lados habría que
llevar TensorFlow a un Web Worker (OffscreenCanvas): 💡 PROPUESTO, fuera de este cambio.

## Pendiente / no comprobado

- Aparato real (iPhone Safari / app instalada / WKWebView de Capacitor, Android): no medido. En WebKit la preparación
  puede ser más lenta o más rápida que en el emulador.
- Con Fast 3G el primer toque tarda ~4.5 s también sin rostro: Next pide la pantalla al servidor (562 ms de latencia por
  ida y vuelta). No es un bloqueo del hilo; fuera de este cambio.
- Peticiones repetidas por vista (p. ej. `/checador/vacaciones/mi-saldo` y `solicitudes-permiso` 6 veces en 45 s por el
  `refreshInterval` de 15 s): esperadas, no bloquean.

## Aprendizaje

- Lo que solo prepara otra pantalla (GPU, modelos, WASM) no se ejecuta en una pantalla de navegación: se descarga a la
  caché y se prepara en la pantalla que lo usa (mismo principio que INC-007, que solo lo había quitado del panel de RH).
- Medir el toque con el reloj de la prueba, no con `event.timeStamp` dentro de la página: con el hilo ocupado el evento
  se crea tarde y la medida interna no ve la espera (4 657 ms reales contra 312 ms «internos»).
