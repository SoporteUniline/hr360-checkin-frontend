---
titulo: Calibración 9-box y bono de desempeño a nómina
resumen: Revisa en grupo el desempeño contra el potencial en el 9-box, mueve tarjetas con motivo, cierra la calibración y genera el bono que pasa a la nómina en borrador.
modulo: evaluaciones
audiencia: [rh, dueno, jefe]
pantallas: [/panel/evaluaciones/calibracion, /empleado/panel/evaluaciones/calibracion, /empleado/panel/evaluaciones/equipo]
palabras: [calibración, 9-box, nine box, potencial, talento, bono de desempeño, nómina, reglas de bono, estrella, alto potencial, bitácora]
orden: 60
actualizado: 2026-11-27
fuentes: [src/components/evaluaciones/talento/CalibracionView.jsx, src/components/evaluaciones/talento/EquipoTalento.jsx, src/lib/evaluaciones/talento.mjs]
---

## Para qué sirve

La **calibración** es una junta en la que RH y los jefes revisan juntos las calificaciones de una campaña para que sean justas y parejas entre áreas. ADAMIA lo hace con el **9-box**: desempeño (bajo, medio, alto) contra potencial (tres niveles). Lo calibrado es lo que se publica. Después puedes calcular un **bono de desempeño** que pasa a la nómina.

## Quién la usa

- **RH y dueño**: abren, mueven, cierran y reabren la calibración; definen las reglas del bono, lo generan y lo aprueban.
- **Jefes o personas que RH designe**: pueden mover tarjetas en la calibración.
- **Dirección**: consulta.
- **Jefes**: en **Mi equipo** ven el lugar de cada colaborador en el 9-box de la última calibración cerrada.

## Antes de empezar

- Entra a **Evaluación de desempeño › Calibración y bono** y elige la **Campaña**.
- Entran a la calibración las personas con su evaluación **completa y sin publicar**.

## Cómo abrir la calibración

1. Si la campaña no se ha calibrado verás «Esta campaña no se ha calibrado». Presiona **Abrir calibración**.
2. Escribe el nombre de los 3 niveles de potencial, de menor a mayor (por omisión Bajo, Medio y Alto).
3. Confirma.

> **Importante:** Mientras la calibración esté abierta no se publica a nadie de la campaña.

## Cómo leer el 9-box

Arriba ves cuántas personas hay, cuántas se ajustaron, cuántas están sin potencial y si la calibración está abierta o cerrada.

Las filas son el desempeño según la calificación calibrada (con los cortes que se indican, por omisión menos de 3, de 3 a 3.99 y 4 o más) y las columnas el potencial. Cada casilla tiene un nombre:

| Desempeño \ Potencial | Bajo | Medio | Alto |
|---|---|---|---|
| Alto | Profesional sólido | Alto desempeño | Estrella |
| Medio | Efectivo | Pilar | Alto potencial |
| Bajo | Bajo desempeño | Dilema | Diamante en bruto |

Las personas que aún no tienen potencial aparecen en **Sin potencial asignado**.

![Calibración 9-box con personas en cada casilla y una sin potencial asignado](/ayuda/capturas/evaluaciones/calibracion-9-box.webp "Calibración 9-box")

## Cómo mover a una persona

1. Toca la tarjeta de la persona.
2. En la ventana **Mover a** (con su nombre) elige el **Desempeño** y el **Potencial**. Verás su calificación original y la actual.
3. Si cambias de fila de desempeño, escribe una **Calificación calibrada** dentro del rango de esa fila.
4. Escribe el **Motivo (obligatorio)**, de al menos 5 letras.
5. Presiona **Guardar movimiento**. El cambio queda en la **Bitácora** con quién, cuándo, de dónde a dónde y por qué.

## Otras acciones de la calibración

- **Agregar a quien ya terminó**: suma a las personas que completaron su evaluación después de abrir.
- **Quién más calibra**: RH siempre calibra; aquí eliges a los jefes o personas que también pueden mover tarjetas.
- **Cerrar calibración**: se activa cuando todas las personas tienen potencial. Al cerrar verás «Calibración cerrada: ya puedes publicar».
- **Reabrir**: pide un motivo. No se puede si ya se publicó a alguien calibrado.

## Cómo definir las reglas del bono

1. Cambia a la pestaña **Bono a nómina**.
2. En **Reglas por banda de calificación** presiona **Editar reglas**.
3. Por cada banda escribe **Nombre**, **Desde** y **Hasta** (de 1 a 5, sin encimarse), el **Tipo** (monto fijo o porcentaje) y el **Monto (MXN)** o **Porcentaje**. Usa **Agregar banda** (hasta 10) o **Quitar regla**.
4. Presiona **Guardar reglas**. Cambiar reglas no modifica bonos ya aprobados.

El porcentaje se calcula sobre el sueldo mensual de la ficha de nómina (sueldo diario × 30).

## Cómo generar y aprobar el bono

1. En **Generar bonos**, elige una nómina **en borrador** y presiona **Calcular bonos**. Se crea un bono en borrador por cada persona con resultado **publicado**. Repetir no duplica.
2. Verás cuántos son nuevos, recalculados, reabiertos, sin cambio y omitidos (con el motivo, por ejemplo, si su periodicidad no coincide con esa nómina).
3. En **Bonos de la campaña** marca los que quieras (o **Seleccionar borradores**) y presiona **Aprobar (N)**. Sale «Bonos aprobados».
4. Cuando calcules la nómina, cada bono aprobado aparece como percepción «Bono de desempeño». La tabla dirá **En el recibo** o «Calcula la nómina».

Para quitar un bono presiona **Cancelar** y escribe el motivo. Sale del borrador de nómina al recalcularla; si la nómina ya se envió o autorizó, no se puede.

## Preguntas frecuentes

### ¿El colaborador ve su lugar en el 9-box?

No. Lo ven RH, Dirección, las personas designadas para calibrar y su jefe en **Mi equipo**.

### ¿Qué calificación se publica, la original o la calibrada?

La calibrada. Si una persona no entró a la calibración cerrada de su campaña, no se puede publicar hasta agregarla.

### ¿Puedo pagar el bono en una nómina ya autorizada?

No. La nómina destino debe estar en borrador.

## Qué pasa si…

### …no puedo cerrar la calibración

Hay personas **sin potencial**. Asígnales uno y vuelve a intentar.

### …alguien más movió la misma tarjeta

Sale un aviso de que alguien más la cambió. Recarga y vuelve a moverla.

### …una persona sale como «omitida» al generar el bono

Su periodicidad de pago no es la de la nómina elegida, u otra razón que la pantalla indica. Genera el bono en la nómina que le corresponde.

## Relacionado

- [Resultados, publicación y acuse](/ayuda/evaluaciones/resultados-y-acuse)
- [Seguir y cerrar una campaña](/ayuda/evaluaciones/seguimiento-campana)
- [Objetivos](/ayuda/evaluaciones/objetivos)
