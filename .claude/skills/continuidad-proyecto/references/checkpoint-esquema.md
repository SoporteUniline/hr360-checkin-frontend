# Checkpoint de continuidad con procedencia

Usar en /docs/00-estado.md o archivo referenciado por el equipo; **no crear múltiples fuentes de verdad**. Debe ser corto y específico al proyecto.

## Identidad y versión
- Proyecto / entorno: ...
- Fecha y fuente: ...
- Rama y commit (si existe): ...
- Tarea: ...
- Estado: explorando | decisión pendiente | aprobado | ejecutando | probado | bloqueado

## Decisiones aprobadas
| ID | Regla aprobada | Quién/fecha/fuente | Sustituye |
|---|---|---|---|
| D-... | ... | ... | ... |

## Evidencia y estado del producto
| Hecho observado | Fuente (ruta:línea/consulta/test) | Versión | Confianza |
|---|---|---|---|
| ... | ... | ... | comprobado / inferido / no encontrado |

## Dependencias
| Elemento A | Relación | Elemento B | Fuente | Vigencia |
|---|---|---|---|---|
| campo | modifica | reporte | ... | vigente / requiere revalidación |

## Ejecución y pruebas
- Qué se realizó realmente (cambio y autorización): ...
- Pruebas pasadas / fallidas / no ejecutadas: ...
- Entorno donde se verificó: ...
- Publicado en producción: sí / no / no comprobado
- Problemas o regresiones observados: ...

## Continuación
- Bloqueador material y responsable: ...
- ÚNICA siguiente acción exacta: ...
- Pregunta pendiente prioritaria (si existe): ...
- Datos que es necesario revalidar antes de ejecutar: ...

## Reglas
Nunca guardar secretos/tokens ni datos personales innecesarios. Afirmación sin fuente queda «por verificar». Un cambio de código no implica que esté desplegado. Guardar checkpoint al cerrar hitos o antes de compactar, no por cada saludo. Los cambios en decisiones afectan dependencias vinculadas; conservar historial y marcar posibles obsolescencias.
