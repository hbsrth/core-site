/**
 * Canlı düzenleyici işareti ve sınırlı satır içi vurgu.
 *
 * `coreField("@home", "heroTitle")` → `{ "data-core-field": "@home.heroTitle" }`.
 * Öznitelik her zaman basılır (sayfa statik); önizlemede tıklanabilir olur.
 * Kayıt kimliği boşsa işaret basılmaz: sitenin yedek verisinden gelen
 * satır CORE'da yok, düzenlenebilir gibi görünmemeli.
 */
import { formatFieldPath } from "./protocol.js";
export function coreField(collection, field, recordId, options) {
    if (recordId === "")
        return {};
    const path = formatFieldPath(collection.startsWith("@") ? { collection, field } : { collection, recordId, field });
    if (!collection.startsWith("@") && !recordId)
        return {};
    const out = { "data-core-field": path };
    if (options?.attr)
        out["data-core-attr"] = options.attr;
    return out;
}
/** `**kalın**` işaretlemesini React öğelerine çevirir; başka işaretleme yorumlanmaz. */
export function inlineText(value) {
    if (!value.includes("**"))
        return [value];
    return value.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part) => (part.startsWith("**") && part.endsWith("**") && part.length > 4 ? { bold: part.slice(2, -2) } : part));
}
