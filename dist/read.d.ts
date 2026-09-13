/**
 * CORE içeriğini kırılmadan okuma katmanı.
 *
 * PROBLEM: site kodu "şu koleksiyondan şu alanı oku" diye yazılırsa CORE
 * geliştikçe kırılır. Alan adı değişir → undefined render edilir. Alan
 * kaldırılır → sayfa çöker. Koleksiyon yeniden adlandırılır → liste boşalır
 * ve kimse fark etmez. Bunların hepsi sessiz başarısızlık.
 *
 * ÇÖZÜM: site ne beklediğini VARSAYILANLARIYLA bildirir. `read` gelen
 * içeriği bu bildirime göre doldurur:
 *
 *   - CORE'da olan alan → CORE'un değeri
 *   - CORE'da olmayan alan → sitenin taşıdığı varsayılan
 *   - CORE'da fazladan olan alan → yok sayılır
 *
 * Sonuç dört yönde de dayanıklı:
 *
 *   CORE alan EKLER      → site etkilenmez, kullanmaya hazır olduğunda alır
 *   CORE alan KALDIRIR   → site varsayılanıyla çalışmaya devam eder
 *   CORE alan ADI DEĞİŞTİRİR → site varsayılana düşer, uyarı verir
 *   SİTE alan ekler      → CORE'da değer girilene kadar varsayılan görünür
 *
 * Hiçbir durumda çökme yok, hiçbir durumda `undefined` ekrana çıkmıyor.
 * Sapma sessiz de kalmıyor: geliştirmede uyarı basılıyor.
 */
export interface DriftReport {
    /** CORE'da bulunmayan, varsayılana düşen alanlar. */
    missing: string[];
    /** Türü beklenenden farklı geldiği için yok sayılan alanlar. */
    mismatched: string[];
    /** CORE'da olan ama sitenin okumadığı alanlar. */
    unused: string[];
}
export interface ReadResult<T> {
    value: T;
    drift: DriftReport;
}
/** Sapma raporuyla birlikte okur. */
export declare function readWithDrift<T extends Record<string, unknown>>(source: Record<string, unknown> | null | undefined, defaults: T): ReadResult<T>;
/**
 * Okur ve sapmayı geliştirmede bildirir.
 *
 * Üretimde sessiz: eksik bir alan yüzünden ziyaretçiye hata göstermek
 * yanlış olur, varsayılan zaten devrede. Ama geliştirici görmeli.
 */
export declare function read<T extends Record<string, unknown>>(source: Record<string, unknown> | null | undefined, defaults: T, label?: string): T;
export declare function reportDrift(label: string, drift: DriftReport): void;
/**
 * Koleksiyon satırlarını okur.
 *
 * Koleksiyon CORE'da yoksa (adı değişmiş, kaldırılmış, henüz eklenmemiş)
 * sitenin taşıdığı yedek liste kullanılır — boş sayfa yerine son bilinen
 * içerik. Bu durum sessiz kalmıyor.
 */
export declare function readRows<T extends Record<string, unknown>>(rows: readonly {
    values: Record<string, unknown>;
}[] | undefined | null, rowDefaults: T, fallback: readonly T[], label?: string): T[];
/**
 * Düz satırları okur — CORE'un gömülü modüllerinden gelenler.
 *
 * `readRows`tan tek farkı satırın şekli: şema kayıtları alanlarını
 * `values` altında taşır, gömülü modüller (ürünler, kategoriler,
 * sayfalar, menü) düz nesne verir. Sürüklenme denetimi aynı.
 */
export declare function readList<T extends Record<string, unknown>>(rows: readonly object[] | undefined | null, rowDefaults: T, fallback: readonly T[], label?: string): T[];
/**
 * Satırları KİMLİKLERİYLE okur.
 *
 * Canlı düzenleyici bir kaydı "services.<kimlik>.title" yoluyla
 * bildiriyor; site bu yolu üretebilmek için kaydın kimliğini bilmeli.
 * `readRows` yalnız değerleri döndürüyor ve bu bilerek böyle: alan
 * sürüklenmesi denetimi şablonla sınırlı. Kimlik şablonun parçası değil,
 * kaydın kendisinin; bu yüzden değerlerin yanına ayrıca ekleniyor.
 *
 * Yedek listeden gelen satırların kimliği boş: onlar CORE'da yok, yani
 * düzenlenemezler ve site onlara işaret koymamalı.
 */
export declare function readKeyed<T extends Record<string, unknown>>(rows: readonly object[] | undefined | null, rowDefaults: T, fallback: readonly T[], label?: string): (T & {
    id: string;
})[];
