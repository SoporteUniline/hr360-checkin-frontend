import { Clock } from "lucide-react";

export default function ClockDisplay({ horaActual, fechaActual }) {
  return (
    <div className="text-center">
      <div className="relative mb-4">
        <div className="w-18 h-18 mx-auto bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center shadow-xl transform hover:scale-105 transition-transform duration-300">
          <Clock className="w-8 h-8 text-white animate-pulse" />
        </div>
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full animate-ping"></div>
      </div>
      <h2 className="text-5xl font-bold text-slate-800 mb-2 tracking-tight font-mono">
        {horaActual}
      </h2>
      <p className="text-md text-slate-500 mb-8">{fechaActual}</p>
    </div>
  );
}
