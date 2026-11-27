---
titulo: Cómo ver quién está trabajando ahora con el Monitor
resumen: El Monitor te dice en una sola pantalla quién ya llegó, quién falta, quién está en comida y quién necesita tu atención, y se actualiza solo con cada checada.
modulo: monitor
audiencia: [rh, dueno]
pantallas: [/panel/monitor]
palabras: [monitor, en vivo, hoy, quién llegó, faltas, retardos, no ha llegado, en comida, hora extra, tiempo real, tablero]
orden: 10
actualizado: 2026-11-27
fuentes: [src/app/panel/monitor/page.jsx, src/app/panel/monitor/VistaMonitor.jsx, src/app/panel/monitor/TablaHoy.jsx, src/app/panel/monitor/comunes.jsx, src/lib/asistencia/tablero.mjs, src/lib/asistencia/vistasMonitor.mjs, src/components/Clock/BotonRelojChecador.jsx]
---

## Para qué sirve

El **Monitor** es la foto en vivo de tu empresa **hoy**. Sin abrir reportes ni hojas de cálculo sabes:

- Quién ya está trabajando y desde qué hora.
- Quién **no ha llegado** o ya **faltó**.
- Quién está **en comida** y si ya se pasó del tiempo.
- Quién salió antes, quién llegó tarde, quién tiene permiso y quién va a hacer hora extra.

Se actualiza solo: cada vez que alguien checa, la pantalla cambia sin que tengas que recargar. Arriba siempre ves la fecha, la hora y la leyenda «se actualiza solo».

## Quién la usa

Recursos Humanos y el dueño de la empresa. Los jefes que entran desde su celular tienen su propia versión con solo su equipo: [Monitor de mi equipo](/ayuda/monitor/monitor-de-mi-equipo).

## Antes de empezar

- Tus empleados necesitan un **horario** (turno) para que el sistema sepa a qué hora debían llegar y salir. Si alguien no tiene horario, el Monitor dirá «Sin horario hoy». Revisa [Cómo crear un turno](/ayuda/turnos/crear-un-turno).
- Las personas deben checar en el reloj (de la empresa o desde su celular). Ver [Cómo checar en el reloj de la empresa](/ayuda/reloj-checador/checar-en-el-reloj).
- Lo encuentras en el menú **Control de tiempo → Monitor**.

## Cómo leer el Monitor

![Monitor con los contadores arriba y la tabla de personas agrupadas por lo que les pasa hoy](/ayuda/capturas/monitor/monitor-tabla.webp "El Monitor a las 11:12 a. m.: arriba los contadores y abajo las personas, de lo más urgente a lo menos")

La pantalla tiene tres partes:

1. **Contadores** (las tarjetas de arriba): cuántas personas hay en cada situación.
2. **Búsqueda y área**: para encontrar a alguien o ver solo un área.
3. **Tabla de personas**, agrupada de lo más urgente a lo menos urgente.

### Los siete contadores

| Contador | Quién cuenta | Qué dice abajo |
|---|---|---|
| Trabajando | Personas con una entrada abierta (incluye a quien ya está en hora extra) | Cuántas están en hora extra |
| En comida | Personas que salieron a comer y no han regresado | Cuántas ya se pasaron de su tiempo de comida |
| Ya salieron | Personas que ya checaron su salida | Cuántas salieron antes de su hora |
| Por entrar | Personas a las que todavía no les toca entrar (o están dentro de su tolerancia) | A qué hora entra la próxima |
| No han llegado | Personas que ya debían estar y no han checado, o que ya faltaron | «ya pasó su hora» o «todos llegaron» |
| Llegaron tarde | Personas que entraron después de su hora más la tolerancia | Cuántas llegaron tarde **con** permiso |
| Con permiso / día | Personas con permiso por horas aprobado hoy, o con el día libre (descanso, vacaciones, incapacidad…) | Cuántas por horas y cuántas de día |

Los contadores **En comida** y **No han llegado** se pintan de **rojo** cuando hay alguien que requiere atención (alguien se pasó de su comida o alguien no ha llegado).

### Los grupos de la tabla

Cada persona aparece **una sola vez**, en el grupo que mejor describe su momento:

| Grupo | Quién aparece |
|---|---|
| Requiere atención | Faltó, no ha llegado, salió antes sin permiso, se pasó de comida, no checó su salida o llegó tarde |
| Con permiso / descanso | Permiso de día o por horas aprobado hoy; descanso, festivo, vacaciones, incapacidad o sin horario |
| Saldrán tarde / hora extra | Tiene hora extra autorizada hoy o ya está trabajando después de su salida |
| En jornada | Trabajando a tiempo o en comida sin pasarse |
| Por entrar | Todavía no le toca entrar |
| Ya salieron | Salió a su hora |

Los grupos vacíos no se muestran. Cada grupo dice cuántas personas tiene.

### Las columnas

- **Persona**: nombre y área. Al tocar el nombre se abre su ficha.
- **Horario**: su horario de hoy, por ejemplo «9:00 a.m.–6:00 p.m.», o «Sin horario hoy».
- **Entrada**: la hora real de su primera entrada (en naranja si llegó tarde). Si ya salió verás «7:55 a.m. → 3:10 p.m.». Un guion «—» significa que todavía no checa.
- **Qué pasa**: una frase corta con lo importante, por ejemplo «Llegó 18 min tarde», «No ha llegado · debía entrar hace 2 h 12 min», «En comida 67 de 60 min», «Saldrá 8:00 p.m. · 3 h extra · inventario» o «Vacaciones». A veces lleva una segunda etiqueta, como «Debe 1 h 30 min» si la persona debe horas de un permiso.
- **Jornada**: cuánto lleva trabajado contra lo programado, por ejemplo «3 h 21 de 8 h», con una barra (azul en jornada, violeta en hora extra, gris si ya salió). Esta columna solo se ve en pantallas anchas.
- **Editado**: «Sí» si alguien de RH ya corrigió ese día.

## Cómo filtrar con los contadores

Los contadores también son **filtros**. Por ejemplo, para ver solo a quien no ha llegado:

1. Toca la tarjeta **No han llegado**.
2. La tabla muestra solo a esas personas y arriba dice «Filtrando: No han llegado · toca de nuevo la tarjeta para quitarlo · ver todos».
3. Para volver a ver a todos, toca otra vez la misma tarjeta o el enlace **ver todos**.

![Monitor filtrado con la tarjeta «No han llegado» activa](/ayuda/capturas/monitor/monitor-filtro-no-han-llegado.webp "La tarjeta activa queda con borde azul y la tabla muestra solo a esas personas")

> **Consejo:** los contadores cuentan respetando la búsqueda y el área que tengas elegidas. Si eliges el área «Ventas», todos los números son solo de Ventas.

## Cómo buscar a una persona o ver un área

1. Escribe en **Buscar persona…** parte del nombre o del código del empleado. No importan acentos ni mayúsculas.
2. Si quieres ver una sola área, elígela en el desplegable **Todas las áreas**.
3. Junto a la búsqueda verás cuántas personas hay hoy con esos filtros.

Si nadie coincide verás «Nadie coincide con la búsqueda.».

## Cómo abrir y corregir el día de alguien

Toca cualquier parte del renglón de la persona (menos su nombre). Se abre el **reloj del día**, la misma ventana con la que se corrige en Asistencias: ahí ves todas sus checadas, puedes agregar la que olvidó, marcar su comida o autorizar su hora extra. Todo se explica en [Cómo corregir la checada de un día](/ayuda/asistencias/corregir-checada-del-dia).

## Cómo cambiar entre Tabla y Línea del día

Arriba a la derecha tienes dos botones: **Tabla** y **Línea del día**. La Tabla es la vista normal. La Línea del día dibuja el día de cada persona sobre una regla de horas. Se explica en [Cómo leer la Línea del día](/ayuda/monitor/linea-del-dia).

El Monitor recuerda la vista que elegiste la última vez en ese navegador.

## Cómo abrir el reloj checador o ir al historial

- Botón **Reloj checador** (arriba, junto a Adamia AI): abre el reloj de tu empresa para poner en una tableta o computadora de entrada. Ver [Cómo instalar el reloj checador de la empresa](/ayuda/reloj-checador/abrir-el-reloj-de-la-empresa).
- Botón **Ver historial en Asistencias**: te lleva a [Asistencias](/ayuda/asistencias/revisar-asistencias) para ver días anteriores, corregir y exportar.

## En el celular

En el celular el Monitor muestra las mismas personas como **tarjetas** bajo los mismos grupos. Los contadores se deslizan de lado y lo más urgente va primero (No han llegado, En comida, Llegaron tarde). Toca una tarjeta para abrir el reloj del día.

![Monitor en un celular con contadores deslizables y tarjetas](/ayuda/capturas/monitor/monitor-celular.webp "En el celular cada persona es una tarjeta que se toca para abrir su día")

## Preguntas frecuentes

### ¿Cada cuánto se actualiza?

Cada vez que alguien checa, la información se vuelve a cargar sola. Además, la hora y los textos como «debía entrar hace…» se recalculan cada 30 segundos.

### ¿Por qué alguien aparece como «No ha llegado» si todavía es temprano?

Aparece así cuando ya pasó su hora de entrada **más la tolerancia** de tu empresa. La tolerancia se configura en [Configuración del checador](/ayuda/reloj-checador/configuracion-del-checador). Si su horario está mal, corrígelo en su turno.

### ¿Cuándo pasa de «No ha llegado» a «Faltó»?

Cuando ya pasó la **mitad de su jornada** y no ha checado nada. Si tiene un permiso aprobado para llegar tarde, la mitad se cuenta desde la hora del permiso.

### ¿Por qué alguien que sigue trabajando después de su hora no sale como hora extra?

Si pasan 15 minutos después de su salida (o después de su hora extra autorizada) y no ha checado, el Monitor no supone que está trabajando de más: dice «Sin checar salida · debía salir hace…» y lo pone en «Requiere atención». Así un olvido de checar no se cuenta como hora extra.

### ¿Cómo sabe el Monitor que alguien está en comida?

Si la persona usó **Salir a comer** en el reloj, o si su salida cayó dentro de la hora de comida de su horario (o 30 minutos antes). Ver [Cómo checar tu salida a comer](/ayuda/reloj-checador/salir-a-comer).

### ¿Veo a la gente del turno de noche de ayer?

Sí. Si alguien entró ayer en la noche y su turno sigue abierto, se muestra su turno de ayer hasta que llegue su hora de salida o cheque.

## Qué pasa si…

- **…una persona no tiene horario hoy:** aparece en «Con permiso / descanso» con «Sin horario hoy». Si checa, se cuenta lo que checó pero sin retardo ni salida antes, porque no había hora contra la cual medir.
- **…checó en su día de descanso:** se cuenta lo que trabajó, sin retardo ni «salió antes».
- **…salió antes pero tenía permiso:** aparece en «Ya salieron» como «Salió con permiso», no en «Requiere atención».
- **…tiene un permiso por horas para salir y regresar:** se muestra el permiso en violeta («Permiso 10:00 a.m.–12:00 p.m. · cita médica») y no se marca como falta mientras dura.
- **…no hay nadie con registro hoy:** verás «No hay empleados con registro para hoy.».
- **…no se puede cargar la información:** verás «No se pudo cargar el Monitor». Revisa tu conexión y recarga la página.

## Relacionado

- [Cómo leer la Línea del día](/ayuda/monitor/linea-del-dia)
- [Cómo corregir la checada de un día](/ayuda/asistencias/corregir-checada-del-dia)
- [Cómo revisar y exportar las asistencias de un periodo](/ayuda/asistencias/revisar-asistencias)
- [Monitor de mi equipo (para jefes)](/ayuda/monitor/monitor-de-mi-equipo)
- [Configuración del checador: tolerancias y jornada mínima](/ayuda/reloj-checador/configuracion-del-checador)
