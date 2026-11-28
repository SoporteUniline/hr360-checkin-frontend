# INC-012 · El acta administrativa se guardaba sin un dato que la persona escribió (28/11/2026)

- **Síntoma:** `scripts/verify-permiso-acta-pagina.mjs` fallaba de forma intermitente (3 de 4 corridas, según el reporte)
  en «lo mismo que mandaba la ventana»: el POST del acta nueva llegaba con `testigos` o `lugar_incidente` en `null`
  aunque el paso 2 se había llenado. En un documento legal, perder lo escrito es pérdida de datos, no una «prueba
  inestable».
- **Severidad:** alta (dato de un documento legal que se pierde sin aviso). Probabilidad con una persona real: baja para
  la causa 1 (hace falta escribir en otro campo dentro del rato en que llega el foco) y alta para la causa 2 (basta
  ir a un paso y regresar). **No hay reportes de usuarios**; el defecto se detectó con la prueba.
- **Entorno:** build de producción (`NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api`), backend simulado de la
  prueba, Chromium de Playwright 1.63, 1440 y 390 px.

## Bisección: NO lo introdujo `agente/contrato-v3`

El código del acta (`FormularioActa.jsx`, `useFormularioActa.js`) no cambió en la fusión `51de659`. Con un registro de
`focusin`/`input` en la página (script de diagnóstico fuera del repo):

| Versión | Corridas | Fallos de «lo mismo que mandaba la ventana» |
|---|---|---|
| `51de659^1` (`dc56142`, antes de v3) | 4 | **2** (las dos a 390, `testigos: null`) |
| `51de659` (con v3), sin cambios | 8 (6 normales + 2 con CPU ×4) y 4 con CPU ×2 | 0 en esta máquina; el reporte original vio 3 de 4 |

El defecto ya estaba desde `74e1d88` (acta en página). v3 solo cambió los tiempos (letra, tamaños): es una carrera.

## Causa 1 (con evidencia): un foco a ciegas que llega tarde

`FormularioActa.jsx` hacía, al «Continuar» con el paso incompleto,
`setTimeout(() => document.getElementById("acta-fecha")?.focus(), 60)`. Ese foco llega 60 ms **después** de validar y
no revisa si la persona ya está en otro campo. La prueba escribe en cuanto ve el error; `fill` de Playwright primero
enfoca el campo y luego teclea. Si el temporizador cae en medio, el foco brinca a «Fecha del incidente» (un
`<input type="date">`, que descarta el texto) y lo tecleado se pierde.

Registro de una corrida que falló en `dc56142` (390 px), milisegundos desde que abrió la página:

```
f:lugar@3424 i:lugar@3426 f:descripcion@3434 i:descripcion@3436 f:testigos@3449 f:fecha@3450   ← sin «i:testigos»
```

El foco llegó a Testigos (3449) y 1 ms después el temporizador lo llevó a Fecha (3450): «Persona Dos Demo» nunca entró
en Testigos y el POST salió con `testigos: null`. En corridas que pasaron se ve el mismo foco suelto entre campos
(`i:hora@2677 f:fecha@2686 f:lugar@2694`): cuando cae entre dos campos no se pierde nada; cuando cae entre el foco y el
tecleo de un campo de texto, sí. Por eso unas veces era `lugar` y otras `testigos`.

El **contrato** (`FormularioContrato.jsx`) tenía el mismo foco a ciegas (`ct-${campo}`, 60 ms); ahí lo tecleado caía en
la lista de personas. El **permiso** no mueve el foco (solo hace `scrollIntoView` del aviso de errores): no tiene este
riesgo.

## Causa 2 (encontrada con la regresión): React reusaba los campos de otro paso

`PasosGuiados` dibujaba `{contenido[paso]}` sin llave. Los pasos 2 y 3 tienen la misma forma (sección → campo →
`<input>`), así que React **reusaba los mismos nodos** de un paso en el otro. Con campos sin control (`register` de
react-hook-form) el valor del DOM se quedaba del otro paso y react-hook-form no lo corrige porque el nodo es el mismo
que ya conocía. Al ir del paso 2 al 3 y regresar (sin la corrección de la llave):

```
DOM del paso 2:  ["2026-11-25", "", "Jefa de RH", "Faltaron $200…", "Persona Dos Demo"]   (Hora vacía, Lugar = el cargo)
POST:            hora_incidente "09:40", lugar_incidente "Caja 2"
```

La pantalla mostraba una cosa y se guardaba otra; si la persona corregía «Lugar» encima de «Jefa de RH», se guardaba lo
mezclado. Solo el acta usa `PasosGuiados`; el contrato (con `PestanasPasos`) tiene campos controlados (`value=`), en
los que React escribe el valor en cada pintado, y su prueba revisa los valores al cambiar de pestaña.

## Corrección (en el código, no en la prueba)

1. `src/lib/formulario/focoCampo.mjs` · `prepararFocoCampo()`: se llama al INICIO de la acción (cuando el foco aún está
   en el botón) y regresa `enfocar(id)`, que espera a que React pinte y **solo mueve el foco si sigue en ese botón o en
   ningún lado**; si la persona ya está en otro control, no se lo quita. Lo usan `FormularioActa.jsx` y
   `FormularioContrato.jsx` en «Continuar» y «Guardar».
2. `src/components/formulario/PasosGuiados.jsx`: el contenido del paso lleva `key={actual}` (cada paso es un árbol
   nuevo; react-hook-form vuelve a poner sus valores al montar).

## Regresión

- `scripts/verify-permiso-acta-pagina.mjs`, paso 2 del acta: con `page.clock` se pausa el reloj, se oprime «Continuar»
  vacío, se escribe «Caja» en Lugar, se deja correr 1 s (llega el foco) y se escribe « 2». Debe quedar el foco en Lugar,
  «Caja 2» en Lugar y Fecha vacía. Luego se llena el paso, se va al paso 3, «Atrás», y los cinco valores del DOM deben
  ser los escritos; el POST se compara completo como antes. A 1440 y a 390.
- `scripts/verify-contratos.mjs`, alta vacía: lo mismo con «Puesto» (no debe caer nada en la lista de personas).
- `scripts/test-foco-campo.mjs` (en CI, «Sistema de diseño — pruebas y candado»): reglas de `prepararFocoCampo` y que
  `PasosGuiados` conserve la llave.

## RED → GREEN

| Prueba | Antes de corregir | Después |
|---|---|---|
| Acta, foco tras el error (determinista, `page.clock`) | **falla 1 de 1**: foco en `acta-fecha`, no en `acta-lugar` | pasa |
| Contrato, foco tras el error | **falla 1 de 1**: foco en `ct-id_empleado` | pasa (verify-contratos completo) |
| Acta, paso 2 tras ir al 3 y regresar (solo con la corrección 1) | **falla 5 de 5**: `["2026-11-25","","Jefa de RH",…]` | pasa |
| `verify-permiso-acta-pagina` completo | 2 de 4 en `dc56142`; 3 de 4 en el reporte | **5 de 5** seguidas (1440 y 390) |

## Aprendizaje

- Un foco «a los 60 ms» es una carrera con la persona: se prepara al inicio y se respeta si ya se movió.
- Pasos que se alternan en el mismo lugar llevan `key` por paso, sobre todo con campos sin control.
- «Pasaba antes de X» se comprueba con corridas en la versión anterior antes de culpar a X.
- Pendiente aparte (no es de este incidente): `verify-quepaso-motivo` falla también en `51de659` limpio
  («permisos: tamaño de letra de los campos»: espera 17 px y v3 los dejó en 16 en escritorio).
