# Sistema de diseño de formularios y botones (28/11/2026)

Mockup aprobado por el dueño «ADAMIA · Formularios y botones» (4 tableros: botones y piezas, formulario grande en
página, ventana chica y formulario en celular a 390 px). Este documento dice **dónde vive cada cosa** y **cómo armar
un formulario nuevo** sin repetir colores ni tamaños.

> Regla de oro: los colores, alturas, letras y radios viven en **un solo lugar** (`src/app/globals.css`). Si el dueño
> pide «botones más grandes» o «otro azul», se cambia ahí y cambia en todo el sistema.

## 1. Tokens: dónde viven

`src/app/globals.css` tiene tres partes:

| Parte | Qué hay | Ejemplo |
|---|---|---|
| `:root` | El **valor** de cada token, con prefijo `--adamia-`. Primero van los de celular. | `--adamia-alto-campo: 56px;` |
| `@media (min-width: 1024px) { :root { … } }` | Los valores de **escritorio** (lg) que cambian. | `--adamia-alto-campo: 52px;` |
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

### Tamaños, letra y radios

| Token | Celular | Escritorio | Utilidad |
|---|---|---|---|
| `--adamia-alto-boton` | 48 | 48 | `h-boton` |
| `--adamia-alto-boton-principal` | 56 | 56 | `h-boton-principal` |
| `--adamia-alto-icono` | 44 | 44 | `size-icono` (solo renglones de tabla y la X de las ventanas) |
| `--adamia-alto-campo` | 56 | 52 | `h-campo` |
| `--adamia-letra-cuerpo` | 17 | 16 | `text-cuerpo` |
| `--adamia-letra-boton` / `-principal` | 17 / 18 | 16 / 17 | `text-boton`, `text-boton-principal` |
| `--adamia-letra-campo` | 18 | 17 | `text-campo` |
| `--adamia-letra-etiqueta` | 17 | 16 | `text-etiqueta` (en peso 600) |
| `--adamia-letra-ayuda` | 16 | 15 | `text-ayuda` (ayuda y error debajo del campo) |
| `--adamia-letra-titulo-seccion` | 20 | 21 | `text-titulo-seccion` (h2, peso 700) |
| `--adamia-letra-titulo-pagina` | 26 | 30 | `text-titulo-pagina` (h1, peso 700) |
| `--adamia-radio-boton` | 10 | 10 | `rounded-boton` (botones y campos) |
| `--adamia-radio-seccion` | 14 | 14 | `rounded-seccion` (tarjetas) |

Títulos siempre en **700**, nunca 800 (`font-bold`, no `font-extrabold`).

### Si agregas un token

1. Valor en `:root` (y en el `@media` si cambia en escritorio).
2. Utilidad en `@theme inline` (`--color-…`, `--spacing-…`, `--text-…` o `--radius-…`).
3. Si es de tamaño, letra o radio, agrégalo a la lista que le toca en `src/lib/unirClases.mjs`. Así `cn()` sabe que
   `h-boton` le gana a `h-9` y que `text-boton` es letra y no color (si no, borraría `text-white`). La prueba
   `scripts/test-pasos-guiados.mjs` revisa que las dos listas coincidan.

## 2. Botones: uno por intención

`src/components/ui/button.jsx`. Elige por **lo que hace**, no por gusto.

| Intención | Código | Se ve |
|---|---|---|
| Acción principal (Guardar, Continuar, Enviar). **Una por pantalla.** | `<Button size="lg">Guardar</Button>` | Azul, 56 px |
| Acción normal azul (en una barra de lista) | `<Button>+ Nuevo</Button>` | Azul, 48 px |
| Cancelar, Salir, Atrás, Exportar | `<Button variant="outline">Cancelar</Button>` | Gris con contorno, 48 px |
| Borrar o cancelar algo que no se deshace (siempre con confirmación) | `<Button variant="destructive">Eliminar</Button>` | Rojo |
| Abrir la confirmación de una baja | `<Button variant="destructive-outline">Dar de baja</Button>` | Contorno rojo |
| Apoyo poco importante | `variant="secondary"` / `"ghost"` / `"link"` | Gris / sin caja |
| Barras con muchos botones | `size="sm"` | 44 px |
| Solo ícono en un renglón de tabla | `<Button variant="outline" size="icon" aria-label="Editar"><Pencil /></Button>` | 44 × 44 |

- Deshabilitado: gris sólido (`#E5E7EB` con texto `#6B7280`); di cerca **por qué** no se puede.
- **No** le pongas `bg-…` de otro color en `className` (el candado lo rechaza). Si falta una intención, se agrega como
  variante en `button.jsx`.
- La variante verde `reactivate` se quitó (no tenía usos). «Reactivar» es una acción principal: azul.
- Los botones de las vistas de detalle (`BotonAccion` en `src/components/detalle`) usan las mismas variantes.

## 3. Piezas compartidas (`src/components/formulario`)

Se importan juntas: `import { EncabezadoPagina, SeccionFormulario, CampoFormulario } from "@/components/formulario";`
Cada archivo tiene arriba un comentario con sus props y un ejemplo.

### EncabezadoPagina
Franja gris con la ruta o «← Volver», el título (h1 azul marino, 700), una descripción y las acciones a la derecha.
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

### SeccionFormulario
Tarjeta blanca con franja gris y título h2 (21 px, 700). `columnas` = 1, 2 (por defecto) o 3 en escritorio.
```jsx
<SeccionFormulario titulo="Sueldo" descripcion="Lo que gana y cada cuándo se le paga." columnas={2}>…</SeccionFormulario>
```

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
Pegada abajo. Escritorio: Cancelar a la izquierda; a la derecha el aviso, Atrás, Siguiente y la principal. Celular: la
principal a todo lo ancho y los demás debajo. Cada acción es `{ texto, onClick, cargando, deshabilitado }` o `null`.
```jsx
<BarraAccionesFormulario cancelar={{ onClick: salir }} atras={paso > 1 ? { onClick: anterior } : null}
  principal={{ texto: "Continuar", onClick: continuar }} aviso="Borrador guardado hace 1 min" />
```
Con un `<form id="x">`: `principal={{ texto: "Guardar", type: "submit", form: "x" }}`.

### PasosGuiados
Para formularios largos por pasos. Escritorio: lista a la izquierda (✓ Listo verde, «Estás aquí» azul, Pendiente gris,
«Falta corregir (n)» rojo). Celular: «Paso 2 de 5 · Sueldo y pago» con el porcentaje y una barra.
Las reglas (estado de cada paso, porcentaje, anterior/siguiente) están en `src/lib/formulario/pasosGuiados.mjs` y se
prueban en `scripts/test-pasos-guiados.mjs`.
```jsx
<PasosGuiados pasos={PASOS} actual={paso} visitados={visitados} errores={{ sueldo: 2 }} alElegir={irAPaso}>
  {contenido[paso]}
</PasosGuiados>
```
Ejemplo completo: `src/app/panel/contratos/formulario/FormularioContrato.jsx`.

### EtiquetaEstado
```jsx
<EtiquetaEstado tono="aviso">Por vencer</EtiquetaEstado>   // exito · aviso · error · info · neutro
```
`Pastilla` (vistas de detalle) es la misma pieza.

### VentanaChica
Para hasta 6 campos y una sola idea. Franja gris, X de 44 px, Cancelar y Guardar (56 px). Es un `<form>`: Enter guarda.
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
8. Revisa en el navegador a 1440 y 390 (puedes copiar `scripts/verify-diseno.mjs`).

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
- `scripts/verify-diseno.mjs` (Playwright, 1440 y 390, backend simulado): contrato nuevo, alta de empleado (4
  pestañas) y la ventana «Crear puesto». `ETAPA=antes` solo toma capturas para comparar antes y después.

## 8. Qué falta migrar

Ver la lista por módulo en `scripts/candado-diseno.excepciones.json` y el reporte de esta entrega. Propuestos para pasar
a página (hoy son ventanas grandes con el estilo ya homologado): permiso (`PermisoDialog.jsx`) y acta administrativa
(`NewActaModal.jsx`).
