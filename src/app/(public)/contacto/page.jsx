"use client";

import Link from "next/link";
import { useState } from "react";

const canales = [
  {
    title: "Email",
    value: "sistema@adamia.mx",
    href: "mailto:sistema@adamia.mx",
    description: "Consultas generales y soporte técnico.",
    icon: "📧",
  },
  {
    title: "Teléfono y WhatsApp",
    value: "+52 317 128 8029",
    href: "tel:+523173887959",
    description: "Atención comercial y operativa.",
    icon: "📱",
  },
  {
    title: "Oficina",
    value: "Autlán de Navarro, Jalisco, México",
    description: "Atención con cita previa.",
    icon: "📍",
  },
];

export default function ContactoPage() {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    telefono: "",
    asunto: "Información general",
    mensaje: "",
  });

  const whatsappNumber = "523173887959";

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const onSubmit = (event) => {
    event.preventDefault();
    const { nombre, email, telefono, asunto, mensaje } = form;

    if (
      !nombre.trim() ||
      !email.trim() ||
      !telefono.trim() ||
      !mensaje.trim()
    ) {
      window.alert(
        "Completa nombre, correo, teléfono y mensaje para continuar.",
      );
      return;
    }

    const body = [
      "Hola ADAMIA, quiero solicitar información.",
      "",
      `Nombre: ${nombre}`,
      `Correo: ${email}`,
      `Teléfono: ${telefono}`,
      `Asunto: ${asunto}`,
      `Mensaje: ${mensaje}`,
    ].join("\n");

    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
      body,
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="bg-white text-[var(--adamia-text-primary)]">
      {/* Hero de contacto */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] py-20 text-white">
        <div className="mx-auto w-full max-w-7xl px-6 text-center">
          <span className="inline-flex rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm font-bold">
            📞 ESTAMOS AQUÍ PARA AYUDARTE
          </span>
          <h1 className="mt-6 text-4xl font-black md:text-5xl">Contáctanos</h1>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-white/90">
            Nuestro equipo está listo para ayudarte con dudas de producto,
            implementación y operación de ADAMIA.
          </p>
        </div>
      </section>

      {/* Tarjetas de contacto */}
      <section className="py-16">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {canales.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-[var(--adamia-blue)]/15 bg-[var(--adamia-bg-light)] p-7 shadow-sm"
              >
                <div className="text-3xl">{item.icon}</div>
                <h2 className="mt-4 text-2xl font-black">{item.title}</h2>
                <p className="mt-2 text-sm text-[var(--adamia-text-secondary)]">
                  {item.description}
                </p>
                {item.href ? (
                  <a
                    href={item.href}
                    className="mt-5 inline-block font-bold text-[var(--adamia-blue)] hover:underline"
                  >
                    {item.value}
                  </a>
                ) : (
                  <p className="mt-5 font-bold text-[var(--adamia-blue)]">
                    {item.value}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Formulario visual */}
      <section className="pb-20">
        <div className="mx-auto w-full max-w-5xl px-6">
          <article className="rounded-3xl border border-[var(--adamia-blue)]/15 bg-white p-8 shadow-xl md:p-10">
            <h2 className="text-3xl font-black">Envíanos un mensaje</h2>
            <p className="mt-2 text-[var(--adamia-text-secondary)]">
              Déjanos tus datos y te contactamos en breve.
            </p>

            <form
              className="mt-8 grid gap-5 md:grid-cols-2"
              onSubmit={onSubmit}
            >
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Nombre completo</span>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={handleChange("nombre")}
                  placeholder="Tu nombre"
                  required
                  className="h-11 rounded-xl border border-[var(--adamia-blue)]/20 px-3 outline-none transition focus:border-[var(--adamia-blue)]"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold">
                  Correo electrónico
                </span>
                <input
                  type="email"
                  value={form.email}
                  onChange={handleChange("email")}
                  placeholder="correo@empresa.com"
                  required
                  className="h-11 rounded-xl border border-[var(--adamia-blue)]/20 px-3 outline-none transition focus:border-[var(--adamia-blue)]"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold">Teléfono</span>
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={handleChange("telefono")}
                  placeholder="+52..."
                  required
                  className="h-11 rounded-xl border border-[var(--adamia-blue)]/20 px-3 outline-none transition focus:border-[var(--adamia-blue)]"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold">Asunto</span>
                <select
                  value={form.asunto}
                  onChange={handleChange("asunto")}
                  className="h-11 rounded-xl border border-[var(--adamia-blue)]/20 bg-white px-3 outline-none transition focus:border-[var(--adamia-blue)]"
                >
                  <option>Información general</option>
                  <option>Soporte técnico</option>
                  <option>Solicitar demo</option>
                  <option>Facturación</option>
                </select>
              </label>

              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-semibold">Mensaje</span>
                <textarea
                  rows={5}
                  value={form.mensaje}
                  onChange={handleChange("mensaje")}
                  placeholder="Cuéntanos cómo podemos ayudarte..."
                  required
                  className="rounded-xl border border-[var(--adamia-blue)]/20 px-3 py-3 outline-none transition focus:border-[var(--adamia-blue)]"
                />
              </label>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="inline-flex items-center rounded-xl bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] px-6 py-3 font-bold text-white shadow-lg transition hover:-translate-y-0.5"
                >
                  Enviar por WhatsApp →
                </button>
                <p className="mt-3 text-xs text-[var(--adamia-text-secondary)]">
                  Al enviar, aceptas nuestro{" "}
                  <Link
                    href="/politicas"
                    className="text-[var(--adamia-blue)] underline"
                  >
                    Aviso de Privacidad
                  </Link>
                  .
                </p>
              </div>
            </form>
          </article>
        </div>
      </section>
    </main>
  );
}
