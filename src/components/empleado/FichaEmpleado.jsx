"use client";

// Ficha del empleado en ventana flotante, desde cualquier pantalla del panel (pedido del 21/11/2026: «donde sea que vea
// al empleado, darle clic y que abra su ficha ahí mismo, y que me deje editar»). Reutiliza la MISMA ficha de Empleados
// (FormularioEmpleado): (23/11/2026) abre ya editable y «Guardar» guarda con las mismas reglas; con cambios sin guardar,
// cerrarla (botón, Esc o clic fuera) pregunta antes (components/cambios/CambiosPendientes.jsx).
// <NombreEmpleado> es un enlace real a /panel/empleados?id=…: clic normal = ventana aquí mismo; Ctrl/⌘+clic o clic con la
// rueda = otra pestaña. Al guardar se refrescan las listas abiertas (empleados, asistencias, nómina…).
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSWRConfig } from "swr";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { useConfirmarSalida } from "@/components/cambios/CambiosPendientes";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// La ficha es grande: se descarga solo la primera vez que alguien la abre (no pesa en el resto del panel).
const FormularioEmpleado = dynamic(() => import("@/app/panel/empleados/FormularioEmpleado"), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-gray-500">Cargando ficha…</p>,
});

const Contexto = createContext(null);
const REFRESCAR = /\/checador\/(empleados|asistencias|nomina|horas|incidencias|reportes|permisos|vacaciones)/;

export function FichaEmpleadoProvider({ children }) {
  const { mutate } = useSWRConfig();
  const { enqueueSnackbar } = useSnackbar();
  const [ficha, setFicha] = useState(null); // { values }
  const confirmarSalida = useConfirmarSalida();

  const abrirFicha = useCallback(async (idEmpleado) => {
    try {
      const { data } = await axios.get(`/checador/empleados/${idEmpleado}`);
      setFicha({ values: data });
    } catch (e) {
      enqueueSnackbar(e?.response?.status === 403 ? "No tienes permiso para ver a esta persona." : "No se pudo abrir la ficha del empleado.", { variant: "error" });
    }
  }, [enqueueSnackbar]);

  const valor = useMemo(() => ({ abrirFicha }), [abrirFicha]);
  const cerrar = () => setFicha(null);
  const nombre = ficha?.values ? [ficha.values.nombre, ficha.values.apellido_paterno, ficha.values.apellido_materno].filter(Boolean).join(" ") : "Empleado";

  return (
    <Contexto.Provider value={valor}>
      {children}
      <Dialog open={Boolean(ficha)} onOpenChange={(v) => { if (!v) confirmarSalida(cerrar); }}>
        <DialogContent className="block h-[100dvh] max-h-[100dvh] w-screen max-w-none overflow-y-auto overflow-x-hidden rounded-none bg-[#F9FAFB] p-0 sm:h-auto sm:max-h-[92vh] sm:w-[min(1180px,96vw)] sm:max-w-none sm:rounded-xl sm:p-5 sm:pt-11" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Ficha de {nombre}</DialogTitle>
          {ficha ? (
            <div className="min-w-0">
            <FormularioEmpleado
              key={`ficha-${ficha.values?.id_empleado}`}
              values={ficha.values}
              editar
              modoFormulario
              setModoFormulario={(v) => { if (!v) cerrar(); }}
              mutate={() => mutate((clave) => typeof clave === "string" && REFRESCAR.test(clave))}
              textoRegresar="Cerrar"
              enVentana
            />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Contexto.Provider>
  );
}

export const useFichaEmpleado = () => useContext(Contexto);

// Nombre que abre la ficha. Fuera del proveedor (p. ej. Mi espacio) se muestra como texto normal.
export function NombreEmpleado({ id, children, className = "" }) {
  const ctx = useContext(Contexto);
  if (!ctx || !id) return <span className={className}>{children}</span>;
  return (
    <a
      href={`/panel/empleados?id=${id}`}
      data-no-row-click
      className={`cursor-pointer rounded-sm hover:text-[#2c56e8] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2c56e8] ${className}`}
      title="Ver ficha del empleado"
      onClick={(e) => {
        e.stopPropagation();
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // otra pestaña, como cualquier enlace
        e.preventDefault();
        ctx.abrirFicha(id);
      }}
    >
      {children}
    </a>
  );
}
