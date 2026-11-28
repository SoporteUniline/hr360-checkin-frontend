# Expediente por etapas y cumplimiento de ley (28/11/2026)

Backend y reglas: `hr360-checkin-backend/docs/expediente-ley.md` (plazos de guarda, lista de ley, vínculos, ZIP) e
`INC-EXPEDIENTE-001` (ya no se borran documentos en su plazo legal de guarda).

| Pantalla | Ruta | Componente |
|---|---|---|
| Expediente y cumplimiento (empresa) | `/panel/expediente` | `src/components/expediente/TableroCumplimiento.jsx` |
| Expediente por etapas (persona) | `/panel/expediente/[id]?empresa=` | `src/components/expediente/ExpedientePersona.jsx` (+ `PasoLey`, `Carpeta`, `FormArchivo`, `Piezas`) |
| Enlace desde la ficha y Panel empleado | pestaña Documentos | `PanelEmpleadoDocumentos.jsx` («Ver expediente por etapas») |

- Menú: Gestión de personal → «Expediente y cumplimiento» (área «empleados» en `src/lib/permisos/permisos.mjs`; base, sin módulo).
- Lógica de presentación pura: `src/lib/expediente/presentacion.mjs` (pruebas `scripts/test-expediente.mjs`).
- Todo en la página (subir, reemplazar, «no aplica», depurar, empezar la salida): sin ventanas; Esc o Cancelar cierran.
- Reglas del dueño: letra 16 px (17 px en celular), títulos 700, secundario #4B5563, botones ≥ 48 px y principal ≥ 56 px,
  sin degradados. Verificado a 1440 y 390 con `scripts/verify-expediente.mjs`.
- Borrar en la pestaña Documentos: si el documento está en plazo, el aviso ofrece «Archivar»; si no, «Borrar
  definitivamente» manda `{ confirmar: true }`. Crear una categoría que parece prueba de embarazo o de VIH muestra el aviso
  del art. 133 que manda el backend.
- Centro de ayuda: `src/content/ayuda/empleados/expediente-por-etapas.md` y `expediente-digital.md` actualizada.
