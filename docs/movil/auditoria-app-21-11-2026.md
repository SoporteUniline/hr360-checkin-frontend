# Auditoría de la app móvil — reloj checador y vistas del empleado (21/11/2026)

Pedido del dueño: «que no se corte en formato app móvil» (captura en iPhone: la hora y la batería del sistema encima del
encabezado del reloj). La app nativa (Capacitor) abre `adamia.com.mx`: los cambios llegan a la app al pasar a producción.

## Cómo se midió
`scripts/auditar-movil-app.mjs`: build local con backend simulado, iPhone simulado con la muesca y la barra de inicio
(CDP `Emulation.setSafeAreaInsetsOverride`, arriba 47 px y abajo 34 px), anchos 320, 375, 390 y 430 px. Por pantalla mide:
contenido debajo de la hora/batería, botones sobre la barra de inicio, desborde horizontal, textos cortados y avisos que
tapan la barra inferior. Pantallas: reloj (empleado y empresa; pestañas Rostro, Código y QR), Inicio, Asistencia,
Solicitudes (y el formulario «Nueva solicitud»), Mi espacio, Mis recibos, Mis préstamos, Mis activos, Evaluaciones,
Solicitudes de equipo e Iniciar sesión.

## Antes → después
| Hallazgo | Antes | Después |
|---|---|---|
| Reloj: menú, logo y hora debajo de la hora/batería del sistema | 16 de 16 vistas del reloj | 0 (deja el espacio de la muesca y queda fija arriba) |
| Avisos tapando la barra inferior del reloj / navegación del empleado | visto en captura (cámara) | arriba en el reloj; encima de la navegación en Mi espacio |
| «Tipo de permiso» cortado a 320 px | 1 | 0 (pasa a dos líneas) |
| Ventana «Turno abierto» sobre la barra de inicio | revisión de código | deja el espacio de la barra de inicio |
| Total | 36 de 56 sin problemas | 60 de 60 sin problemas |

## Pendiente
- Validar en iPhone y Android reales (el simulador no reemplaza al dispositivo). Horizontal (landscape) no se midió.
- Estados no recorridos: resultado de checada (éxito/error), cámara encendida con rostro, firma de documentos.
