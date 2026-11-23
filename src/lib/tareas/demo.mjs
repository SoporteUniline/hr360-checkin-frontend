// Datos de EJEMPLO del prototipo de Tareas y Checklists (23/11/2026). No son datos reales: sirven para ver y aprobar las
// pantallas antes de crear las tablas. Fechas relativas a hoy (Ciudad de México) para que siempre se vean vigentes.
import { calificar } from "./reglas.mjs";

export const hoyMx = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(d);
export const masDias = (fecha, n) => new Date(Date.parse(`${fecha}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

export const PERSONAS = [
  { id: 1, nombre: "Ana Torres", ini: "AT", puesto: "Encargada de turno", sucursal: "Centro", hoy: "En jornada · sale 6:00 p.m.", tono: "verde" },
  { id: 2, nombre: "Carla Ruiz", ini: "CR", puesto: "Cocinera", sucursal: "Centro", hoy: "En jornada · sale 4:00 p.m.", tono: "verde" },
  { id: 3, nombre: "Luis Méndez", ini: "LM", puesto: "Mesero", sucursal: "Centro", hoy: "Entra 3:00 p.m.", tono: "gris" },
  { id: 4, nombre: "Juan Pérez", ini: "JP", puesto: "Almacenista", sucursal: "Centro", hoy: "No checó hoy", tono: "rojo" },
  { id: 5, nombre: "Beto Ríos", ini: "BR", puesto: "Encargado de turno", sucursal: "Norte", hoy: "En jornada · sale 10:00 p.m.", tono: "verde" },
  { id: 6, nombre: "Sofía Lara", ini: "SL", puesto: "Cajera", sucursal: "Norte", hoy: "Ya salió", tono: "gris" },
];
export const JEFE = { id: 99, nombre: "Diego (encargado)", ini: "DG" };

export function datosEjemplo(hoy = hoyMx()) {
  const d = (n) => masDias(hoy, n);
  let id = 0;
  const pasos = (...textos) => textos.map((t) => ({ id: ++id, texto: typeof t === "string" ? t : t[0], hecho: typeof t !== "string" && t[1] }));

  const proyectos = [
    { id: 1, nombre: "Apertura sucursal Norte", descripcion: "Todo lo necesario para abrir el 15 de diciembre.", color: "#2563eb", responsable: 99, fin: d(22) },
    { id: 2, nombre: "Temporada navideña", descripcion: "Decoración, menú de temporada y turnos extra.", color: "#dc2626", responsable: 1, fin: d(30) },
    { id: 3, nombre: "Nuevo menú 2027", descripcion: "Probar platillos, costear y capacitar al equipo.", color: "#7c3aed", responsable: 2, fin: d(45) },
  ];

  const t = (o) => ({ id: ++id, descripcion: "", comentarios: [], fotos: [], pideFoto: false, ...o });
  const tareas = [
    t({ titulo: "Contratar 4 meseros para Norte", proyecto: 1, persona: 5, prioridad: "Alta", estado: "en_proceso", fecha: d(5), pasos: pasos(["Publicar vacante", true], ["Entrevistar", true], "Elegir", "Firmar contratos") }),
    t({ titulo: "Instalar reloj checador en Norte", proyecto: 1, persona: 5, prioridad: "Media", estado: "por_hacer", fecha: d(10), pasos: pasos("Comprar tableta", "Instalar app", "Registrar rostros"), pideFoto: true }),
    t({ titulo: "Permiso de protección civil", proyecto: 1, persona: 1, prioridad: "Alta", estado: "revision", fecha: d(-1), pasos: pasos(["Reunir papeles", true], ["Pagar derechos", true], ["Entregar en ventanilla", true]), pideFoto: true, fotos: ["ejemplo"], comentarios: [{ de: "Ana Torres", texto: "Ya quedó entregado, adjunto el acuse." }] }),
    t({ titulo: "Comprar mobiliario de terraza", proyecto: 1, persona: 4, prioridad: "Media", estado: "hecho", fecha: d(-6), pasos: pasos(["Cotizar", true], ["Comprar", true]) }),
    t({ titulo: "Decorar el comedor", proyecto: 2, persona: 3, prioridad: "Media", estado: "por_hacer", fecha: d(3), pasos: pasos("Bajar adornos de bodega", "Árbol en la entrada", "Luces en ventanas"), pideFoto: true }),
    t({ titulo: "Definir menú de temporada", proyecto: 2, persona: 2, prioridad: "Alta", estado: "en_proceso", fecha: d(-2), pasos: pasos(["Proponer 5 platillos", true], "Probar con el dueño", "Costear") }),
    t({ titulo: "Armar turnos extra de diciembre", proyecto: 2, persona: 1, prioridad: "Alta", estado: "por_hacer", fecha: d(6), pasos: pasos("Preguntar disponibilidad", "Publicar turnos") }),
    t({ titulo: "Probar 3 platillos nuevos", proyecto: 3, persona: 2, prioridad: "Baja", estado: "por_hacer", fecha: d(20), pasos: pasos("Receta 1", "Receta 2", "Receta 3"), pideFoto: true }),
    t({ titulo: "Inventario de refrigeradores", proyecto: null, persona: 2, prioridad: "Alta", estado: "en_proceso", fecha: d(0), pasos: pasos(["Refrigerador 1", true], ["Refrigerador 2", true], "Refrigerador 3", "Anotar caducidades"), pideFoto: true, comentarios: [{ de: "Diego (encargado)", texto: "Ojo con los yogures de la marca nueva." }] }),
    t({ titulo: "Acomodar mercancía nueva en bodega", proyecto: null, persona: 4, prioridad: "Media", estado: "por_hacer", fecha: d(0), pasos: pasos("Recibir", "Acomodar", "Etiquetar") }),
    t({ titulo: "Cambiar precios de bebidas", proyecto: null, persona: 1, prioridad: "Media", estado: "revision", fecha: d(0), pasos: pasos(["Imprimir carta", true], ["Cambiar en caja", true]) }),
    t({ titulo: "Pedir garrafones de agua", proyecto: null, persona: 3, prioridad: "Baja", estado: "hecho", fecha: d(-1), pasos: pasos(["Llamar al proveedor", true]) }),
  ];

  const p = (texto, peso = 1, extra = {}) => ({ id: ++id, texto, peso, pideFoto: false, obligatorio: false, ...extra });
  const checklists = [
    { id: 1, nombre: "Apertura de restaurante", frecuencia: "Diario", hora: "09:00", aQuien: "Puesto: Encargado de turno", sucursal: "Todas", revisa: "Su jefe inmediato", soloSiCheco: true, personas: [1, 5],
      puntos: [p("Abrir cortina y encender luces"), p("Contar fondo de caja ($1,000)", 2, { obligatorio: true }), p("Piso limpio y seco", 1, { pideFoto: true }), p("Mesas montadas", 1, { pideFoto: true }), p("Refrigeradores a menos de 5 °C", 2, { pideFoto: true, obligatorio: true }), p("Baño limpio y con papel"), p("Uniforme completo del equipo"), p("Revisar reservaciones del día")] },
    { id: 2, nombre: "Cierre y corte de caja", frecuencia: "Diario", hora: "23:00", aQuien: "Puesto: Encargado de turno", sucursal: "Todas", revisa: "Su jefe inmediato", soloSiCheco: true, personas: [1, 5],
      puntos: [p("Corte de caja cuadrado", 3, { obligatorio: true }), p("Gas cerrado", 2, { obligatorio: true, pideFoto: true }), p("Cocina limpia", 1, { pideFoto: true }), p("Basura fuera"), p("Alarma activada", 2, { obligatorio: true })] },
    { id: 3, nombre: "Limpieza de cocina (inocuidad)", frecuencia: "Cada lunes", hora: "12:00", aQuien: "Puesto: Cocinera", sucursal: "Centro", revisa: "Su jefe inmediato", soloSiCheco: true, personas: [2],
      puntos: [p("Campana desengrasada", 2, { pideFoto: true }), p("Trampa de grasa limpia", 2, { pideFoto: true }), p("Etiquetas de fecha en contenedores"), p("Tablas de colores separadas"), p("Bitácora de temperaturas llena", 2)] },
  ];

  // Historial de 14 días (determinista): cada persona asignada llena su checklist diario.
  const envios = [];
  let semilla = 7;
  const azar = () => { semilla = (semilla * 9301 + 49297) % 233280; return semilla / 233280; };
  for (let dia = -14; dia <= 0; dia += 1) {
    const fecha = d(dia);
    for (const ck of checklists) {
      if (ck.frecuencia === "Cada lunes" && new Date(`${fecha}T12:00:00Z`).getUTCDay() !== 1) continue;
      for (const persona of ck.personas) {
        const perfil = { 1: 0.95, 5: 0.8, 2: 0.88 }[persona] ?? 0.9;
        if (dia === 0 && ck.id === 2) continue; // el cierre de hoy aún no toca
        if (azar() > perfil + 0.08) { envios.push({ id: ++id, checklist: ck.id, persona, fecha, estado: "no_enviado" }); continue; }
        const marcas = Object.fromEntries(ck.puntos.map((pt) => [pt.id, azar() < perfil + 0.04]));
        const porRevisar = dia === 0 || (dia === -1 && persona === 5);
        const calif = calificar(ck.puntos, marcas);
        envios.push({
          id: ++id, checklist: ck.id, persona, fecha, marcas, calificacion: calif,
          hora: `${String(Math.floor(azar() * 2) + Number(ck.hora.slice(0, 2)) - 1).padStart(2, "0")}:${String(Math.floor(azar() * 59)).padStart(2, "0")}`,
          aTiempo: azar() < perfil + 0.05,
          estado: porRevisar ? "por_revisar" : calif < 75 ? "regresado" : "aprobado",
          nota: porRevisar && persona === 1 ? "El refrigerador 3 hace ruido, ya avisé a mantenimiento." : "",
          fotos: Object.fromEntries(ck.puntos.filter((pt) => pt.pideFoto && marcas[pt.id]).map((pt) => [pt.id, "ejemplo"])),
        });
      }
    }
  }
  return { proyectos, tareas, checklists, envios, siguienteId: id + 1 };
}
