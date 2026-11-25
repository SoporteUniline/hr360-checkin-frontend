import { User, Eraser, QrCode, Trash2 } from "lucide-react";
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
  // "kiosco": reloj de la empresa a pantalla completa. Teclado y QR también en celular, compacto y sin desplazar.
  variante = "normal",
  // (26/11/2026) Botón junto al código y el QR (p. ej. «Voy a comer»).
  extra = null,
}) {
  const kiosco = variante === "kiosco";
  const tecla = kiosco
    ? "h-full min-h-12 kiosco-grande:min-h-14 py-0 text-2xl font-bold rounded-2xl"
    : "py-6 text-2xl font-bold rounded-2xl";
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
      setCodigo((prev) => prev + e.key);
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
    <div className={kiosco ? "flex min-h-0 flex-1 flex-col justify-center gap-2 kiosco-grande:gap-3" : "space-y-4"}>
      <div className={`flex w-full items-stretch ${kiosco ? "h-12 shrink-0 gap-2 kiosco-grande:h-14 kiosco-grande:gap-3" : "gap-3"}`}>
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
          className={`${kiosco ? "flex h-full px-3" : "hidden md:flex h-auto px-5"} flex-col items-center justify-center aspect-square border-2 border-slate-200 rounded-2xl bg-white hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-95 group shadow-sm`}
          title="Escanear Código QR"
        >
          <QrCode className="size-7 text-slate-600 group-hover:text-slate-900 transition-colors" />
          <span className="text-[10px] font-black text-slate-500 group-hover:text-slate-900 uppercase tracking-tighter">
            QR
          </span>
        </Button>
      </div>

      <div className={kiosco
        ? "grid min-h-0 flex-1 grid-cols-3 grid-rows-[repeat(4,minmax(3rem,1fr))] gap-2 kiosco-grande:grid-rows-[repeat(4,minmax(3.5rem,1fr))] kiosco-grande:gap-3 kiosco-horizontal:max-h-[30rem]"
        : "hidden md:grid grid-cols-3 gap-3"}>
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
          className={`${kiosco ? "h-full min-h-12 kiosco-grande:min-h-14 py-0" : "py-6"} text-md font-bold rounded-2xl border-slate-300 text-slate-700 hover:bg-slate-100 flex justify-center items-center space-x-2`}
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
          className={`${tecla} bg-red-600 text-white hover:bg-red-700 shadow-sm flex justify-center items-center`}
          aria-label="Borrar último dígito"
        >
          <Trash2 className="size-6" aria-hidden="true" />
        </Button>
      </div>

      <Button
        onClick={() => handleRegistrar()}
        disabled={registrando || !codigo.trim()}
        className={`w-full ${kiosco ? "h-12 shrink-0 kiosco-grande:h-14" : "py-4"} bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-2xl shadow-md disabled:opacity-50`}
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
