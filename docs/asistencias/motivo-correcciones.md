# Toda corrección de checadas pide motivo (frontend)

Decisión del dueño (27/11/2026): **«Las checadas tienen que pedir motivo»**. Backend: `docs/motivo-correcciones.md` del
repositorio del backend (regla, 422 `FALTA_MOTIVO`, historial con `motivo` y `pantalla`, migración 20261230).

## Regla (src/lib/asistencia/motivoCorreccion.mjs, espejo del servidor)
- Se recorta; de **5 a 500** letras. Mensajes iguales a los del servidor: «Escribe el motivo de la corrección.», «El motivo
  debe tener al menos 5 letras.», «El motivo no puede pasar de 500 letras.».
- Cuerpo: `camposMotivo(texto, pantalla)` → `{ motivo_correccion, pantalla? }`. Los masivos siguen mandando `motivo`.
- `errorMotivoServidor(error)`: un 422 `FALTA_MOTIVO` se muestra junto al campo (no en un aviso suelto).
- `SUGERENCIAS`: las de «Corrección» del reloj del día, sin «Por el permiso del día» ni «Otro».

## Campo (src/components/asistencia/CampoMotivo.jsx)
«Motivo de la corrección (obligatorio)», `maxLength` 500, sugerencias como botones (44 px en celular), error con
`role="alert"` y `data-error-motivo` debajo del campo. Sin motivo el botón de guardar **no se desactiva**: al tocarlo dice
qué falta junto al campo y no manda nada.

## Pantallas
| Pantalla | Dónde | Antes → ahora |
|---|---|---|
| Centro de incidencias «Guardar» | `src/app/panel/incidencias/page.jsx` | Sin motivo → al cambiar entrada o salida aparece el campo debajo del renglón (fuera de la cuadrícula: las columnas siguen alineadas); `pantalla: "incidencias"`. |
| Entradas y salidas (edición en la fila) | `EntradasSalidasRow.jsx` + `useEntradaSalida.js` | Sin motivo → renglón propio debajo de la checada en edición. |
| Qué pasó (fila, reloj sin checadas, celular) | `CeldaEstadoDia.jsx` | Sin motivo de corrección → campo junto al goce y OK (aparte del «Motivo» del permiso). `pantalla`: `estado_dia` o `reloj_dia`. |
| Acciones masivas | `AccionesMasivas.jsx` | Motivo cualquiera → 5 a 500, sugerencias, error junto al campo; uno para todas las filas. |
| Comida agregada a mano (Editar / Quitar en las checadas del día) | `BotonAgregarComida.jsx` | Sin motivo → campo en los dos; `DELETE` manda el motivo en el cuerpo. |
| Registro masivo de incidencias (formulario sin botón hoy) | `FormularioAsistenciasMasivas.jsx` | Sin motivo → campo obligatorio. |
| Reloj del día | `lib/asistencia/relojDia.mjs` | Ya pedía motivo por renglón; «Otro» ahora con 5 letras (antes 3); quitar lo agregado a mano dice «Para quitar un registro agregado a mano elige el motivo.»; «No fue comida» (cambia las horas trabajadas) pide el motivo del renglón: «Para quitar la comida elige el motivo.». |
| Historial («Editado») | `CeldaEditado.jsx`, `lib/asistencia/historial.mjs` | Muestra «Motivo: …» y la pantalla de origen; en bases sin la migración lee el motivo del final de «después». |

`PanelEditarAsistencia.jsx` (y por él el guardado de `useAsistenciaActions`) no se usa en ninguna pantalla: si se vuelve a
usar, debe mandar `motivo_correccion` (el servidor responde 422 sin él al cambiar horas o qué pasó).

## Pruebas
- `scripts/test-motivo-correccion.mjs` (línea «Asistencias — cálculo» de ci-dev.yml).
- Navegador: `verify-incidencias-columnas`, `verify-entradas-motivo` (nuevo), `verify-reloj-dia`, `verify-quepaso-motivo`,
  `verify-tipos-goce`, `verify-asistencias-hoy-grupos`, `verify-refresco-asistencias`: sin motivo no hay petición y el error
  sale junto al campo; con motivo el cuerpo lleva `motivo_correccion` y `pantalla`.
