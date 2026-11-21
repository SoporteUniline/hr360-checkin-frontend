import Link from "next/link";

// Sección «La ley» de la portada. Datos del decreto publicado en el DOF el 1 de mayo de 2026
// (fuentes en src/lib/blog/articulos.js). Las cifras con data-to cuentan desde 0 al verse (animaciones.js).
export default function SeccionLey() {
  return (
    <section className="fullband ley" id="ley">
      <div className="wrap">
        <div className="ley-grid reveal" id="ley-block">
          <div className="ley-txt">
            <span className="eyebrow">Reforma LFT · DOF 1 de mayo de 2026</span>
            <h2>El registro digital de la jornada ya es ley.</h2>
            <p>
              El artículo 132, fracción XXXIV, obliga a registrar de forma electrónica la hora de entrada y salida
              de cada trabajador y a entregarla a la autoridad cuando la pida. Las reglas de la STPS rigen desde el
              1 de enero de 2027.
            </p>
            <ul className="ley-puntos">
              <li><b>Electrónico</b>, no en papel ni en Excel.</li>
              <li><b>De cada persona</b>, con inicio y fin de su jornada.</li>
              <li><b>Disponible</b> cuando la autoridad lo requiera.</li>
            </ul>
            <div className="ctas" style={{ justifyContent: "flex-start" }}>
              <Link className="btn btn-primary" href="/blog/registro-electronico-jornada-2027">Leer la guía completa</Link>
              <Link className="btn btn-line" href="/blog">Ver todos los artículos</Link>
            </div>
          </div>
          <div className="ley-datos">
            <div className="multa">
              <span>Multa por no registrar la jornada</span>
              <b><span data-to={29327.5} data-fmt="mxn">$29,327.50</span></b>
              <em>a</em>
              <b className="max"><span data-to={586550} data-fmt="mxn">$586,550</span></b>
              <small>250 a 5,000 UMA (art. 994, fr. IV Bis) · UMA 2026: $117.31 diarios</small>
            </div>
            <div className="jornada">
              <span>Jornada máxima por semana</span>
              <div className="jor-cols" aria-label="48 horas en 2026, 46 en 2027, 44 en 2028, 42 en 2029 y 40 en 2030">
                {[["2026", 48], ["2027", 46], ["2028", 44], ["2029", 42], ["2030", 40]].map(([a, h], i) => (
                  <div key={a} className={a === "2027" ? "hoy" : ""} style={{ "--h": `${(h - 30) * 7}px`, "--i": i }}>
                    <i><b>{h}</b></i><span>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
