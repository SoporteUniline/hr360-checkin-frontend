import axios from "@/lib/axios";

// Share a small request pool across the directory, date views and detail screens.
// Financial balances are requested only for visible companies.
const waiting = [];
let running = 0;
const maxConcurrent = 4;
function drain() {
  while (running < maxConcurrent && waiting.length) {
    const { url, resolve, reject } = waiting.shift();
    running += 1;
    axios
      .get(url, { timeout: 15000 })
      .then((response) => resolve(response.data), reject)
      .finally(() => {
        running -= 1;
        drain();
      });
  }
}
export function fetchCompanySummary(url) {
  return new Promise((resolve, reject) => {
    waiting.push({ url, resolve, reject });
    drain();
  });
}

export function numberOrNull(value) {
  if (
    value == null ||
    typeof value === "boolean" ||
    String(value).trim() === ""
  )
    return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export const money = (value) => {
  const number = numberOrNull(value);
  return number === null
    ? "Sin dato"
    : number.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
};

export function getValidity(subscription, now = new Date()) {
  // Some existing contracts return fecha_fin; newer ones have the explicit
  // administrative date. An explicit null must not resurrect an old date.
  const raw =
    subscription &&
    Object.prototype.hasOwnProperty.call(subscription, "fecha_vencimiento")
      ? subscription.fecha_vencimiento
      : subscription?.fecha_fin;
  const match =
    typeof raw === "string" && raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/);
  if (!match) return null;
  const [, year, month, day] = match;
  const target = Date.UTC(Number(year), Number(month) - 1, Number(day));
  const parsed = new Date(target);
  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() !== Number(month) - 1 ||
    parsed.getUTCDate() !== Number(day)
  )
    return null;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((target - today) / 86400000);
  return {
    date: `${day}/${month}/${year}`,
    days,
    label:
      days < 0
        ? `Hace ${Math.abs(days)} ${days === -1 ? "día" : "días"}`
        : days === 0
        ? "Vence hoy"
        : `En ${days} ${days === 1 ? "día" : "días"}`,
    tone: days < 0 ? "danger" : days <= 7 ? "warning" : "neutral",
  };
}
