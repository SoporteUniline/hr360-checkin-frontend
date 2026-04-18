"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import axiosInstance from "@/lib/axios";
import {
  Users,
  Building2,
  BriefcaseBusiness,
  FileText,
  Search,
  ArrowRight,
  Loader2,
} from "lucide-react";

const GROUPS = [
  {
    key: "empleados",
    label: "EMPLEADOS",
    icon: Users,
    route: (item) => `/panel/empleados?id=${item.id}`,
    hint: (item) => item.subtitulo || "",
  },
  {
    key: "departamentos",
    label: "DEPARTAMENTOS",
    icon: Building2,
    route: (item) => `/panel/catalogos/departamentos?id=${item.id}&nombre=${encodeURIComponent(item.titulo)}`,
    hint: () => "",
  },
  {
    key: "puestos",
    label: "PUESTOS",
    icon: BriefcaseBusiness,
    route: (item) => `/panel/catalogos/puestos?id=${item.id}&nombre=${encodeURIComponent(item.titulo)}`,
    hint: () => "",
  },
  {
    key: "contratos",
    label: "CONTRATOS",
    icon: FileText,
    route: (item) => `/panel/contratos?id=${item.id}`,
    hint: (item) => item.subtitulo || "",
  },
];

function hasResults(data) {
  return data && GROUPS.some((g) => (data[g.key] || []).length > 0);
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const router = useRouter();

  // Abrir/cerrar con Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const customHandler = () => setOpen(true);
    window.addEventListener("keydown", handler);
    window.addEventListener("open-command-palette", customHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("open-command-palette", customHandler);
    };
  }, []);

  // Reset al cerrar
  useEffect(() => {
    if (!open) {
      setQuery("");
      setData(null);
    }
  }, [open]);

  // Búsqueda con debounce
  const search = useCallback(async (q) => {
    if (q.length < 2) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: result } = await axiosInstance.get(
        `/checador/busqueda-global?q=${encodeURIComponent(q)}`,
      );
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = (val) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 220);
  };

  const handleSelect = (route) => {
    setOpen(false);
    router.push(route);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-[600px] mx-4 animate-in fade-in slide-in-from-top-4 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
          shouldFilter={false}
          onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        >
          {/* Input */}
          <div className="flex items-center gap-2 px-4 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={handleQueryChange}
              placeholder="Buscar empleados, contratos, departamentos..."
              className="flex-1 py-3.5 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            />
            {loading && (
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />
            )}
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-muted-foreground">
              esc
            </kbd>
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            {/* Estado vacío: menos de 2 chars */}
            {query.length < 2 && (
              <div className="py-10 text-center text-xs text-muted-foreground">
                Escribe al menos 2 caracteres para buscar
              </div>
            )}

            {/* Sin resultados */}
            {query.length >= 2 && !loading && data && !hasResults(data) && (
              <Command.Empty className="py-10 text-center text-xs text-muted-foreground">
                Sin resultados para &laquo;{query}&raquo;
              </Command.Empty>
            )}

            {/* Grupos de resultados */}
            {query.length >= 2 &&
              !loading &&
              data &&
              GROUPS.map((group) => {
                const items = data[group.key] || [];
                if (items.length === 0) return null;
                const Icon = group.icon;
                return (
                  <Command.Group
                    key={group.key}
                    heading={
                      <span className="px-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                        {group.label}
                      </span>
                    }
                    className="mb-1"
                  >
                    {items.map((item) => (
                      <Command.Item
                        key={`${group.key}-${item.id}`}
                        value={`${group.key}-${item.id}`}
                        onSelect={() => handleSelect(group.route(item))}
                        className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer text-foreground
                                   data-[selected=true]:bg-blue-100 data-[selected=true]:text-blue-900
                                   hover:bg-accent/10 transition-colors"
                      >
                        {/* Ícono */}
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>

                        {/* Texto */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">
                            {item.titulo}
                          </p>
                          {item.subtitulo && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {item.subtitulo}
                            </p>
                          )}
                        </div>

                        {/* Hint */}
                        {group.hint(item) && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {group.hint(item)}
                          </span>
                        )}

                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      </Command.Item>
                    ))}
                  </Command.Group>
                );
              })}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center gap-4 px-4 py-2 border-t border-border bg-muted/30">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">↑↓</kbd>
              navegar
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">↵</kbd>
              abrir
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">esc</kbd>
              cerrar
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}
