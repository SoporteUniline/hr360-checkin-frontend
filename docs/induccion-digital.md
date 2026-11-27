# Inducción digital (27/12/2026) — frontend

Maqueta aprobada: Plantilla (0), Nuevos ingresos (1), Checklist (2), WhatsApp (3), Preingreso (4), Firma (5),
Bienvenida (6). Reglas y API: `docs/induccion-digital.md` del backend.

| Pantalla | Ruta | Componente |
|---|---|---|
| 0 · Plantillas de inducción (lista + roles) | `/panel/plantillas-induccion` (menú Ajustes) | `components/induccion/PlantillasInduccion.jsx` |
| 0 · Editor de plantilla | `/panel/plantillas-induccion/[id]` (`nueva` = en blanco) | `EditorPlantilla.jsx` |
| 1 · Nuevos ingresos (tablero) | `/panel/nuevos-ingresos` (menú Gestión de personal) | `NuevosIngresos.jsx` |
| 3 · Invitación manual con vista del WhatsApp | diálogo del tablero | `DialogoInvitar.jsx` |
| 2 · Checklist del primer día + revisión de documentos y alta | `/panel/nuevos-ingresos/[id]` | `DetalleIngreso.jsx` |
| 4 y 5 · Liga del celular (datos, documentos, firma, rostro) | `/ingreso/[token]` (pública, `no-referrer`, sin índice) | `Preingreso.jsx` |
| 6 · Ruta de bienvenida | `/empleado/panel/bienvenida` (enlace en Mi espacio si tiene ruta) | `RutaBienvenida.jsx` |

- Módulo `induccion` en `src/lib/modulos/catalogo.mjs` (mismas claves que el backend) y área en `src/lib/permisos`.
- Reutiliza: `EncabezadoPagina`, `useEmpresaNomina`/`SelectorEmpresa`, diálogos de `components/ui`, `FirmaGrande`
  (firma con el dedo), `useCapturaRostro` + `CapturaGuiada` y `CONSENTIMIENTO_BIOMETRICO` (rostro), `AVISO_EMPLEADOS`,
  `sanearHtml` (formatos), `RUTA_EMPLEADO` de Clima (encuesta de 30/90 días).
- La liga se muestra una sola vez (al invitar o reenviar); no se guarda en el navegador. La página pública usa una
  instancia de axios sin sesión.
- Foto de evidencia de la firma: cámara frontal (`getUserMedia`) en un diálogo propio; rostro con la captura guiada de
  siempre.
- Reglas de presentación (fechas, plazos «Día N», chips, validación inmediata de CURP/RFC/NSS/CLABE, errores de la liga):
  `src/lib/induccion/induccion.mjs`, probadas en `scripts/test-induccion.mjs` (CI).
- Navegador: `scripts/verify-induccion.mjs` (backend simulado, 1440 y 390; sin scroll horizontal, táctil ≥ 44 px, texto
  ≥ 13 px; cámara simulada de Chromium). `INDUCCION_DEV=1` lo corre con `next dev` para iterar.
- Límite conocido: el rostro en la verificación se simula (face-api necesita una cara real).
