"use client";

// Módulo Checklists → Checklists (23/11/2026). Ver src/components/tareas/ModuloTareas.jsx.
import { Suspense } from "react";
import ModuloTareas from "@/components/tareas/ModuloTareas";

export default function PaginaChecklists() {
  return <Suspense fallback={<p role="status" className="p-6 text-sm text-slate-500">Cargando…</p>}><ModuloTareas modulo="checklists" /></Suspense>;
}
