# Funcionamiento automático sin conexión

## Uso

No hay botones de preparación ni es necesario cambiar a otro reloj. Al abrir con internet el reloj de empresa, el reloj del empleado o los paneles, la aplicación descarga en segundo plano sus recursos y conserva las consultas y pantallas utilizadas.

Si se pierde internet:

- Aparece **Sin conexión · Usando información guardada en este celular**.
- Los botones habituales de código, QR y reconocimiento facial guardan checadas localmente, conservando hora e identificador. Rostro, código, GPS y reglas de asistencia se validan en el servidor al sincronizar.
- RH y el panel del empleado permiten volver a las pantallas y consultas ya descargadas. Los menús conservan su navegación; una pantalla, filtro o página de resultados nunca descargada indica que necesita conexión.
- Las demás operaciones de escritura de RH no se simulan ni se encolan: necesitan internet. Esto incluye modificar empleados, autorizar permisos y subir documentos.
- Al recuperar internet, al volver a la app o cada 30 segundos con ella abierta, se envían los pendientes. No se promete ejecución con la app completamente cerrada.

La primera visita a una pantalla y la primera descarga de recursos necesitan conexión. Si la conexión cae antes de terminar la descarga inicial, no puede garantizarse la reapertura completa sin red. Cámara y GPS siguen requiriendo permisos del dispositivo. No se modificó la configuración de Capacitor ni se generó un APK.

## Checadas y turnos

Se reutiliza la tabla `checadas_offline` de la migración `20261103_offline_clock_events.sql`, ya aplicada en `adamia_dev`. Esta ampliación no requiere otra migración.

Cada intento se guarda en IndexedDB antes de enviarse. El servidor procesa movimiento, asistencia y recibo idempotente dentro de una transacción. Un reintento después de perder la respuesta devuelve el mismo recibo y no vuelve a alternar entrada/salida. Los pendientes anteriores de la misma identidad se envían primero.

La acción `auto` conserva el botón habitual Entrada / Salida. El servidor decide según el último movimiento confirmado. En turnos manuales conserva la decisión salida temporal / cerrar turno. Si esa decisión solo puede determinarse al sincronizar, la checada aparece en el aviso de pendientes con ambos botones; conserva el mismo UUID y hora original al elegir.

Los relojes de empresa se inicializan desde su enlace público, sin cuentas individuales. Una autorización firmada de propósito exclusivo `offline-company` limita el procesamiento a esa empresa. El servidor resuelve al empleado por código o rostro y nunca confía en un ID enviado por el celular. No se descarga el padrón biométrico. Un código rechazado no bloquea otros códigos; los rostros se conservan en orden como grupo porque su identidad solo se determina en el servidor.

Se conserva un máximo de siete días de antigüedad y dos minutos de tolerancia futura. Una entrada duplicada, una salida sin entrada o movimientos intercalados de otros dispositivos requieren revisión; no se reconstruyen silenciosamente. Las coordenadas y la hora del teléfono son evidencia reportada por el dispositivo.

No borrar los datos del navegador/app ni desinstalar mientras existan pendientes. La pantalla `/reloj-offline.html` se conserva únicamente por compatibilidad con los registros de la versión anterior.

## Consultas, pantallas y sesiones

- `app-cache.mjs` conserva respuestas JSON GET del backend y de las APIs de la aplicación. Nunca confirma una escritura offline, ni sustituye respuestas explícitas 401/403 por datos antiguos.
- Las consultas privadas se separan por SHA-256 del token actual. Las claves de caché no contienen el token ni cabeceras Authorization. Cerrar sesión elimina su caché de consultas y pantallas, manteniendo las checadas pendientes.
- Una sesión vencida no abre pantallas privadas. La puerta de arranque `/app-offline.html` comprueba el token actual y la identidad previamente validada antes de recuperar HTML. No usa un supuesto “último usuario”.
- El middleware marca las respuestas de pantallas con la huella de la sesión realmente verificada. Solo esas respuestas se guardan en su partición. Las instantáneas se actualizan al navegar online; los recursos JS/CSS/fonts se conservan por su URL versionada de Next.
- Las respuestas RSC también se separan por sesión y por estado del router. Sin conexión, los enlaces del menú usan navegación de documento para recuperar la pantalla completa ya guardada.
- Los datos públicos del reloj de empresa tienen una partición independiente y una lista limitada de endpoints permitidos; no dan acceso a consultas privadas de RH.
- Datos y configuración offline tienen una vigencia de siete días y se actualizan automáticamente con conexión.

## Verificación automatizada

- `node --test scripts/test-offline-app-cache.mjs`: aislamiento, vencimiento, logout, denegaciones del servidor, consultas no descargadas, datos públicos y rechazo de escrituras offline.
- `node --test scripts/test-offline-clock.mjs`: orden de colas, confirmación, decisión manual, persistencia y aislamiento de empresas.
- Backend: `node --test scripts/test-offline-clock.cjs scripts/test-company-offline-clock.cjs`: transacciones, reintentos, acción automática, cierres manuales, hora original, autorizaciones y resolución de empleados.
- `node scripts/verify-offline-panels.mjs`: Next y Chrome reales con APIs sintéticas y tráfico externo bloqueado. Prueba pantallas RH, panel del empleado, sesión distinta, descarga automática, botones habituales de checado sin red y sincronización tras perder una respuesta.
- `node scripts/verify-offline-clock.mjs`: compatibilidad del almacenamiento y pantalla anterior.
- Compilación de Next y ESLint de los archivos modificados.

## Prueba manual en dev

1. Abrir el enlace habitual del reloj de empresa en **https://dev.adamia.com.mx**. No realizar ninguna preparación.
2. Con internet, abrir también dos módulos de RH y, con la cuenta del empleado, Inicio y Mis asistencias. Dar tiempo a la descarga inicial en segundo plano.
3. Activar modo avión y apagar Wi-Fi. Volver a las pantallas consultadas: deben mostrar datos guardados y el aviso Sin conexión. Probar una pantalla no consultada para verificar el mensaje de datos no disponibles.
4. En el reloj habitual, registrar dos checadas con un empleado de pruebas, separadas al menos un minuto. Deben aparecer en el aviso de pendientes. Probar código/QR y luego rostro; no usar empleados reales para las pruebas.
5. Recargar y cerrar/abrir completamente el navegador o app sin conexión. Verificar conservación de menú, sesión y pendientes.
6. Recuperar conexión. Comprobar que los pendientes se sincronicen, que RH muestre las horas originales y que reconectar otra vez no cree duplicados.
7. Probar turno manual, GPS obligatorio concedido/denegado, vencimiento y cambio de sesión. Tras logout, otra cuenta no debe ver los datos guardados de la anterior.

Pendiente de validación física: Android/Capacitor, iPhone si aplica, cámara real, precisión GPS sin datos móviles y arranque completo de la WebView. Guardar dispositivo, hora de captura/reconexión y mensaje de error si ocurre un fallo.
