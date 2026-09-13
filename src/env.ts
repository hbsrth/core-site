/**
 * Ortam değişkenleri — tek yerde okunur, site kodunda hiç geçmez.
 *
 *   CORE_URL                 panelin adresi
 *   CORE_SITE_ID             CORE'daki site kimliği
 *   CORE_API_KEY             yayın (core_live_) ya da önizleme (core_prev_) anahtarı — sunucuda kalır
 *   CORE_WEBHOOK_SECRET      yayın sinyalinin sırrı — sunucuda kalır
 *   NEXT_PUBLIC_CORE_ORIGIN  canlı düzenleyicinin kökeni; virgülle birden çok olabilir
 */
export interface CoreEnv {
  url: string;
  siteId: string;
  token: string;
  webhookSecret: string;
  panelOrigins: string;
}

export function readEnv(env: NodeJS.ProcessEnv = process.env): CoreEnv {
  return {
    url: (env.CORE_URL ?? "").replace(/\/+$/, ""),
    siteId: env.CORE_SITE_ID ?? "",
    token: env.CORE_API_KEY ?? "",
    webhookSecret: env.CORE_WEBHOOK_SECRET ?? "",
    panelOrigins: env.NEXT_PUBLIC_CORE_ORIGIN ?? "",
  };
}

export const configured = (e: CoreEnv) => Boolean(e.url && e.siteId && e.token);

/** Paketin konuştuğu sözleşme sürümü; CORE `x-core-contract` ile karşılaştırır. */
export const CONTRACT_VERSION = 1;
export const PACKAGE_VERSION = "0.1.0";
