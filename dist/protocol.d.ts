/**
 * Canlı düzenleyicinin konuşma dili.
 *
 * NEDEN BÖYLE:
 *
 * K-01 gereği CORE siteyi RENDER ETMİYOR — siteler bağımsız geliştiriliyor
 * ve kendi deposunda yayınlanıyor. Yani CORE bir sayfanın gerçek
 * görünümünü ancak sitenin kendisinden alabilir.
 *
 * Çözüm: site bir çerçeve (iframe) içinde kendi adresinden yükleniyor,
 * hangi öğenin hangi içerik alanına karşılık geldiğini KENDİSİ bildiriyor
 * (`data-core-field`), ve iki taraf postMessage ile konuşuyor.
 *
 * Bunun sonucu, istenen şey: yeni bir alan eklendiğinde ya da yeni bir
 * site bağlandığında CORE'a tek satır kod yazmak gerekmiyor. Alanın
 * denetimi şemadan, görünümü siteden geliyor.
 *
 * GÜVENLİK BU DOSYADA:
 *
 * postMessage köken denetlemez; her pencere her pencereye mesaj
 * gönderebilir. Bu yüzden iki kural burada ve test ediliyor:
 *
 *   1. Gelen mesajın kökeni beklenen köken OLMALI. Sitenin adresi
 *      dışından gelen mesaj sessizce atılıyor.
 *   2. Mesajın şekli doğrulanıyor. Gövde asla `eval` edilmiyor, HTML
 *      olarak yorumlanmıyor; yalnız bilinen alanlar okunuyor.
 *
 * Saf ve React'siz: aynı kod hem panelde hem sitenin betiğinde çalışıyor.
 */
/** Sözleşme sürümü. İki taraf eşleşmiyorsa düzenleme başlamıyor. */
export declare const PREVIEW_PROTOCOL = 1;
export interface FieldPath {
    /** Tek örnekte "@" önekli koleksiyon anahtarı. */
    collection: string;
    /** Koleksiyon kaydının kimliği; tek örnekte yok. */
    recordId?: string;
    /** Alan adı; tekrarlayıcıda "addressLines.0.line" gibi olabilir. */
    field: string;
}
/**
 * Yolu çözer. Tanınmayan biçim `null` döner ve çağıran görmezden gelir —
 * sitenin işaretlediği her şeye güvenmek zorunda değiliz.
 */
export declare function parseFieldPath(raw: unknown): FieldPath | null;
export declare function formatFieldPath(path: FieldPath): string;
/** Alan yolunun ilk parçası; şemadaki alan adı. */
export declare function rootField(field: string): string;
/** Panelden çerçeveye. */
export type ToFrame = 
/** Düzenleme kipini aç. */
{
    type: "core:start";
    version: number;
}
/** Düzenleme kipini kapat; işaretler ve dinleyiciler kaldırılır. */
 | {
    type: "core:stop";
}
/** Bir alanın değerini anında uygula (kaydetmeden). */
 | {
    type: "core:patch";
    field: string;
    value: string;
}
/** Panelden seçilen alanı çerçevede vurgula ve görünür alana kaydır. */
 | {
    type: "core:highlight";
    field: string | null;
};
/** Çerçeveden panele. */
export type FromFrame = 
/** Sayfa hazır; düzenlenebilir alanların listesi. */
{
    type: "core:ready";
    version: number;
    path: string;
    fields: readonly FrameField[];
}
/** Kullanıcı çerçevede bir öğeye tıkladı. */
 | {
    type: "core:pick";
    field: string;
}
/** Çerçevede başka bir sayfaya geçildi. */
 | {
    type: "core:navigate";
    path: string;
}
/** İçerik yüksekliği değişti; panel çerçeveyi büyütebilir. */
 | {
    type: "core:size";
    height: number;
};
export interface FrameField {
    field: string;
    /** Öğenin o anki metni; panel doğru kaydı bulamazsa bunu gösterir. */
    text: string;
}
/**
 * İki adresin aynı kökene ait olup olmadığı.
 *
 * Karşılaştırma KÖKEN üzerinden, dize eşitliğiyle değil: "http://x:3200"
 * ile "http://x:3200/" aynı yer ama dize olarak farklı, ve
 * "http://evil.com/?http://x:3200" gibi bir değer dize karşılaştırmasını
 * kandırabilir.
 */
export declare function sameOrigin(a: string, b: string): boolean;
/** Panelin çerçeveden gelen mesajı okuması. Tanınmayan mesaj `null`. */
export declare function parseFromFrame(data: unknown): FromFrame | null;
/** Sitenin panelden gelen mesajı okuması. */
export declare function parseToFrame(data: unknown): ToFrame | null;
/**
 * Çerçevede açılacak adres.
 *
 * `core-preview` parametresi siteye "düzenleme kipindesin" diyor. Yol
 * site kökünün ALTINDA kalmak zorunda: çerçeveye başka bir siteyi
 * yükletmek, panelin o siteye mesaj göndermesi demek olurdu.
 */
export declare function previewSrc(base: string, path: string): string;
