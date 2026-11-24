# Rostro con varias fotos guiadas y «Código y cara» (frontend, 24/11/2026)

Lo aprobó el dueño el 24/11/2026. El backend está en `hr360-checkin-backend/docs/rostro-referencias.md`.

## Registro guiado en 5 poses

Los tres caminos de registro usan la misma captura:

- la ficha de RH (pestaña «Checador y acceso»);
- Mi espacio → Mi rostro;
- la página del celular que abre el QR (`/rostro/[token]`).

La captura pide cinco posiciones: «Mira al frente», «Sube un poco la cara», «Baja un poco la cara», «Gira un poco a tu izquierda» y «Gira un poco a tu derecha». Cada foto se toma sola cuando la persona:

- está en la pose;
- está quieta durante 3 cuadros seguidos que se parecen entre sí;
- tiene buena luz y la cara dentro del óvalo.

| Pieza | Qué hace |
|---|---|
| `src/lib/rostro/poses.mjs` | Regla pura. Estima la pose con los 68 puntos de la cara: el giro sale de la nariz respecto a los ojos y a la mandíbula; arriba y abajo, de la nariz respecto a los ojos y a la boca, medido contra la foto de frente de la misma persona. También decide cuándo se toma la foto, cuándo hay que girar menos y cuándo las fotos no son de la misma persona (coseno menor que 0.85 contra «frente»), y permite saltar una pose tras 12 s, siempre que queden al menos 3. |
| `src/components/rostro/useCapturaRostro.js` | Contiene `registrarGuiado(guardar, textoError)`. Si al guardar hay un error, por ejemplo un 409, el aviso queda visible y las fotos se vuelven a tomar. Usa el **mismo detector rápido que el reloj al checar** (`opcionesRapidas`). |
| `src/components/rostro/CapturaGuiada.jsx` | La vista: cámara en espejo, flecha de dirección, «2 de 5», avance de las poses y los botones Cancelar, Reintentar y «Saltar este paso». |

Lo que se manda al servidor:

- **Mi rostro:** `PUT /checador/mi-espacio/rostro` con `{ descriptores, acepto_consentimiento, version }`.
- **QR:** `POST /checador/rostro-celular/publico/:token` con el mismo cuerpo. Un 409 gasta un intento del enlace; la pantalla dice cuántos quedan.
- **Ficha:** las huellas viajan con el guardado de la ficha (multipart). Se manda `descriptores` como texto JSON y `descriptor_facial` con la pose de frente.

Si el servidor responde `409 ROSTRO_PARECIDO`, se muestra un mensaje genérico que no dice a quién se parece: «Tu rostro se parece mucho al de otra persona registrada…».

## Checar: solo en línea (24/11/2026)

El dueño quitó el reloj sin conexión («Require internet for attendance clock registration», de Luis): ya no hay service
worker de reloj, ni cola, ni comparación de la cara en el aparato. Todo va al servidor con
`src/lib/reloj/registrarEnLinea.mjs`, y es el servidor el que compara (reglas en el backend:
`services/rostroReglas.js` y `services/rostroEnLinea.js`; ver `hr360-checkin-backend/docs/rostro-referencias.md`).

| Quién | Petición | Qué hace el servidor |
|---|---|---|
| Kiosco, cara sola | `POST /checador/reloj/registrar-facial` `{ id_empresa, descriptor_facial, captured_at, latitud_actual, … }` | Contra toda la empresa: umbral 0.95 y margen 0.02. «Código y cara» responde `CODE_REQUIRED`. |
| Kiosco, «Código y cara» | Lo mismo + `codigo` (un solo POST) | 1 a 1 contra la persona de ese código (0.92). |
| Kiosco, código solo | `POST /checador/reloj/registrar` `{ id_empresa, codigo, … }` | Si la persona es «Código y cara»: `METHOD_CODE_FACE`. |
| App del empleado | `registrar-facial` + `modo: "app"` y su token | La persona y la empresa salen de la sesión; 1 a 1 solo contra sus fotos. Los códigos de compañeros siguen pasando por la empresa. |

`src/lib/rostro/reglas.mjs` solo guarda las constantes (`UMBRAL_EMPRESA` 0.95, `MARGEN` 0.02, `UMBRAL_1A1` 0.92) y el
puntaje por persona que usa «Probar rostro» en la ficha para decir lo mismo que dirá el checador.

## Kiosco: «Código y cara»

Sobre la cámara aparece el botón «¿No te reconoce? Escribe tu código». Al tocarlo se abre un teclado grande con teclas de
64 px (`src/components/Clock/TecladoCodigoCara.jsx`) y luego la cámara manda la cara junto con el código. Si en 8 s la
cara no coincide con ese código, el reloj lo dice. Si el código no existe, si la persona no tiene rostro o si hay
demasiados códigos equivocados (`429 CODE_ATTEMPTS_LOCKED`), el servidor lo responde y el reloj lo muestra.

Dos casos abren el modo solo:

- la cara es de una persona con «Código y cara» (`CODE_REQUIRED`): se abre el teclado;
- esa persona escribe solo su código y el servidor responde `METHOD_CODE_FACE`: la cámara pasa sola a confirmar la cara
  con ese código.

## Intentos fallidos

Los guarda el servidor al responder (`rostro_intentos`, con modo «kiosco» o «app»). El reloj ya no los manda.

En la ficha, `RostroRhResumen.jsx` lee `GET /checador/mi-espacio/rostro/empleado/:id` (las `poses`) y `…/intentos`. Muestra:

- las fotos registradas;
- los últimos intentos, con fecha, dónde («Reloj de la empresa» o «App del empleado»), si fue solo con la cara o con código y cara, y un motivo claro: «No se parecía lo suficiente (91 %)», «Se parecía a dos personas», «El código no coincide con la cara».

El método de checado de la ficha tiene la opción nueva «Código y cara» (`metodo_chequeo = 'codigo_cara'`).

## Lo que se quitó del modo sin conexión

- De este trabajo: el reporte de intentos desde el aparato (`reportFaceAttempt`), la revisión local del código
  (`checkFaceCode`), la descarga personal de referencias y el uso de las reglas en `public/offline-clock/face.mjs`
  (`public/offline-clock/rostro-reglas.mjs` pasó a `src/lib/rostro/reglas.mjs`).
- `FaceReferenceSync.jsx` y `OfflineClockSetup.jsx`: ya nadie los usaba.
- Del CI: `test-offline-clock-registration`, `test-automatic-clock`, `test-offline-clock` y `test-reloj-comida-cola`
  (prueban la cola sin conexión, que ya no se usa). Entran `test-reloj-en-linea` y `test-retire-offline-worker`.
- Siguen en el repositorio, sin usarse para checar: `src/lib/offline-clock.js` (la app aún lee las capturas guardadas
  en el aparato para mostrarlas), `public/offline-clock/*` y `OfflineExperience.jsx`. Se pueden quitar cuando ya no haga
  falta mostrar capturas viejas.

## Pruebas

- **Unitarias** (en la línea «Asistencias — cálculo…» del CI):
  - `scripts/test-rostro-poses.mjs`: pose con caras sintéticas 3D, captura, saltar, otra persona.
  - `scripts/test-rostro-reglas.mjs`: constantes, puntaje con varias fotos, textos de RH, 409, «Probar rostro».
  - `scripts/test-reloj-en-linea.mjs`: rutas en línea; «Código y cara» va en un solo POST a `registrar-facial`.
- **En el navegador:** `scripts/verify-rostro-multi.mjs`, con el backend simulado con las reglas del servidor y face-api
  simulado con poses (`scripts/rostro-faceapi-poses.mjs`). Cubre el kiosco a 1440 y 390, la app, Mi rostro y la ficha a
  1440 y 390. `verify-rostro-qr.mjs` y `verify-firma-pin.mjs` ya usan la captura guiada.
- **Lo que no se prueba aquí:** la detección real de face-api (la cámara es simulada). Los ángulos (unos 9° a 31° de giro y unos 9° a 30° de inclinación) salen de un modelo geométrico; conviene confirmarlos con personas reales y ajustar `LIMITES_POSE` si hace falta.
