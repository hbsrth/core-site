export interface HandlerOptions {
    /** Rota kökü; varsayılan "/api/core". Yalnız sağlık yanıtında gösterilir. */
    basePath?: string;
    /** Form gövdesinden CORE alanlarına eşleme; varsayılan aynı adlar. */
    mapEnquiry?: (body: Record<string, unknown>) => {
        name?: unknown;
        email?: unknown;
        subject?: unknown;
        message?: unknown;
    };
    /** Bal küpü alan adı; varsayılan "website". */
    honeypot?: string;
}
export declare function createCoreHandlers(options?: HandlerOptions): {
    GET: (request: Request) => Promise<Response>;
    POST: (request: Request) => Promise<Response>;
};
