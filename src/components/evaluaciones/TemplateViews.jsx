"use client";
import { useState } from "react";
import { Plus, Copy, Archive, Trash2, Eye } from "lucide-react";
import { useEvaluations } from "./EvaluationContext";
import {
  Heading,
  Panel,
  Field,
  Input,
  Select,
  Textarea,
  Toggle,
  Badge,
  Button,
  ActionLink,
  DataTable,
  SearchInput,
  Segments,
  Empty,
  Notice,
  Errors,
  Reorder,
  moveItem,
  Confirm,
} from "./ui";
import {
  TYPES,
  copy,
  uid,
  newTemplate,
  newQuestion,
  validateTemplate,
  questions,
  normalize,
  isScored,
} from "@/lib/evaluaciones/model.mjs";
import { AnswerControl, useUnsavedGuard } from "./ResponseView";
export function Templates() {
  const { state, actor, run, navigate } = useEvaluations(),
    [search, setSearch] = useState(""),
    [archived, setArchived] = useState("active"),
    [confirm, setConfirm] = useState(null);
  if (actor.role !== "hr")
    return (
      <Empty
        title="Administración de plantillas"
        description="Esta vista está disponible para el perfil de RH."
      />
    );
  const rows = state.templates.filter(
    (t) =>
      (archived === "archived" ? t.archived : !t.archived) &&
      normalize(`${t.name} ${t.area} ${t.position}`).includes(
        normalize(search),
      ),
  );
  const duplicate = (t) => {
    const clone = copy(t);
    clone.id = uid("tpl");
    clone.name = `${t.name} · Copia`;
    clone.archived = false;
    if (run({ type: "template.save", template: clone }, "Plantilla duplicada"))
      navigate(`plantillas/${clone.id}`);
  };
  return (
    <>
      <Heading
        title="Plantillas de evaluación"
        description="Define qué evaluar y reutiliza tus formatos en cada campaña."
        actions={
          <ActionLink to="plantillas/nueva" primary>
            <Plus size={15} /> Nueva plantilla
          </ActionLink>
        }
      />
      <Panel>
        <Segments
          value={archived}
          onChange={setArchived}
          items={[
            {
              value: "active",
              label: "Disponibles",
              count: state.templates.filter((t) => !t.archived).length,
            },
            { value: "archived", label: "Archivadas" },
          ]}
        />
        <div className="ev-filters">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar plantilla, área o puesto…"
          />
        </div>
        <DataTable
          rows={rows}
          columns={[
            {
              key: "name",
              label: "Plantilla",
              render: (t) => (
                <>
                  <strong>{t.name}</strong>
                  <small>{t.description}</small>
                </>
              ),
            },
            {
              key: "area",
              label: "Dirigida a",
              render: (t) => (
                <>
                  {t.area}
                  <small>{t.position}</small>
                </>
              ),
            },
            {
              key: "questions",
              label: "Contenido",
              render: (t) => (
                <>
                  {t.categories.length} categorías
                  <small>{questions(t).length} preguntas</small>
                </>
              ),
            },
            {
              key: "version",
              label: "Versión",
              render: (t) => <Badge>v{t.version}</Badge>,
            },
            {
              key: "actions",
              label: "Acciones",
              render: (t) => (
                <div className="ev-actions">
                  <ActionLink to={`plantillas/${t.id}`}>Editar</ActionLink>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Duplicar ${t.name}`}
                    onClick={() => duplicate(t)}
                  >
                    <Copy size={15} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`${t.archived ? "Restaurar" : "Archivar"} ${t.name}`}
                    onClick={() => setConfirm(t)}
                  >
                    <Archive size={15} />
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Panel>
      <Confirm
        open={!!confirm}
        onOpenChange={() => setConfirm(null)}
        title={confirm?.archived ? "Restaurar plantilla" : "Archivar plantilla"}
        description="Las evaluaciones ya iniciadas conservarán su versión y sus resultados."
        onConfirm={() => {
          if (
            run(
              { type: "template.archive", id: confirm.id },
              "Plantilla actualizada",
            )
          )
            setConfirm(null);
        }}
      />
    </>
  );
}
export function TemplateEditor({ id }) {
  const { state, actor, run, navigate } = useEvaluations();
  const original = state.templates.find((t) => t.id === id);
  const [template, setTemplate] = useState(() =>
      copy(original || newTemplate()),
    ),
    [tab, setTab] = useState("content"),
    [errors, setErrors] = useState([]),
    [dirty, setDirty] = useState(false),
    [preview, setPreview] = useState({});
  useUnsavedGuard(dirty);
  if (actor.role !== "hr") return <Empty title="Vista exclusiva de RH" />;
  if (id !== "nueva" && !original)
    return (
      <Empty
        title="Plantilla no encontrada"
        action={<ActionLink to="plantillas">Ver plantillas</ActionLink>}
      />
    );
  const change = (patch) => {
    setTemplate((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };
  const category = (index, patch) =>
    change({
      categories: template.categories.map((c, i) =>
        i === index ? { ...c, ...patch } : c,
      ),
    });
  const question = (ci, qi, patch) =>
    category(ci, {
      questions: template.categories[ci].questions.map((q, i) =>
        i === qi ? { ...q, ...patch } : q,
      ),
    });
  const save = () => {
    const issues = validateTemplate(template);
    setErrors(issues);
    if (issues.length) return;
    if (
      run(
        { type: "template.save", template },
        "Plantilla guardada en esta demostración",
      )
    ) {
      setDirty(false);
      navigate("plantillas");
    }
  };
  const total = template.categories.reduce(
    (s, c) => s + Number(c.weight || 0),
    0,
  );
  return (
    <>
      <Heading
        title={id === "nueva" ? "Crear plantilla" : template.name}
        description="Diseña el formato una vez. Después elige quién lo responde en cada campaña."
        back="plantillas"
        actions={
          <>
            <Badge tone={dirty ? "amber" : "gray"}>
              {dirty ? "Cambios sin guardar" : `Versión ${template.version}`}
            </Badge>
            <Button onClick={save} className="bg-blue-600 hover:bg-blue-700">
              Guardar plantilla
            </Button>
          </>
        }
      />
      <Errors errors={errors} />
      <div className="ev-stack">
        <Segments
          value={tab}
          onChange={setTab}
          items={[
            { value: "content", label: "Contenido" },
            { value: "weights", label: "Pesos y escala" },
            { value: "preview", label: "Vista previa" },
          ]}
        />
        {tab === "content" && (
          <div className="ev-editor-grid">
            <div className="ev-stack">
              <Panel title="Información de la plantilla">
                <div className="ev-pad ev-stack">
                  <Field label="Nombre">
                    <Input
                      label="Nombre de plantilla"
                      value={template.name}
                      onChange={(e) => change({ name: e.target.value })}
                      placeholder="Ej. Evaluación trimestral de desempeño"
                      maxLength={160}
                    />
                  </Field>
                  <Field label="Descripción">
                    <Textarea
                      label="Descripción de plantilla"
                      value={template.description}
                      onChange={(e) => change({ description: e.target.value })}
                    />
                  </Field>
                  <div className="ev-grid">
                    <Field label="Área objetivo">
                      <Select
                        label="Área objetivo"
                        value={template.area}
                        onChange={(e) => change({ area: e.target.value })}
                      >
                        {[
                          "Todas",
                          ...new Set(state.people.map((p) => p.area)),
                        ].map((a) => (
                          <option key={a}>{a}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Puesto objetivo">
                      <Input
                        label="Puesto objetivo"
                        value={template.position}
                        onChange={(e) => change({ position: e.target.value })}
                      />
                    </Field>
                  </div>
                </div>
              </Panel>
              {template.categories.map((c, ci) => (
                <Panel
                  key={c.id}
                  title={`Categoría ${ci + 1}`}
                  actions={
                    <Reorder
                      label={`categoría ${ci + 1}`}
                      index={ci}
                      total={template.categories.length}
                      onMove={(from, to) =>
                        change({
                          categories: moveItem(template.categories, from, to),
                        })
                      }
                    />
                  }
                >
                  <div className="ev-pad">
                    <div className="ev-grid">
                      <Field label="Nombre de categoría">
                        <Input
                          label={`Nombre de categoría ${ci + 1}`}
                          value={c.name}
                          onChange={(e) =>
                            category(ci, { name: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="Peso en el resultado (%)">
                        <Input
                          label={`Peso de categoría ${ci + 1}`}
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          value={c.weight}
                          onChange={(e) =>
                            category(ci, { weight: e.target.value })
                          }
                        />
                      </Field>
                    </div>
                    {c.questions.map((q, qi) => (
                      <div className="ev-question-editor" key={q.id}>
                        <div className="ev-category-row">
                          <strong>Pregunta {qi + 1}</strong>
                          <div className="ev-actions">
                            <Reorder
                              label={`pregunta ${ci + 1}.${qi + 1}`}
                              index={qi}
                              total={c.questions.length}
                              onMove={(from, to) =>
                                category(ci, {
                                  questions: moveItem(c.questions, from, to),
                                })
                              }
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Eliminar pregunta ${ci + 1}.${qi + 1}`}
                              onClick={() =>
                                category(ci, {
                                  questions: c.questions.filter(
                                    (x) => x.id !== q.id,
                                  ),
                                })
                              }
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                        <Field label="Enunciado">
                          <Input
                            label={`Pregunta ${ci + 1}.${qi + 1}`}
                            value={q.text}
                            maxLength={500}
                            onChange={(e) =>
                              question(ci, qi, { text: e.target.value })
                            }
                          />
                        </Field>
                        <div className="ev-grid">
                          <Field label="Tipo de respuesta">
                            <Select
                              label={`Tipo de pregunta ${ci + 1}.${qi + 1}`}
                              value={q.type}
                              onChange={(e) => {
                                const type = e.target.value;
                                question(ci, qi, {
                                  type,
                                  scored: type !== "text",
                                  options: q.options.length
                                    ? q.options
                                    : newQuestion().options,
                                });
                              }}
                            >
                              {Object.entries(TYPES).map(([key, label]) => (
                                <option value={key} key={key}>
                                  {label}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <div>
                            <Toggle
                              label="Respuesta obligatoria"
                              checked={q.required}
                              onChange={(required) =>
                                question(ci, qi, { required })
                              }
                            />
                            {q.type !== "text" && (
                              <Toggle
                                label="Aporta a la calificación"
                                checked={q.scored}
                                onChange={(scored) =>
                                  question(ci, qi, { scored })
                                }
                              />
                            )}
                          </div>
                        </div>
                        {q.type === "number" && (
                          <div className="ev-grid">
                            <Field label="Mínimo">
                              <Input
                                type="number"
                                label={`Mínimo ${q.text}`}
                                value={q.min}
                                onChange={(e) =>
                                  question(ci, qi, { min: e.target.value })
                                }
                              />
                            </Field>
                            <Field label="Máximo">
                              <Input
                                type="number"
                                label={`Máximo ${q.text}`}
                                value={q.max}
                                onChange={(e) =>
                                  question(ci, qi, { max: e.target.value })
                                }
                              />
                            </Field>
                          </div>
                        )}
                        {q.type === "boolean" && q.scored && (
                          <div className="ev-grid">
                            {["yesScore", "noScore"].map((k) => (
                              <Field
                                key={k}
                                label={`Puntos para ${k === "yesScore" ? "Sí" : "No"} (1–5)`}
                              >
                                <Input
                                  type="number"
                                  min={1}
                                  max={5}
                                  step="0.01"
                                  label={`${k} ${q.text}`}
                                  value={q[k]}
                                  onChange={(e) =>
                                    question(ci, qi, { [k]: e.target.value })
                                  }
                                />
                              </Field>
                            ))}
                          </div>
                        )}
                        {q.type === "choice" && (
                          <div>
                            <p>
                              Opciones de respuesta{" "}
                              {q.scored ? "· puntuación de 1 a 5" : ""}
                            </p>
                            {q.options.map((o, oi) => (
                              <div className="ev-category-row" key={o.id}>
                                <Input
                                  label={`Opción ${oi + 1} de ${q.text}`}
                                  value={o.label}
                                  onChange={(e) =>
                                    question(ci, qi, {
                                      options: q.options.map((x) =>
                                        x.id === o.id
                                          ? { ...x, label: e.target.value }
                                          : x,
                                      ),
                                    })
                                  }
                                />
                                {q.scored && (
                                  <Input
                                    type="number"
                                    label={`Puntuación de opción ${oi + 1}`}
                                    min={1}
                                    max={5}
                                    step="0.01"
                                    style={{ maxWidth: 80 }}
                                    value={o.score}
                                    onChange={(e) =>
                                      question(ci, qi, {
                                        options: q.options.map((x) =>
                                          x.id === o.id
                                            ? { ...x, score: e.target.value }
                                            : x,
                                        ),
                                      })
                                    }
                                  />
                                )}
                                <Button
                                  variant="ghost"
                                  aria-label={`Eliminar opción ${oi + 1}`}
                                  onClick={() =>
                                    question(ci, qi, {
                                      options: q.options.filter(
                                        (x) => x.id !== o.id,
                                      ),
                                    })
                                  }
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                question(ci, qi, {
                                  options: [
                                    ...q.options,
                                    { id: uid("o"), label: "", score: 3 },
                                  ],
                                })
                              }
                            >
                              Agregar opción
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="ev-footer">
                      <Button
                        variant="outline"
                        onClick={() =>
                          category(ci, {
                            questions: [...c.questions, newQuestion()],
                          })
                        }
                      >
                        <Plus size={14} /> Agregar pregunta
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          change({
                            categories: template.categories.filter(
                              (x) => x.id !== c.id,
                            ),
                          })
                        }
                      >
                        Eliminar categoría
                      </Button>
                    </div>
                  </div>
                </Panel>
              ))}
              <Button
                variant="outline"
                onClick={() =>
                  change({
                    categories: [
                      ...template.categories,
                      {
                        id: uid("cat"),
                        name: "Nueva categoría",
                        weight: 0,
                        questionWeights: "equal",
                        questions: [newQuestion()],
                      },
                    ],
                  })
                }
              >
                <Plus size={15} /> Agregar categoría
              </Button>
            </div>
            <div className="ev-sticky ev-stack">
              <Panel title="Estructura del formato">
                <div className="ev-pad ev-stack">
                  {template.categories.map((c, i) => (
                    <div className="ev-category-row" key={c.id}>
                      <span>
                        {i + 1}. {c.name}
                      </span>
                      <Badge>{c.weight || 0}%</Badge>
                    </div>
                  ))}
                  <Notice tone={total === 100 ? "green" : "amber"}>
                    Peso total: <strong>{total}% / 100%</strong>
                  </Notice>
                  <p>
                    {questions(template).length} preguntas ·{" "}
                    {template.categories.length} categorías
                  </p>
                  <Button variant="outline" onClick={() => setTab("preview")}>
                    <Eye size={14} /> Ver evaluación
                  </Button>
                </div>
              </Panel>
              <Notice>
                Usa las flechas para cambiar el orden de categorías y preguntas.
                Las campañas iniciadas conservan su propia versión.
              </Notice>
            </div>
          </div>
        )}
        {tab === "weights" && (
          <div className="ev-stack">
            <Panel
              title="Peso por categoría"
              description="El resultado combina las categorías según su importancia."
            >
              <div className="ev-pad ev-stack">
                <Notice tone={total === 100 ? "green" : "amber"}>
                  Total asignado: <strong>{total}%</strong> ·{" "}
                  {total === 100
                    ? "Listo para guardar"
                    : "Debe sumar exactamente 100%"}
                </Notice>
                {template.categories.map((c, ci) => (
                  <div key={c.id} className="ev-question-editor">
                    <div className="ev-grid">
                      <Field label={c.name}>
                        <Input
                          label={`Peso ${c.name}`}
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          value={c.weight}
                          onChange={(e) =>
                            category(ci, { weight: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="Peso de las preguntas">
                        <Select
                          label={`Distribución ${c.name}`}
                          value={c.questionWeights}
                          onChange={(e) =>
                            category(ci, { questionWeights: e.target.value })
                          }
                        >
                          <option value="equal">Todas valen lo mismo</option>
                          <option value="custom">Personalizar pesos</option>
                        </Select>
                      </Field>
                    </div>
                    {c.questionWeights === "custom" && (
                      <div>
                        {c.questions.filter(isScored).map((q) => (
                          <div key={q.id} className="ev-category-row">
                            <span>{q.text || "Pregunta sin título"}</span>
                            <Input
                              style={{ width: 85 }}
                              type="number"
                              label={`Peso pregunta ${q.text}`}
                              value={q.weight}
                              min={0.01}
                              max={100}
                              step="0.01"
                              onChange={(e) =>
                                question(
                                  ci,
                                  c.questions.findIndex((x) => x.id === q.id),
                                  { weight: e.target.value },
                                )
                              }
                            />
                          </div>
                        ))}
                        <Badge
                          tone={
                            c.questions
                              .filter(isScored)
                              .reduce(
                                (s, q) => s + Number(q.weight || 0),
                                0,
                              ) === 100
                              ? "green"
                              : "amber"
                          }
                        >
                          {c.questions
                            .filter(isScored)
                            .reduce((s, q) => s + Number(q.weight || 0), 0)}
                          % de 100%
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
            <Panel
              title="Escala de calificación"
              description="Los valores 1 a 5 se mantienen para comparar. Puedes cambiar sus descripciones."
            >
              <div className="ev-pad ev-stack">
                {template.scale.map((s, i) => (
                  <div key={s.value} className="ev-grid">
                    <Field label={`Nivel ${s.value}`}>
                      <Input
                        label={`Nombre nivel ${s.value}`}
                        value={s.label}
                        onChange={(e) =>
                          change({
                            scale: template.scale.map((x, j) =>
                              j === i ? { ...x, label: e.target.value } : x,
                            ),
                          })
                        }
                      />
                    </Field>
                    <Field label="Descripción">
                      <Input
                        label={`Descripción nivel ${s.value}`}
                        value={s.description}
                        onChange={(e) =>
                          change({
                            scale: template.scale.map((x, j) =>
                              j === i
                                ? { ...x, description: e.target.value }
                                : x,
                            ),
                          })
                        }
                      />
                    </Field>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel
              title="Semáforo de resultados"
              description="Rangos a dos decimales, de 1.00 a 5.00. Sin huecos ni superposiciones."
            >
              <div className="ev-pad ev-stack">
                {template.bands.map((b, i) => (
                  <div className="ev-grid" key={i}>
                    <Field label={`Nombre del nivel ${i + 1}`}>
                      <Input
                        label={`Semáforo ${i + 1}`}
                        value={b.label}
                        onChange={(e) =>
                          change({
                            bands: template.bands.map((x, j) =>
                              j === i ? { ...x, label: e.target.value } : x,
                            ),
                          })
                        }
                      />
                    </Field>
                    <div className="ev-grid">
                      <Field label="Desde">
                        <Input
                          type="number"
                          step="0.01"
                          label={`Desde nivel ${i + 1}`}
                          value={b.min}
                          onChange={(e) =>
                            change({
                              bands: template.bands.map((x, j) =>
                                j === i ? { ...x, min: e.target.value } : x,
                              ),
                            })
                          }
                        />
                      </Field>
                      <Field label="Hasta">
                        <Input
                          type="number"
                          step="0.01"
                          label={`Hasta nivel ${i + 1}`}
                          value={b.max}
                          onChange={(e) =>
                            change({
                              bands: template.bands.map((x, j) =>
                                j === i ? { ...x, max: e.target.value } : x,
                              ),
                            })
                          }
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}
        {tab === "preview" && (
          <div
            className="ev-stack"
            style={{ maxWidth: 860, margin: "0 auto", width: "100%" }}
          >
            <Notice>
              Vista previa interactiva. Las respuestas de esta sección no se
              guardan.
            </Notice>
            <Panel
              title={template.name || "Tu evaluación"}
              description={template.description}
            >
              <div className="ev-pad">
                <p>
                  {template.categories.length} secciones ·{" "}
                  {questions(template).length} preguntas
                </p>
              </div>
            </Panel>
            {template.categories.map((c) => (
              <Panel
                key={c.id}
                title={c.name}
                actions={<Badge>{c.weight}%</Badge>}
              >
                <div className="ev-pad">
                  {c.questions.map((q) => (
                    <div className="ev-question" key={q.id}>
                      <div className="ev-question-title">
                        {q.text || "Escribe el enunciado de la pregunta"}{" "}
                        {q.required && <span aria-label="Obligatoria">*</span>}
                      </div>
                      <AnswerControl
                        question={q}
                        scale={template.scale}
                        value={preview[q.id]}
                        onChange={(value) =>
                          setPreview({ ...preview, [q.id]: value })
                        }
                      />
                    </div>
                  ))}
                </div>
              </Panel>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
