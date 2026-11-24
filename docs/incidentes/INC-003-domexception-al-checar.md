# INC-003 · «The DOMException.message getter can only be used on instances of DOMException» al checar entrada (23/11/2026)

- **Síntoma (dueño):** al checar entrada salió ese mensaje en lugar del resultado.
- **Causa:** cuando `fetch` se rechaza con un `DOMException` (petición cancelada, almacenamiento bloqueado por Safari, etc.), axios lo copia con `AxiosError.from`, que lee las propiedades del **prototipo** de DOMException. El navegador lanza un TypeError (Safari: ese mensaje; Chrome: «Illegal invocation») y ese es el que se muestra. El error original quedaba oculto.
- **Reproducción (RED):** `scripts/test-fetch-seguro.mjs`, primer caso. Con axios 1.13.2 y un fetch que se rechaza con un DOMException, el mensaje es el del getter.
- **Corrección:**
  1. `src/lib/fetchSeguro.mjs`: axios usa un fetch que convierte el DOMException en un Error normal con el mismo nombre y mensaje (en `axios.defaults.env` y en la instancia de `src/lib/axios.js`).
  2. `public/offline-clock/app-cache.mjs`: si el navegador bloquea el almacenamiento (claves, caché), la petición sigue al servidor sin caché, en lugar de rechazarse. La versión del módulo pasa a `?v=5`.
- **GREEN:** `test-fetch-seguro.mjs` (3) pasa. Siguen pasando `test-offline-app-cache.mjs`, la lista de CI (201), `verify-reloj-acceso.mjs` y `verify-offline-clock.mjs` (Chrome real).
- **Pendiente de confirmar en el iPhone del dueño:** cuál era el DOMException original. Ahora se mostrará su mensaje real si vuelve a ocurrir.
