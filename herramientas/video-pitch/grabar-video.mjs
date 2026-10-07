import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const errores = []; p.on("pageerror", e => errores.push(e.message)); p.on("console", m => m.type() === "error" && errores.push(m.text()));
await p.goto("http://127.0.0.1:8080/_video/video.html");
await p.waitForTimeout(2000);
const cdp = await p.context().newCDPSession(p);
const tiempos = []; let n = 0;
cdp.on("Page.screencastFrame", async (f) => {
  writeFileSync(`video/cuadros/c${String(n).padStart(5, "0")}.jpg`, Buffer.from(f.data, "base64"));
  tiempos.push(f.metadata.timestamp); n++;
  await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080 });
const marcas = await p.evaluate(() => window.correrVideo());
await cdp.send("Page.stopScreencast");
await p.waitForTimeout(500);
let lista = "";
tiempos.forEach((t, i) => {
  const dur = i < tiempos.length - 1 ? tiempos[i + 1] - t : 0.5;
  lista += `file 'cuadros/c${String(i).padStart(5, "0")}.jpg'\nduration ${dur.toFixed(4)}\n`;
});
lista += `file 'cuadros/c${String(tiempos.length - 1).padStart(5, "0")}.jpg'\n`;
writeFileSync("video/lista.txt", lista);
const huecos = tiempos.slice(1).map((t, i) => t - tiempos[i]).filter(d => d > 0.25).length;
console.log(JSON.stringify({ cuadros: n, duracion: (tiempos.at(-1) - tiempos[0]).toFixed(1), huecosMayoresA250ms: huecos, marcas, errores: errores.filter(e => !/privy|ERR_TUNNEL|Failed to load resource/i.test(e)) }, null, 1));
await b.close();
