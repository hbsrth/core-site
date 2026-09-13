/**
 * Sitenin CORE için sunduğu rotalar — tek fonksiyon.
 *
 *   // app/api/core/[...core]/route.ts
 *   import { createCoreHandlers } from "@surth/core-site/server";
 *   export const { GET, POST } = createCoreHandlers();
 *
 *   POST /api/core/revalidate  yayın sinyali (Bearer CORE_WEBHOOK_SECRET) → revalidateTag
 *   POST /api/core/enquiry     ziyaretçi formu → CORE form talepleri (anahtar sunucuda)
 *   POST /api/core/visit       sayfa görüntüleme → günlük ziyaretçi karması → CORE istatistik
 *   GET  /api/core/health      bağlantı doktoru: paket/sözleşme sürümü, yapılandırma, son sinyal
 *
 * Bal küpü, hız sınırı, imza doğrulama ve karma burada; site tek satır yazar.
 */
import { revalidateTag } from "next/cache";
import { CONTRACT_VERSION, PACKAGE_VERSION, configured, readEnv } from "../env.js";
function timingSafeEqual(a, b) {
    if (a.length !== b.length)
        return false;
    let diff = 0;
    for (let i = 0; i < a.length; i += 1)
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}
const json = (body, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
/* Hız sınırı: IP başına 10 dakikada 5 form. */
const formHits = new Map();
function formLimited(key) {
    const now = Date.now();
    const recent = (formHits.get(key) ?? []).filter((t) => now - t < 10 * 60 * 1000);
    recent.push(now);
    formHits.set(key, recent);
    if (formHits.size > 5000)
        formHits.clear();
    return recent.length > 5;
}
const buffer = [];
let lastFlush = Date.now();
let flushTimer = null;
let lastSignalAt = null;
async function flushVisits() {
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }
    const env = readEnv();
    if (buffer.length === 0 || !configured(env))
        return;
    const events = buffer.splice(0, 500);
    lastFlush = Date.now();
    try {
        await fetch(`${env.url}/api/analytics/${encodeURIComponent(env.siteId)}`, {
            method: "POST",
            headers: { authorization: `Bearer ${env.token}`, "content-type": "application/json" },
            body: JSON.stringify({ events }),
            cache: "no-store",
        });
    }
    catch {
        /* istatistik için kayıp kabul edilebilir */
    }
}
async function visitorHash(request, siteId) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "0";
    const ua = request.headers.get("user-agent") ?? "";
    const day = new Date().toISOString().slice(0, 10);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}|${ua}|${day}|${siteId}`));
    return [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export function createCoreHandlers(options = {}) {
    const honeypot = options.honeypot ?? "website";
    const map = options.mapEnquiry ?? ((b) => ({ name: b.name, email: b.email, subject: b.subject, message: b.message }));
    const action = (request) => {
        const path = new URL(request.url).pathname.replace(/\/+$/, "");
        return path.slice(path.lastIndexOf("/") + 1);
    };
    async function GET(request) {
        if (action(request) !== "health")
            return json({ error: "Bulunamadı." }, 404);
        const env = readEnv();
        return json({
            ok: configured(env),
            package: PACKAGE_VERSION,
            contract: CONTRACT_VERSION,
            basePath: options.basePath ?? "/api/core",
            configured: { url: Boolean(env.url), siteId: Boolean(env.siteId), apiKey: Boolean(env.token), webhookSecret: Boolean(env.webhookSecret), panelOrigin: Boolean(env.panelOrigins) },
            lastSignalAt,
            pendingVisits: buffer.length,
            // Sır değil: hangi panelin mesajının kabul edileceği. Doktor, kendi kökenini burada arar.
            panelOrigins: env.panelOrigins.split(",").map((s) => s.trim()).filter(Boolean),
        });
    }
    async function POST(request) {
        const env = readEnv();
        const what = action(request);
        if (what === "revalidate") {
            if (!env.webhookSecret)
                return json({ error: "CORE_WEBHOOK_SECRET tanımlı değil." }, 503);
            const token = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") ?? "")?.[1] ?? "";
            if (!token || !timingSafeEqual(token, env.webhookSecret))
                return json({ error: "Yetkisiz." }, 401);
            let payload;
            try {
                payload = await request.json();
            }
            catch {
                return json({ error: "Gövde JSON değil." }, 400);
            }
            const tags = Array.isArray(payload.tags) ? payload.tags.filter((t) => typeof t === "string") : [];
            if (tags.length === 0)
                return json({ error: "Etiket yok." }, 400);
            // { expire: 0 }: bir sonraki istek yeni içeriği bekler; yayın seyrek, "yayınladım, görünsün" doğru beklenti.
            for (const tag of tags)
                revalidateTag(tag, { expire: 0 });
            lastSignalAt = new Date().toISOString();
            return json({ ok: true, revalidated: tags, at: Date.now() });
        }
        if (what === "enquiry") {
            if (!configured(env))
                return json({ error: "Form bağlantısı yapılandırılmadı." }, 503);
            let body;
            try {
                body = (await request.json());
            }
            catch {
                return json({ error: "Gövde JSON değil." }, 400);
            }
            if (typeof body[honeypot] === "string" && body[honeypot].trim())
                return json({ ok: true, id: "" }, 201);
            const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
            if (formLimited(ip))
                return json({ error: "Çok fazla deneme; biraz sonra yeniden deneyin." }, 429);
            const upstream = await fetch(`${env.url}/api/enquiries/${encodeURIComponent(env.siteId)}`, {
                method: "POST",
                headers: { authorization: `Bearer ${env.token}`, "content-type": "application/json" },
                body: JSON.stringify(map(body)),
                cache: "no-store",
            }).catch(() => null);
            if (!upstream)
                return json({ error: "CORE'a ulaşılamadı." }, 502);
            const payload = await upstream.json().catch(() => ({}));
            return json(payload, upstream.status);
        }
        if (what === "visit") {
            let body = {};
            try {
                body = (await request.json());
            }
            catch {
                return new Response(null, { status: 204 });
            }
            const path = typeof body.path === "string" ? body.path.slice(0, 200) : "";
            if (!path.startsWith("/"))
                return new Response(null, { status: 204 });
            if (buffer.length >= 500)
                buffer.shift();
            buffer.push({ path, visitor: await visitorHash(request, env.siteId), referrer: typeof body.referrer === "string" ? body.referrer.slice(0, 500) : "", at: new Date().toISOString() });
            if (buffer.length >= 20 || Date.now() - lastFlush > 10_000)
                await flushVisits();
            else if (!flushTimer)
                flushTimer = setTimeout(() => void flushVisits(), 10_000);
            return new Response(null, { status: 204 });
        }
        return json({ error: "Bulunamadı." }, 404);
    }
    return { GET, POST };
}
