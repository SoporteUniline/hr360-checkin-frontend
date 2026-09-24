import { Input } from "@/components/ui/input";
import styles from "./empresas.module.css";

export default function Filters({ filter, setFilter }) {
  return (
    <div className={styles.filters}>
      <label className={styles.search}>
        Buscar empresa o dueño
        <Input
          value={filter.search}
          placeholder="Nombre de empresa o dueño…"
          onChange={(event) =>
            setFilter((current) => ({ ...current, search: event.target.value }))
          }
        />
      </label>
      <label>
        Estado de acceso
        <select
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
      <p className={styles.scope}>Filtros sobre las empresas de esta página</p>
    </div>
  );
}
