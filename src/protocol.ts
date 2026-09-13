/* OTOMATIK KOPYA — kaynak: CORE/sdk/preview-protocol.ts; burada duzenleme, scripts/sync-protocol.mjs yeniden yazar. */
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
export const PREVIEW_PROTOCOL = 1;

/* ---------------------------------------------------------------
   Alan yolu

   "@home.titleLine1"      → tek örnek "home", alan "titleLine1"
   "services.abc123.title" → koleksiyon "services", kayıt "abc123"
   "@contact.addressLines.0.line" → tekrarlayıcı satırı
   --------------------------------------------------------------- */

export interface FieldPath {
  /** Tek örnekte "@" önekli koleksiyon anahtarı. */
  collection: string;
  /** Koleksiyon kaydının kimliği; tek örnekte yok. */
  recordId?: string;
  /** Alan adı; tekrarlayıcıda "addressLines.0.line" gibi olabilir. */
  field: string;
}

const SEGMENT = /^[A-Za-z0-9_@-]+$/;

/**
 * Yolu çözer. Tanınmayan biçim `null` döner ve çağıran görmezden gelir —
 * sitenin işaretlediği her şeye güvenmek zorunda değiliz.
 */
export function parseFieldPath(raw: unknown): FieldPath | null {
  if (typeof raw !== "string") return null;
  const parts = raw.split(".");
  if (parts.length < 2) return null;

  const collection = parts[0];
  if (!SEGMENT.test(collection)) return null;

  if (collection.startsWith("@")) {
    // Tek örnek: kayıt kimliği yok, gerisi alan yolu.
    const field = parts.slice(1).join(".");
    return field ? { collection, field } : null;
  }

  if (parts.length < 3) return null;
  const recordId = parts[1];
  if (!SEGMENT.test(recordId)) return null;
  const field = parts.slice(2).join(".");
  return field ? { collection, recordId, field } : null;
}

export function formatFieldPath(path: FieldPath): string {
  return path.recordId
    ? `${path.collection}.${path.recordId}.${path.field}`
    : `${path.collection}.${path.field}`;
}

/** Alan yolunun ilk parçası; şemadaki alan adı. */
export function rootField(field: string): string {
  return field.split(".")[0];
}

/* ---------------------------------------------------------------
   Mesajlar
   --------------------------------------------------------------- */

/** Panelden çerçeveye. */
export type ToFrame =
  /** Düzenleme kipini aç. */
  | { type: "core:start"; version: number }
  /** Düzenleme kipini kapat; işaretler ve dinleyiciler kaldırılır. */
  | { type: "core:stop" }
  /** Bir alanın değerini anında uygula (kaydetmeden). */
  | { type: "core:patch"; field: string; value: string }
  /** Panelden seçilen alanı çerçevede vurgula ve görünür alana kaydır. */
  | { type: "core:highlight"; field: string | null };

/** Çerçeveden panele. */
export type FromFrame =
  /** Sayfa hazır; düzenlenebilir alanların listesi. */
  | {
      type: "core:ready";
      version: number;
      path: string;
      fields: readonly FrameField[];
    }
  /** Kullanıcı çerçevede bir öğeye tıkladı. */
  | { type: "core:pick"; field: string }
  /** Çerçevede başka bir sayfaya geçildi. */
  | { type: "core:navigate"; path: string }
  /** İçerik yüksekliği değişti; panel çerçeveyi büyütebilir. */
  | { type: "core:size"; height: number };

export interface FrameField {
  field: string;
  /** Öğenin o anki metni; panel doğru kaydı bulamazsa bunu gösterir. */
  text: string;
}

/* ---------------------------------------------------------------
   Doğrulama
   --------------------------------------------------------------- */

/**
 * İki adresin aynı kökene ait olup olmadığı.
 *
 * Karşılaştırma KÖKEN üzerinden, dize eşitliğiyle değil: "http://x:3200"
 * ile "http://x:3200/" aynı yer ama dize olarak farklı, ve
 * "http://evil.com/?http://x:3200" gibi bir değer dize karşılaştırmasını
 * kandırabilir.
 */
export function sameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Panelin çerçeveden gelen mesajı okuması. Tanınmayan mesaj `null`. */
export function parseFromFrame(data: unknown): FromFrame | null {
  if (!isRecord(data)) return null;
  switch (data.type) {
    case "core:ready": {
      if (typeof data.version !== "number") return null;
      if (typeof data.path !== "string") return null;
      const raw = Array.isArray(data.fields) ? data.fields : [];
      const fields: FrameField[] = [];
      for (const item of raw) {
        if (!isRecord(item)) continue;
        if (!parseFieldPath(item.field)) continue;
        fields.push({
          field: item.field as string,
          // Metin yalnız panelde gösteriliyor; uzunluğu sınırlanıyor ki
          // bozuk bir sayfa paneli kilitlemesin.
          text: typeof item.text === "string" ? item.text.slice(0, 400) : "",
        });
      }
      return {
        type: "core:ready",
        version: data.version,
        path: data.path,
        fields,
      };
    }
    case "core:pick":
      return parseFieldPath(data.field)
        ? { type: "core:pick", field: data.field as string }
        : null;
    case "core:navigate":
      return typeof data.path === "string"
        ? { type: "core:navigate", path: data.path }
        : null;
    case "core:size":
      return typeof data.height === "number" && Number.isFinite(data.height)
        ? { type: "core:size", height: Math.max(0, Math.min(50000, data.height)) }
        : null;
    default:
      return null;
  }
}

/** Sitenin panelden gelen mesajı okuması. */
export function parseToFrame(data: unknown): ToFrame | null {
  if (!isRecord(data)) return null;
  switch (data.type) {
    case "core:start":
      return typeof data.version === "number"
        ? { type: "core:start", version: data.version }
        : null;
    case "core:stop":
      return { type: "core:stop" };
    case "core:patch":
      return parseFieldPath(data.field) && typeof data.value === "string"
        ? {
            type: "core:patch",
            field: data.field as string,
            value: data.value,
          }
        : null;
    case "core:highlight":
      if (data.field === null) return { type: "core:highlight", field: null };
      return parseFieldPath(data.field)
        ? { type: "core:highlight", field: data.field as string }
        : null;
    default:
      return null;
  }
}

/**
 * Çerçevede açılacak adres.
 *
 * `core-preview` parametresi siteye "düzenleme kipindesin" diyor. Yol
 * site kökünün ALTINDA kalmak zorunda: çerçeveye başka bir siteyi
 * yükletmek, panelin o siteye mesaj göndermesi demek olurdu.
 */
export function previewSrc(base: string, path: string): string {
  if (!base) return "";
  try {
    const root = new URL(base.startsWith("http") ? base : `https://${base}`);
    const url = new URL(path || "/", root);
    if (url.origin !== root.origin) return "";
    url.searchParams.set("core-preview", "1");
    return url.href;
  } catch {
    return "";
  }
}
