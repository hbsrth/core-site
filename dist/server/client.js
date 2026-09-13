/**
 * CORE içerik istemcisi — sunucu tarafı.
 *
 * KURAL: CORE kapalıyken siteye hiçbir şey olmaz. Tek uçuş, zaman aşımı
 * yarışı, soğuma süresi ve "son iyi içerik" ile site kendi varsayılanlarıyla
 * yayında kalır. `fetch`'e Next önbellek etiketi (`core:<site>`) ve zaman
 * tabanlı tazeleme veriliyor: CORE yayınlayınca etiket düşer, sinyal
 * kaybolursa en geç bir saatte kendini toparlar.
 */
import { CONTRACT_VERSION, configured, readEnv } from "../env.js";
import { read, readList, readRows } from "../read.js";
import { EMPTY_MODULES, bind } from "../types.js";
const REQUEST_TIMEOUT_MS = 4000;
const OFFLINE_COOLDOWN_MS = 30_000;
const FALLBACK_REVALIDATE = 3600;
export class CoreError extends Error {
    status;
    code;
    constructor(status, code, message) {
        super(message);
        this.name = "CoreError";
        this.status = status;
        this.code = code;
    }
}
function assertContent(body) {
    if (!body || typeof body !== "object")
        throw new CoreError(200, "invalid_body", "CORE yanıtı bir nesne değil.");
    const c = body;
    if (typeof c.contract !== "number")
        throw new CoreError(200, "invalid_body", "Yanıtta sözleşme sürümü yok.");
    if (!c.collections || typeof c.collections !== "object")
        throw new CoreError(200, "invalid_body", "Yanıtta koleksiyonlar yok.");
    for (const [id, rows] of Object.entries(c.collections))
        if (!Array.isArray(rows))
            throw new CoreError(200, "invalid_body", `"${id}" dizi değil.`);
    if (!c.singletons || typeof c.singletons !== "object")
        throw new CoreError(200, "invalid_body", "Yanıtta tek örnekler yok.");
    const m = c.modules;
    const list = (v) => (Array.isArray(v) ? v : []);
    const menu = (m?.menu ?? {});
    c.modules = {
        categories: list(m?.categories),
        products: list(m?.products),
        pages: list(m?.pages),
        posts: list(m?.posts),
        menu: { header: list(menu.header), footer: list(menu.footer) },
        media: list(m?.media),
        settings: m?.settings && typeof m.settings === "object" ? m.settings : null,
    };
    return c;
}
let lastGood = null;
let offlineUntil = 0;
let inflight = null;
let reportedOffline = false;
function offlineNotice(reason) {
    if (reportedOffline)
        return;
    reportedOffline = true;
    console.warn(`[CORE] Panele ulaşılamıyor (${reason}). Site ${lastGood ? "son alınan içerikle" : "kendi yedek içeriğiyle"} çalışmaya devam ediyor.`);
}
async function requestContent() {
    const env = readEnv();
    const response = await fetch(`${env.url}/api/content/${encodeURIComponent(env.siteId)}`, {
        headers: { authorization: `Bearer ${env.token}`, "x-core-contract": String(CONTRACT_VERSION) },
        next: { tags: [`core:${env.siteId}`], revalidate: FALLBACK_REVALIDATE },
    });
    if (!response.ok) {
        let code = "http_error";
        let message = `CORE isteği başarısız (${response.status}).`;
        try {
            const body = await response.json();
            if (body?.error) {
                code = body.error.code ?? code;
                message = body.error.message ?? message;
            }
        }
        catch {
            /* gövde JSON değilse genel mesaj kalır */
        }
        throw new CoreError(response.status, code, message);
    }
    const content = assertContent(await response.json());
    if (content.warnings?.length)
        console.warn("[CORE]", content.warnings.join(" | "));
    return content;
}
/** Tüm içerik; ulaşılamıyorsa son iyi içerik ya da `null`. Hiçbir koşulda fırlatmaz. */
export async function getContent() {
    if (!configured(readEnv()))
        return null;
    if (Date.now() < offlineUntil)
        return lastGood;
    if (inflight)
        return inflight;
    inflight = (async () => {
        let timer;
        const timeout = new Promise((resolve) => {
            timer = setTimeout(() => resolve("timeout"), REQUEST_TIMEOUT_MS);
        });
        try {
            const result = await Promise.race([requestContent(), timeout]);
            if (result === "timeout") {
                offlineUntil = Date.now() + OFFLINE_COOLDOWN_MS;
                offlineNotice(`${REQUEST_TIMEOUT_MS} ms içinde yanıt yok`);
                return lastGood;
            }
            lastGood = result;
            offlineUntil = 0;
            reportedOffline = false;
            return result;
        }
        catch (error) {
            offlineUntil = Date.now() + OFFLINE_COOLDOWN_MS;
            offlineNotice(error instanceof CoreError ? error.code : (error?.message ?? "bilinmeyen hata"));
            return lastGood;
        }
        finally {
            clearTimeout(timer);
            inflight = null;
        }
    })();
    return inflight;
}
export const coreConfigured = () => configured(readEnv());
export async function coreOnline() {
    return (await getContent()) !== null;
}
/** Son alınan içerik (senkron); görsel çözümü gibi render içi işler için. */
export const cachedContent = () => lastGood;
/* ---------------------------------------------------------------
   Okuma: her okuma ne beklediğini varsayılanıyla bildirir.
   --------------------------------------------------------------- */
/**
 * Tek örnek (tasarımlı sayfa metinleri). Dönen nesne doğrudan kullanılır:
 * `home.heroTitle`; `<CoreText of={home} field="heroTitle" />` işaretler.
 */
export async function singleton(id, defaults, label = id) {
    const content = await getContent();
    const raw = content?.singletons[id] ?? null;
    const values = read(raw, defaults, label);
    return bind(values, { collection: `@${id}` });
}
/** Koleksiyon kayıtları; her kayıt bağlı ve `id` taşır. */
export async function collection(id, defaults, label = id) {
    const content = await getContent();
    const rows = (content?.collections[id] ?? []);
    return rows.map((r) => {
        const values = read(r.values, defaults, `${label}#${r.id}`);
        values.id = r.id;
        if (r.slug)
            values.slug = r.slug;
        return bind(values, { collection: id, recordId: r.id });
    });
}
/** Ham kayıt listesi (sürüm, durum ile); gelişmiş kullanım. */
export async function records(id) {
    return ((await getContent())?.collections[id] ?? []);
}
/** CORE'un gömülü modülleri (ürün, kategori, sayfa, yazı, menü, medya, ayarlar); satırlar bağlı. */
export async function modules() {
    const m = (await getContent())?.modules ?? EMPTY_MODULES;
    const bindRows = (rows, collection) => rows.map((row) => (typeof row.id === "string" ? bind({ ...row }, { collection, recordId: row.id }) : row));
    return { ...m, categories: bindRows(m.categories, "categories"), products: bindRows(m.products, "products"), pages: bindRows(m.pages, "pages"), posts: bindRows(m.posts, "posts") };
}
/** Modül satırlarını varsayılanlı okur: `moduleRows("products", PRODUCT_DEFAULTS)`. */
export async function moduleRows(kind, defaults) {
    const m = await modules();
    const rows = readList(m[kind], defaults, [], kind);
    return rows.map((row) => bind(row, { collection: kind, recordId: String(row.id) }));
}
export async function menu(position = "header") {
    return (await modules()).menu[position];
}
export async function settings() {
    return (await modules()).settings;
}
export function resolveImage(value) {
    if (!value)
        return null;
    if (typeof value === "string") {
        const byId = lastGood?.modules.media.find((m) => m.id === value);
        if (byId)
            return { url: byId.url, alt: byId.alt, width: byId.width, height: byId.height, focal: byId.focal };
        return /^(https?:)?\//.test(value) ? { url: value, alt: "" } : null;
    }
    if (typeof value === "object") {
        const v = value;
        const url = v.url ?? v.src;
        if (url)
            return { url, alt: v.alt ?? "", width: v.width, height: v.height, focal: v.focal };
        if (v.id)
            return resolveImage(v.id);
    }
    return null;
}
export { read, readList, readRows };
