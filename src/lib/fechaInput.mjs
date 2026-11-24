// Valor para <input type="date">: solo acepta «AAAA-MM-DD». Si llega con hora («…T00:00:00.000Z» o «… 00:00:00») se
// toma el día tal como viene, sin convertir de zona horaria (convertir lo movería un día).
export function fechaParaInput(valor) {
  if (valor == null || valor === "") return "";
  const m = String(valor).match(/^(\d{4}-\d{2}-\d{2})(?:$|[T ])/);
  return m ? m[1] : "";
}
