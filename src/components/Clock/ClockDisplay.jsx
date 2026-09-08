import { Clock } from "lucide-react";

export default function ClockDisplay({ horaActual, fechaActual }) {
  return (
    <div className="text-center">
      <div className="relative mb-4">
        <div className="w-18 h-18 mx-auto bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-md">
          <Clock className="w-8 h-8 text-white" />
        </div>
        <div className="absolute -top-2 -right-2 w-3 h-3 bg-green-500 rounded-full"></div>
      </div>
      <h2 className="text-5xl font-bold text-slate-900 mb-2 tracking-tight font-mono flex items-end justify-center gap-2">
        <span>{horaActual.replace(/ (AM|PM)/, "")}</span>

        <span className="text-xl text-blue-600 font-black tracking-wide">
          {horaActual.includes("AM") ? "AM" : "PM"}
        </span>
      </h2>
      <p className="text-sm text-slate-500 mb-8">{fechaActual}</p>
    </div>
  );
}
