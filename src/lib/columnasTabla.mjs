// La lista de columnas visibles también representa su orden de presentación.
export function ordenarColumnasVisibles(registro, visibles) {
  const validas = new Set(registro.map(c => typeof c === "string" ? c : c.key));
  const elegidas = Array.isArray(visibles) && visibles.length ? visibles : [...validas];
  return [...new Set(elegidas)].filter(key => validas.has(key));
}
export function ordenarRegistroColumnas(registro, visibles) {
  const orden = ordenarColumnasVisibles(registro, visibles);
  const mapa = new Map(registro.map(c => [c.key, c]));
  return [...orden.map(key => mapa.get(key)), ...registro.filter(c => !orden.includes(c.key))];
}
