// Hora para mostrar en 12 horas con a.m./p.m. Solo para MOSTRAR: captura (<input type="time">) y cálculos siguen
// en HH:mm. Acepta dayjs o «HH:mm» / «HH:mm:ss». Probado en scripts/test-hora12.mjs.
export function hora12(valor, { segundos = false } = {}) {
  if (valor == null || valor === "") return "";
  let h, m, s;
  if (typeof valor === "object" && typeof valor.hour === "function") {
    if (valor.isValid && !valor.isValid()) return "";
    h = valor.hour(); m = valor.minute(); s = valor.second();
  } else {
    const r = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(String(valor).trim());
    if (!r) return String(valor);
    h = Number(r[1]); m = Number(r[2]); s = Number(r[3] ?? 0);
  }
  const sufijo = h < 12 ? "a.m." : "p.m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const dos = (n) => String(n).padStart(2, "0");
  return `${h12}:${dos(m)}${segundos ? `:${dos(s)}` : ""} ${sufijo}`;
}
