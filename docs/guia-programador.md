# Guía para programar en el frontend de ADAMIA (28/11/2026)

Para quien llega nuevo. Lee esto, luego `docs/sistema-diseno.md` (cómo se ven las pantallas) y el documento del
módulo que vayas a tocar (están en `docs/`, por ejemplo `docs/vistas-de-detalle.md`, `docs/nomina/`, `docs/asistencias/`).

Tecnología: **Next.js 15** (App Router) en **JSX** (sin TypeScript), **Tailwind 4**, **SWR** para leer datos, **axios**
para escribir, **react-hook-form + zod** en los formularios grandes, **Radix/shadcn** (`src/components/ui`), **vaul**
(Drawer) y **lucide-react** (íconos). Todo el texto de la interfaz va en **español de México**.

## 1. Carpetas de `src/`

| Carpeta | Qué va ahí |
|---|---|
| `app/` | Rutas (cada `page.jsx` es una pantalla). |
| `app/panel/<modulo>/` | Panel de RH, un módulo por carpeta. Los componentes que solo usa ese módulo viven junto a su `page.jsx`. |
| `app/dashboard/` | Panel del dueño de ADAMIA (empresas, cobros, plantillas de WhatsApp, tablas fiscales…). |
| `app/empleado/` | App del colaborador («Mi espacio») y su reloj. |
| `app/[slug]/`, `app/seleccionar-reloj/` | Reloj checador por empresa. |
| `app/(public)/`, `app/(landing)/`, `app/home/` | Página pública (estilo propio aprobado; no usa el sistema de diseño del panel). |
| `components/` | Piezas compartidas entre módulos. Archivos sueltos en PascalCase (`ComboboxSucursal.jsx`, `RelojChecador.jsx`) y carpetas por tema (`nomina/`, `reclutamiento/`, `activos/`, `detalle/`…). |
| `components/ui/` | Componentes base de shadcn/Radix (`button.jsx`, `dialog.jsx`, `input.jsx`…). Nombres en minúscula. |
| `components/formulario/` | Piezas del sistema de diseño: encabezado, sección, campo, barra de acciones, pasos, etiqueta de estado, ventana chica. |
| `hooks/` | Hooks `useAlgo.js`: leer datos (`useEmpleadosData`) o acciones (`useAsistenciaActions`). `hooks/Capacitor/` para la app nativa. |
| `lib/` | Lógica **pura** y clientes de API. Las reglas van en `.mjs` sin React para poder probarlas con `node --test` (`lib/contratos/formularioContrato.mjs`, `lib/asistencia/*.mjs`). Clientes: `contratosApi.js`, `expedienteApi.js`… |
| `schemas/` | Esquemas zod de formularios (`schemaEmpleado.jsx`). |
| `context/` | `AuthContext.jsx` (`useAuth()` → `dataUser`, empresas, zona horaria). |
| `utils/` | Utilidades viejas (`asistenciaHoras.js`, `exportExcelJS.js`). Lo nuevo va en `lib/`. |
| `content/ayuda/` | Artículos del Centro de ayuda en Markdown. |
| `app/globals.css` | Tokens del sistema de diseño y estilos globales. |

## 2. Estilo de código (el de Luis)

Luis Ángel (commits «LuisAngelGGG», «Luis Ángel», «devjsluis») escribió la base de Asistencias, Empleados y el Reloj.
Sigue su forma para que el código se lea igual en todo el sistema:

- **Componentes**: un archivo por componente, `export default function NombreEnPascalCase({ props con valores por omisión })`.
  Nombres en español que dicen qué es: `FormularioEmpleado`, `AsistenciaTable`, `AsistenciaRow`, `AsistenciaFilters`,
  `MobileAsistenciaView`, `EditarDiaAsistencia`, `CeldaGoce`. Las celdas de una tabla se llaman `Celda<Algo>`.
- **Contenedor de datos + vista**: `<Modulo>DataContainer.jsx` pide los datos con los hooks y se los pasa a la tabla
  (`AsistenciaDataContainer` → `AsistenciaTable` → `AsistenciaRow`). En celular hay una vista aparte (`Mobile<Modulo>View`).
- **Hooks de datos** (`useAsistenciaData`, `useEmpleadosData`): reciben los filtros como argumentos, arman la URL con
  `URLSearchParams` y la piden con `useSWR(url, fetcherWithToken, swr_config)`. Si falta algo (empresa), la URL es
  `null` y no se pide nada.
- **Hooks de acciones** (`useAsistenciaActions`): guardan el estado de edición (`registro`, `draft`, `isSaving`) y
  regresan funciones `handleAlgo` (`handleEditClick`, `handleSaveClick`, `handleCancelEdit`). Guardan con
  `axios.put(\`${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/...\`)`, avisan con `enqueueSnackbar(...)` de notistack
  (`variant: "success" | "error"`) y refrescan con `mutate`. Patrón `try { … } catch (error) { mensaje del servidor } finally { setIsSaving(false) }`.
- **Esquemas**: `export const schemaAlgo = z.object({...})` con los mensajes de error en español; el formulario lo usa
  con `useForm({ resolver: zodResolver(schemaAlgo), defaultValues })`.
- **Constantes** arriba del archivo (`const numericFields = new Set([...])`, `DIAS_SEMANA`), funciones chicas de apoyo
  arriba del componente.
- Comillas dobles, punto y coma, comas al final. Los nombres de variables mezclan español e inglés como ya está
  (`editingRowId`, `isSaving`, `handleFieldChange`); en código nuevo prefiere español claro.
- **Comentarios en español** que explican el *por qué* (con fecha cuando es una decisión del dueño), no el *qué*.

Lo que se sumó después y también se sigue: las reglas puras en `src/lib/<modulo>/*.mjs` con su prueba en
`scripts/test-<modulo>.mjs`, y las pantallas con las piezas de `src/components/formulario`.

## 3. Dónde está cada módulo

| Módulo | Pantallas | Lógica y API |
|---|---|---|
| Empleados (ficha, alta) | `app/panel/empleados/` (`FormularioEmpleado.jsx`, `tabs/Tab*.jsx`) | `schemas/schemaEmpleado.jsx`, `lib/empleado/`, `hooks/useEmpleadosData.js` |
| Asistencias | `app/panel/registro-asistencia/` | `hooks/useAsistencia*.js`, `lib/asistencia/` |
| Reloj checador | `components/RelojChecador.jsx`, `components/Clock/` | `hooks/useRelojChecador.js`, `lib/reloj/` |
| Contratos | `app/panel/contratos/` (`formulario/`, `[id]/`, `nuevo/`) | `lib/contratos/`, `lib/contratosApi.js` |
| Vacaciones y permisos | `app/panel/vacaciones/`, `app/panel/permisos/` (alta y edición en página: `permisos/formulario/`, `nuevo/`, `[id]/editar/`) | `hooks/usePermisos*.js`, `lib/permisos/` |
| Incidencias | `app/panel/incidencias/` | — |
| Nómina y préstamos | `app/panel/nomina/`, `components/nomina/` | `lib/nomina/` |
| Expediente | `app/panel/expediente/`, `components/expediente/` | `lib/expediente/`, `lib/expedienteApi.js` |
| Reclutamiento | `app/panel/reclutamiento/`, `components/reclutamiento/` | `hooks/useReclutamiento.js` |
| Actas administrativas | `app/panel/actas-administrativas/` (alta y edición en página, por pasos: `formulario/`, `nueva/`, `[id]/editar/`) | `hooks/useAdministrativeMinutes.js`, `lib/actasEstatus.mjs`, `lib/actas/` |
| Activos y uniformes | `app/panel/activos/`, `components/activos/` | `lib/activos/` |
| Catálogos (puestos, departamentos…) | `app/panel/catalogos/` | — |
| Menú lateral | `components/Sidebar/nav-main.jsx` | — |

## 4. Cómo correr, probar y verificar

```bash
npm ci                                   # instalar
npm run dev                              # desarrollo (http://localhost:3000)
npm run lint                             # lint: errores = falla, avisos = se aceptan
NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build   # compilación como en CI
```

**Pruebas de lógica** (rápidas, sin navegador): `node --test scripts/test-<algo>.mjs`. La lista completa que corre CI
está en `.github/workflows/ci-dev.yml` (paso «Asistencias — cálculo de horas y exportación» y los siguientes). Las del
sistema de diseño: `node --test scripts/test-pasos-guiados.mjs scripts/test-candado-diseno.mjs`.

**Candado del diseño**: `node scripts/candado-diseno.mjs` (ver `docs/sistema-diseno.md`, sección 6).

**Verificaciones en navegador** (Playwright, backend simulado con datos de demostración; necesitan el build de arriba):

```bash
PLAYWRIGHT_MODULE_PATH=/ruta/a/playwright CAPTURAS=/carpeta/capturas node scripts/verify-<modulo>.mjs
```

Hay un `scripts/verify-*.mjs` por módulo (`verify-contratos`, `verify-ficha-empleado`, `verify-prestamos`,
`verify-nomina-formal`, `verify-expediente`, `verify-diseno`…). Si cambias una pantalla, corre el de su módulo; si cambias
un selector, ajústalo sin quitar lo que comprueba.

**Antes de terminar**: lint, pruebas de lógica, candado, build y el `verify-*` del módulo. Borra `.next` al final si
compilaste en una copia de trabajo.

## 5. Reglas que no se rompen

- Nada de degradados ni `font-extrabold`; títulos en 700 (el candado lo revisa).
- Un solo botón principal azul por pantalla; Cancelar gris con contorno.
- Más de 6 campos → página; hasta 6 y una idea → ventana chica. Las ventanas no se cierran al tocar afuera.
- Letra de 16 px en escritorio y 17 en celular; botones de 48 px (principal 56).
- No uses nombres de personas reales en datos de ejemplo ni en pruebas.
