"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";

function getChipLabel(values) {
  if (values.length <= 2) return values.join(", ");
  return `${values.slice(0, 2).join(", ")} +${values.length - 2}`;
}

export default function ActiveFilterChips({ groups = [], onClearAll }) {
  const activeGroups = groups.filter((group) => group.values.length > 0);

  if (activeGroups.length === 0) return null;

  return (
    <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/70 flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] font-semibold text-gray-500 uppercase">
        Filtros:
      </span>

      {activeGroups.map((group) => (
        <Popover key={group.category}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center rounded-full bg-white border border-gray-200 gap-1 pl-2 pr-1 py-0.5 text-xs max-w-[220px] hover:bg-gray-100"
            >
              <span className="text-gray-500 font-medium shrink-0">
                {group.category}:
              </span>
              <span className="truncate">{getChipLabel(group.values)}</span>
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  group.onChange([]);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    group.onChange([]);
                  }
                }}
                className="rounded-full p-0.5 hover:bg-gray-200 shrink-0"
              >
                <X className="h-3 w-3" />
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <div className="max-h-56 overflow-auto p-1">
              {group.options.map((option) => {
                const checked = group.values.includes(option);

                return (
                  <div
                    role="button"
                    tabIndex={0}
                    key={option}
                    onClick={() =>
                      group.onChange(
                        checked
                          ? group.values.filter((item) => item !== option)
                          : [...group.values, option],
                      )
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        group.onChange(
                          checked
                            ? group.values.filter((item) => item !== option)
                            : [...group.values, option],
                        );
                      }
                    }}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-xs hover:bg-gray-100 rounded text-left cursor-pointer"
                  >
                    <Checkbox checked={checked} />
                    <span>{option}</span>
                  </div>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="text-[11px] text-red-500 font-medium ml-1"
      >
        Limpiar todos
      </button>
    </div>
  );
}
