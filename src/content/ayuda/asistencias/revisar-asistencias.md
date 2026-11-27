---
titulo: Cómo revisar y exportar las asistencias de un periodo
resumen: En Asistencias consultas el historial de checadas de cualquier periodo, filtras, agrupas, guardas vistas y exportas a Excel o PDF.
modulo: asistencias
audiencia: [rh, dueno]
pantallas: [/panel/registro-asistencia]
palabras: [asistencias, historial, registro de asistencia, exportar, excel, pdf, matriz, filtros, rango de fechas, agrupar, columnas, vistas guardadas, presentes, ausencias, tardanzas]
orden: 10
actualizado: 2026-11-27
fuentes: [src/app/panel/registro-asistencia/page.jsx, src/app/panel/registro-asistencia/ResumenAsistencia.jsx, src/app/panel/registro-asistencia/AsistenciaTable.jsx, src/app/panel/registro-asistencia/AsistenciaRow.jsx, src/app/panel/registro-asistencia/AsistenciaMatriz.jsx, src/app/panel/registro-asistencia/AsistenciaDataContainer.jsx, src/app/panel/registro-asistencia/MobileAsistenciaView.jsx, src/components/filtros/RangoFechasModal.jsx, src/components/tabla/VistasGuardadas.jsx, src/components/tabla/ColumnasSelector.jsx]
---

## Para qué sirve

**Asistencias** es el historial completo de tu empresa: un renglón por persona y por día, con su entrada, salida, horas trabajadas, comida, horas extra, goce y estado. Desde aquí:

- Revisas cualquier día o periodo (hoy, la semana, la quincena, el mes…).
- Encuentras rápido faltas, retardos y horas extra por autorizar.
- Abres el **reloj del día** de una persona para corregirlo.
- Exportas a **Excel** o, en la vista Matriz, a **PDF**.

## Quién la usa

Recursos Humanos y el dueño. Los empleados ven solo lo suyo en [Mis asistencias](/ayuda/asistencias/mis-asistencias).

## Antes de empezar

- Entra a **Control de tiempo → Asistencias**.
- Para corregir necesitas permiso de edición de asistencias. Si tu usuario solo puede ver, los botones de corrección no aparecen.

## Cómo está organizada la pantalla

![Pantalla de Asistencias con el resumen del periodo, la barra de herramientas y la tabla](/ayuda/capturas/asistencias/asistencias-registros.webp "Asistencias: arriba el resumen del periodo, en medio las herramientas y abajo la tabla")

Arriba a la derecha hay tres pestañas:

- **Registros**: la tabla del historial (esta guía).
- **Horas de ley**: las horas de la semana contra el límite legal. Ver [Cómo revisar las horas de la semana contra la ley](/ayuda/asistencias/horas-de-ley).
- **Horas por reponer**: quién debe horas de permisos. El número azul dice cuántas personas deben. Ver [Cómo controlar las horas por reponer](/ayuda/asistencias/horas-por-reponer).

## Cómo leer el resumen del periodo

La banda de arriba muestra el **porcentaje de asistencia del periodo** y una barra de colores:

- **Presentes** (verde), **Tardanzas** (ámbar) y **Ausencias** (rojo). Toca cualquiera para filtrar la tabla; aparece «✕ quitar» para quitar el filtro.
- **Horas extra**: cuántas personas tienen horas extra y cuántas están «por autorizar». Tócalo para ver solo a esas personas.
- **⚠ No marcaron salida a comer**: aparece cuando hay personas cuyo horario tiene comida pero solo checaron entrada y salida (no se les descontó nada). Tócalo para verlas y agregar su comida. Ver [Cómo se registra y se corrige la comida](/ayuda/asistencias/comida).

## Cómo elegir el periodo

1. Toca el botón de fechas (dice **Hoy** al entrar).
2. Elige un atajo: **Hoy**, **Ayer**, **Esta semana**, **Semana pasada**, **Últimos 15 días**, **Este mes**, **Mes pasado**, **Este año** o **Todo el historial**; o marca el día inicial y el final en el calendario.
3. Toca **Aplicar**.

![Ventana para elegir el rango de fechas con atajos a la izquierda y calendario doble](/ayuda/capturas/asistencias/asistencias-rango-de-fechas.webp "Los atajos de la izquierda cubren los periodos más comunes")

> **Consejo:** cuando el rango es de más de un día, la tabla muestra todos los registros juntos (sin páginas) y abajo dice cuántos son.

## Cómo buscar, agrupar y ordenar

- **Buscar empleado...**: escribe parte del nombre.
- **Agrupar**: Sin agrupar, **Situación de hoy** (solo si estás viendo hoy: «Requieren atención», «Trabajando», «Ya salieron»…), Unidad de negocio, Departamento, Tipo de registro o Estado. Cada grupo se puede plegar con su flecha.
- **Ordenar y filtrar por columna**: los encabezados con flechas ordenan; los que tienen un triángulo abren un filtro por valor (por ejemplo, solo un departamento).
- **Limpiar**: quita todos los filtros y regresa a hoy.

## Qué significa cada columna

| Columna | Qué muestra |
|---|---|
| Empleado | Nombre (queda fijo a la izquierda al desplazarte). Tocarlo abre su ficha |
| Unidad / Departamento / Código | Dónde trabaja y su código del reloj |
| Fecha | El día del registro |
| Entrada / Salida | Primera entrada y última salida. «Sin salida» en rojo si no ha checado su salida; «+1 día» si salió al día siguiente |
| Jornada | Horas trabajadas «de» las programadas, con barra verde (o roja si le faltan más de 10 min) |
| Comida | Tiempo de comida del día |
| Horas extra | «3 h 11 min por autorizar» (botón morado) o «2 h autorizadas» |
| Goce | Si el día se paga (con goce) o no |
| Editado | «Sí» si alguien lo corrigió; tócalo para ver qué cambió, quién y cuándo |
| Día (festivo / domingo) | Lo pone el calendario: Día normal, Domingo, Festivo… No se edita |
| Estado | Qué pasó ese día: Asistió, Retardo +18 min, Sin salida, Inasistencia, Vacaciones… |
| Motivo | Por qué, y cómo se paga |
| Reloj | Botón azul para abrir el reloj del día |

## Cómo elegir y ordenar columnas

1. Toca **Columnas** (a la derecha). El número dice cuántas tienes visibles.
2. Marca o desmarca las que quieras ver.
3. Arrastra las columnas visibles para cambiar su orden (también con la barra espaciadora y las flechas del teclado).

Tu selección se guarda en ese navegador.

## Cómo guardar una vista

Si siempre revisas lo mismo (por ejemplo, «Ausencias de la planta este mes»):

1. Pon los filtros, el rango, la agrupación y las columnas que quieres.
2. Toca **Guardar vista actual**.
3. Escribe un nombre, por ejemplo «Ausencias Planta Zapopan», y toca **Guardar vista**.

La vista queda como una pestaña junto a **Todas**. Tócala para aplicarla de nuevo; la ✕ la elimina.

> **Ojo:** las vistas guardadas se quedan en el navegador donde las creaste. Si cambias de computadora tendrás que crearlas otra vez.

## Cómo exportar a Excel

1. Elige el periodo y los filtros.
2. Toca **Exportar Excel** (arriba de la tabla).
3. Espera a que diga «Exportando periodo…»; al terminar verás «Se exportaron N registros del periodo.».

El archivo incluye **todo el periodo** (no solo la página que ves), con los minutos trabajados, extra y extra por autorizar que calcula el sistema.

## Cómo ver la Matriz y exportar a PDF

La **Matriz** muestra empleados contra días, con una letra por día: **P** presente, **A** falta, **J** justificado, y al final el total de presencias, faltas y porcentaje de ausencia.

1. Toca **Matriz** (junto a **Tabla**).
2. Elige el periodo con el botón de fechas.
3. Toca **Excel** o **Exportar PDF**. El PDF sale horizontal, con el logo de tu empresa.

![Vista Matriz con una columna por día y los totales a la derecha](/ayuda/capturas/asistencias/asistencias-matriz.webp "La Matriz es ideal para imprimir el control de asistencia del periodo")

## En el celular

En el celular, Asistencias se ve por día: flechas para cambiar de día, una barra de búsqueda, chips para filtrar (Todos, Presentes, Tarde…) y una tarjeta por persona con su entrada y salida. El botón del embudo abre más filtros. Toca a una persona para ver su detalle.

![Asistencias en el celular con tarjetas por persona](/ayuda/capturas/asistencias/asistencias-celular.webp "En el celular cada persona es una tarjeta con su entrada y su salida")

## Preguntas frecuentes

### ¿Cómo corrijo una checada?

Toca el renglón de la persona o el botón azul del reloj. Todo está en [Cómo corregir la checada de un día](/ayuda/asistencias/corregir-checada-del-dia).

### ¿Por qué no veo a una persona?

Revisa el rango de fechas, la búsqueda, los filtros de columna y la vista guardada activa. **Limpiar** regresa todo a como estaba.

### ¿Qué significa el «Sí» en Editado?

Que el día se corrigió. Tócalo para ver el historial: qué cambió (antes → después), quién lo hizo, cuándo y el motivo. Lo que marcó el reloj nunca se borra.

### ¿Dónde quedó «Control de horas extra»?

Ahora vive aquí: las horas extra se autorizan en el reloj de cada día (botón morado «por autorizar»). Si entras por el enlace viejo, te trae a Asistencias con un aviso. Ver [Cómo autorizar o no las horas extra del día](/ayuda/asistencias/autorizar-horas-extra).

## Qué pasa si…

- **…el servidor no entrega el periodo completo al exportar:** no se descarga un archivo incompleto; verás «No se pudo exportar: no se descargó el periodo completo. Intenta de nuevo.».
- **…eliges «Situación de hoy» y luego cambias a otro día:** esa agrupación solo existe para hoy; elige otra.
- **…una fila es de un día festivo o domingo:** la columna Día lo indica y el pago especial lo calcula el sistema; no se puede editar a mano.

## Relacionado

- [Cómo corregir la checada de un día](/ayuda/asistencias/corregir-checada-del-dia)
- [Cómo marcar qué pasó un día sin checadas](/ayuda/asistencias/que-paso-y-motivo)
- [Cómo corregir varios días a la vez](/ayuda/asistencias/acciones-masivas)
- [Cómo autorizar o no las horas extra del día](/ayuda/asistencias/autorizar-horas-extra)
- [Cómo consultar y corregir entradas y salidas](/ayuda/asistencias/entradas-y-salidas)
- [Cómo crear y calcular una nómina](/ayuda/nomina/crear-y-calcular-nomina)
- [Cómo calcula ADAMIA la nómina](/ayuda/nomina/como-se-calcula-la-nomina)
