---
titulo: Cómo publicar un comunicado
resumen: Escribe un aviso con fotos, PDF o video, elige para quién es y por dónde llega, y publícalo ahora o prográmalo.
modulo: comunicados
audiencia: [rh, dueno]
pantallas: [/panel/muro, /panel/comunicados, /panel/comunicados/nuevo, /panel/comunicados/[id]/editar]
palabras: [comunicado, aviso, publicar, nuevo comunicado, redactar, programar, borrador, audiencia, sucursal, área, puesto, correo, push, aviso emergente, muro]
orden: 20
actualizado: 2026-11-27
fuentes: [src/app/panel/muro/page.jsx, src/app/panel/comunicados/nuevo/page.jsx, src/app/panel/comunicados/[id]/editar/page.jsx, src/components/comunicados/MuroPanel.jsx, src/components/comunicados/Redactar.jsx, src/components/comunicados/SelectorAudiencia.jsx, src/lib/comunicados/comunicados.mjs]
---
## Para qué sirve

Para avisar algo a tu gente una sola vez y que le llegue por varios caminos: el muro de la app, una notificación en el celular, un correo y un aviso que sale al entrar. Sirve para avisos generales, eventos, auditorías, políticas o reglamentos.

## Quién la usa

- **Recursos Humanos** y el **dueño de la cuenta**.
- Un **usuario con acceso** necesita permiso de **editar** en Comunicados. Con permiso de solo **ver**, consulta todo pero no publica: verá «Tu acceso a Comunicados es de solo consulta: no puedes publicar.»

## Antes de empezar

- La empresa debe tener encendido el módulo **Centro de comunicados** (Ajustes › Módulos).
- Si manejas varias empresas, elige arriba la **Empresa** a la que va el comunicado. Lee [Cómo trabajar con varias empresas](/ayuda/primeros-pasos/cambiar-de-empresa).

## Cómo publicar un comunicado

1. En el menú, entra a **Muro** (es la primera opción) y haz clic en **¿Qué quieres comunicar…?**. También puedes ir a **Comunicados › Administrar** y hacer clic en **Nuevo comunicado**.
2. En **Contenido** elige el **Tipo** (Aviso general, Evento o actividad, Auditoría, Política o reglamento…), escribe el **Título** (hasta 150 caracteres) y el **Mensaje** (hasta 5,000). Si es un evento, pon la **Fecha del evento (opcional)**.
3. En **Fotos, documento y video** agrega lo que necesites: **Fotos (hasta 10)**, un **PDF** o un enlace en **Video de YouTube (opcional)**. Con **Permitir me gusta** y **Permitir comentarios** decides si la gente puede reaccionar.
4. En **Nivel de importancia** elige **Normal** o **Requiere confirmación de leído**. Lo segundo se explica en [Confirmación de lectura y seguimiento](/ayuda/comunicados/confirmacion-y-seguimiento).
5. En **Para quién** enciende **Toda la empresa** o haz clic en **Área, puesto, sucursal o persona** para elegir un grupo. Abajo verás cuántas personas son, por ejemplo «42 empleados activos · 39 con app · 35 con correo».
6. En **Por dónde llega** la **App del empleado · Muro** va siempre. Marca además **Notificación push**, **Correo electrónico** o **Aviso emergente** (sale al entrar a Mi espacio o al panel).
7. En **Cuándo se publica** elige **Ahora** o **Programar** (con fecha y hora). Si quieres que deje de verse en una fecha, llena **Quitar del muro después del (opcional)**.
8. Haz clic en **Publicar a 42 personas** (o **Programar para 42 personas**). Al terminar, ADAMIA te lleva al seguimiento del comunicado.

![Formulario «Nuevo comunicado» con contenido, nivel, para quién, canales y fecha](/ayuda/capturas/comunicados/redactar.webp "Nuevo comunicado: a la izquierda el contenido, a la derecha a quién y cómo llega")

## Cómo elegir para quién es

1. En **Para quién**, apaga **Toda la empresa** si está encendido.
2. Haz clic en **Área, puesto, sucursal o persona**.
3. Arriba elige el grupo: **Sucursales**, **Áreas**, **Puestos** o **Personas**. Marca las que quieras; puedes escribir para buscar.
4. Haz clic en **Listo**. Lo elegido queda como etiquetas; para quitar una, haz clic en su **X**.

![Ventana «Elegir para quién» con sucursales marcadas](/ayuda/capturas/comunicados/elegir-audiencia.webp)

> **Importante:** Sucursal, área y puesto se combinan: la persona debe cumplir todos. Por ejemplo, «Sucursal: Centro» y «Área: Ventas» es solo la gente de Ventas en Centro. Las personas que elijas una por una se suman a ese grupo.

## Cómo guardar un borrador y terminarlo después

1. Escribe al menos el **Título**.
2. Haz clic en **Guardar borrador**. Nadie lo ve todavía.
3. Para terminarlo, ve a **Comunicados › Administrar**, filtra **Borradores**, abre el comunicado y haz clic en **Editar**.

Para dejar de programar un comunicado, ábrelo, haz clic en **Editar** y luego en **Guardar borrador**: así ya no se publica solo.

## Cómo usar el muro del panel

El **Muro** del panel es el mismo que ven los empleados, con lo que necesita Recursos Humanos:

- Debajo de cada publicación ves cuántos lo vieron o confirmaron, por ejemplo «30 de 42 confirmaron», y **Ver seguimiento**.
- Puedes dar **Me gusta** y comentar. Tus comentarios salen con tu nombre y «Recursos Humanos».
- En el menú **⋯** de cada publicación puedes fijarla o archivarla. Lo explicamos en [Portada y publicaciones fijadas](/ayuda/comunicados/portada-y-fijadas).

![Muro del panel con la portada, la caja «¿Qué quieres comunicar?» y el avance de lectura](/ayuda/capturas/comunicados/muro-panel.webp "El muro del panel es la primera pantalla después de entrar")

## Preguntas frecuentes

### ¿Puedo cambiar un comunicado que ya se publicó?

No. Solo se editan los borradores y los programados. Si algo cambió, archívalo y publica uno nuevo.

### ¿A quién le llega exactamente?

A los empleados activos que cumplen lo que elegiste, en el momento de publicar. Si lo programas, la lista se arma cuando llega su hora: quien ya no esté activo no lo recibe.

### ¿Qué significa «sin canal»?

Personas que no tienen la app ni un correo registrado, así que ningún canal les llega. En el seguimiento aparecen como «Sin app ni correo» para que les avises en persona y lo registres.

### ¿Por qué no puedo marcar «Notificación push»?

Si dice «No configurado», las notificaciones todavía no están listas en tu cuenta. El comunicado llega igual por el muro y por los otros canales que marques.

## Qué pasa si…

- **…sale «Elige para quién es: toda la empresa, una sucursal, área, puesto o persona».** Falta elegir la audiencia en **Para quién**.
- **…sale «La fecha de publicación debe ser futura».** Elegiste **Programar** con una fecha u hora que ya pasó.
- **…sale «Debe ser después de la publicación».** La fecha de **Quitar del muro después del** es anterior a la publicación.
- **…sale «El PDF puede pesar hasta 15 MB».** Reduce el PDF y vuelve a subirlo. Las fotos no tienen ese problema: al elegirlas se ajustan solas (formato WebP, menos de 1 MB cada una) y verás «Preparando foto…» mientras tanto.
- **…sale «Esta foto está en formato HEIC; en el iPhone ve a Ajustes › Cámara › Formatos › Más compatible, o elige otra».** Tu navegador no puede abrir fotos HEIC del iPhone. Cambia ese ajuste en el iPhone o elige otra foto.
- **…sale «El archivo pesa demasiado para subirlo. Prueba con uno más ligero.».** El servidor no aceptó un archivo tan grande. Elige uno más ligero (las fotos ya se ajustan solas; esto pasa sobre todo con PDFs grandes o con muchas fotos a la vez).
- **…sale «Alguien más cambió este comunicado».** Otra persona lo editó mientras lo tenías abierto. Vuelve a abrirlo para ver lo último.
- **…sale «Este comunicado ya se publicó: solo se pueden editar borradores y programados».** Ya está publicado; ve la primera pregunta frecuente.
- **…cierro la pestaña con cambios sin guardar.** El navegador te pregunta antes de salir.

## Relacionado

- [Confirmación de lectura y seguimiento](/ayuda/comunicados/confirmacion-y-seguimiento)
- [Portada y publicaciones fijadas](/ayuda/comunicados/portada-y-fijadas)
- [Comunicados automáticos](/ayuda/comunicados/automaticos)
- [Moderación y reglas del muro](/ayuda/comunicados/moderacion-y-reglas)
