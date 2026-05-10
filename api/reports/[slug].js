// api/reports/[slug].js
//
// Vercel serverless function — proxies the rendered HTML report from
// Sanity through this domain so URLs like /reports/PSUS live on the
// calendar app's domain rather than cdn.sanity.io.
//
// Lookup chain:
//   1. /reports/PSUS  →  vercel.json rewrites to  /api/reports/PSUS
//   2. This function queries Sanity for the matching `initiationReport`
//      doc by slug.current
//   3. Reads the `htmlAsset.asset->url` from the result (a CDN URL)
//   4. Fetches the HTML asset and returns the body inline so the user's
//      browser address bar still reads /reports/PSUS
//
// Caching: Sanity's CDN is already strong, but we add a 5-min Vercel
// edge cache + 1-day stale-while-revalidate so most requests don't even
// hit Sanity. The publish step replaces the asset on republish anyway,
// so a 5-min freshness window is acceptable for editorial corrections.
//
// Errors: 404 if the report doesn't exist or isn't published, 502 if
// Sanity is unreachable, 500 for anything else. Returned as plain text
// so a browser hitting a bad slug sees the message inline.

const PROJECT_ID  = process.env.SANITY_PROJECT_ID  || '8896dke9';
const DATASET     = process.env.SANITY_DATASET     || 'production';
const API_VERSION = process.env.SANITY_API_VERSION || '2024-10-01';

// Only return a published report. Drafts/retracted reports 404 — same
// behaviour the studio's `published` perspective gives the calendar.
const GROQ = `*[_type == "initiationReport" && slug.current == $slug && status == "published"][0]{
  ticker,
  companyName,
  "htmlUrl": htmlAsset.asset->url
}`;

export default async function handler(req, res) {
  const slugParam = req.query && req.query.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;

  if (!slug || typeof slug !== 'string') {
    res.status(400).send('Missing slug');
    return;
  }

  // Build the Sanity query URL. The `$slug` GROQ param is encoded
  // separately as `?$slug=<json>`; Sanity expects each param as a
  // top-level query-string entry whose value is JSON-encoded.
  const queryUrl =
    `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}` +
    `?query=${encodeURIComponent(GROQ)}` +
    `&%24slug=${encodeURIComponent(JSON.stringify(slug))}`;

  try {
    const sanityRes = await fetch(queryUrl);
    if (!sanityRes.ok) {
      const body = await sanityRes.text();
      console.error(`[reports] Sanity query failed: ${sanityRes.status} — ${body.slice(0, 200)}`);
      res.status(502).send(`Sanity query failed: ${sanityRes.status}`);
      return;
    }

    const data = await sanityRes.json();
    const report = data && data.result;

    if (!report || !report.htmlUrl) {
      res.status(404).send(`Report not found: ${slug}`);
      return;
    }

    // Pull the HTML asset from Sanity's CDN. The HTML's <img src=> attrs
    // were already rewritten to absolute Sanity URLs at publish time,
    // so the document is fully self-contained when served from any
    // origin.
    const htmlRes = await fetch(report.htmlUrl);
    if (!htmlRes.ok) {
      console.error(`[reports] HTML asset fetch failed: ${htmlRes.status} for ${report.htmlUrl}`);
      res.status(502).send(`HTML asset fetch failed: ${htmlRes.status}`);
      return;
    }

    const html = await htmlRes.text();

    // Cache headers — Vercel honours `s-maxage` at the edge.
    // 5 min fresh, 1 day stale-while-revalidate. Editorial corrections
    // landing in Sanity show up within ~5 minutes for new visitors;
    // returning visitors see updates faster than that on background
    // revalidation.
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    res.status(200).send(html);
  } catch (err) {
    console.error('[reports] proxy error:', err && (err.stack || err.message || err));
    res.status(500).send(`Internal error: ${err && err.message ? err.message : String(err)}`);
  }
}
