/**
 * `generateMetadata` için tek satır: sayfanın SEO alanı ve site ayarları
 * birleşir; boş olan site ayarından, o da boşsa verilen yedekten dolar.
 */
import type { CoreSettings } from "./types.js";

export interface SeoValue {
  title?: string;
  description?: string;
  image?: string | { url?: string };
  noindex?: boolean;
}

export interface CoreMetadataInput {
  seo?: SeoValue | null;
  settings?: CoreSettings | null;
  fallback?: { title?: string; description?: string; image?: string };
  /** Kanonik adres; verilirse `alternates.canonical` olur. */
  canonical?: string;
}

export function coreMetadata(input: CoreMetadataInput) {
  const title = input.seo?.title?.trim() || input.settings?.title?.trim() || input.fallback?.title || "";
  const description = input.seo?.description?.trim() || input.settings?.description?.trim() || input.fallback?.description || "";
  const rawImage = input.seo?.image;
  const image = (typeof rawImage === "string" ? rawImage : rawImage?.url) || input.fallback?.image || "";
  const noindex = input.seo?.noindex === true || input.settings?.indexable === false;
  return {
    title,
    description,
    ...(input.canonical ? { alternates: { canonical: input.canonical } } : {}),
    openGraph: { title, description, ...(image ? { images: [{ url: image }] } : {}) },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [image] } : {}) },
    robots: noindex ? { index: false, follow: false } : { index: true, follow: true },
  } as const;
}
