"use client";

import { useMemo, useState } from "react";

const sugerencias = [
  "¿Qué datos personales recopila ADAMIA?",
  "¿Cómo ejerzo mis derechos ARCO?",
  "¿Qué son datos sensibles?",
  "¿Cómo contacto al área de privacidad?",
];

const respuestasFallback = [
  {
    match: /arco|derechos/i,
    text: "Puedes ejercer tus derechos ARCO escribiendo a privacidad@adamia.mx con tu nombre, correo, solicitud y un medio de contacto.",
  },
  {
    match: /sensibles|biom[eé]tric|gps/i,
    text: "Los datos sensibles (por ejemplo, biométricos o de ubicación) se tratan con consentimiento expreso y medidas reforzadas de seguridad.",
  },
  {
    match: /datos|recopila/i,
    text: "Recabamos datos de identificación, contacto, operación laboral y uso de plataforma para brindar el servicio de ADAMIA.",
  },
  {
    match: /contacto|privacidad/i,
    text: "Puedes contactar al equipo de privacidad en privacidad@adamia.mx y al equipo de soporte en soporte@adamia.mx.",
  },
];

export default function BotPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hola, soy el asistente de privacidad de ADAMIA. Puedo ayudarte con datos personales, ARCO, seguridad y políticas. ¿Qué te gustaría consultar?",
    },
  ]);

  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_PRIVACY_BOT_URL || "",
    []
  );

  const resolveFallback = (text) => {
    const found = respuestasFallback.find((item) => item.match.test(text));
    return (
      found?.text ||
      "Gracias por tu mensaje. Para una atención detallada, escríbenos a privacidad@adamia.mx."
    );
  };

  const sendMessage = async (preset) => {
    const message = (preset ?? input).trim();
    if (!message || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: message }]);
    setInput("");
    setLoading(true);

    try {
      if (endpoint) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        });

        const data = await response.json();
        if (data?.message) {
          setMessages((prev) => [...prev, { role: "bot", text: data.message }]);
        } else {
          setMessages((prev) => [
            ...prev,
            { role: "bot", text: resolveFallback(message) },
          ]);
        }
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
          text: "No pude conectar con el servicio en este momento. Puedes escribir a privacidad@adamia.mx.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-[var(--adamia-bg-light)] py-12 text-[var(--adamia-text-primary)]">
      <section className="mx-auto w-full max-w-3xl px-6">
        <article className="overflow-hidden rounded-3xl border border-[var(--adamia-blue)]/20 bg-white shadow-xl">
          {/* Header visual del bot */}
          <header className="bg-gradient-to-r from-[var(--adamia-blue)] to-[var(--adamia-purple)] px-6 py-5 text-white">
            <h1 className="text-xl font-black">🔒 Bot de Privacidad ADAMIA</h1>
            <p className="mt-1 text-sm text-white/90">
              Resuelve dudas rápidas sobre datos personales y políticas.
            </p>
          </header>

          <div className="border-b border-[var(--adamia-blue)]/10 px-4 py-3">
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

          <div className="max-h-[58vh] space-y-3 overflow-y-auto bg-[var(--adamia-bg-light)] p-4">
            {messages.map((m, idx) => (
              <div
                key={`${m.role}-${idx}`}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <p
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    m.role === "user"
                      ? "bg-[var(--adamia-blue)] text-white"
                      : "border border-[var(--adamia-blue)]/15 bg-white text-[var(--adamia-text-primary)]"
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

          <div className="flex gap-2 border-t border-[var(--adamia-blue)]/10 bg-white p-4">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              placeholder="Escribe tu pregunta sobre privacidad..."
              className="h-11 flex-1 rounded-full border border-[var(--adamia-blue)]/20 px-4 outline-none transition focus:border-[var(--adamia-blue)]"
            />
            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={loading}
              className="h-11 rounded-full bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] px-5 font-semibold text-white disabled:opacity-70"
            >
              Enviar
            </button>
          </div>
        </article>
      </section>
    </main>
  );
}
