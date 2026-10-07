/** Cortes en coordenadas del canvas. Mantiene bloques cortos y líneas completas. */
export function calcularPaginasPdf(alto, altoPagina, bloques = [], lineas = []) {
  const paginas = [];
  const evitarCorte = (limite, inicio, regiones) => {
    let corte = limite;
    for (let i = 0; i <= regiones.length; i++) {
      const cruces = regiones.filter(([top, bottom]) => top < corte && bottom > corte);
      if (!cruces.length) break;
      const siguiente = Math.min(...cruces.map(([top]) => top));
      if (siguiente <= inicio) return inicio;
      corte = siguiente;
    }
    return Math.floor(corte);
  };
  let inicio = 0;
  while (inicio < alto) {
    const limite = Math.min(alto, inicio + altoPagina);
    let fin = limite;
    if (limite < alto) {
      fin = evitarCorte(limite, inicio, bloques);
      // Un bloque más alto que una página puede dividirse, pero no una línea.
      if (fin - inicio < altoPagina * 0.3) fin = limite;
      fin = evitarCorte(fin, inicio, lineas);
      if (fin <= inicio) fin = limite; // imagen o línea excepcional mayor que una página
    }
    paginas.push({ inicio, fin });
    inicio = fin;
  }
  return paginas;
}
