// api/factsheet/[slug].js
//
// Vercel serverless function — proxies the Fact Sheet HTML from Sanity
// through this domain so URLs like /factsheet/PSUS live on the calendar
// app's domain rather than cdn.sanity.io.
//
// Mirrors api/reports/[slug].js. Only difference: reads
// `factSheetHtmlAsset` instead of `htmlAsset` from the same
// initiationReport doc.
//
// Lookup chain:
//   1. /factsheet/PSUS  →  vercel.json rewrites to  /api/factsheet/PSUS
//   2. This function queries Sanity for the matching `initiationReport`
//      doc by slug.current
//   3. Reads `factSheetHtmlAsset.asset->url`
//   4. Fetches the asset and returns the body inline

const PROJECT_ID  = process.env.SANITY_PROJECT_ID  || '8896dke9';
const DATASET     = process.env.SANITY_DATASET     || 'production';
const API_VERSION = process.env.SANITY_API_VERSION || '2024-10-01';

const GROQ = `*[_type == "initiationReport" && slug.current == $slug && status == "published"][0]{
  ticker,
  companyName,
  "htmlUrl": factSheetHtmlAsset.asset->url
}`;

export default async function handler(req, res) {
  const slugParam = req.query && req.query.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;

  if (!slug || typeof slug !== 'string') {
    res.status(400).send('Missing slug');
    return;
  }

  const queryUrl =
    `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}` +
    `?query=${encodeURIComponent(GROQ)}` +
    `&%24slug=${encodeURIComponent(JSON.stringify(slug))}`;

  try {
    const sanityRes = await fetch(queryUrl);
    if (!sanityRes.ok) {
      const body = await sanityRes.text();
      console.error(`[factsheet] Sanity query failed: ${sanityRes.status} — ${body.slice(0, 200)}`);
      res.status(502).send(`Sanity query failed: ${sanityRes.status}`);
      return;
    }

    const data = await sanityRes.json();
    const report = data && data.result;

    if (!report || !report.htmlUrl) {
      // No fact sheet uploaded yet for this report. Return a friendly
      // 404 rather than a generic error — the editor may have published
      // the long-form report before fact-sheet generation came online.
      res.status(404).send(`Fact sheet not found for: ${slug}`);
      return;
    }

    const htmlRes = await fetch(report.htmlUrl);
    if (!htmlRes.ok) {
      console.error(`[factsheet] HTML asset fetch failed: ${htmlRes.status} for ${report.htmlUrl}`);
      res.status(502).send(`HTML asset fetch failed: ${htmlRes.status}`);
      return;
    }

    const html = await htmlRes.text();

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    res.status(200).send(html);
  } catch (err) {
    console.error('[factsheet] proxy error:', err && (err.stack || err.message || err));
    res.status(500).send(`Internal error: ${err && err.message ? err.message : String(err)}`);
  }
}
