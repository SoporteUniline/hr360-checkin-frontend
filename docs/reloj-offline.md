# Funcionamiento automático sin conexión

## Intentos rechazados y continuidad de la cola

Un intento rechazado por código incorrecto, inexistente o ambiguo, rostro sin coincidencia, método no permitido o ubicación inválida se conserva para revisión, pero ya no bloquea el envío de checadas posteriores. Cada checada posterior debe superar sus propias validaciones. Esto aplica al reloj personal, al de empresa y a los registros históricos que conservaban la marca de bloqueo; no hace falta descartarlos manualmente. Estos intentos tampoco alteran el cálculo local de entrada/salida.

Los fallos de red, las respuestas sin confirmación, los errores de autorización y los rechazos desconocidos mantienen el orden de envío. Una decisión pendiente de cierre de turno sigue necesitando resolverse. No se borran capturas ni se convierten rechazos en asistencias aceptadas.

## Reloj de empresa abierto durante el día

Abrir el enlace público con internet descarga automáticamente las referencias faciales de la empresa, sin iniciar sesión ni usar botones de preparación. La autorización firmada del enlace limita la descarga a esa empresa y a la clave del dispositivo. Antes de depender del reconocimiento sin red, comprobar en el reloj el mensaje **Reconocimiento offline preparado en este dispositivo**. La primera descarga necesita conexión; un enlace nunca abierto no puede descargar rostros cuando ya no hay internet.

Con referencias preparadas y vigentes, el reloj identifica localmente a los empleados descargados aunque se pierda internet mientras permanece abierto. Cada checada conserva identidad, hora y decisión de entrada/salida por empleado; aparece como pendiente de subir y se sincroniza al recuperar conexión con la aplicación abierta. Las referencias de empresa se conservan al cerrar sesión. Un empleado nuevo o un cambio facial necesita descargarse con internet. No borrar los datos del navegador mientras haya pendientes.

El reloj público comprueba las referencias cada minuto mientras está visible, renueva descargas con cinco minutos de antigüedad y fuerza la renovación al recuperar internet. Los siete días son la vigencia máxima de una descarga sin renovar, no una solicitud de login semanal ni un borrado de checadas. Con internet se renueva automáticamente. Si permanece sin internet más de siete días, el reconocimiento necesita reconectar para renovar la autorización; los registros pendientes se conservan y siguen sujetos a las reglas de antigüedad de sincronización.

La cuenta individual del empleado también prepara las referencias de toda su empresa. Las capturas faciales de su reloj se procesan como reloj compartido, a nombre del empleado reconocido y con sus reglas de GPS y turno. Código/QR mantienen el flujo personal anterior. Mis asistencias muestra únicamente las capturas reconocidas del usuario actual y sus propios pendientes personales, nunca los de sus compañeros. El endpoint personal anterior se mantiene para compatibilidad. La verificación `scripts/verify-offline-panels.mjs` incluye preparación pública sin sesión, captura facial offline, firma, historial después de recargar, sincronización sin descriptor, confirmación facial online y cámara cerrada tras cambios de conexión, con cámara y detecciones sintéticas.

## Política actual: reconocimiento facial en el dispositivo

Con internet, la aplicación descarga automáticamente en segundo plano las referencias faciales, nombres, áreas GPS, política de cierre y estado de turno. RH prepara sus empresas asignadas y una cuenta de empleado prepara su empresa desde cualquier pantalla. El enlace público prepara su empresa al abrir el reloj, sin sesión. Conocer ese enlace permite descargar las referencias necesarias para reconocer localmente a los empleados de esa empresa. La preparación se hace en cada dispositivo y las referencias caducan a los siete días si no se renuevan.

La actualización se inicia al cargar la sesión y al recuperar conexión. Mientras se utiliza la aplicación se comprueba cada minuto y se renuevan las referencias que tengan cinco minutos o más; también se comprueba al volver a la aplicación. Los cambios se descargan en segundo plano, con dos empresas como máximo en paralelo, después de sincronizar la cola. No hay botón Actualizar rostros. La aplicación cerrada no promete ejecución en segundo plano del sistema operativo. Los recursos JS/CSS del reloj de empresa también se descargan al preparar su página para que pueda abrirse offline desde otra pantalla.

La confirmación de una checada guardada offline dice Pendiente de subir. Cuando hay referencias preparadas, también se utiliza la comparación local con conexión: se sube el resultado firmado sin enviar el descriptor. Un reloj sin preparar conserva el flujo facial online anterior hasta que se prepare.

Con conexión, el reloj espera la confirmación del servidor para ese UUID y conserva la palomita verde y el mensaje de éxito originales. Sin conexión, si se pierde la respuesta o no se logra confirmar la subida, conserva el registro y muestra Pendiente de subir. Un rechazo definitivo se muestra con su motivo y se conserva para revisión. Esperar la confirmación de recepción no repite el reconocimiento facial.

Sin conexión, el celular compara el descriptor capturado contra sus referencias usando el mismo modelo de 128 valores y similitud coseno mínima 0.95. Rechaza rostros sin coincidencia o ambiguos y comprueba GPS cuando corresponde. Resuelve entrada/salida con el estado descargado y la cola local; pide la decisión de cierre en turnos manuales. Solo después guarda nombre, empleado, acción y hora original con estado Rostro reconocido · Pendiente de subir, visible en Asistencias, Entradas y salidas e historial personal. No guarda ni envía el descriptor de esa nueva captura. Si el dispositivo no está preparado, mantiene código/QR disponibles y explica que necesita abrir el reloj con conexión para descargar los rostros. El reloj anterior `/reloj-offline.html` permanece como compatibilidad solo para código.

El service worker recupera también las URLs de módulos con versión numérica, incluida `/offline-clock/store.mjs?v=6`. Antes solo admitía `v=4`, por lo que una navegación offline podía impedir cargar el almacenamiento aunque el archivo sin parámetros ya estuviera descargado.

El navegador conserva una clave privada ECDSA P-256 no exportable en IndexedDB. La preparación entrega permisos firmados por el servidor para ese dispositivo, empleado, empresa y versión de referencia. Cada resultado local se firma incluyendo UUID, acción, hora, ubicación y permiso. Al sincronizar el servidor comprueba autorización e integridad, empleado/empresa activos, idempotencia y conflictos de movimientos; no vuelve a comparar rostro ni vuelve a calcular GPS o método para un resultado local autorizado. La firma acredita el dispositivo y la integridad del mensaje, no prueba por sí sola que el software del dispositivo sea incorruptible: este flujo confía en la decisión del reloj preparado. Los conflictos con otros dispositivos se conservan para revisión.

Cerrar sesión elimina las referencias faciales personales. Las referencias de empresa se conservan para el reloj previamente preparado, con su vencimiento de siete días, incluso si RH cierra sesión. Las checadas pendientes y la clave necesaria para firmar decisiones de turno se conservan; borrar referencias no elimina registros.

Los códigos/QR conservan el flujo anterior de validación al subir. Los pendientes faciales antiguos, sin resultado local firmado, mantienen su validación anterior; no se convierten automáticamente en reconocimientos locales. No se ejecutan migraciones ni se escriben datos al preparar las referencias.

Verificación frontend: `node --test scripts/test-local-face.mjs scripts/test-offline-clock-registration.mjs scripts/test-local-clock-events.mjs scripts/test-offline-clock.mjs scripts/test-offline-app-cache.mjs`. Backend: `node --test scripts/test-local-face.cjs scripts/test-offline-clock.cjs scripts/test-company-offline-clock.cjs tests/geofence.test.cjs tests/areaCheckRoutes.test.cjs`. `verify-offline-panels.mjs` usa Chrome, cámara simulada y detecciones sintéticas para probar preparación, comparación local, firma persistida, ambas consultas offline y sincronización sin descriptor. Falta validar con cámara y rostros reales en Android/iPhone. Esta sección sustituye las referencias históricas a validación facial exclusivamente en el servidor que aparecen abajo.

## Reapertura sin internet

El reloj público previamente preparado puede volver a abrirse desde su enlace en el mismo navegador, sin instalar una aplicación nativa. La primera descarga necesita internet. Si el navegador mantiene conexión a Wi-Fi pero no tiene salida a internet, un fallo al buscar actualizaciones del service worker no bloquea el uso de su versión activa. Una instalación inicial fallida sigue reportándose como incompleta.

Prueba de este arranque: `node --test scripts/test-offline-worker-startup.mjs`. La prueba `node scripts/verify-offline-panels.mjs` también cubre la recarga offline del enlace público y la sincronización posterior con datos y cámara sintéticos.

## Uso

### Navegación, raíz y rutas no descargadas

`NavMain` abre documentos completos al estar offline. Si RH tiene una sola empresa y su reloj ya está preparado, el menú abre su enlace guardado sin depender del selector ni de una consulta nueva. Con varias empresas, la pantalla offline permite elegir entre relojes previamente descargados. Los enlaces internos del reloj, la barra superior y los paneles también usan navegación de documento sin conexión.

Abrir `/`, `/panel`, `/empleado` o `/dashboard` offline recupera el inicio del rol cuando está descargado o la última pantalla privada disponible de la sesión actual. Se comprueba la identidad guardada y la vigencia de la sesión antes de escribir HTML privado. Sin sesión, la raíz puede recuperar el último reloj público preparado; nunca abre un panel privado. Con varios relojes sin un último destino conocido, muestra sus enlaces.

Una ruta no descargada muestra un aviso, las pantallas disponibles y un botón para reintentar, conservando los pendientes. Las navegaciones y peticiones RSC esperan como máximo ocho segundos antes de intentar la recuperación; las consultas API mantienen su límite de doce segundos. Una denegación explícita de acceso no se sustituye por información privada antigua.

Esto no descarga automáticamente todos los módulos ni habilita escrituras offline fuera de las checadas. Cada pantalla y consulta requiere una primera carga completa con internet. La prueba de Chrome `scripts/verify-offline-panels.mjs` incluye raíz pública y privada, regreso desde una ruta desconocida, botones de NavMain y navegación entre reloj y panel sin conexión.

### Envío con la pestaña cerrada

Cada captura pendiente solicita `adamia-clock-upload` mediante Background Sync cuando el navegador lo admite. El service worker abre IndexedDB y envía las colas aunque no quede una página de la aplicación abierta. Usa los mismos recibos por UUID, orden y reglas de revisión; solo elimina evidencia de capturas confirmadas. Fallos de red o respuestas sin confirmación conservan el pendiente y solicitan al navegador un reintento. Conflictos definitivos y decisiones manuales quedan para revisión al abrir la aplicación.

El reloj público usa el permiso de empresa que ya contiene la captura. El reloj personal usa `/internal/offline-clock/sync`, un alias de la API de Next compatible con el proxy de dev. El servidor compara la huella de la sesión preparada con la cookie vigente y reenvía al backend configurado. No se guarda un token adicional en IndexedDB. Cerrar sesión, cambiar de cuenta o una sesión vencida mantienen las capturas pendientes hasta iniciar sesión y reabrir.

El navegador y el sistema operativo deciden cuándo ejecutar y reintentar; no se garantiza envío inmediato al encender internet, ejecución con el navegador forzado a cerrar ni compatibilidad universal. Si no hay Background Sync o se deniega el permiso, se conserva el envío al reconectar con la página abierta y al volver a ella. La renovación de rostros continúa necesitando la aplicación abierta.

Pruebas: `node --test scripts/test-background-sync.mjs`. `node scripts/verify-offline-clock.mjs` comprueba una subida y su persistencia en Chrome sin documento de la aplicación abierto; dispara el evento real `sync` mediante CDP para no depender del temporizador del navegador. Falta validar la programación automática del sistema con pantalla bloqueada y dispositivos reales.

El reloj y las pantallas de Asistencias y Entradas y salidas incluyen una barra de navegación directa solo en móvil. Sus botones permanecen en una fila con desplazamiento horizontal si no caben. RH ve los relojes de sus empresas asignadas; los empleados ven su reloj y Mis asistencias. El reloj público sin sesión no muestra enlaces a consultas privadas. Los enlaces recuperan la pantalla completa cuando no hay conexión, incluida la ruta pública del reloj de empresa. Las pantallas de destino deben haberse visitado con internet antes de usarlas offline. Si todavía no se conoce el enlace de una empresa sin conexión, se indica que necesita conexión en lugar de prometer acceso al reloj.

Entradas y salidas incorpora las capturas locales pendientes dentro de la misma tabla, con fecha/hora original y estado Pendiente de sincronizar, Requiere revisión o Requiere decisión de turno. Se respetan la empresa asignada, el rango de fechas en la zona horaria de la empresa y la búsqueda por nombre conocido o código. Un movimiento automático conserva la etiqueta Entrada / salida por confirmar hasta la validación del servidor. Estas filas no son editables como movimientos confirmados, no se suman a los indicadores ni a las exportaciones y desaparecen como locales al confirmarse o descartarse. La tabla vuelve a consultar al servidor tras los cambios de la cola. Las capturas solo están disponibles en el dispositivo/navegador que las guardó.

El aviso flotante inicia reducido y usa azul claro. El reloj muestra una etiqueta breve de conexión junto al encabezado, en lugar del aviso amarillo grande. Pruebas de selección y aislamiento: `node --test scripts/test-local-clock-events.mjs`.

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

Los relojes de empresa se inicializan desde su enlace público, sin cuentas individuales. Una autorización firmada de propósito exclusivo `offline-company` limita la preparación y el procesamiento a esa empresa. Se descargan las referencias biométricas de sus empleados habilitados para rostro; cada referencia lleva un permiso ligado al dispositivo. El servidor verifica el resultado firmado, no confía en un ID sin esa autorización. Los pendientes faciales antiguos que no tengan resultado local firmado mantienen la resolución de identidad en el servidor.

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

## Conflictos de entrada y salida

Con conexión, el botón automático envía la intención de checar y el servidor decide entrada o salida con el estado vigente dentro de la transacción. El reconocimiento facial sigue siendo local. Sin conexión, se conserva la acción decidida en el celular y su hora original; no se convierte después una entrada rechazada en salida.

Las referencias descargadas y los comprobantes de sincronización incluyen un estado del turno con revisión creciente: abrir un movimiento y cerrar ese mismo movimiento tienen revisiones distintas. El celular utiliza el estado más reciente, aunque la captura pendiente sea anterior a la descarga. Esto evita duplicar cambios ya incluidos en una descarga o ignorar una entrada que acaba de subirse.

Los conflictos devuelven códigos específicos y el estado vigente. La captura permanece para revisión de RH y no impide una nueva checada online; tampoco se reenvía ni se descarta automáticamente. Los rechazos antiguos se reconocen por su mensaje. Para continuar offline después de un rechazo antiguo sin estado, se necesita reconectar y descargar el estado actualizado. Una checada automática cuyo envío aún no está confirmado debe sincronizarse antes de calcular otro movimiento offline.

Prueba de regresión: abrir un turno desde otro dispositivo después de descargar referencias; checar online en el primero debe registrar salida, mostrar palomita y conservar cualquier conflicto histórico. Repetir la sincronización no debe insertar otro movimiento. Probar también entrada y salida offline, reconexión y una nueva checada offline después de sincronizar.

## Prueba manual en dev

1. Abrir el enlace habitual del reloj de empresa en **https://dev.adamia.com.mx**. No realizar ninguna preparación.
2. Con internet, abrir también dos módulos de RH y, con la cuenta del empleado, Inicio y Mis asistencias. Dar tiempo a la descarga inicial en segundo plano.
3. Activar modo avión y apagar Wi-Fi. Volver a las pantallas consultadas: deben mostrar datos guardados y el aviso Sin conexión. Probar una pantalla no consultada para verificar el mensaje de datos no disponibles.
4. En el reloj habitual, registrar dos checadas con un empleado de pruebas, separadas al menos un minuto. Deben aparecer en el aviso de pendientes. Probar código/QR y luego rostro; no usar empleados reales para las pruebas.
5. Recargar y cerrar/abrir completamente el navegador o app sin conexión. Verificar conservación de menú, sesión y pendientes.
6. Recuperar conexión. Comprobar que los pendientes se sincronicen, que RH muestre las horas originales y que reconectar otra vez no cree duplicados.
7. Probar turno manual, GPS obligatorio concedido/denegado, vencimiento y cambio de sesión. Tras logout, otra cuenta no debe ver los datos guardados de la anterior.

Pendiente de validación física: Android/Capacitor, iPhone si aplica, cámara real, precisión GPS sin datos móviles y arranque completo de la WebView. Guardar dispositivo, hora de captura/reconexión y mensaje de error si ocurre un fallo.

## Corrección de navegación en Safari y rechazo facial

El menú RH usa botones con `router.push`, no enlaces. Sin conexión ahora fuerza la apertura de la pantalla completa guardada; la capa de fetch también recupera las navegaciones programáticas para no entregar un parche RSC fallido a React. Las instantáneas comprueban que sus recursos JS/CSS se hayan descargado y no reutilizan cabeceras de compresión de un cuerpo ya decodificado. Los assets públicos ignoran variaciones de cabeceras de transporte al recuperar la misma URL.

Los rechazos definitivos de validación se conservan con estado `review`, motivo del servidor y código de causa; no se cuentan como pendientes de envío ni como asistencias aceptadas. Se mantiene UUID, hora y evidencia para revisión o reintento explícito. Un rostro no reconocido no bloquea otras capturas faciales válidas ni los códigos. No se redujo el umbral de coincidencia facial. El servidor informa por separado rostro sin coincidencia, método permitido, GPS obligatorio/fuera de área y autorización vencida.

`scripts/verify-offline-webkit.cjs` verifica el menú real de RH en WebKit con perfil iPhone, ambas tablas con registros y un rechazo facial 403 con su motivo visible. Usa un servidor de APIs sintéticas en loopback; para construir ese fixture se utiliza `NEXT_PUBLIC_RUTA_BACKEND=http://127.0.0.1:4561/api` únicamente en el entorno del comando de build. Playwright se resuelve mediante `PLAYWRIGHT_MODULE_PATH` o una instalación de pruebas; no se requiere como dependencia del producto. WebKit automatizado no sustituye la comprobación en el iPhone físico.

Después de actualizar dev, recargar Safari con conexión y abrir Asistencias y Entradas y salidas una vez antes de repetir la navegación offline. No borrar datos de Safari: los registros pendientes/rechazados se conservan durante esta actualización.
