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
  focal?: { x: number; y: number };
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
  menu: { header: CoreLink[]; footer: CoreLink[] };
  media: CoreMedia[];
  settings: CoreSettings | null;
}

export const EMPTY_MODULES: CoreModules = {
  categories: [],
  products: [],
  pages: [],
  posts: [],
  menu: { header: [], footer: [] },
  media: [],
  settings: null,
};

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
export const CORE_REF: unique symbol = Symbol.for("core.ref");
export type Bound<T> = T & { readonly [CORE_REF]?: CoreRef };

export function bind<T extends object>(values: T, ref: CoreRef): Bound<T> {
  Object.defineProperty(values, CORE_REF, { value: ref, enumerable: false, writable: false, configurable: true });
  return values as Bound<T>;
}

export function refOf(value: unknown): CoreRef | null {
  if (!value || typeof value !== "object") return null;
  return ((value as Record<symbol, unknown>)[CORE_REF] as CoreRef | undefined) ?? null;
}

/** "cards.0.title" yolundan değer okur. */
export function getAt(source: unknown, path: string): unknown {
  let cur: unknown = source;
  for (const seg of path.split(".")) {
    if (cur === null || cur === undefined) return undefined;
    if (Array.isArray(cur)) cur = cur[Number(seg)];
    else if (typeof cur === "object") cur = (cur as Record<string, unknown>)[seg];
    else return undefined;
  }
  return cur;
}
