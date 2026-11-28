# Sistema de diseño de formularios y botones (28/11/2026)

Mockup aprobado por el dueño «ADAMIA · Formularios y botones» (4 tableros: botones y piezas, formulario grande en
página, ventana chica y formulario en celular a 390 px). Este documento dice **dónde vive cada cosa** y **cómo armar
un formulario nuevo** sin repetir colores ni tamaños.

**Mockup v3 (28/11/2026, aprobado «v3 con Plus Jakarta Sans en todo ADAMIA»).** El dueño se quejó de que los botones
quedaron enormes (48 y 56 px) y de que el formulario era angosto y dejaba vacía la mitad derecha. Cambió:
- la **letra** de todo ADAMIA (panel, app del empleado y página pública): **Plus Jakarta Sans** en lugar de Inter;
- en **escritorio** (≥ 1024 px) botones de **38 px** y campos de **42 px** (en celular siguen grandes: se tocan con el dedo);
- el **contrato** pasó a pantalla a todo el ancho: pasos como **pestañas** arriba, **grilla que se acomoda** (2, 3 o 4
  columnas) y **panel de resumen** a la derecha. Los demás formularios se migran uno por uno cuando el dueño lo pida.

> Regla de oro: los colores, alturas, letras y radios viven en **un solo lugar** (`src/app/globals.css`). Si el dueño
> pide «botones más grandes» o «otro azul», se cambia ahí y cambia en todo el sistema.

## 1. Tokens: dónde viven

`src/app/globals.css` tiene tres partes:

| Parte | Qué hay | Ejemplo |
|---|---|---|
| `:root` | El **valor** de cada token, con prefijo `--adamia-`. Primero van los de celular. | `--adamia-alto-campo: 56px;` |
| `@media (min-width: 1024px) { :root { … } }` | Los valores de **escritorio** (lg) que cambian. | `--adamia-alto-campo: 42px;` |
| `@theme inline` | Convierte cada token en **utilidades de Tailwind 4** con nombre propio. | `--spacing-campo` → `h-campo` |

### Colores

| Token (`:root`) | Valor | Utilidad | Para qué |
|---|---|---|---|
| `--adamia-blue` | `#2563eb` | `bg-brand`, `text-brand` | Azul ADAMIA: botón principal, enlaces, foco |
| `--adamia-blue-hover` | `#1d4ed8` | `bg-brand-hover` | Azul al pasar el mouse |
| `--adamia-navy` | `#080d36` | `text-navy` | Títulos (h1, h2) |
| `--adamia-franja` | `#f3f4f6` | `bg-franja` | Encabezado de página y franja de cada sección |
| `--adamia-bg-light` | `#f9fafb` | `bg-fondo-pagina` | Fondo de la página |
| `--adamia-borde` | `#e5e7eb` | `border-borde` | Bordes de tarjetas |
| `--adamia-borde-campo` | `#d1d5db` | `border-borde-campo` | Borde de campos y botones con contorno |
| `--adamia-texto` | `#111827` | `text-texto` | Texto normal |
| `--adamia-text-primary` | `#1f2937` | `text-texto-boton` | Texto de botones con contorno |
| `--adamia-text-secondary` | `#4b5563` | `text-texto-secundario` | Texto secundario (nunca más claro) |
| `--adamia-texto-deshabilitado` | `#6b7280` | `text-texto-deshabilitado` | Botón deshabilitado y *placeholder* |
| `--adamia-seleccion` / `-texto` | `#eff6ff` / `#1d4ed8` | `bg-seleccion`, `text-seleccion-texto` | Paso o elemento elegido |
| `--adamia-peligro` | `#dc2626` | `bg-peligro`, `border-peligro` | Botón rojo y borde de campo con error |
| `--adamia-peligro-texto` | `#b91c1c` | `text-peligro-texto` | Texto de error, «Dar de baja» |
| `--adamia-peligro-borde` | `#fca5a5` | `border-peligro-borde` | Contorno de peligro |
| `--adamia-paso-listo` | `#16a34a` | `bg-paso-listo` | Círculo ✓ del paso listo |

**Estados** (fondo / texto): `exito` `#DCFCE7/#166534`, `aviso` `#FEF3C7/#92400E`, `error` `#FEE2E2/#991B1B`,
`info` `#DBEAFE/#1E40AF`, `neutro` `#F3F4F6/#374151` → `bg-estado-exito text-estado-exito-texto`, etc.
**El color solo dice estado**; nunca se usa para decorar secciones (nada de fondos rosas, verdes o morados).
**Sin degradados, nunca.**

### Letra: Plus Jakarta Sans

La letra oficial es **Plus Jakarta Sans** (pesos 400, 500, 600 y 700; desde el 28/11/2026, antes Inter). Se guarda en el
proyecto (`src/fonts/plus-jakarta-sans-latin-var.woff2`, licencia SIL OFL) y se carga con `next/font/local` en
`src/fonts/index.js`, no con `next/font/google`: el 21/11/2026 dos despliegues fallaron porque Google Fonts no respondió.
- En CSS usa la variable neutra **`var(--font-adamia)`** (antes `--font-inter`, ya no existe). Si mañana cambia la letra,
  solo se cambia `src/fonts/index.js`.
- `src/app/layout.jsx` la pone en el `<body>`, así aplica en el panel, la app del empleado y la página pública. La página
  pública conserva **Outfit** en sus títulos (estilo propio aprobado).
- No escribas `font-family` sueltos con otro nombre; los PDF siguen con Poppins (`/fonts/Poppins-*.ttf`).
- `scripts/verify-letra.mjs` revisa en el navegador (1920, 1366 y 390) que la letra cargue y que no corte textos ni
  desborde en Permisos, Empleados, Contratos, Nómina y la app del empleado (Inicio y Reloj).

### Tamaños, letra y radios

En **escritorio** se usa el mouse: botones y campos compactos. En **celular** se usa el dedo: grandes. No los mezcles a
mano; las utilidades ya cambian solas en 1024 px.

| Token | Celular | Escritorio | Utilidad |
|---|---|---|---|
| `--adamia-alto-boton` | 48 | **38** | `h-boton` |
| `--adamia-alto-boton-principal` | 56 | **38** | `h-boton-principal` |
| `--adamia-alto-icono` | 44 | **36** | `size-icono` (solo ícono: renglones de tabla y la X de las ventanas) |
| `--adamia-alto-campo` | 56 | **42** | `h-campo` |
| `--adamia-letra-cuerpo` | 17 | 16 | `text-cuerpo` |
| `--adamia-letra-boton` / `-principal` | 17 / 18 | **15 / 15** | `text-boton`, `text-boton-principal` (peso 600) |
| `--adamia-letra-campo` | 18 | **16** | `text-campo` |
| `--adamia-letra-etiqueta` | 17 | **15** | `text-etiqueta` (en peso 600) |
| `--adamia-letra-ayuda` | 16 | 15 | `text-ayuda` (ayuda y error debajo del campo) |
| `--adamia-letra-titulo-seccion` | 20 | **18** | `text-titulo-seccion` (h2, peso 700) |
| `--adamia-letra-titulo-pagina` | 26 | **26** | `text-titulo-pagina` (h1, peso 700, `letter-spacing: -0.02em`) |
| `--adamia-radio-boton` | 10 | **8** | `rounded-boton` (botones y campos) |
| `--adamia-radio-seccion` | 14 | 14 | `rounded-seccion` (tarjetas) |
| `--adamia-ancho-resumen` | — | 320 | `w-resumen` (panel de resumen, desde 1200 px) |

Los botones llevan **16 px de relleno** a los lados en escritorio. El espaciado del título (`-0.02em`) viene con
`text-titulo-pagina` (`--adamia-espaciado-titulo-pagina`). Títulos siempre en **700**, nunca 800 (`font-bold`, no
`font-extrabold`).

### Si agregas un token

1. Valor en `:root` (y en el `@media` si cambia en escritorio).
2. Utilidad en `@theme inline` (`--color-…`, `--spacing-…`, `--text-…` o `--radius-…`).
3. Si es de tamaño, letra o radio, agrégalo a la lista que le toca en `src/lib/unirClases.mjs`. Así `cn()` sabe que
   `h-boton` le gana a `h-9` y que `text-boton` es letra y no color (si no, borraría `text-white`). La prueba
   `scripts/test-pasos-guiados.mjs` revisa que las dos listas coincidan.

## 2. Botones: uno por intención

`src/components/ui/button.jsx`. Elige por **lo que hace**, no por gusto.

| Intención | Código | Se ve (escritorio / celular) |
|---|---|---|
| Acción principal (Guardar, Continuar, Enviar). **Una por pantalla.** | `<Button size="lg">Guardar</Button>` | Azul `#2563eb`, 38 / 56 px |
| Acción normal azul (en una barra de lista) | `<Button>+ Nuevo</Button>` | Azul, 38 / 48 px |
| Secundario: Cancelar, Salir, Atrás, Exportar | `<Button variant="outline">Cancelar</Button>` | Blanco, borde `#D1D5DB`, texto `#1F2937`, 38 / 48 px |
| Consulta junto al título, como «Vista previa» (si hace falta) | `<Button variant="outline-brand">Vista previa</Button>` | Blanco con contorno y texto azul |
| Borrar o cancelar algo que no se deshace (siempre con confirmación) | `<Button variant="destructive">Eliminar</Button>` | Rojo |
| Abrir la confirmación de una baja | `<Button variant="destructive-outline">Dar de baja</Button>` | Contorno rojo |
| Apoyo poco importante | `variant="secondary"` / `"ghost"` / `"link"` | Gris / sin caja |
| Barras con muchos botones | `size="sm"` | 38 / 44 px |
| Solo ícono en un renglón de tabla | `<Button variant="outline" size="icon" aria-label="Editar"><Pencil /></Button>` | 36 / 44 px |

En escritorio todos miden 38 px, letra de 15 px en peso 600, radio de 8 px y 16 px de relleno: la principal se distingue
por el **color**, no por el tamaño. El azul relleno es el único llamativo de la pantalla.

- Deshabilitado: gris sólido (`#E5E7EB` con texto `#6B7280`); di cerca **por qué** no se puede.
- **No** le pongas `bg-…` de otro color en `className` (el candado lo rechaza). Si falta una intención, se agrega como
  variante en `button.jsx`.
- La variante verde `reactivate` se quitó (no tenía usos). «Reactivar» es una acción principal: azul.
- Los botones de las vistas de detalle (`BotonAccion` en `src/components/detalle`) usan las mismas variantes.

## 3. Piezas compartidas (`src/components/formulario`)

Se importan juntas: `import { EncabezadoPagina, SeccionFormulario, CampoFormulario } from "@/components/formulario";`
Cada archivo tiene arriba un comentario con sus props y un ejemplo.

### EncabezadoPagina
Franja gris con la ruta o «← Volver», el título (h1 azul marino de 26 px, 700, `-0.02em`), una descripción y las acciones
a la derecha. **Delgado (mockup v3):** `completo className="lg:px-8 lg:py-4"`, sin descripción, y a la derecha el aviso
(«Tienes cambios sin guardar») y, **solo si existe**, un botón secundario de vista previa del documento.
Las ~48 listas que lo importaban desde `components/tabla/EncabezadoPagina` siguen funcionando (ese archivo lo reexporta).
```jsx
<EncabezadoPagina completo volver={{ href: "/panel/contratos", texto: "Contratos" }}
  titulo="Contrato nuevo" descripcion="Llena cada paso." />
<EncabezadoPagina titulo="Puestos" subtitulo="Catálogo de puestos" acciones={<Button>+ Nuevo puesto</Button>} />
```
`completo` = de orilla a orilla (dentro de `PaginaFormulario`); sin él es una tarjeta con esquinas (listas).

### PaginaFormulario
El marco de un formulario grande: fondo `#F9FAFB`, encabezado arriba, contenido y la barra pegada abajo.
```jsx
<PaginaFormulario data-vista="formulario-vacante" encabezado={<EncabezadoPagina completo … />} barra={<BarraAccionesFormulario … />}>
  <SeccionFormulario titulo="Datos de la vacante">…</SeccionFormulario>
</PaginaFormulario>
```
- `ancho="completo"` (mockup v3): márgenes de 32 px en lugar de 48 y el contenido usa todo el ancho.
- `resumen={<ResumenFormulario … />}`: lo acomoda a la derecha desde 1200 px y abajo (plegable) con menos.

### SeccionFormulario
Tarjeta blanca con franja gris y título h2 (18 px en escritorio, 700). `columnas` = 1, 2 (por defecto), 3 o **"auto"**.
```jsx
<SeccionFormulario titulo="Sueldo" descripcion="Lo que gana y cada cuándo se le paga." columnas={2}>…</SeccionFormulario>
```

**Grilla que se acomoda (`columnas="auto"`, mockup v3).** Para formularios a todo el ancho: **1 columna en celular, 2
desde 768 px, 3 desde 1200 px y 4 desde 1600 px**, con la tarjeta más compacta (franja de 12 px, título y descripción en
un renglón, cuerpo de 20 px). Úsala con `PaginaFormulario ancho="completo"`. Un campo largo (CLABE, dirección) ocupa 2
columnas con `CAMPO_ANCHO`; una nota, un aviso o un texto largo (observaciones) va a lo ancho con `RENGLON_COMPLETO`:
```jsx
<SeccionFormulario titulo="Forma de pago" descripcion="A dónde se le deposita." columnas="auto">
  <CampoFormulario id="banco" etiqueta="Banco">{(p) => <Lista {...p} … />}</CampoFormulario>
  <CampoFormulario id="clabe" etiqueta="CLABE" obligatorio className={CAMPO_ANCHO}>{(p) => <input {...p} />}</CampoFormulario>
  <CampoFormulario id="notas" etiqueta="Observaciones" className={RENGLON_COMPLETO}>{(p) => <textarea {...p} />}</CampoFormulario>
</SeccionFormulario>
```
Con 1, 2 o 3 la grilla es fija (los formularios angostos de siempre: permiso, acta).

### CampoFormulario
Etiqueta arriba (ligada con `htmlFor`/`id`), el control, y abajo la ayuda o el error (con `aria-describedby` y
`aria-invalid`). `children` es una **función** que recibe las props del control ya con las clases del sistema:
```jsx
<CampoFormulario id="ct-puesto" etiqueta="Puesto" obligatorio ayuda="Así aparece en el contrato." error={errorDe("puesto")}>
  {(p) => <input {...p} value={puesto} onChange={(e) => setPuesto(e.target.value)} />}
</CampoFormulario>
```
Para un `<textarea>`: `className={cn(p.className, CLASE_TEXTO_LARGO)}`. Si armas el control tú: `claseControl(error)`.
Un campo que ocupa todo el renglón: `className="md:col-span-2"`.

### BarraAccionesFormulario
Pegada abajo. Escritorio: Cancelar a la izquierda y solo; a la derecha el aviso, «← Atrás», Siguiente y la principal
(azul, la única llamativa; con `flecha: true` dice «Continuar →»). Celular: la principal a todo lo ancho y los demás
debajo. Cada acción es `{ texto, onClick, cargando, deshabilitado }` o `null`. En el mockup v3 el aviso («Tienes cambios
sin guardar», «Borrador guardado…») va en el encabezado, a la derecha, y la barra lleva `className="lg:px-8 lg:py-3"`.
```jsx
<BarraAccionesFormulario cancelar={{ onClick: salir }} atras={paso > 1 ? { onClick: anterior } : null}
  principal={{ texto: "Continuar", onClick: continuar }} aviso="Borrador guardado hace 1 min" />
```
Con un `<form id="x">`: `principal={{ texto: "Guardar", type: "submit", form: "x" }}`.

### PestanasPasos (mockup v3)
Los pasos como **pestañas horizontales** debajo del encabezado gris, de orilla a orilla (el contenido usa todo el ancho).
Cada pestaña: ✓ verde si está lista, el número azul subrayado si es el actual, gris si falta llegar, y la pastilla roja
**«Falta N»** si a ese paso le faltan datos. Con clic (o ← → del teclado) se va a cualquier paso. En celular no hay
pestañas: queda la barra «Paso N de M · …» con el porcentaje (`AvancePasosMovil`, la misma de PasosGuiados). Va dentro
del `encabezado` de la página, después del `EncabezadoPagina`:
```jsx
<PaginaFormulario ancho="completo" encabezado={<>
    <EncabezadoPagina completo className="lg:px-8 lg:py-4" volver={{ href: "/panel/contratos", texto: "Contratos" }} titulo="Contrato nuevo" />
    <PestanasPasos pasos={PESTANAS} actual={paso} visitados={visitados} errores={{ sueldo: 1 }} alElegir={irAPaso} idPanel="contrato-paso" />
  </>}>
  <div id="contrato-paso" role="tabpanel">{contenido[paso]}</div>
</PaginaFormulario>
```
**¿Pestañas o PasosGuiados?** Pestañas cuando el formulario debe usar todo el ancho y cada paso tiene varios campos
(contrato). PasosGuiados (lista a la izquierda) en los que todavía no se migran a v3 (acta).

### ResumenFormulario (mockup v3)
Panel de **resumen** de 320 px a la derecha, visible **desde 1200 px** (pegado arriba al bajar); con menos se vuelve un
bloque **plegable** «Resumen · Falta N datos» debajo del formulario. Muestra lo más importante de lo capturado (para no
regresar a otro paso a revisarlo) y una fila **«Falta»** con una pastilla roja por dato que falta (o «Nada» en verde).
Solo **muestra**: los números salen de las reglas del módulo, nunca se calculan en la pieza.
```jsx
<ResumenFormulario
  filas={[{ etiqueta: "Persona", valor: "Persona Uno Demo" }, { etiqueta: "Por quincena", valor: "$6,000.00", destacado: true }]}
  faltan={["CLABE"]} nota="El sueldo al mes y el diario los calcula la nómina al guardar." />
```
Úsalo en formularios largos por pasos, donde lo capturado en un paso se deja de ver en el siguiente. No hace falta en
una página de una sola sección ni en una ventana chica.

### PasosGuiados
Para formularios largos por pasos (versión con la lista a la izquierda). Escritorio: lista a la izquierda (✓ Listo verde, «Estás aquí» azul, Pendiente gris,
«Falta corregir (n)» rojo). Celular: «Paso 2 de 5 · Sueldo y pago» con el porcentaje y una barra.
Las reglas (estado de cada paso, porcentaje, anterior/siguiente) están en `src/lib/formulario/pasosGuiados.mjs` y se
prueban en `scripts/test-pasos-guiados.mjs`.
```jsx
<PasosGuiados pasos={PASOS} actual={paso} visitados={visitados} errores={{ sueldo: 2 }} alElegir={irAPaso}>
  {contenido[paso]}
</PasosGuiados>
```
Ejemplo: `src/app/panel/actas-administrativas/formulario/FormularioActa.jsx`. El contrato ya usa PestanasPasos.

**Dos reglas de los formularios por pasos (INC-012, `docs/incidentes/INC-012-acta-pierde-datos.md`):**
- Cada paso se monta como árbol nuevo: PasosGuiados ya pone `key={actual}` al contenido. Si armas tus propios pasos con
  campos sin control (`register` de react-hook-form), pon tú la llave; si no, React reusa los `<input>` de otro paso y
  al regresar se ve el dato de otro campo.
- Para llevar el foco al campo con error usa `prepararFocoCampo()` (`src/lib/formulario/focoCampo.mjs`) AL INICIO de
  la acción, nunca `setTimeout(() => el.focus(), 60)`: el foco a ciegas brincaba a otro campo mientras la persona
  escribía y lo tecleado se perdía.

### Lista, Dato y Nota (`PiezasFormulario.jsx`)
Lista desplegable nativa (en el celular abre la del teléfono, grande), un dato de solo lectura y una nota (explicación
gris, aviso ámbar o error rojo). Nacieron en el contrato y las usan el permiso y el acta.
```jsx
<CampoFormulario id="permiso-empresa" etiqueta="Empresa" obligatorio>
  {(p) => <Lista {...p} opciones={[{ value: "7", label: "Comercializadora" }]} valor={v} onCambio={setV} vacio="Selecciona empresa…" />}
</CampoFormulario>
```

### Desplegables con iconos dentro de una página
`SelectConIconos` (y `QuePasoMotivo`, `CamposQuePaso`, `CamposPermisoHoras` que lo usan) aceptan `grande`: dentro de un
contenedor `data-formulario-grande` toman el alto y la letra de los campos (42/56 px, 16/18 px), las etiquetas de 15/17
en 600 y la ayuda en #4B5563. Sin `grande` se ven como siempre (filas de Asistencias, reloj del día, app del empleado).

### EtiquetaEstado
```jsx
<EtiquetaEstado tono="aviso">Por vencer</EtiquetaEstado>   // exito · aviso · error · info · neutro
```
`Pastilla` (vistas de detalle) es la misma pieza.

### VentanaChica
Para hasta 6 campos y una sola idea. Franja gris, X de 36 px (44 en celular), Cancelar y Guardar (38 px; 56 en celular). Es un `<form>`: Enter guarda.
**No se cierra al hacer clic afuera** (lo hace `src/components/ui/dialog.jsx` para todas las ventanas).
```jsx
<VentanaChica abierta={abierta} alCambiar={setAbierta} titulo="Crear puesto" alGuardar={guardar} guardando={guardando}>
  <CampoFormulario id="puesto-nombre" etiqueta="Nombre del puesto" obligatorio error={error}>
    {(p) => <input {...p} value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />}
  </CampoFormulario>
</VentanaChica>
```
Ejemplo: `src/app/panel/catalogos/puestos/PositionFormDialog.jsx`.

### Formularios viejos con campos de shadcn
Si un formulario usa `Input`, `Select`, `Textarea` y `FormLabel` de `components/ui` (como la ficha del empleado), pon
`data-formulario-grande` en su contenedor: `globals.css` les da los tamaños del sistema sin tocar su lógica. Esos
campos se reconocen por `data-control="campo"`. Un campo que deba quedarse chico lleva `data-compacto`.

## 4. ¿Página o ventana?

| Va en **página** (`PaginaFormulario`) | Va en **ventana chica** (`VentanaChica`) |
|---|---|
| Más de 6 campos, varias secciones, documentos o firmas: contrato, empleado, nómina, vacante, acta, préstamo | Hasta 6 campos y una sola idea: crear puesto, departamento, categoría o motivo; confirmar un borrado |

La ventana se cierra solo con Esc, Cancelar, Guardar o la X; lo escrito no se pierde.

## 5. Cómo agregar un formulario nuevo, paso a paso

1. Decide **página o ventana** con la tabla de arriba.
2. Pon las **reglas puras** (validar, armar lo que se manda) en `src/lib/<modulo>/*.mjs` con su prueba en
   `scripts/test-<modulo>.mjs` (ejemplo: `src/lib/contratos/formularioContrato.mjs`).
3. El **estado y las llamadas** en un hook `use<Algo>` (ejemplo: `useFormularioContrato.js`): carga con SWR, guarda
   con `axios` de `@/lib/axios`, avisa con `enqueueSnackbar`.
4. La **pantalla**: `PaginaFormulario` + `EncabezadoPagina completo` + una `SeccionFormulario` por tema +
   `CampoFormulario` por dato + `BarraAccionesFormulario`. Si es largo, envuelve las secciones en `PasosGuiados`.
5. Un solo botón principal (`size="lg"`, azul). Cancelar con `variant="outline"`.
6. Si sales con cambios sin guardar, usa `useGuardiaSalida` (`src/components/cambios/CambiosPendientes.jsx`).
7. Agrega el archivo a `MIGRADOS` en `scripts/candado-diseno.mjs` y corre `node scripts/candado-diseno.mjs`.
8. Revisa en el navegador a 1920, 1366 y 390 (puedes copiar `scripts/verify-diseno.mjs`).
9. ¿Es largo, por pasos y debe aprovechar el ancho? Sigue el contrato (mockup v3): `ancho="completo"`, `PestanasPasos`,
   `columnas="auto"` y `ResumenFormulario`.

## 6. El candado

`node scripts/candado-diseno.mjs` (corre en CI, `.github/workflows/ci-dev.yml`) falla si en `src/` (sin la página
pública: `components/landing`, `app/home`, `app/(public)`, `app/(landing)`) aparece algo **nuevo** de esto:

| Regla | Qué busca |
|---|---|
| `degradado` | `bg-gradient-*`, `linear-gradient(`, `radial-gradient(` |
| `peso-800` | `font-extrabold`, `font-black`, `font-weight: 800/900` |
| `boton-no-azul` | `<Button>` con `bg-<otro color>` en `className` (también el azul escrito a mano) o `variant="reactivate"` |
| `primario-propio` | `--primary:` dentro de un `.module.css` |
| `fondo-decorativo` | `bg-<color>-50/100/200` en los archivos de `MIGRADOS` y en `src/components/formulario` |

Lo que ya existía está en `scripts/candado-diseno.excepciones.json` (por regla y archivo). Es un **trinquete**: un
archivo no puede tener más casos que los anotados; cuando migres uno, corre `node scripts/candado-diseno.mjs
--actualizar` para bajar el número (nunca lo sube). Pruebas de las reglas: `node --test scripts/test-candado-diseno.mjs`.

## 7. Pruebas del sistema de diseño

- `node --test scripts/test-pasos-guiados.mjs` — pasos guiados y `cn()` con los tokens.
- `node --test scripts/test-candado-diseno.mjs` — reglas del candado.
- `scripts/verify-diseno.mjs` (Playwright, 1440 y 390, backend simulado; `ANCHOS=1920,1366,390` para otros): contrato
  nuevo y editar (pestañas, columnas de la grilla según el ancho, resumen a la derecha o plegable), alta de empleado (4
  pestañas) y la ventana «Crear puesto». `ETAPA=antes` solo toma capturas para comparar antes y después.
- `scripts/lib/reglasDiseno.mjs` tiene las medidas mínimas (`MINIMOS`): en escritorio botón ≥ 38 (ícono ≥ 36), campo ≥ 42,
  letra ≥ 16 (etiquetas, botones, pestañas y lo `data-chico`, ≥ 15); en celular botón ≥ 48, campo ≥ 48, letra ≥ 17. La
  usan `verify-diseno`, `verify-contratos`, `verify-permiso-acta-pagina` y `verify-prestamos`.
- `scripts/verify-letra.mjs` (1920, 1366 y 390): la letra cargada es Plus Jakarta Sans, sin desborde ni textos recortados
  nuevos en las pantallas principales.
- `scripts/verify-permiso-acta-pagina.mjs` (Playwright, 1440 y 390): permiso nuevo y editar, acta nueva por pasos y
  editar, regreso al origen (`?volver=`), aviso de cambios sin guardar y las mismas reglas de diseño (están en
  `scripts/lib/reglasDiseno.mjs`, compartidas con `verify-diseno`). Reglas puras: `node --test scripts/test-permiso-acta-pagina.mjs`.

## 8. Formularios ya en página y qué falta migrar

**Permiso** y **acta administrativa** pasaron a página propia (28/11/2026):

| Página | Desde dónde se llega | Archivos |
|---|---|---|
| `/panel/permisos/nuevo?empresa=&volver=` | «Nuevo permiso» de la lista de Permisos | `app/panel/permisos/formulario/` (`FormularioPermiso`, `usePermisoFormulario`, `PaginaPermiso`) |
| `/panel/permisos/[id]/editar?empresa=&volver=` | lápiz «Editar» de la lista | lo mismo + `usePermisoAEditar` |
| `/panel/actas-administrativas/nueva?volver=` | «Nueva acta» de la lista de actas | `app/panel/actas-administrativas/formulario/` (`FormularioActa`, `useFormularioActa`, `PaginaActa`) |
| `/panel/actas-administrativas/[id]/editar?volver=` | lápiz «Editar» de la lista | lo mismo |

- El permiso va en una sola página (es una idea: quién, qué pasó, cuándo); el acta va en 5 pasos (persona y tipo · qué
  pasó · sanción y quién la elabora · declaraciones · revisar y guardar). La firma del acta sigue en su detalle.
- `?volver=` regresa a donde estaba la persona al guardar o cancelar; solo acepta rutas `/panel/…`
  (`lib/formulario/rutaRegreso.mjs`). Sin él, regresa a la lista del módulo.
- La lógica de negocio no cambió: los hooks son copia fiel de las ventanas. `PermisoDialog.jsx` y `NewActaModal.jsx`
  quedaron **sin uso** y se borran cuando el dueño lo confirme.

Lo demás: ver la lista por módulo en `scripts/candado-diseno.excepciones.json`.

## 9. El contrato con el mockup v3 (28/11/2026)

`src/app/panel/contratos/formulario/FormularioContrato.jsx` (nuevo, duplicar, desde la ficha y editar):
- **Encabezado delgado**: «← Contratos» (o «← Contrato CT-…») y el título; a la derecha «Tienes cambios sin guardar» y, al
  editar, el estado y «Ver documento» (abre en otra pestaña el documento ya guardado, en `/panel/contratos/[id]#documento`).
  Al crear no hay documento todavía, así que no hay vista previa.
- **Pestañas** de los 5 pasos. «Falta N» sale en un paso cuando ya se revisó con «Continuar», al intentar guardar o
  cuando ya lo visitaste y le falta algo (la misma revisión de `validarFormulario`). Al crear, «Guardar contrato» está en
  el último paso y revisa todo; al editar, «Guardar cambios» está en todos.
- **Grilla** `columnas="auto"` en cada paso; las notas y los textos largos van a lo ancho.
- **Resumen** (`src/lib/contratos/resumenContrato.mjs`, con pruebas en `scripts/test-formulario-contrato.mjs`): persona,
  puesto y área, sueldo, jornada, fecha de inicio y lo que falta. Al **editar**, el sueldo al mes, por periodo y diario son
  los que manda el servidor (la misma conversión que la nómina, `sueldoDesglose`). Al **crear** solo se muestra lo que se
  escribió (el sueldo de cada periodo); el mensual y el diario los calcula la nómina al guardar y no se adivinan.
- La lógica no cambió: mismas validaciones, llamadas, aviso de salida y parámetros (`?duplicar`, `?empleado`, `?empresa`,
  `?sueldo`, `?periodicidad`).
