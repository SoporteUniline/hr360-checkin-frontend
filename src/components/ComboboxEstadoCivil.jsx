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
            search: query,
          },
        }
      );
      setOptions(res.data || []);
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {value || "Selecciona o crea un estado civil..."}
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
                  }}
                >
                  {estado.nombre}
                  <Check
                    className={cn(
                      "ml-auto",
                      value === estado.nombre ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
              {options.length === 0 && (
                <CommandEmpty>No hay resultados.</CommandEmpty>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
