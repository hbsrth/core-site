export function readEnv(env = process.env) {
    return {
        url: (env.CORE_URL ?? "").replace(/\/+$/, ""),
        siteId: env.CORE_SITE_ID ?? "",
        token: env.CORE_API_KEY ?? "",
        webhookSecret: env.CORE_WEBHOOK_SECRET ?? "",
        panelOrigins: env.NEXT_PUBLIC_CORE_ORIGIN ?? "",
    };
}
export const configured = (e) => Boolean(e.url && e.siteId && e.token);
/** Paketin konuştuğu sözleşme sürümü; CORE `x-core-contract` ile karşılaştırır. */
export const CONTRACT_VERSION = 1;
export const PACKAGE_VERSION = "0.1.0";
