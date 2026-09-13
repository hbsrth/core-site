export function coreMetadata(input) {
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
    };
}
