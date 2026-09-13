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
export declare function readEnv(env?: NodeJS.ProcessEnv): CoreEnv;
export declare const configured: (e: CoreEnv) => boolean;
/** Paketin konuştuğu sözleşme sürümü; CORE `x-core-contract` ile karşılaştırır. */
export declare const CONTRACT_VERSION = 1;
export declare const PACKAGE_VERSION = "0.2.2";
