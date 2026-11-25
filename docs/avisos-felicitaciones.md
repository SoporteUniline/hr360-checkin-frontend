# Avisos y felicitaciones (campana del panel)

Pedido aprobado por el dueño (25/11/2026). Maqueta: `Main.dc.html` (campana), `Felicitar.dc.html`, `Plantillas.dc.html`,
`Movil.dc.html`. Backend y reglas completas: `docs/avisos-felicitaciones.md` del repositorio del backend.

## Qué hay
- **Campana** (`src/components/avisos/CampanaAvisos.jsx`): en la barra del panel, antes de «Reloj checador», para RH y el
  dueño (toda su empresa; selector si la sesión tiene varias). En la app del empleado, junto al perfil, solo si es jefe
  (el servidor decide el equipo; sin equipo no aparece). Contador rojo y `aria-label` «Avisos de los próximos 7 días: N».
  Popover en escritorio y hoja desde abajo en celular (≤ 768 px). Grupos Hoy · Mañana · Esta semana, filtros con su
  número, «Ver contrato» (solo RH) y pie con lo que sale solo (correo y/o WhatsApp a las 9:05).
- **Felicitar** (`FelicitarDialog.jsx`): WhatsApp con el texto FIJO de la plantilla de Meta (sin cuadro de texto: «Texto
  aprobado por WhatsApp; no se puede cambiar»); «Enviar por WhatsApp» es un enlace `wa.me` con el texto ya escrito y
  anota la felicitación. Pestaña Correo con la vista previa real (iframe sin scripts) y «Enviar por correo» (una vez por
  año). Sin teléfono o sin correo, botón deshabilitado con el motivo.
- **Plantillas de felicitación** (`/panel/plantillas-felicitacion`, menú Ajustes después de «Reglas de aviso», y enlace
  en la campana): correo editable (diseño Festivo / Elegante / Sencillo, asunto, mensaje, variables que se insertan en
  el cursor, vista previa real, «Enviarme una prueba»), interruptores de envío automático por correo (avisa si la regla
  de aviso está apagada), aviso en la campana y **envío automático por WhatsApp** (apagado por omisión; deshabilitado
  con «Falta configurar el número de notificaciones» si el servidor no tiene `ZERNIO_ACCOUNT_ID_NOTIFICACIONES`).
  Mover solo interruptores guarda `{ sistema: true }`: sigue saliendo el correo de ADAMIA. WhatsApp: solo vista previa.
  Cambios sin guardar protegidos con `useGuardiaSalida`.

## Plantillas de WhatsApp (Meta)
Fijas en el backend (`modules/avisos/services/catalogoWhatsapp.js`), es_MX, MARKETING:
- `adamia_felicitacion_cumpleanos`: «¡Feliz cumpleaños, {{1}}! 🎉 Todo el equipo de {{2}} te desea un gran día. Gracias
  por ser parte de nuestro equipo.» → 1 nombre, 2 empresa.
- `adamia_felicitacion_aniversario`: «¡Feliz aniversario, {{1}}! Hoy cumples {{2}} en {{3}}. Gracias por tu compromiso y
  por crecer con nosotros.» → 1 nombre, 2 «N año(s)», 3 empresa.

## Datos
SWR `GET /checador/avisos/proximos` sin sondeo agresivo: se pide al abrir la campana y cada 10 minutos como mucho (sin
revalidar al enfocar). El jefe no manda empresa ni jefe: los pone el servidor.

## Pruebas
- `scripts/test-avisos.mjs` (CI «Avisos y felicitaciones»): grupos, filtros, textos, enlace wa.me, contador, pie,
  insertar variable, cambios pendientes y qué se guarda.
- `scripts/verify-avisos.mjs` (Playwright, API simulada, 1440 y 390): campana con contador junto al reloj, grupos,
  wa.me interceptado con el texto exacto y anotado, correo, WhatsApp no editable, plantilla guardada, WhatsApp
  automático (encender / deshabilitado sin número), jefe solo su equipo, sin equipo sin campana, sin desborde y
  objetivos ≥ 44 px. `CAPTURAS=<carpeta>` guarda capturas a doble densidad.
