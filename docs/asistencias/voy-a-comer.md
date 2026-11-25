# Reloj: «Voy a comer» (26/11/2026)

Caso: en la primera salida dijo «Registrar salida» (no era comida) y en la segunda sí va a comer. Aprobado por el dueño.

## Cómo se ve
- **Kiosco** (`/<slug>`, `PantallaKiosco`): cuadro «Comer» con cubiertos (lucide `Utensils`) entre el código y el QR, del
  mismo alto que el QR. No agrega alto: la pantalla sigue sin desplazarse y las teclas conservan su tamaño.
- **App del empleado** (`/empleado/reloj-checador`): en el celular, botón «Comer» en la barra de métodos (Rostro / Código /
  QR); en escritorio, junto al código y el QR.
- Prendido: ámbar con la cuenta («30 s») y un aviso sobre la cámara «Siguiente checada: salida a comer · 30 s» («Salida a
  comer · 30 s» en pantallas chicas). Se apaga solo al usarse (el servidor contestó) o a los 30 s; tocarlo otra vez lo quita.
  Apagado no cambia nada para quien solo checa.

## Qué manda
La siguiente checada (código, QR o rostro) va con `accion: "salida_comida"` (`conVoyAComer`, `src/lib/reloj/voyAComer.mjs`).
La regla es del servidor (backend `docs/comida-en-asistencias.md`): vale en cualquier salida si ese día aún no hay comida;
si ya comió, cierre automático registra la salida normal con «Ya registraste tu comida hoy. Registramos tu salida.» y cierre
manual pregunta sus opciones con el aviso «Ya registraste tu comida hoy.» (`aviso: "comida_ya_registrada"`). En una entrada
no cambia nada. El regreso de comida es una entrada normal. La primera salida del día ya pregunta «¿Sales a comer?» siempre.

No había un botón explícito previo en la app del empleado (solo el contador `ComidaEnCurso` y la pregunta del servidor): el
mismo interruptor sirve en el kiosco y en la app.

## Pruebas
`scripts/test-reloj-en-linea.mjs` (unitaria) y `scripts/verify-voy-a-comer.mjs` (navegador, kiosco y app a 1440 y 390).
