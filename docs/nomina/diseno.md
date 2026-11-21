# Nómina sin timbrado — diseño (en curso, sin APROBADO)

Estado: Vuelta de diseño. **No se construye nada hasta `APROBADO R1`.**

## Alcance pedido por el dueño (21/11/2026)
- Nómina **sin timbrado** (no CFDI, no ISR ni IMSS) para empresas que no timbran.
- Bonos, descuentos y **préstamos a empleados**.
- Recibo en **PDF** enviado por correo.
- Pago **mixto**: una parte por transferencia y otra en efectivo; por eso se usan banco y cuenta del empleado.

## Decisiones del dueño
- **D-1 Pago mixto:** monto fijo por transferencia y el resto en efectivo. El monto se define en el empleado como valor inicial y **se puede editar en cada nómina**.
- **D-2 Retardos (21/11/2026):** **no afectan la nómina** (no se descuenta sueldo de un día trabajado). El seguimiento va fuera de nómina: aviso en el dashboard/incidencias al llegar a N retardos (configurable) con propuesta de acta administrativa ya llena. 💡 PROPUESTO: que los retardos puedan quitar un bono de puntualidad condicionado (pendiente de confirmar).
- **D-3 Todo proporcional (21/11/2026):** el sistema **sugiere** el pago con base en la ley (días trabajados, parte proporcional del séptimo día —art. 72 LFT—, horas extra, festivos, etc.) y **todo se puede editar** en la nómina antes de autorizar. Ej.: si vino 4 días, se paga lo proporcional a 4 días.
- **D-4 Autorización (21/11/2026):** dos pasos: RH calcula y revisa; el **dueño** (o administrador) autoriza. Al autorizar se cierra el periodo y se generan/envían los recibos.
- **D-5 Préstamos (21/11/2026):** el empleado lo solicita desde **Mi espacio** (aprobación del jefe/dueño, p. ej. por WhatsApp como permisos) **o** RH lo registra directo. 🧭 Criterio: si lo registra RH, el empleado confirma/firma el acuerdo de abonos en Mi espacio — porque la ley pide que el descuento sea aceptado por el trabajador.
- **D-6 Bonos (21/11/2026):** catálogo por empresa con sugeridos (puntualidad, asistencia, productividad, despensa). Cada bono tiene **valor editable** y una forma de aplicarse: **fijo** cada periodo, **condicionado** («se paga si cumple»: sin faltas, sin retardos o ambos — ADAMIA lo revisa solo con la asistencia) o **capturado a mano** en cada nómina. Todo editable antes de autorizar. 🧭 Criterio: los descuentos (préstamo, anticipo, otros) usan el mismo catálogo con la misma estructura — porque así RH aprende una sola pantalla.
- **D-7 Recibo (21/11/2026):** al autorizar, el PDF se envía por correo y queda en **Mi espacio**, donde el empleado lo **firma digitalmente** (firma existente de ADAMIA). Constancia de pago para la empresa.
- **D-8 Permisos e incapacidades (21/11/2026):** cada tipo de permiso indica **con goce / sin goce** y la nómina lo aplica solo. Incapacidades con tipo (enfermedad general, riesgo de trabajo, maternidad); por defecto la empresa no paga esos días (los cubre el IMSS). Todo editable en la nómina.
- **D-9 Aprobación de préstamos (21/11/2026):** los que pide el empleado los aprueba **RH o el dueño** en el panel (no el jefe directo). `APROBADO R2`.
- **R2 Préstamos (aprobada 21/11/2026):** sin intereses (art. 111); el empleado firma el acuerdo de descuento (art. 110 fr. I) y hasta entonces no se descuenta; abono sugerido = el menor entre lo pactado, el saldo y el 30 % del excedente del salario mínimo, editable; el saldo baja al autorizar la nómina y se regresa si se cancela; un préstamo vigente por persona (🧭 criterio); aviso si pasa de un mes de salario; abonos en efectivo fuera de nómina. Salario mínimo: ❓ PENDIENTE confirmar el valor 2026 y si alguna empresa está en zona fronteriza.

## Lo que ya existe (comprobado en código)
- Empleado: `periodo_pago` (Diario, Semanal, Catorcenal, Quincenal, Mensual, Por hora), sueldo, `forma_pago` (= Fijo / Comisiones / Fijo + Comisiones, es el esquema, no el medio), `forma_calculo`, banco y `cuenta_bancaria` (`TabNomina.jsx`, `FormularioEmpleado.jsx`).
- Insumos: incidencias (faltas, retardos, sin entrada/salida, horas extra), horas extra, reporte de horas, turnos extra, permisos, vacaciones, festivos, firma digital, reglas de aviso por correo.

## 💡 PROPUESTO (pendiente de validar)
- Medio de pago en el empleado: Transferencia / Efectivo / Mixto (+ monto por transferencia).
- Catálogo de conceptos por empresa (percepciones y descuentos), aplicación fija, por regla o capturada.
- Préstamos: monto, abono por periodo, saldo; sin intereses (art. 111 LFT); se revierte si se cancela la nómina; tope legal de descuento ❓ PENDIENTE confirmar con abogado (art. 110 LFT).
- Flujo: abrir periodo → cálculo automático → ajustes → autorizar → cerrar (bloquea checadas del periodo) → recibos PDF por correo → firma en Mi espacio.
- Reportes: lista de transferencias (Excel para el banco), lista de efectivo, totales.
- Recibo con leyenda «Recibo de pago, no es un CFDI».
- Rebanadas: R1 periodos + cálculo + conceptos + pago mixto + PDF/correo; R2 préstamos; R3 bonos por regla, firma y archivo bancario.

## ❓ PENDIENTE
- Revisión legal del recibo sin CFDI y de los topes de descuento.
