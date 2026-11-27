# Prospectos y noticias (27/11/2026)

Aprobado por el dueño (el correo es **opcional**). Reglas de datos y API: `docs/prospectos.md` del backend.

## Dónde
| Pieza | Archivo |
|---|---|
| Reglas puras (correo, casilla, cuerpo del envío, teléfono de /contacto, panel, /baja) | `src/lib/prospectos/reglas.mjs` |
| Guardado sin detener nada (`fetch` con `keepalive`, después de abrir WhatsApp, sin `await`) | `src/lib/prospectos/guardar.js` |
| Pop-up: «Correo (opcional)» y casilla de noticias aparte y desmarcada | `src/components/landing/popups/PopupTarjeta.jsx` |
| /contacto: casilla de noticias y guardado con origen «contacto» | `src/app/(public)/contacto/page.jsx` |
| Página de baja `/baja?token=` (no se indexa) | `src/app/(public)/baja/` |
| Panel `/dashboard/prospectos` (Admin; en el menú junto a los pop-ups) | `src/app/dashboard/prospectos/page.jsx` |

## Reglas de pantalla
- Texto de la casilla (aprobado): «Quiero recibir noticias sobre reformas laborales, novedades de ADAMIA y consejos de RH».
  Tiene versión (`NOTICIAS.version`); si el texto cambia de fondo, cambia la versión.
- El correo solo detiene el botón si está mal escrito o si se marcó la casilla sin escribirlo. Al marcarla sin correo
  aparece «Para recibir noticias escribe tu correo.» y el foco va al campo.
- WhatsApp se abre primero, dentro del clic. Luego, sin esperar, la constancia del aviso y el prospecto. Si el backend tarda
  o falla, la persona no lo nota (queda en consola).
- (28/11/2026) /contacto: el correo es **opcional**, con las mismas reglas que el pop-up (`estadoCorreo` y
  `MENSAJES_CORREO`): marcar noticias sin correo lo pide en ese momento (aviso + foco) y un correo mal escrito avisa al
  salir del campo o al enviar. Sin correo, el mensaje de WhatsApp no lleva la línea «Correo» y la constancia del aviso
  va con nombre y teléfono. Su teléfono libre se convierte a internacional (10 dígitos = México); si no se puede, se
  guarda solo con el correo, y si tampoco hay correo el backend no guarda al prospecto (WhatsApp ya se abrió con sus datos).
- Aviso de privacidad `2026-11-28`: en «Para qué usamos tus datos» (finalidades adicionales) explica la casilla, la baja
  y que se guarda la fecha del consentimiento y de su retiro. Todos los formularios toman la versión de
  `AVISO_PRIVACIDAD.version` (`DOCS_AVISO`, `DOCS_CUENTA`, `guardarProspecto`); nadie la escribe a mano.
- /baja da de baja con el botón «Sí, darme de baja» y **no al abrir la página**, porque los revisores de enlaces de
  algunos correos abren las ligas solos.
- Panel: letra ≥ 16 px, títulos 700, botones ≥ 48 px con texto, sin degradados, página (no ventana). En celular,
  tarjetas en lugar de tabla. El CSV por omisión trae solo a quienes aceptaron noticias. Con la casilla «Incluir en el
  archivo a quienes no aceptaron noticias» trae a todos.
- Veracidad: el pop-up ya no dice «Recibo de nómina · Timbrado · CFDI 4.0» (ADAMIA no timbra). La tarjeta es
  «Vacaciones aprobadas · Desde el celular» y la frase dice «Checador, contratos y firma en una sola app».

## Pruebas
- `scripts/test-prospectos.mjs` (línea «Asistencias — cálculo» de `ci-dev.yml`), incluye el párrafo del aviso, la versión
  única en los formularios y el correo opcional de /contacto. `scripts/verify-legal.mjs` revisa la página del aviso.
- `scripts/verify-prospectos.mjs` y `scripts/verify-popups.mjs` (Playwright, 1440 y 390; paso «Pop-ups y prospectos» de
  `ci-dev.yml`).
