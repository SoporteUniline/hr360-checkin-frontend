"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams, useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import { companiesFor } from "@/lib/activos/model.mjs";
import { createDemoRepository } from "@/lib/activos/demoRepository";
import { Button } from "@/components/ui/button";
import { RotateCcw, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
const Context = createContext(null);
export const useActivos = () => useContext(Context);

export function ActivosProvider({ children, fixedCompany, compact = false }) {
  const { dataUser, isAuthChecked } = useAuth();
  const search = useSearchParams();
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
  if (!["Recruiter", "Admin", "User"].includes(dataUser?.tipo_usuario))
    return (
      <p className="p-6">Este módulo está disponible para Recursos Humanos.</p>
    );
  return (
    <CompanyProvider
      key={`${userId}:${company.id}`}
      userId={userId}
      company={company}
      actor={
        dataUser?.nombre_completo || dataUser?.nombre || "Recursos Humanos"
      }
      compact={compact}
    >
      {!compact && (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Package size={16} /> Control de Activos y Uniformes
          </div>
          <label className="grid gap-1 text-xs text-slate-500">
            Empresa
            <select
              className="rounded-md border bg-white px-3 py-2 text-sm text-slate-800"
              value={company.id}
              onChange={(e) => {
                setSelected(e.target.value);
                router.push(`/panel/control-activos?empresa=${e.target.value}`);
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
function CompanyProvider({ children, userId, company, actor, compact }) {
  const { enqueueSnackbar } = useSnackbar();
  const [repo, setRepo] = useState(null),
    [state, setState] = useState(null),
    [error, setError] = useState(""),
    [resetOpen, setResetOpen] = useState(false);
  useEffect(() => {
    let repository;
    const read = () => {
      try {
        setState(repository.read());
        setError("");
      } catch (e) {
        setError(
          e.message || "No se puede leer el almacenamiento de demostración."
        );
      }
    };
    try {
      repository = createDemoRepository(userId, company.id);
      setRepo(repository);
      read();
    } catch (e) {
      setError("El navegador no permite guardar esta demostración.");
    }
    const sync = (e) => {
      if (
        repository &&
        (e.key === repository.key || e.detail === repository.key)
      )
        read();
    };
    window.addEventListener("storage", sync);
    window.addEventListener("adamia-activos-demo", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("adamia-activos-demo", sync);
    };
  }, [userId, company.id]);
  function execute(type, payload) {
    try {
      if (!repo || !state || error)
        throw new Error("La demostración no está disponible.");
      const result = repo.execute({ type, payload }, state.revision, actor);
      setState(result.state);
      enqueueSnackbar("Movimiento guardado en la demostración.", {
        variant: "success",
      });
      return result;
    } catch (e) {
      enqueueSnackbar(
        e.message || "No se pudo guardar. Revisa el espacio de tu navegador.",
        { variant: "error" }
      );
      return null;
    }
  }
  return (
    <Context.Provider
      value={{ state, execute, company, actor, ready: !!state && !error }}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
        <div>
          <strong>Demostración con datos ficticios</strong>
          <span className="ml-2">
            Los movimientos solo se guardan en este navegador y usuario. Backend
            pendiente.
          </span>
        </div>
        {!compact && (
          <Button variant="ghost" size="sm" onClick={() => setResetOpen(true)}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Restablecer demo
          </Button>
        )}
      </div>
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 p-5"
        >
          <p>{error}</p>
          <Button
            className="mt-3"
            variant="outline"
            onClick={() => setResetOpen(true)}
          >
            Restablecer datos ficticios
          </Button>
        </div>
      ) : !state ? (
        <p className="p-5">Cargando demostración…</p>
      ) : (
        children
      )}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restablecer esta demostración</DialogTitle>
            <DialogDescription>
              Se eliminarán únicamente los movimientos ficticios de esta empresa
              y usuario en este navegador.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                try {
                  if (!repo) throw new Error("Almacenamiento no disponible.");
                  setState(repo.reset());
                  setError("");
                  setResetOpen(false);
                } catch (e) {
                  enqueueSnackbar(e.message, { variant: "error" });
                }
              }}
            >
              Restablecer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Context.Provider>
  );
}
