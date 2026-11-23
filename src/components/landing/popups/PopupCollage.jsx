// Collage de marca del pop-up (decorativo, sin fotos): píldoras en azul, violeta y lila con mini pantallas
// de lo que hace ADAMIA (checador, nómina y firma). Solo CSS y SVG; se oculta a lectores de pantalla.
export default function PopupCollage() {
  return (
    <div className="pv-collage" aria-hidden="true">
      <div className="pv-pildora pv-p1">
        <div className="pv-mini">
          <span className="pv-mini-ico pv-ico-azul">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>
          </span>
          <span className="pv-mini-txt"><b>Entrada 08:58</b><i>Checador · en tiempo</i></span>
          <span className="pv-mini-ok"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
        </div>
      </div>
      <div className="pv-pildora pv-p2">
        <svg className="pv-ico-grande" viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" /><path d="M9 12l2 2 4-4" /></svg>
      </div>
      <div className="pv-pildora pv-p3">
        <svg className="pv-ico-grande" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>
      </div>
      <div className="pv-pildora pv-p4">
        <div className="pv-mini">
          <span className="pv-mini-ico pv-ico-violeta">
            <svg viewBox="0 0 24 24"><path d="M7 3h10v18l-2.5-1.5L12 21l-2.5-1.5L7 21z" /><path d="M10 8h4M10 12h4" /></svg>
          </span>
          <span className="pv-mini-txt"><b>Recibo de nómina</b><i>Timbrado · CFDI 4.0</i></span>
        </div>
      </div>
      <div className="pv-pildora pv-p5">
        <div className="pv-mini">
          <span className="pv-mini-ico pv-ico-azul">
            <svg viewBox="0 0 24 24"><path d="M4 18c3-1 4-6 6-6s1 4 3 4 3-3 5-3" /><path d="M4 21h16" /></svg>
          </span>
          <span className="pv-mini-txt"><b>Contrato firmado</b><i>Firma electrónica</i></span>
          <span className="pv-mini-ok"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
        </div>
      </div>
      <div className="pv-pildora pv-p6" />
    </div>
  );
}
