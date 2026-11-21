# Nómina sin timbrado — diseño (en curso, sin APROBADO)

Estado: Vuelta de diseño. **No se construye nada hasta `APROBADO R1`.**

## Alcance pedido por el dueño (21/11/2026)
- Nómina **sin timbrado** (no CFDI, no ISR ni IMSS) para empresas que no timbran.
- Bonos, descuentos y **préstamos a empleados**.
- Recibo en **PDF** enviado por correo.
- Pago **mixto**: una parte por transferencia y otra en efectivo; por eso se usan banco y cuenta del empleado.

## Decisiones del dueño
- **D-1 Pago mixto:** monto fijo por transferencia y el resto en efectivo. El monto se define en el empleado como valor inicial y **se puede editar en cada nómina**.
- **D-2 Retardos:** regla configurable por empresa; por defecto **3 retardos = 1 falta** (21/11/2026).

## Lo que ya existe (comprobado en código)
- Empleado: `periodo_pago` (Diario, Semanal, Catorcenal, Quincenal, Mensual, Por hora), sueldo, `forma_pago` (= Fijo / Comisiones / Fijo + Comisiones, es el esquema, no el medio), `forma_calculo`, banco y `cuenta_bancaria` (`TabNomina.jsx`, `FormularioEmpleado.jsx`).
- Insumos: incidencias (faltas, retardos, sin entrada/salida, horas extra), horas extra, reporte de horas, turnos extra, permisos, vacaciones, festivos, firma digital, reglas de aviso por correo.

## 💡 PROPUESTO (pendiente de validar)
- Medio de pago en el empleado: Transferencia / Efectivo / Mixto (+ monto por transferencia).
- Catálogo de conceptos por empresa (percepciones y descuentos), aplicación fija, por regla o capturada.
- Préstamos: monto, abono por periodo, saldo; se revierte si se cancela la nómina; tope legal de descuento ❓ PENDIENTE confirmar con abogado (art. 110 LFT).
- Flujo: abrir periodo → cálculo automático → ajustes → autorizar → cerrar (bloquea checadas del periodo) → recibos PDF por correo → firma en Mi espacio.
- Reportes: lista de transferencias (Excel para el banco), lista de efectivo, totales.
- Recibo con leyenda «Recibo de pago, no es un CFDI».
- Rebanadas: R1 periodos + cálculo + conceptos + pago mixto + PDF/correo; R2 préstamos; R3 bonos por regla, firma y archivo bancario.

## ❓ PENDIENTE
- Faltas sin justificar: día completo por sueldo diario; ¿activar descuento proporcional del séptimo día?
- Si permisos con/sin goce y tipos de incapacidad se agregan.
- Revisión legal del recibo sin CFDI y de los topes de descuento.
