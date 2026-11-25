# INC-007 · «Entro al reloj checador, vuelvo a admin y se traba todo» (25/11/2026)

- **Síntoma (dueño, constante):** RH abre el reloj checador desde el panel y al volver a admin «no respondía nada, ni el
  táctil»; tuvo que reiniciar la app (Capacitor: WebView que carga `adamia.com.mx`).
- **Reproducción (RED):** `scripts/verify-reloj-salida.mjs` (Chromium con cámara falsa, backend simulado; sonda
  instalada con `addInitScript` que cuenta intervalos/timeouts/rAF, pistas de cámara, `EventSource`, `AudioContext`,
  candados de pantalla, tensores de TF y tareas largas). Con el código de `origin/dev` (b56ec23) falla en 11 vueltas:
  1. **Atrás no regresa al panel.** Botón «Reloj checador» → `/seleccionar-reloj` → `/demo`. Con «¿Sales a comer?» abierto
     y «Pantalla siempre encendida», el botón atrás (3 veces) deja la página en `/demo`: cámara viva, intervalo de
     detección de 40 ms, SSE y candado de pantalla activos. `/seleccionar-reloj` con una sola empresa hace
     `router.push(/<slug>)` solo, así que «atrás» vuelve a esa página y esta vuelve a abrir el reloj, sin fin. En la
     app el botón atrás de Android (`useNativeBackButton` → `router.back()`) hace lo mismo, y en tableta/escritorio el
     kiosco no tiene otro botón para salir: la única salida era cerrar la app.
  2. **El panel se bloquea por la preparación del rostro.** Saliendo del reloj al panel (menú del reloj → Asistencias o
     Entradas/salidas), la página sumó **1 529–1 675 ms** de tareas largas ya en el panel (3/3 vueltas de salida
     rápida; 1 569–1 632 ms con el menú). Control: el mismo panel sin pasar por el reloj suma **95–97 ms**, y bloqueando
     solo `/vendor/face-api/` la salida rápida queda en **51 ms**. Es `loadBrowserFaceApi()`: script de 600 KB, modelos y
     calentamiento de la GPU (TensorFlow.js/WebGL) que seguía corriendo después de salir, con el hilo principal ocupado
     y sin atender toques. En el escritorio de pruebas son ≈ 1.6 s; en un teléfono (GPU y CPU más lentas) es de esperar
     más, **no medido en el aparato**.
  3. Red de seguridad: un `<body>` con `pointer-events:none` + `data-scroll-locked` sin diálogo abierto se queda así al
     cambiar de pantalla del panel (el botón no recibe el toque).
- **Descartado con evidencia (mismas vueltas):** `pointer-events`/scroll-lock que deje Radix al salir (la hoja del menú
  lateral y los diálogos del reloj — que no son Radix — dejan el `<body>` en `auto` y sin `data-scroll-locked` en
  todas las vueltas, antes y después del arreglo); cámaras, intervalos rápidos, rAF, SSE, `AudioContext` y candados vivos al salir **con navegación interna**
  (todo en 0); fuga de tensores (185 constantes en 8 reentradas: son los pesos de los modelos, cargados una sola vez);
  memoria JS sin tendencia (18–89 MB). `useNativeBackButton`: `App.addListener` resuelve en microtareas, la carrera de
  limpieza no se presenta en la práctica.
- **Corrección:**
  - `src/app/seleccionar-reloj/page.jsx`: la entrada automática (una sola empresa) usa `router.replace`; al elegir de la
    lista se conserva `push` para regresar a la lista.
  - `src/lib/faceapi-browser.js`: `retenerFaceApi()`. El reloj (`[slug]/page.jsx`, `RelojChecador.jsx`) y la captura de
    rostro (`useCapturaRostro.js`) lo retienen mientras están abiertos; si alguien lo retuvo y ya nadie lo hace, la
    preparación se detiene antes del siguiente paso pesado (script, cada modelo, cada pasada de calentamiento) y sigue
    donde iba al volver a abrir el reloj, sin cargar dos veces. Sin retenciones se comporta como antes.
  - `src/components/auth/CuerpoDesbloqueado.jsx` + `src/lib/ui/cuerpoBloqueado.mjs` en `panel/layout.jsx`: al entrar al
    panel y en cada cambio de pantalla, si el `<body>` quedó bloqueado sin diálogo, hoja o menú abierto, se libera.
- **GREEN:** `verify-reloj-salida.mjs` con 8 vueltas por escenario (20 en total): vuelve al panel con atrás en 8/8, body
  `auto` sin bloqueo, el botón recibe el toque, 0 cámaras/intervalos rápidos/SSE/audio/candados, tensores 185 constantes
  y **75–119 ms** de tareas largas en el panel tras la salida rápida (límite 600). Pruebas de unidad:
  `test-faceapi-browser.mjs` (2 nuevas: se detiene sin retención y sigue al volver; salir antes de empezar no descarga
  nada) y `test-cuerpo-bloqueado.mjs` (3), ambas en la línea «Asistencias — cálculo» de `ci-dev.yml`.
- **No comprobado:** el WebView real de Android/iOS (tiempos de GPU del teléfono, botón atrás nativo, Wake Lock real).
  Solo el paso en curso al salir (una pasada de calentamiento) puede terminar ya en el panel.
- **Pendiente de negocio (💡 PROPUESTO):** el kiosco en tableta/escritorio no tiene botón visible para volver al panel
  (el menú del reloj solo aparece en celular); hoy se depende de «atrás».
- **Aprendizaje:** una página que solo redirige no debe quedar en el historial (`replace`); el trabajo pesado en segundo
  plano (GPU/TF) debe ligarse a la vida de la pantalla que lo necesita, no a la sesión.
