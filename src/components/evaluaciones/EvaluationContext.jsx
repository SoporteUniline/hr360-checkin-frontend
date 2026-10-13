"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "@/lib/axios";
import { useSnackbar } from "notistack";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  createEvaluationApi,
  normalizeTemplate,
  normalizeCampaign,
  normalizeAssignment,
  sid,
} from "@/lib/evaluaciones/api.mjs";
const Context = createContext(null);
export const useEvaluations = () => useContext(Context);
export function EvaluationProvider({ children, employee = false }) {
  const { dataUser, isAuthChecked, isLoggedIn } = useAuth();
  const companies = dataUser?.empresas_detalle || [];
  const initial =
    dataUser?.id_empresa ?? companies[0]?.id_empresa ?? dataUser?.empresas?.[0];
  const [selected, setSelected] = useState(null);
  if (!isAuthChecked)
    return (
      <div className="p-8" role="status">
        Cargando evaluaciones…
      </div>
    );
  if (!isLoggedIn)
    return (
      <div className="p-8">
        Inicia sesión para abrir Evaluación de Desempeño.
      </div>
    );
  const company = selected ?? initial;
  return (
    <>
      {!employee && companies.length > 1 && (
        <label className="block p-4">
          Empresa{" "}
          <select
            aria-label="Empresa de evaluaciones"
            value={company}
            onChange={(e) => setSelected(e.target.value)}
          >
            {companies.map((c) => (
              <option key={c.id_empresa} value={c.id_empresa}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
      )}
      <ScopedProvider
        key={`${company}:${dataUser?.id_usuario}:${dataUser?.id_empleado}`}
        company={company}
        employee={employee}
      >
        {children}
      </ScopedProvider>
    </>
  );
}
function ScopedProvider({ children, company, employee }) {
  const api = useMemo(() => createEvaluationApi(axios, company), [company]);
  const { enqueueSnackbar } = useSnackbar(),
    router = useRouter(),
    pathname = usePathname();
  const base = employee
    ? "/empleado/panel/evaluaciones"
    : "/panel/evaluaciones";
  const section = pathname.slice(base.length + 1);
  const [capabilities, setCapabilities] = useState(null),
    [error, setError] = useState(""),
    [actionError, setActionError] = useState(null),
    [retry, setRetry] = useState(0),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
  const pending = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    api
      .get("/capabilities", {}, controller.signal)
      .then((r) => {
        setCapabilities(r.data);
        setError("");
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [api, retry]);
  const notify = useCallback(
    (message, variant = "info") => enqueueSnackbar(message, { variant }),
    [enqueueSnackbar]
  );
  const perform = useCallback(
    async (operation, message) => {
      if (pending.current) return null;
      pending.current = true;
      setBusy(true);
      setActionError(null);
      try {
        const result = await operation();
        if (message) notify(message, "success");
        setRevision((v) => v + 1);
        return result == null ? true : result;
      } catch (e) {
        setActionError(e);
        notify(
          [e.message, ...(e.fields || []).map((f) => f.message)]
            .filter((v, i, a) => a.indexOf(v) === i)
            .join(" "),
          "error"
        );
        return null;
      } finally {
        pending.current = false;
        setBusy(false);
      }
    },
    [notify]
  );
  const actor = capabilities && {
    id:
      capabilities.employeeId != null
        ? sid(capabilities.employeeId)
        : `user:${capabilities.userId}`,
    role: capabilities.profile,
  };
  if (error)
    return (
      <div className="p-8 space-y-4">
        <p role="alert">{error}</p>
        <Button onClick={() => setRetry((x) => x + 1)}>Reintentar</Button>
      </div>
    );
  if (!capabilities)
    return (
      <div className="p-8" role="status">
        Consultando permisos de evaluación…
      </div>
    );
  return (
    <Context.Provider
      value={{
        api,
        capabilities,
        actor,
        busy,
        perform,
        revision,
        notify,
        base,
        section,
        href: (to = "") => `${base}${to ? "/" + to : ""}`,
        navigate: (to = "") => router.push(`${base}${to ? "/" + to : ""}`),
      }}
    >
      {actionError && (
        <div className="p-4 space-y-2" role="alert">
          <p>{actionError.message}</p>
          {actionError.code === "VERSION" && (
            <Button variant="outline" onClick={() => window.location.reload()}>
              Recargar información
            </Button>
          )}
        </div>
      )}
      {children}
    </Context.Provider>
  );
}
export function useEvaluationQuery(path, params = {}, { enabled = true } = {}) {
  const { api, revision } = useEvaluations();
  const paramsKey = JSON.stringify(params),
    key = `${path}:${paramsKey}`;
  const [result, setResult] = useState({
    key: "",
    data: null,
    error: "",
    loading: true,
  });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setResult({ key, data: null, error: "", loading: true });
    api
      .get(path, JSON.parse(paramsKey), controller.signal)
      .then((r) => {
        if (!controller.signal.aborted)
          setResult({ key, ...r, error: "", loading: false });
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setResult({ key, data: null, error: e.message, loading: false });
      });
    return () => controller.abort();
  }, [api, path, key, paramsKey, revision, retry, enabled]);
  return {
    ...(result.key === key ? result : { data: null, loading: true, error: "" }),
    reload: () => setRetry((x) => x + 1),
  };
}
// Existing template/campaign editors keep their layout; their source is now server data.
export function EditorData({ kind, id, children }) {
  const context = useEvaluations(),
    { api, capabilities } = context;
  const [state, setState] = useState(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const current = useRef(null);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function load() {
      const [catalogs, people, templates] = await Promise.all([
        api.get("/catalogs", {}, controller.signal),
        kind === "campaign"
          ? api.all("/people", {}, controller.signal)
          : Promise.resolve([]),
        kind === "campaign"
          ? api.all("/templates", { archived: "active" }, controller.signal)
          : Promise.resolve([]),
      ]);
      const fullTemplates = await Promise.all(
        templates.map((t) =>
          api
            .get(`/templates/${t.id}`, {}, controller.signal)
            .then((r) => normalizeTemplate(r.data))
        )
      );
      if (kind === "template" && id !== "nueva")
        fullTemplates.push(
          normalizeTemplate(
            (await api.get(`/templates/${id}`, {}, controller.signal)).data
          )
        );
      const c =
        kind === "campaign" && id
          ? (await api.get(`/campaigns/${id}`, {}, controller.signal)).data
          : null;
      const next = {
        catalogs: catalogs.data,
        people: people.map((p) => ({
          ...p,
          id: sid(p.id),
          managerId: sid(p.managerId),
          level: sid(p.levelId),
          active: p.active !== false,
        })),
        templates: fullTemplates,
        campaigns: c ? [normalizeCampaign(c, fullTemplates)] : [],
        assignments: Array.isArray(c?.assignments)
          ? c.assignments.map((a) => normalizeAssignment(a, c.id))
          : [],
        settings:
          kind === "campaign"
            ? (await api.get("/settings", {}, controller.signal)).data.config
            : capabilities.settings,
      };
      if (active) {
        current.current = next;
        setState(next);
        setError("");
      }
    }
    load().catch((e) => {
      if (active) setError(e.message);
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [api, kind, id, retry, capabilities.settings]);
  async function run(command, message) {
    return context.perform(async () => {
      const s = current.current;
      if (command.type === "template.save") {
        const t = command.template,
          existing = s.templates.find((x) => x.id === t.id);
        const body = {
          name: t.name,
          description: t.description,
          areaId: t.areaId ? Number(t.areaId) : null,
          positionId: t.positionId ? Number(t.positionId) : null,
          scale: t.scale,
          bands: t.bands,
          categories: t.categories,
        };
        return api.mutate(
          "POST",
          existing ? `/templates/${t.id}/versions` : "/templates",
          body,
          { version: existing?.revision }
        );
      }
      if (command.type === "campaign.refresh") {
        const detail = (await api.get(`/campaigns/${command.id}`)).data;
        const campaign = normalizeCampaign(detail, s.templates);
        current.current = { ...s, campaigns: [campaign] };
        setState(current.current);
        return campaign;
      }
      if (command.type === "campaign.save") {
        const c = command.campaign,
          existing = s.campaigns.find((x) => x.id === c.id);
        const versionId = (templateId) => {
          const t = s.templates.find((t) => t.id === templateId);
          const value = t?.versionId ?? t?.templateVersionId;
          if (value == null)
            throw new Error(
              "La plantilla no incluye el identificador de su versión. Recarga o revisa el contrato del backend."
            );
          return value;
        };
        const body = {
          name: c.name,
          description: c.description,
          model: c.model,
          primaryTemplateVersionId: versionId(c.templateId),
          periodStart: c.periodStart || null,
          periodEnd: c.periodEnd || null,
          opensOn: c.opensOn || null,
          dueOn: c.dueOn || null,
          timezone: c.timezone,
          subjectIds: c.subjectIds.map(Number),
          groups: c.groups.map((g) => ({
            key: g.key,
            weight: Number(g.weight),
            templateVersionId: versionId(g.templateId),
          })),
          settings: c.settings,
          reminders: c.reminders,
          recurrence: c.recurrence === "none" ? null : c.recurrence,
        };
        const saved = await api.mutate(
          existing ? "PATCH" : "POST",
          existing ? `/campaigns/${existing.id}` : "/campaigns",
          body,
          { version: existing?.revision }
        );
        const normalized = normalizeCampaign(saved, s.templates);
        current.current = { ...s, campaigns: [normalized] };
        setState(current.current);
        return normalized;
      }
      throw new Error("Operación no disponible.");
    }, message);
  }
  if (error)
    return (
      <div className="p-8">
        <p role="alert">{error}</p>
        <Button onClick={() => setRetry((x) => x + 1)}>Recargar</Button>
      </div>
    );
  if (!state)
    return (
      <div className="p-8" role="status">
        Cargando editor…
      </div>
    );
  return (
    <Context.Provider value={{ ...context, state, run }}>
      <fieldset disabled={context.busy} className="min-w-0 border-0 p-0">
        {children}
      </fieldset>
    </Context.Provider>
  );
}
