---
titulo: Cómo asignar bonos y descuentos a las personas
resumen: Decide quién recibe cada bono o descuento, ponle a cada persona su propio valor y aplícalo a muchas personas a la vez.
modulo: nomina
audiencia: [rh, dueno]
pantallas: [/panel/nomina/bonos]
palabras: [asignar bono, quitar bono, valor propio, marcar todos, lo tienen, no lo tienen, buscar persona, para todos]
orden: 65
actualizado: 2026-11-27
fuentes: [src/app/panel/nomina/bonos/page.jsx, src/components/nomina/FormConcepto.jsx, src/components/nomina/EditorRecibo.jsx]
---

## Para qué sirve

Cada bono o descuento tiene su propia lista de personas. Ahí marcas quién lo tiene y, si hace falta, le pones un valor distinto (por ejemplo, el bono de puntualidad es de $250, pero a un supervisor le das $350).

## Quién la usa

Recursos Humanos y el dueño de la cuenta.

## Antes de empezar

Crea el bono o descuento: [Cómo crear bonos y descuentos](/ayuda/nomina/bonos-y-descuentos).

## Cómo asignar un bono a varias personas

1. En **Nómina → Bonos y descuentos** haz clic en el bono.
2. Arriba ves **Valor sugerido**, **Lo tienen** (por ejemplo «2 de 5»), **Quién** (Todos o Asignado) y **Estado**.
3. En la lista de **Personas**, marca la casilla **Lo tiene** de cada persona que debe recibirlo.
4. Si alguien tiene un importe diferente, escríbelo en **Valor propio**. Si lo dejas vacío, se usa el valor sugerido.
5. Los renglones cambiados se pintan de amarillo y abajo aparece la barra «2 cambios sin guardar». Presiona **Guardar cambios**.
6. Verás «Guardado para 2 personas. Se aplica al calcular o recalcular una nómina.».

![Detalle de un bono con personas marcadas y un valor propio](/ayuda/capturas/nomina/bono-asignar.webp "Marca quién lo tiene, pon su valor propio y guarda")

> **Consejo:** Para asignar a muchas personas a la vez, usa el buscador «Buscar persona o puesto» o los filtros **Todas**, **Lo tienen** y **No lo tienen**, y luego presiona **Marcar las 12** (el número cambia según lo que se ve). Para quitarlo a todas las que ves, usa **Quitar a las 12**.

## Cómo quitarle un bono a una persona

1. Abre el bono y busca a la persona.
2. Quita la marca de **Lo tiene** y presiona **Guardar cambios**.

Si el bono es **para todos**, verás el letrero «Se lo ganan todos. Para que alguien no lo tenga, quítale la marca.». Al guardarlo, debajo de su nombre aparece «se le quitó».

## Cómo asignar un bono desde el recibo de una nómina

También puedes hacerlo mientras revisas una nómina en borrador:

1. Abre el recibo de la persona (**Revisar recibo y ajustar importes**).
2. En **Agregar bono o descuento** elige el bono del catálogo, escribe el importe y deja marcada **Dejárselo asignado para las próximas nóminas**.
3. Presiona **Agregar**. Verás «Agregado y asignado para las próximas nóminas.».

Para quitárselo desde el recibo, usa **Quitárselo para siempre**.

## Preguntas frecuentes

### ¿Cuándo se nota el cambio en la nómina?

Al calcular una nómina nueva o al presionar **Recalcular** en una nómina en borrador.

### ¿Me equivoqué, puedo deshacer antes de guardar?

Sí. En la barra de cambios presiona **Descartar** y todo vuelve a como estaba.

### ¿Puedo poner un valor propio a quien no tiene el bono?

No. El campo **Valor propio** solo se activa cuando la persona tiene marcado **Lo tiene**.

## Qué pasa si…

- **…la búsqueda no encuentra a nadie.** Verás «Nadie coincide con la búsqueda.». Revisa la ortografía; la búsqueda ignora acentos.
- **…escribes un importe negativo o demasiado grande.** El servidor responde «Revisa los importes.».
- **…sales de la página sin guardar.** Los cambios marcados en amarillo se pierden.

## Relacionado

- [Cómo crear bonos y descuentos](/ayuda/nomina/bonos-y-descuentos)
- [Cómo revisar y ajustar los recibos](/ayuda/nomina/revisar-y-ajustar-recibos)
