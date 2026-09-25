"use client";
import { createContext, useContext } from "react";
export const RecruitmentContext = createContext(null);
export function useRecruitment() {
  const context = useContext(RecruitmentContext);
  if (!context) throw new Error("Esta vista debe abrirse dentro de Reclutamiento y selección.");
  return context;
}
