/** Zengin metni güvenli HTML'e indirger; `next` içe aktarmaz, her ortamda çalışır. */
const ALLOWED_TAGS = new Set(["p", "br", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li", "h2", "h3", "h4", "blockquote", "hr", "code", "pre"]);

export function sanitizeHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|svg|math)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (whole, tag: string, attrs: string) => {
      const t = tag.toLowerCase();
      if (!ALLOWED_TAGS.has(t)) return "";
      if (whole.startsWith("</")) return `</${t}>`;
      if (t === "a") {
        const href = /href\s*=\s*"([^"]*)"|href\s*=\s*'([^']*)'/i.exec(attrs);
        const url = (href?.[1] ?? href?.[2] ?? "").trim();
        const safe = /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(url) ? url : "#";
        const external = /^https?:\/\//i.test(safe);
        return `<a href="${safe.replace(/"/g, "&quot;")}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>`;
      }
      return `<${t}>`;
    });
}

