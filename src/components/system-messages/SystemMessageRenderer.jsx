"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetcher, swr_config } from "@/lib/fetcher";

function getFirstActiveMessage(data = []) {
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[0];
}

function getSafeStyle(colorFondo, colorTexto) {
  return {
    backgroundColor: colorFondo || "#1D4ED8",
    color: colorTexto || "#FFFFFF",
  };
}

function BandaMessage({ message, onClose, contexto = "landing" }) {
  const style = useMemo(
    () => getSafeStyle(message.color_fondo, message.color_texto),
    [message.color_fondo, message.color_texto],
  );

  return (
    <motion.div
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35 }}
      id={contexto === "landing" ? "system-message-banda" : undefined}
      className="fixed left-0 right-0 top-0 z-[90] px-3 py-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] text-sm md:text-[15px]"
      style={style}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto grid w-full max-w-7xl grid-cols-[auto_1fr_auto] items-start gap-3 rounded-xl border border-white/20 px-3 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.25)] backdrop-blur-sm">
        <span className="pt-0.5 text-base leading-none">{message.icono || "•"}</span>
        <div className="min-w-0">
          <strong className="font-semibold whitespace-pre-wrap break-words">
            {message.titulo}
          </strong>
          <div className="opacity-95 whitespace-pre-wrap break-words leading-snug">
            {message.mensaje}
          </div>
        </div>

        <div className="flex items-center gap-2 pl-1">
          {message.boton_texto && message.boton_url ? (
            <Link
              href={message.boton_url}
              className="hidden rounded-md bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25 md:inline-flex"
            >
              {message.boton_texto}
            </Link>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            aria-label="Ocultar mensaje"
            className="rounded-md p-1.5 hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function BannerMessage({ message, onClose, contexto = "landing" }) {
  const style = useMemo(
    () => getSafeStyle(message.color_fondo, message.color_texto),
    [message.color_fondo, message.color_texto],
  );

  const showCenteredOverlay =
    contexto === "landing" || contexto === "dashboard";

  if (showCenteredOverlay) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[80] overflow-y-auto touch-pan-y bg-black/55 p-3 backdrop-blur-[2px] md:p-6 [-webkit-overflow-scrolling:touch]"
      >
        <div className="mx-auto flex min-h-full w-full max-w-6xl items-start justify-center py-3 md:py-[8vh]">
          <motion.aside
            initial={{ y: 28, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 130, damping: 14 }}
            className="relative w-full max-w-2xl overflow-y-auto overscroll-contain touch-pan-y rounded-3xl border border-white/20 shadow-[0_30px_80px_rgba(0,0,0,0.45)] max-h-[calc(100dvh-1.5rem)] md:max-h-[calc(100dvh-5rem)] [-webkit-overflow-scrolling:touch]"
            style={style}
            role="dialog"
            aria-modal="true"
            aria-label="Mensaje importante"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(255,255,255,0.25),transparent_45%),radial-gradient(circle_at_90%_0%,rgba(255,255,255,0.2),transparent_38%)]"
            />

            {message.imagen_url ? (
              <div
                className="relative h-44 w-full bg-cover bg-center"
                style={{ backgroundImage: `url('${message.imagen_url}')` }}
                aria-hidden="true"
              />
            ) : null}

            <div className="relative p-5 md:p-7">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                    Anuncio importante
                  </div>
                  <div className="mt-2 text-xl md:text-2xl font-bold leading-tight">
                    {(message.icono ? `${message.icono} ` : "") + message.titulo}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar anuncio"
                  className="rounded-md p-1.5 hover:bg-black/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-base md:text-lg leading-relaxed opacity-95 whitespace-pre-wrap break-words">
                {message.mensaje}
              </p>

              {message.boton_texto && message.boton_url ? (
                <div className="mt-6 flex justify-center">
                  <Button
                    asChild
                    className="h-12 w-full max-w-[320px] rounded-xl bg-white px-8 text-base font-bold text-slate-800 shadow-[0_10px_25px_rgba(0,0,0,0.18)] transition-all hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-[0_14px_30px_rgba(0,0,0,0.24)]"
                  >
                    <Link href={message.boton_url}>{message.boton_texto}</Link>
                  </Button>
                </div>
              ) : null}
            </div>
          </motion.aside>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.aside
      initial={{ y: 40, opacity: 0, scale: 0.98 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 130, damping: 13 }}
      className="w-full md:max-w-md rounded-2xl shadow-2xl overflow-hidden"
      style={style}
      role="status"
      aria-live="polite"
    >
      {message.imagen_url ? (
        <div
          className="h-24 w-full bg-cover bg-center"
          style={{ backgroundImage: `url('${message.imagen_url}')` }}
          aria-hidden="true"
        />
      ) : null}

      <div className="p-4 md:p-5">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="text-sm md:text-base font-bold">
            {(message.icono ? `${message.icono} ` : "") + message.titulo}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Ocultar mensaje"
            className="rounded-md p-1.5 hover:bg-black/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm leading-relaxed opacity-95 whitespace-pre-wrap break-words">
          {message.mensaje}
        </p>

        {message.boton_texto && message.boton_url ? (
          <div className="mt-4">
            <Button
              asChild
              className="h-11 w-full rounded-xl bg-white text-base font-bold text-slate-800 shadow-md transition-all hover:-translate-y-0.5 hover:bg-slate-100"
            >
              <Link href={message.boton_url}>{message.boton_texto}</Link>
            </Button>
          </div>
        ) : null}
      </div>
    </motion.aside>
  );
}

export default function SystemMessageRenderer({ tipo, contexto = "landing" }) {
  const [oculto, setOculto] = useState(false);

  const { data, isLoading } = useSWR(
    tipo ? `/checador/mensajes-sistema/activos?tipo=${tipo}` : null,
    fetcher,
    swr_config,
  );

  const message = useMemo(() => getFirstActiveMessage(data), [data]);

  const shouldBlockBackground =
    (contexto === "landing" || contexto === "dashboard") &&
    message?.formato === "banner" &&
    !oculto;

  useEffect(() => {
    if (!shouldBlockBackground) return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (isMobile) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [shouldBlockBackground]);

  useEffect(() => {
    if (contexto !== "landing") return;

    const root = document.documentElement;
    const shouldOffsetNavbar = message?.formato === "banda" && !oculto;
    if (!shouldOffsetNavbar) {
      root.style.setProperty("--landing-banner-offset", "0px");
      return;
    }

    const element = document.getElementById("system-message-banda");
    if (!element) return;

    const updateOffset = () => {
      const h = Math.ceil(element.getBoundingClientRect().height);
      root.style.setProperty("--landing-banner-offset", `${h}px`);
    };

    updateOffset();
    const observer = new ResizeObserver(updateOffset);
    observer.observe(element);

    return () => {
      observer.disconnect();
      root.style.setProperty("--landing-banner-offset", "0px");
    };
  }, [contexto, message?.formato, oculto, message?.mensaje, message?.titulo]);

  if (!tipo || isLoading || oculto || !message) return null;

  if (message.formato === "banda") {
    return (
      <BandaMessage
        message={message}
        onClose={() => setOculto(true)}
        contexto={contexto}
      />
    );
  }

  return (
    <BannerMessage
      message={message}
      onClose={() => setOculto(true)}
      contexto={contexto}
    />
  );
}
