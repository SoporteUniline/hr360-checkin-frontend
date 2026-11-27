---
titulo: Cómo ver los recorridos de un empleado en el mapa
resumen: El Mapa de rutas muestra dónde checó una persona cada día (entradas y salidas con GPS), el tiempo que estuvo en cada lugar y permite exportar el reporte del día a PDF.
modulo: mapa-de-rutas
audiencia: [rh, dueno]
pantallas: [/panel/mapa-de-rutas]
palabras: [mapa de rutas, GPS, ubicación, recorrido, auditoría, permanencia, traslado, personal de campo, reporte de asistencia, puntos GPS]
orden: 10
actualizado: 2026-11-27
fuentes: [src/app/panel/mapa-de-rutas/page.jsx, src/app/panel/mapa-de-rutas/leaflet-maps.jsx, src/lib/mapaRutasApi.js]
---

## Para qué sirve

Para el personal que trabaja fuera (ventas, reparto, servicio técnico), el **Mapa de rutas** te deja auditar **dónde** checó cada entrada y salida, cuánto tiempo estuvo en cada lugar y cuánto tardó entre un punto y otro.

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

- Las personas deben checar con **ubicación**: en su ficha, pestaña **Checador y acceso**, activa **Checar GPS**. Ver [Cómo elegir la forma de checar de cada empleado](/ayuda/reloj-checador/como-checa-cada-empleado).
- Entra a **Gestión de personal → Mapa de rutas**.

## Cómo buscar los recorridos de una persona

1. Si tienes varias, elige la **Unidad de negocio**.
2. En **Empleado** escribe su nombre y elígelo de la lista.
3. En **Rango de fechas** elige los días (al entrar, los últimos 7 días).
4. Toca **Buscar**.

A la izquierda verás **Estadísticas** (cuántos días y registros) y la lista de **Días**. Toca un día para verlo.

![Mapa de rutas con la búsqueda de una persona y el mapa de su recorrido](/ayuda/capturas/mapa-de-rutas/mapa-de-rutas.webp "Elige a la persona y el rango; después toca un día para ver su recorrido")

## Cómo ver el recorrido en el mapa

En la pestaña **Mapa** cada checada con ubicación es un punto. Con los controles de arriba puedes **reproducir** el recorrido en orden, **pausarlo**, **regresar al inicio** y elegir la **Velocidad** (1x, 2x o 4x). A la derecha dice en qué punto vas.

## Cómo ver el reporte del día

Toca la pestaña **Reporte**:

- **Resumen del día**: registros, puntos GPS, entradas y salidas.
- **Movimientos detallados**: cada punto con su hora, su ubicación (latitud y longitud), si tiene GPS, cuánto tiempo **permaneció** en ese sitio y el **traslado** al siguiente. **Ver Ubicación** te lleva al punto.

![Pestaña Reporte con el resumen del día y los movimientos detallados](/ayuda/capturas/mapa-de-rutas/mapa-de-rutas-reporte.webp "Cada movimiento con su hora, su ubicación y el tiempo de permanencia")

La pestaña **Detallado** muestra un **Reporte de asistencia** del día con primera entrada, última salida, ubicaciones y checadas válidas, en una tabla con tipo, entrada, salida, permanencia y estado.

## Cómo exportar el reporte a PDF

Toca **Exportar reporte a PDF**. Sale un «Reporte de asistencia» con los movimientos del día y espacios para la firma del trabajador y del representante de la empresa.

## Preguntas frecuentes

### ¿Por qué un punto dice «Sin ubicación»?

Esa checada se hizo sin GPS (por ejemplo, en el reloj de la empresa o sin permiso de ubicación en el celular).

### ¿El mapa sigue a la persona todo el día?

No. Solo muestra los lugares donde **checó**. No es un rastreo continuo.

## Qué pasa si…

- **…no hay movimientos en el rango:** verás «Sin resultados · Selecciona un empleado y busca».
- **…el mapa no carga:** revisa tu conexión; el reporte y el detallado siguen funcionando.

## Relacionado

- [Cómo elegir la forma de checar de cada empleado](/ayuda/reloj-checador/como-checa-cada-empleado)
- [Cómo checar desde tu celular](/ayuda/reloj-checador/checar-desde-el-celular)
- [Cómo crear y ejecutar un reporte personalizado](/ayuda/reportes-personalizados/crear-y-ejecutar-un-reporte)
