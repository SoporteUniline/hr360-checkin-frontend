import { fetcher } from "@/lib/fetcher";

export const cards1 = [
  {
    title: "🛡️ Evita vacantes falsas",
    description:
      "Verificamos a cada empresa para proteger a los candidatos y dar legitimidad a tu marca empleadora.",
  },
  {
    title: "🤝 Genera confianza",
    description:
      "Al registrarte, proyectas profesionalismo y transparencia. ADAMIA respalda tu proceso de contratación.",
  },
  {
    title: "📢 Vacantes con validación",
    description:
      "Solo las empresas aprobadas pueden publicar ofertas. Esto eleva la calidad y credibilidad del ecosistema.",
  },
  {
    title: "✅ Talento real, sin ruido",
    description:
      "Recibe candidatos filtrados, con interés genuino, y mantén la conversación dentro de un canal seguro.",
  },
];

export const cards2 = [
  {
    title: "🎯 Publica Vacantes",
    description: "Crea ofertas laborales desde tu panel privado en segundos..",
  },
  {
    title: "📥 Recibe Postulaciones",
    description: "Conecta con candidatos directamente en tu sistema favorito.",
  },
  {
    title: "🤖 Filtros Inteligentes",
    description: "Clasifica automáticamente por perfil, experiencia y zona.",
  },
  {
    title: "📅 Entrevistas Sin Caos",
    description: "Agenda sin correos interminables. Todo desde un solo lugar.",
  },
  {
    title: "📊 Control Total",
    description: "Visualiza tu proceso de selección de principio a fin.",
  },
];

export const girosComerciales = [
  "Alimentos y Bebidas",
  "Restaurantes y Cafeterías",
  "Ropa y Accesorios",
  "Tecnología y Electrónica",
  "Servicios Profesionales",
  "Construcción e Inmobiliaria",
  "Salud y Bienestar",
  "Educación y Capacitación",
  "Automotriz",
  "Belleza y Cuidado Personal",
  "Turismo y Hotelería",
  "Entretenimiento",
  "Finanzas y Seguros",
  "Transporte y Logística",
  "Agricultura y Ganadería",
  "Artesanías y Manualidades",
  "Comercio en Línea",
  "Papelería y Artículos de Oficina",
  "Ferretería y Herramientas",
  "Servicios de Limpieza",
];

export const loadOptionsGiros = async (str) => {
  const bd_results = await fetcher(`/empresas/giros`);
  const bd_giros = bd_results.giros || [];

  const GIROS = [...new Set([...girosComerciales, ...bd_giros])];

  if (!str) return GIROS;

  try {
    const normalizar = (str) =>
      str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    const res = GIROS.filter((item) =>
      normalizar(item).includes(normalizar(str))
    );

    return res?.map((item) => ({
      label: item,
      value: item,
    }));
  } catch (err) {
    console.error("Error al buscar:", err);
    return [];
  }
};
