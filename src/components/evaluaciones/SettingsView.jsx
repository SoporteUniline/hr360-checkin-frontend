"use client";
import { useState } from "react";
import { useEvaluations, useEvaluationQuery } from "./EvaluationContext";
import {
  Heading,
  Panel,
  Field,
  Input,
  Select,
  Toggle,
  Button,
  DataTable,
  Notice,
  Confirm,
} from "./ui";
import { QueryState, Pagination } from "./ApiViews";
const labels = {
  employeeScore: "Colaborador puede ver su puntaje",
  employeeCategories: "Colaborador puede ver categorías",
  employeeComments: "Colaborador puede ver comentarios",
  employeePlan: "Colaborador puede ver su plan",
  managerResults: "Jefe puede ver resultados publicados",
  requireApproval: "Exigir aprobación antes de publicar",
  requireReceipt: "Solicitar confirmación de recibido",
  anonymousPeers: "Respuestas de pares anónimas",
  anonymousAscending: "Respuestas ascendentes anónimas",
};
export function SettingsView() {
  const query = useEvaluationQuery("/settings");
  return (
    <>
      <Heading
        title="Configuración de evaluaciones"
        description="Valores iniciales para nuevas campañas, niveles y acceso al módulo."
      />
      <QueryState query={query}>
        {query.data && (
          <SettingsEditor key={query.data.version} initial={query.data} />
        )}
      </QueryState>
      <Levels />
      <Permissions />
    </>
  );
}
function SettingsEditor({ initial }) {
  const { api, perform, busy } = useEvaluations(),
    [config, setConfig] = useState(initial.config);
  return (
    <Panel title="Permisos y confidencialidad">
      <div className="ev-pad ev-stack">
        {Object.entries(labels).map(([key, label]) => (
          <Toggle
            key={key}
            label={label}
            checked={config[key]}
            onChange={(value) => setConfig((c) => ({ ...c, [key]: value }))}
          />
        ))}
        <Field label="Mínimo de respuestas para perspectivas anónimas">
          <Input
            type="number"
            min={3}
            max={20}
            value={config.minimumResponses}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                minimumResponses: Number(e.target.value),
              }))
            }
          />
        </Field>
        <Notice>
          Una campaña existente conserva su configuración. Estos valores se
          aplican a campañas nuevas.
        </Notice>
        <Button
          disabled={busy}
          onClick={() =>
            perform(
              () =>
                api.mutate("PATCH", "/settings", config, {
                  version: initial.version,
                }),
              "Preferencias guardadas"
            )
          }
        >
          Guardar preferencias
        </Button>
      </div>
    </Panel>
  );
}
function Levels() {
  const { api, perform, busy } = useEvaluations(),
    query = useEvaluationQuery("/levels");
  const [edit, setEdit] = useState({ nombre: "", orden: 1 }),
    [page, setPage] = useState(1),
    [q, setQ] = useState(""),
    [remove, setRemove] = useState(null);
  const people = useEvaluationQuery("/people", { page, pageSize: 25, q });
  async function save() {
    if (
      await perform(
        () =>
          api.mutate(
            edit.id ? "PATCH" : "POST",
            edit.id ? `/levels/${edit.id}` : "/levels",
            { nombre: edit.nombre, orden: Number(edit.orden) }
          ),
        "Nivel guardado"
      )
    )
      setEdit({ nombre: "", orden: 1 });
  }
  return (
    <>
      <Panel title="Niveles jerárquicos">
        <div className="ev-pad ev-stack">
          <QueryState query={query}>
            <DataTable
              serverPaginated
              rows={query.data || []}
              columns={[
                {
                  key: "name",
                  label: "Nivel",
                  render: (l) => l.name || l.nombre,
                },
                {
                  key: "order",
                  label: "Orden",
                  render: (l) => l.order ?? l.orden,
                },
                {
                  key: "actions",
                  label: "",
                  render: (l) => (
                    <div className="ev-actions">
                      <Button
                        variant="outline"
                        onClick={() =>
                          setEdit({
                            id: l.id,
                            nombre: l.name || l.nombre,
                            orden: l.order ?? l.orden,
                          })
                        }
                      >
                        Editar
                      </Button>
                      <Button variant="ghost" onClick={() => setRemove(l)}>
                        Eliminar
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </QueryState>
          <Field label={edit.id ? "Editar nivel" : "Nuevo nivel"}>
            <Input
              value={edit.nombre}
              onChange={(e) =>
                setEdit((v) => ({ ...v, nombre: e.target.value }))
              }
            />
          </Field>
          <Field label="Orden">
            <Input
              type="number"
              value={edit.orden}
              onChange={(e) =>
                setEdit((v) => ({ ...v, orden: e.target.value }))
              }
            />
          </Field>
          <Button disabled={busy || !edit.nombre.trim()} onClick={save}>
            Guardar nivel
          </Button>
          {edit.id && (
            <Button
              variant="ghost"
              onClick={() => setEdit({ nombre: "", orden: 1 })}
            >
              Cancelar edición
            </Button>
          )}
        </div>
      </Panel>
      <Panel title="Asignar nivel a colaboradores">
        <div className="ev-pad">
          <Input
            label="Buscar colaborador"
            placeholder="Buscar colaborador"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <QueryState query={people}>
          <DataTable
            serverPaginated
            rows={people.data || []}
            columns={[
              { key: "name", label: "Colaborador" },
              {
                key: "levelId",
                label: "Nivel",
                render: (p) => (
                  <Select
                    label={`Nivel de ${p.name}`}
                    disabled={busy}
                    value={p.levelId ?? ""}
                    onChange={(e) =>
                      perform(
                        () =>
                          api.mutate("PUT", `/people/${p.id}/level`, {
                            levelId: e.target.value
                              ? Number(e.target.value)
                              : null,
                          }),
                        "Nivel asignado"
                      )
                    }
                  >
                    <option value="">Sin nivel</option>
                    {(query.data || []).map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name || l.nombre}
                      </option>
                    ))}
                  </Select>
                ),
              },
            ]}
          />
          <Pagination query={people} page={page} setPage={setPage} />
        </QueryState>
      </Panel>
      <Confirm
        open={!!remove}
        onOpenChange={() => setRemove(null)}
        title="Eliminar nivel"
        description="Solo se puede eliminar si no tiene colaboradores asignados."
        onConfirm={async () => {
          if (
            await perform(
              () => api.mutate("DELETE", `/levels/${remove.id}`),
              "Nivel eliminado"
            )
          )
            setRemove(null);
        }}
      />
    </>
  );
}
function Permissions() {
  const { api, perform, busy, capabilities } = useEvaluations(),
    query = useEvaluationQuery("/permissions");
  const [perfil, setPerfil] = useState("rh"),
    [type, setType] = useState("idUsuario"),
    [id, setId] = useState(""),
    [remove, setRemove] = useState(null);
  return (
    <Panel title="Acceso de RH y Dirección">
      <div className="ev-pad ev-stack">
        <Notice>
          Tu perfil actual: {capabilities.profile}. El servidor verifica todos
          los accesos.
        </Notice>
        <QueryState query={query}>
          <DataTable
            serverPaginated
            rows={query.data || []}
            columns={[
              { key: "perfil", label: "Perfil" },
              { key: "idUsuario", label: "Usuario" },
              { key: "idEmpleado", label: "Empleado" },
              {
                key: "action",
                label: "",
                render: (p) => (
                  <Button variant="ghost" onClick={() => setRemove(p)}>
                    Revocar
                  </Button>
                ),
              },
            ]}
          />
        </QueryState>
        <div className="ev-grid">
          <Field label="Perfil">
            <Select value={perfil} onChange={(e) => setPerfil(e.target.value)}>
              <option value="rh">Recursos Humanos</option>
              <option value="direccion">Dirección</option>
            </Select>
          </Field>
          <Field label="Tipo de cuenta">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="idUsuario">Usuario de panel</option>
              <option value="idEmpleado">Empleado</option>
            </Select>
          </Field>
          <Field label="Identificador de la cuenta">
            <Input
              type="number"
              min={1}
              value={id}
              onChange={(e) => setId(e.target.value)}
            />
          </Field>
        </div>
        <Button
          disabled={busy || !(Number(id) > 0)}
          onClick={async () => {
            if (
              await perform(
                () =>
                  api.mutate("POST", "/permissions", {
                    perfil,
                    [type]: Number(id),
                  }),
                "Permiso asignado"
              )
            )
              setId("");
          }}
        >
          Asignar permiso
        </Button>
      </div>
      <Confirm
        open={!!remove}
        onOpenChange={() => setRemove(null)}
        title="Revocar permiso"
        description="Se retirará este acceso explícito al módulo."
        onConfirm={async () => {
          if (
            await perform(
              () => api.mutate("DELETE", `/permissions/${remove.id}`),
              "Permiso revocado"
            )
          )
            setRemove(null);
        }}
      />
    </Panel>
  );
}
