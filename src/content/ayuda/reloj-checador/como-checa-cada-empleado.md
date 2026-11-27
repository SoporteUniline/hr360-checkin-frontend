---
titulo: Cómo elegir la forma de checar de cada empleado
resumen: En la ficha del empleado, pestaña Checador y acceso, defines su código, con qué método checa, si debe estar en un área con GPS y cómo se cierra su turno.
modulo: reloj-checador
audiencia: [rh, dueno]
pantallas: []
palabras: [método de chequeo, código de empleado, facial, ambos, código y cara, GPS, áreas de check, geocerca, cierre de turno, automático, manual, asistencia automática]
orden: 90
actualizado: 2026-11-27
fuentes: [src/app/panel/empleados/tabs/TabLaborales.jsx, src/app/panel/empleados/FormularioEmpleado.jsx, src/app/panel/empleados/tabs/TabReconocimiento.jsx]
---

## Para qué sirve

Cada persona puede checar de forma distinta. En su ficha decides:

- Su **código de empleado** (el que escribe en el reloj o usa un checador físico).
- Con qué **método** puede checar: código, rostro, ambos, o código y cara.
- Si debe estar en un **área permitida** (GPS) para checar.
- Si su turno se cierra solo o lo cierra ella.

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

Abre **Gestión de personal → Empleados**, entra a la ficha de la persona y ve a la pestaña **Checador y acceso**.

## Cómo configurar su forma de checar

1. **Código de empleado**: el número que escribe en el reloj. Debe ser único en tu empresa. Si usas un checador físico, debe coincidir con su número de usuario en el equipo.
2. **Método de chequeo** («Selecciona cómo el empleado registrará su entrada/salida»):
   - **Código**: solo con su código o QR.
   - **Facial**: con su rostro.
   - **Ambos**: con rostro o con código.
   - **Código y cara**: en el reloj escribe su código y la cámara confirma que es él. La cara sola no basta: es más rápido y más seguro.
3. **Cierre de turno** («Define si el sistema cierra el turno automáticamente o si el empleado debe hacerlo manualmente»):
   - **Automático**: el reloj decide si es entrada o salida.
   - **Manual**: al checar con un turno abierto, el reloj le pregunta si es **Salida temporal** o **Cerrar turno**.
4. **Checar GPS** («Requerir ubicación GPS al checar entrada/salida»): si lo activas, marca las **Áreas donde el empleado puede checar**. Si no hay áreas, usa **+ Crear nueva área**.
5. **Asistencia Automática**: el sistema genera sus registros de entrada y salida con su horario, sin que la persona cheque. Úsalo solo para quien de verdad no debe checar.
6. **Reconocimiento facial**: registra su rostro. Ver [Cómo registrar tu rostro para checar](/ayuda/reloj-checador/registrar-mi-rostro).
7. Toca **Guardar**.

## Preguntas frecuentes

### ¿Cuál método recomiendan?

**Código y cara** evita que alguien cheque por otra persona y es rápido. Si el aparato no tiene buena cámara, **Código**.

### ¿Qué pasa si activo GPS y la persona está fuera del área?

El reloj no registra la checada y le explica el motivo. Si trabaja en varios lugares, marca todas sus áreas.

### ¿Para qué sirve el cierre de turno Manual?

Para personas que salen y regresan varias veces (por ejemplo, a visitar clientes): cada salida puede ser temporal sin cerrar su día.

## Qué pasa si…

- **…cambias el método:** aplica desde su siguiente checada.
- **…la persona tiene Asistencia Automática:** sus checadas de un checador físico no se toman; el sistema usa su horario.
- **…dos personas tienen el mismo código:** el reloj no sabrá a quién registrar; usa códigos únicos.

## Relacionado

- [Cómo checar en el reloj de la empresa](/ayuda/reloj-checador/checar-en-el-reloj)
- [Cómo checar desde tu celular](/ayuda/reloj-checador/checar-desde-el-celular)
- [Checadores físicos (ZKTeco y Hikvision)](/ayuda/reloj-checador/checadores-fisicos)
- [Cómo registrar tu rostro para checar](/ayuda/reloj-checador/registrar-mi-rostro)
