"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
export function CoreForm({ basePath = "/api/core", className, labels = {}, withPhone = true, withSubject = false, children, onSent, fieldClassName = "", buttonClassName = "" }) {
    const [status, setStatus] = useState("idle");
    const L = { name: "Ad Soyad", email: "E-posta", phone: "Telefon", subject: "Konu", message: "Mesaj", submit: "Gönder", sending: "Gönderiliyor…", sent: "Talebiniz alındı; en kısa sürede dönüş yapacağız.", failed: "Gönderilemedi. Lütfen tekrar deneyin ya da bize telefonla ulaşın.", ...labels };
    async function submit(e) {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const get = (k) => String(fd.get(k) ?? "").trim();
        const phone = get("phone");
        const subject = [get("subject"), phone ? `Tel: ${phone}` : ""].filter(Boolean).join(" · ");
        setStatus("sending");
        try {
            const r = await fetch(`${basePath}/enquiry`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: get("name"), email: get("email"), subject, message: get("message"), website: get("website") }) });
            if (!r.ok)
                throw new Error(String(r.status));
            setStatus("sent");
            form.reset();
            onSent?.();
        }
        catch {
            setStatus("failed");
        }
    }
    const field = (name, label, type = "text", required = false, textarea = false) => (_jsxs("label", { className: "core-form-field", style: { display: "block" }, children: [_jsx("span", { className: "core-form-label", children: label }), textarea ? _jsx("textarea", { name: name, required: required, rows: 5, className: fieldClassName }) : _jsx("input", { name: name, type: type, required: required, className: fieldClassName, autoComplete: name === "email" ? "email" : name === "phone" ? "tel" : name === "name" ? "name" : undefined })] }));
    return (_jsxs("form", { className: className, onSubmit: submit, noValidate: false, children: [_jsx("input", { name: "website", tabIndex: -1, autoComplete: "off", "aria-hidden": "true", style: { position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 } }), field("name", L.name, "text", true), field("email", L.email, "email", false), withPhone && field("phone", L.phone, "tel", false), withSubject && field("subject", L.subject), field("message", L.message, "text", true, true), children, _jsx("button", { type: "submit", disabled: status === "sending", className: buttonClassName, children: status === "sending" ? L.sending : L.submit }), status === "sent" && _jsx("p", { role: "status", className: "core-form-status core-form-status-sent", children: L.sent }), status === "failed" && _jsx("p", { role: "alert", className: "core-form-status core-form-status-failed", children: L.failed })] }));
}
