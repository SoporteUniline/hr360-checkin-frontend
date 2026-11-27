---
titulo: Configuración del checador: tolerancias y jornada mínima
resumen: Define cuántos minutos de gracia tiene tu gente al entrar y al salir, y cuántas horas cuentan como jornada completa.
modulo: reloj-checador
audiencia: [rh, dueno]
pantallas: [/panel/configuracion-checador]
palabras: [configuración del checador, tolerancia, minutos de gracia, retardo, salida anticipada, jornada mínima, jornada completa, aplicar a datos históricos]
orden: 70
actualizado: 2026-11-27
fuentes: [src/app/panel/configuracion-checador/page.jsx]
---

## Para qué sirve

Aquí defines las reglas con las que el sistema decide si alguien **llegó tarde** o **salió antes**, y cuándo un registro cuenta como **jornada completa**. Son reglas de tu empresa: aplican a todos tus empleados.

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

Entra al menú **Configuración → Config. checador**. Si manejas varias empresas, elige primero la **Empresa**.

![Configuración del checador con las tres reglas y la sección de datos históricos](/ayuda/capturas/reloj-checador/configuracion-del-checador.webp "Las tres reglas del checador y, abajo, la opción para aplicar la tolerancia a días pasados")

## Cómo configurar las reglas

1. **Tolerancia de entrada** — **Minutos de gracia (0 = sin tolerancia)**: minutos después de su hora de entrada antes de marcar retardo. Ejemplo: con 10 minutos, si su horario es 9:00 y llega a las 9:08, no es retardo.
2. **Tolerancia de salida** — **Minutos de gracia (0 = sin tolerancia)**: minutos antes de su hora de salida en los que salir no cuenta como salida anticipada. Ejemplo: con 5 minutos, si sale a las 17:57 y su salida es a las 18:00, no se marca.
3. **Jornada mínima para jornada completa** — **Horas mínimas (0 = desactivado)**: cuántas horas debe tener un registro para contarse como «jornada completa» en Entradas y salidas. Ejemplo: 7.5 horas.
4. Toca **Guardar configuración**. Verás «Configuración guardada correctamente.».

Las tolerancias aceptan de 0 a 120 minutos; la jornada mínima, de 0 a 24 horas (en medias horas).

## Dónde se usan estas reglas

- El estado del día en Asistencias («Retardo +N min», «Salió antes −N»).
- El Monitor («No ha llegado», «Llegaron tarde», «Salió antes»).
- La confirmación del reloj («A tiempo», «Retardo · N min»).
- Los contadores de Entradas y salidas (jornadas completas).

## Cómo aplicar la tolerancia a días pasados

Si cambiaste la tolerancia de entrada y quieres que los días anteriores se vuelvan a clasificar:

1. En **Aplicar reglas a datos históricos**, toca **Aplicar a datos históricos**.
2. Lee el aviso «¿Aplicar a datos históricos?»: recorrerá todas las asistencias pasadas de la empresa y las reclasificará como «Asistencia» o «Retardo» según la tolerancia de entrada guardada.
3. Toca **Sí, aplicar ahora**.
4. Verás «Se actualizaron N registros de asistencia.».

> **Importante:** esta acción **modifica registros existentes y no se puede deshacer**. Solo toca registros de tipo «Asistencia» o «Retardo» con horario programado. Guarda primero la tolerancia correcta.

## Preguntas frecuentes

### ¿Qué tolerancia se usa si nunca la configuré?

10 minutos para la entrada. Si la configuras, aunque sea en 0, se usa la tuya.

### ¿La tolerancia cambia la hora a la que se paga?

No. Solo decide si se marca retardo o salida antes. Las horas trabajadas se cuentan con las checadas reales.

### ¿Puedo tener tolerancias distintas por persona?

No. La tolerancia es de la empresa. Para casos especiales usa permisos (por ejemplo, un permiso para llegar tarde).

## Qué pasa si…

- **…escribes un número fuera de rango:** verás «El valor máximo es 120 minutos» o «El valor mínimo es 0».
- **…no cambias nada:** el botón **Guardar configuración** queda desactivado.
- **…falla el guardado:** verás «Error al guardar la configuración.»; vuelve a intentar.

## Relacionado

- [Cómo ver quién está trabajando ahora con el Monitor](/ayuda/monitor/usar-el-monitor)
- [Cómo consultar y corregir entradas y salidas](/ayuda/asistencias/entradas-y-salidas)
- [Cómo crear un turno](/ayuda/turnos/crear-un-turno)
