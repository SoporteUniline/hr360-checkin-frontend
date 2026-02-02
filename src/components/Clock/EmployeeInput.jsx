import { User, Trash2, QrCode, ScanFace, Eraser } from "lucide-react";
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
      <div className="relative">
        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
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
          className="w-full pl-12 pr-4 py-4 text-center text-lg font-bold border-2 border-gray-200 rounded-2xl focus:border-[#2563EB] bg-white"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <Button
            key={num}
            onClick={() => handleDigit(num.toString())}
            className="py-6 text-2xl font-bold rounded-2xl text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm"
          >
            {num}
          </Button>
        ))}

        <Button
          onClick={handleClear}
          variant="outline"
          className="py-6 text-md font-bold rounded-2xl border-gray-300 text-gray-700 hover:bg-gray-100 flex justify-center items-center space-x-2"
        >
          <Eraser className="w-5 h-5 mr-2" />
          <span>Limpiar</span>
        </Button>

        <Button
          onClick={() => handleDigit("0")}
          className="py-6 text-2xl font-bold rounded-2xl text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm"
        >
          0
        </Button>

        <Button
          onClick={handleDelete}
          className="py-6 text-2xl font-bold rounded-2xl bg-red-600 text-white hover:bg-red-700 shadow-sm flex justify-center items-center"
        >
          <Trash2 className="w-6 h-6" />
        </Button>
      </div>

      <Button
        onClick={() => handleRegistrar()}
        disabled={registrando || !codigo.trim()}
        className="w-full py-4 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-lg rounded-2xl shadow-md disabled:opacity-50"
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
      <Button
        onClick={handleOpenQR}
        variant="outline"
        className="w-full py-4 border-gray-300 text-gray-700 hover:bg-gray-100 rounded-2xl font-bold"
      >
        <QrCode className="w-5 h-5 mr-2" />
        Escanear QR
      </Button>
    </div>
  );
}
