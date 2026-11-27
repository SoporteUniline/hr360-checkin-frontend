---
titulo: Tipos de registro y motivos: qué pasó, por qué y cuánto se paga
resumen: El catálogo de Tipos de registro define qué puede pasar en un día (asistencia, inasistencia, vacaciones, entrada tarde…) y el de Motivos define por qué y cómo se paga.
modulo: asistencias
audiencia: [rh, dueno]
pantallas: [/panel/catalogos/tipos-registro]
palabras: [tipos de registro, motivos, catálogo, goce de sueldo, con goce, sin goce, horas no trabajadas, se cambia al aplicar, días de ley, incapacidad, vacaciones, inasistencia, permiso]
orden: 100
actualizado: 2026-11-27
fuentes: [src/app/panel/catalogos/tipos-registro/page.jsx, src/app/panel/catalogos/tipos-registro/TiposRegistroTable.jsx, src/app/panel/catalogos/tipos-registro/TipoRegistroFormDialog.jsx, src/app/panel/catalogos/tipos-registro/MotivosPermiso.jsx, src/lib/asistencia/tiposGoce.mjs, src/lib/asistencia/quePasoMotivo.mjs]
---

## Para qué sirve

Cada día de una persona tiene dos datos:

- **Qué pasó** (el **tipo de registro**): Asistencia, Inasistencia, Entrada tarde, Salida temprano, Salir en medio turno, Vacaciones, Incapacidad, Día de descanso…
- **Por qué** (el **motivo**): Visita al médico, Permiso personal, Trámite, Escuela de los hijos, Capacitación, Otro…

El **goce** (si el día se paga) y el trato de las **horas no trabajadas** se configuran **en cada motivo**. Los días que fija la ley (🔒) no se pueden cambiar.

Este catálogo es la base de Asistencias, Permisos, Vacaciones y la nómina.

## Quién la usa

Recursos Humanos y el dueño. Normalmente se configura una vez al empezar y se ajusta pocas veces.

## Antes de empezar

Entra al menú **Catálogos base → Tipos de registro**.

## Cómo leer los tipos de registro

![Catálogo de Tipos de registro con qué pasó, qué abarca y el goce](/ayuda/capturas/asistencias/tipos-de-registro.webp "Cada tipo dice qué abarca y cómo se paga; los de ley llevan candado")

| Columna | Qué dice |
|---|---|
| Qué pasó | El nombre del tipo. Los de ley llevan 🔒 «Ley» y una nota (por ejemplo, «Descuenta del saldo; lleva prima vacacional») |
| Unidad de negocio | «Sistema / Global» si es de todas las empresas, o la empresa dueña |
| Abarca | Día completo, o Parte del día · al entrar / al salir / en medio |
| Goce y horas | «Día trabajado», «El pago lo decide el motivo», «🔒 Con goce», «🔒 Sin goce»… |
| Acciones | Editar y Eliminar en los tipos propios; «Sistema» o «No editable» en los demás |

Los tipos que dicen **Solo historial** ya no se ofrecen en capturas nuevas (por ejemplo, «Visita al médico» como tipo): ahora son un motivo. Los registros que ya los tienen se ven y se pagan igual.

### Los días de ley

| Tipo | Goce | Nota |
|---|---|---|
| Vacaciones 🔒 | Con goce | Descuenta del saldo; lleva prima vacacional |
| Incapacidad IMSS 🔒 | Sin goce | La empresa no paga el día; el IMSS da subsidio |
| Día de descanso 🔒 | Con goce | Con goce de salario íntegro (art. 69) |
| Inasistencia sin motivo | Sin goce | También baja la parte proporcional del descanso semanal (art. 72) y crea un acta en borrador |

## Cómo configurar los motivos

Abajo de la tabla está la sección **Motivos (por qué)**.

![Sección Motivos con el goce, las horas no trabajadas y si se cambia al aplicar](/ayuda/capturas/asistencias/motivos-de-permiso.webp "Cada motivo define su goce, el trato de las horas y si RH lo puede cambiar al aplicarlo")

Para cada motivo eliges:

- **Goce**: **Con goce** o **Sin goce**. Es el pago del día cuando se usa en una inasistencia.
- **Horas no trabajadas**: **Se reponen (tiempo por tiempo)**, **Se descuentan** o **Se pagan**. Aplica en entrada tarde, salida temprano o salir en medio turno.
- **Se cambia al aplicar**: **Sí, RH lo cambia** (RH puede elegir otro goce o trato en cada caso) o **No** (queda fijo 🔒).

Los cambios se guardan en cuanto los eliges. Los motivos generales tienen 🔒 en el nombre («Del sistema: el nombre no cambia»), pero su goce y horas sí se pueden ajustar para tu empresa; verás «Personalizado» cuando tu empresa los cambió.

### Cómo agregar un motivo de tu empresa

1. En **Nuevo motivo de tu empresa** escribe el nombre, por ejemplo «Boda» o «Mudanza».
2. Elige su **Goce**, sus **Horas no trabajadas** y si **Se cambia al aplicar**.
3. Toca **+** (o Enter).

### Cómo ocultar un motivo

Toca el ojo tachado al final de su renglón. Ya no se ofrecerá en capturas nuevas, pero sigue en los registros que lo usan. Para volver a ofrecerlo, toca **Mostrar**. Los motivos nunca se borran.

## Cómo crear un tipo de registro propio

1. Toca **Nuevo**.
2. Escribe el **Nombre**; la **Clave del Registro** se genera sola.
3. Escribe una **Descripción** (opcional) y elige la **Empresa Propietaria**.
4. En **Qué abarca y cuánto se paga**, elige **Abarca**, el **Goce del día**, las **Horas no trabajadas** (si abarca parte del día) y si **Se cambia al aplicar**.
5. En **Reglas y Comportamiento** marca lo que aplique: **Cuenta como Asistencia**, **Descuenta Vacaciones**, **Asistencia Automática**, **Es un Permiso** (aparece en Permisos) o **Día Festivo**.
6. Toca **Crear Registro**.

> **Ojo:** los cambios en este catálogo afectan filtros y cálculos en Asistencias, Permisos y Vacaciones. Antes de crear un tipo nuevo, revisa si basta con un **motivo**.

## Preguntas frecuentes

### ¿Por qué no puedo editar Vacaciones o Incapacidad?

Porque su pago lo fija la ley (🔒). Por eso dicen «No editable».

### ¿Qué pasa con «Entrada antes de tiempo» y «Salida después»?

No son permisos: los calcula el reloj. Llegar antes no genera extra por sí solo; salir después sí, pero solo si alguien la autoriza.

### Cambié el goce de un motivo, ¿se recalculan los días anteriores?

No. Cada día guarda el goce que tenía al aplicarse. El cambio aplica a lo que registres desde ahora.

## Qué pasa si…

- **…intentas crear un tipo con un nombre que ya existe:** verás «Ya existe un registro con este nombre en la empresa seleccionada.».
- **…intentas agregar un motivo que ya existe:** verás «Ese motivo ya existe.».
- **…eliminas un tipo propio:** «Esta acción no se puede deshacer.». Si ya se usó, mejor déjalo y crea otro.

## Relacionado

- [Cómo marcar qué pasó un día sin checadas](/ayuda/asistencias/que-paso-y-motivo)
- [Cómo registrar que alguien llegó tarde o salió antes con permiso](/ayuda/asistencias/permiso-del-dia)
- [Cómo registrar un permiso](/ayuda/permisos/registrar-un-permiso)
