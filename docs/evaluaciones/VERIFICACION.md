# Verificación del frontend de evaluaciones

Fecha: 6 de octubre de 2026. Entorno local, sesión y personas ficticias. No se conectó una base de datos ni se hicieron mutaciones contra un backend real.

## Resultado

- ESLint de todos los archivos del módulo: correcto.
- `node --test scripts/test-evaluaciones.mjs`: **10 pruebas aprobadas**.
- `npm run build`: **correcto**, incluidas las rutas RH y empleado.
- Recorrido de navegador automatizado con Chromium/Playwright: **12 grupos de comprobaciones aprobados**, sin excepciones de página ni overlay de error.
- Escritorio 1440 px y móvil 390/320 px: sin desbordamiento horizontal del documento. Inspección de capturas de resumen, editor, respuestas y resultados.
- Se verificaron los flujos de guardado, tipos, cálculo, publicación, privacidad, recibo, planes y separación de usuario/empresa.

El comando agent-browser no pudo iniciar su daemon en este entorno; se realizó la verificación mediante Playwright con Chromium local. El build utilizó una fuente Inter local de prueba en lugar de descargar Google Fonts. Estas adaptaciones no cambian el código de producción ni agregan dependencias al proyecto.

## Casos de navegador cubiertos

1. Ruta del módulo dentro del layout y autenticación existentes.
2. Crear plantilla con los cinco tipos de respuesta; reordenar preguntas; vista previa; guardar.
3. Crear campaña, aplicar autoevaluación, seleccionar participante, revisar asignaciones e iniciar.
4. Borrador tras recargar; conservar `false` y `0`; envío definitivo de los cinco tipos.
5. Resultado esperado de **2.75**; aprobación y publicación de RH.
6. Empleado con score y comentarios deshabilitados: no aparecen calificación final ni comentario compartido; la nota privada tampoco aparece. Acuse con observaciones de desacuerdo.
7. Crear plan, actualizar estado como responsable y agregar enlace de evidencia.
8. Tablero ejecutivo, botón de exportación CSV, búsqueda de plantilla y editor de pesos/escala.
9. Vistas de escritorio y móvil; respuesta real a una evaluación en 320/390 px.
10. Ruta `/empleado/panel/evaluaciones` y perfil de empleado predeterminado.
11. Nueva sesión de otra empresa/usuario no ve las plantillas creadas en la primera.
12. Sin errores de página; solicitudes al backend ficticio de solo lectura. El módulo no hizo escrituras externas.

## Casos de reglas cubiertos

- Semilla consistente: plantillas, campañas, relaciones y sumas.
- Normalización de escala, opción, sí/no, número; texto excluido.
- Pesos de categoría/pregunta; categorías positivas sin respuestas; fechas inválidas.
- Descendente, ascendente, horizontal y self; duplicados.
- Ponderación 360 por promedios de perspectivas: **3.80** en el ejemplo, independiente del número de evaluadores.
- Umbral confidencial y resultado incompleto sin promedio final.
- Solo el asignado responde; evaluación enviada inmutable.
- Aprobación, publicación, acuse único y alcance de jefe/empleado.
- Versiones de plantillas y preferencias no alteran campañas iniciadas.
- Permisos de plan; datos locales corruptos; neutralización de fórmulas en CSV.

## Comandos para repetir

```bash
node --test scripts/test-evaluaciones.mjs
npx eslint --ext .js,.jsx,.mjs src/components/evaluaciones src/lib/evaluaciones src/app/panel/evaluaciones src/app/empleado/panel/evaluaciones
npm run build
```

Para navegador: `node scripts/verify-evaluaciones.cjs` requiere Playwright/Chromium de pruebas disponibles. El script arranca Next y un servidor de autenticación ficticio en el mismo proceso supervisor. Variables opcionales documentadas al inicio del script: ruta de Playwright, binario Chromium, directorio de salida, puerto y sustitución de fuente. No requiere credenciales reales.

## Límites de esta verificación

- El SQL es una **propuesta**: no fue aplicado ni verificado contra la base real. Cristian debe adaptarlo al motor, claves y migraciones existentes.
- No se verificaron correo, recurrencia automática, carga privada, firma verificable ni API de evaluaciones, porque todavía no existen.
- La autorización frontend y los fixtures no son una barrera de seguridad para datos reales; el documento de backend detalla los controles necesarios.
- El build conserva advertencias preexistentes de `face-api.js` por resolución de `fs` y advertencias de hooks de archivos ajenos al módulo. No bloquearon la compilación.
- La impresión utiliza el diálogo del navegador para guardar PDF. El script prueba el botón de exportación CSV; no certifica una plantilla PDF emitida por servidor.
