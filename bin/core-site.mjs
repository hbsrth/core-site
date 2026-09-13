#!/usr/bin/env node
/**
 * core-site — sitenin komut satırı.
 *
 *   npx core-site push-schema [dosya]   şemayı CORE'a gönderir (varsayılan core.schema.mjs | core.schema.json)
 *   npx core-site pull-schema           CORE'daki şemayı yazdırır
 *   npx core-site doctor [site-adresi]  bağlantıyı yoklar: içerik, sinyal ucu, sözleşme sürümü
 *
 * Ortam: CORE_URL, CORE_SITE_ID, CORE_API_KEY, CORE_WEBHOOK_SECRET (.env.local okunur).
 * Şema gönderimi iki sırla imzalanır: site anahtarı + sinyal sırrı. Service
 * role anahtarı gerekmez; CORE deposuna dokunulmaz.
 */
import { readFile, access } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

async function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    try {
      const text = await readFile(resolve(process.cwd(), name), "utf8");
      for (const line of text.split(/\r?\n/)) {
        if (!line || line.startsWith("#") || !line.includes("=")) continue;
        const i = line.indexOf("=");
        const key = line.slice(0, i).trim();
        let value = line.slice(i + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
        if (!(key in process.env)) process.env[key] = value;
      }
    } catch {
      /* dosya yoksa geç */
    }
  }
  const env = { url: (process.env.CORE_URL ?? "").replace(/\/+$/, ""), siteId: process.env.CORE_SITE_ID ?? "", token: process.env.CORE_API_KEY ?? "", secret: process.env.CORE_WEBHOOK_SECRET ?? "" };
  const missing = Object.entries(env).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) fail(`Eksik ortam değişkeni: ${missing.map((k) => ({ url: "CORE_URL", siteId: "CORE_SITE_ID", token: "CORE_API_KEY", secret: "CORE_WEBHOOK_SECRET" })[k]).join(", ")}`);
  return env;
}

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function loadSchema(file) {
  const candidates = file ? [file] : ["core.schema.mjs", "core.schema.js", "core.schema.json"];
  for (const c of candidates) {
    const p = resolve(process.cwd(), c);
    if (!(await exists(p))) continue;
    if (p.endsWith(".json")) return JSON.parse(await readFile(p, "utf8"));
    const mod = await import(pathToFileURL(p).href);
    return mod.schema ?? mod.default;
  }
  fail(`Şema dosyası bulunamadı (${candidates.join(", ")}).`);
}

async function pushSchema(file) {
  const env = await loadEnv();
  const schema = await loadSchema(file);
  if (!schema || !Array.isArray(schema.collections) || !Array.isArray(schema.singletons)) fail("Şema { profileId, version, features, locales, collections, singletons } biçiminde olmalı.");
  const r = await fetch(`${env.url}/api/sites/${encodeURIComponent(env.siteId)}/schema`, {
    method: "PUT",
    headers: { authorization: `Bearer ${env.token}`, "x-core-secret": env.secret, "content-type": "application/json" },
    body: JSON.stringify({ schema }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) fail(`CORE ${r.status}: ${body?.error?.message ?? body?.error ?? "şema kabul edilmedi"}${body?.error?.details ? "\n" + body.error.details.map((d) => `  - ${d.path ?? d.param}: ${d.message}`).join("\n") : ""}`);
  const d = body.diff ?? {};
  console.log(`✔ ${env.siteId}: şema yazıldı (${schema.collections.length} koleksiyon, ${schema.singletons.length} tek örnek)`);
  for (const [k, label] of [["addedCollections", "eklenen koleksiyon"], ["removedCollections", "kaldırılan koleksiyon"], ["addedFields", "eklenen alan"], ["removedFields", "kaldırılan alan"]]) if (d[k]?.length) console.log(`  ${label}: ${d[k].join(", ")}`);
  if (body.warnings?.length) for (const w of body.warnings) console.log(`  ! ${w}`);
}

async function pullSchema() {
  const env = await loadEnv();
  const r = await fetch(`${env.url}/api/sites/${encodeURIComponent(env.siteId)}/schema`, { headers: { authorization: `Bearer ${env.token}`, "x-core-secret": env.secret } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) fail(`CORE ${r.status}: ${body?.error?.message ?? "şema okunamadı"}`);
  console.log(JSON.stringify(body.schema, null, 2));
}

async function doctor(siteUrl) {
  const env = await loadEnv();
  const ok = (label, good, detail = "") => console.log(`${good ? "✔" : "✖"} ${label}${detail ? ` — ${detail}` : ""}`);
  try {
    const r = await fetch(`${env.url}/api/content/${encodeURIComponent(env.siteId)}`, { headers: { authorization: `Bearer ${env.token}` } });
    const b = await r.json().catch(() => ({}));
    ok("İçerik API'si", r.ok, r.ok ? `sözleşme ${b.contract}, ${Object.keys(b.collections ?? {}).length} koleksiyon, ${Object.keys(b.singletons ?? {}).length} tek örnek` : `HTTP ${r.status}`);
  } catch (e) {
    ok("İçerik API'si", false, e.message);
  }
  const base = (siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  try {
    const h = await fetch(`${base}/api/core/health`);
    const b = await h.json().catch(() => ({}));
    ok("Site sağlık ucu", h.ok && b.ok, h.ok ? `paket ${b.package}, sözleşme ${b.contract}, eksik: ${Object.entries(b.configured ?? {}).filter(([, v]) => !v).map(([k]) => k).join(", ") || "yok"}` : `HTTP ${h.status} (${base})`);
  } catch (e) {
    ok("Site sağlık ucu", false, `${base} ulaşılamadı: ${e.message}`);
  }
  try {
    const s = await fetch(`${base}/api/core/revalidate`, { method: "POST", headers: { authorization: `Bearer ${env.secret}`, "content-type": "application/json" }, body: JSON.stringify({ tags: [`core:${env.siteId}`] }) });
    ok("Yayın sinyali ucu", s.ok, s.ok ? "sinyal kabul edildi" : `HTTP ${s.status}`);
  } catch (e) {
    ok("Yayın sinyali ucu", false, e.message);
  }
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === "push-schema") await pushSchema(arg);
else if (cmd === "pull-schema") await pullSchema();
else if (cmd === "doctor") await doctor(arg);
else {
  console.log("Kullanım: core-site push-schema [dosya] | pull-schema | doctor [site-adresi]");
  process.exit(cmd ? 1 : 0);
}
