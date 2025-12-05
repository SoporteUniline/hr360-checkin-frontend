import { useState } from "react";
import { Button } from "./ui/button";

export default function AgruparOpciones() {
  const [selected, setSelected] = useState("ninguno");

  const opciones = [
    { id: "ninguno", label: "Ninguno" },
    { id: "empleado", label: "Empleado" },
    { id: "tipo", label: "Tipo" },
    { id: "fecha", label: "Fecha" },
    { id: "estado", label: "Estado" },
  ];

  return (
    <div className="flex items-center gap-3">
      <span className="font-semibold text-gray-600 text-xs">AGRUPAR:</span>

      <div className="flex gap-2">
        {opciones.map((op) => (
          <Button
            key={op.id}
            onClick={() => setSelected(op.id)}
            className={`
              text-xs px-4 py-2 rounded-md text-white 
              transition-all
              ${
                selected === op.id
                  ? "bg-[#237ab4] hover:bg-[#175d8d] " // seleccionado
                  : "bg-white-500 text-black hover:bg-gray-200 border-2 font-bold" // normal
              }
            `}
          >
            {op.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
