<!-- core-site:start v__VERSION__ -->
# CORE'a bağlı site — çalışma kuralları

Bu site içeriğini CORE panelinden alır (`@surth/core-site` paketi). Tasarım
tamamen serbesttir; aşağıdaki kurallar yalnız içeriğin nereden geldiğini
ve nasıl basıldığını belirler. Kuralları `npx core-site check` denetler ve
`npm run build` bu denetim geçmeden başlamaz. Bir işi bitirmeden önce
`npx core-site check` temiz olmalı.

## 1. İçerik CORE'dan, tasarım koddan

- Müşterinin değiştirmek isteyeceği HER ŞEY CORE'dan okunur: başlık,
  açıklama, liste satırı, görsel, düğme yazısı, iletişim bilgisi.
- Yerleşim, ızgara, tipografi, animasyon, renk, bileşen yapısı kodda
  kalır. CORE bunlara dokunmaz; müşteri bunları bozamaz.
- Okuma yalnız sunucu bileşenlerinde, `@surth/core-site/server` ile:

```tsx
import { singleton, collection } from "@surth/core-site/server";

// Varsayılanlar sitenin GERÇEK metinleridir, boş dize değil.
const HOME = { heroTitle: "Güçlü sistemler, kusursuz temizlik", heroText: "…", heroImage: "" };

export default async function Home() {
  const home = await singleton("home", HOME);
  const services = await collection("services", { title: "", summary: "", icon: "machine" });
  …
}
```

- Her okuma varsayılanıyla gelir. CORE kapalıysa, alan henüz eklenmemişse
  ya da adı değişmişse site varsayılanla yayında kalır; `next build`
  panele bağlı değildir.

## 2. Metni çıplak basma, işaretle

Canlı düzenleyici alanı işaretten tanır. `{home.heroTitle}` çalışır ama
düzenlenemez; bunun yerine `@surth/core-site/components`:

```tsx
import { CoreText, CoreImage, CoreRichText, CoreMenu } from "@surth/core-site/components";

<CoreText of={home} field="heroTitle" as="h1" className="…" />
<CoreImage of={home} field="heroImage" fill sizes="100vw" className="…" />
<CoreRichText of={post} field="body" className="prose" />
<CoreMenu items={await menu("header")} className="…" />
{services.map((s) => <CoreText key={s.id} of={s} field="title" as="h3" />)}
```

- `as` ile etiket, `className` ile stil sizindir. Bileşen ekstra sarmal
  basmaz.
- Değeri kendi bileşenine prop olarak geçmen gerekiyorsa (`<Hero title={home.heroTitle} />`)
  içeride yine `<CoreText of={home} field="heroTitle" />` kullan; `of` ve
  `field` birlikte gitmeli. Ya da işareti elle bas: `{...coreField("@home", "heroTitle")}`.
- Görselin odak noktası ve alt metni `CoreImage` ile kendiliğinden gelir.

## 3. Şema: yalnız bu siteye özgü şeyler

- Ürün, kategori, sayfa, yazı, menü, medya, sipariş, form talebi ve site
  ayarları CORE'un gömülü modülleridir. Bunlar `modules()`, `menu()`,
  `settings()` ile okunur; ŞEMAYA KOLEKSİYON OLARAK YAZILMAZ
  (`products`, `categories`, `pages`, `posts`, `media`, `navigation`,
  `orders`, `enquiries`, `settings` adları yasaktır).
- Şema `core.schema.mjs` dosyasındadır: siteye özgü listeler (hizmetler,
  referanslar, ekip, SSS…) `collections`, tasarımlı sayfaların metinleri
  `singletons` olarak. Alan adı kodda okunan adla birebir aynı olmalı.
- Yeni alan akışı: `core.schema.mjs`'e ekle → `npx core-site push-schema`
  → kodda varsayılanla oku → `<CoreText>` ile bas.
- Alan türleri: `text`, `textarea`, `richtext`, `number`, `toggle`,
  `select` (options ile), `image`, `gallery`, `link`, `date`, `group`,
  `repeater` (fields ile), `seo`. Zorunlu için `required: true`.

## 4. Dokunulmayacaklar

- `app/api/core/[...core]/route.ts` yalnız `createCoreHandlers()` içerir;
  yayın sinyali, form, ziyaret ve sağlık ucu buradan gelir. Bu rotalar
  yeniden yazılmaz, yeni sürümü eklenmez.
- `app/layout.tsx` içinde `<CoreProvider>` `{children}`'ı sarar. Canlı
  düzenleyici köprüsü ve ziyaret sayımı bununla gelir; ayrıca izleme kodu
  yazılmaz.
- Anahtar ve sır sunucuda kalır: `CORE_API_KEY` ve `CORE_WEBHOOK_SECRET`
  hiçbir zaman `NEXT_PUBLIC_` ile başlamaz, istemci bileşenine girmez,
  URL'ye yazılmaz.
- `getContent`, `singleton`, `collection` bir `"use client"` dosyasında
  çağrılmaz. İstemci bileşeni veriyi prop olarak alır.
- CORE'a giden `fetch` yazılmaz; paket önbellekli ve etiketli okur. Sayfalar
  statik üretilir; `cache: "no-store"`, `dynamic = "force-dynamic"` gibi
  ayarlar CORE içeriği için kullanılmaz.
- Form `<CoreForm>` ile ya da `POST /api/core/enquiry`'ye gönderilir;
  ayrı bir form rotası yazılmaz.

## 5. Bitirme ölçütü

1. `npx core-site check` — kural ihlali yok (uyarılar okunmuş).
2. `npm run build` — geçiyor (CORE'a ulaşılamasa bile).
3. Site dağıtıldıysa `npx core-site doctor https://<site>` — üç ✔.
4. Canlı düzenleyicide sayfadaki her müşteri metni tıklanabiliyor.

Ortam değişkenleri (`.env.local`, Vercel'de aynıları): `CORE_URL`,
`CORE_SITE_ID`, `CORE_API_KEY`, `CORE_WEBHOOK_SECRET`,
`NEXT_PUBLIC_CORE_ORIGIN`. Değerler CORE panelinde site → Bağlantı.
<!-- core-site:end -->
