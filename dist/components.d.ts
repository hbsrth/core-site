/**
 * Sunucu bileşenleri: okur VE işaretler. Sayfa kodu tek satır yazar,
 * canlı düzenleyici alanı kendiliğinden tanır.
 *
 *   <CoreText of={home} field="heroTitle" as="h1" className="…" />
 *   <CoreImage of={home} field="heroImage" fill sizes="100vw" />
 *   <CoreRichText of={post} field="body" />
 *   <CoreMenu items={await menu("header")} />
 */
import { type ComponentProps, type ElementType, type ReactNode } from "react";
import Image from "next/image";
import { type CoreLink } from "./types.js";
export interface CoreTextProps {
    of: unknown;
    field: string;
    as?: ElementType;
    className?: string;
    /** `**kalın**` işaretlemesini yorumlama. */
    plain?: boolean;
    /** Değer boşsa gösterilecek metin. */
    fallback?: ReactNode;
    [attr: string]: unknown;
}
export declare function CoreText({ of, field, as, className, plain, fallback, ...rest }: CoreTextProps): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
export type CoreImageProps = Omit<ComponentProps<typeof Image>, "src" | "alt"> & {
    of: unknown;
    field: string;
    alt?: string;
    /** Görsel yoksa çizilecek şey. */
    fallback?: ReactNode;
};
/** Görsel: adres, alt metin ve odak noktası (`object-position`) kendiliğinden. */
export declare function CoreImage({ of, field, alt, fallback, style, ...rest }: CoreImageProps): string | number | bigint | boolean | import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | Iterable<ReactNode> | Promise<string | number | bigint | boolean | import("react").ReactPortal | import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | import("react").FunctionComponentElement<Omit<import("react").DetailedHTMLProps<import("react").ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>, "height" | "src" | "alt" | "width" | "loading" | "ref" | "srcSet"> & {
    src: string | import("next/dist/shared/lib/get-img-props.js").StaticImport;
    alt: string;
    width?: number | `${number}`;
    height?: number | `${number}`;
    fill?: boolean;
    loader?: import("next/image").ImageLoader;
    quality?: number | `${number}`;
    preload?: boolean;
    priority?: boolean;
    loading?: "eager" | "lazy" | undefined;
    placeholder?: import("next/dist/shared/lib/get-img-props.js").PlaceholderValue;
    blurDataURL?: string;
    unoptimized?: boolean;
    overrideSrc?: string;
    onLoadingComplete?: import("next/dist/shared/lib/get-img-props.js").OnLoadingComplete;
    layout?: string;
    objectFit?: string;
    objectPosition?: string;
    lazyBoundary?: string;
    lazyRoot?: string;
} & import("react").RefAttributes<HTMLImageElement | null>> | null;
/** Zengin metni güvenli HTML'e indirger: izinli etiketler, yalnız http(s)/mailto/tel bağlantı. */
export declare function sanitizeHtml(html: string): string;
export declare function CoreRichText({ of, field, as, className }: {
    of: unknown;
    field: string;
    as?: ElementType;
    className?: string;
}): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
export interface CoreMenuProps {
    items: readonly CoreLink[];
    className?: string;
    itemClassName?: string;
    linkClassName?: string;
    activeHref?: string;
    /** Alt menü çizimi; verilmezse iç içe `<ul>`. */
    renderChildren?: (item: CoreLink) => ReactNode;
}
export declare function CoreMenu({ items, className, itemClassName, linkClassName, activeHref, renderChildren }: CoreMenuProps): ReactNode;
/** Site ayarlarındaki `<head>` kodu ve izleme kimlikleri; layout'ta `<CoreHead settings={…} />`. */
export declare function CoreHead({ settings }: {
    settings: {
        ga4Id?: string;
        metaPixelId?: string;
        headCode?: string;
    } | null;
}): import("react").FunctionComponentElement<import("react").FragmentProps> | null;
