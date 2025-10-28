import React from "react";

const AsistenciaCards = ({ totals }) => {
  const {
    total_empleados = 0,
    total_presentes = 0,
    total_tardanzas = 0,
    total_ausencias = 0,
    total_con_horas_extra = 0,
  } = totals || {};

  const cards = [
    { title: "Total Empleados", count: total_empleados },
    { title: "Presentes", count: total_presentes },
    { title: "Tardanzas", count: total_tardanzas },
    { title: "Ausencias", count: total_ausencias },
    { title: "Horas extra", count: total_con_horas_extra },
  ];

  return (
    <div
      className="
        grid 
        grid-cols-1
        sm:grid-cols-2
        lg:grid-cols-5
        gap-4
        mb-6
      "
    >
      {cards.map((card, index) => (
        <div
          key={index}
          className={`
            p-6 rounded-2xl shadow-md bg-white flex flex-col items-center justify-center
            ${index === 4 ? "sm:col-span-2 lg:col-span-1" : ""}
          `}
        >
          <p className="text-4xl font-bold text-slate-700">{card.count || 0}</p>
          <p className="text-center mt-2 text-sm font-medium text-gray-600">
            {card.title}
          </p>
        </div>
      ))}
    </div>
  );
};

export default AsistenciaCards;
