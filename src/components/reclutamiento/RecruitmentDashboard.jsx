"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Users,
  Inbox,
  UserCheck,
  CalendarDays,
  Clock3,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  STAGES,
  vacancyStatus,
  formatDate,
  formatDateTime,
  localDate,
  interviewStatus,
} from "@/lib/reclutamiento/model";
import { useRecruitment } from "./RecruitmentContext";
import { Badge, EmptyState } from "./RecruitmentUI";
import { RECRUITMENT_BASE as base, candidateHref, vacancyHref } from "./navigation";
import s from "./reclutamiento.module.css";
import m from "./module.module.css";

export default function RecruitmentDashboard() {
  const { data, createVacancy } = useRecruitment();
  const [period, setPeriod] = useState("30");
  const [vacancyId, setVacancyId] = useState("all");
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - Number(period) + 1);
  start.setHours(0, 0, 0, 0);
  const vacancies = data.vacancies.filter((item) => vacancyId === "all" || item.id === vacancyId);
  const candidates = data.candidates.filter(
    (item) => vacancyId === "all" || item.vacancyId === vacancyId
  );
  const cohort = candidates.filter((item) => new Date(item.submittedAt) >= start);
  const recentHires = candidates.filter(
    (item) =>
      item.stage === "hired" &&
      item.hiring.completedAt &&
      new Date(item.hiring.completedAt) >= start
  );
  const unreviewed = candidates.filter((item) => item.stage === "new");
  const offers = candidates.filter((item) => item.stage === "offer");
  const interviews = data.interviews.filter((item) =>
    candidates.some((candidate) => candidate.id === item.candidateId)
  );
  const overdue = interviews.filter((item) => interviewStatus(item) === "pending");
  const upcoming = interviews
    .filter((item) => interviewStatus(item) === "scheduled")
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const events = candidates
    .flatMap((candidate) => candidate.activity.map((event) => ({ ...event, candidate })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5);
  const stages = STAGES.map((stage) => ({
    ...stage,
    count: candidates.filter((candidate) => candidate.stage === stage.id).length,
  }));
  const series = Array.from({ length: Number(period) }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    return {
      date,
      count: cohort.filter(
        (candidate) => localDate(new Date(candidate.submittedAt)) === localDate(date)
      ).length,
    };
  });
  const peak = Math.max(1, ...series.map((day) => day.count));
  const withVacancy = (url) => `${url}${url.includes("?") ? "&" : "?"}vacante=${vacancyId}`;
  const vacanciesUrl = `${base}/vacantes?estado=open${
    vacancyId === "all" ? "" : `&q=${encodeURIComponent(vacancies[0]?.title || "")}`
  }`;
  const metrics = [
    {
      label: "Vacantes publicadas",
      value: vacancies.filter((item) => vacancyStatus(item) === "open").length,
      detail: "Recibiendo postulaciones ahora",
      href: vacanciesUrl,
      icon: BriefcaseBusiness,
    },
    {
      label: "Postulaciones recibidas",
      value: cohort.length,
      detail: `En los últimos ${period} días`,
      href: withVacancy(`${base}/candidatos?dias=${period}`),
      icon: Users,
    },
    {
      label: "Candidatos por revisar",
      value: unreviewed.length,
      detail: "Pendientes actuales",
      href: withVacancy(`${base}/candidatos?etapa=new`),
      icon: Inbox,
    },
    {
      label: "Contrataciones",
      value: recentHires.length,
      detail: `Completadas en los últimos ${period} días`,
      href: withVacancy(`${base}/contrataciones?etapa=hired&dias=${period}`),
      icon: UserCheck,
    },
  ];
  return (
    <div className={s.stack}>
      <div className={m.dashboardIntro}>
        <div>
          <span className={s.eyebrow}>TU EQUIPO, EN MOVIMIENTO</span>
          <h2>Encuentra talento. Hazlo avanzar.</h2>
          <p className={s.muted}>Una mirada a tus procesos y un camino claro para continuar.</p>
        </div>
        <div className={s.row}>
          <select
            className={s.select}
            aria-label="Vacante del dashboard"
            value={vacancyId}
            onChange={(event) => setVacancyId(event.target.value)}
          >
            <option value="all">Todas las vacantes</option>
            {data.vacancies.map((vacancy) => (
              <option key={vacancy.id} value={vacancy.id}>
                {vacancy.title}
              </option>
            ))}
          </select>
          <select
            className={s.select}
            aria-label="Periodo del dashboard"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
          </select>
        </div>
      </div>
      <div className={s.metrics}>
        {metrics.map((metric) => (
          <Link href={metric.href} key={metric.label} className={s.metric}>
            <div>
              {metric.label}
              <metric.icon className={s.metricIcon} />
            </div>
            <strong>{metric.value}</strong>
            <small>
              {metric.detail}
              <ArrowUpRight size={12} />
            </small>
          </Link>
        ))}
      </div>
      <div className={m.dashboardGrid}>
        <section className={s.panel}>
          <div className={s.panelHead}>
            <div>
              <h2>Tu proceso, de un vistazo</h2>
              <p className={s.small}>
                Distribución actual de {candidates.length} candidatos · todas las fechas
              </p>
            </div>
            <Link href={withVacancy(`${base}/seleccion`)} className={m.textLink}>
              Ver selección
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className={`${s.panelBody} ${m.stageSummary}`}>
            {stages.map((stage) => (
              <Link
                key={stage.id}
                href={withVacancy(`${base}/candidatos?etapa=${stage.id}`)}
                className={m.stageRow}
              >
                <span>
                  <Badge stage={stage.id} />
                </span>
                <div className={m.stageTrack}>
                  <span
                    data-tone={stage.tone}
                    style={{
                      width: `${candidates.length ? (stage.count / candidates.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                <strong>{stage.count}</strong>
                <ArrowUpRight size={13} />
              </Link>
            ))}
          </div>
        </section>
        <section className={`${s.panel} ${m.attention}`}>
          <div className={s.panelHead}>
            <h2>¿Qué sigue hoy?</h2>
            <span className={m.liveDot} />
          </div>
          <div className={`${s.panelBody} ${s.stack}`}>
            <Link href={withVacancy(`${base}/candidatos?etapa=new`)} className={m.task}>
              <span className={m.taskIcon}>
                <Inbox size={18} />
              </span>
              <div>
                <strong>{unreviewed.length} perfiles por conocer</strong>
                <p>Revisa las postulaciones nuevas.</p>
              </div>
              <ArrowRight size={16} />
            </Link>
            <Link href={withVacancy(`${base}/contrataciones?etapa=offer`)} className={m.task}>
              <span className={m.taskIcon}>
                <UserCheck size={18} />
              </span>
              <div>
                <strong>{offers.length} ofertas en preparación</strong>
                <p>Define el ingreso y los requisitos.</p>
              </div>
              <ArrowRight size={16} />
            </Link>
            <Link
              href={withVacancy(
                `${base}/entrevistas?estado=${overdue.length ? "pending" : "scheduled"}`
              )}
              className={m.task}
            >
              <span className={m.taskIcon}>
                <CalendarDays size={18} />
              </span>
              <div>
                <strong>
                  {overdue.length
                    ? `${overdue.length} entrevistas por registrar`
                    : `${upcoming.length} próximas entrevistas`}
                </strong>
                <p>
                  {overdue.length
                    ? "Registra cómo terminó la conversación."
                    : "Consulta tu agenda y prepárate."}
                </p>
              </div>
              <ArrowRight size={16} />
            </Link>
            <p className={s.small}>Pendientes actuales de las vacantes seleccionadas.</p>
          </div>
        </section>
      </div>
      <div className={m.dashboardGrid}>
        <section className={s.panel}>
          <div className={s.panelHead}>
            <div>
              <h2>Así llegan tus candidatos</h2>
              <p className={s.small}>Postulaciones por día · últimos {period} días</p>
            </div>
            <strong className={m.chartTotal}>
              {cohort.length}
              <small> postulaciones</small>
            </strong>
          </div>
          <div className={s.panelBody}>
            <div
              className={m.barChart}
              role="img"
              aria-label={`${
                cohort.length
              } postulaciones en los últimos ${period} días. Máximo diario: ${Math.max(
                0,
                ...series.map((day) => day.count)
              )}.`}
            >
              {series.map((day) => (
                <div
                  className={m.barColumn}
                  key={localDate(day.date)}
                  title={`${formatDate(localDate(day.date))}: ${day.count} postulaciones`}
                >
                  <span
                    style={{
                      height: day.count ? `${Math.max(4, (day.count / peak) * 100)}%` : "2px",
                    }}
                    data-empty={!day.count}
                  />
                </div>
              ))}
            </div>
            <div className={s.between} style={{ marginTop: 10 }}>
              <span className={s.small}>{formatDate(localDate(start))}</span>
              <span className={s.small}>Hoy</span>
            </div>
            <details className={m.chartData}>
              <summary>Ver cifras por fecha</summary>
              <div className={m.chartDataGrid}>
                {series.map((day) => (
                  <span key={localDate(day.date)}>
                    {formatDate(localDate(day.date))}
                    <strong>{day.count}</strong>
                  </span>
                ))}
              </div>
            </details>
          </div>
        </section>
        <section className={s.panel}>
          <div className={s.panelHead}>
            <h2>Tu próxima conversación</h2>
            <Link href={withVacancy(`${base}/entrevistas`)} className={m.textLink}>
              Ver agenda
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className={s.panelBody}>
            {upcoming.length ? (
              <div className={s.stack}>
                {upcoming.slice(0, 3).map((item) => {
                  const candidate = candidates.find((person) => person.id === item.candidateId);
                  return (
                    <Link
                      key={item.id}
                      href={candidateHref(candidate.id, "activity")}
                      className={m.agendaItem}
                    >
                      <div className={m.dateTile}>
                        <strong>{new Date(item.startsAt).getDate()}</strong>
                        <span>
                          {new Date(item.startsAt).toLocaleDateString("es-MX", { month: "short" })}
                        </span>
                      </div>
                      <div>
                        <strong>{candidate.name}</strong>
                        <p>
                          {
                            data.vacancies.find((vacancy) => vacancy.id === candidate.vacancyId)
                              ?.title
                          }
                        </p>
                        <span>
                          <Clock3 size={12} />
                          {formatDateTime(item.startsAt)} · {item.duration} min
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="Espacio para conocer talento"
                description="Programa una entrevista desde la agenda o el expediente del candidato."
              />
            )}
          </div>
        </section>
      </div>
      <div className={m.dashboardGrid}>
        <section className={s.panel}>
          <div className={s.panelHead}>
            <h2>Vacantes en marcha</h2>
            <Link href={vacanciesUrl} className={m.textLink}>
              Ver vacantes
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className={s.panelBody}>
            {vacancies.filter((vacancy) => vacancyStatus(vacancy) === "open").length ? (
              <div className={s.stack}>
                {vacancies
                  .filter((vacancy) => vacancyStatus(vacancy) === "open")
                  .slice(0, 4)
                  .map((vacancy) => (
                    <Link
                      href={vacancyHref(vacancy.id)}
                      key={vacancy.id}
                      className={m.vacancySummary}
                    >
                      <div>
                        <strong>{vacancy.title}</strong>
                        <p>
                          {data.branches.find((branch) => branch.id === vacancy.branchId)?.name ||
                            "Trabajo remoto"}
                        </p>
                      </div>
                      <span>
                        {
                          candidates.filter((candidate) => candidate.vacancyId === vacancy.id)
                            .length
                        }
                        <small> candidatos</small>
                      </span>
                      <ArrowUpRight size={15} />
                    </Link>
                  ))}
              </div>
            ) : (
              <EmptyState
                icon={BriefcaseBusiness}
                title="Da el primer paso"
                description="Publica una vacante de prueba para comenzar a recibir perfiles."
              >
                <Button className={s.primary} onClick={createVacancy}>
                  Crear vacante
                </Button>
              </EmptyState>
            )}
          </div>
        </section>
        <section className={s.panel}>
          <div className={s.panelHead}>
            <h2>Últimos movimientos</h2>
            <CheckCircle2 size={17} />
          </div>
          <div className={s.panelBody}>
            {events.length ? (
              <div className={s.timeline}>
                {events.map((event) => (
                  <Link
                    key={`${event.candidate.id}-${event.id}`}
                    href={candidateHref(event.candidate.id, "activity")}
                    className={s.timelineItem}
                  >
                    <strong>{event.candidate.name}</strong>
                    <p>{event.text}</p>
                    <span className={s.small}>{formatDateTime(event.at)}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className={s.muted}>El historial se llenará al avanzar tus primeros candidatos.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
