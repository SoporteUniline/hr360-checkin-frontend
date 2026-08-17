import dayjs from "dayjs";

export function calcDiasTotalesYHabiles({
  fechaInicio,
  fechaFin,
  festivosSet = new Set(),
  diasTrabajo = "",
}) {
  if (!fechaInicio) {
    return { diasTotales: 0, diasHabiles: 0 };
  }

  const start = dayjs(fechaInicio);
  const end = fechaFin ? dayjs(fechaFin) : start;

  const diasTotales = Math.max(1, end.diff(start, "day") + 1);

  const nombresDias = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];

  const diasLaborales = new Set(
    String(diasTrabajo || "")
      .split(",")
      .map((dia) => dia.trim())
      .filter(Boolean),
  );

  let diasHabiles = 0;

  for (
    let d = start.startOf("day");
    d.isBefore(end.endOf("day")) || d.isSame(end, "day");
    d = d.add(1, "day")
  ) {
    const ymd = d.format("YYYY-MM-DD");
    const esFestivo = festivosSet?.has(ymd) || false;

    const nombreDia = nombresDias[d.day()];

    const esDiaLaboral =
      diasLaborales.size > 0 ? diasLaborales.has(nombreDia) : d.day() !== 0;

    console.log({
      fecha: d.format("YYYY-MM-DD"),
      diaSemana: d.day(),
      esSabado: d.day() === 6,
      esDomingo: d.day() === 0,
      esFestivo,
      diasTrabajo,
    });

    if (esDiaLaboral && !esFestivo) {
      diasHabiles++;
    }
  }

  return { diasTotales, diasHabiles };
}
