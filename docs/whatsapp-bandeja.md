# Bandeja de WhatsApp (reclutamiento) — frontend

Ruta: `/panel/whatsapp` (`src/app/panel/whatsapp/page.jsx` → `src/components/whatsapp/BandejaWhatsapp.jsx`).
Solo para el equipo de reclutamiento (rol `Recruiter`). Datos reales del API `/reclutamiento/whatsapp/*` (`api.js`).

## Diseño (25/11/2026, maqueta aprobada «Bandeja de WhatsApp estilo WhatsApp»)

Se ve y se usa como WhatsApp Web. Solo cambió la presentación: mismas llamadas al API, mismos estados y reglas.

- **Pantalla completa.** La bandeja marca su raíz con `data-bandeja-completa`; `globals.css` usa `body:has(...)` para que
  el área del panel tome el alto de la ventana (`100dvh`, sin scroll de página) y cada columna tenga su propio scroll.
  El encabezado del panel no cambia.
- **Menú de ADAMIA plegado a iconos** mientras la bandeja está abierta (`useMenuColapsado.js`). No cambia la preferencia
  del usuario: si lo pliega la bandeja y nadie lo vuelve a abrir, al salir queda como estaba. En teléfono no se toca.
- **Columna «Chats»** (400 px; 360 px entre 1024 y 1279 px): chip «Agente encendido/apagado» (abre *Configurar agente*),
  botón *Entrevistas* (`?vista=entrevistas`), menú ⋮ (*Salud del agente* `?vista=salud`, *Enlaces de vacantes*,
  *Configurar agente*), avisos (extras del paquete, fallas del agente, empresa en pausa), buscador, pastillas de filtro
  (Todos, Atención, Califica, Con alerta, No califica, Incompleto) y *Etapa* como pastilla desplegable, filas tipo
  WhatsApp y pie con selector de empresa (si hay varias), número/modo y conteos del mes (conversaciones, entrevistas,
  plantillas).
- **Conversación** (`HiloConversacion.jsx`): fondo `#EFEAE2`, entrantes blancos, salientes verdes (`#D9FDD3`; las del
  agente firmadas «Asistente IA» o su nombre), eventos del sistema y líneas de la cita como avisos centrados.
  Encabezado: avatar + nombre (abre la ficha), vacante · teléfono · calificación, quién atiende, *Tomar control* /
  *Devolver a la IA*, *Agendar entrevista* (sin cita abre el selector de horarios; con cita, «Ver entrevista agendada»
  abre la ficha en la cita) y menú **Acciones**: Ver ficha del candidato, Agendar entrevista, Ofrecer horarios (con el
  motivo si no se puede), Mover etapa del proceso, Copiar enlace de WhatsApp de la vacante, Devolver a la IA (solo
  teléfono) y Marcar como atendido (si requiere atención). No hay acción «Marcar como no califica»: el API no la tiene
  (la calificación la pone el agente; *Descartar* está en el proceso de la ficha).
  Con la ficha cerrada, sobre el chat se ven: la atención pendiente (con *Marcar como atendido*), la sugerencia de etapa
  del agente y la cita fija («Entrevista: … · Ver»).
- **Cuadro para escribir** (`ComposerChat.jsx`): barra gris con el cuadro blanco, «+» (adjuntar, ofrecer horarios), clip,
  micrófono y enviar. Sin permiso no se muestra un cuadro deshabilitado: el motivo ocupa su lugar con la acción
  (*Tomar control* cuando atiende la IA; *Enviar seguimiento* con la ventana de 24 h cerrada).
- **Ficha del candidato** (`FichaCandidato.jsx`, 380 px a la derecha, cerrada por defecto; se abre con el nombre o
  «Ver ficha»): encabezado (avatar, nombre, teléfono, calificación · etapa de la entrevista), vacante, proceso de
  selección (`ProcesoChat`, con atajos Alt+Mayús), entrevista (`CitaChat`: confirmar, asistió/no asistió, mover,
  cancelar, agendar, ofrecer horarios) y evaluación de la IA (`PanelCandidato`: atención, aprobar para agendar, pregunta en
  curso, respuestas, resumen y puntajes, preguntas sin respuesta). Escape o «Cerrar ficha» la cierran. Bajo 1280 px se
  sobrepone al chat. Al cambiar de chat se cierra.
- **Entrevistas y Salud del agente** ocupan el lugar de la conversación (la lista sigue a la vista) con su barra y
  «Cerrar»; las URLs `?vista=entrevistas` / `?vista=salud` no cambiaron.
- **Teléfono (<1024 px):** lista a pantalla completa → chat a pantalla completa con «‹» → ficha y vistas a pantalla
  completa. Objetivos ≥44 px, sin scroll horizontal a 390 px; con `interactive-widget=resizes-content` el teclado encoge
  el alto y el cuadro para escribir queda a la vista.

## Franja «requiere atención» (wa2, 25/11/2026)

`FranjaAtencion.jsx` + `src/lib/whatsapp/atencion.mjs`. Va arriba de la lista de chats, antes del buscador, cuando uno o
más candidatos piden hablar con una persona o su entrevista pide atención. Ejemplo: «2 candidatos necesitan atención ·
Ana Ruiz pidió hablar con una persona · y 1 más · Ver».

- **Datos:** `atencion: { total, primeros }` llega en la misma respuesta de `GET /conversaciones`. El servidor cuenta las
  empresas de la sesión, sin importar búsqueda, filtro ni página. Las conversaciones que ya tomó un reclutador no
  cuentan. Se actualiza con el refresco normal de la lista (5 s), sin otro sondeo.
- **Cuándo desaparece:** al pulsar «Marcar como atendido» o «Tomar control» se recarga la lista al momento.
- **Motivo:** se muestra en palabras cortas («espera que apruebes su entrevista», «revisa una respuesta de filtro»,
  «el agente no pudo contestar»…). El nombre largo se recorta con «…»; «y N más» siempre se ve.
- **Botón:**
  - con un candidato dice «Abrir chat» y abre su chat;
  - con varios dice «Ver» y filtra «Atención»;
  - con el filtro ya puesto, abre el primero.
- **Accesibilidad:**
  - `role="status"`: se anuncia cuando cambia;
  - ícono `AlertTriangle` de lucide, sin emoji;
  - texto rojo 800 sobre rojo 50: contraste 7.64:1 medido;
  - botón de 44 px;
  - en teléfono (390 px), margen de 12 px y sin scroll horizontal.
- **Pruebas:**
  - `node --test scripts/test-whatsapp-atencion.mjs` (en CI);
  - bloque «franja» de `scripts/verify-whatsapp.mjs` (`SOLO_FRANJA=1`; también corre con `SOLO_BANDEJA=1`), a 1440 y 390
    px, con las capturas `franja-0*.png`.

Menús: las opciones que abren un diálogo o la ficha se ejecutan cuando el menú terminó de cerrarse (en
`onCloseAutoFocus`), para que el diálogo no herede la capa del menú (el primer Escape se perdía) y el foco quede en el
destino.

## Pruebas

- Lógica: `node --test scripts/test-whatsapp*.mjs scripts/test-proceso-whatsapp.mjs` (también en CI).
- Navegador (backend simulado): construir con
  `NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api NEXT_PUBLIC_RECRUITMENT_ENABLED=true NEXT_PUBLIC_RUTA_DOMAIN=https://dev.adamia.com.mx npx next build`
  y correr `CAPTURAS=<carpeta> node scripts/verify-whatsapp.mjs` y `node scripts/verify-whatsapp-salud.mjs`.
  `SOLO_BANDEJA=1` corre solo el bloque 24 (alto completo a 1440×900, menú *Acciones*, ficha, vistas, teléfono a 390).
