---
titulo: Confirmación de lectura y seguimiento
resumen: Pide que cada persona confirme que leyó un comunicado, ve quién falta, recuérdale y descarga la constancia en PDF.
modulo: comunicados
audiencia: [rh, dueno]
pantallas: [/panel/comunicados/[id], /panel/comunicados/administrar]
palabras: [confirmación, confirmar de leído, enterado, seguimiento, quién falta, recordar, recordatorio, constancia, pdf, evidencia, auditoría, avisado en persona, lectura, administrar]
orden: 30
actualizado: 2026-11-27
fuentes: [src/app/panel/comunicados/[id]/page.jsx, src/app/panel/comunicados/administrar/page.jsx, src/components/comunicados/Seguimiento.jsx, src/components/comunicados/PanelComunicados.jsx, src/components/comunicados/Redactar.jsx, src/lib/comunicados/comunicados.mjs]
---
## Para qué sirve

Cuando un aviso es importante (una auditoría, un reglamento, un cambio de horario) necesitas saber quién ya lo leyó. Con la **confirmación de leído** cada persona toca **Confirmar de leído** y ADAMIA guarda su nombre, la fecha, la hora, la IP y el dispositivo. Esa evidencia sirve ante una auditoría.

## Quién la usa

Recursos Humanos y el dueño de la cuenta. Un usuario con acceso de solo **ver** puede consultar el seguimiento y descargar la constancia, pero no recordar ni archivar.

## Antes de empezar

- El comunicado debe publicarse con el nivel **Requiere confirmación de leído**. Ve [Cómo publicar un comunicado](/ayuda/comunicados/publicar-comunicado).
- La lista de personas se arma al publicar: solo cuentan los empleados activos que estaban en la audiencia en ese momento.

## Cómo pedir confirmación de leído

1. En **Nuevo comunicado**, en **Nivel de importancia**, elige **Requiere confirmación de leído**.
2. Deja marcado **Recordar automáticamente cada 24 h a quien no ha confirmado** y elige el **Máximo** de veces (de 1 a 3).
3. Si quieres que nadie lo pase por alto, marca también **Aviso emergente** en **Por dónde llega**.
4. Publica como siempre.

Cada persona verá «Requiere tu confirmación» y la casilla **Leí el comunicado y estoy enterado**.

## Cómo ver quién ya confirmó

1. Entra a **Comunicados › Administrar**. En la columna **LECTURA** verás, por ejemplo, «30 de 42 confirmaron».
2. Haz clic en el título del comunicado para abrir su seguimiento.
3. Arriba están los totales: **Confirmaron «Enterado»**, **Lo abrieron sin confirmar**, **No lo han abierto** y **Sin canal (avisar en persona)**.
4. Usa las pestañas **Faltan**, **Confirmaron** y **Todos** para ver a cada persona y su estado: «Confirmó…», «Abrió 9:40, sin confirmar», «No lo ha abierto» o «Sin app ni correo».

![Seguimiento de un comunicado con los totales, la lista de personas y las entregas por canal](/ayuda/capturas/comunicados/seguimiento.webp "Seguimiento: quién confirmó, quién falta y por dónde le llegó")

A la derecha ves **Así lo ven** (cómo se ve el comunicado) y **Entregas por canal** (cuántos se entregaron por push, correo y aviso).

En un comunicado **Normal** las pestañas son **Sin ver**, **Ya lo vieron** y **Todos**.

## Cómo recordar a los que faltan

1. En el seguimiento, haz clic en **Recordar a los 12 que faltan** (el número cambia).
2. Verás «Listo: le recordamos a las 12 personas que faltan.» Les llega por notificación y correo.

Además de este botón, si dejaste encendido el recordatorio automático, ADAMIA les recuerda cada 24 horas hasta el máximo que elegiste.

## Cómo registrar que avisaste en persona

A quien no tiene app ni correo hay que avisarle de frente.

1. En la pestaña **Faltan**, busca a la persona con «Sin app ni correo».
2. Haz clic en **Marcar avisado en persona**.
3. Queda registrado con tu nombre y la hora, por ejemplo «Avisado en persona por Laura Ríos · 27/11/2026 10:15».

## Cómo descargar la constancia en PDF

1. En el seguimiento de un comunicado con confirmación, haz clic en **Descargar constancia (PDF)**.
2. Se descarga un PDF con el logo, el resumen y el detalle de cada persona, con número de página.

## Cómo usar la lista «Administrar»

En **Comunicados › Administrar** ves todo lo que se ha publicado:

- Arriba, **Publicados este mes**, **Lectura promedio**, **Confirmaciones pendientes** y **Programados**.
- Filtros: **Todos**, **Requieren confirmación**, **Programados**, **Automáticos**, **Borradores** y **Por aprobar**.
- **Buscar por título** para encontrar uno rápido.

![Lista de comunicados con el resumen, los filtros y la lectura de cada uno](/ayuda/capturas/comunicados/administrar.webp "Comunicados › Administrar")

## Cómo archivar un comunicado

1. En el seguimiento, haz clic en **Archivar** y confirma con **Archivar**.
2. Deja de verse en el muro y ya no se recuerda. El historial y las confirmaciones se conservan.

## Preguntas frecuentes

### ¿Abrir el correo cuenta como confirmación?

No. Solo cuenta tocar **Confirmar de leído** en la app o en el aviso emergente. Abrir el comunicado cuenta como «lo abrió», no como confirmado.

### ¿Qué guarda la confirmación?

El nombre, la fecha y la hora, la IP y el dispositivo. Si alguien confirma dos veces, se conserva la primera.

### ¿Por qué una persona que entró ayer no aparece en la lista?

La lista se congela al publicar. Quien entra después puede ver los avisos de toda la empresa de los últimos 30 días, pero no se le pide confirmar.

## Qué pasa si…

- **…sale «Ya se mandó un recordatorio en la última hora. Intenta más tarde».** El botón de recordar se puede usar una vez por hora en cada comunicado.
- **…la pestaña Faltan dice «¡Nadie falta!».** Todas las personas ya confirmaron.
- **…el comunicado está programado.** No hay lista todavía: «La lista de destinatarios se congela cuando se publique.»
- **…no veo los botones Recordar ni Archivar.** Tu acceso a Comunicados es de solo consulta.

## Relacionado

- [Cómo publicar un comunicado](/ayuda/comunicados/publicar-comunicado)
- [Cómo usar el muro en Mi espacio](/ayuda/comunicados/muro-empleado) (lo que ve el empleado)
