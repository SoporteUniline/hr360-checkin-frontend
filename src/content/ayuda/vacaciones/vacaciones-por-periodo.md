---
titulo: Vacaciones por periodo: los años de vacaciones de cada persona
resumen: Consulta, crea, corrige o elimina los periodos de vacaciones de cada empleado (cada año de antigüedad con sus días y su estado).
modulo: vacaciones
audiencia: [rh, dueno]
pantallas: [/panel/vacaciones/por-periodo]
palabras: [vacaciones por periodo, periodo vacacional, año de antigüedad, días de vacaciones, activa, usada, vencida, nuevo periodo, fecha de ingreso]
orden: 30
actualizado: 2026-11-27
fuentes: [src/app/panel/vacaciones/por-periodo/page.jsx]
---

## Para qué sirve

Cada año de antigüedad le da a una persona un **periodo** de vacaciones: de su aniversario anterior a su aniversario, con sus días. Aquí ves todos los periodos de tus empleados y puedes crearlos o corregirlos a mano.

Normalmente **no tienes que crearlos**: el sistema los crea solo cada aniversario con la tabla de [Vacaciones por ley](/ayuda/vacaciones/vacaciones-por-ley). Úsalo para casos especiales o para cargar periodos anteriores.

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

- Entra a **Ausencias y permisos → Vacaciones → Vacaciones por periodo**.
- La persona necesita su **fecha de ingreso** en su ficha.

![Vacaciones por periodo con los filtros y la lista de periodos por empleado](/ayuda/capturas/vacaciones/vacaciones-por-periodo.webp "Cada periodo con su empleado, fechas, año, días y estado")

## Cómo leer la lista

Filtra por **unidad de negocio**, **Buscar por nombre…**, año, departamento y estado. Cada periodo muestra al empleado, sus fechas de inicio y fin, el año del periodo, los días y el estado:

| Estado | Qué significa |
|---|---|
| Activa | El periodo está vigente y sus días se pueden usar |
| Usada | Ya se usaron sus días |
| Vencida | Ya no se pueden usar |

## Cómo crear un periodo

1. Toca **Nuevo periodo**.
2. Elige la empresa y busca al empleado en **Buscar colaborador por nombre...**.
3. El sistema calcula solo, con su fecha de ingreso, el **último periodo cumplido**: **Fecha inicio**, **Fecha fin**, **Año del período vacacional** y los **Días** según Vacaciones por ley.
4. Revisa o ajusta los datos y el **Estado**.
5. Guarda.

> **Consejo:** si aparece «No existe una regla en «Vacaciones por ley» para N año(s). Captura los días manualmente.», escribe los días o agrega la regla que falta.

## Cómo corregir o eliminar un periodo

- **Editar** (lápiz): cambia los datos y confirma con **Confirmar cambios**.
- **Eliminar** (bote de basura): confirma en la ventana.

## Preguntas frecuentes

### ¿Por qué no puedo crear el periodo de alguien nuevo?

Porque todavía no cumple un año de antigüedad: «El empleado todavía no cumple un año de antigüedad.».

### ¿Qué pasa si la persona no tiene fecha de ingreso?

Verás «El empleado no tiene fecha de ingreso registrada.». Captúrala en su ficha.

### ¿Cómo afecta un periodo a su saldo?

Los días de sus periodos son los **días cargados** del [Panel de vacaciones](/ayuda/vacaciones/panel-de-vacaciones).

## Qué pasa si…

- **…falta un dato:** verás «Todos los campos son obligatorios».
- **…la fecha de inicio es mayor que la de fin:** verás «La fecha de inicio no puede ser mayor a la fecha fin».
- **…no elegiste empresa:** verás «Selecciona empresa primero».

## Relacionado

- [Vacaciones por ley: días y prima por antigüedad](/ayuda/vacaciones/vacaciones-por-ley)
- [Panel de vacaciones](/ayuda/vacaciones/panel-de-vacaciones)
- [Planeación de vacaciones](/ayuda/vacaciones/planeacion-de-vacaciones)
