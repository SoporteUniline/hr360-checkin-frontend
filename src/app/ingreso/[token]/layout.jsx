// Liga pública del nuevo ingreso (Inducción digital). Sin sesión: la liga es la credencial, así que no se indexa y no se
// manda como «referer» a ningún sitio (los enlaces a videos o PDF de la empresa no reciben el token).
export const metadata = {
  title: "Completa tu ingreso · ADAMIA",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function Layout({ children }) {
  return children;
}
