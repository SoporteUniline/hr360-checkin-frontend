"use client";

import * as React from "react";
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useSnackbar } from "notistack";

export function ComboboxEstadoCivil({ value, onChange, disabled }) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [options, setOptions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const { dataUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const fetchEstadosCiviles = async (query) => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/estados-civiles`,
        {
          params: {
            id_empresa: dataUser?.id_empresa,
            nombre: query,
          },
        }
      );
      setOptions(res.data.estados_civiles || []);
    } catch (err) {
      console.error("Error al cargar estados civiles", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchEstadosCiviles(search);
  }, [search, open]);

  const handleCreate = async () => {
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/estados-civiles`,
        {
          nombre: search,
          id_empresa: dataUser?.id_empresa,
        }
      );
      const nuevo = res.data;
      enqueueSnackbar("Estado civil creado correctamente", {
        variant: "success",
      });
      await fetchEstadosCiviles("");
      onChange(nuevo.nombre);
      setSearch("");
      setOpen(false);
    } catch (error) {
      if (error.response?.status === 409) {
        enqueueSnackbar(
          "El estado civil ya existe, por favor selecciona otro.",
          {
            variant: "warning",
          }
        );
      } else {
        enqueueSnackbar("Error al crear estado civil", { variant: "error" });
        console.error(error);
      }
    }
  };

  // Función para limpiar la selección
  const handleClearSelection = () => {
    onChange(""); // Cambia a string vacío
    setOpen(false);
    setSearch("");
  };

  // Determinar el texto del botón
  const getDisplayText = () => {
    if (value === "" || value === "sin-seleccion") {
      return "Selecciona o crea un estado civil...";
    }
    return value;
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setSearch("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {getDisplayText()}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar estado civil..."
            className="h-9"
            onValueChange={setSearch}
            disabled={disabled}
          />
          <CommandList>
            <CommandGroup>
              {/* Opción para limpiar selección */}
              {value && value !== "" && value !== "sin-seleccion" && (
                <CommandItem
                  onSelect={handleClearSelection}
                  className="text-gray-600 hover:bg-gray-100"
                >
                  <div className="w-4 h-4 mr-2 border border-gray-400 rounded flex items-center justify-center">
                    ×
                  </div>
                  Limpiar selección
                </CommandItem>
              )}

              {search && (
                <CommandItem
                  onSelect={handleCreate}
                  className="text-blue-600 hover:bg-blue-100"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Crear “{search}”
                </CommandItem>
              )}

              {options.map((estado) => (
                <CommandItem
                  key={estado.id_estado_civil}
                  value={estado.nombre}
                  onSelect={(val) => {
                    onChange(val);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  {estado.nombre}
                  <Check
                    className={cn(
                      "ml-auto",
                      value === estado.nombre ||
                        (value === "sin-seleccion" && estado.nombre === "")
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}

              {options.length === 0 && !search && (
                <CommandEmpty>No hay estados civiles registrados.</CommandEmpty>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
