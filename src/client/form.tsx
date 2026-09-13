"use client";
import { useState, type FormEvent, type ReactNode } from "react";

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

export function CoreForm({ basePath = "/api/core", className, labels = {}, withPhone = true, withSubject = false, children, onSent, fieldClassName = "", buttonClassName = "" }: CoreFormProps) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const L = { name: "Ad Soyad", email: "E-posta", phone: "Telefon", subject: "Konu", message: "Mesaj", submit: "Gönder", sending: "Gönderiliyor…", sent: "Talebiniz alındı; en kısa sürede dönüş yapacağız.", failed: "Gönderilemedi. Lütfen tekrar deneyin ya da bize telefonla ulaşın.", ...labels };

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    const phone = get("phone");
    const subject = [get("subject"), phone ? `Tel: ${phone}` : ""].filter(Boolean).join(" · ");
    setStatus("sending");
    try {
      const r = await fetch(`${basePath}/enquiry`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: get("name"), email: get("email"), subject, message: get("message"), website: get("website") }) });
      if (!r.ok) throw new Error(String(r.status));
      setStatus("sent");
      form.reset();
      onSent?.();
    } catch {
      setStatus("failed");
    }
  }

  const field = (name: string, label: string, type = "text", required = false, textarea = false) => (
    <label className="core-form-field" style={{ display: "block" }}>
      <span className="core-form-label">{label}</span>
      {textarea ? <textarea name={name} required={required} rows={5} className={fieldClassName} /> : <input name={name} type={type} required={required} className={fieldClassName} autoComplete={name === "email" ? "email" : name === "phone" ? "tel" : name === "name" ? "name" : undefined} />}
    </label>
  );

  return (
    <form className={className} onSubmit={submit} noValidate={false}>
      {/* Bal küpü: gerçek ziyaretçi görmez; botlar doldurur. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
      {field("name", L.name, "text", true)}
      {field("email", L.email, "email", false)}
      {withPhone && field("phone", L.phone, "tel", false)}
      {withSubject && field("subject", L.subject)}
      {field("message", L.message, "text", true, true)}
      {children}
      <button type="submit" disabled={status === "sending"} className={buttonClassName}>
        {status === "sending" ? L.sending : L.submit}
      </button>
      {status === "sent" && <p role="status" className="core-form-status core-form-status-sent">{L.sent}</p>}
      {status === "failed" && <p role="alert" className="core-form-status core-form-status-failed">{L.failed}</p>}
    </form>
  );
}
