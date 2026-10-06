"use client";
import { useState } from "react";
import { useEvaluations } from "./EvaluationContext";
import {
  Heading,
  Panel,
  Field,
  Input,
  Toggle,
  Button,
  Segments,
  Notice,
  Empty,
  Confirm,
  DataTable,
  Badge,
} from "./ui";
import { copy } from "@/lib/evaluaciones/model.mjs";
import { useUnsavedGuard } from "./ResponseView";
const labels = {
  "template.save": "Plantilla guardada",
  "template.archive": "Estado de plantilla actualizado",
  "campaign.save": "Borrador de campaña guardado",
  "campaign.launch": "Campaña iniciada",
  "campaign.close": "Campaña cerrada",
  "campaign.extend": "Fecha límite ampliada",
  "campaign.remind": "Recordatorio simulado",
  "response.save": "Borrador de respuesta guardado",
  "response.submit": "Evaluación enviada",
  "result.approve": "Resultado aprobado",
  "result.publish": "Resultado publicado",
  "receipt.sign": "Recepción confirmada",
  "plan.save": "Plan guardado",
  "plan.progress": "Seguimiento actualizado",
  "settings.save": "Preferencias guardadas",
};
export function SettingsView() {
  const { state, actor, run, reset } = useEvaluations(),
    [settings, setSettings] = useState(() => copy(state.settings)),
    [tab, setTab] = useState("access"),
    [dirty, setDirty] = useState(false),
    [confirm, setConfirm] = useState(false);
  useUnsavedGuard(dirty);
  if (actor.role !== "hr")
    return <Empty title="Configuración exclusiva de RH" />;
  const update = (key, value) => {
    setSettings({ ...settings, [key]: value });
    setDirty(true);
  };
  return (
    <>
      <Heading
        title="Configuración de evaluaciones"
        description="Define los valores iniciales para campañas nuevas. Cada campaña conserva sus propias reglas."
        actions={
          tab === "access" && (
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                if (
                  run(
                    { type: "settings.save", settings },
                    "Preferencias guardadas",
                  )
                )
                  setDirty(false);
              }}
            >
              Guardar preferencias
            </Button>
          )
        }
      />
      <div className="ev-stack">
        <Segments
          value={tab}
          onChange={setTab}
          items={[
            { value: "access", label: "Permisos y confidencialidad" },
            { value: "activity", label: "Actividad" },
            { value: "demo", label: "Demostración" },
          ]}
        />
        {tab === "access" && (
          <>
            <div className="ev-grid">
              <Panel title="Recursos Humanos">
                <div className="ev-pad ev-stack">
                  <Badge tone="blue">Administración del módulo</Badge>
                  <p>
                    Configura plantillas, campañas y asignaciones. Revisa
                    avances y resultados de la empresa, aprueba publicaciones y
                    administra planes.
                  </p>
                  <Notice>
                    Las notas privadas se reservan a RH. Las perspectivas
                    agrupadas nunca muestran calificaciones individuales ni
                    autores de comentarios.
                  </Notice>
                </div>
              </Panel>
              <Panel title="Jefe directo">
                <div className="ev-pad">
                  <p>
                    Responde las evaluaciones asignadas y consulta el avance de
                    sus colaboradores directos.
                  </p>
                  <Toggle
                    label="Consultar resultados de su equipo"
                    hint="Solo después de que RH publique cada resultado."
                    checked={settings.managerResults}
                    onChange={(v) => update("managerResults", v)}
                  />
                </div>
              </Panel>
            </div>
            <Panel
              title="Vista del colaborador"
              description="Se aplica únicamente a resultados publicados de la propia persona."
            >
              <div className="ev-pad">
                {[
                  ["employeeScore", "Ver calificación final y perspectivas"],
                  ["employeeCategories", "Ver calificaciones por categoría"],
                  ["employeeComments", "Ver comentarios compartidos"],
                  ["employeePlan", "Ver plan de mejora y seguimiento"],
                  ["requireReceipt", "Solicitar confirmación de recibido"],
                ].map(([key, label]) => (
                  <Toggle
                    key={key}
                    label={label}
                    checked={settings[key]}
                    onChange={(v) => update(key, v)}
                  />
                ))}
              </div>
            </Panel>
            <div className="ev-grid">
              <Panel title="Publicación y dirección">
                <div className="ev-pad">
                  <Toggle
                    label="Requerir aprobación de RH antes de publicar"
                    checked={settings.requireApproval}
                    onChange={(v) => update("requireApproval", v)}
                  />
                  <p className="mt-4">
                    Dirección consulta el tablero, resultados y planes de la
                    empresa. No cambia respuestas ni ve notas privadas de RH.
                  </p>
                </div>
              </Panel>
              <Panel title="Confidencialidad por perspectiva">
                <div className="ev-pad ev-stack">
                  <Toggle
                    label="Agrupar respuestas horizontales (pares)"
                    checked={settings.anonymousPeers}
                    onChange={(v) => update("anonymousPeers", v)}
                  />
                  <Toggle
                    label="Agrupar respuestas ascendentes"
                    checked={settings.anonymousAscending}
                    onChange={(v) => update("anonymousAscending", v)}
                  />
                  <Field
                    label="Mínimo de respuestas por grupo"
                    hint="Si no se alcanza, el resultado del grupo no se muestra. Mínimo permitido: 3."
                  >
                    <Input
                      type="number"
                      min={3}
                      max={20}
                      label="Mínimo de respuestas"
                      value={settings.minimumResponses}
                      onChange={(e) =>
                        update("minimumResponses", Number(e.target.value))
                      }
                    />
                  </Field>
                </div>
              </Panel>
            </div>
          </>
        )}
        {tab === "activity" && (
          <Panel
            title="Actividad de la demostración"
            description="Se conserva un máximo de 500 eventos locales. La bitácora definitiva vivirá en el servidor."
          >
            <DataTable
              rows={state.events}
              columns={[
                {
                  key: "type",
                  label: "Acción",
                  render: (e) => labels[e.type] || e.type,
                },
                {
                  key: "actorId",
                  label: "Perfil ficticio",
                  render: (e) =>
                    state.people.find((p) => p.id === e.actorId)?.name,
                },
                {
                  key: "at",
                  label: "Fecha",
                  render: (e) =>
                    new Intl.DateTimeFormat("es-MX", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "America/Mexico_City",
                    }).format(new Date(e.at)),
                },
              ]}
              empty="Todavía no se han realizado acciones en este navegador."
            />
          </Panel>
        )}
        {tab === "demo" && (
          <Panel title="Datos de demostración">
            <div className="ev-pad ev-stack">
              <p>
                Todos los nombres, campañas y resultados de este módulo son
                ficticios. Los cambios se guardan por usuario y empresa en este
                navegador.
              </p>
              <Notice>
                Esta versión permite validar el flujo completo. No envía
                correos, no crea campañas automáticamente en el futuro y no
                emite una firma digital verificable.
              </Notice>
              <p>
                Restablecer elimina solamente los cambios de esta demostración
                para la sesión actual. No modifica los demás módulos de ADAMIA.
              </p>
              <div>
                <Button variant="outline" onClick={() => setConfirm(true)}>
                  Restablecer demostración
                </Button>
              </div>
            </div>
          </Panel>
        )}
      </div>
      <Confirm
        open={confirm}
        onOpenChange={setConfirm}
        title="Restablecer datos de demostración"
        description="Se borrarán tus plantillas, respuestas y cambios locales de esta demostración. Los demás módulos no se modifican."
        action="Restablecer"
        onConfirm={() => {
          reset();
          setConfirm(false);
          setDirty(false);
        }}
      />
    </>
  );
}
