# @surth/core-site

CORE'a bağlı bir Next.js sitesi için her şey tek pakette: içerik istemcisi, canlı düzenleyici köprüsü, ziyaret izleyici, API rotaları ve bileşenler.

## Kurulum — tek komut

CORE panelinde site ekleme sihirbazı bu komutu anahtar ve sırla dolu verir:

```bash
npx -y -p github:hbsrth/core-site#v0.2.2 core-site init --url=… --site=… --key=… --secret=… --origin=…
# (değerler sihirbazdan dolu gelir; buradaki … yer tutucudur)
```

`init` boş klasörde ya da mevcut Next projesinde çalışır ve şunları yazar:

| Dosya | İş |
|---|---|
| `AGENTS.md` + `CLAUDE.md` | ajan yönergesi: içerik CORE'dan, tasarım koddan; işaretli blok, `init --update` tazeler |
| `app/api/core/[...core]/route.ts` | dört rota |
| `app/layout.tsx` | yoksa yazar, varsa `{children}`'ı `<CoreProvider>` ile sarar |
| `core.schema.mjs` | siteye özgü alanların iskeleti |
| `.env.local`, `.env.example` | beş değişken |
| `package.json` | `core:check`, `core:doctor`, `prebuild → core-site check` |

Sonra: `npm install` → `npx core-site check` → `npx core-site push-schema` → `npm run dev`.

## Denetim — `core-site check`

Yönerge ne yapılacağını söyler, denetim yapılıp yapılmadığını. `npm run build`
öncesi koşar; ihlal varsa derleme başlamaz (`CORE_CHECK=off` ile atlanır,
`--strict` uyarıları da ihlal sayar). Baktıkları: `NEXT_PUBLIC_` ile sızan sır,
rota ve `<CoreProvider>` varlığı, şema biçimi ve gömülü modül adları,
`singleton()/collection()` çağrılarının şemayla uyumu (bilinmeyen kimlik,
varsayılanda olmayan alan), `"use client"` dosyasında sunucu içe aktarımı,
çıplak basılan CORE metni, elle `fetch`, eski rota adları.

## Üç dosya (init'in yazdıkları)

```ts
// app/api/core/[...core]/route.ts
import { createCoreHandlers } from "@surth/core-site/route";
export const { GET, POST } = createCoreHandlers();
```

```tsx
// app/layout.tsx
import { CoreProvider } from "@surth/core-site/client";
import { CoreHead } from "@surth/core-site/components";
import { settings } from "@surth/core-site/server";
export default async function RootLayout({ children }) {
  const s = await settings();
  return (
    <html lang="tr">
      <head><CoreHead settings={s} /></head>
      <body><CoreProvider>{children}</CoreProvider></body>
    </html>
  );
}
```

```tsx
// app/page.tsx
import { singleton, collection } from "@surth/core-site/server";
import { CoreText, CoreImage } from "@surth/core-site/components";

const HOME = { heroTitle: "Güçlü sistemler", heroText: "", heroImage: "" };

export default async function Home() {
  const home = await singleton("home", HOME);
  const services = await collection("services", { title: "", summary: "" });
  return (
    <main>
      <CoreText of={home} field="heroTitle" as="h1" />
      <CoreImage of={home} field="heroImage" fill sizes="100vw" />
      {services.map((s) => <CoreText key={s.id} of={s} field="title" as="h2" />)}
    </main>
  );
}
```

Varsayılanlar sitenin kendi metinleri: CORE'a ulaşılamazsa ya da alan yoksa site bunlarla yayında kalır; geliştirmede sapma uyarısı basılır.

## Şema

Şema sitenin deposunda yaşar (`core.schema.mjs`) ve sitenin kendi anahtarıyla gönderilir:

```bash
npx core-site push-schema     # CORE'a yazar, farkı gösterir
npx core-site pull-schema     # CORE'daki şemayı yazdırır
npx core-site doctor https://site.example   # içerik, sağlık ucu, sinyal
```

## Girişler

| Giriş | İçerik |
|---|---|
| `@surth/core-site` | okuma yardımcıları, `coreField`, `coreMetadata`, `sanitizeHtml`, tipler — `next` gerektirmez |
| `@surth/core-site/server` | içerik istemcisi: `singleton`, `collection`, `modules`, `menu`, `settings`, `resolveImage` |
| `@surth/core-site/route` | `createCoreHandlers` (`next/cache`) |
| `@surth/core-site/components` | `CoreText`, `CoreImage`, `CoreRichText`, `CoreMenu`, `CoreHead` (`next/image`) |
| `@surth/core-site/client` | `CoreProvider`, `CoreForm`, önizleme köprüsü |

## Rotalar (`createCoreHandlers`)

| Adres | İş |
|---|---|
| `POST /api/core/revalidate` | CORE yayın sinyali → `revalidateTag` |
| `POST /api/core/enquiry` | form → CORE form talepleri (bal küpü, hız sınırı) |
| `POST /api/core/visit` | ziyaret → günlük karma → CORE istatistik |
| `GET /api/core/health` | paket/sözleşme sürümü, yapılandırma, son sinyal |

Rota kökünü değiştirirsen `<CoreProvider basePath>` ve `<CoreForm basePath>` aynı değeri alır.
