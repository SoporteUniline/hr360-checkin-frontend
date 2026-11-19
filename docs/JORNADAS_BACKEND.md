# Contrato de backend — Jornadas, cálculo de horas y horas extra

Para: responsable de `redlab_back` (módulo de asistencia, `/checador/*`).
Estado: **propuesta para revisión** · 2026-11-13 · Decisión D-002 (el cálculo vive en el backend).

## Por qué
Hoy las horas trabajadas, programadas y la diferencia **se calculan en el navegador** cada vez
(`src/utils/asistenciaHoras.js`) y **no se guardan**. `hrs_extra` es solo un sí/no: no se sabe
**cuántas** horas extra hubo. Además el cálculo actual:
- usa horas decimales (8.5) en lugar de minutos;
- da negativo en turnos que cruzan medianoche (22:00 → 05:00);
- siempre resta `hrs_comida`, aunque no se haya tomado.

Objetivo: que el backend calcule **una sola vez**, en **minutos enteros**, y lo guarde en el mismo
registro de asistencia. Pantallas, reportes, incidencias y nómina leen ese número.

**Principios (no negociables):**
1. Nunca modificar ni borrar las checadas originales (`entrada`, `salida`); las correcciones siguen en `entrada_corregida` / `salida_corregida`.
2. Todo en **minutos enteros** y timestamps completos. Nada de decimales como fuente.
3. Cambiar un turno **no recalcula el pasado**: cada asistencia guarda el horario que se le aplicó.
4. Si falta una checada, no se inventa: queda `incompleto`.
5. Tiempo extra detectado **nunca se borra**; RH solo decide cuánto se **autoriza**.
6. Solo migraciones **aditivas** (`ADD COLUMN ... NULL`, tablas nuevas). Probar primero en `adamia_dev`.

El frontend **degrada con gracia**: si un campo nuevo no viene, usa el cálculo actual (corregido).
Se puede implementar por partes, en el orden de las secciones.

---

## 1. Columnas nuevas en la tabla de asistencias
(la que sirve `GET /checador/asistencias`). Todas `NULL` para no romper registros existentes.

| Columna | Tipo | Ejemplo | Significado |
|---|---|---|---|
| `fecha_operativa` | DATE | 2026-11-09 | Día al que pertenece el turno (un turno 22:00 lun → 05:00 mar es del **lunes**). |
| `horario_aplicado` | JSON | `{"entrada":"08:00","salida":"17:00","comida_inicio":"13:00","comida_fin":"14:00","comida_computable":false,"id_turno":3}` | Copia del horario vigente ese día. Es lo que evita alterar el pasado. Hoy ya existen `hora_entrada_programada` / `hora_salida_programada`; esto las complementa. |
| `min_programados` | INT | 480 | Minutos que le tocaba trabajar según `horario_aplicado` (ya descontada la comida no computable). |
| `min_trabajados` | INT | 510 | Tiempo efectivo: (salida − entrada) − descansos que sí se descuentan. Usa los valores corregidos si existen. |
| `min_descanso_descontado` | INT | 60 | Minutos de comida/descanso restados. |
| `min_diferencia` | INT | 30 | `min_trabajados − min_programados` (puede ser negativo). |
| `min_retardo` | INT | 7 | `max(0, entrada real − entrada programada)`. **Valor real**, sin restar tolerancia. |
| `retardo_en_tolerancia` | TINYINT | 1 | 1 si `min_retardo ≤ tolerancia_entrada_min` vigente. Clasificación, no cambia minutos. |
| `min_salida_anticipada` | INT | 0 | `max(0, salida programada − salida real)`. |
| `min_nocturnos` | INT | 0 | Minutos trabajados entre 20:00 y 06:00 (para clasificar la jornada). |
| `tipo_jornada` | ENUM('diurna','nocturna','mixta') | diurna | Según `min_nocturnos`: 0 → diurna; ≥ 210 (3 h 30 min) → nocturna; resto → mixta. |
| `min_extra_detectados` | INT | 30 | `max(0, min_trabajados − min_programados)`. Candidato, **no** es pago. |
| `min_extra_autorizados` | INT | 30 | Lo que RH autoriza (≤ detectados). NULL = sin revisar. |
| `extras_autorizadas_en` | DATETIME | | Fecha/hora de la autorización. (Ya existen `extras_autorizadas_por`, `forma_pago_extras`, `notas_hrs_extra`.) |
| `estado_calculo` | ENUM('calculado','incompleto','sin_turno','pendiente_historico') | calculado | `incompleto` = falta entrada o salida; `sin_turno` = empleado sin jornada (no marcar retardos); `pendiente_historico` = registro viejo sin datos suficientes. |
| `calculo_version` | VARCHAR(20) | `2026.11-1` | Versión del algoritmo que generó el cálculo. |
| `calculado_en` | DATETIME | | Último cálculo. |

**Compatibilidad:** seguir llenando `hrs_extra = (min_extra_autorizados > 0)` para que nada existente se rompa.

Índice sugerido: `(id_empresa, fecha_operativa)` y `(id_empleado, fecha_operativa)`.

---

## 2. Historial de turno por empleado (vigencias)
Hoy el empleado tiene un solo `id_turno` y quitarlo es un `DELETE`. Agregar:

```sql
CREATE TABLE empleado_turno_historial (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_empresa    INT NOT NULL,
  id_empleado   INT NOT NULL,
  id_turno      INT NOT NULL,
  fecha_desde   DATE NOT NULL,
  fecha_hasta   DATE NULL,          -- NULL = vigente
  motivo        VARCHAR(255) NULL,
  creado_por    INT NOT NULL,       -- del token, no del body
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_emp_fecha (id_empresa, id_empleado, fecha_desde)
);
```
- Al asignar un turno nuevo: cerrar el vigente (`fecha_hasta = fecha_desde_nuevo − 1 día`) e insertar el nuevo, **en una transacción**. Rechazar si se encima con otro periodo.
- Mantener `empleados.id_turno` sincronizado con el vigente (compatibilidad).
- **Carga inicial:** una fila por empleado con su `id_turno` actual y `fecha_desde = fecha de la migración`. No inventar fechas anteriores.

En la tabla de días del turno, agregar `comida_computable TINYINT NOT NULL DEFAULT 0`: 1 = la comida cuenta como tiempo trabajado (no se descuenta).

---

## 3. Reglas laborales versionadas por fecha
Global (no por empresa). Nunca números fijos en el código.

```sql
CREATE TABLE reglas_laborales (
  id                         INT AUTO_INCREMENT PRIMARY KEY,
  vigente_desde              DATE NOT NULL UNIQUE,
  max_semana_min             INT NOT NULL,   -- jornada ordinaria semanal
  max_dia_diurna_min         INT NOT NULL,   -- 480
  max_dia_nocturna_min       INT NOT NULL,   -- 420
  max_dia_mixta_min          INT NOT NULL,   -- 450
  max_extra_semana_min       INT NOT NULL,
  max_extra_dia_min          INT NOT NULL,   -- 240
  max_dias_extra_semana      INT NOT NULL,   -- 4
  fuente                     VARCHAR(255) NOT NULL,
  verificado                 TINYINT NOT NULL DEFAULT 0
);
```
Valores iniciales propuestos (reforma LFT publicada el 1-may-2026, **pendientes de verificar contra el DOF**, por eso `verificado = 0`):

| vigente_desde | semana | extra/semana |
|---|---|---|
| 2026-05-01 (o fecha de entrada en vigor) | 48 h (2880) | 9 h (540) |
| 2027-01-01 | 46 h (2760) | 9 h (540) |
| 2028-01-01 | 44 h (2640) | 10 h (600) |
| 2029-01-01 | 42 h (2520) | 11 h (660) |
| 2030-01-01 | 40 h (2400) | 12 h (720) |

Se aplica la fila con mayor `vigente_desde ≤ fecha_operativa`.

---

## 4. Cuándo calcular
Calcular (o recalcular) **solo el registro afectado**:
- al registrar la salida (`POST /checador/reloj/registrar`, `registrar-facial`);
- al corregir (`PUT /checador/reloj/actualizar/:id`, `PUT /checador/asistencias/:id`);
- al aprobar un permiso, incapacidad o vacación que cubra ese día.

Al cambiar el turno de un empleado, recalcular **solo desde `fecha_desde`** en adelante.
El cálculo debe ser determinista (mismos datos → mismo resultado) e idempotente.

**Retirar o restringir** `POST /checador/config-checador/aplicar-historico`: hoy recalcula el pasado con la tolerancia actual.

---

## 5. Endpoints

### 5.1 `GET /checador/asistencias` (existente)
Solo agregar las columnas de la sección 1 en cada fila. Sin cambios de parámetros.

### 5.2 `PUT /checador/asistencias/:id/extras` (nuevo)
Reemplaza el envío del registro completo para autorizar horas extra.
```jsonc
// body
{ "min_extra_autorizados": 30, "forma_pago_extras": "Pago de horas extras", "notas_hrs_extra": "Cierre de mes" }
```
- `extras_autorizadas_por` y `extras_autorizadas_en` se toman del **token y del reloj del servidor**, nunca del body.
- Validar `0 ≤ min_extra_autorizados ≤ min_extra_detectados`.
- Validar que el registro pertenezca a una empresa del usuario.
- Para autorización masiva: `PUT /checador/asistencias/extras` con `{ items: [{id, min_extra_autorizados, forma_pago_extras}] }` **en una sola transacción** (hoy el front hace un bucle no atómico).

### 5.3 `GET /checador/jornada/resumen` (nuevo — pantalla "Resumen de jornada")
Query: `fechaInicio`, `fechaFin`, `id_empresa`, `id_sucursal`, `id_departamento`, `id_empleado` (mismos nombres que el dashboard).

```jsonc
{
  "totales": {
    "min_programados": 2400,          // todo el periodo
    "min_programados_vencidos": 480,  // solo días ya transcurridos (semana en curso)
    "min_trabajados": 2305,
    "min_diferencia": -95,            // contra programados_vencidos
    "min_extra_detectados": 70,
    "min_extra_autorizados": 0,
    "incidencias": { "retardos": 3, "salidas_anticipadas": 1, "incompletos": 2, "alertas_legales": 0 }
  },
  "empleados": [
    {
      "id_empleado": 15, "nombre": "…", "departamento": "…", "turno": "Administrativa",
      "min_programados": 2400, "min_programados_vencidos": 2400, "min_trabajados": 2305,
      "min_diferencia": -95, "min_extra_detectados": 70, "min_extra_autorizados": 0,
      "incidencias": 4,
      "estado": "revisar"             // ok | revisar | incompleto | sin_turno
    }
  ],
  "reglas": { "vigente_desde": "2026-05-01", "max_semana_min": 2880, "verificado": false }
}
```
- **Semana en curso:** la diferencia se calcula contra los días ya transcurridos; las horas de días futuros no son faltantes.
- Paginación igual que `/checador/asistencias` (`page`, `limit`, `sortBy`, `sortOrder`).

### 5.4 `GET /checador/jornada/resumen/:id_empleado` (nuevo — detalle)
Mismos filtros de fecha. Devuelve una fila por `fecha_operativa` con las columnas de la sección 1, más:
```jsonc
{ "checadas": [ { "tipo": "entrada", "original": "2026-11-10T08:07:00-06:00", "corregida": null, "origen": "facial" } ] }
```

### 5.5 Historial de turno (nuevo)
- `GET /checador/empleados/:id/turnos-historial` → filas de `empleado_turno_historial`.
- `POST /checador/empleados/:id/turno` `{ id_turno, fecha_desde, motivo }` → transacción de la sección 2 y recálculo desde `fecha_desde`.

---

## 6. Clasificación semanal de horas extra (después de 1–5)
Por empleado y semana laboral, con la regla vigente:
- Extra autorizada hasta `max_extra_semana_min` y `max_extra_dia_min` / `max_dias_extra_semana` → **doble** (art. 67).
- Excedente → **triple** (art. 68).
- Menores de 18 años: no se permite tiempo extra; marcar alerta (requiere `fecha_nacimiento`).
- Cualquier caso dudoso → `pendiente_revision`, nunca se descarta tiempo.
Devolver en el resumen: `min_extra_doble`, `min_extra_triple`, `alertas_legales[]`.

---

## 7. Migración de datos existentes
1. `ALTER TABLE ... ADD COLUMN ... NULL` (sección 1). Sin `DROP`, sin `RENAME`.
2. Respaldo antes de ejecutar en producción; correr primero en `adamia_dev`.
3. Recalcular registros pasados **usando sus propios** `hora_entrada_programada` / `hora_salida_programada` / `hrs_comida`. Si faltan → `estado_calculo = 'pendiente_historico'`. No aplicar el turno actual al pasado.
4. Llenar `empleado_turno_historial` como en la sección 2.

---

## 8. Pruebas mínimas que deben pasar (minutos exactos)
| # | Caso | Esperado |
|---|---|---|
| 1 | 08:00–17:00, comida 60 no computable | trabajados 480, programados 480, diferencia 0 |
| 2 | 22:00 lun – 05:00 mar | trabajados 420, `fecha_operativa` = lunes, `tipo_jornada` nocturna |
| 3 | Entrada 08:07, tolerancia 10 | `min_retardo` 7, `retardo_en_tolerancia` 1, trabajados sin regalar minutos |
| 4 | Salida 16:45 (programada 17:00) | `min_salida_anticipada` 15, diferencia −15 |
| 5 | Entrada sin salida | `estado_calculo` incompleto, trabajados NULL |
| 6 | Salida 17:50 | extra detectados 50; autorizar 30 → autorizados 30, detectados sigue 50 |
| 7 | Autorizar 60 cuando detectados 50 | 400 |
| 8 | Cambiar turno el 1-jul | mayo conserva su cálculo; julio usa el nuevo |
| 9 | Comida computable | no descuenta comida |
| 10 | Usuario de otra empresa consulta resumen | 403 |
| 11 | Mismo evento de checada enviado dos veces | un solo registro, mismo resultado |
| 12 | Semana en curso, lunes con 8 h | diferencia 0 (no −32 h) |
