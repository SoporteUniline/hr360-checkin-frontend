// Cara sintética para pruebas: 68 puntos (orden de face-api / iBUG) de un modelo 3D sencillo, girado y proyectado.
// giro > 0: la persona gira a SU izquierda (en el cuadro sin espejo la nariz se va a la derecha). arriba > 0: sube la cara.
// Lo usan scripts/test-rostro-poses.mjs y los verify en navegador (se inyecta como texto con caraSinteticaFuente).
export function puntosCara({ giro = 0, arriba = 0, x = 320, y = 240, escala = 10 } = {}) {
  const modelo = [];
  for (let i = 0; i <= 16; i += 1) {
    const t = (i / 16) * Math.PI;
    modelo.push([-7 * Math.cos(t), 1 + 8 * Math.sin(t) * 0.9 + (i > 4 && i < 12 ? 1 : 0), -4 + 3 * Math.sin(t)]);
  } // mandíbula 0–16
  for (let i = 0; i < 5; i += 1) modelo.push([-5 + i, -2, 0.5]); // ceja 17–21
  for (let i = 0; i < 5; i += 1) modelo.push([1 + i, -2, 0.5]); // ceja 22–26
  for (let i = 0; i < 4; i += 1) modelo.push([0, -0.5 + i * 1.5, 0.6 + i * 0.6]); // puente de la nariz 27–30 (30 = punta)
  modelo[30] = [0, 4.5, 2.5];
  for (let i = 0; i < 5; i += 1) modelo.push([-2 + i, 5.2, 1.2]); // base de la nariz 31–35
  const ojo = (cx) => [
    [cx - 1.2, 0, 0],
    [cx - 0.6, -0.4, 0],
    [cx + 0.6, -0.4, 0],
    [cx + 1.2, 0, 0],
    [cx + 0.6, 0.4, 0],
    [cx - 0.6, 0.4, 0],
  ];
  modelo.push(...ojo(-3.2), ...ojo(3.2)); // ojos 36–41 y 42–47
  for (let i = 0; i < 12; i += 1) {
    const t = (i / 12) * 2 * Math.PI;
    modelo.push([2.5 * Math.cos(t), 7 + 0.8 * Math.sin(t), 1.2]);
  } // boca 48–59
  for (let i = 0; i < 8; i += 1) {
    const t = (i / 8) * 2 * Math.PI;
    modelo.push([1.5 * Math.cos(t), 7 + 0.3 * Math.sin(t), 1.2]);
  } // boca 60–67
  const g = (giro * Math.PI) / 180,
    a = (arriba * Math.PI) / 180;
  return modelo.map(([px, py, pz]) => {
    const x1 = px * Math.cos(g) + pz * Math.sin(g),
      z1 = -px * Math.sin(g) + pz * Math.cos(g);
    const y1 = py * Math.cos(a) - z1 * Math.sin(a);
    return { x: x + x1 * escala, y: y + y1 * escala };
  });
}
export const caraSinteticaFuente = puntosCara.toString();
