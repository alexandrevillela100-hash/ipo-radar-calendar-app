import { useEffect } from "react";

/**
 * useDocumentMeta — set <title> and <meta> tags from React.
 *
 * Save as:  calendar-app/src/lib/useDocumentMeta.ts
 *
 * Updates the document head with the given title and meta tags
 * (og:title, og:description, og:image, twitter:card, etc.).
 *
 * Honest caveat: this is *client-side* meta tag injection. Social
 * crawlers that don't execute JavaScript (which is most of them) will
 * see the static meta tags from index.html, not these. For full
 * crawler support you'd need server-side rendering. This still works
 * for browsers, search-result previews on some platforms, and (most
 * importantly) for the OG image to be discoverable when someone shares
 * the URL through a service that re-fetches with JS execution.
 *
 * For production-grade OG, plan a follow-up: either move to Next.js
 * (SSR), or add a Vercel rewrite that intercepts crawler user-agents
 * and returns pre-rendered HTML with meta tags inlined.
 */

interface MetaOptions {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: "summary" | "summary_large_image";
  twitterImage?: string;
}

function setMeta(selector: string, attr: string, value: string) {
  if (!value) return;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    if (selector.startsWith('meta[property="')) {
      const prop = selector.match(/property="([^"]+)"/)?.[1];
      if (prop) el.setAttribute("property", prop);
    } else if (selector.startsWith('meta[name="')) {
      const name = selector.match(/name="([^"]+)"/)?.[1];
      if (name) el.setAttribute("name", name);
    }
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

export function useDocumentMeta(opts: MetaOptions) {
  useEffect(() => {
    if (opts.title) {
      document.title = opts.title;
    }
    if (opts.description) {
      setMeta('meta[name="description"]', "content", opts.description);
    }
    if (opts.ogTitle || opts.title) {
      setMeta(
        'meta[property="og:title"]',
        "content",
        opts.ogTitle || opts.title || "",
      );
    }
    if (opts.ogDescription || opts.description) {
      setMeta(
        'meta[property="og:description"]',
        "content",
        opts.ogDescription || opts.description || "",
      );
    }
    if (opts.ogImage) {
      setMeta('meta[property="og:image"]', "content", opts.ogImage);
      setMeta('meta[property="og:image:width"]', "content", "1200");
      setMeta('meta[property="og:image:height"]', "content", "630");
    }
    if (opts.ogUrl) {
      setMeta('meta[property="og:url"]', "content", opts.ogUrl);
    }
    setMeta('meta[property="og:type"]', "content", "article");

    const cardType = opts.twitterCard || "summary_large_image";
    setMeta('meta[name="twitter:card"]', "content", cardType);
    if (opts.twitterImage || opts.ogImage) {
      setMeta(
        'meta[name="twitter:image"]',
        "content",
        opts.twitterImage || opts.ogImage || "",
      );
    }
    if (opts.ogTitle || opts.title) {
      setMeta(
        'meta[name="twitter:title"]',
        "content",
        opts.ogTitle || opts.title || "",
      );
    }
    if (opts.ogDescription || opts.description) {
      setMeta(
        'meta[name="twitter:description"]',
        "content",
        opts.ogDescription || opts.description || "",
      );
    }
  }, [
    opts.title,
    opts.description,
    opts.ogTitle,
    opts.ogDescription,
    opts.ogImage,
    opts.ogUrl,
    opts.twitterCard,
    opts.twitterImage,
  ]);
}
