/**
 * api/watchlist-subscribe.ts — Vercel serverless function.
 *
 * Save as:  api/watchlist-subscribe.ts  (at the REPO ROOT, alongside api/chat.ts)
 *
 * Accepts POST { email, slugs[] }. Writes (or updates) a
 * `watchlistSubscription` doc in Sanity, keyed by email. Returns
 * { ok: true, id }.
 *
 * Required env vars (server-side, no VITE_ prefix needed since this
 * runs in the Node runtime):
 *   SANITY_PROJECT_ID
 *   SANITY_DATASET           (default: "production")
 *   SANITY_API_VERSION       (default: "2024-10-01")
 *   SANITY_WRITE_TOKEN       (Editor permissions — separate from SANITY_TOKEN
 *                             you use in GitHub Actions, but the same value
 *                             also works if you reuse it)
 *
 * NOTE: this runs in Vercel's Node runtime (not Edge) because the
 * sanity client wants Node APIs for writes.
 */

import { createClient } from "@sanity/client";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const projectId =
  process.env.SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID || "";
const dataset =
  process.env.SANITY_DATASET || process.env.VITE_SANITY_DATASET || "production";
const apiVersion =
  process.env.SANITY_API_VERSION ||
  process.env.VITE_SANITY_API_VERSION ||
  "2024-10-01";
const writeToken =
  process.env.SANITY_WRITE_TOKEN ||
  process.env.SANITY_API_TOKEN ||
  "";

const sanity = createClient({
  projectId,
  dataset,
  apiVersion,
  token: writeToken,
  useCdn: false,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!projectId || !writeToken) {
    return res.status(500).json({
      error:
        "Server misconfigured: SANITY_PROJECT_ID or SANITY_WRITE_TOKEN missing.",
    });
  }

  let payload: unknown;
  try {
    payload =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const { email, slugs } = (payload || {}) as {
    email?: unknown;
    slugs?: unknown;
  };

  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }
  if (!Array.isArray(slugs) || slugs.length === 0) {
    return res.status(400).json({ error: "slugs must be a non-empty array" });
  }
  const cleanedSlugs = Array.from(
    new Set(
      slugs
        .filter((s): s is string => typeof s === "string" && s.trim() !== "")
        .map((s) => s.trim()),
    ),
  );
  if (cleanedSlugs.length === 0) {
    return res.status(400).json({ error: "No valid slugs provided" });
  }
  if (cleanedSlugs.length > 200) {
    return res
      .status(400)
      .json({ error: "Too many slugs (max 200 per subscription)" });
  }

  const lowerEmail = email.toLowerCase().trim();

  try {
    // Find existing sub by email (case-insensitive)
    const existing = await sanity.fetch<{ _id: string } | null>(
      `*[_type == "watchlistSubscription" && lower(email) == $email][0]{ _id }`,
      { email: lowerEmail },
    );

    if (existing) {
      await sanity
        .patch(existing._id)
        .set({
          slugs: cleanedSlugs,
          updatedAt: new Date().toISOString(),
          unsubscribed: false,
        })
        .commit();
      return res.status(200).json({ ok: true, id: existing._id, mode: "updated" });
    }

    const created = await sanity.create({
      _type: "watchlistSubscription",
      email: lowerEmail,
      slugs: cleanedSlugs,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      unsubscribed: false,
    });
    return res.status(200).json({ ok: true, id: created._id, mode: "created" });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[watchlist-subscribe] failed:", err);
    return res.status(500).json({
      error:
        err instanceof Error ? err.message : "Subscription failed",
    });
  }
}
