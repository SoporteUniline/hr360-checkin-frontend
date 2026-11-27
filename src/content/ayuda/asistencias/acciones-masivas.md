---
titulo: Cómo corregir varios días a la vez
resumen: Elige varias filas en Asistencias y márcalas de golpe como un tipo de día (por ejemplo descanso o inasistencia) o cárgales su horario normal, con un solo motivo.
modulo: asistencias
audiencia: [rh, dueno]
pantallas: [/panel/registro-asistencia]
palabras: [masivo, varios, selección, marcar como, cargar horario normal, falla del reloj, evento, corregir varios, acciones masivas]
orden: 70
actualizado: 2026-11-27
fuentes: [src/components/asistencia/CampoMotivo.jsx, src/lib/asistencia/motivoCorreccion.mjs, src/app/panel/registro-asistencia/AccionesMasivas.jsx, src/app/panel/registro-asistencia/AsistenciaRow.jsx, src/lib/asistencia/relojDia.mjs]
---

## Para qué sirve

Cuando el mismo caso le pasó a muchas personas no tienes que corregirlas una por una. Por ejemplo:

- El reloj se descompuso y nadie pudo checar: **Cargar horario normal…** a todos.
- La empresa cambió el día de descanso: **Marcar como…** «Día de descanso» a todos los de ese día.

Todo queda en el historial con tu nombre y el motivo.

## Quién la usa

Recursos Humanos y el dueño, con permiso de edición de asistencias.

## Antes de empezar

- Abre **Control de tiempo → Asistencias**, elige el día o el periodo y filtra a las personas que quieras.
- Ten listo el **motivo**: es obligatorio (de 5 a 500 letras) y es uno solo para todas las filas elegidas.

## Cómo elegir las filas

1. Marca la casilla junto al nombre de cada persona (columna **Empleado**). La casilla del encabezado elige todas las visibles.
2. Abajo aparece una barra oscura con «N seleccionadas», **Quitar selección**, **Marcar como…** y **Cargar horario normal…**.

![Asistencias con tres filas elegidas y la barra de acciones abajo](/ayuda/capturas/asistencias/acciones-masivas.webp "La barra de acciones aparece en cuanto eliges una fila")

## Cómo marcar varias filas como un tipo de día

Sirve para personas **sin checadas**.

1. Con las filas elegidas toca **Marcar como…**.
2. En **Estado** elige el tipo (por ejemplo **Día de descanso** o **Inasistencia**).
3. Escribe el **Motivo (obligatorio)**, por ejemplo «Cambio de descanso autorizado», o toca una sugerencia.
4. Revisa el resumen: «Se aplica a N de M seleccionadas · se omiten X». Debajo verás a quién se omite y por qué.
5. Toca **Aplicar a N**.

![Ventana Marcar como con el estado, el motivo y el resumen de a quién se aplica](/ayuda/capturas/asistencias/acciones-masivas-marcar-como.webp "El resumen te dice a cuántas se aplicará antes de confirmar")

## Cómo cargar el horario normal a varias personas

Sirve para quienes **no checaron** o **no tienen salida**.

1. Con las filas elegidas toca **Cargar horario normal…**.
2. Escribe el **Motivo (obligatorio)** o toca la sugerencia **Falla del reloj**.
3. Revisa el resumen de a quién se aplica.
4. Toca **Aplicar a N**.

A cada persona se le agrega en su reloj su horario de ese día como registro corregido. Lo que el reloj sí marcó se conserva.

## Preguntas frecuentes

### ¿Por qué se omitió a alguien?

- En **Marcar como…** se omite a quien **tiene checadas** («tiene checadas: se corrige en su reloj»).
- En **Cargar horario normal…** se omite a quien **ya tiene entrada y salida**.

### ¿Qué tipos aparecen en «Marcar como…»?

Los tipos de día que no cuentan como asistencia: inasistencia, descanso, vacaciones, incapacidad y los que tu empresa tenga en su catálogo. Ver [Tipos de registro y motivos](/ayuda/asistencias/tipos-de-registro).

### ¿Se crean actas si marco varias inasistencias sin justificar?

Sí: igual que una por una, cada inasistencia injustificada crea su acta en borrador y el sistema te avisa.

## Qué pasa si…

- **…el servidor omite algunas filas:** verás «Aplicado a N · se omitieron X. Queda en el historial con tu nombre y el motivo.».
- **…alguna fila es de otra empresa a la que no tienes acceso:** no se aplica ninguna y verás el error.
- **…no escribes motivo:** al tocar **Aplicar** no se cambia nada y junto al campo verás «Escribe el motivo de la corrección.». Si es muy corto: «El motivo debe tener al menos 5 letras.».
- **…algún día está en una nómina autorizada:** ese día no se puede cambiar.

## Relacionado

- [Cómo marcar qué pasó un día sin checadas](/ayuda/asistencias/que-paso-y-motivo)
- [Cómo corregir la checada de un día](/ayuda/asistencias/corregir-checada-del-dia)
- [Cómo revisar y exportar las asistencias de un periodo](/ayuda/asistencias/revisar-asistencias)
