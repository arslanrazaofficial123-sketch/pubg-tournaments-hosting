"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const LANGS: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ur", label: "اردو" },
  { code: "hi", label: "हिन्दी" },
  { code: "ar", label: "العربية" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
  { code: "ps", label: "پښتو" },
  { code: "sd", label: "سنڌي" },
  { code: "bn", label: "বাংলা" },
  { code: "tr", label: "Türkçe" },
  { code: "fa", label: "فارسی" },
];

function readCookie(): string {
  const m = document.cookie.match(/(?:^|;\s*)googtrans=\/[^/]+\/([\w-]+)/);
  return m ? m[1] : "en";
}

function setCookie(code: string) {
  const host = window.location.hostname;
  const val = code === "en" ? "" : `/en/${code}`;
  const exp = code === "en" ? "Thu, 01 Jan 1970 00:00:00 GMT" : "Fri, 31 Dec 2099 00:00:00 GMT";
  document.cookie = `googtrans=${val}; expires=${exp}; path=/`;
  document.cookie = `googtrans=${val}; expires=${exp}; path=/; domain=${host}`;
  if (host.split(".").length > 1) document.cookie = `googtrans=${val}; expires=${exp}; path=/; domain=.${host.replace(/^www\./, "")}`;
}

/** Big headings, buttons, menus and brand names stay as written; descriptions and details get translated. */
function markNoTranslate(root: ParentNode) {
  root.querySelectorAll("h1,h2,h3,h4,button,nav,nav a,header a,.notranslate,[data-keep]").forEach((el) => {
    el.classList.add("notranslate");
    el.setAttribute("translate", "no");
  });
}

type GT = { translate?: { TranslateElement: new (o: object, id: string) => void } };
type TW = { google?: GT; __epixTranslateInit?: () => void };

export function LanguageSwitcher() {
  const path = usePathname();
  const [lang, setLang] = useState("en");
  const off = path?.startsWith("/admin");

  useEffect(() => {
    if (off) return;
    const current = readCookie();
    setLang(current);
    if (current === "en") return;

    markNoTranslate(document);
    const mo = new MutationObserver(() => markNoTranslate(document));
    mo.observe(document.body, { childList: true, subtree: true });

    const w = window as unknown as TW;
    w.__epixTranslateInit = () => {
      const t = w.google?.translate;
      if (t) new t.TranslateElement({ pageLanguage: "en", autoDisplay: false }, "epix_gt");
    };
    const s = document.createElement("script");
    s.src = "https://translate.google.com/translate_a/element.js?cb=__epixTranslateInit";
    s.async = true;
    document.body.appendChild(s);
    return () => mo.disconnect();
  }, [off]);

  if (off) return null;

  return (
    <>
      <div id="epix_gt" className="hidden" />
      <style>{`
        .skiptranslate iframe.skiptranslate, iframe.goog-te-banner-frame { display: none !important; }
        body { top: 0 !important; }
        .goog-tooltip, .goog-tooltip:hover { display: none !important; }
        .goog-text-highlight { background: none !important; box-shadow: none !important; }
      `}</style>
      <label
        className="notranslate fixed bottom-4 left-4 z-[150] grid h-11 w-11 cursor-pointer place-items-center rounded-full border border-border bg-black/80 text-white shadow-lg backdrop-blur transition-colors hover:border-[#f2b84b]/60 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#f2b84b]"
        translate="no"
        title="Change language"
      >
        <span aria-hidden className="pointer-events-none text-[13px] leading-none">🌐</span>
        <span aria-hidden className="pointer-events-none text-[8px] font-bold uppercase leading-none tracking-wider text-white/75">{lang}</span>
        <select
          aria-label="Language"
          value={lang}
          onChange={(e) => { setCookie(e.target.value); setLang(e.target.value); window.location.reload(); }}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-full opacity-0"
        >
          {LANGS.map((l) => <option key={l.code} value={l.code} className="text-black">{l.label}</option>)}
        </select>
      </label>
    </>
  );
}
