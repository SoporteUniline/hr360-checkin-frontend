"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  FileText,
  ListChecks,
  MessageCircle,
  Pencil,
  Share2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { vacancyStatus, formatDate, money, textOf } from "@/lib/reclutamiento/model";
import { Badge } from "./RecruitmentUI";
import { RichDescription } from "./RichTextEditor";
import { VacancyActions } from "./VacanciesView";
import CandidatesView from "./CandidatesView";
import PublicationPanel, { previewPath } from "./PublicationPanel";
// WhatsApp de la vacante: se reutilizan los componentes reales de la bandeja (enlace, entrevista y agenda).
import { EnlaceVacanteEnLinea } from "@/components/whatsapp/EnlaceWhatsappVacante";
import EditorEntrevista from "@/components/whatsapp/EditorEntrevista";
import AgendaVacante from "@/components/whatsapp/AgendaVacante";
import s from "./reclutamiento.module.css";

export default function VacancyDetail({
  vacancy,
  data,
  empresa,
  tab,
  setTab,
  onBack,
  onAction,
  onCandidate,
  onSave,
}) {
  const [dialog, setDialog] = useState(null);
  const candidates = data.candidates.filter((item) => item.vacancyId === vacancy.id);
  // Sin proceso (solo lectura) + los de WhatsApp que ya son postulaciones (04/12/2026: mismo proceso que la página).
  const waReadOnly = (data.whatsappCandidates || []).filter((item) => item.vacancyId === vacancy.id);
  const whatsapp = [...candidates.filter((item) => item.origin === "whatsapp"), ...waReadOnly];
  const live = vacancyStatus(vacancy) === "open";
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
            {branch?.name || "Sin sucursal"} · {modality?.name || vacancy.modalityText || "Sin modalidad"} ·{" "}
            {vacancy.unlimited
              ? "Sin límite de lugares"
              : `${vacancy.openings} ${Number(vacancy.openings) === 1 ? "lugar" : "lugares"}`}
          </p>
        </div>
        <div className={s.row}>
          <Button variant="outline" onClick={() => onAction("edit", vacancy)}>
            <Pencil size={15} />
            Editar
          </Button>
          {live && vacancy.slug && (
            <Button className={s.primary} asChild>
              <a href={previewPath(vacancy)} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={15} />
                Página pública
              </a>
            </Button>
          )}
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
            Candidatos <span className={s.count}>{candidates.length + waReadOnly.length}</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp">
            <MessageCircle size={14} />
            WhatsApp
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
                      <dd>{modality?.name || vacancy.modalityText || "Sin modalidad"}</dd>
                    </div>
                    <div>
                      <dt>Jornada</dt>
                      <dd>{vacancy.employmentType}</dd>
                    </div>
                    <div>
                      <dt>Lugares</dt>
                      <dd>
                        {vacancy.unlimited
                          ? "Sin límite"
                          : `${vacancy.remaining} de ${vacancy.openings} disponibles`}
                      </dd>
                    </div>
                    <div>
                      <dt>Sueldo mensual</dt>
                      <dd>
                        {vacancy.showSalary && vacancy.salaryFrom
                          ? `${money(vacancy.salaryFrom)}${
                              vacancy.salaryTo ? ` – ${money(vacancy.salaryTo)}` : ""
                            } MXN`
                          : vacancy.salaryText || "No se muestra"}
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
                    <span className={s.muted}>Llegaron por WhatsApp</span>
                    <strong>{whatsapp.length}</strong>
                  </div>
                  <div className={s.between}>
                    <span className={s.muted}>Contrataciones</span>
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
            vacancy={vacancy}
            company={data.company}
            publishesBoard={data.publishesBoard}
            onSave={onSave}
          />
        </TabsContent>
        <TabsContent value="whatsapp" className={s.tabContent}>
          <div className={s.detailGrid}>
            <section className={s.panel}>
              <div className={s.panelHead}>
                <h2 className={s.row}>
                  <MessageCircle size={17} />
                  Enlace de WhatsApp
                </h2>
              </div>
              <div className={`${s.panelBody} ${s.stack}`}>
                {live ? (
                  <EnlaceVacanteEnLinea
                    idVacante={vacancy.id}
                    titulo={vacancy.title}
                    slug={vacancy.slug}
                    acciones={
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="min-h-11 md:min-h-9"
                          onClick={() => setDialog("interview")}
                        >
                          <ListChecks size={15} />
                          Preguntas de la entrevista
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="min-h-11 md:min-h-9"
                          onClick={() => setDialog("agenda")}
                        >
                          <CalendarDays size={15} />
                          Agenda
                        </Button>
                      </>
                    }
                  />
                ) : (
                  <p className={s.muted}>
                    Publica la vacante para compartir su enlace de WhatsApp. El asistente solo
                    entrevista en vacantes abiertas.
                  </p>
                )}
                <p className={s.small}>
                  Quien escribe con este enlace llega a tu bandeja de WhatsApp; el asistente le hace
                  las preguntas de la entrevista y agenda según la agenda de la vacante.
                </p>
              </div>
            </section>
            <section className={s.panel}>
              <div className={s.panelHead}>
                <h2>Candidatos de WhatsApp</h2>
                <strong>{whatsapp.length}</strong>
              </div>
              <div className={`${s.panelBody} ${s.stack}`}>
                {whatsapp.length ? (
                  whatsapp.slice(0, 6).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={s.between}
                      onClick={() => onCandidate(item.id)}
                    >
                      <span className={s.personName}>{item.name}</span>
                      <span className={s.small}>{item.whatsapp?.ratingLabel || item.ratingLabel}</span>
                    </button>
                  ))
                ) : (
                  <p className={s.muted}>Aún no llegan candidatos por WhatsApp a esta vacante.</p>
                )}
                <Button variant="outline" asChild>
                  <Link href="/panel/whatsapp">Abrir bandeja de WhatsApp</Link>
                </Button>
              </div>
            </section>
          </div>
          <EditorEntrevista
            abierto={dialog === "interview"}
            onCambiar={(open) => !open && setDialog(null)}
            idVacante={vacancy.id}
            titulo={vacancy.title}
          />
          <AgendaVacante
            abierto={dialog === "agenda"}
            onCambiar={(open) => !open && setDialog(null)}
            idVacante={vacancy.id}
            titulo={vacancy.title}
            idEmpresa={empresa}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
