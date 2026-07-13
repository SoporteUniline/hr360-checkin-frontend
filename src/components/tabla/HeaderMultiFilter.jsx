"use client";

import { useMemo, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, Search, X } from "lucide-react";

export default function HeaderMultiFilter({
  selected = [],
  onChange,
  options = [],
  placeholder,
}) {
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();
    if (!normalizedSearch) return options;
    return options.filter((option) =>
      option.toLowerCase().includes(normalizedSearch),
    );
  }, [options, search]);

  const toggleOption = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
      return;
    }

    onChange([...selected, value]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 text-xs font-semibold uppercase">
          <span>{placeholder}</span>
          {selected.length > 0 && (
            <span className="bg-[#2563EB] text-white text-[9px] rounded-full px-1">
              {selected.length}
            </span>
          )}
          <ChevronDown className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="p-2 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar..."
              className="h-8 text-xs pl-7 pr-2 w-full border border-gray-200 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2563EB]"
            />
          </div>
        </div>

        <div className="max-h-56 overflow-auto p-1">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs text-gray-500 px-2 py-1.5 w-full text-left hover:bg-gray-100 rounded"
            >
              <X className="h-3 w-3 inline mr-1" />
              Limpiar filtro
            </button>
          )}

          {filteredOptions.map((option) => (
            <div
              role="button"
              tabIndex={0}
              key={option}
              onClick={() => toggleOption(option)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggleOption(option);
                }
              }}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs hover:bg-gray-100 rounded text-left cursor-pointer"
            >
              <Checkbox checked={selected.includes(option)} />
              <span>{option}</span>
            </div>
          ))}

          {filteredOptions.length === 0 && (
            <div className="px-2 py-2 text-xs text-gray-500">
              Sin resultados para tu búsqueda.
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
