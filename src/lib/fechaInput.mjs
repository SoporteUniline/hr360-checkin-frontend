// (23/11/2026) Valor para <input type="date">: solo acepta «AAAA-MM-DD». Algunas rutas mandan la fecha con hora
// («1990-05-02T00:00:00.000Z» o «1990-05-02 00:00:00») y el campo se veía vacío. Se toma el día tal como viene,
// sin convertir de zona horaria (convertir lo movería un día).
export function fechaParaInput(valor) {
  if (valor == null || valor === "") return "";
  const m = String(valor).match(/^(\d{4}-\d{2}-\d{2})(?:$|[T ])/);
  return m ? m[1] : "";
}
