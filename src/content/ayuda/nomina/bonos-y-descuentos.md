---
titulo: Cómo crear bonos y descuentos
resumen: Arma el catálogo de bonos y descuentos de tu empresa. Fijos, condicionados a la asistencia o capturados a mano, para algunas personas o para todos.
modulo: nomina
audiencia: [rh, dueno]
pantallas: [/panel/nomina/bonos, /panel/nomina/ajustes]
palabras: [bonos, descuentos, catálogo, puntualidad, asistencia, despensa, productividad, condicionado, fijo, manual, se lo ganan todos, percepción]
orden: 60
actualizado: 2026-11-27
fuentes: [src/app/panel/nomina/bonos/page.jsx, src/components/nomina/FormConcepto.jsx, src/components/nomina/ModuloNomina.jsx]
---

## Para qué sirve

En **Bonos y descuentos** guardas, una sola vez, los conceptos que tu empresa paga o descuenta con frecuencia: bono de puntualidad, bono de asistencia, despensa, descuento por uniforme… Después los asignas a las personas y ADAMIA los pone solos en cada nómina.

## Quién la usa

Recursos Humanos y el dueño de la cuenta (o un usuario con acceso con permiso **Ver y editar** en Nómina).

## Antes de empezar

El módulo Nómina debe estar encendido. Entra por **Nómina → Bonos y descuentos** o por la pestaña **Bonos y descuentos** dentro de Nómina.

## Cómo leer la lista

![Lista de bonos y descuentos](/ayuda/capturas/nomina/bonos-lista.webp "Totales arriba, sugeridos y el catálogo con a quién se le aplica cada uno")

Arriba tienes cuatro totales: **Bonos activos**, **Descuentos activos**, **Para todos** y **Condicionados a asistencia**.

Si todavía no tienes alguno de los bonos más comunes, aparece la barra **Sugeridos** con botones como «+ Bono de productividad». Al presionarlo se abre el formulario ya lleno.

La tabla muestra cada concepto con su **Tipo** (Bono o Descuento), **Cómo se aplica**, **Valor**, **Quién lo tiene** («Todos», «2 personas» o «Nadie aún») y **Estado** (Activo o Inactivo). Haz clic en el renglón para abrir su detalle y asignarlo.

## Cómo crear un bono o descuento

1. Presiona **Nuevo bono o descuento** (o uno de los **Sugeridos**).
2. Escribe el **Nombre** (hasta 80 caracteres).
3. En **Tipo** elige **Bono (se suma)** o **Descuento (se resta)**.
4. Escribe el **Valor ($)**. Es una sugerencia: cada persona puede tener su propio valor.
5. En **Cómo se aplica** elige una opción (ver tabla).
6. Si elegiste «Si cumple la asistencia», en **Se paga si…** elige: «No tuvo… sin faltas», «No tuvo… sin retardos» o «No tuvo… sin faltas ni retardos».
7. Si todos en la empresa lo ganan, marca **Se lo ganan todos**.
8. Deja marcada la casilla **Activo** y presiona **Guardar**. Se abre su detalle para que lo asignes.

![Formulario de un bono nuevo condicionado a la asistencia](/ayuda/capturas/nomina/bono-nuevo.webp "Un bono que solo se paga si no hubo faltas ni retardos")

| Cómo se aplica | Qué pasa en cada nómina |
| --- | --- |
| Fijo cada periodo | Sale siempre con su valor |
| Si cumple la asistencia | Sale con su valor si cumple la condición; si no, sale en $0 con la nota «No cumple: 1 falta» o «No cumple: 1 retardo» |
| A mano en cada nómina | Sale con la nota «Captura el importe» para que escribas cuánto en el recibo |

> **Consejo:** «Se lo ganan todos» aplica a todas las personas de la empresa, **también a las que entren después**. Si a alguien en particular no le toca, quítale la marca en el detalle del bono.

## Cómo editar o desactivar un bono

1. Abre el bono (clic en su renglón).
2. Presiona **Editar**, cambia lo necesario y presiona **Guardar**.
3. Para dejar de usarlo sin perder su historia, quita la marca **Activo**. Un concepto inactivo ya no aparece para agregarlo en los recibos.

## Preguntas frecuentes

### ¿Si cambio el valor, se cambia en las nóminas ya calculadas?

No de inmediato. Los cambios se aplican al **calcular o recalcular** una nómina en borrador. Las nóminas autorizadas no cambian.

### ¿Qué valor gana, el del bono o el de la persona?

El valor propio de la persona, si le pusiste uno. Si no, el valor sugerido del bono.

### ¿Los retardos le quitan el bono de asistencia?

Solo si el bono está condicionado «sin retardos» o «sin faltas ni retardos». Los retardos nunca descuentan sueldo.

### ¿Un permiso sin goce cuenta como falta para el bono?

No. Los permisos sin goce se cuentan aparte; solo las faltas afectan a los bonos «sin faltas».

## Qué pasa si…

- **…ya existe un concepto con ese nombre.** Verás «Ya existe un concepto con ese nombre.». Usa otro nombre o edita el existente.
- **…la casilla Se lo ganan todos aparece gris.** Tu cuenta todavía no tiene habilitada esta opción. Avísale a soporte de ADAMIA.
- **…entras a la dirección vieja de ajustes de nómina.** Te lleva sola a **Bonos y descuentos**.

## Relacionado

- [Cómo asignar bonos y descuentos a las personas](/ayuda/nomina/asignar-bonos-y-descuentos)
- [Cómo calcula ADAMIA la nómina](/ayuda/nomina/como-se-calcula-la-nomina)
- [Cómo revisar y ajustar los recibos](/ayuda/nomina/revisar-y-ajustar-recibos)
