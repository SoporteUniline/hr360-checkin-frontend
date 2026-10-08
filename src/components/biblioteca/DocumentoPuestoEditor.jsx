"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  Undo2,
  Redo2,
  ListPlus,
  ListMinus,
  Plus,
  Trash2,
} from "lucide-react";
import { useSnackbar } from "notistack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  limpiarDocumentoPuesto,
  seccionPuesto,
} from "@/lib/documentos/puestos";

export default function DocumentoPuestoEditor({ value, onChange, disabled }) {
  const initial = useRef(value);
  const editor = useRef(null);
  const selection = useRef(null);
  const history = useRef({ past: [], future: [], current: value });
  const { enqueueSnackbar } = useSnackbar();
  const [sectionOpen, setSectionOpen] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const [structure, setStructure] = useState("texto");
  const [columns, setColumns] = useState("Actividad, Responsable, Resultado");
  const [deleteSection, setDeleteSection] = useState(null);
  useEffect(() => {
    editor.current.innerHTML = initial.current;
    const remember = () => {
      const current = window.getSelection();
      if (current?.rangeCount && editor.current?.contains(current.anchorNode))
        selection.current = current.getRangeAt(0).cloneRange();
    };
    document.addEventListener("selectionchange", remember);
    return () => document.removeEventListener("selectionchange", remember);
  }, []);
  const sync = () => {
    const html = editor.current.innerHTML;
    if (html !== history.current.current) {
      history.current.past.push(history.current.current);
      if (history.current.past.length > 60) history.current.past.shift();
      history.current.future = [];
      history.current.current = html;
    }
    onChange(html);
  };
  const travel = (redo) => {
    const from = redo ? history.current.future : history.current.past;
    const to = redo ? history.current.past : history.current.future;
    if (!from.length) return;
    to.push(history.current.current);
    const html = from.pop();
    history.current.current = html;
    editor.current.innerHTML = html;
    selection.current = null;
    onChange(html);
  };
  const restore = () => {
    editor.current.focus();
    if (
      selection.current &&
      editor.current.contains(selection.current.commonAncestorContainer)
    ) {
      const s = window.getSelection();
      s.removeAllRanges();
      s.addRange(selection.current);
    }
  };
  const command = (name, argument) => {
    if (name === "undo" || name === "redo") return travel(name === "redo");
    restore();
    document.execCommand(name, false, argument || null);
    sync();
  };
  const selectedElement = () => {
    const node = selection.current?.startContainer;
    const element = node?.nodeType === 1 ? node : node?.parentElement;
    return element && editor.current.contains(element) ? element : null;
  };
  const renumber = (table) => {
    if (table?.classList.contains("puesto-numbered"))
      Array.from(table.tBodies[0]?.rows || []).forEach((row, i) => {
        row.cells[0].textContent = String(i + 1);
      });
  };
  const rowAction = (remove) => {
    const row = selectedElement()?.closest("tr");
    if (!row || row.parentElement.tagName !== "TBODY")
      return enqueueSnackbar(
        "Selecciona una celda del contenido de la tabla.",
        { variant: "info" }
      );
    const table = row.closest("table");
    if (remove) {
      if (row.parentElement.rows.length === 1)
        return enqueueSnackbar(
          "Conserva una fila o elimina la sección completa.",
          { variant: "info" }
        );
      row.remove();
    } else {
      const newRow = document.createElement("tr");
      Array.from(row.cells).forEach((cell) => {
        const next = document.createElement(cell.tagName.toLowerCase());
        for (const name of ["colspan", "scope"])
          if (cell.hasAttribute(name))
            next.setAttribute(name, cell.getAttribute(name));
        next.appendChild(document.createElement("br"));
        newRow.appendChild(next);
      });
      row.after(newRow);
    }
    renumber(table);
    selection.current = null;
    sync();
  };
  const addSection = () => {
    if (!sectionName.trim()) return;
    const headers = columns
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean)
      .slice(0, 5);
    if (structure === "tabla" && headers.length < 2)
      return enqueueSnackbar(
        "Indica al menos dos columnas separadas por comas.",
        { variant: "info" }
      );
    const rows =
      structure === "lista"
        ? [[1, "Escribe la actividad."]]
        : structure === "campos"
        ? [["Campo", "Contenido"]]
        : structure === "tabla"
        ? [headers.map(() => "Contenido")]
        : [["Escribe el contenido de esta sección."]];
    const html = seccionPuesto(
      sectionName.trim(),
      rows,
      structure === "tabla" ? headers : [],
      structure === "lista"
        ? "puesto-numbered"
        : structure === "campos"
        ? "puesto-fields"
        : ""
    );
    const footer = editor.current.querySelector(".puesto-footer");
    if (footer) footer.insertAdjacentHTML("beforebegin", html);
    else editor.current.insertAdjacentHTML("beforeend", html);
    sync();
    setSectionOpen(false);
    setSectionName("");
  };
  const tools = [
    ["Deshacer", Undo2, "undo"],
    ["Rehacer", Redo2, "redo"],
    ["Negrita", Bold, "bold"],
    ["Cursiva", Italic, "italic"],
    ["Subrayado", Underline, "underline"],
    ["Viñetas", List, "insertUnorderedList"],
    ["Lista numerada", ListOrdered, "insertOrderedList"],
    ["Alinear a la izquierda", AlignLeft, "justifyLeft"],
    ["Centrar", AlignCenter, "justifyCenter"],
  ];
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div
        role="toolbar"
        aria-label="Formato del documento"
        className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-2"
      >
        {tools.map(([label, Icon, name]) => (
          <button
            key={name}
            type="button"
            title={label}
            aria-label={label}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => command(name)}
            className="rounded p-2 text-slate-600 hover:bg-white focus-visible:outline-blue-600 disabled:opacity-40"
          >
            <Icon size={16} />
          </button>
        ))}
        <select
          aria-label="Estilo de texto"
          disabled={disabled}
          defaultValue="p"
          onChange={(e) => command("formatBlock", e.target.value)}
          className="h-8 rounded border border-slate-200 bg-white px-2 text-xs"
        >
          <option value="p">Párrafo</option>
          <option value="h3">Subtítulo</option>
          <option value="h2">Título</option>
        </select>
        <span className="mx-1 h-5 border-l" />
        <button
          type="button"
          title="Agregar fila debajo"
          aria-label="Agregar fila debajo"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => rowAction(false)}
          className="rounded p-2 text-blue-700 hover:bg-white"
        >
          <ListPlus size={17} />
        </button>
        <button
          type="button"
          title="Eliminar fila seleccionada"
          aria-label="Eliminar fila seleccionada"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => rowAction(true)}
          className="rounded p-2 text-slate-600 hover:bg-white"
        >
          <ListMinus size={17} />
        </button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => setSectionOpen(true)}
          className="text-xs text-blue-700"
        >
          <Plus size={15} />
          Agregar sección
        </Button>
        <button
          type="button"
          title="Eliminar sección seleccionada"
          aria-label="Eliminar sección seleccionada"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const section = selectedElement()?.closest(".puesto-section");
            if (!section)
              return enqueueSnackbar(
                "Selecciona contenido dentro de la sección que deseas eliminar.",
                { variant: "info" }
              );
            setDeleteSection(section);
          }}
          className="rounded p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={16} />
        </button>
      </div>
      <div
        ref={editor}
        role="textbox"
        aria-label="Contenido del documento"
        aria-multiline="true"
        contentEditable={!disabled}
        suppressContentEditableWarning
        className="puesto-document min-h-[550px]"
        onInput={sync}
        onKeyDown={(e) => {
          if (disabled || !(e.ctrlKey || e.metaKey)) return;
          if (["z", "y"].includes(e.key.toLowerCase())) {
            e.preventDefault();
            travel(e.key.toLowerCase() === "y" || e.shiftKey);
          }
        }}
        onPaste={(e) => {
          e.preventDefault();
          const html = e.clipboardData.getData("text/html");
          if (html) command("insertHTML", limpiarDocumentoPuesto(html));
          else command("insertText", e.clipboardData.getData("text/plain"));
        }}
        onDrop={(e) => e.preventDefault()}
      />
      <Dialog open={sectionOpen} onOpenChange={setSectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar sección</DialogTitle>
            <DialogDescription>
              Define el título y la distribución del contenido.
            </DialogDescription>
          </DialogHeader>
          <label className="space-y-2 text-sm">
            Título
            <Input
              value={sectionName}
              maxLength={120}
              onChange={(e) => setSectionName(e.target.value)}
              placeholder="Ej. Indicadores de desempeño"
            />
          </label>
          <label className="space-y-2 text-sm">
            Contenido
            <select
              className="h-10 w-full rounded-md border bg-white px-3"
              value={structure}
              onChange={(e) => setStructure(e.target.value)}
            >
              <option value="texto">Texto</option>
              <option value="lista">Lista de actividades</option>
              <option value="campos">Campos y valores</option>
              <option value="tabla">Tabla con columnas</option>
            </select>
          </label>
          {structure === "tabla" && (
            <label className="space-y-2 text-sm">
              Columnas (separadas por comas)
              <Input
                value={columns}
                maxLength={200}
                onChange={(e) => setColumns(e.target.value)}
              />
            </label>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={!sectionName.trim()} onClick={addSection}>
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(deleteSection)}
        onOpenChange={(open) => !open && setDeleteSection(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar sección</DialogTitle>
            <DialogDescription>
              Se quitará «
              {deleteSection?.querySelector("h3")?.textContent || "Sección"}»
              del documento abierto. El cambio se aplica a la copia al guardar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSection(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteSection.remove();
                selection.current = null;
                setDeleteSection(null);
                sync();
              }}
            >
              Eliminar sección
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
