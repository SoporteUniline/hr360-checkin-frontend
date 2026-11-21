// Datos del responsable de ADAMIA para los documentos legales (de su Constancia de Situación Fiscal, 21/11/2026).
// Solo lo que piden los documentos: nombre, domicilio y RFC (este último solo en Términos). Nunca la CURP.
// Un valor null se muestra como «Pendiente» y activa el aviso de borrador en la página.
export const RESPONSABLE = {
  nombre: "Diego Alonso León de Dios",
  calidad: "persona física con actividad empresarial, que opera la plataforma y la marca ADAMIA",
  rfc: "LEDD900608JE9",
  domicilio: "Calle 5 de Mayo número 9, colonia Jardines Autlán, C.P. 48902, Autlán de Navarro, Jalisco, México",
  correoPrivacidad: null, // ❓ PENDIENTE: correo para solicitudes de privacidad (p. ej. privacidad@adamia.com.mx)
  jurisdiccion: null, // ❓ PENDIENTE: ciudad de los tribunales competentes para los Términos
  sitio: "https://adamia.com.mx",
};

export const pendiente = (valor, que) => valor ?? `[Pendiente: ${que}]`;
export const hayPendientes = () => !RESPONSABLE.correoPrivacidad || !RESPONSABLE.jurisdiccion;
