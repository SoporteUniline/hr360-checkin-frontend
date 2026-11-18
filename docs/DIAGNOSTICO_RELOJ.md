# Diagnóstico del reloj checador

Mide cuánto tarda cada paso desde que se abre el reloj hasta que se registra la checada facial, para encontrar la causa real de la lentitud en celular. **No cambia el funcionamiento del reloj** y, apagado, no hace nada.

## Activar / apagar
- **En la app del celular:** en el reloj checador, toca **5 veces seguidas la hora grande**. Aparece «Diagnóstico activado» y la pantalla se recarga. Repite para apagarlo, o usa el botón **Apagar** del panel.
- **En navegador:** abre cualquier pantalla con `?diag=1` (se recuerda en ese equipo). `?diag=0` lo apaga.

Con el diagnóstico activo aparece un botón «Diagnóstico» abajo a la derecha en las pantallas del reloj.

## Qué mide
| Fase | Qué es |
|---|---|
| Validar usuario | De abrir la pantalla a tener los datos del empleado |
| Validar suscripción | Consulta de plan activo (la cámara espera a esto) |
| Descargar librería facial / Cargar modelos / Preparar detector | Archivos de reconocimiento (12.4 MB) y su preparación; si ya estaban, aparecen con tiempo negativo (se cargaron antes de abrir el reloj) |
| Abrir cámara | Incluye el permiso del sistema |
| Primer análisis de cuadro | Lo que tarda el primer cuadro (incluye compilar el detector) |
| Hasta detectar rostro | Desde que todo está listo hasta reconocer una cara |
| Primer envío al servidor | Respuesta de `/checador/reloj/registrar-facial` |
| Obtener GPS | Lectura de ubicación de alta precisión |
| Rostro detectado → checada registrada | Todo lo que pasa después de ver la cara (envíos + GPS) |

También guarda: número de cuadros analizados (promedio y máximo en ms), cuadros sin rostro, envíos, errores del servidor, y del equipo: app nativa o navegador, núcleos, memoria, tipo de red, GPU, motor de IA, resolución de cámara y si cada archivo de modelo vino de caché o se descargó.

**No guarda** el rostro (descriptor) ni coordenadas; solo la precisión del GPS en metros.

## Dónde queda guardado
1. **En el celular:** últimas 30 mediciones (sobreviven a cerrar la app). Panel → «Compartir reporte» (texto) o «Copiar todo (JSON)».
2. **En el servidor:** cada medición se envía a `POST /api/diagnostico/reloj` (requiere sesión válida) y queda una línea en el log de la app:
   ```bash
   docker compose logs frontend-dev | grep "\[diag-reloj\]"
   ```
   Si no hay internet o sesión, queda «⏳ pendiente» en el celular y se reintenta al volver a abrir (máx. 5 por vez). En el kiosco público sin sesión solo se guarda en el dispositivo.

## Archivos
- `src/lib/diagnostico-reloj/core.mjs` — registro y cálculo de fases (puro, con pruebas).
- `src/lib/diagnostico-reloj/index.js` — activación, datos del equipo, guardado y envío.
- `src/components/DiagnosticoReloj.jsx` — panel en pantalla.
- `src/app/api/diagnostico/reloj/route.js` — recepción en servidor (log).
- Marcas en `faceapi-browser.js`, `FacialRecognitionPanel.jsx`, `RelojChecador.jsx`, `empleado/reloj-checador/page.jsx` vía `globalThis.__adamiaDiag?.marca(...)`.
- Pruebas: `scripts/test-diagnostico-reloj.mjs`, `scripts/test-facial-startup.mjs` (caso con diagnóstico encendido).
