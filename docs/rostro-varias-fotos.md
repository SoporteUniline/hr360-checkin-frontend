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

## Comparar al checar

`public/offline-clock/rostro-reglas.mjs` es el único módulo con las reglas. Lo usan el reloj sin conexión (`face.mjs`, también desde el service worker) y la app, que lo reexporta en `src/lib/rostro/reglas.mjs`. Los valores son los mismos del servidor:

- `UMBRAL_EMPRESA` = 0.95
- `MARGEN` = 0.02
- `UMBRAL_1A1` = 0.92

Cómo decide:

- **Puntaje de una persona:** la más parecida de sus fotos. Si la persona no tiene fotos nuevas, se usa su `descriptor`/`descriptor_facial` de siempre.
- **Kiosco, solo con la cara:** gana quien tiene el mayor puntaje, siempre que llegue al umbral y le saque el margen a la segunda persona. Si no le saca el margen, el resultado es `FACE_AMBIGUOUS`. Quien tiene «Código y cara» no entra solo con la cara: el resultado es `CODE_REQUIRED` y el reloj le abre el teclado.
- **Kiosco, «Código y cara»:** el código elige a la persona y la cara se compara solo con ella (1 a 1, 0.92).
  - Sin conexión al servidor o con las referencias descargadas, la captura se manda como `method:'facial'` con `code` y `local_verification`. El servidor revisa que el código sea de esa persona.
  - Sin referencias descargadas, se manda `method:'facial'` con `descriptor`, `code` y `device_id`.
- **App del empleado con sesión:** la cara se compara **solo** con las referencias de esa persona. Se usan la descarga personal (`/checador/reloj/offline/referencias`, `mode:'employee'`) y el alcance personal (`/checador/reloj/offline/sincronizar`). Los códigos de compañeros siguen pasando por la empresa.

## Kiosco: «Código y cara»

Sobre la cámara aparece el botón «¿No te reconoce? Escribe tu código». Al tocarlo se abre un teclado grande con teclas de 64 px (`src/components/Clock/TecladoCodigoCara.jsx`) y luego la cámara compara 1 a 1. Si en 8 s la cara no coincide con ese código, el reloj lo dice.

Antes de pasar a la cámara, el código se revisa con las referencias descargadas:

- si el código no existe, lo dice al momento;
- si la persona no tiene rostro registrado, también.

Dos casos abren el modo solo:

- la cara es de una persona con «Código y cara»: se abre el teclado;
- esa persona escribe solo su código y el servidor responde `METHOD_CODE_FACE`: la cámara pasa sola a confirmar la cara con ese código.

## Intentos fallidos

El reloj guarda cada intento fallido que detecta él mismo y lo manda después:

- **Motivos:** `sin_coincidencia`, `ambiguo`, `codigo_no_coincide`, `codigo_invalido` y `sin_referencias`.
- **Qué se guarda:** el candidato, el motivo y los porcentajes. Nunca la huella.
- **Cuándo cuenta:** solo cuando pasó el tiempo de gracia, para que un primer cuadro borroso no cuente.
- **Límite:** un intento por candidato y motivo cada 30 s por dispositivo.
- **Sin conexión:** los intentos se encolan en el almacén del reloj (`face:attempts:v1`, como mucho 100).

El código está en `reportFaceAttempt` de `src/lib/offline-clock.js`. A dónde se mandan:

- **Kiosco:** `POST /checador/reloj/offline/empresa/intentos` con `grant`.
- **App:** `POST /checador/reloj/offline/intentos`. La persona sale de la sesión.

Los intentos que detecta el servidor se guardan solos en el servidor.

En la ficha, `RostroRhResumen.jsx` lee `GET /checador/mi-espacio/rostro/empleado/:id` (las `poses`) y `…/intentos`. Muestra:

- las fotos registradas;
- los últimos intentos, con fecha, dónde («Reloj de la empresa» o «App del empleado»), si fue solo con la cara o con código y cara, y un motivo claro: «No se parecía lo suficiente (91 %)», «Se parecía a dos personas», «El código no coincide con la cara».

El método de checado de la ficha tiene la opción nueva «Código y cara» (`metodo_chequeo = 'codigo_cara'`).

## Pruebas

- **Unitarias** (en la línea «Asistencias — cálculo…» del CI):
  - `scripts/test-rostro-poses.mjs`: pose con caras sintéticas 3D, captura, saltar, otra persona.
  - `scripts/test-rostro-reglas.mjs`: margen, 1 a 1, «Código y cara», app, límite, textos de RH, 409.
  - `scripts/test-local-face.mjs`.
  - `scripts/test-offline-clock-registration.mjs`: cuerpos de «Código y cara» y de intentos.
- **En el navegador:** `scripts/verify-rostro-multi.mjs`, con el backend simulado según el contrato y face-api simulado con poses (`scripts/rostro-faceapi-poses.mjs`). Cubre:
  - el kiosco a 1440 y 390;
  - la app;
  - Mi rostro;
  - la ficha a 1440 y 390.

  `verify-rostro-qr.mjs` y `verify-firma-pin.mjs` ya usan la captura guiada.
- **Lo que no se prueba aquí:** la detección real de face-api (la cámara es simulada). Los ángulos (unos 9° a 31° de giro y unos 9° a 30° de inclinación) salen de un modelo geométrico; conviene confirmarlos con personas reales y ajustar `LIMITES_POSE` si hace falta.
