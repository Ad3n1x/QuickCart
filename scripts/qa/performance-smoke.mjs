import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const base = "http://127.0.0.1:4174";
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", "4174", "--strictPort"], {
  stdio: "ignore",
  env: process.env
});

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(base);
      if (response.ok) return;
    } catch {}
    await delay(500);
  }
  throw new Error("Vite preview did not become ready.");
}

try {
  await waitForServer();
  const samples = [];
  const started = Date.now();
  const requests = Array.from({ length: 40 }, async (_, index) => {
    const start = performance.now();
    const response = await fetch(base + (index % 2 ? "/store/qa-store" : "/"));
    const elapsed = performance.now() - start;
    if (!response.ok) throw new Error("Preview request failed with HTTP " + response.status);
    const html = await response.text();
    if (!html.includes("<div id=\"root\">")) throw new Error("SPA shell missing from preview response.");
    samples.push(elapsed);
  });
  await Promise.all(requests);
  samples.sort((a, b) => a - b);
  const p95 = samples[Math.ceil(samples.length * 0.95) - 1];
  const total = Date.now() - started;
  console.log(JSON.stringify({ requests: samples.length, p95_ms: Math.round(p95), total_ms: total, target_p95_ms: 4000 }, null, 2));
  if (p95 > 4000) throw new Error("Preview p95 exceeded the 4-second smoke threshold.");
} finally {
  server.kill("SIGTERM");
}
