import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    value: "faq-1",
    pregunta: "¿ADAMIA tiene prueba gratis?",
    respuesta:
      "Si. Puedes iniciar una prueba gratis de 7 dias para evaluar funciones clave como control de asistencia, reportes y gestion de personal sin compromiso.",
  },
  {
    value: "faq-2",
    pregunta: "¿Puedo cambiar de plan despues?",
    respuesta:
      "Claro. Puedes escalar o ajustar tu plan conforme crece tu equipo. El cambio se hace sin perder informacion historica.",
  },
  {
    value: "faq-3",
    pregunta: "¿ADAMIA funciona para empresas con varias sucursales?",
    respuesta:
      "Si. Puedes administrar multiples sedes desde una sola plataforma y visualizar asistencia, incidencias y reportes por sucursal.",
  },
  {
    value: "faq-4",
    pregunta: "¿Incluye soporte en español?",
    respuesta:
      "Si. Nuestro equipo brinda soporte en español para configuracion inicial, dudas operativas y acompanamiento durante la adopcion.",
  },
  {
    value: "faq-5",
    pregunta: "¿Como inicio la implementacion?",
    respuesta:
      "Solo necesitas crear tu cuenta y cargar tu personal. El proceso es guiado y en pocos minutos ya puedes comenzar a operar.",
  },
];

const paises = [
  { nombre: "Espana", codigo: "es" },
  { nombre: "Colombia", codigo: "co" },
  { nombre: "Peru", codigo: "pe" },
  { nombre: "Chile", codigo: "cl" },
  { nombre: "Mexico", codigo: "mx" },
];

export default function Faq() {
  return (
    <div className="w-full bg-gradient-to-b from-[var(--adamia-bg-light)] to-white">
      <div className="p-5 py-12 md:px-10 lg:px-30 xl:px-40">
        <div className="mx-auto max-w-5xl rounded-2xl border border-[var(--adamia-blue)]/15 bg-white p-6 shadow-[0_12px_40px_rgba(37,99,235,0.08)] md:p-8">
          <div className="text-center">
            <span className="inline-flex items-center rounded-full bg-[var(--adamia-blue)]/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--adamia-blue)]">
              Soporte y ayuda
            </span>
            <h3 className="mt-4 text-2xl font-extrabold text-[var(--adamia-text-primary)] md:text-3xl">
              Preguntas Frecuentes
            </h3>
            <p className="mx-auto mt-3 max-w-3xl text-[var(--adamia-text-secondary)]">
              Resolvemos las dudas mas comunes para que tu equipo implemente
              ADAMIA rapido y sin friccion.
            </p>
          </div>

          <Accordion type="single" collapsible className="mx-auto mt-8 w-full max-w-4xl space-y-3">
            {faqs.map((faq) => (
              <AccordionItem
                key={faq.value}
                value={faq.value}
                className="overflow-hidden rounded-xl border border-[var(--adamia-blue)]/15 bg-white shadow-sm transition hover:border-[var(--adamia-blue)]/35"
              >
                <AccordionTrigger className="px-5 py-4 text-left text-base font-semibold text-[var(--adamia-text-primary)] hover:no-underline">
                  {faq.pregunta}
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5 text-[var(--adamia-text-secondary)]">
                  {faq.respuesta}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mx-auto mt-10 max-w-4xl rounded-xl border border-[var(--adamia-blue)]/15 bg-[var(--adamia-bg-light)]/60 p-5">
            <h3 className="text-center text-2xl font-extrabold text-[var(--adamia-text-primary)]">
              Estamos en tu País
            </h3>
            <p className="mt-2 text-center text-sm text-[var(--adamia-text-secondary)]">
              Operamos en distintos mercados de habla hispana para acompanarte
              en cada etapa.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {paises.map((pais) => (
                <div
                  key={pais.nombre}
                  className="flex items-center justify-center gap-2 rounded-lg border border-[var(--adamia-blue)]/20 bg-white px-3 py-3 text-sm font-semibold text-[var(--adamia-text-primary)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--adamia-blue)]/40"
                >
                  <img
                    src={`https://flagcdn.com/w40/${pais.codigo}.png`}
                    alt={`Bandera de ${pais.nombre}`}
                    className="h-4 w-6 rounded-[2px] object-cover shadow-sm"
                    loading="lazy"
                  />
                  <span>{pais.nombre}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
