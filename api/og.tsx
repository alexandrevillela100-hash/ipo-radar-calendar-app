/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "@vercel/og";
import { createClient } from "@sanity/client";

/**
 * api/og.tsx — Vercel Edge function that returns a 1200×630 PNG share
 * card for a given filing slug.
 *
 * Save as:  api/og.tsx  (at the REPO ROOT of calendar-app, alongside
 *                       api/chat.ts — NOT inside src/)
 *
 * Usage:
 *   <meta property="og:image" content="/api/og?slug=reddit" />
 *
 * Notes:
 *   - Uses Edge runtime (faster, free, supports streaming images).
 *   - Reads VITE-prefixed Sanity env vars (same ones the React app uses).
 *   - Returns a static-ish image (server caches via cache-control).
 *
 * Requires (root package.json):
 *   "@vercel/og": "^0.6.2"
 */

export const config = {
  runtime: "edge",
};

// Env vars: Vercel exposes the same VITE_ prefixed vars to edge functions
// when you set them globally on the project.
const projectId =
  process.env.VITE_SANITY_PROJECT_ID ||
  process.env.SANITY_PROJECT_ID ||
  "";
const dataset =
  process.env.VITE_SANITY_DATASET ||
  process.env.SANITY_DATASET ||
  "production";
const apiVersion =
  process.env.VITE_SANITY_API_VERSION ||
  process.env.SANITY_API_VERSION ||
  "2024-10-01";

const sanity = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
});

// Theme
const BG = "#0a0d10";
const FG = "#e4e6e8";
const FG_MUTED = "#8b9099";
const PRIMARY = "#03c8b5";
const GOLD = "#c8a45c";
const RED = "#d86060";

function fmtPct(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${(n as number).toFixed(1)}%`;
}

function returnColor(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return FG_MUTED;
  if (n > 0.05) return PRIMARY;
  if (n < -0.05) return RED;
  return FG_MUTED;
}

export default async function handler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    if (!slug) {
      return new Response("Missing ?slug param", { status: 400 });
    }

    const filing = projectId
      ? await sanity.fetch(
          `*[_type == "filing" && (reportSlug == $slug || slug.current == $slug)][0]{
            companyName, ticker, exchange, industry, filingType, filingDate,
            "heroImageUrl": *[
              _type == "initiationReport"
              && defined(^.reportSlug)
              && slug.current == ^.reportSlug
              && status == "published"
            ][0].heroImage.asset->url,
            pricing,
            performance
          }`,
          { slug },
        )
      : null;

    if (!filing) {
      return renderFallback("IPO Radar", "Filing not found");
    }

    const hero = filing.heroImageUrl;
    const ticker: string = filing.ticker || "—";
    const exchange: string = filing.exchange || "";
    const company: string = filing.companyName || "Untitled filing";
    const filingType: string = filing.filingType || "S-1";
    const filingDate: string = filing.filingDate || "";
    const industry: string = filing.industry || "";

    const ret = filing?.performance?.returnSinceIPO;
    const pop = filing?.performance?.firstDayPop;
    const isTrading = Number.isFinite(filing?.performance?.currentPrice);

    const headlineMetric = isTrading
      ? { label: "Since IPO", value: fmtPct(ret), color: returnColor(ret) }
      : pop !== undefined && pop !== null
        ? { label: "Day-1 pop", value: fmtPct(pop), color: returnColor(pop) }
        : {
            label: filingType,
            value: filingDate || "Filed",
            color: PRIMARY,
          };

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            position: "relative",
            background: BG,
            color: FG,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          {/* Hero background */}
          {hero ? (
            <img
              src={hero}
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.4,
              }}
            />
          ) : null}

          {/* Gradient scrim */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(135deg, rgba(10,13,16,0.95) 0%, rgba(10,13,16,0.75) 50%, rgba(10,13,16,0.95) 100%)",
            }}
          />

          {/* Content */}
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              padding: "72px 80px",
              width: "100%",
              height: "100%",
              justifyContent: "space-between",
            }}
          >
            {/* Top row: branding */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: PRIMARY,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  color: "#001512",
                  fontSize: 18,
                }}
              >
                IR
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  color: FG,
                  display: "flex",
                }}
              >
                IPO Radar{" "}
                <span style={{ color: PRIMARY, marginLeft: 6 }}>AI</span>
              </div>
            </div>

            {/* Middle: ticker chip + headline */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  fontSize: 22,
                  letterSpacing: 2.5,
                  textTransform: "uppercase",
                  color: PRIMARY,
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    padding: "8px 16px",
                    background: "rgba(3, 200, 181, 0.15)",
                    border: "1px solid rgba(3, 200, 181, 0.35)",
                    borderRadius: 6,
                    color: PRIMARY,
                    fontWeight: 700,
                    letterSpacing: 3,
                  }}
                >
                  {exchange && exchange !== "UNKNOWN"
                    ? `${exchange}: ${ticker}`
                    : ticker}
                </span>
                {industry ? (
                  <span style={{ color: FG_MUTED, fontWeight: 400 }}>
                    {industry}
                  </span>
                ) : null}
              </div>

              <div
                style={{
                  fontSize: 84,
                  fontWeight: 700,
                  letterSpacing: -2,
                  color: FG,
                  lineHeight: 1.0,
                  maxWidth: 1040,
                  display: "flex",
                }}
              >
                {company}
              </div>
            </div>

            {/* Bottom: headline metric + footer */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: 24,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    fontSize: 18,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    color: FG_MUTED,
                    marginBottom: 6,
                  }}
                >
                  {headlineMetric.label}
                </div>
                <div
                  style={{
                    fontSize: 72,
                    fontWeight: 700,
                    letterSpacing: -1,
                    color: headlineMetric.color,
                    lineHeight: 1,
                  }}
                >
                  {headlineMetric.value}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 4,
                  color: FG_MUTED,
                  fontSize: 16,
                  letterSpacing: 0.5,
                }}
              >
                <span style={{ color: GOLD }}>{filingType}</span>
                <span>{filingDate}</span>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          "cache-control":
            "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[og] failed:", err);
    return renderFallback("IPO Radar", "Failed to generate preview");
  }
}

function renderFallback(title: string, sub: string): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: BG,
          color: FG,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, system-ui, sans-serif",
          gap: 16,
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 700, color: PRIMARY }}>
          {title}
        </div>
        <div style={{ fontSize: 24, color: FG_MUTED }}>{sub}</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
