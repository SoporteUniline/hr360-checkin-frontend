# Newsletter semanal, Guía 2027 y avisos de prospectos (27/11/2026)

Aprobado por el dueño. Reglas, API, estados y migraciones: `docs/newsletter.md` del backend.

## Dónde
| Pieza | Archivo |
|---|---|
| Reglas puras (estados, fechas, borrador y cambios, celulares y correos de aviso, puntos de la guía) | `src/lib/newsletter/reglas.mjs` |
| Panel `/dashboard/newsletter` (Admin; enlace desde Prospectos) | `src/app/dashboard/newsletter/page.jsx` |
| Un boletín: aprobar, cancelar, editar textos, descartadas, propuesta de la guía, vista previa | `src/app/dashboard/newsletter/Boletin.jsx` |
| Guía 2027: puntos, «por confirmar», corregir un punto | `src/app/dashboard/newsletter/Guia.jsx` |
| Estilos y `pedir()` compartidos | `src/app/dashboard/newsletter/ui.jsx` |
| «Avisar por WhatsApp a» en `/dashboard/prospectos` | `src/app/dashboard/prospectos/AvisosWhatsapp.jsx` |

## Reglas de pantalla
- Página, no ventana. «Aprobar y enviar ahora» y «Cancelar este envío» piden confirmación **en línea** («Sí, enviar
  ahora» / «No, volver»). Con cambios sin guardar no deja enviar.
- Avisos arriba: «Falta configurar Resend» (con el motivo del servidor), falta la llave de la IA, horario automático
  apagado. El estado siempre va con texto (Programado, Espera tu aprobación, Enviado, Cancelado…), no solo color.
- Se editan asunto, introducción, título y resumen de cada nota; se pueden quitar notas y cambios propuestos a la guía.
  El PUT lleva solo lo que cambió. La fuente de cada nota se ve con su tipo (oficial o periodística) y su fecha.
- Vista previa del correo en un `iframe` con `sandbox=""` (sin scripts).
- Mientras se genera o se envía, la pantalla se actualiza sola cada 5 s.
- «Avisar por correo a» y «Avisar por WhatsApp a»: hasta 5, sin repetir; el celular con lada (10 dígitos = México).
- Guía 2027: lo «por confirmar» se marca en amarillo y no sale en los correos; «Confirmar o corregir» pide la fuente.
- Letra ≥ 16 px, títulos 700, botones ≥ 48 px con texto, sin degradados, sin desborde a 390 px.
- El menú lateral no se tocó (lo está cambiando otro trabajo): se entra desde Prospectos › «Newsletter semanal y Guía 2027».

## Pruebas
- `scripts/test-newsletter.mjs` (línea «Asistencias — cálculo» de `ci-dev.yml`).
- `scripts/verify-newsletter.mjs` (Playwright, 1440 y 390; paso «Newsletter semanal y avisos de prospectos»).
