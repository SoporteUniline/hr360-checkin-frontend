# Lista de comprobación de UX/UI SaaS

## Para cada pantalla
- [ ] Nombre de la pantalla y su ubicación en navegación visibles.
- [ ] Una acción principal reconocible; secundarias subordinadas.
- [ ] Atención operativa priorizada según rol y frecuencia.
- [ ] Texto, estructura y ritmo de lectura consistentes (título, sección, cuerpo, dato).
- [ ] Estados semánticos con texto, no solo color. No se inventaron estados.
- [ ] Color neutral predominante y superficies agrupadas por función.
- [ ] Datos críticos visibles, sin depender de hover o scroll oculto.
- [ ] Componentes existentes reutilizados y sin clases/tokens aislados.
- [ ] Tabla: alineación de números y moneda, filtros, estados, orden y acciones.
- [ ] Formulario: etiquetas, obligatorios, errores, ayudas, feedback y guardado.
- [ ] Cargando, vacío, error, offline, permisos y éxito considerados cuando apliquen.
- [ ] Navegación con teclado, foco visible, orden, etiquetas y avisos accesibles.
- [ ] Contraste: normal 4.5:1; grande 3:1; componentes/gráficos relevantes 3:1 (excepciones WCAG).
- [ ] Touch target: WCAG 2.2 AA 2.5.8, 24×24 CSS px o espaciado/excepciones; recomendar 44×44 cuando contexto táctil lo justifique, sin presentarlo como requisito WCAG AA.
- [ ] Modo claro/oscuro: tablas, inputs, tooltips, overlays, gráficos, chips, disabled.
- [ ] Responsive: no solo escala; verificar funcionalidades en escritorio, tableta y móvil.
- [ ] Performance: no consultas, renderizados o dependencias innecesarios.
- [ ] Reglas de negocio, permisos y persistencia sin cambios no autorizados.
- [ ] Evidencia de pruebas, capturas por estado/viewport y pruebas manuales pendientes.

## Guía por módulo (ejemplos, no requisitos nuevos)
- Ventas: cliente, detalle, importe, saldo, pagos, confirmación.
- POS: rapidez de operación, selección, observaciones, pago, ticket y recuperación de errores.
- Inventario: existencias, lotes/vigencias, entradas, salidas, movimientos.
- Entregas: estado, incidencia, asignación, ETA comprobable.
- Cobranza: saldos, vencidos, acción siguiente, conciliación.
- RH: pendientes, permisos, colaborador, calendario, auditoría.
- Restaurante: pedidos activos, canal, preparación, tiempo, estado.
- Hotel: habitación, disponibilidad, check-in/out, cobro y turnos.

## Evidencia mínima al entregar
Anotar pantalla revisada, referencia de sistema-diseno, componentes reutilizados, decisión de cambios, pruebas ejecutadas (viewport/tema/teclado/acciones), riesgos, lo no probado. No afirmar pruebas manuales no hechas.

Fuentes:
- https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- https://www.w3.org/WAI/WCAG22/understanding/non-text-contrast.html
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
