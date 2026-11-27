// Guion de las escenas animadas de la portada (WhatsApp, Clima, Tablero, Muro). Lógica pura, sin DOM ni React,
// para probarla con node --test (scripts/test-guion-landing.mjs).
// Una escena tiene `total` pasos. El paso `total` es el estado final: es el que trae el HTML del servidor, el que ve
// quien pidió «reducir movimiento» y el que queda al terminar las vueltas.

/** Paso con que arranca la escena al hidratar: lo que ya se ve o no debe moverse se queda completo (nada retrocede). */
export function pasoInicial({ total, reducido, visible }) {
  return reducido || visible ? total : 0;
}

/**
 * Estado que sigue: avanza un paso; al llegar al final vuelve a empezar hasta completar `vueltas` (repetición
 * educada: pocas vueltas y una pausa larga entre ellas). null = se queda en el estado final.
 */
export function siguiente({ paso, vuelta }, { total, vueltas }) {
  if (paso < total) return { paso: paso + 1, vuelta };
  if (vuelta + 1 < vueltas) return { paso: 0, vuelta: vuelta + 1 };
  return null;
}

/** Milisegundos que dura el paso actual antes de pasar al siguiente (en el final, la pausa antes de repetir). */
export function espera(paso, { total, duraciones, pausaFinal, base = 900 }) {
  if (paso >= total) return pausaFinal;
  const d = typeof duraciones === "function" ? duraciones(paso) : duraciones?.[paso];
  return Number.isFinite(d) && d >= 0 ? d : base;
}

/** El reloj corre solo si la escena se ve, la pestaña está al frente, nadie la pausó y se permite movimiento. */
export function corre({ visible, pausado, reducido, oculto }) {
  return Boolean(visible && !pausado && !reducido && !oculto);
}

/** Texto del botón de control (botón real, no decorativo). null = sin botón (reducir movimiento). */
export function textoControl({ reducido, pausado, terminado }) {
  if (reducido) return null;
  if (terminado) return "Ver de nuevo";
  return pausado ? "Reanudar animación" : "Pausar animación";
}

/** «Ver de nuevo»: una sola vuelta más desde el inicio. */
export function repetir({ vueltas }) {
  return { paso: 0, vuelta: Math.max(0, vueltas - 1) };
}

// ——— Chat de WhatsApp ———
// Cada mensaje del agente va precedido de «escribiendo…» y cada botón que toca el candidato se marca antes de que
// salga su respuesta. Los pasos se derivan de la lista de mensajes para que el guion y la pantalla nunca se desfasen.

/** [{ tipo: "fecha"|"escribe"|"toca"|"msg"|"lee", i }] */
export function pasosChat(mensajes) {
  const pasos = [];
  mensajes.forEach((m, i) => {
    // El recordatorio lo manda el sistema a su hora: llega sin «escribiendo…».
    if (m.de === "ia" && !m.sinEscribir) pasos.push({ tipo: "escribe", i });
    if (m.de === "yo" && m.toca) pasos.push({ tipo: "toca", i });
    pasos.push({ tipo: m.de === "fecha" ? "fecha" : "msg", i });
  });
  // El último mensaje del candidato también se lee (palomitas azules) aunque nadie le conteste.
  const ultimo = mensajes.length - 1;
  if (mensajes[ultimo]?.de === "yo") pasos.push({ tipo: "lee", i: ultimo });
  return pasos;
}

/** Duración de cada paso del chat: escribir y leer toman lo que tomaría a una persona, sin hacer esperar. */
export function duracionChat(paso, mensajes) {
  if (!paso) return 900;
  const m = mensajes[paso.i];
  if (paso.tipo === "fecha") return 350;
  if (paso.tipo === "escribe") return 1100;
  if (paso.tipo === "toca") return 650;
  if (paso.tipo === "lee") return 500;
  const largo = (m?.texto ?? "").length;
  return m?.de === "ia" ? Math.min(2600, 1000 + largo * 9) : 900;
}

/**
 * Lo que se ve del chat después de `hechos` pasos: cuántos mensajes, si el agente está escribiendo, qué botón se
 * está tocando y hasta qué mensaje del candidato ya se leyó (palomitas azules).
 */
export function vistaChat(mensajes, hechos) {
  const pasos = pasosChat(mensajes);
  const n = Math.max(0, Math.min(hechos, pasos.length));
  const hechosLista = pasos.slice(0, n);
  const ultimo = hechosLista[n - 1] ?? null;
  const mostrados = new Set(hechosLista.filter((p) => p.tipo === "msg" || p.tipo === "fecha").map((p) => p.i));
  // Leído: todo mensaje del candidato anterior a un «escribiendo…» o a un «lee» ya ocurrido.
  let leidoHasta = -1;
  for (const p of hechosLista) {
    if (p.tipo === "escribe" || p.tipo === "lee") leidoHasta = Math.max(leidoHasta, p.tipo === "lee" ? p.i : p.i - 1);
    // Una respuesta del agente sin «escribiendo…» (recordatorio) también significa que lo anterior ya se leyó.
    if (p.tipo === "msg" && mensajes[p.i].de === "ia") leidoHasta = Math.max(leidoHasta, p.i - 1);
  }
  return {
    mostrados,
    escribiendo: ultimo?.tipo === "escribe",
    tocando: ultimo?.tipo === "toca" ? mensajes[ultimo.i].toca : null,
    leidoHasta,
    completo: n === pasos.length,
  };
}

/** Marcas que ya ocurrieron en el chat (para la ficha de RH que se llena al mismo tiempo). */
export function marcasChat(mensajes, vista) {
  const marcas = new Set();
  mensajes.forEach((m, i) => { if (m.marca && vista.mostrados.has(i)) marcas.add(m.marca); });
  return marcas;
}
