import React from "react";

/**
 * Componente que muestra un resumen de las asistencias en formato de tarjetas.
 * Recibe un objeto 'totals' con los contadores.
 * @param {Object} totals - Objeto con los totales de asistencia.
 * @param {number} totals.total_empleados - Total de empleados en la empresa.
 * @param {number} totals.total_presentes - Total de empleados presentes.
 * @param {number} totals.total_tardanzas - Total de empleados que llegaron tarde hoy.
 * @param {number} totals.total_ausencias - Total de empleados ausentes hoy.
 */
const AsistenciaCards = ({ totals }) => {
  // Maneja el caso en que 'totals' sea null o undefined
  const {
    total_empleados = 0,
    total_presentes = 0,
    total_tardanzas = 0,
    total_ausencias = 0,
  } = totals || {};

  // Define la configuración de las tarjetas en un array para facilitar el renderizado
  const cards = [
    {
      title: "Total Empleados",
      count: total_empleados,
      bgColor: "bg-white",
      textColor: "text-slate-700",
    },
    {
      title: "Presentes",
      count: total_presentes,
      bgColor: "bg-white",
      textColor: "text-slate-700",
    },
    {
      title: "Tardanzas",
      count: total_tardanzas,
      bgColor: "bg-white",
      textColor: "text-slate-700",
    },
    {
      title: "Ausencias",
      count: total_ausencias,
      bgColor: "bg-white",
      textColor: "text-slate-700",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`p-6 rounded-2xl shadow-md ${card.bgColor} flex flex-col items-center justify-center`}
        >
          <p className={`text-4xl font-bold ${card.textColor}`}>
            {card.count || 0}
          </p>
          <p className="text-center mt-2 text-sm font-medium text-gray-600">
            {card.title}
          </p>
        </div>
      ))}
    </div>
  );
};

export default AsistenciaCards;
