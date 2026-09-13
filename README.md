# @surth/core-site

CORE'a bağlı bir Next.js sitesi için her şey tek pakette: içerik istemcisi, canlı düzenleyici köprüsü, ziyaret izleyici, API rotaları ve bileşenler.

## Kurulum

```bash
npm i github:hbsrth/core-site#v0.1.0
```

`.env.local` (CORE'daki site ekleme sihirbazı bu bloğu verir):

```
CORE_URL=https://core.surth.dev
CORE_SITE_ID=site-kimligi
CORE_API_KEY=core_live_…
CORE_WEBHOOK_SECRET=…
NEXT_PUBLIC_CORE_ORIGIN=https://core.surth.dev,http://localhost:3100
```

## Üç dosya

```ts
// app/api/core/[...core]/route.ts
import { createCoreHandlers } from "@surth/core-site/server";
export const { GET, POST } = createCoreHandlers();
```

```tsx
// app/layout.tsx
import { CoreProvider } from "@surth/core-site/client";
import { CoreHead } from "@surth/core-site";
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
import { CoreText, CoreImage } from "@surth/core-site";

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

## Rotalar (`createCoreHandlers`)

| Adres | İş |
|---|---|
| `POST /api/core/revalidate` | CORE yayın sinyali → `revalidateTag` |
| `POST /api/core/enquiry` | form → CORE form talepleri (bal küpü, hız sınırı) |
| `POST /api/core/visit` | ziyaret → günlük karma → CORE istatistik |
| `GET /api/core/health` | paket/sözleşme sürümü, yapılandırma, son sinyal |

Rota kökünü değiştirirsen `<CoreProvider basePath>` ve `<CoreForm basePath>` aynı değeri alır.
