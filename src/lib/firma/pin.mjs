// Reglas del PIN para firmar (22/11/2026). Son las mismas que valida el servidor (firmaPin.validarPin); aquí solo se
// avisa antes de enviar. 6 dígitos, sin repetir el mismo número ni series como 123456 o 654321.
export function errorPin(pin) {
  const p = String(pin ?? "");
  if (!/^\d{6}$/.test(p)) return "El PIN debe tener 6 dígitos.";
  if (/^(\d)\1{5}$/.test(p)) return "Elige un PIN que no repita el mismo número.";
  const d = [...p].map(Number);
  const sube = d.every((n, i) => i === 0 || n === (d[i - 1] + 1) % 10);
  const baja = d.every((n, i) => i === 0 || n === (d[i - 1] + 9) % 10);
  if (sube || baja) return "Elige un PIN que no sea una serie (como 123456).";
  return null;
}
