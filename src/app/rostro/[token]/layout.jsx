// Página pública del celular para registrar el rostro con el enlace de RH (05/12/2026). Sin sesión: el enlace es la
// credencial, así que no se indexa y no se manda como «referer» a ningún sitio.
export const metadata = {
  title: "Registrar mi rostro · ADAMIA",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function Layout({ children }) {
  return children;
}
