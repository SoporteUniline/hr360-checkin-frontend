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
