import { type ReactNode } from "react";
/**
 * `<CoreForm>`: sitenin iletişim/teklif formu. Bal küpü, gönderim durumu ve
 * CORE'a iletim paketten; görünüm siteden (className ve alan etiketleri).
 * Alanlar CORE'un talep şekline eşlenir: name, email, subject, message.
 */
export interface CoreFormProps {
    basePath?: string;
    className?: string;
    labels?: Partial<Record<"name" | "email" | "phone" | "subject" | "message" | "submit" | "sending" | "sent" | "failed", string>>;
    /** Telefonu konuya ekler (CORE talebinde ayrı telefon alanı yok). */
    withPhone?: boolean;
    withSubject?: boolean;
    /** Alanların üstünde/altında ek içerik (onay metni gibi). */
    children?: ReactNode;
    onSent?: () => void;
    /** Alan sınıfları: input ve düğme için. */
    fieldClassName?: string;
    buttonClassName?: string;
}
export declare function CoreForm({ basePath, className, labels, withPhone, withSubject, children, onSent, fieldClassName, buttonClassName }: CoreFormProps): import("react").JSX.Element;
