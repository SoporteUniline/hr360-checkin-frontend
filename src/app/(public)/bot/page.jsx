"use client";

import { useEffect, useRef, useState } from "react";

const sugerencias = [
  "Quiero cotizar un plan",
  "Tenemos 35 empleados",
  "¿Qué incluye ADAMIA?",
  "¿Cómo puedo contratar?",
];

const respuestasFallback = [
  {
    match:
      /que es adamia|qué es adamia|quien es adamia|quién es adamia|de que trata/i,
    text: "ADAMIA es una plataforma web de Recursos Humanos que centraliza asistencias, empleados, vacaciones, contratos y reportes. Si quieres, te explico cada modulo o te cotizo por numero de empleados.",
  },
  {
    match: /cotiz|precio|costo|plan/i,
    text: "Claro, te ayudo a cotizar. Dime cuántos empleados tienen en tu empresa.",
  },
  {
    match: /funcion|incluye|ofrece|hace/i,
    text: "ADAMIA incluye reloj checador facial + GPS, asistencias, vacaciones, expedientes y reportes. ¿Cuántos empleados tienen para cotizarte?",
  },
  {
    match: /contratar|comprar|prueba/i,
    text: "Puedes iniciar aquí: https://planes.hr360.mx/contratar-plan o cotizar en https://planes.hr360.mx/cotiza",
  },
  {
    match: /contacto|soporte|whatsapp/i,
    text: "Te apoyamos en sistema@adamia.mx o WhatsApp +52 317 128 8029.",
  },
];

export default function BotPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hola, soy el asistente comercial de ADAMIA. Te ayudo con funciones, precios y contratación. ¿Cuántos empleados tienen en tu empresa?",
    },
  ]);

  const resolveFallback = (text) => {
    const found = respuestasFallback.find((item) => item.match.test(text));
    return (
      found?.text ||
      "Gracias por tu mensaje. Si quieres, te cotizo según tu número de empleados."
    );
  };

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const sendMessage = async (preset) => {
    const message = (preset ?? input).trim();
    if (!message || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: message }]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.slice(-8).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        text: m.text,
      }));
      const response = await fetch("/api/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history,
          context: "sales",
        }),
      });

      const data = await response.json();
      if (response.ok && data?.message) {
        setMessages((prev) => [...prev, { role: "bot", text: data.message }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "bot", text: resolveFallback(message) },
        ]);
      }
    } catch (_error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "No pude conectar con el servicio en este momento. Puedes escribir a sistema@adamia.mx.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-[var(--adamia-bg-light)] py-6 text-[var(--adamia-text-primary)] sm:py-10">
      <section className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <article className="overflow-hidden rounded-2xl border border-[var(--adamia-blue)]/20 bg-white shadow-xl sm:rounded-3xl">
          {/* Header visual del bot */}
          <header className="bg-gradient-to-r from-[var(--adamia-blue)] to-[var(--adamia-purple)] px-4 py-4 text-white sm:px-6 sm:py-5">
            <h1 className="text-2xl font-black sm:text-3xl">
              🤖 Bot Comercial ADAMIA
            </h1>
            <p className="mt-1 text-base text-white/90 sm:text-sm">
              Resuelve dudas rápidas sobre funciones, precios y contratación.
            </p>
          </header>

          <div className="border-b border-[var(--adamia-blue)]/10 px-3 py-3 sm:px-4">
            <div className="flex flex-wrap gap-2">
              {sugerencias.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => sendMessage(item)}
                  className="rounded-full border border-[var(--adamia-blue)]/20 bg-[var(--adamia-bg-light)] px-3 py-1 text-xs font-semibold text-[var(--adamia-blue)] transition hover:bg-[var(--adamia-blue)] hover:text-white"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div
            ref={messagesRef}
            className="h-[48vh] min-h-[300px] space-y-3 overflow-y-auto bg-[var(--adamia-bg-light)] p-3 sm:h-[58vh] sm:p-4"
          >
            {messages.map((m, idx) => (
              <div
                key={`${m.role}-${idx}`}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <p
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm sm:max-w-[85%] ${
                    m.role === "user"
                      ? "bg-[var(--adamia-blue)] text-white"
                      : "border border-[var(--adamia-blue)]/15 bg-white text-[var(--adamia-text-primary)] whitespace-pre-line"
                  }`}
                >
                  {m.text}
                </p>
              </div>
            ))}

            {loading ? (
              <div className="flex justify-start">
                <p className="rounded-2xl border border-[var(--adamia-blue)]/15 bg-white px-4 py-3 text-sm">
                  Escribiendo...
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex items-stretch gap-2 border-t border-[var(--adamia-blue)]/10 bg-white p-3 sm:p-4">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              placeholder="Escribe tu pregunta..."
              className="h-11 min-w-0 flex-1 rounded-full border border-[var(--adamia-blue)]/20 px-4 outline-none transition focus:border-[var(--adamia-blue)]"
            />
            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={loading}
              className="h-11 min-w-[96px] rounded-full bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] px-5 font-semibold text-white disabled:opacity-70 sm:min-w-[108px]"
            >
              Enviar
            </button>
          </div>
        </article>
      </section>
    </main>
  );
}
