---
titulo: Configuración de evaluaciones y avisos por WhatsApp
resumen: Define qué verá cada quien en las campañas nuevas, la confidencialidad, los niveles jerárquicos, quién administra o consulta el módulo y los avisos por WhatsApp.
modulo: evaluaciones
audiencia: [rh, dueno]
pantallas: [/panel/evaluaciones/configuracion, /panel/evaluaciones/configuracion/niveles, /panel/evaluaciones/configuracion/acceso]
palabras: [configuración evaluaciones, valores iniciales, confidencialidad, anónimas, niveles jerárquicos, acceso al módulo, dirección, whatsapp, avisos, aviso de privacidad]
orden: 90
actualizado: 2026-11-27
fuentes: [src/components/evaluaciones/SettingsView.jsx, src/components/evaluaciones/InsightViews.jsx, src/lib/evaluaciones/vistas.mjs]
---

## Para qué sirve

La configuración define cómo empiezan todas las campañas nuevas: qué puede ver cada quien, qué tan confidenciales son las respuestas y qué avisos salen. También aquí ordenas los niveles jerárquicos y das acceso a otras personas.

## Quién la usa

RH y el dueño.

## Antes de empezar

Entra a **Evaluación de desempeño › Configuración**. Tiene tres secciones: **Valores iniciales**, **Niveles** y **Acceso al módulo**.

## Valores iniciales

En **Permisos y confidencialidad** enciende o apaga:

| Opción | Qué hace |
|---|---|
| Colaborador puede ver su puntaje | Muestra la calificación en su resultado. |
| Colaborador puede ver categorías | Muestra el resultado por categoría. |
| Colaborador puede ver comentarios | Muestra los comentarios publicados. |
| Colaborador puede ver su plan | Muestra su plan de desarrollo. |
| Jefe puede ver resultados publicados | El jefe consulta los resultados de su equipo. |
| Exigir aprobación antes de publicar | RH debe aprobar cada resultado antes de publicarlo. |
| Solicitar confirmación de recibido | La persona confirma que recibió su resultado. |
| Respuestas de pares anónimas | Agrupa a los pares y oculta autores. |
| Respuestas ascendentes anónimas | Agrupa al equipo que evalúa a su jefe. |
| Avisos por WhatsApp además del correo | Por responder, resultado publicado y acuse pendiente. |
| Jefes pueden pedir un borrador a Adamia AI | La IA sugiere; el jefe revisa y envía. Usa créditos. |
| Pedir leer el aviso de privacidad antes de enviar | Nadie envía una evaluación sin leer el aviso. |
| Al cerrar incompleta, calcular con lo respondido | Apagado, la calificación queda vacía mientras falte alguna respuesta. |

Abajo elige el **Mínimo de respuestas para perspectivas anónimas**. Presiona **Guardar preferencias**.

> **Importante:** Estos valores aplican a las campañas **nuevas**. Cada campaña guarda su propia configuración al lanzarse.

## Avisos por WhatsApp

En la misma pantalla, **Avisos por WhatsApp** te dice si el número de notificaciones de ADAMIA está listo. Se avisa por WhatsApp de: evaluación por responder, resultado publicado y acuse pendiente (a los 3 días sin confirmar, una sola vez). El correo sigue saliendo como respaldo. Los mensajes no llevan calificaciones ni comentarios.

En **Mensajes aprobados por WhatsApp (no se pueden cambiar)** ves el texto exacto de cada aviso.

![Configuración con las opciones de permisos y el estado de WhatsApp](/ayuda/capturas/evaluaciones/configuracion-whatsapp.webp "Valores iniciales y avisos por WhatsApp")

## Niveles

1. En **Niveles jerárquicos** crea tus niveles (por ejemplo, Operativo, Supervisión, Gerencia) con su **Orden**.
2. En **Asignar nivel a colaboradores** busca a cada persona y elige su nivel (o «Sin nivel»).
3. Para borrar un nivel no debe tener colaboradores asignados.

## Acceso al módulo

En **Acceso de RH y Dirección** das acceso a más personas:

1. Elige el **Perfil**: **Recursos Humanos** (administra) o **Dirección** (solo consulta).
2. Elige el **Tipo de cuenta**: **Usuario de panel** o **Empleado**.
3. Escribe el **Identificador de la cuenta** y guarda.

Para quitar un acceso usa **Revocar permiso**.

## Preguntas frecuentes

### ¿Si cambio una opción, cambian las campañas ya lanzadas?

No. Cada campaña congela su configuración al lanzarse.

### ¿Qué ve Dirección?

Campañas, tableros y resultados, sin poder modificar nada.

### ¿Los WhatsApp salen del número de mi empresa?

No. Salen del número de notificaciones de ADAMIA.

## Qué pasa si…

### …activo WhatsApp pero no llegan

Revisa que el estado diga que está listo y que las fichas tengan un celular válido. Si WhatsApp rechaza el mensaje (por ejemplo, plantilla aún no aprobada), el correo sigue llegando.

### …dice «Falta preparar la base de datos de evaluaciones»

Hace falta una actualización del sistema. Avisa a soporte de ADAMIA.

## Relacionado

- [Crear una campaña](/ayuda/evaluaciones/crear-campana)
- [Resultados, publicación y acuse](/ayuda/evaluaciones/resultados-y-acuse)
- [Qué es Adamia AI](/ayuda/adamia-ai/que-es-adamia-ai)
