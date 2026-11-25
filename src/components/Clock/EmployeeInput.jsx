import { User, Eraser, QrCode, Delete } from "lucide-react";
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
  // (26/11/2026) Botón junto al código y el QR (p. ej. «Voy a comer»). El reloj de la empresa usa su propio panel
  // (MetodosKiosco.jsx); este es el del reloj del empleado.
  extra = null,
}) {
  const tecla = "py-6 text-2xl font-semibold rounded-2xl";
  const handleDigit = (digit) => {
    setCodigo((prev) => prev + digit);
  };

  const handleDelete = () => {
    setCodigo((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setCodigo("");
  };

  return (
    <div className="space-y-4">
      <div className="flex w-full items-stretch gap-3">
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
              setCodigo(val);
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
            className="w-full pl-12 pr-4 h-full text-center text-lg font-bold border-2 border-slate-200 rounded-2xl focus-visible:ring-0 focus-visible:border-blue-500 bg-slate-50/50 transition-all"
          />
        </div>

        {extra}

        <Button
          onClick={handleOpenQR}
          variant="outline"
          className={`hidden md:flex h-auto px-5 flex-col items-center justify-center aspect-square border-2 border-slate-200 rounded-2xl bg-white hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-95 group shadow-sm`}
          title="Escanear Código QR"
        >
          <QrCode className="size-7 text-slate-600 group-hover:text-slate-900 transition-colors" />
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
            className={`${tecla} text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm`}
          >
            {num}
          </Button>
        ))}

        <Button
          onClick={handleClear}
          variant="outline"
          className={`py-6 text-md font-bold rounded-2xl border-slate-300 text-slate-700 hover:bg-slate-100 flex justify-center items-center space-x-2`}
        >
          <Eraser className="size-5 mr-2" aria-hidden="true" />
          <span>Limpiar</span>
        </Button>

        <Button
          onClick={() => handleDigit("0")}
          className={`${tecla} text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm`}
        >
          0
        </Button>

        <Button
          onClick={handleDelete}
          variant="outline"
          className={`${tecla} text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm flex justify-center items-center`}
          aria-label="Borrar último dígito"
        >
          <Delete className="size-6" aria-hidden="true" />
        </Button>
      </div>

      <Button
        onClick={() => handleRegistrar()}
        disabled={registrando || !codigo.trim()}
        className={`w-full py-4 bg-brand hover:bg-blue-700 text-white font-bold text-lg rounded-2xl shadow-md disabled:opacity-50`}
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
