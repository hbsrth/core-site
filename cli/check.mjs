/**
 * core-site check — kural denetimi.
 *
 * Yönerge (AGENTS.md) ne yapılacağını söyler; bu komut yapılıp
 * yapılmadığını söyler. Ajan yönergeyi unutsa da derleme buradan geçmek
 * zorunda. Ağa çıkmaz; yalnız dosyaları okur.
 *
 * Seviyeler: fail (derleme durur), warn (okunur, geçer), ok.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { BUILTIN_MODULES, ENV_KEYS, appDir, callArgs, loadEnvFiles, rel, sourceFiles, topLevelKeys } from "./shared.mjs";

export async function runCheck(root, { strict = false, ci = Boolean(process.env.CI || process.env.VERCEL) } = {}) {
  const findings = [];
  const add = (level, rule, message, file) => findings.push({ level, rule, message, file });

  /* ---- 1. Ortam: sızıntı ve eksik ---- */
  const env = loadEnvFiles(root);
  for (const key of Object.keys(env)) {
    if (/^NEXT_PUBLIC_.*(KEY|SECRET|TOKEN)/i.test(key) && /CORE/i.test(key)) add("fail", "env-leak", `${key} tarayıcıya gömülür; sır NEXT_PUBLIC_ ile başlayamaz.`, ".env*");
  }
  const missing = ENV_KEYS.filter((k) => !env[k] && !process.env[k]);
  if (missing.length) add(ci ? "warn" : "warn", "env-missing", `Tanımsız: ${missing.join(", ")} (Vercel'de proje ayarlarından; yerelde .env.local).`, ".env.local");
  if (env.CORE_API_KEY && !/^core_(live|prev)_[0-9a-f]{48}$/.test(env.CORE_API_KEY)) add("fail", "env-key", "CORE_API_KEY biçimi tanınmadı (core_live_… ya da core_prev_…).", ".env.local");

  /* ---- 2. Rota ve sağlayıcı ---- */
  const app = appDir(root);
  const routeFile = join(app, "api", "core", "[...core]", "route.ts");
  if (!existsSync(routeFile)) add("fail", "route", "app/api/core/[...core]/route.ts yok; `npx core-site init` yazar.", rel(root, routeFile));
  else if (!readFileSync(routeFile, "utf8").includes("createCoreHandlers")) add("fail", "route", "Rota createCoreHandlers() kullanmıyor.", rel(root, routeFile));
  const layoutFile = ["layout.tsx", "layout.jsx", "layout.js"].map((n) => join(app, n)).find((p) => existsSync(p));
  if (!layoutFile) add("fail", "layout", "app/layout.tsx bulunamadı.", "app/layout.tsx");
  else if (!readFileSync(layoutFile, "utf8").includes("CoreProvider")) add("fail", "layout", "layout.tsx içinde <CoreProvider> yok; canlı düzenleyici ve ziyaret sayımı çalışmaz.", rel(root, layoutFile));

  /* ---- 3. Şema ---- */
  let schema = null;
  const schemaFile = ["core.schema.mjs", "core.schema.js", "core.schema.json"].map((n) => join(root, n)).find((p) => existsSync(p));
  if (!schemaFile) add("warn", "schema-missing", "core.schema.mjs yok; site CORE'un tür varsayılanıyla çalışır, siteye özgü alan tanımlanmamış.", "core.schema.mjs");
  else {
    try {
      schema = schemaFile.endsWith(".json") ? JSON.parse(readFileSync(schemaFile, "utf8")) : (await import(`${pathToFileURL(schemaFile).href}?t=${Date.now()}`)).schema;
      if (!schema || !Array.isArray(schema.collections) || !Array.isArray(schema.singletons)) {
        add("fail", "schema-shape", "Şema { profileId, version, features, locales, collections, singletons } biçiminde `export const schema` olmalı.", rel(root, schemaFile));
        schema = null;
      }
    } catch (e) {
      add("fail", "schema-load", `Şema yüklenemedi: ${e.message}`, rel(root, schemaFile));
    }
  }
  if (schema) {
    const seen = new Set();
    for (const [kind, defs] of [["collections", schema.collections], ["singletons", schema.singletons]]) {
      defs.forEach((d, i) => {
        const where = `${rel(root, schemaFile)} › ${kind}[${i}]`;
        if (!d || typeof d.id !== "string") return add("fail", "schema-def", "Tanımın id'si yok.", where);
        if (BUILTIN_MODULES.includes(d.id)) add("fail", "schema-builtin", `"${d.id}" CORE'un gömülü modülü; şemaya yazılmaz, modules() ile okunur.`, where);
        if (seen.has(d.id)) add("fail", "schema-dup", `"${d.id}" iki kez tanımlı.`, where);
        seen.add(d.id);
        if (!Array.isArray(d.fields) || d.fields.length === 0) add("fail", "schema-fields", `"${d.id}" alan taşımıyor.`, where);
        else {
          const names = new Set();
          for (const f of d.fields) {
            if (!f || typeof f.name !== "string" || typeof f.kind !== "string") add("fail", "schema-field", `"${d.id}" içinde alan { kind, name, label } taşımalı.`, where);
            else if (names.has(f.name)) add("fail", "schema-field-dup", `"${d.id}.${f.name}" iki kez tanımlı.`, where);
            else names.add(f.name);
            if (f && f.kind === "select" && !Array.isArray(f.options)) add("fail", "schema-select", `"${d.id}.${f.name}" select ama options yok.`, where);
          }
        }
        if (kind === "collections" && d.titleField && !d.fields?.some((f) => f.name === d.titleField)) add("fail", "schema-title", `"${d.id}" titleField "${d.titleField}" alanlar arasında yok.`, where);
      });
    }
  }

  /* ---- 4. Kaynak: okuma çağrıları, çıplak metin, istemci sızıntısı ---- */
  const files = sourceFiles(root);
  const reads = []; // { id, kind, keys, file }
  const boundNames = new Map(); // file -> Set(varName)
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const where = rel(root, file);
    const isClient = /^\s*["']use client["']/m.test(src);
    if (/NEXT_PUBLIC_CORE_(API_KEY|WEBHOOK_SECRET)/.test(src)) add("fail", "env-leak", "Kodda NEXT_PUBLIC_CORE_API_KEY / SECRET geçiyor.", where);
    if (isClient && /from\s+["']@surth\/core-site\/server["']/.test(src)) add("fail", "client-server", "\"use client\" dosyası @surth/core-site/server içe aktarıyor; veri prop olarak gelmeli.", where);
    if (/process\.env\.CORE_API_KEY/.test(src) && !/route\.ts$/.test(file)) add("warn", "key-in-code", "CORE_API_KEY doğrudan okunuyor; paket bunu kendisi okur.", where);
    if (/fetch\(\s*[`"'][^`"']*\$\{?process\.env\.CORE_URL/.test(src) || /fetch\([^)]*CORE_URL/.test(src)) add("warn", "raw-fetch", "CORE'a elle fetch var; singleton()/collection() önbellekli ve etiketli okur.", where);
    if (/api\/(revalidate|enquiry|visit)\b/.test(src) && !/api\/core\//.test(src)) add("warn", "legacy-route", "Eski rota adı (/api/revalidate|enquiry|visit); paket rotası /api/core/… .", where);

    // Paket adları + eski şerit adları (getSingleton/getCollection/records): varsayılansız çağrılar da okuma sayılır.
    const re = /\b(singleton|collection|moduleRows|getSingleton|getCollection|records)(?:<[^()]*>)?\(\s*["']([\w-]+)["']\s*[,)]/g;
    let m;
    while ((m = re.exec(src))) {
      const args = callArgs(src, src.indexOf("(", m.index)) ?? "";
      const literalStart = args.includes(",") ? args.indexOf("{", args.indexOf(",")) : -1;
      let keys = null;
      if (literalStart >= 0) {
        const literal = callArgs(args, literalStart);
        if (literal !== null) keys = topLevelKeys(`{${literal}}`);
      }
      reads.push({ fn: m[1], id: m[2], keys, file: where });
      const decl = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*await\s+(?:singleton|collection|moduleRows)\(/g;
      let d;
      while ((d = decl.exec(src))) {
        if (!boundNames.has(where)) boundNames.set(where, new Set());
        boundNames.get(where).add(d[1]);
      }
    }
    // Çıplak basım: JSX metin konumunda {name.field} ya da {name.field.sub}
    const names = boundNames.get(where);
    if (names && names.size) {
      for (const name of names) {
        const bare = new RegExp(`>\\s*\\{\\s*${name}\\.[\\w.]+\\s*\\}\\s*<`, "g");
        const hits = src.match(bare);
        if (hits) add("warn", "bare-text", `${hits.length} yerde {${name}.…} çıplak basılmış; canlı düzenleyici tanımaz. <CoreText of={${name}} field="…" /> kullan.`, where);
      }
    }
  }

  if (schema) {
    const byId = new Map();
    for (const d of schema.collections) byId.set(d.id, { kind: "collection", fields: new Set(d.fields.map((f) => f.name)) });
    for (const d of schema.singletons) byId.set(d.id, { kind: "singleton", fields: new Set(d.fields.map((f) => f.name)) });
    const used = new Set();
    for (const r of reads) {
      if (r.fn === "moduleRows" || r.fn === "records") continue;
      used.add(r.id);
      const def = byId.get(r.id);
      if (!def) {
        add("fail", "read-unknown", `${r.fn}("${r.id}") şemada yok; core.schema.mjs'e ekle ve push-schema yap.`, r.file);
        continue;
      }
      if ((r.fn === "singleton" || r.fn === "getSingleton") && def.kind !== "singleton") add("fail", "read-kind", `"${r.id}" şemada koleksiyon; collection() ile oku.`, r.file);
      if ((r.fn === "collection" || r.fn === "getCollection") && def.kind !== "collection") add("fail", "read-kind", `"${r.id}" şemada tek örnek; singleton() ile oku.`, r.file);
      if (r.keys) {
        const drift = r.keys.filter((k) => !def.fields.has(k) && k !== "id" && k !== "slug");
        if (drift.length) add("warn", "read-drift", `${r.fn}("${r.id}") varsayılanında şemada olmayan alan: ${drift.join(", ")} (sürekli varsayılana düşer).`, r.file);
      }
    }
    for (const [id, def] of byId) if (!used.has(id)) add("warn", "schema-unused", `Şemadaki "${id}" ${def.kind === "singleton" ? "tek örneği" : "koleksiyonu"} kodda hiç okunmuyor.`, "core.schema.mjs");
  }
  if (reads.length === 0 && files.length > 0) add("warn", "no-reads", "Kodda singleton()/collection() çağrısı yok; içerik CORE'dan okunmuyor.", "app/");

  const fails = findings.filter((f) => f.level === "fail");
  const warns = findings.filter((f) => f.level === "warn");
  const ok = fails.length === 0 && (!strict || warns.length === 0);
  return { ok, fails, warns, findings, reads: reads.length, files: files.length };
}

export function printReport(r) {
  for (const f of r.fails) console.log(`✖ ${f.rule}  ${f.message}  — ${f.file}`);
  for (const f of r.warns) console.log(`! ${f.rule}  ${f.message}  — ${f.file}`);
  const tail = `${r.files} dosya, ${r.reads} okuma · ${r.fails.length} ihlal, ${r.warns.length} uyarı`;
  console.log(r.ok ? `✔ core-site check temiz — ${tail}` : `✖ core-site check geçmedi — ${tail}`);
}
