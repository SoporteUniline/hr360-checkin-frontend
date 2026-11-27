# Página de inicio (adamia.com.mx) — 21/11/2026

Diseño aprobado por el dueño («Aprobado, hazlo y publica en mi rama»), construido desde el prototipo
`https://claude.ai/artifact/SQxWGne2sGi6BSr3q1Zzy8` (versión 11).

| Archivo | Qué tiene |
|---|---|
| `src/app/(landing)/page.jsx` | Ruta `/`: monta `LandingHome` y el asistente comercial `AdamiaChatWidget` (el mismo de antes, por decisión del dueño). |
| `src/app/(landing)/layout.jsx` | Agrega la fuente Outfit (títulos); Inter ya viene del layout raíz. |
| `src/components/landing/home/LandingHome.jsx` | Marcado de la página. |
| `src/components/landing/home/landing-home.css` | Estilos, todos bajo `.lh` y animaciones con prefijo `lh-` (no tocan el resto de la app). |
| `src/components/landing/home/animaciones.js` | Movimiento: demo sincronizada, checada rostro → GPS → registro, reporte semanal, números y gráficas en vivo. Devuelve la función que limpia temporizadores, observadores y escuchas al salir. |
| `public/landing/*.webp` | Fotos ilustrativas generadas con IA (personas ficticias). |
| `scripts/verify-landing.mjs` | Prueba en navegador (`npm run build && node scripts/verify-landing.mjs`). |

Reglas del contenido:
- Pantallas del producto dibujadas con código y **datos de ejemplo**; ninguna cifra es de clientes.
- Solo se prometen funciones existentes: checador facial, GPS con geocerca (radio 10–1000 m, precisión ≤ 50 m,
  ubicación de menos de 60 s), checada con QR o código, aprobación de permisos y vacaciones por WhatsApp, reporte semanal contra
  el límite de la LFT, reglas de aviso por correo (retardos, faltas, contratos, cumpleaños, aniversarios).
- El aviso «va a pasar / excede el límite semanal» hoy es **alerta en el panel**, no correo ni WhatsApp; la página lo
  dice así. Enviarlo por correo o WhatsApp sería un cambio aparte.
- «Solicitar demo» y «Contacto» llevan a `/contacto`; «Iniciar sesión» a `/login`.
- Respeta «reducir movimiento» del sistema operativo.

Pendiente: los componentes anteriores (`MarketingLanding.jsx`, `LandingHeader.jsx`) ya no se
usan; se borran solo con `CONFIRMO`.

## Versión 2 (21/11/2026): carrusel, franjas lado a lado, la ley y el blog

- **Portada:** `HeroCarrusel.jsx` + `diapositivas.js`. Cinco diapositivas (foto + frase + botón) que pasan cada
  6 s; se pausan al pasar el cursor o con el botón ❚❚, y se mueven con flechas, puntos o teclado. Con
  «reducir movimiento» no avanzan solas. Solo la primera usa `h1`.
- **Franjas a todo lo ancho, lado a lado:** «Checa donde trabaja tu equipo» y «Mi espacio» en gris, horas extra en
  azul, contratos en violeta e indicadores en azul marino (texto y cifras a la izquierda, gráficas a la derecha).
- **La ley** (`SeccionLey.jsx`, `#ley`): artículo 132 fr. XXXIV, multa de 250 a 5,000 UMA que cuenta de 0 a
  $586,550 y la jornada de 48 a 40 h; enlaza a la guía del blog.
- **Blog** (`/blog`, `/blog/[slug]`): contenido en `src/lib/blog/articulos.js`. Cinco artículos con resumen,
  preguntas frecuentes, fuentes y aviso legal. Cada artículo trae `canonical`, Open Graph y datos estructurados
  (Article, FAQPage, BreadcrumbList). `/blog-y-noticias` (apagado) redirige a `/blog`.
- **Buscadores:** `src/app/sitemap.js` (páginas públicas y artículos) y `src/app/robots.js`. Solo el dominio de
  producción (`https://adamia.com.mx`, según `NEXT_PUBLIC_RUTA_DOMAIN`) se deja indexar; dev pide no indexar.
- Encabezado y pie compartidos con el blog: `SitioEncabezado.jsx`, `SitioPie.jsx`.

### Fuentes de los datos legales
Esta sesión no pudo abrir el DOF ni el sitio de la Cámara de Diputados (red restringida). Los datos se tomaron solo
donde coinciden varias fuentes (despachos y medios especializados, listados en cada artículo) y se cita el documento
oficial. ❓ PENDIENTE: que un abogado laboral revise los cinco artículos antes de llevarlos a producción, y
actualizarlos cuando la STPS publique las disposiciones del registro electrónico.

## Versión 3 (27/11/2026): lo nuevo — reclutador con IA en WhatsApp, clima con IA, tablero y muro

Pedido del dueño: «actualiza la página con lo único que tenemos: agente de AI que responde por WhatsApp las
solicitudes de empleo… lo de AI clima, todo el Dashboard, el muro; actualiza siempre la página principal».

**Regla (desde el 27/11/2026): cada módulo o función nueva que llegue a producción se agrega a la página principal
(mosaico, lista de módulos y, si es destacada, sección propia) en el mismo PR o el siguiente.** La lista vive en
`src/lib/sitio/modulos.js` (una sola fuente para la portada y `/funcionalidades`); lo que aún no está en producción no se
anuncia (hoy: Inducción digital).

Orden: portada → **Tu reclutador con IA en WhatsApp** (`#reclutador-ia`) → mosaico → **Clima laboral con IA**
(`#clima-ia`, franja gris) → **Todo tu equipo en un tablero** (`#tablero`) → **El muro de tu empresa** (`#muro`) → lo de
antes.

| Archivo | Qué tiene |
|---|---|
| `SeccionReclutadorIA.jsx` | Teléfono de la candidata con un chat dibujado como WhatsApp (encabezado con «en línea» / «escribiendo…», fondo con dibujos, burbujas verdes y blancas, hora, palomitas que pasan a azul, botones de respuesta rápida y respuesta citada) y la bandeja de RH que se llena al mismo tiempo (Califica, puntajes, cita confirmada, «1 candidato necesita atención»). Ícono genérico, nunca el logotipo de WhatsApp. |
| `SeccionClimaIA.jsx` | Participación (anillo), favorabilidad por dimensión, nivel NOM-035 y «Plan de acción sugerido» de Adamia AI: cada sugerencia pasa a «✓ Ya está en el plan». |
| `SeccionTablero.jsx` | Monitor (tarjetas y llegadas en vivo), horas extra por autorizar, permisos pendientes y Adamia AI con la LFT (arts. 74 y 75). |
| `SeccionMuro.jsx` | Muro del panel (portada, publicación con fotos, «Me gusta» que sube, comentarios) y «Confirmar de leído» en el celular; el avance pasa de 30 a 31 de 42. |
| `novedades.mjs` | Guion y datos de ejemplo (personas, empresa y cifras ficticias). |
| `guion.mjs` + `useGuion.js` | Reloj de pasos de cada escena (lógica pura probada en `scripts/test-guion-landing.mjs`). |
| `ControlEscena.jsx`, `Cifra.jsx` | Botón real Pausar / Reanudar / Ver de nuevo y números que cuentan. |
| `novedades.css` | Estilos `.lh .nv-*`. |

Cómo se mueven: el HTML del servidor trae cada escena en su **estado final** (sin JS, buscadores y «reducir movimiento»
lo ven completo). Al hidratar, lo que está fuera de la vista vuelve al inicio y arranca al entrar en pantalla
(IntersectionObserver); fuera de vista o con la pestaña oculta se pausa. Cada escena da 3 vueltas con 9–10 s de pausa
y se queda en el final; el botón permite pausarla (WCAG 2.2.2). Todo el espacio está reservado (lo que aún no ocurre
tiene opacidad o escala 0): sin saltos de diseño. Las maquetas son `aria-hidden` con un párrafo `sr-only` que cuenta lo
mismo. El carrusel de la portada (elemento LCP) no cambió.

De dónde sale cada texto del chat (código del backend `modules/recruitment/services/whatsapp/`):
- Aviso de privacidad con «Acepto / Leer aviso / No acepto» antes de cualquier otra cosa (`lumo/consentimiento.js`).
- Datos de la vacante y la duda «¿Dan uniforme?» desde la vacante y la base de conocimiento aprobada (`conocimiento.js`).
- Pregunta de filtro con botones Sí/No (`[[FILTRO]]`, wa2); calificación y puntajes los pone el servidor
  (`severidad.js`); etiquetas de `src/lib/whatsapp/entrevista.mjs`.
- Las 3 sucursales más cercanas como botones (`buscar_sucursal_cercana`, B1).
- Horarios como botones con el formato real «jue 3 dic 9:00 am» (`agendaReglas.tituloHorario`); confirmación,
  recordatorio (dentro de 24 h: texto con «Confirmo / Necesito cambiar») y «¡Gracias por confirmar!» con los textos de
  `mensajes.js`.
- «Requiere atención» cuando alguien pide hablar con una persona y «Tomar control» / «Abrir chat» en la bandeja.

Condiciones que dependen de la configuración de cada empresa o del servidor (no se prometen como automáticas):
sucursal más cercana (requiere `MAPBOX_TOKEN` y sucursales ubicadas), agenda y recordatorios (agenda activa por
vacante; fuera de 24 h, plantilla de Meta aprobada).

También en esta versión:
- Mosaico: tarjetas Reclutador IA, Clima laboral y Muro; las flechas llevan a la guía del Centro de ayuda.
- Lista «Todos los módulos»: sale de `modulos.js` (`modulosPortada()`, armado en el servidor para no mandar los textos
  largos al navegador); grupo nuevo «Talento y cultura»; Monitor, Nómina, Tareas, Adamia AI y Centro de ayuda; enlace
  «Entra al Centro de ayuda». La cifra del título y la diapositiva «N herramientas» salen del mismo total.
- `detalles.js`: se quitó el bloque «Sin señal, también.» y la pregunta de internet que habían quedado del checador
  sin conexión.
- Nombres de ejemplo ficticios en toda la portada (se cambió «Luis Pérez» por «Raúl Pérez»).
- `verify-landing.mjs`: secciones nuevas, chat hasta el último mensaje, pausa real, reducir movimiento, enlaces sin
  404, 390 px y capturas (`CAPTURAS=`). La prueba de robots «no indexar» se omite (con aviso) cuando el build es de
  producción. Corre en `ci-dev.yml`.

❓ PENDIENTE (dueño): el muro/comunicados y el Centro de ayuda están en `dev` pero no en `main` al 27/11/2026; esta
versión de la portada debe pasar a producción junto con ellos (y el backend de comunicados), no antes.

> Estilo visual favorito del dueño para presentar módulos: ver `docs/estilo-mosaico-favorito.md`.

## Versión 4 (27/11/2026): mosaico con todos los módulos

- `MosaicoModulos.jsx` pasa a componente de servidor (lo arma `src/app/(landing)/page.jsx` y entra a `LandingHome` como
  prop `mosaico`): las 24 tarjetas no van en el JavaScript de la portada (`/`: 37.1 kB → 36 kB; primera carga 207 → 206 kB).
- Tarjetas nuevas: Préstamos y bonos, Aguinaldos y finiquitos, Monitor en vivo, Vacaciones y permisos, Horas extra y
  turnos, Incidencias y reportes, Mapa de rutas, Empleados y expediente, Activos y uniformes, Mi espacio, Bolsa de
  trabajo, Evaluación de desempeño, Reglas de aviso, Centro de ayuda y API e integraciones. Detalle y reglas:
  `docs/estilo-mosaico-favorito.md`.
- `modulos.js`: se agregan «Préstamos y bonos» y «API e integraciones» (el total de «N herramientas» pasa de 45 a 47 y
  sale del mismo cálculo). Marquesina: Monitor en vivo, Préstamos sin intereses, Mapa de rutas, Bolsa de trabajo y API.
- ❓ PENDIENTE (dueño): la marquesina y `modulos.js` siguen diciendo «Aprobación por WhatsApp» (función descrita en esta
  página desde la versión 1); hoy va por el flujo externo anterior. Decidir si se mantiene o se cambia por «desde el
  celular» hasta que la aprobación por WhatsApp propia esté en producción.

## Versión 5 (27/11/2026): «Llévate ADAMIA a casa» — brochure y tríptico en PDF

Pedido del dueño: «Esos dos documentos, ponlos en la página principal, como descarga nuestra presentación o algo. Y
también en Cotizar, para que la gente los descargue y se los lleve a su casa».

| Archivo | Qué tiene |
|---|---|
| `public/descargas/adamia-brochure-comercial.pdf` | Brochure comercial: 4 páginas tamaño carta, 2.5 MB. |
| `public/descargas/adamia-triptico.pdf` | Tríptico: carta horizontal, 2 caras (2 páginas), 2.1 MB. |
| `public/descargas/*-portada.webp` | Miniaturas de portada (495×640 y 640×495). |
| `src/components/landing/descargas.mjs` | Lista única: título, una línea de qué es, ruta, nombre de descarga, páginas, bytes, miniatura y su `alt`. |
| `src/components/landing/DescargasAdamia.jsx` + `descargas.css` | Un solo componente para las dos páginas: variante `completa` (portada; se arma en el servidor en `src/app/(landing)/page.jsx` y entra a `LandingHome` como prop `descargas`, igual que el mosaico, para no sumar JavaScript: `/` queda en 35.7 kB) y `compacta` (Cotizar). |
| `scripts/test-descargas.mjs` | Archivo existe, es PDF, páginas y peso = lo que anuncia la tarjeta, miniatura con sus medidas, robots. |
| `scripts/verify-descargas.mjs` | Navegador a 1440 y 390 en `/` y `/cotiza`: dos tarjetas, `alt`, nombre accesible, `download`, descarga real con el nombre bonito, PDF 200 `application/pdf` con el peso anunciado, botón ≥ 48 px, miniatura dentro de su cuadro, lugar en el flujo, 16/17 px, títulos 700, secundario ≤ #4B5563, sin degradados, apiladas en celular, sin desborde, movimiento y «reducir movimiento», robots. Chromium se lanza con `LANG=C.UTF-8` (con locale C cambia «Tríptico» por «download»). Ambas pruebas en `ci-dev.yml`. |

Dónde va:
- **Portada** (`#descargas`): después de «Todos los módulos» (`#modulos`) y antes de «Ve ADAMIA en acción» (`#demo`):
  quien ya vio todo se lleva el material y luego pide la demostración. Título «Llévate ADAMIA a casa.», dos tarjetas
  lado a lado (miniatura, título, una línea, «PDF · 4 páginas · 2.5 MB» y «Descargar PDF»).
- **Cotizar** (`#descargas-cotiza`): después de las preguntas frecuentes y antes de «¿Listo para empezar?». Versión
  compacta: «¿Quieres compartirlo con tu equipo?» + miniatura pequeña, título, detalle y botón (sin la línea de qué es).
- **Contratar plan: no.** Es el formulario de alta y pago de alguien que ya decidió; un enlace de descarga ahí distrae
  del cierre (y lo sacaría a otra pestaña a media captura). Quien quiere compartir antes de decidir está en Cotizar.

Cómo se descarga: `<a href="/descargas/…pdf" download="ADAMIA - Brochure comercial.pdf" target="_blank" rel="noopener">`.
El atributo `download` pone el nombre bonito (mismo dominio); si el navegador no lo respeta, el PDF se abre en otra
pestaña. Nombre accesible: «Descargar el brochure comercial en PDF» / «Descargar el tríptico en PDF» (lo visible es
«Descargar PDF»; el resto va en `sr-only`).

Estilo: el del mosaico (`docs/estilo-mosaico-favorito.md`): tarjeta gris claro (`--soft`) de esquinas de 28 px,
miniatura sobre cuadro blanco con sombra suave; al pasar el cursor la tarjeta sube 4 px y la portada se acerca; quieta
con «reducir movimiento». **Sin fondos degradados.** Lectura: texto 16 px (17 px en celular), títulos de peso 700,
secundario `--body` (#4b5270, no más claro que #4B5563), botón de 52 px. En celular, una tarjeta debajo de la otra.

Analítica: el sitio solo carga el Pixel de Meta (con consentimiento de cookies, `GlobalThirdPartyScripts.jsx`) y no tiene
un helper para registrar eventos propios; por eso **no** se registran «descarga_brochure» / «descarga_triptico». Si se
quiere medir, primero hay que decidir el helper (y respetar el consentimiento) y luego conectarlo aquí.

SEO: `robots.js` de producción no bloquea `/descargas/` (lo revisan las dos pruebas); dev bloquea todo, como siempre.

### De dónde salen los PDF
- Diseños hechos en claude.ai (proyectos de diseño «brochure» y «tríptico» del dueño): el brochure son 4 hojas
  (portada, Tiempo y personas, Talento/cultura/IA y La ley de tu lado) y el tríptico 2 caras (exterior e interior).
- Se exportaron a HTML, se armaron con sus imágenes (capturas reales de ADAMIA con datos de ejemplo) y se imprimieron a PDF
  con Chromium a tamaño carta. Las miniaturas son la primera página en WebP.

**Regla: los PDF se mantienen al día con los módulos.** Cuando un módulo nuevo llegue a producción, cambie de nombre o una
función anunciada cambie (misma regla que el mosaico y `modulos.js`), se actualizan los diseños en claude.ai, se vuelven a
exportar los PDF y las miniaturas con el mismo nombre de archivo, y se ajustan `bytes` / `paginas` en `descargas.mjs`
(`scripts/test-descargas.mjs` falla si el PDF cambió y la tarjeta no). Nada que no esté en producción se anuncia en
ellos. ❓ PENDIENTE (dueño): los PDF mencionan el muro (comunicados con confirmación de leído), que al 27/11/2026
está en `dev` y no en `main`; deben pasar a producción junto con esa versión de la portada, no antes.
