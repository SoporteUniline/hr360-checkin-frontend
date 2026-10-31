const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const postcss = require("postcss");
const tailwind = require("@tailwindcss/postcss");
const webpackPackage = require("next/dist/compiled/webpack/webpack");
webpackPackage.init();
const browser = process.env.LAYOUT_TEST_BROWSER || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

test("Select permite scroll y seleccionar la última opción dentro de un Dialog, incluso con poca altura", { skip: !fs.existsSync(browser), timeout: 60000 }, async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "select-scroll-"));
  const root = path.resolve(__dirname, "..");
  const entry = path.join(directory, "entry.js");
  const loader = path.join(directory, "loader.cjs");
  fs.writeFileSync(loader, `module.exports=function(source){const done=this.async();require(${JSON.stringify(require.resolve("next/dist/build/swc"))}).transform(source,{filename:this.resourcePath,jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}}}).then(r=>done(null,r.code),done)}`);
  fs.writeFileSync(entry, `
    const React=require('react');const {createRoot}=require('react-dom/client');
    const S=require(${JSON.stringify(path.join(root, "src/components/ui/select.jsx"))});
    const D=require(${JSON.stringify(path.join(root, "src/components/ui/dialog.jsx"))});
    function App(){return React.createElement(D.Dialog,{defaultOpen:true},React.createElement(D.DialogContent,null,
      React.createElement(D.DialogTitle,null,'Select scroll test'),React.createElement(D.DialogDescription,null,'Local test'),
      React.createElement(S.Select,{defaultValue:'0'},React.createElement(S.SelectTrigger,{id:'trigger'},React.createElement(S.SelectValue)),
        React.createElement(S.SelectContent,null,Array.from({length:80},(_,i)=>React.createElement(S.SelectItem,{key:i,value:String(i)},'Option '+i))))));}
    createRoot(document.getElementById('root')).render(React.createElement(App));`);
  await new Promise((resolve, reject) => webpackPackage.webpack({
    mode: "development", devtool: false, entry,
    output: { path: directory, filename: "bundle.js" },
    resolve: { alias: { "@": path.join(root, "src") }, extensions: [".js", ".jsx", ".json"], modules: [path.join(root, "node_modules"), "node_modules"] },
    module: { rules: [{ test: /\.jsx$/, use: loader }] },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
  const css = await postcss([tailwind({ base: root })]).process(`@import "tailwindcss"; @source "${path.join(root, "src/components/ui/select.jsx").replaceAll("\\", "/")}"; @source "${path.join(root, "src/components/ui/dialog.jsx").replaceAll("\\", "/")}";`, { from: path.join(root, "select-test.css") });
  fs.writeFileSync(path.join(directory, "style.css"), css.css);
  const html = path.join(directory, "index.html");
  fs.writeFileSync(html, '<!doctype html><link rel="stylesheet" href="style.css"><div id="root"></div><script src="bundle.js"></script>');
  const profile = path.join(directory, "profile");
  const child = spawn(browser, ["--headless=new", "--disable-gpu", "--no-first-run", "--disable-background-networking", `--user-data-dir=${profile}`, "--remote-debugging-port=0", "--window-size=900,700", pathToFileURL(html).href], { windowsHide: true, stdio: "ignore" });
  let socket;
  try {
    let port;
    for (let attempt = 0; attempt < 100; attempt++) {
      const activePort = path.join(profile, "DevToolsActivePort");
      if (fs.existsSync(activePort)) { port = fs.readFileSync(activePort, "utf8").split("\n")[0]; break; }
      await pause(100);
    }
    assert.ok(port, "Browser must start its isolated debugging endpoint");
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const target = targets.find(item => item.type === "page");
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let sequence = 0;
    const pending = new Map();
    socket.onmessage = event => { const result = JSON.parse(event.data); if (result.method === "Runtime.exceptionThrown") console.error(result.params.exceptionDetails.exception?.description); if (pending.has(result.id)) { pending.get(result.id)(result); pending.delete(result.id); } };
    const command = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, result => result.error ? reject(new Error(JSON.stringify(result.error))) : resolve(result.result));
      socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
      const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    await command("Runtime.enable");
    for (let attempt = 0; attempt < 100 && !(await evaluate("!!document.getElementById('trigger')")); attempt++) await pause(100);
    for (const height of [700, 360]) {
      await command("Emulation.setDeviceMetricsOverride", { width: 900, height, deviceScaleFactor: 1, mobile: false });
      await evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
      await evaluate("document.getElementById('trigger').focus()");
      await command("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowDown", code: "ArrowDown" });
      await command("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowDown", code: "ArrowDown" });
      await evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
      await pause(100);
      const viewport = await evaluate(`(()=>{const v=document.querySelector('[data-radix-select-viewport]');if(!v)return null;const r=v.getBoundingClientRect();return {height:v.clientHeight,scrollHeight:v.scrollHeight,x:r.left+r.width/2,y:r.top+r.height/2,bottom:r.bottom}})()`);
      assert.ok(viewport && viewport.height > 0 && viewport.scrollHeight > viewport.height, "List must have internal overflow");
      assert.ok(viewport.height <= 320 && viewport.bottom <= height, "Dropdown must fit the available viewport");
      await evaluate("document.querySelector('[data-radix-select-viewport]').scrollTop = 0");
      await command("Input.dispatchMouseEvent", { type: "mouseWheel", x: viewport.x, y: viewport.y, deltaY: 450, deltaX: 0 });
      await pause(200);
      assert.ok(await evaluate("document.querySelector('[data-radix-select-viewport]').scrollTop > 0"), "Mouse wheel must scroll inside the modal");
      await evaluate("document.querySelector('[data-radix-select-viewport]').scrollTop = 10000");
      await evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
      const last = await evaluate("(()=>{const r=[...document.querySelectorAll('[role=option]')].at(-1).getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()");
      await command("Input.dispatchMouseEvent", { type: "mouseMoved", x: last.x, y: last.y });
      await command("Input.dispatchMouseEvent", { type: "mousePressed", x: last.x, y: last.y, button: "left", clickCount: 1 });
      await command("Input.dispatchMouseEvent", { type: "mouseReleased", x: last.x, y: last.y, button: "left", clickCount: 1 });
      await pause(100);
      assert.ok((await evaluate("document.getElementById('trigger').textContent")).includes("Option 79"), "Last option must be selectable after scrolling");
    }
  } finally {
    if (socket) socket.close();
    child.kill();
  }
});
