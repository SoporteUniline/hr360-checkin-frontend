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

export function ComboboxDepartamento({ value, onChange, disabled }) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [options, setOptions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const { dataUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const fetchDepartamentos = async (query) => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/departamentos`,
        {
          params: {
            id_empresa: dataUser?.id_empresa,
            search: query,
          },
        }
      );
      setOptions(res.data || []);
    } catch (err) {
      console.error("Error al cargar departamentos", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchDepartamentos(search);
  }, [search, open]);

  const handleCreate = async () => {
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/departamentos`,
        {
          nombre: search,
          id_empresa: dataUser?.id_empresa,
        }
      );
      const nuevo = res.data;
      enqueueSnackbar("Departamento creado correctamente", {
        variant: "success",
      });
      await fetchDepartamentos(""); // refresca la lista para que aparezca el nuevo
      onChange(nuevo.nombre);
      setOpen(false);
    } catch (error) {
      if (error.response?.status === 409) {
        enqueueSnackbar(
          "El departamento ya existe, por favor selecciona otro.",
          { variant: "warning" }
        );
      } else {
        enqueueSnackbar("Error al crear departamento", { variant: "error" });
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
          {value || "Selecciona o crea un departamento..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar departamento..."
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
              {options.map((departamento) => (
                <CommandItem
                  key={departamento.id_departamento}
                  value={departamento.nombre}
                  onSelect={(val) => {
                    onChange(val);
                    setOpen(false);
                  }}
                >
                  {departamento.nombre}
                  <Check
                    className={cn(
                      "ml-auto",
                      value === departamento.nombre
                        ? "opacity-100"
                        : "opacity-0"
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
