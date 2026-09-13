import { type ReactNode } from "react";
/**
 * `<CoreProvider>`: layout'a bir kez sarılır.
 *
 *  - Canlı düzenleyici köprüsü: sayfa CORE çerçevesinde `?core-preview=1`
 *    ile açıldığında panelle el sıkışır; ziyaretçide hiçbir şey yapmaz.
 *  - Ziyaret izleyici: her sayfa geçişinde `/api/core/visit`'e küçük bir
 *    işaret gönderir (çerez yok, tanımlayıcı yok; Do Not Track'e uyar).
 */
export declare function CoreProvider({ children, basePath, track }: {
    children?: ReactNode;
    basePath?: string;
    track?: boolean;
}): import("react").JSX.Element;
