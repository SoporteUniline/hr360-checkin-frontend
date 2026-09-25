"use client";

import { ArrowLeft, ExternalLink, FileText, ListChecks, Pencil, Share2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { vacancyStatus, formatDate, money, textOf } from "@/lib/reclutamiento/model";
import { Badge } from "./RecruitmentUI";
import { RichDescription } from "./RichTextEditor";
import { VacancyActions } from "./VacanciesView";
import CandidatesView from "./CandidatesView";
import PublicationPanel, { previewPath } from "./PublicationPanel";
import s from "./reclutamiento.module.css";

export default function VacancyDetail({
  vacancy,
  data,
  workspaceId,
  tab,
  setTab,
  onBack,
  onAction,
  onCandidate,
  onSave,
}) {
  const candidates = data.candidates.filter((item) => item.vacancyId === vacancy.id);
  const branch = data.branches.find((item) => item.id === vacancy.branchId);
  const modality = data.modalities.find((item) => item.id === vacancy.modalityId);
  return (
    <div className={s.stack}>
      <div>
        <button className={`${s.row} ${s.muted}`} onClick={onBack}>
          <ArrowLeft size={15} />
          Volver a vacantes
        </button>
      </div>
      <div className={s.between}>
        <div className={s.detailHead}>
          <Badge status={vacancyStatus(vacancy)} />
          <h2>{vacancy.title}</h2>
          <p className={s.muted}>
            {branch?.name || "Sin sucursal"} · {modality?.name} · {vacancy.openings}{" "}
            {Number(vacancy.openings) === 1 ? "lugar" : "lugares"}
          </p>
        </div>
        <div className={s.row}>
          <Button variant="outline" onClick={() => onAction("edit", vacancy)}>
            <Pencil size={15} />
            Editar
          </Button>
          <Button className={s.primary} asChild>
            <a
              href={previewPath(workspaceId, vacancy.id)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={15} />
              Vista pública
            </a>
          </Button>
          <VacancyActions vacancy={vacancy} onAction={onAction} />
        </div>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className={`${s.mainTabs} ${s.detailTabs}`}>
          <TabsTrigger value="vacancy">
            <FileText size={14} />
            Vacante
          </TabsTrigger>
          <TabsTrigger value="form">
            <ListChecks size={14} />
            Formulario
          </TabsTrigger>
          <TabsTrigger value="candidates">
            <Users size={14} />
            Candidatos <span className={s.count}>{candidates.length}</span>
          </TabsTrigger>
          <TabsTrigger value="publication">
            <Share2 size={14} />
            Publicación
          </TabsTrigger>
        </TabsList>
        <TabsContent value="vacancy" className={s.tabContent}>
          <div className={s.detailGrid}>
            <section className={s.panel}>
              <div className={s.panelHead}>
                <h2>Acerca del puesto</h2>
              </div>
              <div className={s.panelBody}>
                <RichDescription value={vacancy.description} />
                {!textOf(vacancy.description) && (
                  <p className={s.muted}>Agrega la descripción para completar este borrador.</p>
                )}
              </div>
            </section>
            <div className={s.stack}>
              <section className={s.panel}>
                <div className={s.panelHead}>
                  <h2>En un vistazo</h2>
                </div>
                <div className={s.panelBody}>
                  <dl className={s.summaryGrid}>
                    <div>
                      <dt>Sucursal</dt>
                      <dd>{branch?.name || "Sin sucursal"}</dd>
                    </div>
                    <div>
                      <dt>Modalidad</dt>
                      <dd>{modality?.name}</dd>
                    </div>
                    <div>
                      <dt>Jornada</dt>
                      <dd>{vacancy.employmentType}</dd>
                    </div>
                    <div>
                      <dt>Lugares</dt>
                      <dd>{vacancy.openings}</dd>
                    </div>
                    <div>
                      <dt>Sueldo mensual</dt>
                      <dd>
                        {vacancy.showSalary && vacancy.salaryFrom
                          ? `${money(vacancy.salaryFrom)}${
                              vacancy.salaryTo ? ` – ${money(vacancy.salaryTo)}` : ""
                            } MXN`
                          : "No se muestra"}
                      </dd>
                    </div>
                    <div>
                      <dt>Cierre</dt>
                      <dd>{formatDate(vacancy.closesOn)}</dd>
                    </div>
                  </dl>
                </div>
              </section>
              <section className={s.panel}>
                <div className={s.panelHead}>
                  <h2>Tu proceso de selección</h2>
                </div>
                <div className={`${s.panelBody} ${s.stack}`}>
                  <div className={s.between}>
                    <span className={s.muted}>Candidatos recibidos</span>
                    <strong>{candidates.length}</strong>
                  </div>
                  <div className={s.between}>
                    <span className={s.muted}>Pendientes de revisar</span>
                    <strong>
                      {candidates.filter((candidate) => candidate.stage === "new").length}
                    </strong>
                  </div>
                  <div className={s.between}>
                    <span className={s.muted}>Contrataciones de ejemplo</span>
                    <strong>
                      {candidates.filter((candidate) => candidate.stage === "hired").length}
                    </strong>
                  </div>
                  <Button variant="outline" onClick={() => setTab("candidates")}>
                    Revisar candidatos
                  </Button>
                </div>
              </section>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="form" className={s.tabContent}>
          <section className={s.panel}>
            <div className={s.panelHead}>
              <div>
                <h2>Formulario de postulación</h2>
                <p className={s.small}>
                  Versión {vacancy.formVersion} · {vacancy.questions.length} preguntas
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => onAction("form", vacancy)}>
                <Pencil size={14} />
                Editar formulario
              </Button>
            </div>
            <div className={`${s.panelBody} ${s.stack}`}>
              {vacancy.questions.map((question, index) => (
                <div className={s.question} key={question.id}>
                  <span className={s.avatar} style={{ width: 30, height: 30 }}>
                    {index + 1}
                  </span>
                  <div>
                    <div className={s.questionLabel}>{question.label}</div>
                    <div className={s.small}>
                      {question.required ? "Obligatoria" : "Opcional"}
                      {question.options ? ` · ${question.options.join(" / ")}` : ""}
                    </div>
                  </div>
                </div>
              ))}
              <div className={s.formHint}>
                La edición permite agregar preguntas y cambiar su orden. Las respuestas recibidas
                conservan su versión original.
              </div>
            </div>
          </section>
        </TabsContent>
        <TabsContent value="candidates" className={s.tabContent}>
          <CandidatesView data={data} vacancyId={vacancy.id} onOpen={onCandidate} />
        </TabsContent>
        <TabsContent value="publication" className={s.tabContent}>
          <PublicationPanel
            key={vacancy.id}
            workspaceId={workspaceId}
            vacancy={vacancy}
            onSave={onSave}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
