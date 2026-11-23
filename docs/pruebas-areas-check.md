# Pruebas de áreas y reloj checador

Realizar en un entorno de pruebas y con un empleado de prueba. No utilizar asistencias reales.

Los cambios requieren frontend y backend actualizados: el reloj envía `precision_metros` y `ubicacion_timestamp` (epoch en milisegundos). Un cliente anterior sin esos datos no podrá checar cuando tenga GPS obligatorio. No se requieren migraciones.

## Configuración y mapa

1. Crear un área de 100 m y seleccionar explícitamente el punto del lugar. El mapa requiere Google Maps con facturación regularizada.
2. Cambiar el radio a 50 m y el nombre. Pulsar el mapa y arrastrar el marcador: el nombre y el radio deben conservarse y el círculo debe actualizarse.
3. Guardar, volver a abrir y comprobar el punto y el radio.
4. Crear un área desde el formulario de empleado y comprobar que se puede seleccionar y guardar su asignación.
5. Confirmar que un usuario de otra empresa y un empleado no puedan administrar áreas ni asignaciones.

## Ubicación y checado

1. Activar “Checar GPS” y asignar el área al empleado de prueba.
2. En un celular con ubicación precisa habilitada, checar dentro y fuera del radio, por código y facial. El rechazo fuera del área muestra distancia al centro, radio y precisión.
3. Comparar el celular conectado a Starlink y a datos móviles, sin moverlo. Registrar precisión y resultado; repetir en interior y exterior.
4. Repetir en una computadora conectada a Starlink. Si la ubicación es aproximada, debe aparecer el aviso y rechazarse la lectura, sin ampliar el radio.
5. Denegar ubicación: el empleado con GPS obligatorio no debe registrar asistencia. Permitirla de nuevo y reintentar sin recargar.
6. Desactivar “Checar GPS”: código y facial deben funcionar sin solicitar ubicación.
7. Comprobar salida temporal y cierre manual, además de entrada/salida normal.

## Criterio actual

- Radio del área: entre 10 y 1000 m, medido desde el centro.
- Lectura de hasta 60 segundos de antigüedad, con tolerancia de 5 segundos hacia el futuro para el reloj del dispositivo.
- Precisión reportada mayor que cero y menor o igual al radio, con un máximo de 50 m.
- La precisión no se suma al radio y no garantiza la posición exacta ni detecta coordenadas falsificadas.
- Una lectura cercana al límite sigue teniendo incertidumbre. Ajustar el radio después de probar el sitio real.

## Comprobaciones automatizadas

Frontend: `node --test scripts/test-check-location.mjs scripts/test-gps-on-demand.mjs scripts/test-facial-startup.mjs scripts/test-retire-offline-worker.mjs`

Backend: `node --test tests/geofence.test.cjs`

Estas pruebas utilizan dependencias simuladas y no escriben asistencias ni se conectan a una base de datos.


## Integración con las ramas de desarrollo

El reloj de desarrollo utiliza la cola offline también cuando hay conexión. La cola conserva precisión y hora de medición; el servidor compara la antigüedad de la ubicación contra la hora de captura de la checada, para permitir la sincronización posterior. Los registros pendientes antiguos que no tengan precisión disponible requieren revisión si el empleado exige GPS.

Comprobar también `scripts/test-offline-clock.mjs` y `scripts/test-offline-app-cache.mjs` en frontend, y `scripts/test-offline-clock.cjs` y `scripts/test-company-offline-clock.cjs` en backend.
