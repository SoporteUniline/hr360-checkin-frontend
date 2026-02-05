import { User, Delete, Camera, Eraser, QrCode } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function EmployeeInput({
  codigo,
  setCodigo,
  handleRegistrar,
  handleOpenQR,
  handleOpenFacialModal,
  registrando,
  enqueueSnackbar,
}) {
  const handleDigit = (digit) => {
    setCodigo((prev) => prev + digit);
  };

  const handleDelete = () => {
    setCodigo((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setCodigo("");
  };

  const handleKeyDown = (e) => {
    if (/^[0-9]$/.test(e.key)) {
      if (codigo.length < 10) setCodigo((prev) => prev + e.key);
    } else if (e.key === "Backspace") {
      handleDelete();
    } else if (e.key === "Enter") {
      if (codigo.trim() !== "") handleRegistrar();
      else
        enqueueSnackbar("Ingresa un código antes de registrar", {
          variant: "warning",
        });
    } else {
      e.preventDefault();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-stretch gap-3 w-full">
        <div className="relative flex-1">
          <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Ingresa tu código"
            value={codigo}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              if (val.length <= 10) setCodigo(val);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (codigo.trim() !== "") handleRegistrar();
                else
                  enqueueSnackbar("Ingresa un código antes de registrar", {
                    variant: "warning",
                  });
              }
            }}
            className="w-full pl-12 pr-4 h-full text-center text-lg font-bold border-2 border-slate-200 rounded-2xl focus-visible:ring-0 focus-visible:border-slate-600 bg-slate-50/50 transition-all"
          />
        </div>

        <Button
          onClick={handleOpenQR}
          variant="outline"
          className="hidden md:flex flex-col items-center justify-center h-auto aspect-square px-5 border-2 border-slate-200 rounded-2xl bg-white hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-95 group shadow-sm"
          title="Escanear Código QR"
        >
          <QrCode className="w-7 h-7 text-slate-600 group-hover:text-slate-900 transition-colors" />
          <span className="text-[10px] font-black text-slate-500 group-hover:text-slate-900 uppercase tracking-tighter">
            QR
          </span>
        </Button>
      </div>

      <div className="hidden md:grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <Button
            key={num}
            onClick={() => handleDigit(num.toString())}
            className="py-6 text-2xl font-bold rounded-2xl text-slate-700 bg-white hover:bg-gray-100 shadow-md hover:scale-105 transition-transform"
          >
            {num}
          </Button>
        ))}

        <Button
          onClick={handleClear}
          className="py-6 text-md font-bold rounded-2xl bg-slate-700 text-white hover:bg-slate-800 shadow-md hover:scale-105 transition-transform flex justify-center items-center space-x-2"
        >
          <span>Limpiar</span>
        </Button>

        <Button
          onClick={() => handleDigit("0")}
          className="py-6 text-2xl font-bold rounded-2xl text-slate-700 bg-white hover:bg-gray-100 shadow-md hover:scale-105 transition-transform"
        >
          0
        </Button>

        <Button
          onClick={handleDelete}
          className="py-6 text-2xl font-bold rounded-2xl bg-red-600 text-white hover:bg-red-700 shadow-md hover:scale-105 transition-transform flex justify-center items-center"
        >
          <Delete className="w-6 h-6" />
        </Button>
      </div>

      <Button
        onClick={() => handleRegistrar()}
        disabled={registrando || !codigo.trim()}
        className="w-full py-4 bg-linear-to-r from-slate-700 to-slate-800 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:transform-none"
      >
        {registrando ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Registrando...</span>
          </div>
        ) : (
          "Registrar Entrada / Salida"
        )}
      </Button>
    </div>
  );
}
