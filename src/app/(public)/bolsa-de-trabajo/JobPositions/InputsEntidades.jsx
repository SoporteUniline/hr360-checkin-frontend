"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, swr_config } from "@/lib/fetcher";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function InputEntidades({ filterValues, setFilterValues }) {
  const { data, error, isLoading } = useSWR(
    "/vacantes/entidades",
    fetcher,
    swr_config
  );

  const paises = data?.paises || [];
  const entidades = data?.entidades || [];
  const ciudades = data?.ciudades || [];

  const [openPais, setOpenPais] = useState(false);
  const [openEntidad, setOpenEntidad] = useState(false);
  const [openCiudad, setOpenCiudad] = useState(false);

  if (isLoading) {
    return (
      <div className="flex gap-1 w-full max-w-md">
        <Skeleton className="w-50 h-10" />
        <Skeleton className="w-50 h-10" />
      </div>
    );
  }
  if (error) return null;

  return (
    <div className="flex gap-1 w-full max-w-md">
      {/* ENTIDADES */}
      <div className="flex items-center gap-1">
        <Popover open={openEntidad} onOpenChange={setOpenEntidad}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="justify-between"
            >
              {filterValues?.entidad || "Selecciona una entidad"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder="Buscar entidad..." />
              <CommandEmpty>No se encontraron entidades</CommandEmpty>
              <CommandGroup>
                {entidades.map((entidad) => (
                  <CommandItem
                    key={entidad}
                    onSelect={() => {
                      setOpenEntidad(false);
                      setFilterValues((st) => ({
                        ...st,
                        entidad,
                        page: 1,
                      }));
                    }}
                  >
                    {entidad}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
        {filterValues?.entidad && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setFilterValues((st) => ({
                ...st,
                entidad: "",
                page: 1,
              }));
            }}
            title="Limpiar entidad"
            startIcon={<X className="w-4 h-4" />}
          />
        )}
      </div>

      <div className="flex items-center gap-1">
        {/* CIUDADES */}
        <Popover open={openCiudad} onOpenChange={setOpenCiudad}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="justify-between"
            >
              {filterValues?.ciudad || "Selecciona una ciudad"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder="Buscar ciudad..." />
              <CommandEmpty>No se encontraron ciudades</CommandEmpty>
              <CommandGroup>
                {ciudades.map((ciudad) => (
                  <CommandItem
                    key={ciudad}
                    onSelect={() => {
                      setFilterValues((st) => ({
                        ...st,
                        ciudad,
                        page: 1,
                      }));
                      setOpenCiudad(false);
                    }}
                  >
                    {ciudad}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
        {filterValues?.ciudad && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setFilterValues((st) => ({
                ...st,
                ciudad: "",
                page: 1,
              }));
            }}
            title="Limpiar ciudad"
            startIcon={<X className="w-4 h-4" />}
          />
        )}
      </div>
      <div className="flex items-center gap-1">
        {/* PAISES */}
        <Popover open={openPais} onOpenChange={setOpenPais}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="justify-between"
            >
              {filterValues?.pais || "Selecciona un país"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder="Buscar país..." />
              <CommandEmpty>No se encontraron países</CommandEmpty>
              <CommandGroup>
                {paises.map((pais) => (
                  <CommandItem
                    key={pais}
                    onSelect={() => {
                      setFilterValues((st) => ({
                        ...st,
                        pais,
                        page: 1,
                      }));
                      setOpenPais(false);
                    }}
                  >
                    {pais}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
        {filterValues?.pais && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setFilterValues((st) => ({
                ...st,
                pais: "",
                page: 1,
              }));
            }}
            title="Limpiar país"
            startIcon={<X className="w-4 h-4" />}
          />
        )}
      </div>
    </div>
  );
}
