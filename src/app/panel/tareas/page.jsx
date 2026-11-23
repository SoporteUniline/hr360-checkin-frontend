"use client";

// Módulo Tareas → Tablero (23/11/2026). Ver src/components/tareas/ModuloTareas.jsx.
import { Suspense } from "react";
import ModuloTareas from "@/components/tareas/ModuloTareas";

export default function PaginaTareas() {
  return <Suspense fallback={<p role="status" className="p-6 text-sm text-slate-500">Cargando tareas…</p>}><ModuloTareas modulo="tareas" /></Suspense>;
}
