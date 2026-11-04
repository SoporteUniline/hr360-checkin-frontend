# Reloj offline del empleado

## Alcance

Desde `/empleado/reloj-checador`, **Preparar reloj offline** descarga una pantalla independiente y los modelos faciales (aproximadamente 13 MB). **Abrir reloj offline** permite registrar entradas, salidas y, cuando corresponde, salidas temporales o cierres de turno. Es para la cuenta individual del empleado; el reloj público y los kioscos compartidos conservan su funcionamiento actual.

La captura se conserva en IndexedDB y solo se marca sincronizada después de recibir una confirmación del mismo identificador. Se reintenta al recuperar conexión, al volver a la pantalla y cada 30 segundos mientras esté abierta. El reloj en línea también intenta enviar los pendientes de la cuenta activa. No se promete sincronización con la aplicación cerrada.

El reconocimiento facial offline **captura el descriptor**, pero la comparación con el empleado se hace en el servidor al sincronizar. No se descarga el padrón biométrico al celular. Código y descriptor de cada checada se eliminan localmente después de confirmar su recepción. El contenido numérico de un QR puede introducirse como código; esta pantalla no incluye escáner QR.

Se reutiliza el método de checado configurado, la exigencia de GPS y el tipo de cierre. El servidor comprueba nuevamente empleado/empresa activos, identidad de la sesión, código o rostro y áreas permitidas. El empleado no puede sincronizar registros de otra cuenta.

## Activación en dev

1. Migración autorizada por el usuario el 2026-11-04 para **dev**: `hr360-checkin-backend/migrations/20261103_offline_clock_events.sql`.
2. Aplicarla dentro del contenedor `adamia_backend_dev` mediante `node scripts/apply-offline-clock-dev.cjs --apply-dev`. El script exige `DB_NAME=adamia_dev` y verifica la identidad del servidor. No usa el `.env` local, que apunta a producción. Sin la tabla, el servidor devuelve un error temporal y las checadas permanecen en el celular.
3. Publicar frontend/backend únicamente con autorización. Los archivos de `public/offline-clock/`, `/reloj-offline.html` y `/offline-clock-sw.js` deben servirse en el mismo dominio HTTPS que la aplicación; el servidor debe servir `.mjs` como JavaScript.
4. En cada dispositivo, iniciar sesión como empleado, entrar al reloj y pulsar **Preparar reloj offline** con internet. Esperar a que confirme la descarga.

La preparación dura siete días y se vincula a la sesión actual. Cambiar sesión o cerrar sesión exige prepararlo nuevamente. Cerrar sesión desactiva la configuración local, conservando las checadas; iniciar sesión nuevamente con la cuenta original permite enviarlas desde el reloj en línea. No borrar datos del navegador/app ni desinstalar con pendientes.

## Integridad y conflictos

`GET /checador/reloj/offline/perfil` y `POST /checador/reloj/offline/sincronizar` requieren el middleware de autenticación existente y una cuenta `Empleado`. El cliente no decide qué empleado recibirá la asistencia: se toma del token verificado.

Cada evento tiene UUID, movimiento explícito y fecha UTC. La fecha se convierte a `America/Mexico_City`, como el flujo actual de movimientos. Se admite hasta siete días de antigüedad y dos minutos de tolerancia futura. La hora del teléfono y sus coordenadas son evidencia reportada por el dispositivo; no constituyen prueba inviolable de la presencia o del tiempo real.

El movimiento, la actualización de asistencia y el recibo idempotente se confirman en una transacción InnoDB. Repetir el mismo UUID/payload devuelve el recibo sin crear otro movimiento; reutilizarlo con datos distintos se rechaza. La tabla conserva hora reportada UTC, hora de recepción, hash y respuesta (método/movimiento). No almacena NIP ni descriptor facial.

El servidor rechaza una entrada si existe otra abierta, una salida sin entrada y cualquier evento anterior o igual al último movimiento registrado. No intenta reconstruir silenciosamente movimientos intercalados de otros dispositivos. La cola se detiene en el primer error para evitar que una salida adelante a una entrada. El error permanece visible: RH debe revisar el conflicto. Mientras haya pendientes, usar la pantalla offline para los siguientes movimientos.

Los métodos manuales reutilizan el agregador actual de asistencias, ahora con conexión transaccional opcional; las llamadas existentes conservan su conexión por defecto.

## Verificación realizada

- `node --test scripts/test-offline-clock.mjs`: aislamiento de colas, orden, fallos de red/escritura, confirmación y eliminación de evidencia confirmada.
- Backend: `node --test scripts/test-offline-clock.cjs`: validación de fecha, GPS, credenciales, identidad, transiciones, cierre manual, rollback y reintento idempotente usando dependencias simuladas, sin conectar a una base real.
- `node scripts/verify-offline-clock.mjs`: Chrome real con servidor HTTP y datos ficticios. Instala el service worker, verifica recursos faciales en caché, guarda sin red, recarga sin red, reconecta, confirma envío, conserva un rechazo y aísla otra sesión. No prueba reconocimiento de un rostro real ni escritura en MySQL.
- `npm run build` y ESLint sobre los archivos JSX modificados.

El script de navegador usa Chrome en su ruta habitual de Windows. Puede configurarse `CHROMIUM_EXECUTABLE_PATH` para otra instalación. Crea un perfil temporal aislado y no usa la sesión habitual del navegador.

## Verificación manual pendiente

- En una base de pruebas con la migración aplicada: entrada/salida automática, turno manual con salida temporal/reingreso/cierre, turno nocturno y asistencia ya generada por el cron.
- En Android/Capacitor y navegador móvil: preparar, activar modo avión, capturar, cerrar completamente, abrir sin red, reconectar y comprobar fecha/hora y ausencia de duplicados. El arranque de la WebView remota aún necesita esta validación; no se cambió la configuración nativa ni se generó un APK.
- Rostro real con permiso de cámara; GPS obligatorio concedido/denegado, área válida/inválida y disponibilidad de coordenadas sin datos móviles.
- Vencimiento de sesión, logout/login con pendientes, caída de red tras confirmar el servidor y conflicto con una checada hecha en otro dispositivo.
- Repetir en iPhone si se distribuirá allí. HTTPS, almacenamiento disponible y soporte de service workers son requisitos del modo offline.

En cambios futuros de la pantalla o modelos, incrementar la versión de caché en `public/offline-clock-sw.js` para sustituir los recursos descargados.

## Prueba concreta en el celular

Usar una cuenta de empleado de pruebas en **https://dev.adamia.com.mx**, con asistencia automática desactivada, código conocido y sin una entrada abierta previa. Para la primera prueba usar código y GPS opcional. No cambiar la hora del celular.

1. Entrar a `/empleado/reloj-checador`, pulsar **Preparar reloj offline** y esperar la confirmación de descarga. Abrir **Reloj offline**.
2. Activar modo avión y comprobar que Wi-Fi también esté apagado. Seleccionar **Entrada**, escribir el código y guardar. Debe indicar **Pendiente de sincronizar**.
3. Esperar al menos un minuto; seleccionar **Salida** y guardar. Deben aparecer dos pendientes con sus horas originales. Si el turno es manual, elegir **Cerrar turno**.
4. Recargar la página sin conexión. Deben seguir los dos pendientes y el formulario debe abrir. Cerrar completamente la app/navegador y volver a abrir sin internet: comprobar el mismo resultado; esta comprobación es especialmente importante en Capacitor.
5. Desactivar modo avión y abrir el reloj. Los dos registros deben cambiar a **Sincronizada**. Si no ocurre, pulsar **Sincronizar pendientes** y registrar el mensaje mostrado.
6. En el panel RH de **dev**, revisar **Registro de entradas y salidas** y **Registro de asistencia** para el empleado y fecha. Debe existir una entrada y una salida con las horas de los pasos 2/3, no la hora de reconexión.
7. Pulsar **Sincronizar pendientes** nuevamente y recargar. Los conteos en RH deben conservarse, sin duplicados.
8. Repetir con un empleado facial ya enrolado: preparar con internet, activar cámara sin red, guardar y sincronizar. La coincidencia se valida cuando se envía. Repetir GPS obligatorio dentro y fuera del área permitida; fuera del área debe conservarse pendiente con el motivo del rechazo.

Registrar dispositivo, navegador/app, empleado de prueba, horas de captura/reconexión y resultado de cada paso. Si hay errores, no borrar los datos del celular: conservar los pendientes para diagnóstico.

Referencia de almacenamiento: [transacciones IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB) y [service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).
