"use client";

// Estado del PROTOTIPO de Tareas y Checklists (23/11/2026): datos de ejemplo en memoria, guardados en este navegador
// (sessionStorage) para que lo que muevas no se pierda al cambiar de pestaña. Cuando existan las tablas, este proveedor
// se reemplaza por llamadas a la API con las mismas acciones.
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";
import { datosEjemplo, hoyMx, PERSONAS, JEFE } from "@/lib/tareas/demo.mjs";
import { calificar } from "@/lib/tareas/reglas.mjs";

const CLAVE = "adamia-tareas-prototipo-v1";
const Contexto = createContext(null);

function reductor(s, a) {
  const nuevoId = () => s.siguienteId;
  switch (a.tipo) {
    case "reiniciar": return a.datos;
    case "mover": return { ...s, tareas: s.tareas.map((t) => (t.id === a.id ? { ...t, estado: a.estado } : t)) };
    case "paso": return { ...s, tareas: s.tareas.map((t) => (t.id === a.id ? { ...t, pasos: t.pasos.map((p) => (p.id === a.paso ? { ...p, hecho: !p.hecho } : p)) } : t)) };
    case "foto": return { ...s, tareas: s.tareas.map((t) => (t.id === a.id ? { ...t, fotos: [...t.fotos, a.url] } : t)) };
    case "comentar": return { ...s, tareas: s.tareas.map((t) => (t.id === a.id ? { ...t, comentarios: [...t.comentarios, { de: a.de, texto: a.texto }] } : t)) };
    case "guardarTarea": {
      if (a.tarea.id) return { ...s, tareas: s.tareas.map((t) => (t.id === a.tarea.id ? { ...t, ...a.tarea } : t)) };
      let sig = nuevoId();
      const pasos = (a.tarea.pasos ?? []).map((p) => ({ ...p, id: sig++ }));
      return { ...s, siguienteId: sig + 1, tareas: [...s.tareas, { comentarios: [], fotos: [], estado: "por_hacer", ...a.tarea, pasos, id: sig }] };
    }
    case "guardarProyecto": {
      if (a.proyecto.id) return { ...s, proyectos: s.proyectos.map((p) => (p.id === a.proyecto.id ? { ...p, ...a.proyecto } : p)) };
      return { ...s, siguienteId: s.siguienteId + 1, proyectos: [...s.proyectos, { ...a.proyecto, id: nuevoId() }] };
    }
    case "guardarChecklist": {
      let sig = nuevoId();
      const puntos = a.checklist.puntos.map((p) => (p.id ? p : { ...p, id: sig++ }));
      if (a.checklist.id) return { ...s, siguienteId: sig, checklists: s.checklists.map((c) => (c.id === a.checklist.id ? { ...a.checklist, puntos } : c)) };
      return { ...s, siguienteId: sig + 1, checklists: [...s.checklists, { ...a.checklist, puntos, id: sig }] };
    }
    case "revisar": {
      return { ...s, envios: s.envios.map((e) => {
        if (e.id !== a.id) return e;
        const ck = s.checklists.find((c) => c.id === e.checklist);
        return { ...e, marcas: a.marcas, calificacion: calificar(ck.puntos, a.marcas), estado: a.aprobar ? "aprobado" : "regresado", comentarioJefe: a.comentario };
      }) };
    }
    case "enviarChecklist": {
      const ck = s.checklists.find((c) => c.id === a.checklist);
      const existente = s.envios.find((e) => e.checklist === a.checklist && e.persona === a.persona && e.fecha === a.fecha);
      const envio = { checklist: a.checklist, persona: a.persona, fecha: a.fecha, marcas: a.marcas, fotos: a.fotos, nota: a.nota, hora: a.hora,
        aTiempo: a.hora <= ck.hora, calificacion: calificar(ck.puntos, a.marcas), estado: "por_revisar" };
      if (existente) return { ...s, envios: s.envios.map((e) => (e === existente ? { ...e, ...envio } : e)) };
      return { ...s, siguienteId: s.siguienteId + 1, envios: [...s.envios, { ...envio, id: nuevoId() }] };
    }
    default: return s;
  }
}

function inicial() {
  try {
    const guardado = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(CLAVE) : null;
    if (guardado) {
      const d = JSON.parse(guardado);
      if (d?.hoy === hoyMx()) return d;
    }
  } catch { /* sin almacenamiento: datos nuevos */ }
  return { ...datosEjemplo(), hoy: hoyMx() };
}

export function TareasProvider({ children }) {
  const [s, despachar] = useReducer(reductor, null, inicial);
  useEffect(() => {
    try { sessionStorage.setItem(CLAVE, JSON.stringify(s)); } catch { /* no pasa nada */ }
  }, [s]);
  const reiniciar = useCallback(() => despachar({ tipo: "reiniciar", datos: { ...datosEjemplo(), hoy: hoyMx() } }), []);
  const valor = useMemo(() => ({
    ...s, despachar, reiniciar, personas: PERSONAS, jefe: JEFE,
    persona: (id) => PERSONAS.find((p) => p.id === id) ?? (id === JEFE.id ? JEFE : null),
    proyecto: (id) => s.proyectos.find((p) => p.id === id) ?? null,
    checklist: (id) => s.checklists.find((c) => c.id === id) ?? null,
  }), [s, reiniciar]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useTareas() {
  const v = useContext(Contexto);
  if (!v) throw new Error("useTareas fuera de TareasProvider");
  return v;
}
