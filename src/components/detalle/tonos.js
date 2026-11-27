// Colores de estado de las vistas de detalle (docs/vistas-de-detalle.md). Contraste ≥ 4.5:1 sobre su fondo.
export const TONOS = {
  exito: { fondo: "#DCFCE7", texto: "#166534", suave: "#F0FDF4" },
  aviso: { fondo: "#FFEDD5", texto: "#9A3412", suave: "#FFF7ED" },
  error: { fondo: "#FEE2E2", texto: "#991B1B", suave: "#FEF2F2" },
  info: { fondo: "#E0E7FF", texto: "#1E3A8A", suave: "#EEF2FF" },
  neutro: { fondo: "#E5E7EB", texto: "#374151", suave: "#F3F4F6" },
};
export const tono = (t) => TONOS[t] ?? TONOS.neutro;

/** Pastilla de estado («Vigente», «Pendiente»…). */
export function Pastilla({ texto, tono: t = "neutro", className = "" }) {
  const c = tono(t);
  return (
    <span data-chico className={`inline-flex items-center rounded-full px-3 py-0.5 text-[15px] font-bold ${className}`} style={{ background: c.fondo, color: c.texto }}>
      {texto}
    </span>
  );
}
