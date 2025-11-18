export function formatDateDMY(input) {
  if (!input) return "";

  // Si es dayjs, convertir a Date
  if (typeof input === "object" && typeof input.toDate === "function") {
    input = input.toDate();
  }

  const d = input instanceof Date ? input : new Date(input);

  if (isNaN(d)) return "";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}
