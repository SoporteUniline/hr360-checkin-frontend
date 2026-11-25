# Créditos de Adamia AI (frontend) · 25/11/2026

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

## Lógica y pruebas

- `src/lib/ia/creditos.mjs`: formato, avisos, regreso de Stripe, vista previa de la fórmula y validación de formularios.
- `scripts/test-creditos-ia.mjs` (CI: paso «Créditos de Adamia AI»).
- `scripts/verify-creditos-ia.mjs`: navegador real con API simulada a 1440 y 390 px (pantalla de créditos, recarga con
  Stripe interceptado, regreso, indicador y 402, panel del administrador y regalo). Uso:
  `NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build && node scripts/verify-creditos-ia.mjs`.
