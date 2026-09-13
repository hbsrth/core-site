import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

export const ENV_KEYS = ["CORE_URL", "CORE_SITE_ID", "CORE_API_KEY", "CORE_WEBHOOK_SECRET", "NEXT_PUBLIC_CORE_ORIGIN"];

/** CORE'un gömülü modülleri; şemada koleksiyon adı olamazlar. */
export const BUILTIN_MODULES = ["products", "categories", "pages", "posts", "media", "navigation", "orders", "enquiries", "settings"];

export function parseEnvFile(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}

export function loadEnvFiles(root) {
  const env = {};
  for (const name of [".env", ".env.local"]) {
    const p = join(root, name);
    if (existsSync(p)) Object.assign(env, parseEnvFile(readFileSync(p, "utf8")));
  }
  return env;
}

/** Uygulama kökü: `src/app` varsa `src/app`, yoksa `app`. */
export function appDir(root) {
  if (existsSync(join(root, "src", "app"))) return join(root, "src", "app");
  return join(root, "app");
}

const SKIP = new Set(["node_modules", ".next", ".git", "dist", "out", "coverage", ".vercel", "public"]);

/** Kaynak dosyaları (ts, tsx, js, jsx, mjs) — büyük klasörler atlanır. */
export function sourceFiles(root) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      if (SKIP.has(name) || name.startsWith(".")) continue;
      const p = join(dir, name);
      let st;
      try {
        st = statSync(p);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(p);
      else if (/\.(tsx?|jsx?|mjs)$/.test(name) && !/\.(test|spec)\./.test(name)) out.push(p);
    }
  };
  walk(root);
  return out;
}

export function rel(root, p) {
  return resolve(p).slice(resolve(root).length + 1).replace(/\\/g, "/");
}

/** `{ a: 1, b: { … }, c: [ … ] }` dizgesinden üst düzey anahtarlar. */
export function topLevelKeys(literal) {
  const keys = [];
  let depth = 0;
  let i = 0;
  let expectKey = true;
  while (i < literal.length) {
    const ch = literal[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const q = ch;
      i += 1;
      while (i < literal.length && literal[i] !== q) i += literal[i] === "\\" ? 2 : 1;
      i += 1;
      continue;
    }
    if (ch === "{" || ch === "[" || ch === "(") {
      depth += 1;
      if (ch === "{" && depth === 1) expectKey = true;
      i += 1;
      continue;
    }
    if (ch === "}" || ch === "]" || ch === ")") {
      depth -= 1;
      i += 1;
      continue;
    }
    if (depth === 1 && ch === ",") {
      expectKey = true;
      i += 1;
      continue;
    }
    if (depth === 1 && expectKey) {
      const m = /^\s*([A-Za-z_$][\w$]*)\s*:/.exec(literal.slice(i));
      if (m) {
        keys.push(m[1]);
        expectKey = false;
        i += m[0].length;
        continue;
      }
      const spread = /^\s*\.\.\./.exec(literal.slice(i));
      if (spread) {
        expectKey = false;
        i += spread[0].length;
        continue;
      }
    }
    i += 1;
  }
  return keys;
}

/** `name(` çağrısından sonraki dengeli argüman listesini döner. */
export function callArgs(source, index) {
  let depth = 0;
  let i = index;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const q = ch;
      i += 1;
      while (i < source.length && source[i] !== q) i += source[i] === "\\" ? 2 : 1;
      i += 1;
      continue;
    }
    if (ch === "(" || ch === "{" || ch === "[") depth += 1;
    if (ch === ")" || ch === "}" || ch === "]") {
      depth -= 1;
      if (depth === 0) return source.slice(index + 1, i);
    }
    i += 1;
  }
  return null;
}
