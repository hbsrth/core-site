import { read, readList, readRows } from "../read.js";
import { type Bound, type CoreContent, type CoreLink, type CoreModules, type CoreRecord, type CoreSettings } from "../types.js";
export declare class CoreError extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string, message: string);
}
/** Tüm içerik; ulaşılamıyorsa son iyi içerik ya da `null`. Hiçbir koşulda fırlatmaz. */
export declare function getContent(): Promise<CoreContent | null>;
export declare const coreConfigured: () => boolean;
export declare function coreOnline(): Promise<boolean>;
/** Son alınan içerik (senkron); görsel çözümü gibi render içi işler için. */
export declare const cachedContent: () => CoreContent | null;
/**
 * Tek örnek (tasarımlı sayfa metinleri). Dönen nesne doğrudan kullanılır:
 * `home.heroTitle`; `<CoreText of={home} field="heroTitle" />` işaretler.
 */
export declare function singleton<T extends Record<string, unknown>>(id: string, defaults: T, label?: string): Promise<Bound<T>>;
/** Koleksiyon kayıtları; her kayıt bağlı ve `id` taşır. */
export declare function collection<T extends Record<string, unknown>>(id: string, defaults: T, label?: string): Promise<Array<Bound<T & {
    id: string;
    slug?: string;
}>>>;
/** Ham kayıt listesi (sürüm, durum ile); gelişmiş kullanım. */
export declare function records<T = Record<string, unknown>>(id: string): Promise<CoreRecord<T>[]>;
/** CORE'un gömülü modülleri (ürün, kategori, sayfa, yazı, menü, medya, ayarlar); satırlar bağlı. */
export declare function modules(): Promise<CoreModules>;
/** Modül satırlarını varsayılanlı okur: `moduleRows("products", PRODUCT_DEFAULTS)`. */
export declare function moduleRows<T extends Record<string, unknown>>(kind: "categories" | "products" | "pages" | "posts", defaults: T): Promise<Array<Bound<T & {
    id: string;
}>>>;
export declare function menu(position?: "header" | "footer"): Promise<CoreLink[]>;
export declare function settings(): Promise<CoreSettings | null>;
/**
 * Görsel çözümü: alan değeri adres, {url,…} nesnesi ya da medya kimliği
 * olabilir. Kimlik son alınan içerikteki medya listesinden çözülür.
 */
export interface ResolvedImage {
    url: string;
    alt: string;
    width?: number;
    height?: number;
    focal?: {
        x: number;
        y: number;
    };
}
export declare function resolveImage(value: unknown): ResolvedImage | null;
export { read, readList, readRows };
