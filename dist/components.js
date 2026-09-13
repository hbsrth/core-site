/**
 * Sunucu bileşenleri: okur VE işaretler. Ayrı giriş (`@surth/core-site/components`):
 * `next/image` içe aktarır; kök giriş Next'siz ortamda (test, betik) da yüklenir.
 * Sayfa kodu tek satır yazar,
 * canlı düzenleyici alanı kendiliğinden tanır.
 *
 *   <CoreText of={home} field="heroTitle" as="h1" className="…" />
 *   <CoreImage of={home} field="heroImage" fill sizes="100vw" />
 *   <CoreRichText of={post} field="body" />
 *   <CoreMenu items={await menu("header")} />
 */
import { createElement, Fragment } from "react";
import Image from "next/image";
import { coreField, inlineText } from "./mark.js";
import { getAt, refOf } from "./types.js";
import { resolveImage } from "./server/client.js";
import { sanitizeHtml } from "./sanitize.js";
export { sanitizeHtml };
function markFor(of, field, attr) {
    const ref = refOf(of);
    return ref ? coreField(ref.collection, field, ref.recordId, attr ? { attr } : undefined) : {};
}
export function CoreText({ of, field, as = "span", className, plain = false, fallback = null, ...rest }) {
    const raw = getAt(of, field);
    const text = raw === null || raw === undefined ? "" : String(raw);
    const content = !text ? fallback : plain ? text : inlineText(text).map((p, i) => (typeof p === "string" ? p : createElement("strong", { key: i }, p.bold)));
    return createElement(as, { className, ...rest, ...markFor(of, field) }, content);
}
/** Görsel: adres, alt metin ve odak noktası (`object-position`) kendiliğinden. */
export function CoreImage({ of, field, alt, fallback = null, style, ...rest }) {
    const resolved = resolveImage(getAt(of, field));
    if (!resolved)
        return fallback;
    const position = resolved.focal ? `${Math.round(resolved.focal.x * 100)}% ${Math.round(resolved.focal.y * 100)}%` : undefined;
    const sized = "fill" in rest && rest.fill ? {} : { width: rest.width ?? resolved.width ?? 1200, height: rest.height ?? resolved.height ?? 800 };
    return createElement(Image, {
        ...rest,
        ...sized,
        src: resolved.url,
        alt: alt ?? resolved.alt ?? "",
        style: { ...(position ? { objectPosition: position } : {}), ...style },
        ...markFor(of, field, "src"),
    });
}
export function CoreRichText({ of, field, as = "div", className }) {
    const raw = getAt(of, field);
    const html = typeof raw === "string" ? sanitizeHtml(raw) : "";
    return createElement(as, { className, ...markFor(of, field), dangerouslySetInnerHTML: { __html: html } });
}
export function CoreMenu({ items, className, itemClassName, linkClassName, activeHref, renderChildren }) {
    return createElement("ul", { className }, items.map((item) => createElement("li", { key: item.id, className: itemClassName }, createElement("a", { href: item.href, className: linkClassName, "aria-current": activeHref === item.href ? "page" : undefined }, item.label), item.children && item.children.length > 0 ? (renderChildren ? renderChildren(item) : createElement(CoreMenu, { items: item.children, className, itemClassName, linkClassName, activeHref })) : null)));
}
/** Site ayarlarındaki `<head>` kodu ve izleme kimlikleri; layout'ta `<CoreHead settings={…} />`. */
export function CoreHead({ settings }) {
    if (!settings)
        return null;
    const parts = [];
    if (settings.ga4Id && /^G-[A-Z0-9]{6,14}$/.test(settings.ga4Id)) {
        parts.push(createElement("script", { key: "ga-src", async: true, src: `https://www.googletagmanager.com/gtag/js?id=${settings.ga4Id}` }));
        parts.push(createElement("script", { key: "ga-init", dangerouslySetInnerHTML: { __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${settings.ga4Id}');` } }));
    }
    if (settings.metaPixelId && /^[0-9]{6,20}$/.test(settings.metaPixelId)) {
        parts.push(createElement("script", { key: "fbq", dangerouslySetInnerHTML: { __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${settings.metaPixelId}');fbq('track','PageView');` } }));
    }
    if (settings.headCode?.trim())
        parts.push(createElement("div", { key: "head-code", hidden: true, dangerouslySetInnerHTML: { __html: settings.headCode } }));
    return createElement(Fragment, null, parts);
}
