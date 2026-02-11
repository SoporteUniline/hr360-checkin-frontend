"use client";

import * as React from "react";
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react";
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

export function CreatableCombobox({
  value,
  onChange,
  disabled,

  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",

  fetchOptions,
  createOption,

  getOptionLabel,
  getOptionValue,

  compareBy = "value",
  onCreated,
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [options, setOptions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const data = await fetchOptions(search);
      setOptions(data || []);
      setLoading(false);
    })();
  }, [search, open]);

  const handleCreate = async () => {
    const created = await createOption(search);
    if (created) {
      onCreated(created);
      setSearch("");
      setOpen(false);
    }
  };

  const selected = options.find((o) =>
    compareBy === "label"
      ? getOptionLabel(o) === value
      : getOptionValue(o) === value
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between"
          disabled={disabled}
        >
          {value ? value : placeholder}
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-full p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />

          <CommandList>
            <CommandGroup>
              {search && (
                <CommandItem onSelect={handleCreate} className="text-blue-600">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Crear “{search}”
                </CommandItem>
              )}

              {options.map((item) => (
                <CommandItem
                  key={getOptionValue(item)}
                  onSelect={() => {
                    onChange(getOptionValue(item));
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  {getOptionLabel(item)}
                  <Check
                    className={cn(
                      "ml-auto",
                      compareBy === "label"
                        ? value === getOptionLabel(item)
                          ? "opacity-100"
                          : "opacity-0"
                        : value === getOptionValue(item)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}

              {!loading && options.length === 0 && (
                <CommandEmpty>No hay resultados</CommandEmpty>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
