# Contrato de backend — Dashboard de RH (`/panel/dashboard`)

Este documento describe lo que el **frontend** ya envía y espera para el nuevo
Dashboard de RH. El backend (`redlab_back`, controlador
`modules/attendance/controllers/dashboardController.js`) debe extenderse para:

1. **Aceptar filtros** por rango de fechas, empresa, unidad de negocio (sucursal)
   y departamento.
2. **Devolver métricas del periodo** (no solo "de hoy").
3. **Agregar bloques nuevos**: comparativo vs. periodo anterior, plantilla por
   departamento, incidencias, asistencia por departamento, heatmap por unidad,
   contratos por vencer, documentos por vencer y rotación.

El frontend está construido para **degradar con gracia**: si un bloque no viene en
la respuesta, se muestra un estado vacío ("Pendiente de datos…") en lugar de
romper. Se puede implementar por partes.

---

## 1. Endpoint principal: `GET /checador/dashboard`

### Query params que envía el frontend

| Param | Ejemplo | Descripción |
|-------|---------|-------------|
| `fechaInicio` | `2026-07-08` | Inicio del rango (YYYY-MM-DD). |
| `fechaFin` | `2026-07-14` | Fin del rango (inclusive). |
| `fechaInicioPrev` | `2026-07-01` | Inicio del **periodo anterior** (misma longitud) para el comparativo. |
| `fechaFinPrev` | `2026-07-07` | Fin del periodo anterior. |
| `id_empresa` | `12` | Empresa. Si no aplica filtro, puede omitirse. |
| `id_sucursal` | `4` | Unidad de negocio. Ausente/`all` = todas. |
| `id_departamento` | `7` | Departamento. Ausente/`all` = todos. |

> Todos los agregados (`presentes`, `tardanzas`, `distribucion*`, `tendencia*`,
> tablas, etc.) deben respetar estos filtros.

### Respuesta esperada

```jsonc
{
  "ok": true,
  "data": {
    // ---- KPIs (del periodo, ya no solo "hoy") ----
    "fecha": "2026-07-14",
    "totalEmpleados": 248,
    "empleadosIncluidos": 250,          // opcional (plan contratado)
    "empleadosExcedentes": 2,           // opcional
    "presentes": 213,                   // (compat: se sigue leyendo presentesHoy)
    "tardanzas": 14,                    // (compat: tardanzasHoy)
    "ausentes": 21,                     // (compat: ausentesHoy)
    "asistenciaPromedioPct": 86,        // % promedio de asistencia del periodo
    "promedioHoras": 8.2,               // horas de jornada efectiva promedio
    "tardanzasPctSobreRegistros": 6.5,
    "sinChecarPct": 8.5,
    "eventosMes": 12,

    // ---- Comparativo vs. periodo anterior (para los deltas de las KPIs) ----
    "periodoAnterior": {
      "totalEmpleados": 245,
      "presentes": 208,
      "tardanzas": 18,
      "ausentes": 16,
      "permisosActivos": 9,
      "promedioHoras": 7.9
    },

    // ---- Distribución por tipo de asistencia (ya existe) ----
    // color ∈ emerald|amber|rose|violet|indigo|sky|fuchsia|cyan|teal|lime|orange
    "distribucionAsistenciaDetallada": [
      { "key": "presente", "label": "Presente", "count": 213, "color": "sky" },
      { "key": "falta",    "label": "Falta",    "count": 21,  "color": "orange" }
    ],

    // ---- Tendencia (ya existe) ----
    "tendenciaSemanal": [
      {
        "fecha": "2026-07-08",
        "asistencias": 208, "tardanzas": 12, "ausentes": 26, "permisos": 7,
        "permisosPorTipo": { "Vacaciones": 3, "Incapacidad": 2 }   // opcional (tooltip)
      }
    ],

    // ---- NUEVO: asistencia por departamento ----
    "asistenciaPorDepartamento": [
      { "departamento": "Sistemas", "pct": 97 },
      { "departamento": "Producción", "pct": 88 }
    ],

    // ---- NUEVO: heatmap asistencia por día × unidad de negocio ----
    "heatmapUnidad": {
      "dias": ["08", "09", "10", "11", "12", "13", "14"],
      "unidades": ["Matriz CDMX", "Sucursal MTY", "Planta QRO"],
      "valores": [                       // % asistencia; filas = unidades, cols = días
        [88, 91, 90, 52, 20, 93, 89],
        [85, 87, 86, 40, 0, 90, 88],
        [80, 84, 83, 60, 30, 86, 84]
      ]
    },

    // ---- NUEVO: distribución de personal por departamento (headcount) ----
    "distribucionPorDepartamento": [
      { "departamento": "Producción", "count": 78 },
      { "departamento": "Ventas", "count": 52 }
    ],

    // ---- NUEVO: departamentos con más incidencias (en el periodo) ----
    "incidenciasPorDepartamento": [
      { "departamento": "Producción", "faltas": 9, "tardanzas": 6, "tasaAusentismo": 11.5 }
    ],

    // ---- NUEVO: contratos por vencer ----
    "contratosPorVencer": [
      {
        "nombre_empleado": "Roberto Aguilar",
        "departamento": "Producción",
        "tipo_contrato": "Temporal",
        "fecha_vencimiento": "2026-07-19",
        "dias_restantes": 5
      }
    ],

    // ---- NUEVO: documentos por vencer (vigencias del expediente) ----
    "documentosPorVencer": [
      {
        "nombre_empleado": "Ana Gómez Ruiz",
        "documento": "Examen médico",
        "departamento": "Ventas",
        "fecha_vencimiento": "2026-07-21",
        "dias_restantes": 7        // o bien "estado": "Vigente"
      }
    ],

    // ---- NUEVO: rotación del periodo ----
    "rotacion": {
      "altas": 6,
      "bajas": 3,
      "rotacionPct": 1.2,
      "antiguedadPromedio": 3.4,   // años
      "plantillaNeta": 3,          // altas - bajas
      "plantillaAnterior": 245     // headcount al inicio del periodo
    },

    // ---- Ya existen: eventos y permisos ----
    "cumpleanosMes":  [{ "id_empleado": 1, "nombre_empleado": "…", "nombre_empresa": "…", "fecha_nacimiento": "2026-07-09" }],
    "aniversariosMes":[{ "id_empleado": 1, "nombre_empleado": "…", "nombre_empresa": "…", "fecha_ingreso": "2021-07-11" }],
    "permisosRangos": [{
      "nombre_empleado": "…", "nombre_empresa": "…", "tipo": "Vacaciones",
      "status": { "label": "En curso" }, "inicio": "2026-07-06", "fin": "2026-07-20", "regresa": "2026-07-21"
    }],

    // ---- Ya existen: tablas operativas ----
    "tardanzasDetalle": [{ "id_asistencia": 1, "nombre_empleado": "…", "nombre_empresa": "…", "hora_entrada": "09:14" }],
    "sinChecarCount": 21,
    "sinChecar": [{ "id_empleado": 1, "nombre_empleado": "…", "nombre_empresa": "…" }],

    // ---- OPCIONAL: si se prefiere, el detalle de asistencias puede venir aquí
    //      en vez de en /checador/asistencias ----
    "asistenciasDetalle": [/* mismos campos que /checador/asistencias registros */]
  }
}
```

> **Compatibilidad**: el frontend lee `presentes` con *fallback* a `presentesHoy`
> (igual `tardanzas`→`tardanzasHoy`, `ausentes`→`ausentesHoy`). Se puede migrar sin
> romper la versión actual.

---

## 2. Endpoints de apoyo (ya existen, deben respetar filtros)

### `GET /checador/holidays/:id_empresa`
Params: `page=1&limit=5000&filter=`. Respuesta: `{ festivos: [{ fecha: "YYYY-MM-DD" }] }`.
Se usa para calcular **días hábiles** en la tabla de permisos.

### `GET /checador/asistencias`
El frontend lo llama con:
`?empresa=<id>&fechaInicio=<>&fechaFin=<>&id_sucursal=<>&id_departamento=<>&page=1&limit=200`.
Respuesta: `{ registros: [{ id, nombre, apellido_paterno, apellido_materno, departamento,
tipo_registro_nombre, fecha, entrada, salida, asistencia, notas, ... }] }`.
**Debe filtrar por `id_sucursal` e `id_departamento`** cuando se envían.

### Combos de filtros (ya existen)
- Unidades de negocio: `GET /checador/sucursales?id_empresa=<id|all>` → `{ sucursales: [{ id_sucursal, nombre, id_empresa, empresa_nombre }] }`.
- Departamentos: `GET /checador/departamentos?id_empresa=<id>` → `{ departamentos: [{ id_departamento, nombre }] }`.

---

## 3. Prioridad sugerida de implementación

1. **Filtros + métricas del periodo** (`fechaInicio/Fin`, `id_sucursal`, `id_departamento`)
   en las métricas y tablas que ya existen. *(Desbloquea el 70% del dashboard.)*
2. **`periodoAnterior`** → activa los deltas de las KPIs.
3. **`asistenciaPorDepartamento`** e **`incidenciasPorDepartamento`**.
4. **`distribucionPorDepartamento`** (headcount) y **`rotacion`**.
5. **`contratosPorVencer`** y **`documentosPorVencer`** (dependen del expediente).
6. **`heatmapUnidad`** (nice-to-have).
