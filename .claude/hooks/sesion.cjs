#!/usr/bin/env node
// SessionStart: carga la constitución Uniline y el estado de /docs en cada sesión.
'use strict';
const fs = require('fs');
const path = require('path');

const raiz = process.env.CLAUDE_PLUGIN_ROOT || path.join(__dirname, '..');
const proyecto = process.env.CLAUDE_PROJECT_DIR || process.cwd();
// Enrutador breve: la constitución íntegra vive en core/principios.md y en los agentes.
// No inyectar otra copia completa en cada inicio de sesión.
let out = '[Uniline Agents v3] Prioridades: proteger datos, respetar autorizaciones, verificar hechos. AutoPrompter conversa naturalmente; antes de cambiar algo material investiga impactos y reglas. Carga principios/skills pertinentes bajo demanda. UX SaaS: ux-ui-jerarquia-saas.\\n';

const docs = path.join(proyecto, 'docs');
const estado = path.join(docs, '00-estado.md');
if (fs.existsSync(estado) || fs.existsSync(path.join(docs, '00-mapa.md'))) {
  out += '\n\n## Estado del proyecto\nExiste /docs. Continúa desde /docs/00-estado.md; antes de cualquier cambio lee /docs/00-mapa.md y el módulo afectado.\n';
  try {
    let e = fs.readFileSync(estado, 'utf8');
    if (e.length > 1500) e = e.slice(0, 1500) + '\n…(truncado, lee el archivo completo)';
    out += '\n### /docs/00-estado.md\n' + e + '\n';
  } catch {}
  try {
    const p = fs.readFileSync(path.join(docs, 'preguntas.md'), 'utf8');
    const abiertas = (p.match(/·\s*ABIERTA/g) || []).length;
    if (abiertas) out += `Hay ${abiertas} preguntas ABIERTAS en /docs/preguntas.md.\n`;
  } catch {}
} else {
  out += '\n\n## Estado del proyecto\nNo existe /docs. Si se va a trabajar en este proyecto, sugiere /iniciar.\n';
}
out += '\nContinuidad: lee solo documentos relevantes; no inventes resultados; checkpoint tras hitos importantes.\n';
out += '\nComandos Uniline: /iniciar /disenar /modulo /proponer /inventario /auditar /reauditar /cambio /corregir /probar /respuestas /estado /autoprompt /evaluar\n';
process.stdout.write(out);
