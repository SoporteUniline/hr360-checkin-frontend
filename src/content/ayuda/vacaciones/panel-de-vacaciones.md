---
titulo: Panel de vacaciones: días cargados, tomados y disponibles
resumen: Consulta el saldo de vacaciones de cada persona, el detalle de sus periodos y los días que ya tomó, y ajusta saldos de varias personas a la vez.
modulo: vacaciones
audiencia: [rh, dueno]
pantallas: [/panel/vacaciones]
palabras: [vacaciones, saldo, días disponibles, días cargados, días tomados, periodos, ajuste, masivas, panel de vacaciones]
orden: 10
actualizado: 2026-11-27
fuentes: [src/app/panel/vacaciones/page.jsx]
---

## Para qué sirve

El **Panel de vacaciones** te dice, por persona:

- **Días cargados**: los días de vacaciones que le corresponden por sus periodos.
- **Días tomados**: los que ya usó.
- **Días disponibles**: los que le quedan.

Y te deja **ajustar** el saldo de varias personas a la vez desde la pestaña **Masivas**.

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

- Entra a **Ausencias y permisos → Vacaciones → Panel vacaciones**.
- Los días cargados salen de los **periodos** de cada persona, que se crean solos cada aniversario con la tabla de [Vacaciones por ley](/ayuda/vacaciones/vacaciones-por-ley).

## Cómo leer el panel

![Panel de vacaciones con los contadores, los filtros y la tabla de saldos](/ayuda/capturas/vacaciones/panel-de-vacaciones.webp "Cada persona con sus días cargados, tomados y disponibles")

- **Contadores:** Total empleados, Con vacaciones, Sin vacaciones y Total días disponibles.
- **Filtros:** Unidad de negocio, Empleado (nombre), Departamento y **Estado vacaciones** (con o sin vacaciones). **Limpiar filtros** los quita.
- **Tabla:** Empleado, Departamento, Días cargados (azul), Días tomados (ámbar) y Días disponibles (verde; en rojo si no tiene).

## Cómo ver el detalle de una persona

1. Toca la fila (la flecha o cualquier parte que no sea el nombre; el nombre abre su ficha).
2. Se despliegan dos pestañas:
   - **Días cargados**: sus periodos con Año, Días, Inicio, Fin y Estado (Activa, Usada o Vencida).
   - **Días tomados**: los días que tomó, agrupados por mes, con su nota.

![Detalle de una persona con sus periodos de vacaciones](/ayuda/capturas/vacaciones/panel-de-vacaciones-detalle.webp "Los periodos de la persona: cuántos días le dio cada año y si ya los usó")

## Cómo ajustar saldos de varias personas (Masivas)

Útil al empezar a usar ADAMIA, para cargar los saldos que ya traías.

1. Toca la pestaña **Masivas**.
2. Usa los filtros para encontrar a las personas.
3. Escribe en **Días disponibles** el saldo correcto de cada una.
4. Toca **Guardar cambios** (o **Descartar** para no guardar).

![Pestaña Masivas con el campo Días disponibles de cada persona](/ayuda/capturas/vacaciones/vacaciones-masivas.webp "Escribe el saldo correcto y guarda todos los cambios juntos")

El sistema guarda la **diferencia** como un ajuste en la bitácora; las personas sin cambio no se tocan.

## Preguntas frecuentes

### ¿Cómo se le cargan los días a alguien cada año?

Cada noche el sistema revisa quién cumple años de antigüedad y le crea su periodo con los días que dice la tabla de [Vacaciones por ley](/ayuda/vacaciones/vacaciones-por-ley). Si no hay regla para sus años, no se le carga nada.

### ¿Cómo se descuentan los días tomados?

Al aprobar una solicitud de vacaciones o al marcar el día como **Vacaciones** en Asistencias.

### ¿Dónde veo quién está de vacaciones este mes?

En [Planeación de vacaciones](/ayuda/vacaciones/planeacion-de-vacaciones) o en el calendario de [Solicitudes de mi equipo](/ayuda/solicitudes-equipo/aprobar-solicitudes-de-mi-equipo).

## Qué pasa si…

- **…escribes un número no válido en Masivas:** no se guarda; usa números enteros.
- **…falla el guardado:** verás «No se pudieron guardar los cambios de vacaciones».
- **…una persona no tiene fecha de ingreso:** no se le pueden calcular periodos automáticamente; captúrala en su ficha.

## Relacionado

- [Vacaciones por ley: días y prima por antigüedad](/ayuda/vacaciones/vacaciones-por-ley)
- [Vacaciones por periodo](/ayuda/vacaciones/vacaciones-por-periodo)
- [Cómo pedir vacaciones](/ayuda/vacaciones/pedir-vacaciones)
- [Cómo aprobar las solicitudes de mi equipo](/ayuda/solicitudes-equipo/aprobar-solicitudes-de-mi-equipo)
