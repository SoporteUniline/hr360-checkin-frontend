"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

export function Combobox({
  options = [],
  value,
  onChange,
  placeholder = "Seleccionar...",
  emptyText = "No se encontraron resultados",
  name,
  disabled = false,
  multiple = false,
}) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");

  // Filtrar opciones basado en búsqueda
  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchValue.toLowerCase()),
    );
  }, [options, searchValue]);

  const selectedOptions = multiple
    ? options.filter((option) => (value || []).includes(option.value))
    : options.find((option) => option.value === value);

  return (
    <Popover
      open={disabled ? false : open}
      onOpenChange={setOpen}
      modal={false}
    >
      <PopoverTrigger asChild>
        <Button
          id={name}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          <span className="truncate">
            {multiple
              ? selectedOptions.length > 0
                ? selectedOptions.map((option) => option.label).join(", ")
                : placeholder
              : selectedOptions
              ? selectedOptions.label
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-full p-0 z-99999"
        onOpenAutoFocus={(e) => e.preventDefault()} // Evita que robe el foco bruscamente
        onCloseAutoFocus={(e) => e.preventDefault()}
        style={{ pointerEvents: "auto" }} // <--- ESTO es la clave
        onPointerDownOutside={(e) => {
          if (
            e.target instanceof Element &&
            e.target.closest("[data-radix-combobox-input]")
          ) {
            e.preventDefault();
          }
        }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={searchValue}
            onValueChange={setSearchValue}
            disabled={disabled}
            autoFocus={false}
            data-radix-combobox-input=""
          />
          <CommandList className="max-h-72 overflow-y-auto">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  disabled={disabled}
                  onSelect={() => {
                    if (disabled) return;
                    if (multiple) {
                      const currentValue = value || [];
                      const exists = currentValue.includes(option.value);

                      onChange(
                        exists
                          ? currentValue.filter((item) => item !== option.value)
                          : [...currentValue, option.value],
                      );

                      setSearchValue("");
                      return;
                    }

                    onChange(option.value === value ? "" : option.value);
                    setOpen(false);
                    setSearchValue("");
                  }}
                  className={cn(
                    "cursor-pointer",
                    disabled && "pointer-events-none opacity-50",
                  )}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      multiple
                        ? (value || []).includes(option.value)
                          ? "opacity-100"
                          : "opacity-0"
                        : value === option.value
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
