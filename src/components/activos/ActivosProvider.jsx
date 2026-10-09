"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { moduleState, resourceHref } from "@/lib/activos/module.mjs";
import { useSnackbar } from "notistack";
import { companiesFor } from "@/lib/activos/model.mjs";
import { createApiRepository } from "@/lib/activos/apiRepository";
import { Button } from "@/components/ui/button";
import { RotateCcw, Package } from "lucide-react";
const Context = createContext(null);
export const useActivos = () => useContext(Context);

export function ActivosProvider({
  children,
  fixedCompany,
  compact = false,
  self = false,
}) {
  const { dataUser, isAuthChecked } = useAuth();
  const search = useSearchParams();
  const pathname = usePathname();
  const resourceType =
    compact || self
      ? null
      : pathname.startsWith("/panel/control-uniformes") ||
        pathname.startsWith("/panel/control-activos/uniformes")
      ? "uniform"
      : "asset";
  const router = useRouter();
  const companies = companiesFor(dataUser);
  const [selected, setSelected] = useState("");
  const requested = fixedCompany || search.get("empresa") || selected;
  const company =
    companies.find((c) => c.id === String(requested)) ||
    (!fixedCompany ? companies[0] : null);
  const userId = dataUser?.id_usuario || dataUser?.id;
  const queryCompany = search.get("empresa");
  useEffect(() => {
    if (
      queryCompany &&
      companiesFor(dataUser).some((c) => c.id === queryCompany)
    ) {
      setSelected(queryCompany);
    }
  }, [queryCompany, dataUser]);
  if (!isAuthChecked)
    return <p className="p-6 text-slate-500">Cargando sesión…</p>;
  if (!userId || !company)
    return (
      <p className="rounded-lg border bg-white p-5 text-slate-500">
        Selecciona una empresa válida para consultar sus activos y uniformes.
      </p>
    );
  if (
    !(
      self ? ["Empleado", "Recruiter", "User"] : ["Recruiter", "User"]
    ).includes(dataUser?.tipo_usuario)
  )
    return (
      <p className="p-6">Este módulo está disponible para Recursos Humanos.</p>
    );
  return (
    <CompanyProvider
      key={`${userId}:${company.id}:${resourceType}`}
      resourceType={resourceType}
      userId={userId}
      company={company}
      actor={
        dataUser?.nombre_completo || dataUser?.nombre || "Recursos Humanos"
      }
      compact={compact}
      self={self}
    >
      {!compact && (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Package size={16} />{" "}
            {resourceType === "uniform"
              ? "Control de Uniformes"
              : "Control de Activos"}
          </div>
          <label className="grid gap-1 text-xs text-slate-500">
            Empresa
            <select
              className="rounded-md border bg-white px-3 py-2 text-sm text-slate-800"
              value={company.id}
              onChange={(e) => {
                setSelected(e.target.value);
                router.push(
                  resourceHref(resourceType, "", e.target.value, self)
                );
              }}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {children}
    </CompanyProvider>
  );
}
function CompanyProvider({
  children,
  userId,
  company,
  actor,
  compact,
  self,
  resourceType,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [state, setState] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const repository = useMemo(
    () => createApiRepository(company.id, self),
    [company.id, self]
  );
  const lock = useRef(false),
    alive = useRef(true);
  const visibleState = useMemo(
    () => moduleState(state, resourceType),
    [state, resourceType]
  );
  const refresh = useCallback(async () => {
    try {
      const next = await repository.read();
      if (alive.current) {
        setState(next);
        setError("");
      }
      return next;
    } catch (e) {
      if (alive.current)
        setError(e.message || "No se pudo cargar el inventario.");
      return null;
    }
  }, [repository]);
  useEffect(() => {
    alive.current = true;
    refresh();
    return () => {
      alive.current = false;
    };
  }, [refresh]);
  async function execute(type, payload) {
    if (lock.current) return null;
    lock.current = true;
    setBusy(true);
    try {
      if (!state || error)
        throw new Error("Actualiza el inventario antes de guardar.");
      const result = await repository.execute(
        { type, payload },
        state.revision
      );
      const refreshed = await refresh();
      enqueueSnackbar(
        refreshed
          ? "Movimiento guardado."
          : "El movimiento se guardó. Actualiza para consultar el inventario.",
        { variant: refreshed ? "success" : "warning" }
      );
      return result;
    } catch (e) {
      enqueueSnackbar(
        e.message ||
          "No se pudo confirmar el movimiento. Reintenta la misma solicitud.",
        { variant: "error" }
      );
      if (e.status === 409) await refresh();
      return null;
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <Context.Provider
      value={{
        state: visibleState,
        allState: state,
        resourceType,
        href: (to) => resourceHref(resourceType, to, company.id, self),
        execute,
        company: state?.company || company,
        actor,
        ready: !!state && !error,
        busy,
        refresh,
        self,
      }}
    >
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 p-5"
        >
          <p>{error}</p>
          <Button className="mt-3" variant="outline" onClick={refresh}>
            Volver a intentar
          </Button>
        </div>
      ) : !state ? (
        <p className="p-5">Cargando inventario…</p>
      ) : (
        <>
          {!compact && (
            <div className="mb-4 flex items-center justify-end gap-3 text-xs text-slate-500">
              <span aria-live="polite">
                {busy ? "Guardando movimiento…" : "Datos de la empresa"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={refresh}
              >
                <RotateCcw size={14} />
                Actualizar
              </Button>
            </div>
          )}
          <fieldset disabled={busy} className="min-w-0 border-0 p-0 m-0">
            {children}
          </fieldset>
        </>
      )}
    </Context.Provider>
  );
}
