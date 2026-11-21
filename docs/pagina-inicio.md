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
  ubicación de menos de 60 s), sin internet, aprobación de permisos y vacaciones por WhatsApp, reporte semanal contra
  el límite de la LFT, reglas de aviso por correo (retardos, faltas, contratos, cumpleaños, aniversarios).
- El aviso «va a pasar / excede el límite semanal» hoy es **alerta en el panel**, no correo ni WhatsApp; la página lo
  dice así. Enviarlo por correo o WhatsApp sería un cambio aparte.
- «Solicitar demo» y «Contacto» llevan a `/contacto`; «Iniciar sesión» a `/login`.
- Respeta «reducir movimiento» del sistema operativo.

Pendiente: los componentes anteriores (`MarketingLanding.jsx`, `LandingHeader.jsx`) ya no se
usan; se borran solo con `CONFIRMO`.
