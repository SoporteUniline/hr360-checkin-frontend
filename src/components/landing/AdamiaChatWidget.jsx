"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Widget de chatbot inspirado en `Landing.txt` (solo frontend).
 * - Relación: se renderiza dentro de `MarketingLanding.jsx`.
 * - Seguridad: no renderizamos HTML arbitrario; todos los mensajes son texto plano.
 * - Objetivo: UI y flujo básico (funciones / cotización simple) sin backend.
 */
export default function AdamiaChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [badgeVisible, setBadgeVisible] = useState(true);
  const listRef = useRef(null);

  // Contexto mínimo para simular el flujo de cotización.
  const [ctx, setCtx] = useState({
    empleados: null,
    nombre: null,
    generoCotizacion: false,
  });

  const quickOptions = useMemo(
    () => [
      { text: "Ver funciones", message: "¿Qué funciones tiene ADAMIA?" },
      { text: "Cotizar plan", message: "Quiero cotizar un plan" },
      { text: "Contratar ahora", message: "¿Cómo puedo contratar?" },
    ],
    []
  );

  const [messages, setMessages] = useState(() => [
    {
      id: "welcome",
      sender: "bot",
      text: "¡Hola! Soy el asistente de ADAMIA.\n¿En qué puedo ayudarte?",
    },
  ]);

  // Auto-open (como en Landing.txt) para replicar el diseño.
  useEffect(() => {
    const t = setTimeout(() => {
      setIsOpen(true);
      setBadgeVisible(false);
    }, 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [isOpen, messages, isTyping]);

  function resetConversation() {
    setMessages([
      {
        id: "welcome",
        sender: "bot",
        text: "¡Hola! Soy el asistente de ADAMIA.\n¿En qué puedo ayudarte?",
      },
    ]);
    setCtx({ empleados: null, nombre: null, generoCotizacion: false });
    setInput("");
    setIsTyping(false);
    setBadgeVisible(true);
  }

  function closeChat() {
    setIsOpen(false);
  }

  function openChat() {
    setIsOpen(true);
    setBadgeVisible(false);
  }

  async function send(text) {
    const clean = (text ?? input).trim();
    if (!clean) return;

    setBadgeVisible(false);
    setInput("");

    const userMsg = {
      id: crypto.randomUUID(),
      sender: "user",
      text: clean,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Simulación de "typing"
    setIsTyping(true);
    await wait(650);

    const { nextCtx, reply } = buildBotReply(clean, ctx);
    setCtx(nextCtx);

    const botMsg = {
      id: crypto.randomUUID(),
      sender: "bot",
      text: reply,
    };
    setMessages((prev) => [...prev, botMsg]);
    setIsTyping(false);
  }

  return (
    <div className="fixed bottom-5 right-5 z-[60] font-sans">
      {/* Toggle button */}
      <Button
        type="button"
        onClick={() => (isOpen ? closeChat() : openChat())}
        className={cn(
          "h-14 w-14 rounded-full p-0",
          "bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)]",
          "shadow-[0_10px_30px_rgba(37,99,235,0.35)] hover:shadow-[0_14px_38px_rgba(37,99,235,0.45)]",
          isOpen && "opacity-0 pointer-events-none sm:opacity-100 sm:pointer-events-auto"
        )}
        aria-label={isOpen ? "Cerrar chat" : "Abrir chat"}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {badgeVisible ? (
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-red-500 text-[11px] font-bold text-white">
            1
          </span>
        ) : null}
      </Button>

      {/* Window */}
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={cn(
              "fixed inset-0 z-[59] flex flex-col bg-white",
              "sm:inset-auto sm:bottom-[88px] sm:right-5 sm:h-[650px] sm:w-[420px] sm:max-h-[calc(100vh-120px)] sm:rounded-2xl sm:shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Chat ADAMIA"
          >
            {/* Header */}
            <div className="flex h-16 items-center justify-between bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] px-4 text-white sm:h-[70px] sm:rounded-t-2xl">
              <div className="flex min-w-0 items-center gap-3">
                <Image
                  src="/assets/logo.png"
                  alt="ADAMIA"
                  width={36}
                  height={36}
                  className="h-9 w-9 object-contain"
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold sm:text-[15px]">
                    Asistente ADAMIA
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-white/90 sm:text-xs">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 adamia-dot-pulse" />
                    <span>En línea</span>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  resetConversation();
                  closeChat();
                }}
                className="h-11 w-11 rounded-xl bg-white/15 p-0 text-white hover:bg-white/25 sm:h-9 sm:w-9 sm:bg-white/10"
                aria-label="Cerrar chat"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Messages */}
            <div
              ref={listRef}
              className="flex flex-1 flex-col gap-3 overflow-y-auto bg-[var(--adamia-bg-light)] p-4"
            >
              {messages.map((m) =>
                m.sender === "bot" ? (
                  <div key={m.id} className="flex w-full">
                    <div className="flex max-w-[85%] gap-2">
                      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] text-sm">
                        🤖
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm leading-relaxed text-[var(--adamia-text-primary)] shadow-sm whitespace-pre-line">
                        {m.text}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="flex w-full justify-end">
                    <div className="max-w-[85%] rounded-xl bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] px-4 py-2 text-sm leading-relaxed text-white shadow-sm whitespace-pre-line">
                      {m.text}
                    </div>
                  </div>
                )
              )}

              {/* Quick options (solo cuando hay solo el mensaje inicial) */}
              {messages.length === 1 && !isTyping ? (
                <div className="mt-2 grid gap-2">
                  {quickOptions.map((q) => (
                    <button
                      key={q.text}
                      type="button"
                      onClick={() => send(q.message)}
                      className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-[13px] font-semibold text-[var(--adamia-text-primary)] transition active:scale-[0.99] active:border-[var(--adamia-blue)]"
                    >
                      <span className="text-lg">💬</span>
                      <span className="flex-1">{q.text}</span>
                      <span className="text-xs text-[var(--adamia-text-secondary)]">
                        →
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {isTyping ? (
                <div className="flex w-full">
                  <div className="flex max-w-[85%] gap-2">
                    <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] text-sm">
                      🤖
                    </div>
                    <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                      <span className="adamia-typing-dot" />
                      <span className="adamia-typing-dot adamia-typing-dot-2" />
                      <span className="adamia-typing-dot adamia-typing-dot-3" />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-4 py-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
                placeholder="Escribe tu pregunta..."
                className="h-11 rounded-full"
                disabled={isTyping}
                aria-label="Escribe tu pregunta"
              />
              <Button
                type="button"
                onClick={() => send()}
                disabled={isTyping || !input.trim()}
                className="h-11 w-11 rounded-full p-0 bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)]"
                aria-label="Enviar"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-[var(--adamia-bg-light)] px-4 py-2 text-center text-[11px] text-slate-400 sm:rounded-b-2xl">
              Powered by ADAMIA UI
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Respuestas “rule-based” para UI.
 * Importante: esto NO sustituye tu backend/IA; es solo para tener interacción en la landing.
 */
function buildBotReply(userText, ctx) {
  const t = userText.toLowerCase();

  // Helpers
  const empleadosDetectados = extractEmployees(userText);
  const nombreDetectado = extractName(userText);

  // 1) Funciones
  if (t.includes("funcion") || t.includes("hace") || t.includes("ofrece")) {
    return {
      nextCtx: ctx,
      reply:
        "ADAMIA incluye:\n- Reloj checador facial + GPS (anti-fraude)\n- Gestión de empleados\n- Vacaciones y permisos\n- Reportes en tiempo real\n- Apps móviles (iOS/Android)\n\n¿Quieres que te ayude a cotizar?",
    };
  }

  // 2) Contratar
  if (t.includes("contratar") || t.includes("comprar") || t.includes("prueba")) {
    return {
      nextCtx: ctx,
      reply:
        "Puedes iniciar tu prueba gratis aquí:\nhttps://planes.hr360.mx/contratar-plan\n\nSi me dices cuántos empleados tienes, te doy una referencia rápida.",
    };
  }

  // 3) Inicio de cotización
  const quiereCotizar =
    t.includes("cotiz") || t.includes("precio") || t.includes("costo") || t.includes("plan");

  // Si detectamos empleados en el mensaje, guardamos y pedimos nombre si falta.
  if (empleadosDetectados && !ctx.empleados) {
    const nextCtx = { ...ctx, empleados: empleadosDetectados };
    if (!ctx.nombre) {
      return {
        nextCtx,
        reply: `Perfecto: ${empleadosDetectados} empleados.\n¿Me dices tu nombre para personalizar la cotización?`,
      };
    }
  }

  // Si detectamos nombre, guardamos.
  if (nombreDetectado && !ctx.nombre) {
    const nextCtx = { ...ctx, nombre: nombreDetectado };
    if (!ctx.empleados) {
      return {
        nextCtx,
        reply: `Mucho gusto, ${nombreDetectado}.\n¿Cuántos empleados tienen en tu empresa?`,
      };
    }
  }

  // Si quiere cotizar y no tenemos empleados aún, preguntamos.
  if (quiereCotizar && !ctx.empleados && !empleadosDetectados) {
    return {
      nextCtx: ctx,
      reply: "Claro. ¿Para cuántos empleados necesitas ADAMIA?",
    };
  }

  // Si ya tenemos nombre + empleados, generamos una referencia.
  const empleadosFinal = empleadosDetectados || ctx.empleados;
  const nombreFinal = nombreDetectado || ctx.nombre;
  if (empleadosFinal && nombreFinal && (quiereCotizar || t.match(/^\d+$/))) {
    const { mensual, semestral, anual } = fakeQuote(empleadosFinal);
    const reply =
      `${nombreFinal}, esta es una referencia para ${empleadosFinal} empleados:\n` +
      `- Mensual: $${mensual}/mes\n` +
      `- Semestral (10% off): $${semestral}/mes\n` +
      `- Anual (20% off): $${anual}/mes\n\n` +
      `Si quieres, puedes iniciar la prueba aquí:\nhttps://planes.hr360.mx/contratar-plan`;

    return {
      nextCtx: { ...ctx, empleados: empleadosFinal, nombre: nombreFinal, generoCotizacion: true },
      reply,
    };
  }

  // Respuesta fallback
  return {
    nextCtx: { ...ctx, empleados: empleadosFinal ?? ctx.empleados, nombre: nombreFinal ?? ctx.nombre },
    reply:
      "Te puedo ayudar con:\n- Funciones de ADAMIA\n- Cómo contratar\n- Cotizar según empleados\n\n¿Buscas funciones o cotización?",
  };
}

function extractEmployees(text) {
  const onlyNumber = text.trim().match(/^(\d{1,6})$/);
  if (onlyNumber) return clampInt(parseInt(onlyNumber[1], 10), 1, 500000);

  const m = text.match(/(\d{1,6})\s*(empleado|usuarios|personas|trabajadores|colaboradores)/i);
  if (m) return clampInt(parseInt(m[1], 10), 1, 500000);

  return null;
}

function extractName(text) {
  const t = text.trim();
  if (t.length < 2 || t.length > 50) return null;
  if (/\d/.test(t)) return null;

  const m = t.match(/^(?:me llamo|soy|mi nombre es)\s+(.+)$/i);
  if (m?.[1]) {
    const name = m[1].trim();
    if (name.length >= 2 && name.length <= 50 && !/\d/.test(name)) return name;
  }

  // Nombre simple (1-3 palabras)
  if (/^[a-záéíóúñ]+(?:\s+[a-záéíóúñ]+){0,2}$/i.test(t)) return t;
  return null;
}

function fakeQuote(empleados) {
  // Referencia simple: escalamiento sub-lineal para que se vea “realista” en UI.
  const base = 39; // base por empleado (referencia)
  const factor = Math.max(0.55, 1 - Math.log10(Math.max(1, empleados)) / 6);
  const mensual = Math.round(empleados * base * factor);
  return {
    mensual: mensual.toLocaleString("es-MX"),
    semestral: Math.round(mensual * 0.9).toLocaleString("es-MX"),
    anual: Math.round(mensual * 0.8).toLocaleString("es-MX"),
  };
}

function clampInt(n, min, max) {
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}

