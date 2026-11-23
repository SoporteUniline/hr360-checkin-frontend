// Datos de EJEMPLO del prototipo de Tareas y Checklists (23/11/2026). No son datos reales: sirven para ver y aprobar las
// pantallas antes de crear las tablas. Fechas relativas a hoy (Ciudad de México) para que siempre se vean vigentes.
import { aplicarCorrecciones, calificarRespuestas } from "./preguntas.mjs";

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

  // Preguntas de los checklists de ejemplo (todos los tipos).
  const op = (...pares) => pares.map(([texto, valor]) => ({ id: ++id, texto, valor }));
  const q = (texto, tipo, extra = {}) => ({ id: ++id, texto, tipo, peso: 1, obligatoria: false, permiteNA: false, pideFoto: false, ...extra });
  const checklists = [
    { id: 1, nombre: "Apertura de restaurante", frecuencia: "Diario", hora: "09:00", aQuien: "Puesto: Encargado de turno", sucursal: "Todas", revisa: "Su jefe inmediato", soloSiCheco: true, personas: [1, 5],
      preguntas: [
        q("¿Se abrió la cortina y se encendieron las luces?", "si_no", { correcta: "si", obligatoria: true }),
        q("Fondo de caja contado", "numero", { min: 1000, max: 1000, unidad: "pesos", peso: 2, obligatoria: true }),
        q("¿Cómo está el comedor?", "opcion", { opciones: op(["Limpio", 100], ["Regular", 50], ["Sucio", 0]), peso: 2, pideFoto: true, obligatoria: true }),
        q("¿Cómo está la terraza?", "opcion", { opciones: op(["Limpia", 100], ["Regular", 50], ["Sucia", 0]), permiteNA: true, pideFoto: true }),
        q("Temperatura del refrigerador", "numero", { min: 0, max: 5, unidad: "°C", peso: 2, obligatoria: true }),
        q("¿Qué está listo en los baños?", "multiple", { opciones: op(["Papel", 25], ["Jabón", 25], ["Toallas", 25], ["Piso seco", 25]), obligatoria: true }),
        q("¿Todo el equipo trae uniforme completo?", "si_no", { correcta: "si" }),
        q("Observaciones", "texto_largo"),
      ] },
    { id: 2, nombre: "Cierre y corte de caja", frecuencia: "Diario", hora: "23:00", aQuien: "Puesto: Encargado de turno", sucursal: "Todas", revisa: "Su jefe inmediato", soloSiCheco: true, personas: [1, 5],
      preguntas: [
        q("¿El corte de caja cuadró?", "si_no", { correcta: "si", peso: 3, obligatoria: true }),
        q("Foto de las llaves del gas cerradas", "foto", { peso: 2, obligatoria: true }),
        q("¿Cómo quedó la cocina?", "opcion", { opciones: op(["Limpia", 100], ["Regular", 50], ["Sucia", 0]), pideFoto: true }),
        q("¿Hay basura dentro del local?", "si_no", { correcta: "no" }),
        q("¿Quedó activada la alarma?", "si_no", { correcta: "si", peso: 2, obligatoria: true }),
      ] },
    { id: 3, nombre: "Limpieza de cocina (inocuidad)", frecuencia: "Cada lunes", hora: "12:00", aQuien: "Puesto: Cocinera", sucursal: "Centro", revisa: "Su jefe inmediato", soloSiCheco: true, personas: [2],
      preguntas: [
        q("¿Cómo está la campana?", "opcion", { opciones: op(["Desengrasada", 100], ["Con grasa", 30], ["Muy sucia", 0]), peso: 2, pideFoto: true, obligatoria: true }),
        q("¿Qué contenedores tienen etiqueta de fecha?", "multiple", { opciones: op(["Carnes", 40], ["Lácteos", 30], ["Verduras", 30]) }),
        q("¿Las tablas de colores están separadas?", "si_no", { correcta: "si" }),
        q("Temperatura del congelador", "numero", { min: -25, max: -18, unidad: "°C", peso: 2, obligatoria: true }),
        q("Caducidad más próxima en el refrigerador", "fecha"),
        q("¿Cuándo se limpió la trampa de grasa?", "fecha_hora"),
        q("Quién ayudó con la limpieza", "texto"),
      ] },
  ];

  // Respuesta de ejemplo: «buena» con probabilidad `bien`, si no una mala o regular.
  const responder = (pg, bien, azar) => {
    const ok = azar() < bien;
    switch (pg.tipo) {
      case "si_no": return { valor: ok ? pg.correcta : pg.correcta === "si" ? "no" : "si" };
      case "opcion": { const ord = [...pg.opciones].sort((a, b) => b.valor - a.valor); return { valor: (ok ? ord[0] : ord[1 + Math.floor(azar() * (ord.length - 1))]).id, foto: pg.pideFoto ? "ejemplo" : undefined }; }
      case "multiple": return { valor: pg.opciones.filter(() => ok || azar() < 0.6).map((o) => o.id) };
      case "numero": {
        if (pg.permiteNA && azar() < 0.2) return { na: true };
        const min = Number(pg.min), max = Number(pg.max);
        return { valor: ok ? Math.round(min + (max - min) * azar()) : max + 1 + Math.floor(azar() * 4) };
      }
      case "foto": return ok || azar() < 0.5 ? { valor: "ejemplo" } : {};
      case "texto": return azar() < 0.6 ? { valor: "Luis" } : {};
      case "texto_largo": return azar() < 0.3 ? { valor: "El refrigerador 3 hace ruido, ya avisé a mantenimiento." } : {};
      case "fecha": return { valor: d(2 + Math.floor(azar() * 5)) };
      case "fecha_hora": return { valor: `${d(-1)}T${String(14 + Math.floor(azar() * 4)).padStart(2, "0")}:30` };
      default: return {};
    }
  };

  // Historial de 14 días (determinista): cada persona asignada llena su checklist.
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
        let respuestas = Object.fromEntries(ck.preguntas.map((pg) => [pg.id, responder(pg, perfil, azar)]));
        if (persona === 1 && ck.id === 1 && dia === 0) respuestas = { ...respuestas, [ck.preguntas[7].id]: { valor: "El refrigerador 3 hace ruido, ya avisé a mantenimiento." } };
        const porRevisar = dia === 0 || (dia === -1 && persona === 5);
        let cambios = [];
        let finales = respuestas;
        // Algunos revisados con corrección del jefe (p. ej. dijo «Limpio» y en la foto se veía regular).
        if (!porRevisar && persona === 5 && ck.id === 1 && azar() < 0.4) {
          const pg = ck.preguntas[2];
          ({ finales, cambios } = aplicarCorrecciones(ck.preguntas, respuestas, { [pg.id]: { valor: pg.opciones[1].id } }));
          cambios = cambios.map((c) => ({ ...c, por: "Diego (encargado)" }));
        }
        const calificacion = calificarRespuestas(ck.preguntas, finales);
        envios.push({
          id: ++id, checklist: ck.id, persona, fecha, respuestas: finales, respuestasPersona: respuestas, cambios, calificacion,
          hora: `${String(Math.floor(azar() * 2) + Number(ck.hora.slice(0, 2)) - 1).padStart(2, "0")}:${String(Math.floor(azar() * 59)).padStart(2, "0")}`,
          aTiempo: azar() < perfil + 0.05,
          estado: porRevisar ? "por_revisar" : calificacion < 75 ? "regresado" : "aprobado",
          comentarioJefe: cambios.length ? "En la foto el comedor no se ve limpio." : "",
        });
      }
    }
  }
  return { proyectos, tareas, checklists, envios, siguienteId: id + 1 };
}
