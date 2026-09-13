/** İçerik API'sinin yanıt şekli ve sitenin gördüğü modül satırları. */
export interface CoreRecord<T = Record<string, unknown>> {
    id: string;
    slug?: string;
    version: number;
    status: string;
    updatedAt: string;
    values: T;
}
export interface CoreLink {
    id: string;
    label: string;
    href: string;
    children?: readonly CoreLink[];
}
export interface CoreMedia {
    id: string;
    name: string;
    mime: string;
    width: number;
    height: number;
    alt: string;
    caption: string;
    url: string;
    focal?: {
        x: number;
        y: number;
    };
}
export interface CoreSettings {
    title: string;
    description: string;
    contactEmail: string;
    phone: string;
    indexable: boolean;
    ogImageId?: string;
    social?: Record<string, string>;
    ga4Id?: string;
    metaPixelId?: string;
    maintenance?: boolean;
    headCode?: string;
}
export interface CoreModules {
    categories: Record<string, unknown>[];
    products: Record<string, unknown>[];
    pages: Record<string, unknown>[];
    posts: Record<string, unknown>[];
    menu: {
        header: CoreLink[];
        footer: CoreLink[];
    };
    media: CoreMedia[];
    settings: CoreSettings | null;
}
export declare const EMPTY_MODULES: CoreModules;
export interface CoreContent {
    contract: number;
    siteId: string;
    locale: string;
    defaultLocale: string;
    generatedAt: string;
    collections: Record<string, CoreRecord[]>;
    singletons: Record<string, Record<string, unknown> | null>;
    modules: CoreModules;
    warnings?: string[];
}
/**
 * Bir değerin CORE'da nereden geldiği. `CoreText` ve `CoreImage` bu bilgiyle
 * canlı düzenleyici işaretini basar; kayıt bağlı değilse işaret basılmaz.
 */
export interface CoreRef {
    /** Koleksiyon kimliği; tek örnekte "@" önekli; gömülü modüllerde "products" gibi. */
    collection: string;
    recordId?: string;
}
/** Bağlı kayıt: değerler + gizli kaynak. Sayfa kodu değerleri düz nesne gibi kullanır. */
export declare const CORE_REF: unique symbol;
export type Bound<T> = T & {
    readonly [CORE_REF]?: CoreRef;
};
export declare function bind<T extends object>(values: T, ref: CoreRef): Bound<T>;
export declare function refOf(value: unknown): CoreRef | null;
/** "cards.0.title" yolundan değer okur. */
export declare function getAt(source: unknown, path: string): unknown;
