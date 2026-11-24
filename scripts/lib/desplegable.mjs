// Ayudas de Playwright para SelectConIconos (src/components/ui/SelectConIconos.jsx, Radix Select): el desplegable de
// fondo blanco que reemplazó a los <select> nativos. Se abre el combobox y se elige la opción como lo haría una persona.
//   await elegir(page.getByLabel("Qué pasó de Ana Ruiz"), "2");              // por valor (data-valor de la opción)
//   await elegir(dlg.getByLabel("Motivo"), { label: "Permiso personal" });   // por texto visible
//   await valorDe(combo)  → valor actual ("" = sin valor) · await textosOpciones(combo) → textos de las opciones
const MENU = "[data-select-con-iconos]";

async function abrir(combo) {
  const page = combo.page();
  if (!(await page.locator(MENU).count())) await combo.click();
  await page.locator(MENU).waitFor({ state: "visible" });
  return page;
}

export async function elegir(combo, opcion) {
  const page = await abrir(combo);
  const op = opcion && typeof opcion === "object"
    ? page.locator(`${MENU} [role=option]`).filter({ has: page.getByText(opcion.label, { exact: true }) })
    : page.locator(`${MENU} [role=option][data-valor="${String(opcion)}"]`);
  await op.first().click();
  await page.locator(MENU).waitFor({ state: "detached" });
}

export const valorDe = (combo) => combo.getAttribute("data-valor");

export async function textosOpciones(combo) {
  const page = await abrir(combo);
  const textos = (await page.locator(`${MENU} [role=option]`).allInnerTexts()).map((t) => t.split("\n")[0].trim());
  await page.keyboard.press("Escape");
  await page.locator(MENU).waitFor({ state: "detached" });
  return textos;
}

// Títulos de los grupos del desplegable (p. ej. «Corrección»).
export async function gruposOpciones(combo) {
  const page = await abrir(combo);
  const grupos = (await page.locator(`${MENU} [data-grupo]`).allTextContents()).map((t) => t.trim());
  await page.keyboard.press("Escape");
  await page.locator(MENU).waitFor({ state: "detached" });
  return grupos;
}
