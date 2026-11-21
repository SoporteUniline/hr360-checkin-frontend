// Enlaces del sitio público: los usan el encabezado y el pie (una sola lista para no perder páginas).
export const MENU = [
  { href: "/funcionalidades", texto: "Funciones" },
  { href: "/cotiza", texto: "Cotizar" },
  { href: "/#ley", texto: "Ley 2027" },
  { href: "/blog", texto: "Blog" },
  { href: "/quienes-somos", texto: "Nosotros" },
];

export const PIE = [
  {
    titulo: "Producto",
    enlaces: [
      { href: "/funcionalidades", texto: "Todas las funciones" },
      { href: "/funcionalidades/reloj-checador", texto: "Reloj checador" },
      { href: "/funcionalidades/colaboradores", texto: "Colaboradores" },
      { href: "/funcionalidades/contratos", texto: "Contratos" },
      { href: "/funcionalidades/notificaciones-reglas", texto: "Notificaciones y reglas" },
      { href: "/funcionalidades/dashboard-empleados", texto: "Dashboard de empleados" },
    ],
  },
  {
    titulo: "Planes",
    enlaces: [
      { href: "/cotiza", texto: "Cotizar" },
      { href: "/contratar-plan", texto: "Contratar" },
      { href: "/contacto", texto: "Solicitar demo" },
    ],
  },
  {
    titulo: "Recursos",
    enlaces: [
      { href: "/blog", texto: "Blog" },
      { href: "/blog/registro-electronico-jornada-2027", texto: "Guía Ley 2027" },
      { href: "/calculadora-aguinaldos", texto: "Calculadora de aguinaldos" },
      { href: "/bolsa-de-trabajo", texto: "Bolsa de trabajo" },
    ],
  },
  {
    titulo: "Empresa",
    enlaces: [
      { href: "/quienes-somos", texto: "Quiénes somos" },
      { href: "/contacto", texto: "Contacto" },
    ],
  },
  {
    titulo: "Legal",
    enlaces: [
      { href: "/aviso-privacidad", texto: "Aviso de privacidad" },
      { href: "/terminos-condiciones", texto: "Términos y condiciones" },
      { href: "/politicas", texto: "Políticas" },
    ],
  },
];
