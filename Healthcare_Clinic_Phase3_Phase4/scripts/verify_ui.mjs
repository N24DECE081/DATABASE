// Visual checks using an isolated Chrome headless profile and native CDP.
// Requires Node 22+ and the project browser listening only on 127.0.0.1:9223.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "docs/verification/ui");
const origin = "http://127.0.0.1:5000";
const debuggerOrigin = "http://127.0.0.1:9223";
await mkdir(output, { recursive: true });
const targetResponse = await fetch(`${debuggerOrigin}/json/new?about:blank`, { method: "PUT" });
if (!targetResponse.ok) throw new Error("Project headless browser is not ready");
const target = await targetResponse.json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((yes, no) => { socket.addEventListener("open", yes, { once: true }); socket.addEventListener("error", no, { once: true }); });
let nextId = 0;
const pending = new Map();
socket.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { yes, no } = pending.get(message.id);
    pending.delete(message.id);
    message.error ? no(new Error(message.error.message)) : yes(message.result);
  }
});
function call(method, params = {}) {
  return new Promise((yes, no) => {
    const id = ++nextId;
    pending.set(id, { yes, no });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function login(username) {
  const initial = await fetch(`${origin}/auth/login`);
  const html = await initial.text();
  const csrf = html.match(/name="csrf_token"[^>]*value="([^"]+)"/);
  if (!csrf) throw new Error("Login CSRF token was not rendered");
  const initialCookie = initial.headers.getSetCookie().find(value => value.startsWith("session="))?.split(";")[0];
  const response = await fetch(`${origin}/auth/login`, { method: "POST", redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cookie": initialCookie },
    body: new URLSearchParams({ username, password: "ClinicDemo!2026", csrf_token: csrf[1] }) });
  if (response.status !== 302) throw new Error(`Synthetic login failed with HTTP ${response.status}`);
  const cookie = response.headers.getSetCookie().find(value => value.startsWith("session="));
  if (!cookie) throw new Error("Authenticated cookie missing");
  await call("Network.clearBrowserCookies");
  await call("Network.setCookie", { name: "session", value: cookie.split(";")[0].slice(8),
    domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax", secure: false });
}
const results = [];
async function capture(name, url, width = 1440, height = 1000) {
  await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 700 });
  await call("Page.navigate", { url });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    const state = await call("Runtime.evaluate", { expression: `document.readyState === 'complete' && location.href === ${JSON.stringify(url)}`, returnByValue: true });
    if (state.result.value) { ready = true; break; }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  if (!ready) throw new Error(`Page did not finish loading: ${name}`);
  await call("Runtime.evaluate", { expression: "document.fonts.ready.then(() => true)", awaitPromise: true, returnByValue: true });
  const measurement = await call("Runtime.evaluate", { expression: "({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,title:document.title})", returnByValue: true });
  const metrics = measurement.result.value;
  if (metrics.scrollWidth > width && !name.startsWith("diagram")) throw new Error(`Body overflow: ${name}`);
  const screenshot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(resolve(output, `${name}.png`), Buffer.from(screenshot.data, "base64"));
  results.push({ page: name, viewport: `${width}x${height}`, title: metrics.title, bodyOverflow: metrics.scrollWidth > width, status: "PASS" });
}
try {
  await call("Page.enable");
  await call("Network.enable");
  await capture("login-desktop", `${origin}/auth/login`);
  await login("patient_one");
  await capture("patient-desktop", `${origin}/patients/`);
  await capture("patient-mobile", `${origin}/patients/`, 390, 844);
  await login("doctor_gp");
  await capture("doctor-desktop", `${origin}/appointments/`);
  await login("admin");
  await capture("admin-desktop", `${origin}/admin/`);
  await capture("diagram-doctor", pathToFileURL(resolve(root, "docs/diagrams/doctor_specialization.svg")).href, 1000, 840);
  await writeFile(resolve(output, "results.json"), JSON.stringify(results, null, 2) + "\n");
  console.log(`PASS: ${results.length} browser screenshots; desktop/mobile body overflow checked; real CSRF login used.`);
} finally {
  socket.close();
  await fetch(`${debuggerOrigin}/json/close/${target.id}`);
}
