/**
 * `generateMetadata` için tek satır: sayfanın SEO alanı ve site ayarları
 * birleşir; boş olan site ayarından, o da boşsa verilen yedekten dolar.
 */
import type { CoreSettings } from "./types.js";
export interface SeoValue {
    title?: string;
    description?: string;
    image?: string | {
        url?: string;
    };
    noindex?: boolean;
}
export interface CoreMetadataInput {
    seo?: SeoValue | null;
    settings?: CoreSettings | null;
    fallback?: {
        title?: string;
        description?: string;
        image?: string;
    };
    /** Kanonik adres; verilirse `alternates.canonical` olur. */
    canonical?: string;
}
export declare function coreMetadata(input: CoreMetadataInput): {
    readonly openGraph: {
        readonly images?: {
            url: string;
        }[] | undefined;
        readonly title: string;
        readonly description: string;
    };
    readonly twitter: {
        readonly images?: string[] | undefined;
        readonly card: "summary" | "summary_large_image";
        readonly title: string;
        readonly description: string;
    };
    readonly robots: {
        index: boolean;
        follow: boolean;
    };
    readonly alternates?: {
        canonical: string;
    } | undefined;
    readonly title: string;
    readonly description: string;
};
