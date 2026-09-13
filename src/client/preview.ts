/**
 * Canlı düzenleyici köprüsü — sitenin tarayıcı tarafı.
 * Kaynağı DMRSITE core-preview.ts; paket sürümü. Yalnız `?core-preview=1`
 * ile ve bir çerçeve içindeyken kurulur; ziyaretçide hiçbir şey yapmaz.
 */
import { PREVIEW_PROTOCOL, parseToFrame, type FrameField, type FromFrame } from "../protocol.js";
const MARK = "data-core-field";
/**
 * Değerin metin yerine bir ÖZNİTELİĞE yazılacağı öğeler: görsel yolu
 * `<img src>`, bağlantı `<a href>`. İşaretsiz öğede değer textContent'e
 * gider — ki bir görselin adresini yazıya çevirmek görseli bozar.
 */
const ATTR = "data-core-attr";
const STYLE_ID = "core-preview-style";

const CSS = `
[${MARK}] { outline-offset: 2px; }
[${MARK}]:hover {
  outline: 2px dashed rgba(96,165,250,.9);
  cursor: text;
}
[${MARK}][data-core-active] {
  outline: 2px solid rgb(59,130,246);
  outline-offset: 3px;
}
`;

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
export function pickCoreOrigin(list: string, referrer: string): string {
  const allowed = list
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  if (allowed.length === 0) return "";
  try {
    const parent = new URL(referrer).origin;
    if (allowed.includes(parent)) return parent;
  } catch {
    /* referrer yok ya da bozuk */
  }
  return allowed[0];
}

export function startCorePreview(options: PreviewOptions): () => void {
  const origin = pickCoreOrigin(options.coreOrigin, typeof document !== "undefined" ? document.referrer : "");
  if (!origin) return () => {};

  const post = (message: FromFrame) => {
    window.parent.postMessage(message, origin);
  };

  const collect = (): FrameField[] =>
    Array.from(document.querySelectorAll(`[${MARK}]`)).map((el) => ({
      field: el.getAttribute(MARK) ?? "",
      text: el.getAttribute(ATTR)
        ? (el.getAttribute(el.getAttribute(ATTR) as string) ?? "")
        : (el.textContent ?? "").trim(),
    }));

  let active: Element | null = null;

  const setActive = (el: Element | null) => {
    active?.removeAttribute("data-core-active");
    active = el;
    active?.setAttribute("data-core-active", "");
  };

  const onClick = (event: MouseEvent) => {
    const el = (event.target as Element | null)?.closest?.(`[${MARK}]`);
    if (!el) return;
    /*
     * Bağlantıların ve düğmelerin varsayılan davranışı durduruluyor.
     * Durdurulmasaydı düzenlemek için bir menü öğesine tıklamak sayfayı
     * değiştirir ve düzenleme hiç başlamazdı.
     */
    event.preventDefault();
    event.stopPropagation();
    setActive(el);
    post({ type: "core:pick", field: el.getAttribute(MARK) ?? "" });
  };

  const onMessage = (event: MessageEvent) => {
    // 1. kural: köken.
    if (event.origin !== origin) return;
    const message = parseToFrame(event.data);
    if (!message) return;

    if (message.type === "core:patch") {
      const el = document.querySelector(
        `[${MARK}="${cssEscape(message.field)}"]`,
      );
      if (!el) return;
      const attr = el.getAttribute(ATTR);
      // Yalnız güvenli öznitelikler: `on*` ya da `srcdoc` gibi bir şey
      // panelden gelen dizeyi betiğe çevirebilirdi.
      if (attr && ["src", "href", "alt", "title", "placeholder"].includes(attr)) {
        el.setAttribute(attr, message.value);
        // next/image `srcset` üretir; ham yol yazılınca eskisi kalmasın.
        if (attr === "src") el.removeAttribute("srcset");
        return;
      }
      // 2. kural: metin olarak yazılıyor, HTML olarak değil.
      el.textContent = message.value;
      return;
    }
    if (message.type === "core:highlight") {
      const el = message.field
        ? document.querySelector(`[${MARK}="${cssEscape(message.field)}"]`)
        : null;
      setActive(el);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    if (message.type === "core:stop") stop();
  };

  const report = () => {
    post({
      type: "core:ready",
      version: PREVIEW_PROTOCOL,
      path: window.location.pathname,
      fields: collect(),
    });
    post({ type: "core:size", height: document.documentElement.scrollHeight });
  };

  /*
   * Sayfa kendi kendine değişebiliyor (istemci bileşenleri, görsellerin
   * yüklenmesi). Değişimi izlemezsek panelin elindeki alan listesi ve
   * yükseklik eskir.
   */
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(report, 120);
  });
  let timer: ReturnType<typeof setTimeout>;

  document.addEventListener("click", onClick, true);
  window.addEventListener("message", onMessage);
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
  });

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.append(style);

  report();

  function stop() {
    document.removeEventListener("click", onClick, true);
    window.removeEventListener("message", onMessage);
    observer.disconnect();
    clearTimeout(timer);
    setActive(null);
    document.getElementById(STYLE_ID)?.remove();
  }

  return stop;
}

/**
 * Seçicide kullanılacak değeri kaçırır.
 *
 * `CSS.escape` her ortamda yok; alan yolları zaten dar bir karakter
 * kümesinden geliyor (bkz. protocol.ts) ama seçiciye ham dize koymak
 * yine de yanlış olurdu.
 */
function cssEscape(value: string): string {
  return value.replace(/["\\]/g, "\\$&");
}

/**
 * Betiği koşullara göre kurar.
 *
 * Üç koşul da sağlanmalı: adreste `core-preview=1`, sayfa bir çerçeve
 * içinde, ve panelin kökeni bildirilmiş. Ziyaretçinin tarayıcısında
 * hiçbiri sağlanmıyor, yani betik hiçbir şey yapmıyor.
 */
export function autoStartCorePreview(coreOrigin: string): () => void {
  if (typeof window === "undefined") return () => {};
  if (window.parent === window) return () => {};
  const params = new URLSearchParams(window.location.search);
  if (params.get("core-preview") !== "1") return () => {};
  return startCorePreview({ coreOrigin });
}
