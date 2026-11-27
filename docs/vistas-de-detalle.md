# Vistas de detalle (27/11/2026)

> Una **vista de detalle** es la pantalla principal al abrir un registro (un contrato, una persona, un permiso, un
> finiquito, un acta). Reemplaza los diálogos de «Ver detalles» y los racimos de iconos en la fila. La primera es
> **Contratos** (`/panel/contratos/[id]`, maquetas aprobadas «Main» y «ContratoMovil»); siguen Empleado 360, permisos,
> finiquitos y actas con las mismas piezas.

Piezas en `src/components/detalle/` (importa desde `@/components/detalle`):

| Pieza | Para qué | Props principales |
| --- | --- | --- |
| `EncabezadoDetalle` | Regreso a la lista, persona/registro, etiqueta (folio · tipo), estado y, en escritorio, los datos clave (vigencia, firma) con su aviso («Vence en 12 días») | `volver`, `iniciales`, `etiqueta`, `titulo`, `subtitulo`, `estado {texto,tono}`, `filas [{etiqueta,valor,tono}]`, `alerta` |
| `BarraAcciones` | Acciones en escritorio/tableta: **una** principal, las demás con contorno o normales; al final las secundarias tipo texto («Editar datos») | `acciones [{clave,texto,onClick,href,tipo,deshabilitada,ayuda,cargando}]` |
| `BarraAccionesMovil` + `EspacioBarraMovil` | Barra fija abajo en celular: la principal (56 px), «Ver el documento» y «Más acciones» (hoja con el resto) | `primaria`, `secundaria`, `mas` |
| `TarjetaDetalle` | Tarjeta blanca de 24 px de radio con título de 18 px y nota azul opcional | `titulo`, `accion`, `nota` |
| `FilaDato` / `ListaDatos` | Dato con etiqueta gris oscuro y valor en negritas (`dl`) | `etiqueta`, `valor`, `tono` |
| `LineaDeTiempo` | Historial, del más reciente al más viejo; los destacados con punto azul | `eventos [{id,titulo,detalle,destacado}]`, `vacio` |
| `EstadoFirma` | Estado de cada firma de un documento (firmado / enviado / pendiente) | `firmantes [{rol,estado,detalle}]` |
| `Pastilla`, `TONOS` | Pastilla de estado y colores de estado (`exito`, `aviso`, `error`, `info`, `neutro`) con contraste ≥ 4.5:1 | |

## Reglas (del dueño; obligatorias)

1. **Nunca fondos degradados** («No me gusta que tenga fondos degradados, jamás; todo debe ser limpio pero
   corporativo»). El encabezado es una **tarjeta blanca** con un filo azul ADAMIA arriba (4 px `#2C56E8`), texto oscuro
   (`#0B1033` / `#111827`), etiqueta azul en mayúsculas y la pastilla de estado. Ningún `linear-gradient` en estas
   vistas (lo revisa `scripts/test-contratos.mjs`). Esta regla manda sobre la maqueta original, que traía degradado.
2. **Letra:** cuerpo ≥ 16 px en escritorio y ≥ 17 px en celular. Solo la etiqueta en mayúsculas y las pastillas
   pueden ir en 15 px (llevan `data-chico`). Títulos en peso **700**, nunca 800.
3. **Texto secundario** en `#4B5563` o más oscuro (`#374151`). Nada de grises claros para leer.
4. **Botones** de al menos **48 px** de alto y **siempre con texto** (no solo iconos). **Una sola acción principal**
   por pantalla (azul lleno); el resto con contorno o normales.
5. **Celular:** una columna; las acciones en `BarraAccionesMovil` (la principal arriba, 56 px) y un
   `EspacioBarraMovil` al final para que no tape nada. Sin desbordes horizontales: textos largos se parten
   (`break-words`) y las tablas del documento son `table-fixed`.
6. **La fila de la lista abre el detalle** (`/modulo/[id]`), con un menú «Más» para lo demás; los enlaces viejos con
   `?id=` redirigen al detalle.
7. **Evitar ventanas flotantes: preferir una página** (27/11/2026, del dueño: «hay que evitar en lo que podamos ventanas
   flotantes, o si sí se hacen que estén bonitas, por tabs, y que no se cierren más que con Esc o Cancelar o Guardar o la
   X»). Editar o crear un registro es una página con el mismo encabezado, **pestañas** y Guardar / Cancelar siempre a la
   vista (`BarraAccionesMovil` en celular), con aviso si sales con cambios sin guardar (`useGuardiaSalida`). Ejemplo:
   `/panel/contratos/[id]/editar` y `/panel/contratos/nuevo` (`src/app/panel/contratos/formulario/`). Si de verdad hace
   falta una ventana (una confirmación corta), con pestañas si tiene varias secciones, y **solo se cierra con Esc,
   Cancelar, Guardar o la X**: un clic o toque afuera no la cierra. Lo hace `src/components/ui/dialog.jsx` para TODAS
   las ventanas; `alert-dialog.jsx` (Radix) ya no se cerraba afuera; `sheet.jsx` igual, salvo los paneles que son un
   **menú** (`<SheetContent menu>`: menú lateral, «Más acciones», menú de la página pública), que sí se cierran al tocar
   afuera como cualquier menú. Los menús y listas desplegables (Popover, DropdownMenu, Select) no son ventanas.
   Las hojas de celular (`drawer.jsx`, vaul: filtros, detalle) tampoco: se cierran con su X o botón de cerrar, con Esc o
   deslizándolas hacia abajo; toda hoja sin botón de cerrar visible lleva una X de 48 px. Las que son menú
   (`<DrawerContent menu>`: menú del Navbar en celular) sí se cierran al tocar afuera.
   La ventana compartida «Tienes cambios sin guardar» (`CambiosPendientes.jsx`) usa letra de 16 px y botones de 48 px.
   Pruebas: `scripts/verify-contratos.mjs` (paso 2c) y `scripts/verify-hojas.mjs` (hojas de celular).
8. Los **datos y las reglas** los da el servidor (en contratos: sueldo vigente, firmas, historial); las vistas solo
   los ponen en palabras con funciones puras probadas (`src/lib/contratos/detalleContrato.mjs`).

## Cómo se arma (ejemplo: contrato)

```jsx
<EncabezadoDetalle volver={{ href: "/panel/contratos", texto: "Contratos" }} iniciales="AT"
  etiqueta="Contrato CT-2026-0142 · Tiempo indeterminado" titulo="Ana Torres Ruiz" subtitulo={<p>Cajera · <Link href="…">Ver ficha</Link></p>}
  estado={{ texto: "Vigente", tono: "exito" }} filas={[{ etiqueta: "Vigencia", valor: "Desde 10 ene 2025" }]} alerta={null} />
<BarraAcciones acciones={[{ clave: "firmar", texto: "Firmar como empresa", tipo: "primaria", onClick }, …, { clave: "editar", texto: "Editar datos", tipo: "texto" }]} />
<div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)]">…tarjetas…</div>
<EspacioBarraMovil />
<BarraAccionesMovil primaria={…} secundaria={{ clave: "ver-documento", texto: "Ver el documento", onClick }} mas={[…]} />
```

Verificación en navegador: `scripts/verify-contratos.mjs` (1440 / 390 / 360): tamaños de letra, alto de botones,
sin desborde horizontal y sin degradados; también la página de editar (solo manda lo que cambió) y las ventanas que no se
cierran afuera. Las reglas del formulario: `node --test scripts/test-formulario-contrato.mjs`.
