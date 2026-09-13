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
/** Bir alanın gerçekten "yok" sayılması. */
const missing = (value) => value === undefined || value === null;
/**
 * Boş metin kasıtlı bir değer sayılıyor, eksik değil.
 *
 * Editör bir başlığı bilerek temizlemiş olabilir; varsayılana dönmek onun
 * kararını geri alırdı. Zorunlu alanların boş kalmasını CORE şema
 * doğrulamasında engelliyor, burada değil.
 */
const sameKind = (value, template) => {
    if (Array.isArray(template))
        return Array.isArray(value);
    if (template === null)
        return true;
    if (typeof template === "object") {
        return typeof value === "object" && value !== null && !Array.isArray(value);
    }
    return typeof value === typeof template;
};
/**
 * Varsayılana düşerken derin kopya alınıyor.
 *
 * Şablonun kendisini döndürmek, çağıranın onu değiştirmesiyle modül
 * düzeyindeki varsayılanı kalıcı olarak bozar; sonraki bütün okumalar
 * kirlenmiş değeri alır. Bir sayfada yapılan `push`, başka sayfada
 * beklenmeyen satır olarak görünürdü.
 */
function clone(value) {
    if (Array.isArray(value))
        return value.map((v) => clone(v));
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [
            k,
            clone(v),
        ]));
    }
    return value;
}
const emptyDrift = () => ({
    missing: [],
    mismatched: [],
    unused: [],
});
function readInto(source, defaults, drift, path) {
    if (!source) {
        // Kaynak hiç yoksa bu bir sapma değil: içerik henüz girilmemiş olabilir.
        return clone(defaults);
    }
    const out = {};
    for (const [key, template] of Object.entries(defaults)) {
        const at = path ? `${path}.${key}` : key;
        const value = source[key];
        if (missing(value)) {
            drift.missing.push(at);
            out[key] = clone(template);
            continue;
        }
        if (!sameKind(value, template)) {
            drift.mismatched.push(at);
            out[key] = clone(template);
            continue;
        }
        if (Array.isArray(template)) {
            const rowTemplate = template.find((row) => row && typeof row === "object" && !Array.isArray(row));
            out[key] = rowTemplate
                ? // Tekrarlayıcı satırları da aynı kurallarla okunuyor: eksik alt
                    // alan, şablondaki değere düşer.
                    value.map((row, i) => readInto(row, rowTemplate, drift, `${at}[${i}]`))
                : value;
            continue;
        }
        if (template && typeof template === "object") {
            out[key] = readInto(value, template, drift, at);
            continue;
        }
        out[key] = value;
    }
    for (const key of Object.keys(source)) {
        if (!(key in defaults)) {
            drift.unused.push(path ? `${path}.${key}` : key);
        }
    }
    return out;
}
/** Sapma raporuyla birlikte okur. */
export function readWithDrift(source, defaults) {
    const drift = emptyDrift();
    return { value: readInto(source, defaults, drift, ""), drift };
}
/**
 * Okur ve sapmayı geliştirmede bildirir.
 *
 * Üretimde sessiz: eksik bir alan yüzünden ziyaretçiye hata göstermek
 * yanlış olur, varsayılan zaten devrede. Ama geliştirici görmeli.
 */
export function read(source, defaults, label = "içerik") {
    const { value, drift } = readWithDrift(source, defaults);
    reportDrift(label, drift);
    return value;
}
export function reportDrift(label, drift) {
    if (process.env.NODE_ENV === "production")
        return;
    if (drift.missing.length > 0) {
        console.warn(`[CORE] ${label}: CORE'da bulunmayan alanlar varsayılana düştü — ${drift.missing.join(", ")}`);
    }
    if (drift.mismatched.length > 0) {
        console.warn(`[CORE] ${label}: türü beklenenden farklı gelen alanlar yok sayıldı — ${drift.mismatched.join(", ")}`);
    }
    if (drift.unused.length > 0) {
        console.info(`[CORE] ${label}: CORE'da olan ama sitenin kullanmadığı alanlar — ${drift.unused.join(", ")}`);
    }
}
/**
 * Koleksiyon satırlarını okur.
 *
 * Koleksiyon CORE'da yoksa (adı değişmiş, kaldırılmış, henüz eklenmemiş)
 * sitenin taşıdığı yedek liste kullanılır — boş sayfa yerine son bilinen
 * içerik. Bu durum sessiz kalmıyor.
 */
export function readRows(rows, rowDefaults, fallback, label = "koleksiyon") {
    if (!rows || rows.length === 0) {
        if (process.env.NODE_ENV !== "production") {
            console.warn(`[CORE] ${label}: kayıt gelmedi, sitenin yedek listesi kullanılıyor.`);
        }
        return fallback.map((row) => clone(row));
    }
    const drift = emptyDrift();
    const out = rows.map((row, i) => readInto(row.values, rowDefaults, drift, `[${i}]`));
    reportDrift(label, drift);
    return out;
}
/**
 * Düz satırları okur — CORE'un gömülü modüllerinden gelenler.
 *
 * `readRows`tan tek farkı satırın şekli: şema kayıtları alanlarını
 * `values` altında taşır, gömülü modüller (ürünler, kategoriler,
 * sayfalar, menü) düz nesne verir. Sürüklenme denetimi aynı.
 */
export function readList(rows, rowDefaults, fallback, label = "modül") {
    return readRows(rows?.map((values) => ({ values: values })), rowDefaults, fallback, label);
}
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
export function readKeyed(rows, rowDefaults, fallback, label = "koleksiyon") {
    if (!rows || rows.length === 0) {
        return readRows(null, rowDefaults, fallback, label).map((row) => ({
            ...row,
            id: "",
        }));
    }
    const loose = rows;
    const values = readRows(loose.map((row) => ({ values: row.values ?? row })), rowDefaults, fallback, label);
    return values.map((row, i) => ({
        ...row,
        id: typeof loose[i].id === "string" ? loose[i].id : "",
    }));
}
