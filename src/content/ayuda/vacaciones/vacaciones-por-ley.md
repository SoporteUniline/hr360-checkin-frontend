---
titulo: Vacaciones por ley: días y prima por antigüedad
resumen: Configura cuántos días de vacaciones y qué prima vacacional corresponden a cada año de antigüedad; con esta tabla se cargan solos los periodos de cada persona.
modulo: vacaciones
audiencia: [rh, dueno]
pantallas: [/panel/vacaciones/por-ley]
palabras: [vacaciones por ley, vacaciones dignas, antigüedad, días de vacaciones, prima vacacional, 12 días, artículo 76, artículo 80, regla, tabla de vacaciones]
orden: 20
actualizado: 2026-11-27
fuentes: [src/app/panel/vacaciones/por-ley/page.jsx, src/app/panel/vacaciones/por-periodo/page.jsx]
---

## Para qué sirve

Aquí defines la **tabla de vacaciones** de tu empresa: cuántos días y qué prima vacacional corresponden a cada **año de antigüedad**. El sistema usa esta tabla para:

- Crear solo, en cada aniversario, el **periodo** de vacaciones de cada persona con sus días.
- Proponer los días al capturar un periodo a mano.

## Quién la usa

Recursos Humanos y el dueño.

## Antes de empezar

Entra a **Ausencias y permisos → Vacaciones → Vacaciones por ley**.

![Tabla de Vacaciones por ley con años, días y prima vacacional](/ayuda/capturas/vacaciones/vacaciones-por-ley.webp "Una regla por año de antigüedad con sus días y su prima")

## Qué dice la ley

La Ley Federal del Trabajo (art. 76, reforma de 2023) da como mínimo:

| Años de servicio | Días |
|---|---|
| 1 | 12 |
| 2 | 14 |
| 3 | 16 |
| 4 | 18 |
| 5 | 20 |
| 6 a 10 | 22 |
| 11 a 15 | 24 |
| 16 a 20 | 26 |
| 21 a 25 | 28 |
| 26 a 30 | 30 |
| 31 a 35 | 32 |

Y una **prima vacacional** de al menos el **25 %** (art. 80). Tu empresa puede dar más.

## Cómo agregar una regla

1. Toca **Nueva regla**.
2. Elige la empresa (o unidad de negocio).
3. Escribe **Años** (de antigüedad) y **Días**.
4. Escribe la **Prima vacacional (%)**.
5. Si das días o prima adicionales, escribe **Días extra** y **Prima extra (%)**.
6. Revisa el **Total días** y el **Total prima (%)** y toca **Guardar**.

## Cómo editar o eliminar una regla

Usa el lápiz (**Editar**) o el bote de basura (**Eliminar**) de cada fila. Al eliminar te pregunta «¿Eliminar regla?»; esta acción no se puede deshacer.

## Preguntas frecuentes

### ¿Tengo que poner una regla para cada año?

No es obligatorio. Para cada persona el sistema usa la regla con el mayor número de años que no pase de su antigüedad. Por ejemplo, con reglas para 6 y 11 años, alguien con 8 años toma la de 6. Al capturar un periodo a mano, en cambio, se busca la regla exacta de sus años; si no existe, te pide capturar los días.

### ¿Cuándo se cargan los días a cada persona?

Cada noche, para quien cumple un año más de antigüedad, si tiene fecha de ingreso y hay regla para sus años.

### ¿Qué pasa si cambio una regla?

Aplica a los periodos que se creen desde ahora. Los periodos ya creados no cambian; corrígelos en [Vacaciones por periodo](/ayuda/vacaciones/vacaciones-por-periodo) si hace falta.

## Qué pasa si…

- **…faltan años o días:** verás «Empresa, Años y Días son obligatorios».
- **…pones números negativos:** verás «Años y Días deben ser valores positivos».
- **…ya hay una regla para esos años:** verás «Ya existe una regla con esos años para esta empresa».

## Relacionado

- [Vacaciones por periodo](/ayuda/vacaciones/vacaciones-por-periodo)
- [Panel de vacaciones](/ayuda/vacaciones/panel-de-vacaciones)
- [Cómo pedir vacaciones](/ayuda/vacaciones/pedir-vacaciones)
