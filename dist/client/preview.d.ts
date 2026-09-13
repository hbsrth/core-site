export interface PreviewOptions {
    /**
     * Panelin kökeni; virgülle birden çok olabilir ("https://panel,http://localhost:3100").
     * Çerçeveyi açan sayfa (document.referrer) bu listedeyse o kullanılır;
     * listede olmayan bir kökenden gelen mesaj okunmuyor. Verilmezse betik
     * hiç kurulmuyor — "her kökene açık" bir varsayılan, sessizce güvensiz olurdu.
     */
    coreOrigin: string;
}
/** Listeden, çerçeveyi açan panelin kökenini seçer; bulamazsa ilkini. */
export declare function pickCoreOrigin(list: string, referrer: string): string;
export declare function startCorePreview(options: PreviewOptions): () => void;
/**
 * Betiği koşullara göre kurar.
 *
 * Üç koşul da sağlanmalı: adreste `core-preview=1`, sayfa bir çerçeve
 * içinde, ve panelin kökeni bildirilmiş. Ziyaretçinin tarayıcısında
 * hiçbiri sağlanmıyor, yani betik hiçbir şey yapmıyor.
 */
export declare function autoStartCorePreview(coreOrigin: string): () => void;
