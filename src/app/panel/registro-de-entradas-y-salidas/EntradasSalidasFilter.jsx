import axios from "@/lib/axios";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/Combobox";
import { useAuth } from "@/context/AuthContext";
import { useSnackbar } from "notistack";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";
import dayjs from "dayjs";
import useEmpleadosData from "@/hooks/useEmpleadosData";
import { useEffect, useMemo, useState } from "react";

export default function EntradasSalidasFilter({
  empresaActiva,
  setEmpresaActiva,
  empresas = [],
  filtroEmpleado,
  setFiltroEmpleado,
  fecha,
  setFecha,
  // Nuevo: rango de fechas (desde/hasta) para el panel de entradas y salidas.
  // Se relaciona con:
  // - `page.jsx` (estado desde/hasta)
  // - `useRelojChecador.js` (query params desde/hasta)
  desde,
  setDesde,
  hasta,
  setHasta,
  departamento,
  setDepartamento,
  estado,
  setEstado,
  setPage,
}) {
  console.log(empresaActiva);
  const [departamentos, setDepartamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const { dataUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  // =========================
  // Buscador de empleados con sugerencias (igual estilo/UX que módulo Permisos)
  // - Relación: `src/app/panel/permisos/page.jsx` (Input + dropdown de sugerencias)
  // - En este panel el texto seleccionado alimenta `nombre` (LIKE) en el backend.
  // =========================
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [hoveredSuggestionIndex, setHoveredSuggestionIndex] = useState(-1);

  // Sugerencias: consultamos catálogo de empleados con el mismo hook que Permisos.
  // Nota: pedimos pocas filas para UI (8) y lo filtramos por el texto tecleado.
  const empleadosSugResp = useEmpleadosData(
    empresaActiva,
    1,
    8,
    filtroEmpleado,
    "",
    "",
    "",
  );
  const sugerencias = useMemo(() => {
    const list = empleadosSugResp?.data?.data || [];
    return list.map((e) => ({
      id_empleado: e.id_empleado,
      nombre_completo: [e.nombre, e.apellido_paterno, e.apellido_materno]
        .filter(Boolean)
        .join(" "),
    }));
  }, [empleadosSugResp?.data]);

  const handleSelectEmpleado = (emp) => {
    if (!emp) return;
    setFiltroEmpleado(emp.nombre_completo || "");
    setIsSuggestionsOpen(false);
    setHoveredSuggestionIndex(-1);
    setPage(1);
  };

  const fetchDepartamentos = async () => {
    if (!empresaActiva || empresaActiva === "all") {
      setDepartamentos([]);
      return;
    }

    try {
      setLoading(true);
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/departamentos`,
        {
          params: { id_empresa: empresaActiva },
        },
      );

      setDepartamentos([
        { value: "", label: "Todos los departamentos" },
        ...(res.data.departamentos || []).map((d) => ({
          value: d.nombre,
          label: d.nombre,
        })),
      ]);
    } catch (error) {
      console.error("❌ Error al cargar departamentos:", error);
      enqueueSnackbar("Error al cargar departamentos", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setDepartamento("");
    setPage(1);
    fetchDepartamentos();
  }, [empresaActiva]);

  const estadoOptions = [
    { value: "", label: "Todos los estados" },
    { value: "Abierto", label: "Abierto" },
    { value: "Cerrado", label: "Cerrado" },
  ];

  /**
   * DatePicker reutilizable para filtros (Desde / Hasta)
   * - Relación:
   *   - `page.jsx` guarda el estado `desde/hasta`
   *   - `useRelojChecador.js` manda `&desde=&hasta=` al backend
   */
  const DatePickerFilter = ({ id, label, value, onChange, minISO, maxISO }) => {
    const [open, setOpen] = useState(false);
    // Controlar el mes visible del calendario:
    // - UX: cuando ya hay una fecha seleccionada, al abrir debe mostrar ese mes (no el mes actual).
    // - Se resetea al abrir el popover para reflejar el valor vigente.
    const [calendarMonth, setCalendarMonth] = useState(new Date());

    const selectedDate = value ? dayjs(value).toDate() : undefined;
    const minDate = minISO ? dayjs(minISO).toDate() : null;
    const maxDate = maxISO ? dayjs(maxISO).toDate() : null;

    useEffect(() => {
      if (!open) return;
      // Al abrir, “anclar” el calendario al mes de la fecha seleccionada (si existe).
      // Nota: `selected` NO controla el mes en react-day-picker v9, por eso esto es necesario.
      setCalendarMonth(selectedDate || new Date());
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor={id}>{label}</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              type="button"
              variant="outline"
              className="w-full justify-start text-left font-normal h-9"
            >
              <CalendarDays className="mr-2 h-4 w-4 opacity-70" />
              {value
                ? dayjs(value).format("DD/MM/YYYY")
                : "Selecciona una fecha"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              onSelect={(date) => {
                // Si se limpia, guardamos string vacío para mantener consistencia en query params.
                if (!date) {
                  onChange?.("");
                  setPage(1);
                  setOpen(false);
                  return;
                }

                // Guardamos en formato ISO (YYYY-MM-DD) que el backend espera.
                const iso = dayjs(date).format("YYYY-MM-DD");
                onChange?.(iso);
                setPage(1);
                setOpen(false);
              }}
              // Limitar selección para evitar rangos inválidos (desde > hasta, etc.)
              disabled={(date) => {
                if (!date) return false;
                if (minDate && date < minDate) return true;
                if (maxDate && date > maxDate) return true;
                return false;
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
      {/* Layout:
          - 5 filtros (Buscar, Desde, Hasta, Departamento, Estado)
          - En XL los alineamos en 5 columnas para que no “baje” visualmente el bloque de fechas */}
      <div className="flex flex-col gap-2">
        <Label>Empresa</Label>
        <Combobox
          options={[
            { value: "all", label: "Todas las empresas" },
            ...empresas.map((e) => ({
              value: String(e.id_empresa),
              label: e.nombre,
            })),
          ]}
          value={empresaActiva}
          onChange={(val) => {
            setEmpresaActiva(val);
            setPage(1);
          }}
          placeholder="Empresa"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="buscarEmpleado">Empleado</Label>
        <div className="relative">
          <Input
            id="buscarEmpleado"
            placeholder="Nombre del empleado"
            value={filtroEmpleado}
            onChange={(e) => {
              setFiltroEmpleado(e.target.value);
              setIsSuggestionsOpen(true);
              setHoveredSuggestionIndex(0);
              setPage(1);
            }}
            onFocus={() => {
              setIsSuggestionsOpen(Boolean(filtroEmpleado));
              if (hoveredSuggestionIndex < 0) setHoveredSuggestionIndex(0);
            }}
            onBlur={() => {
              // Importante: delay para permitir click en sugerencia (onMouseDown)
              setTimeout(() => {
                setIsSuggestionsOpen(false);
                setHoveredSuggestionIndex(-1);
              }, 120);
            }}
            onKeyDown={(e) => {
              if (!isSuggestionsOpen || sugerencias.length === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHoveredSuggestionIndex((prev) =>
                  prev + 1 >= sugerencias.length ? 0 : prev + 1,
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHoveredSuggestionIndex((prev) =>
                  prev - 1 < 0 ? sugerencias.length - 1 : prev - 1,
                );
              } else if (e.key === "Enter") {
                e.preventDefault();
                handleSelectEmpleado(
                  sugerencias[hoveredSuggestionIndex] || sugerencias[0],
                );
              } else if (e.key === "Escape") {
                setIsSuggestionsOpen(false);
              }
            }}
          />

          {isSuggestionsOpen && sugerencias.length > 0 ? (
            <div className="absolute left-0 right-0 mt-1 z-30 rounded-md border bg-background shadow">
              <ul className="max-h-64 overflow-auto">
                {sugerencias.map((emp, idx) => (
                  <li
                    key={emp.id_empleado}
                    onMouseDown={() => handleSelectEmpleado(emp)}
                    onMouseEnter={() => setHoveredSuggestionIndex(idx)}
                    className={`px-3 py-2 cursor-pointer text-sm ${
                      idx === hoveredSuggestionIndex ? "bg-accent" : ""
                    }`}
                  >
                    {emp.nombre_completo}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <DatePickerFilter
        id="desde"
        label="Desde"
        value={desde ?? ""}
        onChange={(val) => {
          setDesde?.(val);
          // Mantener `fecha` por compatibilidad, aunque la tabla ya no depende de esto.
          if (setFecha && val && hasta && val === hasta) setFecha(val);
          if (setFecha && val && hasta && val !== hasta) setFecha("");
        }}
        maxISO={hasta || null}
      />

      <DatePickerFilter
        id="hasta"
        label="Hasta"
        value={hasta ?? ""}
        onChange={(val) => {
          setHasta?.(val);
          if (setFecha && desde && val && desde === val) setFecha(val);
          if (setFecha && desde && val && desde !== val) setFecha("");
        }}
        minISO={desde || null}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="departamento">Departamento</Label>
        <Combobox
          options={departamentos}
          value={departamento}
          onChange={(val) => {
            setDepartamento(val);
            setPage(1);
          }}
          placeholder={
            !empresaActiva || empresaActiva === "all"
              ? "Selecciona una empresa primero"
              : "Todos los departamentos"
          }
          emptyText={
            !empresaActiva || empresaActiva === "all"
              ? "Selecciona una empresa"
              : "No hay departamentos"
          }
          disabled={!empresaActiva || empresaActiva === "all"}
          name="departamento"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="estado">Estado</Label>
        <Combobox
          options={estadoOptions}
          value={estado}
          onChange={(val) => {
            setEstado(val);
            setPage(1);
          }}
          placeholder="Todos los estados"
          emptyText="No hay estados"
          name="estado"
        />
      </div>
    </div>
  );
}
