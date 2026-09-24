import { useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import styles from "./empresas.module.css";

export default function Filters({ filter, setFilter, order, setOrder }) {
  const input = useRef(null);
  const clearSearch = () => {
    setFilter((current) => ({ ...current, search: "" }));
    input.current?.focus();
  };
  return (
    <div className={styles.filters}>
      <div className={styles.search}>
        <label htmlFor="company-search">Buscar en todas las empresas</label>
        <div className={styles.searchField}>
          <Search size={17} aria-hidden="true" />
          <Input
            ref={input}
            id="company-search"
            type="search"
            value={filter.search}
            autoComplete="off"
            placeholder="Empresa, dueño, correo o teléfono…"
            aria-describedby="company-search-help"
            onKeyDown={(event) => {
              if (event.key === "Escape") clearSearch();
            }}
            onChange={(event) =>
              setFilter((current) => ({
                ...current,
                search: event.target.value,
              }))
            }
          />
          {filter.search && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Borrar búsqueda"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      <label>
        Estado de acceso
        <select
          aria-label="Estado de acceso"
          value={filter.status}
          onChange={(event) =>
            setFilter((current) => ({ ...current, status: event.target.value }))
          }
        >
          {[
            "Todos",
            "Activo",
            "Inactivo",
            "Suspendido",
            "Nuevo",
            "Rechazado",
          ].map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </label>
      <label>
        Ordenar por
        <select
          aria-label="Ordenar por"
          value={order}
          onChange={(event) => setOrder(event.target.value)}
        >
          <option value="asc">Nombre: A–Z</option>
          <option value="desc">Nombre: Z–A</option>
        </select>
      </label>
      <p id="company-search-help" className={styles.scope}>
        Busca en todo el directorio, sin importar acentos o mayúsculas.
      </p>
    </div>
  );
}
