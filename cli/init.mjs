/**
 * core-site init — siteyi CORE'a hazırlar.
 *
 * Boş klasörde ya da mevcut Next projesinde çalışır. Yazdıkları:
 *   AGENTS.md (+ CLAUDE.md)            ajan yönergesi, işaretli blok; --update tazeler
 *   app/api/core/[...core]/route.ts    dört rota
 *   app/layout.tsx                     yoksa yazar, varsa <CoreProvider> ile sarar
 *   core.schema.mjs                    iskelet
 *   .env.local / .env.example          bayraklarla gelen değerler
 *   package.json                       scripts: core:check, core:doctor, prebuild → check
 *   .gitignore                         .env*.local
 *
 * Var olan dosyanın üstüne yazmaz (--force hariç); ne yaptığını satır satır söyler.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ENV_KEYS, appDir } from "./shared.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8"));
const TAG = `github:hbsrth/core-site#v${pkg.version}`;

const ROUTE = `import { createCoreHandlers } from "@surth/core-site/route";

/** CORE rotaları: /api/core/revalidate, /enquiry, /visit, /health. Dokunulmaz. */
export const { GET, POST } = createCoreHandlers();
`;

const LAYOUT = `import type { Metadata } from "next";
import { CoreProvider } from "@surth/core-site/client";
import "./globals.css";

export const metadata: Metadata = { title: "Site", description: "" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <CoreProvider>{children}</CoreProvider>
      </body>
    </html>
  );
}
`;

const SCHEMA = `/**
 * Bu sitenin CORE şeması — yalnız siteye ÖZGÜ şeyler.
 *
 * Ürün, kategori, sayfa, yazı, menü, medya ve ayarlar CORE'un gömülü
 * modülleridir; buraya yazılmaz. Buraya siteye özgü listeler (hizmetler,
 * referanslar, ekip…) ve tasarımlı sayfaların metinleri girer.
 *
 *   npx core-site push-schema   → CORE'a gönderir
 *   npx core-site check         → kodla şemayı karşılaştırır
 */
export const schema = {
  profileId: "kurumsal",
  version: 1,
  features: { catalogue: false, commerce: false, pages: true, blog: false, donations: false, membership: false, events: false, appointments: false, documents: false, team: false, i18n: false },
  locales: { default: "tr", locales: ["tr"] },
  collections: [
    {
      id: "services",
      label: "Hizmetler",
      labelSingular: "Hizmet",
      titleField: "title",
      fields: [
        { kind: "text", name: "title", label: "Başlık", required: true },
        { kind: "textarea", name: "summary", label: "Özet" },
        { kind: "image", name: "image", label: "Görsel" },
      ],
      list: { columns: ["title"] },
    },
  ],
  singletons: [
    {
      id: "home",
      label: "Ana sayfa",
      fields: [
        { kind: "text", name: "heroTitle", label: "Açılış başlığı", required: true },
        { kind: "textarea", name: "heroText", label: "Açılış metni" },
        { kind: "image", name: "heroImage", label: "Açılış görseli" },
      ],
    },
  ],
};
`;

const PAGE = `import { singleton, collection } from "@surth/core-site/server";
import { CoreText, CoreImage } from "@surth/core-site/components";

// Varsayılanlar sitenin gerçek metinleri: CORE'a ulaşılamasa da site böyle yayında kalır.
const HOME = { heroTitle: "Sitenin başlığı", heroText: "Kısa açılış metni.", heroImage: "" };
const SERVICE = { title: "", summary: "", image: "" };

export default async function Home() {
  const home = await singleton("home", HOME);
  const services = await collection("services", SERVICE);
  return (
    <main>
      <section>
        <CoreText of={home} field="heroTitle" as="h1" />
        <CoreText of={home} field="heroText" as="p" />
        <CoreImage of={home} field="heroImage" width={1600} height={900} alt="" />
      </section>
      <section>
        {services.map((s) => (
          <article key={s.id}>
            <CoreText of={s} field="title" as="h2" />
            <CoreText of={s} field="summary" as="p" />
          </article>
        ))}
      </section>
    </main>
  );
}
`;

export function agentsBlock() {
  return readFileSync(join(here, "..", "templates", "AGENTS.core.md"), "utf8").replace("__VERSION__", pkg.version);
}

/** İşaretli bloğu ekler ya da yeniler; dosyanın geri kalanına dokunmaz. */
export function mergeAgents(existing, block) {
  const start = "<!-- core-site:start";
  const end = "<!-- core-site:end -->";
  if (!existing) return block;
  const i = existing.indexOf(start);
  const j = existing.indexOf(end);
  if (i >= 0 && j > i) return existing.slice(0, i) + block.trimEnd() + existing.slice(j + end.length);
  return `${existing.trimEnd()}\n\n${block}`;
}

export function wrapLayout(source) {
  if (source.includes("CoreProvider")) return { source, changed: false };
  let out = source;
  const importLine = 'import { CoreProvider } from "@surth/core-site/client";\n';
  const lastImport = [...out.matchAll(/^import[^\n]*\n/gm)].pop();
  out = lastImport ? out.slice(0, lastImport.index + lastImport[0].length) + importLine + out.slice(lastImport.index + lastImport[0].length) : importLine + out;
  const m = /<body([^>]*)>([\s\S]*?)<\/body>/.exec(out);
  if (!m || !m[2].includes("{children}")) return { source, changed: false, reason: "<body> içinde {children} bulunamadı" };
  const inner = m[2].replace("{children}", "<CoreProvider>{children}</CoreProvider>");
  out = out.slice(0, m.index) + `<body${m[1]}>${inner}</body>` + out.slice(m.index + m[0].length);
  return { source: out, changed: true };
}

export function envText(values) {
  return ENV_KEYS.map((k) => `${k}=${values[k] ?? ""}`).join("\n") + "\n";
}

export async function runInit(root, opts = {}) {
  const log = [];
  const say = (s) => log.push(s);
  const write = (relPath, content, { force = false, kind = "yazıldı" } = {}) => {
    const p = join(root, relPath);
    if (existsSync(p) && !force) {
      say(`· ${relPath} var, dokunulmadı`);
      return false;
    }
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, content);
    say(`✔ ${relPath} ${kind}`);
    return true;
  };

  // 1. Yönerge
  const block = agentsBlock();
  const agentsPath = join(root, "AGENTS.md");
  const existing = existsSync(agentsPath) ? readFileSync(agentsPath, "utf8") : "";
  const merged = mergeAgents(existing, block);
  if (merged !== existing) {
    writeFileSync(agentsPath, merged);
    say(`✔ AGENTS.md ${existing ? "CORE bloğu eklendi/yenilendi" : "yazıldı"}`);
  } else say("· AGENTS.md güncel");
  const claudePath = join(root, "CLAUDE.md");
  if (!existsSync(claudePath)) {
    writeFileSync(claudePath, "@AGENTS.md\n");
    say("✔ CLAUDE.md yazıldı (AGENTS.md'ye işaret eder)");
  } else if (!readFileSync(claudePath, "utf8").includes("AGENTS.md")) {
    appendFileSync(claudePath, "\n@AGENTS.md\n");
    say("✔ CLAUDE.md'ye @AGENTS.md eklendi");
  }
  if (opts.update) return { log, root };

  // 2. Rota, layout, şema, örnek sayfa
  const app = appDir(root);
  const appRel = resolve(app).slice(resolve(root).length + 1).replace(/\\/g, "/");
  write(`${appRel}/api/core/[...core]/route.ts`, ROUTE);
  const layoutPath = ["layout.tsx", "layout.jsx", "layout.js"].map((n) => join(app, n)).find((p) => existsSync(p));
  if (!layoutPath) write(`${appRel}/layout.tsx`, LAYOUT);
  else {
    const r = wrapLayout(readFileSync(layoutPath, "utf8"));
    if (r.changed) {
      writeFileSync(layoutPath, r.source);
      say(`✔ ${appRel}/layout.tsx <CoreProvider> ile sarıldı`);
    } else say(`· ${appRel}/layout.tsx ${r.reason ? `elle sarılmalı (${r.reason})` : "zaten CoreProvider içeriyor"}`);
  }
  write("core.schema.mjs", SCHEMA);
  const pagePath = join(app, "page.tsx");
  if (!existsSync(pagePath)) write(`${appRel}/page.tsx`, PAGE);
  else if (opts.examplePage) write(`${appRel}/core-ornek.page.tsx.txt`, PAGE, { kind: "örnek olarak yazıldı" });
  if (!existsSync(join(app, "globals.css")) && !layoutPath) write(`${appRel}/globals.css`, ":root { color-scheme: light; }\nbody { margin: 0; font-family: system-ui, sans-serif; }\n");

  // 3. Ortam
  const envValues = { CORE_URL: opts.url, CORE_SITE_ID: opts.site, CORE_API_KEY: opts.key, CORE_WEBHOOK_SECRET: opts.secret, NEXT_PUBLIC_CORE_ORIGIN: opts.origin ?? opts.url };
  const given = ENV_KEYS.filter((k) => envValues[k]);
  write(".env.example", envText({ CORE_URL: "https://core.surth.dev", NEXT_PUBLIC_CORE_ORIGIN: "https://core.surth.dev" }));
  if (given.length) {
    const p = join(root, ".env.local");
    if (existsSync(p) && !opts.force) say("· .env.local var, dokunulmadı (--force ile yeniden yazılır)");
    else {
      writeFileSync(p, envText(envValues));
      say(`✔ .env.local yazıldı (${given.length}/${ENV_KEYS.length} değişken)`);
    }
  } else say("· .env.local için değer verilmedi; CORE panelindeki komutu ya da bloğu kullan");

  // 4. package.json ve .gitignore — boş klasörde en küçük Next projesi kurulur
  const pkgPath = join(root, "package.json");
  let needsInstall = false;
  if (!existsSync(pkgPath)) {
    const name = (opts.site || root.split(/[\\/]/).filter(Boolean).pop() || "site").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "site";
    writeFileSync(pkgPath, JSON.stringify({ name, version: "0.1.0", private: true, scripts: { dev: "next dev", build: "next build", start: "next start" }, dependencies: { next: "^16.3.3", react: "^19.2.8", "react-dom": "^19.2.8" }, devDependencies: { "@types/node": "^24", "@types/react": "^19", "@types/react-dom": "^19", typescript: "^5.9.3" } }, null, 2) + "\n");
    say(`✔ package.json yazıldı (${name}: Next 16, React 19, TypeScript)`);
    write("tsconfig.json", JSON.stringify({ compilerOptions: { target: "ES2017", lib: ["dom", "dom.iterable", "esnext"], allowJs: false, skipLibCheck: true, strict: true, noEmit: true, esModuleInterop: true, module: "esnext", moduleResolution: "bundler", resolveJsonModule: true, isolatedModules: true, jsx: "react-jsx", incremental: true, plugins: [{ name: "next" }], paths: { "@/*": ["./*"] } }, include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"], exclude: ["node_modules"] }, null, 2) + "\n");
    write("next.config.ts", 'import type { NextConfig } from "next";\n\nconst nextConfig: NextConfig = {};\n\nexport default nextConfig;\n');
    const giPath0 = join(root, ".gitignore");
    if (!existsSync(giPath0)) write(".gitignore", "node_modules/\n.next/\nout/\n.vercel\n*.tsbuildinfo\nnext-env.d.ts\n");
    needsInstall = true;
  }
  if (existsSync(pkgPath)) {
    const j = JSON.parse(readFileSync(pkgPath, "utf8"));
    j.scripts ??= {};
    let changed = false;
    if (!j.scripts["core:check"]) (j.scripts["core:check"] = "core-site check"), (changed = true);
    if (!j.scripts["core:doctor"]) (j.scripts["core:doctor"] = "core-site doctor"), (changed = true);
    if (!j.scripts.prebuild) (j.scripts.prebuild = "core-site check"), (changed = true);
    else if (!j.scripts.prebuild.includes("core-site check")) say("· prebuild zaten var; `core-site check` eklenmedi, elle ekle");
    if (!j.dependencies?.["@surth/core-site"] && !j.devDependencies?.["@surth/core-site"]) {
      j.dependencies ??= {};
      j.dependencies["@surth/core-site"] = TAG;
      changed = true;
      needsInstall = true;
      say(`✔ package.json bağımlılık: @surth/core-site (${TAG})`);
    }
    if (changed) {
      writeFileSync(pkgPath, JSON.stringify(j, null, 2) + "\n");
      say("✔ package.json scripts: core:check, core:doctor, prebuild → core-site check");
    } else say("· package.json güncel");
  }
  const giPath = join(root, ".gitignore");
  const gi = existsSync(giPath) ? readFileSync(giPath, "utf8") : "";
  if (!/\.env\*?\.local|\.env\.local/.test(gi)) {
    appendFileSync(giPath, `${gi && !gi.endsWith("\n") ? "\n" : ""}.env*.local\n`);
    say("✔ .gitignore: .env*.local");
  }

  // 5. Bağımlılıklar: kullanıcı ikinci bir komut yazmasın
  if (needsInstall && opts.install !== false) {
    say("… npm install çalışıyor");
    const r = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["install", "--no-audit", "--no-fund"], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
    say(r.status === 0 ? "✔ bağımlılıklar kuruldu" : "✖ npm install başarısız; elle çalıştır: npm install");
  } else if (needsInstall) say("· npm install atlandı (--no-install)");
  return { log, root };
}
