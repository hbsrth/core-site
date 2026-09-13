export const EMPTY_MODULES = {
    categories: [],
    products: [],
    pages: [],
    posts: [],
    menu: { header: [], footer: [] },
    media: [],
    settings: null,
};
/** Bağlı kayıt: değerler + gizli kaynak. Sayfa kodu değerleri düz nesne gibi kullanır. */
export const CORE_REF = Symbol.for("core.ref");
export function bind(values, ref) {
    Object.defineProperty(values, CORE_REF, { value: ref, enumerable: false, writable: false, configurable: true });
    return values;
}
export function refOf(value) {
    if (!value || typeof value !== "object")
        return null;
    return value[CORE_REF] ?? null;
}
/** "cards.0.title" yolundan değer okur. */
export function getAt(source, path) {
    let cur = source;
    for (const seg of path.split(".")) {
        if (cur === null || cur === undefined)
            return undefined;
        if (Array.isArray(cur))
            cur = cur[Number(seg)];
        else if (typeof cur === "object")
            cur = cur[seg];
        else
            return undefined;
    }
    return cur;
}
