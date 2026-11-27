---
titulo: Integraciones y llaves de API
resumen: Conecta tu sistema de nómina, ERP o control de acceso con ADAMIA. Crea llaves de API con permisos y vigencia, cámbialas sin cortar el servicio, revócalas y revisa su uso.
modulo: integraciones
audiencia: [dueno]
pantallas: [/panel/integraciones]
palabras: [integraciones, api, llave de api, api key, token, conectar sistema, erp, nómina externa, revocar llave, rotar llave, desarrolladores, límite de peticiones]
orden: 10
actualizado: 2026-11-27
fuentes: [src/components/integraciones/IntegracionesEmpresa.jsx, src/components/integraciones/DialogoNuevaLlave.jsx, src/components/integraciones/ListaLlaves.jsx, src/lib/integraciones/integraciones.mjs]
---

## Para qué sirve

La **API de ADAMIA v1** permite que otro sistema de tu empresa (por ejemplo, tu nómina externa, tu ERP o tus torniquetes) consulte empleados y asistencias, o dé de alta y actualice empleados, sin que nadie capture dos veces. Para eso, el otro sistema necesita una **llave de API**: una clave secreta que tú creas aquí, con los permisos que decidas.

Cada llave **solo ve una empresa** y **solo lo que le permitas**.

## Quién la usa

**Solo el dueño de la cuenta.** La persona que programa la conexión (tu proveedor o tu área de sistemas) usa la llave y la documentación pública para desarrolladores.

## Antes de empezar

- Entra por **Ajustes → Integraciones**. Si tienes varias empresas, elige la empresa: cada una tiene sus propias llaves.
- Ten claro qué necesita hacer el otro sistema para darle solo esos permisos.
- La documentación técnica está en la página pública para desarrolladores: [adamia.com.mx/desarrolladores](https://adamia.com.mx/desarrolladores). También la abres con **Ver documentación**.
- Arriba, en **API de ADAMIA v1**, ves la dirección base que usa el otro sistema: `https://adamia.com.mx/api/integracion/v1`. Compártela con quien programa la conexión junto con la documentación.

![Pantalla de integraciones con llaves](/ayuda/capturas/integraciones/integraciones-llaves.webp "La API, la lista de llaves con su estado y el uso reciente")

## Qué puede hacer una llave

| Permiso | Qué permite |
| --- | --- |
| Consultar empleados | Lista y ficha de empleados (sin contraseña, PIN, rostro ni nómina) |
| Crear y actualizar empleados | Altas y cambios con las mismas reglas del panel. No borra |
| Consultar asistencias | Asistencias por fecha o por rango de hasta 31 días |

**Límite:** 60 peticiones por minuto por llave. Puedes tener hasta 25 llaves activas por empresa.

## Cómo crear una llave

1. Presiona **Crear llave**.
2. Escribe un **Nombre** que diga para qué es, por ejemplo «Nómina externa» (de 3 a 80 caracteres).
3. Marca los **Permisos** que necesita. Por omisión vienen marcados Consultar empleados y Consultar asistencias.
4. En **Vence en** elige 90 días, 1 año, 30 días o Sin vencimiento.
5. Presiona **Crear llave**.
6. Se abre **Copia tu llave ahora**. Presiona **Copiar llave** y guárdala en un lugar seguro (un gestor de contraseñas o la configuración del otro sistema).
7. Presiona **Ya la guardé**.

![Ventana Nueva llave de API](/ayuda/capturas/integraciones/nueva-llave.webp "Nombre, permisos y vigencia")

![La llave se muestra una sola vez](/ayuda/capturas/integraciones/llave-creada.webp "La llave completa solo se ve en este momento")

> **Importante:** La llave completa **se muestra solo esta vez**. ADAMIA no la guarda de forma que se pueda volver a ver. Si la pierdes, revócala y crea otra.

> **Ojo:** Nunca pongas la llave en una dirección web (URL), en un correo ni en el código de una página. El otro sistema debe enviarla en la cabecera de cada petición, como explica la documentación.

## Cómo leer la lista de llaves

Cada llave muestra su nombre, su estado (**Activa**, **Vencida** o **Revocada**), sus permisos, el inicio de la llave para reconocerla (por ejemplo «adk_live_Xk29PqLm…»), cuándo se creó, cuándo vence y su **Último uso** («Sin uso todavía» si nunca se ha usado).

## Cómo cambiar una llave sin cortar el servicio

Es buena práctica cambiar las llaves de vez en cuando o en cuanto alguien que la conocía deja la empresa:

1. Crea una llave nueva con los mismos permisos.
2. Pide a quien administra el otro sistema que la cambie por la anterior.
3. Revisa en **Uso reciente** que ya entren peticiones con la llave nueva.
4. Revoca la llave anterior.

## Cómo revocar una llave

1. Presiona **Revocar** en la llave.
2. Confirma con **Revocar llave**: «Los sistemas que usan esta llave dejarán de funcionar de inmediato. No se puede deshacer: si la necesitas otra vez, crea una nueva.».
3. Verás un aviso de que la llave quedó revocada: los sistemas que la usaban ya no podrán entrar.

## Cómo revisar el uso

![Uso reciente de la API](/ayuda/capturas/integraciones/uso-reciente.webp "Las últimas peticiones con su resultado")

En **Uso reciente** ves las últimas 30 peticiones con su método, ruta, resultado y tiempo de respuesta. ADAMIA **nunca guarda los datos enviados**, solo esa información, y la conserva 90 días.

| Color del resultado | Qué significa |
| --- | --- |
| Verde (200 a 299) | La petición funcionó |
| Ámbar (400 a 499, incluido 429) | Error del otro sistema: datos incorrectos, permiso faltante o demasiadas peticiones |
| Rojo (500 o más) | Error del servidor. Comparte con soporte el identificador de la petición que recibió el otro sistema |

## Preguntas frecuentes

### ¿Puedo ver una llave que ya creé?

No. Solo se muestra al crearla. Si la perdiste, crea una nueva y revoca la anterior.

### ¿Qué pasa cuando una llave vence?

Deja de funcionar y aparece como **Vencida**. Crea una nueva antes de que venza para no cortar la conexión.

### ¿Una llave puede borrar empleados?

No. Con «Crear y actualizar empleados» puede dar de alta y modificar (incluso dar de baja cambiando el estado), pero no borrar.

### ¿Un usuario con acceso puede crear llaves?

No. Integraciones es solo del dueño de la cuenta.

## Qué pasa si…

- **…aparece «Las llaves de API aún no están activadas en este servidor. Avísale a soporte de ADAMIA.».** El botón **Crear llave** se desactiva; contacta a soporte.
- **…el nombre es muy corto.** Verás «Escribe un nombre de 3 a 80 caracteres (p. ej. «Nómina externa»).».
- **…no marcas ningún permiso.** Verás «Elige al menos un permiso.».
- **…el otro sistema manda la llave en la URL.** ADAMIA la rechaza; revoca esa llave y crea otra.
- **…el otro sistema pasa el límite por minuto.** Recibe un error 429 y debe esperar el tiempo que le indica la respuesta.

## Relacionado

- [Roles y permisos por módulo](/ayuda/usuarios/roles-y-permisos)
- [Seguridad, Face ID y sesiones abiertas](/ayuda/seguridad/face-id-y-sesiones)
