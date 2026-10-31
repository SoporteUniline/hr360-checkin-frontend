const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { spawnSync } = require("node:child_process");

const browser = process.env.LAYOUT_TEST_BROWSER || [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find(candidate => fs.existsSync(candidate));

test("las filas llenan su ancho sin huecos ni cambios de orden", { skip: !browser }, () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "employee-fields-layout-"));
  const css = fs.readFileSync(path.resolve(__dirname, "../src/app/employee-fields.css"), "utf8");
  // Exercise odd/even counts, full-width boundaries, hidden controls and three columns.
  const cases = [];
  for (const columns of [2, 3]) {
    for (let count = 1; count <= 10; count++) {
      for (const fullAt of [-1, 0, Math.floor(count / 2), count - 1]) {
        cases.push(`<div class="employee-fields ${columns === 3 ? "employee-fields-three" : ""}" data-case="${columns}-${count}-${fullAt}">${Array.from({ length: count }, (_, index) => `<div class="${index === fullAt ? "sm:col-span-2" : ""}">${index}</div>`).join("")}<div style="display:none">hidden</div></div>`);
      }
    }
  }
  const html = `<!doctype html><style>*{box-sizing:border-box}body{margin:16px}.employee-fields{margin-bottom:16px}.employee-fields>div{height:48px;border:1px solid}${css}</style>${cases.join("")}<pre id="results"></pre><script>
    const failures = [];
    for (const group of document.querySelectorAll('[data-case]')) {
      const bounds = group.getBoundingClientRect();
      const children = [...group.children].filter(child => getComputedStyle(child).display !== 'none');
      const rows = [];
      for (const child of children) {
        const rect = child.getBoundingClientRect();
        const previous = rows.at(-1);
        if (previous && Math.abs(previous.top - rect.top) < 1) previous.items.push(rect);
        else rows.push({top: rect.top, items: [rect]});
      }
      let lastTop = -1;
      for (const row of rows) {
        const items = row.items;
        const gap = parseFloat(getComputedStyle(group).columnGap);
        const filled = items.reduce((sum, rect) => sum + rect.width, 0) + gap * (items.length - 1);
        if (Math.abs(filled - bounds.width) > 1 || Math.abs(items[0].left - bounds.left) > 1 || Math.abs(items.at(-1).right - bounds.right) > 1) failures.push(group.dataset.case + ': empty columns');
        if (row.top < lastTop) failures.push(group.dataset.case + ': changed order');
        for (let i = 1; i < items.length; i++) if (items[i].left < items[i-1].right) failures.push(group.dataset.case + ': overlap');
        lastTop = row.top;
      }
    }
    document.getElementById('results').textContent = JSON.stringify({width:innerWidth,cases:document.querySelectorAll('[data-case]').length,failures});
  </script>`;
  const filename = path.join(directory, "layout.html");
  fs.writeFileSync(filename, html);
  for (const width of [500, 900, 1280]) {
    const result = spawnSync(browser, [
      "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
      "--disable-background-networking", "--disable-extensions",
      `--user-data-dir=${path.join(directory, `profile-${width}`)}`,
      `--window-size=${width},900`, "--dump-dom", pathToFileURL(filename).href,
    ], { encoding: "utf8", timeout: 20000, windowsHide: true });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    const match = result.stdout.match(/<pre id="results">([^<]+)<\/pre>/);
    assert.ok(match, "Browser must return measured geometry");
    const measured = JSON.parse(match[1]);
    assert.equal(measured.cases, 80);
    assert.deepEqual(measured.failures, [], `Viewport ${measured.width}px`);
  }
});
