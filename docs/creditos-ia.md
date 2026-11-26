# Créditos de Adamia AI (frontend) · 25/11/2026 · interruptor del cobro 25/12/2026

Cobro de Adamia AI con créditos prepagados en pesos (opción B aprobada por el dueño). La autoridad es el backend:
`docs/creditos-ia.md` del repo del backend (fórmula, libro mayor, Stripe, interruptor y paso a paso para encenderlo).

## Fórmula

`precio (MXN, sin IVA) = costo_usd × tipo_cambio ÷ (1 − margen)`, margen 0.50 por omisión, techo al centavo.
Ejemplo: costo $1 USD, tipo de cambio $20 → **$40 MXN + IVA**. Una pregunta típica a la LFT ($0.0017 USD) → $0.07 MXN.

## Pantallas

- **Dueño y RH — `/panel/creditos-ia`** (Ajustes → «Créditos de Adamia AI», `src/components/ia/CreditosIA.jsx`):
  saldo en pesos, aviso de saldo bajo (menos del 20 % de la última recarga) o sin créditos, paquetes con IVA y botón
  «Recargar» (abre Stripe Checkout; el saldo se acredita cuando Stripe confirma el pago), consumo del mes por función e
  historial con «Ver anteriores». Nunca muestra costo, margen ni USD. Al volver de Stripe (`?compra=ok&folio=`) espera la
  confirmación del webhook (hasta 12 consultas cada 2.5 s) y avisa «¡Listo!». En la app nativa no se ofrece recargar
  (como «Mi suscripción»): se recarga desde el navegador.
- **Indicador** (`src/components/ia/IndicadorCreditos.jsx`): «Saldo de Adamia AI: $X MXN» con enlace a recargar, en el panel
  de Adamia AI y en Clima (reemplaza «Uso de Adamia AI este mes: … USD»). Sin la migración de créditos se ve lo de antes.
  Con el cobro encendido desaparece «Cambiar tope» (el tope en USD ya no aplica). Un 402 `IA_SIN_CREDITOS` muestra
  «Recargar créditos».
- **Administrador de ADAMIA — `/dashboard/creditos-ia`** (`src/components/ia/CreditosIAAdmin.jsx`): por mes, costo de IA
  (USD, con el de WhatsApp aparte), cobrado, ganancia, no cubierto y compras (o «se habría cobrado» con el cobro apagado);
  tipo de cambio con aviso si tiene más de 30 días e historial; margen global con ejemplo en vivo; por empresa margen propio,
  movimientos con el cuadre del libro y «Regalar» (regalo/ajuste/reembolso con motivo y clave de idempotencia); paquetes.

## Crédito de bienvenida y encendido del cobro (24/12/2026)

- **Administrador — sección «Crédito de bienvenida»** en `/dashboard/creditos-ia` (regla del dueño: «todos con solo 1 dólar
  de crédito gratis»): monto en US$ (0 a 50; 0 = apagado para nuevas), conversión del día con el TC registrado
  («US$1.00 × $18.4567 = $18.46 MXN»), empresas pendientes y total, cuántas ya lo recibieron, y «Dar crédito de bienvenida a
  todas (N)» → diálogo con el resumen (empresas, a cada una, TC con fecha, total y lista) → «Confirmar y abonar $X». El cuerpo
  enviado es exactamente lo que vio (`{ confirmar, usd, tipo_cambio, empresas, total_mxn }`); si algo cambió el servidor
  responde 409 y se muestra el mensaje. Sin TC registrado el botón queda deshabilitado con el motivo. Las empresas nuevas lo
  reciben solas al darse de alta (backend).
- **Modelos y precios:** línea «Modelos: panel … · WhatsApp … · precios revisados dd/mm/aaaa» y aviso ámbar si algún modelo
  no tiene precio propio en la tabla del backend.
- **Sin créditos desde cualquier pantalla** (`src/components/ia/AvisoSinCreditos.jsx`, montado en `src/app/panel/layout.jsx`):
  `src/lib/axios.js` detecta el 402 `IA_SIN_CREDITOS` de cualquier petición (Clima, plantillas, desempeño, sugerencias de
  WhatsApp…) y muestra un diálogo «Te quedaste sin créditos de Adamia AI» con el mensaje del servidor, «Ahora no» y
  **«Recargar créditos»**. No se repite mientras está abierto, no sale en la propia pantalla de créditos y Adamia AI (Ley) lo
  desactiva con `{ avisoSinCreditos: false }` porque ya lo muestra dentro de la conversación. El aviso de **saldo bajo** ya
  existía (indicador ámbar «Saldo bajo · Recargar» y aviso en la pantalla de créditos, más correo al dueño).
- **OXXO / SPEI:** al volver de Stripe con un pago diferido que venció o se rechazó (estado `fallida`): «Tu pago (folio IA-n)
  no se completó… No se cobró ni se acreditó nada; puedes recargar de nuevo» y deja de esperar. Mientras espera, el mensaje
  aclara que OXXO o transferencia pueden tardar.

## Interruptor del cobro (25/12/2026)

El dueño enciende y apaga el cobro **desde el panel**; ya no depende de que alguien ponga `IA_COBRO_CREDITOS` en el servidor
(backend `docs/creditos-ia.md` → «Interruptor del cobro»: la variable `false` sigue siendo el freno de emergencia y `true`
lo fuerza encendido; sin ella manda el panel).

- **Administrador — tarjeta «Cobro de Adamia AI»** arriba de `/dashboard/creditos-ia` (`src/components/ia/CobroInterruptor.jsx`,
  `GET|PUT /checador/ia/admin/cobro`): estado **efectivo** (Encendido / Apagado), qué ve el cliente, nota ámbar si la variable
  del servidor lo está forzando («En el panel: …»), último cambio (cuándo, quién, motivo), historial y aviso de que con varias
  instancias tarda hasta 30 s. «Encender cobro» abre un diálogo con las **advertencias del servidor** ordenadas (Bloquea → Atención
  → Recordatorio: sin tipo de cambio no deja confirmar; empresas sin crédito de bienvenida; webhook de Stripe), **motivo**
  obligatorio y escribir **ENCENDER**. El cuerpo enviado es `{ activo: true, confirmar: "ENCENDER", motivo }`. «Apagar cobro»
  pide solo el motivo (`{ activo: false, motivo }`). Si el servidor responde 400/409 se muestra el mensaje y sus advertencias.
- **Cliente** (dueño/RH): con `cobro_activo === false` (dato del servidor en `GET /checador/ia/creditos` y en `creditos` de
  `/estado`) el indicador del pie de Adamia AI y de Clima dice **«Gratis por ahora: el cobro de Adamia AI aún no está activo»
  · Ver créditos** en lugar de «Saldo de Adamia AI: $0.00 MXN · Ver créditos», y la pantalla de créditos muestra ese aviso
  (sin el de saldo bajo) y «Cuando se active el cobro, cada consulta… descontará su precio». Si el dato falta no se promete
  que es gratis.

## Lógica y pruebas

- `src/lib/ia/creditos.mjs`: formato, avisos, regreso de Stripe, vista previa de la fórmula y validación de formularios;
  aviso global sin créditos, monto y resumen del crédito de bienvenida.
- `scripts/test-creditos-ia.mjs` (CI: paso «Créditos de Adamia AI»).
- `scripts/test-creditos-bienvenida.mjs` (CI: paso «Créditos de Adamia AI — crédito de bienvenida, aviso sin créditos y pago
  OXXO/SPEI fallido»).
- `scripts/test-cobro-interruptor.mjs` (CI: paso «Créditos de Adamia AI — interruptor del cobro en el panel y «Gratis por
  ahora» al cliente»): texto gratis, estado y nota de la variable, confirmación ENCENDER, cuerpo del PUT, orden de advertencias.
- `scripts/verify-creditos-ia.mjs`: navegador real con API simulada a 1440 y 390 px (pantalla de créditos, recarga con
  Stripe interceptado, regreso, indicador y 402, aviso global sin créditos desde Clima, OXXO fallido, panel del
  administrador, regalo y crédito de bienvenida con confirmación; interruptor del cobro: encender con advertencias, motivo y
  ENCENDER, apagar, nota de la variable, sin TC no se confirma; cliente «Gratis por ahora» en créditos y en el pie). Uso:
  `NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build && node scripts/verify-creditos-ia.mjs`.
