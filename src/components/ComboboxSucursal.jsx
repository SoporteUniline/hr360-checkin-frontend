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

export function ComboboxSucursal({ value, onChange, disabled }) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [options, setOptions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const { dataUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const fetchSucursales = async (query) => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/sucursales`,
        {
          params: {
            id_empresa: dataUser?.id_empresa,
            search: query,
          },
        }
      );
      setOptions(res.data.sucursales || []);
    } catch (err) {
      console.error("Error al cargar sucursales", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchSucursales(search);
  }, [search, open]);

  const handleCreate = async () => {
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/sucursales`,
        {
          nombre: search,
          id_empresa: dataUser?.id_empresa,
        }
      );
      const nueva = res.data;
      enqueueSnackbar("Sucursal creada correctamente", { variant: "success" });
      await fetchSucursales(""); // refresca la lista para que aparezca la nueva sucursal
      onChange(nueva.nombre);
      setSearch("");
      setOpen(false);
    } catch (error) {
      // Aquí detectamos si el error es porque la sucursal ya existe
      if (error.response?.status === 409) {
        enqueueSnackbar("La sucursal ya existe, por favor selecciona otra.", {
          variant: "warning",
        });
      } else {
        enqueueSnackbar("Error al crear sucursal", { variant: "error" });
        console.error(error);
      }
    }
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
          {value || "Selecciona o crea una sucursal..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar sucursal..."
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
              {options.map((sucursal) => (
                <CommandItem
                  key={sucursal.id_sucursal}
                  value={sucursal.nombre}
                  onSelect={(val) => {
                    onChange(val);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  {sucursal.nombre}
                  <Check
                    className={cn(
                      "ml-auto",
                      value === sucursal.nombre ? "opacity-100" : "opacity-0"
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
